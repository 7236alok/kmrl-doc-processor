import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import child_process from 'child_process';
const pdfjsLib: any = await import('pdfjs-dist');
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { cleanText } from '../../utils/text-utils.js';

const exec = promisify(child_process.exec);

// === Step 1: Types & Errors ===
export interface OcrResult { text: string; confidence: number; source: string; }
export interface PageResult { pageNumber: number; nativeText: string; ocrText?: string; confidence?: number; }
export interface HybridPdfResultV2 {
  source: string;
  docType: 'text' | 'scanned' | 'hybrid';
  nativeText: string;
  ocrText: string;
  combinedText: string;
  pages: PageResult[];
  processingTime: number;
  stats: { totalPages: number; pagesWithOCR: number; totalNativeChars: number; totalOCRChars: number; };
}

class PdfProcessingError extends Error { constructor(message: string, public code?: string){ super(message); this.name='PdfProcessingError'; } }
class DependencyError extends PdfProcessingError { constructor(missing: string[]){ super(`Missing dependencies: ${missing.join(', ')}`, 'MISSING_DEPS'); } }

// === Step 2: Config ===
interface PdfProcessingOptions { langs?: string[]; keepTemp?: boolean; dpi?: number; maxConcurrency?: number; pageTextThreshold?: number; globalTextThreshold?: number; }
const DEFAULT_OPTIONS: Required<PdfProcessingOptions> = { langs:['eng','hin','mal'], keepTemp:false, dpi:200, maxConcurrency:4, pageTextThreshold:60, globalTextThreshold:400 };

const TESSDATA_PATH = path.resolve('./tessdata');

function normalizeForCompare(s = '') { return s.replace(/\s+/g,' ').toLowerCase().trim(); }

// === Step 3–9: PdfProcessor Class ===
export class PdfProcessor {
  private options: Required<PdfProcessingOptions>;
  constructor(options: PdfProcessingOptions = {}) { this.options = { ...DEFAULT_OPTIONS, ...options }; }

