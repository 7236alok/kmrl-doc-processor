import fs from 'fs';
import path from 'path';

const DOCUMENTS_PATH = path.join(__dirname, '../../storage/documents');
const METADATA_PATH = path.join(__dirname, '../../storage/metadata');

// Save document text
export function saveDocument(docId: string, text: string): void {
  if (!fs.existsSync(DOCUMENTS_PATH)) fs.mkdirSync(DOCUMENTS_PATH, { recursive: true });
  fs.writeFileSync(path.join(DOCUMENTS_PATH, `${docId}.txt`), text, 'utf-8');
}

// Load document text
export function loadDocument(docId: string): string {
  const filePath = path.join(DOCUMENTS_PATH, `${docId}.txt`);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
}

// Save metadata as JSON
export function saveMetadata(docId: string, metadata: object): void {
  if (!fs.existsSync(METADATA_PATH)) fs.mkdirSync(METADATA_PATH, { recursive: true });
  fs.writeFileSync(path.join(METADATA_PATH, `${docId}.json`), JSON.stringify(metadata, null, 2), 'utf-8');
}

// Load metadata JSON
export function loadMetadata(docId: string): object | null {
  const filePath = path.join(METADATA_PATH, `${docId}.json`);
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : null;
}

export default { saveDocument, loadDocument, saveMetadata, loadMetadata };
