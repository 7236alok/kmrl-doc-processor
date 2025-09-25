import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
// Use dynamic imports for optional runtime dependencies

// Load pdf-parse using CommonJS require to avoid its internal test/debug
// block that executes when the module is loaded with no parent.
const requireCJS = createRequire(import.meta.url);
// Require the internal implementation directly to avoid the package's
// top-level test code in `index.js` which performs filesystem reads.
const pdfParse: any = requireCJS('pdf-parse/lib/pdf-parse.js');

// Read PDF and return text
export async function readPDF(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer as Buffer);
  return pdfData.text;
}

// Read DOCX and return text
export async function readDOCX(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  // The 'docx' library is primarily a document generator; to parse DOCX content
  // we can use a lightweight approach: extract text by unzipping and reading
  // document.xml, but to keep dependencies minimal we'll attempt a simple
  // fallback: use 'docx' to parse if possible, otherwise read raw XML.
  // Use adm-zip to extract document.xml from the DOCX archive and strip tags
  try {
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(buffer);
    const docXmlEntry = zip.getEntry('word/document.xml');
    if (docXmlEntry) {
      const xml = docXmlEntry.getData().toString('utf8');
      const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return text;
    }
    // if we reached here, document.xml was not found in the archive
    throw new Error('DOCX archive does not contain word/document.xml');
  } catch (err) {
    // If adm-zip isn't available or extraction fails, throw an error with guidance
    throw new Error('Unable to parse DOCX file; ensure `adm-zip` is installed');
  }
}

// Utility to detect file type and read
export async function readDocument(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') return readPDF(filePath);
  if (ext === '.docx') return readDOCX(filePath);
  throw new Error('Unsupported file type: ' + ext);
}
