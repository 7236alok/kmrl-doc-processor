import fs from "fs";
import path from "path";
import { createRequire } from "module";
import Tesseract from "tesseract.js";
import mammoth from "mammoth";
import { cleanText } from "./text-utils.js";
import AdmZip from "adm-zip";

const requireCJS = createRequire(import.meta.url);
const pdfParse: any = requireCJS('pdf-parse/lib/pdf-parse.js');

/**
 * Read text from a PDF file.
 * If the PDF is scanned (image-based), Tesseract OCR will be used.
 * @param filePath Path to PDF file
 * @param useOCR Optional: force OCR
 * @returns Cleaned text string
 */
export async function readPDF(filePath: string, useOCR = false): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const restoreWarn = suppressPdfFontWarning();
    try {
      const pdfData = await pdfParse(dataBuffer);

      if (pdfData.text.trim() && !useOCR) {
        return cleanText(pdfData.text);
      }
    } finally {
      restoreWarn();
    }
    // If OCR is required or PDF is image-only
    const imageText = await Tesseract.recognize(filePath, "eng+hin+mal", {
      logger: (m: { progress?: number }) => console.log("OCR progress:", m.progress),
    });

    return cleanText(imageText.data.text);
  } catch (err) {
    console.error("Error reading PDF:", err);
    return "";
  }
}

function suppressPdfFontWarning(): () => void {
  const patterns = [/Ran out of space in font private use area/i];
  const shouldSuppress = (args: any[]) => {
    try {
      const msg = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      return patterns.some((re) => re.test(msg));
    } catch {
      return false;
    }
  };

  const original = {
    warn: console.warn,
    error: console.error,
    log: console.log,
  };

  console.warn = (...args: any[]) => {
    if (shouldSuppress(args)) return;
    original.warn(...args);
  };
  console.error = (...args: any[]) => {
    if (shouldSuppress(args)) return;
    original.error(...args);
  };
  console.log = (...args: any[]) => {
    if (shouldSuppress(args)) return;
    original.log(...args);
  };

  return () => {
    console.warn = original.warn;
    console.error = original.error;
    console.log = original.log;
  };
}

/**
 * Read text from a DOCX file
 * @param filePath Path to DOCX file
 * @returns Cleaned text string
 */
export async function readDOCX(filePath: string): Promise<string> {
  try {
    // 1. Extract textual content via mammoth
    let extractedText = "";
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      extractedText = result.value || "";
    } catch (e) {
      console.warn("[readDOCX] Mammoth text extraction failed, continuing with image OCR only:", (e as Error).message);
    }

    // 2. Extract embedded images from DOCX (ZIP) and OCR them
    let ocrImageText: string[] = [];
    try {
      const zip = new AdmZip(filePath);
      const entries = zip.getEntries();
  const imageEntries = entries.filter((e: any) => /word\/(media|embeddings)\//i.test(e.entryName) && /\.(png|jpe?g|bmp|tiff?)$/i.test(e.entryName));
      if (imageEntries.length) {
        for (const img of imageEntries) {
          try {
            const data = img.getData();
            // Create a temporary in-memory buffer path alternative: Tesseract can take a buffer directly
            const { data: { text } } = await Tesseract.recognize(data, "eng+hin+mal", { logger: () => {} });
            const cleaned = cleanText(text);
            if (cleaned) ocrImageText.push(cleaned);
          } catch (ie) {
            console.warn('[readDOCX] Image OCR failed for', img.entryName, (ie as Error).message);
          }
        }
      }
    } catch (zipErr) {
      console.warn('[readDOCX] ZIP/image extraction issue:', (zipErr as Error).message);
    }

    const combined = [extractedText, ...ocrImageText].filter(Boolean).join('\n\n');
    return cleanText(combined);
  } catch (err) {
    console.error("Error reading DOCX:", err);
    return "";
  }
}

/**
 * Read text from a plain text file
 * @param filePath Path to text file
 * @returns Cleaned text string
 */
export async function readTXT(filePath: string): Promise<string> {
  try {
    const text = await fs.promises.readFile(filePath, "utf-8");
    return cleanText(text);
  } catch (err) {
    console.error("Error reading TXT:", err);
    return "";
  }
}

/**
 * Read a document (PDF, DOCX, or TXT) and return text
 * @param filePath Path to document
 * @returns Cleaned text string
 */
export async function readDocument(filePath: string): Promise<string> {
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".pdf") return await readPDF(filePath);
    if (ext === ".docx") return await readDOCX(filePath);
    if (ext === ".txt") return await readTXT(filePath);
    throw new Error("Unsupported file type: " + ext);
  } catch (err) {
    console.error("Error reading document:", err);
    return "";
  }
}
