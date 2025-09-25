import path from "path";
import fs from "fs";

const DOCUMENTS_PATH = path.join(__dirname, "../../storage/documents");
const METADATA_PATH = path.join(__dirname, "../../storage/metadata");

export function saveDocument(docId: string, text: string) {
  if (!fs.existsSync(DOCUMENTS_PATH)) fs.mkdirSync(DOCUMENTS_PATH, { recursive: true });
  fs.writeFileSync(path.join(DOCUMENTS_PATH, `${docId}.txt`), text, "utf-8");
}

export function loadDocument(docId: string): string | null {
  const filePath = path.join(DOCUMENTS_PATH, `${docId}.txt`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

export function saveMetadata(docId: string, metadata: object) {
  if (!fs.existsSync(METADATA_PATH)) fs.mkdirSync(METADATA_PATH, { recursive: true });
  fs.writeFileSync(path.join(METADATA_PATH, `${docId}.json`), JSON.stringify(metadata, null, 2), "utf-8");
}

export function loadMetadata(docId: string): object | null {
  const filePath = path.join(METADATA_PATH, `${docId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function searchDocuments(keyword: string): object[] {
  const files = fs.readdirSync(METADATA_PATH);
  const results: object[] = [];
  files.forEach(file => {
    const meta = JSON.parse(fs.readFileSync(path.join(METADATA_PATH, file), "utf-8"));
    if (JSON.stringify(meta).toLowerCase().includes(keyword.toLowerCase())) {
      results.push(meta);
    }
  });
  return results;
}
