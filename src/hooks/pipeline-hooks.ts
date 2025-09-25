import fsp from 'fs/promises';
import path from 'path';
import { translateText } from '../modules/translation/index.js';
import { summarizeText } from '../modules/summarization/index.js';

const DOC_DIR = path.resolve('./storage/documents');

async function readOCRText(docId: string): Promise<string> {
  const ocrPath = path.join(DOC_DIR, `${docId}.ocr.txt`);
  try {
    return await fsp.readFile(ocrPath, 'utf-8');
  } catch (e) {
    throw new Error(`OCR text not found for docId=${docId}`);
  }
}

export async function rerunTranslation(docId: string, sourceLang = 'auto'): Promise<string> {
  const rawText = await readOCRText(docId);
  // translation-service returns { translatedText }
  const res = await translateText(rawText, sourceLang as any, 'English');
  const translatedText = (res as any).translatedText ?? rawText;
  await fsp.writeFile(path.join(DOC_DIR, `${docId}.txt`), translatedText, 'utf-8');
  return translatedText;
}

export async function rerunSummarization(docId: string, lang = 'en'): Promise<string> {
  const sourcePath = path.join(DOC_DIR, `${docId}.txt`);
  const textToSummarize = await fsp.readFile(sourcePath, 'utf-8');
  const summaryRes = await summarizeText(textToSummarize, lang);
  const summaryText = (summaryRes as any).summary || (summaryRes as any).summary_text || JSON.stringify(summaryRes);
  await fsp.writeFile(path.join(DOC_DIR, `${docId}.summary.txt`), summaryText.toString(), 'utf-8');
  return summaryText.toString();
}

export default { rerunTranslation, rerunSummarization };
