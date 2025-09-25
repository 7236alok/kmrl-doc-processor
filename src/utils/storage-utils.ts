// src/utils/storage-utils.ts
import fs from "fs-extra";
import path from "path";

const DOCUMENTS_PATH = path.join(process.cwd(), "storage/documents");
const METADATA_PATH = path.join(process.cwd(), "storage/metadata");

/**
 * Save document text to local storage
 * @param docId Unique document ID
 * @param text Document text
 */
export async function saveDocument(docId: string, text: string): Promise<void> {
  try {
    await fs.ensureDir(DOCUMENTS_PATH);
    await fs.writeFile(path.join(DOCUMENTS_PATH, `${docId}.txt`), text, "utf-8");
  } catch (err) {
    console.error(`Error saving document ${docId}:`, err);
    throw err;
  }
}

/**
 * Save raw OCR text (pre-translation) separately for audit / reprocessing.
 * Stored alongside processed documents with suffix .ocr.txt
 */
export async function saveOCRText(docId: string, ocrText: string): Promise<string> {
  try {
    await fs.ensureDir(DOCUMENTS_PATH);
    const filePath = path.join(DOCUMENTS_PATH, `${docId}.ocr.txt`);
    await fs.writeFile(filePath, ocrText, 'utf-8');
    return filePath;
  } catch (err) {
    console.error(`Error saving OCR raw text for ${docId}:`, err);
    throw err;
  }
}

/**
 * Load document text from local storage
 * @param docId Unique document ID
 * @returns Text content or null if not found
 */
export function loadDocument(docId: string): string | null {
  try {
    const filePath = path.join(DOCUMENTS_PATH, `${docId}.txt`);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    console.error(`Error loading document ${docId}:`, err);
    return null;
  }
}

/**
 * Save metadata JSON for a document
 * @param docId Unique document ID
 * @param metadata Metadata object
 */
export async function saveMetadata(docId: string, metadata: object): Promise<void> {
  try {
    await fs.ensureDir(METADATA_PATH);
    await fs.writeJSON(path.join(METADATA_PATH, `${docId}.json`), metadata, { spaces: 2 });
  } catch (err) {
    console.error(`Error saving metadata for ${docId}:`, err);
    throw err;
  }
}

/**
 * Load metadata JSON for a document
 * @param docId Unique document ID
 * @returns Metadata object or null
 */
export function loadMetadata(docId: string): object | null {
  try {
    const filePath = path.join(METADATA_PATH, `${docId}.json`);
    if (!fs.existsSync(filePath)) return null;
    return fs.readJSONSync(filePath);
  } catch (err) {
    console.error(`Error loading metadata for ${docId}:`, err);
    return null;
  }
}

/**
 * Search metadata for documents containing a keyword (case-insensitive)
 * @param keyword Keyword to search
 * @returns Array of matching metadata objects
 */
export function searchDocuments(keyword: string): object[] {
  const results: object[] = [];
  try {
    if (!fs.existsSync(METADATA_PATH)) return results;
    const files = fs.readdirSync(METADATA_PATH);
    for (const file of files) {
      const meta = fs.readJSONSync(path.join(METADATA_PATH, file));
      if (JSON.stringify(meta).toLowerCase().includes(keyword.toLowerCase())) {
        results.push(meta);
      }
    }
  } catch (err) {
    console.error("Error searching documents:", err);
  }
  return results;
}
