import fs from "fs";
import path from "path";
import Tesseract from "tesseract.js";
import sharp from "sharp";
import https from "https";
import { cleanText } from "../../utils/text-utils.js";
import { processPdfHybrid } from "./pdf-hybrid-processor.js";
import type { OCRResult, OCREngine, OCRConfig } from "../../types/ocr.js";
import { readDocument } from "../../utils/file-utils.js";

// === Default configuration ===
const DEFAULT_CONFIG: OCRConfig = {
  preferredEngine: "auto",
  fallbackEnabled: true,
  confidenceThreshold: 0.7,
  timeout: 30000,
  languages: ["eng", "hin", "mal"],
};

/** Tessdata path */
const LANG_PATH = path.resolve("./tessdata");

/** Ensure tessdata folder exists */
function ensureLangPath() {
  if (!fs.existsSync(LANG_PATH)) fs.mkdirSync(LANG_PATH, { recursive: true });
}

/** Check which traineddata files are missing */
function missingTrainedData(langCodes: string[]): string[] {
  ensureLangPath();
  return langCodes.filter(code => {
    const base = path.join(LANG_PATH, `${code}.traineddata`);
    return !(fs.existsSync(base) || fs.existsSync(base + ".gz"));
  });
}

/** Auto-download missing traineddata */
async function autoDownload(langCodes: string[]): Promise<string[]> {
  const failed: string[] = [];
  for (const code of langCodes) {
    try {
      const url = `https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/main/${code}.traineddata`;
      await new Promise<void>((resolve, reject) => {
        const req = https.get(url, (res) => {
          if ((res.statusCode ?? 0) >= 400) return reject(new Error(String(res.statusCode)));
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
          res.on("end", () => {
            try { fs.writeFileSync(path.join(LANG_PATH, `${code}.traineddata`), Buffer.concat(chunks)); resolve(); } 
            catch (err) { reject(err); }
          });
        });
        req.on("error", reject);
      });
    } catch (e) {
      console.warn(`[OCR] Failed to download ${code}:`, (e as Error).message);
      failed.push(code);
    }
  }
  return failed;
}

// === Engines ===

/** Direct text extraction */
async function directTextEngine(filePath: string): Promise<OCRResult> {
  const startTime = Date.now();
  const text = await readDocument(filePath);
  return {
    text: cleanText(text),
    confidence: text.length > 10 ? 0.95 : 0.5,
    source: filePath,
    method: "direct",
    engine: "direct-text",
    language: "direct",
    processingTime: Date.now() - startTime,
    fallbackUsed: false,
  };
}

/** Tesseract OCR */
async function tesseractEngine(filePath: string, config: OCRConfig = {}): Promise<OCRResult> {
  const startTime = Date.now();
  const languages = (config.languages ?? DEFAULT_CONFIG.languages)!.join("+");
  let missing = missingTrainedData(languages.split("+"));
  if (missing.length) {
    if (process.env.OCR_AUTO_DOWNLOAD === "1") {
      const failed = await autoDownload(missing);
      missing = missingTrainedData(languages.split("+"));
      if (failed.length) console.warn("[OCR] Some languages failed to download:", failed.join(", "));
    }
    if (missing.length) throw new Error(`Missing Tesseract traineddata: ${missing.join(", ")}`);
  }

  let input: string | Buffer = filePath;
  try { input = await sharp(filePath).withMetadata({ density: 300 }).png().toBuffer(); } catch {}

  const result = await Tesseract.recognize(input, languages, { langPath: LANG_PATH, gzip: false });
  return {
    text: cleanText(result.data.text),
    confidence: (result.data.confidence ?? 0) / 100,
    source: filePath,
    method: "ocr",
    engine: "tesseract",
    language: languages,
    processingTime: Date.now() - startTime,
    fallbackUsed: false,
  };
}

/** PDF Hybrid engine using pdf-hybrid-processor.ts */
async function pdfHybridEngine(filePath: string): Promise<OCRResult> {
  const start = Date.now();
  const r = await processPdfHybrid(filePath, { langs: DEFAULT_CONFIG.languages! });
  return {
    text: r.text,
    confidence: r.docType === "text" ? 0.95 : 0.8,
    source: filePath,
    method: "hybrid",
    engine: "pdf-hybrid",
    language: DEFAULT_CONFIG.languages!.join("+"),
    processingTime: r.processingTime ?? (Date.now() - start),
    fallbackUsed: false,
  };
}

/** Engine registry */
const OCR_ENGINES: Record<string, OCREngine> = {
  direct: { name: "Direct Text", supportedTypes: [".txt",".docx",".doc",".rtf",".pdf"], priority: 1, process: directTextEngine },
  tesseract: { name: "Tesseract OCR", supportedTypes: [".jpg",".jpeg",".png",".bmp",".tiff",".tif",".pdf"], priority: 2, process: tesseractEngine },
  "pdf-hybrid": { name: "PDF Hybrid", supportedTypes: [".pdf"], priority: 0, process: pdfHybridEngine },
};

/** Engine selection based on type */
function selectEngine(filePath: string, config: OCRConfig): string {
  const ext = path.extname(filePath).toLowerCase();
  if (config.preferredEngine && config.preferredEngine !== "auto") return config.preferredEngine;
  if (ext === ".pdf") return "pdf-hybrid";
  if ([".doc",".docx",".rtf"].includes(ext)) return "direct";
  if ([".jpg",".jpeg",".png",".bmp",".tiff",".tif"].includes(ext)) return "tesseract";
  return "tesseract";
}

/** Main OCR extraction with fallback */
export async function extractText(filePath: string, config: OCRConfig = {}): Promise<OCRResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const primary = selectEngine(filePath, finalConfig);

  try {
    const engine = OCR_ENGINES[primary];
    if (!engine) throw new Error(`Unknown engine: ${primary}`);
    let result = await engine.process(filePath);
    if (result.confidence >= finalConfig.confidenceThreshold!) return result;

    // Fallback
    if (finalConfig.fallbackEnabled) {
      for (const [key, eng] of Object.entries(OCR_ENGINES)) {
        if (key !== primary && eng.supportedTypes.some(ext => path.extname(filePath) === ext)) {
          try {
            const fallback = await eng.process(filePath);
            if (fallback.confidence > result.confidence) return { ...fallback, fallbackUsed: true };
          } catch {}
        }
      }
    }

    return { ...result, fallbackUsed: true };
  } catch (err) {
    if (finalConfig.fallbackEnabled) {
      for (const [key, eng] of Object.entries(OCR_ENGINES)) {
        if (eng.supportedTypes.some(ext => path.extname(filePath) === ext)) {
          try { return { ...(await eng.process(filePath)), fallbackUsed: true }; } catch {}
        }
      }
    }
    throw err;
  }
}

export default extractText;