  private async commandExists(cmd: string): Promise<boolean> {
    try { const command = process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`; await exec(command, { timeout: 5000 }); return true; } catch { return false; }
  }

  private async checkDependencies(): Promise<void> {
    const required = ['pdftoppm','pdfimages'];
    const missing: string[] = [];
    for (const cmd of required) if (!(await this.commandExists(cmd))) missing.push(cmd);
    if (missing.length) throw new DependencyError(missing);
  }

  private checkTessData(langs: string[]): string[] { return langs.filter(l => !fs.existsSync(path.join(TESSDATA_PATH, `${l}.traineddata`))); }

  // Step 5: native text per page
  private async extractNativeTextPerPage(pdfPath: string): Promise<PageResult[]> {
    const rawNode = await fsp.readFile(pdfPath);
    const ab = rawNode.buffer.slice(rawNode.byteOffset, rawNode.byteOffset + rawNode.byteLength);
    const raw = new Uint8Array(ab);
    let doc: any;
    try { doc = await pdfjsLib.getDocument({ data: raw, verbosity: 0 }).promise; } 
    catch { return [{ pageNumber: 1, nativeText: '' }]; }
    const pages: PageResult[] = [];
    for (let i=1;i<=doc.numPages;i++) {
      try { const page = await doc.getPage(i); const content = await page.getTextContent(); const text = cleanText(content.items.map((it:any)=>it.str).join(' ')); pages.push({ pageNumber:i, nativeText:text }); await page.cleanup?.(); } 
      catch { pages.push({ pageNumber:i, nativeText:'' }); }
    }
    await doc.destroy();
    return pages;
  }

  // Step 6: images
  private async extractEmbeddedImages(pdfPath: string, outDir: string): Promise<string[]> {
    const prefix = path.join(outDir, 'img');
    await exec(`pdfimages -png "${pdfPath}" "${prefix}"`).catch(()=>{});
    return (await fsp.readdir(outDir)).filter(f=>/^img.*\.(png|jpg|jpeg|ppm)$/i.test(f)).map(f=>path.join(outDir,f));
  }

  private async renderPageToPng(pdfPath: string, page: number, outDir: string): Promise<string> {
    const prefix = path.join(outDir, `page-${String(page).padStart(3,'0')}`);
    await exec(`pdftoppm -r ${this.options.dpi} -f ${page} -l ${page} -png "${pdfPath}" "${prefix}"`);
    const out = (await fsp.readdir(outDir)).find(f=>f.startsWith(path.basename(prefix)) && f.endsWith('.png'));
    if (!out) throw new Error(`No PNG rendered for page ${page}`);
    return path.join(outDir,out);
  }

  private async preprocessImage(image: string | Buffer): Promise<Buffer> {
    try { const s = typeof image === 'string' ? sharp(image) : sharp(image); return await s.grayscale().normalize().sharpen().withMetadata({ density: 300 }).png().toBuffer(); } 
    catch { return Buffer.from(''); }
  }

  private async ocrImage(image: string | Buffer, langs: string[]): Promise<OcrResult> {
    try { const { data } = await Tesseract.recognize(image, langs.join('+'), { langPath: TESSDATA_PATH, gzip:false }); return { text: cleanText(data.text || ''), confidence: (data.confidence||0)/100, source: '' }; } 
    catch { return { text:'', confidence:0, source:'' }; }
  }

  public async processPdfHybrid(pdfPath: string): Promise<HybridPdfResultV2> {
    const start = Date.now();
    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(),'pdfproc-'));
    try {
      try { await this.checkDependencies(); } catch (e) { console.warn('[HybridOCR] Dependency warning:', (e as Error).message); }
      const pages = await this.extractNativeTextPerPage(pdfPath);
      const nativeText = pages.map(p=>p.nativeText).join('\n\n');
      const docType = this.determineDocumentType(pages, nativeText);
      let ocrText = '';

      if (docType !== 'text') {
        const tessMissing = this.checkTessData(this.options.langs);
        if (tessMissing.length) console.warn('[HybridOCR] Missing tessdata:', tessMissing.join(', '));

        // Extract embedded images first
        let images: string[] = [];
        try { images = await this.extractEmbeddedImages(pdfPath,tempDir); } catch {/* ignore */}
        for (const img of images) { const buf = await this.preprocessImage(img); const r = await this.ocrImage(buf, this.options.langs); if (r.text) ocrText += (ocrText? '\n\n':'') + r.text; }

        // Render pages with low native text
        const lowPages = pages.filter(p=>p.nativeText.length < this.options.pageTextThreshold);
        const queue = [...lowPages];
        const workers: Promise<void>[] = [];
        const maxC = Math.min(this.options.maxConcurrency, queue.length);
        for (let i=0;i<maxC;i++) {
          workers.push((async()=>{
            while (queue.length) {
              const pg = queue.shift(); if (!pg) break;
              try { const png = await this.renderPageToPng(pdfPath, pg.pageNumber, tempDir); const buf = await this.preprocessImage(png); const r = await this.ocrImage(buf, this.options.langs); pg.ocrText = r.text; pg.confidence = r.confidence; if (r.text) ocrText += `\n\n[PAGE ${pg.pageNumber}] ${r.text}`; } catch {/* ignore */ }
            }
          })());
        }
        await Promise.all(workers);
      }

      const combinedText = this.mergeTexts(nativeText, ocrText);
      return { source: pdfPath, docType, nativeText, ocrText, combinedText, pages, processingTime: Date.now()-start, stats: this.calculateStats(pages) };
    } finally { if (!this.options.keepTemp) await fsp.rm(tempDir, { recursive: true, force: true }).catch(()=>{}); }
  }

  private determineDocumentType(pages: PageResult[], nativeText: string): 'text' | 'scanned' | 'hybrid' {
    if (nativeText.length > this.options.globalTextThreshold) return 'text';
    const low = pages.filter(p=>p.nativeText.length < this.options.pageTextThreshold).length;
    return low === pages.length ? 'scanned' : 'hybrid';
  }

  private mergeTexts(nativeText: string, ocrText: string): string {
    if (!ocrText) return nativeText;
    const nNorm = normalizeForCompare(nativeText);
    const oNorm = normalizeForCompare(ocrText);
    if (nNorm.includes(oNorm)) return nativeText;
    return `${nativeText}\n\n--- OCR Results ---\n${ocrText}`.trim();
  }

  private calculateStats(pages: PageResult[]) {
    return { totalPages: pages.length, pagesWithOCR: pages.filter(p=>p.ocrText?.length).length, totalNativeChars: pages.reduce((s,p)=>s+p.nativeText.length,0), totalOCRChars: pages.reduce((s,p)=>s+(p.ocrText?.length||0),0) };
  }
}

// Convenience function for legacy integration
export async function processPdfHybrid(pdfPath: string, opts: { langs?: string[]; keepTemp?: boolean } = {}) {
  const processor = new PdfProcessor({ langs: opts.langs ?? ['eng','hin','mal'], keepTemp: opts.keepTemp ?? false });
  const r = await processor.processPdfHybrid(pdfPath);
  return { source: r.source, docType: r.docType, nativeText: r.nativeText, pages: r.pages.map(p=>({ pageNumber: p.pageNumber, text: p.nativeText })), ocrImages: [], ocrPages: [], text: r.combinedText, processingTime: r.processingTime };
}

export default processPdfHybrid;
