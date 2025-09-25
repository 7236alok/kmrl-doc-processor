import { extractText } from "../ocr/index.js";
import { translateText } from "../translation/index.js";
import { summarizeText } from "../summarization/index.js";
import { extractEntities } from "../ner/index.js";
import { classifyDocument } from "../classification/index.js";
import { generateEmbedding } from "../embeddings/index.js";
import { buildMetadata } from "../metadata/index.js";
import { saveDocument, saveMetadata } from "../../utils/storage-utils.js";
import { readFileSync } from "fs";
import { detectLanguage, initLangDetect } from "../../utils/text-utils.js";
import { normalizeLangCode } from "../../utils/lang-utils.js";

// Simple language detection based on character patterns

export async function runPipeline(filePath: string, docId: string) {
  const startTime = Date.now();
  const fileName = filePath.split("\\").pop() || "document";
  const successfulSteps: string[] = [];
  
  // Read original file content for metadata
  let originalFileContent: Buffer | undefined;
  try {
    originalFileContent = readFileSync(filePath);
  } catch (error) {
    console.warn("Could not read original file content:", error);
  }

  console.log("Running OCR...");
  const ocrResult = await extractText(filePath);
  successfulSteps.push('ocr');

  console.log("Detecting language...");
  try {
    await initLangDetect();
  } catch (err) {
    console.warn('[pipeline-runner] Language detector init failed, proceeding with fallback:', (err as Error).message);
  }

  const rawDetectedLang = await detectLanguage(ocrResult.text);
  const detectedLang = normalizeLangCode(rawDetectedLang);
  const sourceLang = detectedLang === 'unknown' ? "auto" : detectedLang;

  console.log("Translating text...");
  const translationResult = await translateText(ocrResult.text, sourceLang, "English");
  successfulSteps.push('translation');

  console.log("Summarizing text...");
  // Map detected language to summarizer language format
  const summarizerLang = detectedLang === 'mal' ? 'malayalam' : 
                        detectedLang === 'hin' ? 'hindi' : 'english';
  const summaryResult = await summarizeText(translationResult.translatedText, summarizerLang);
  successfulSteps.push('summarization');

  console.log("Extracting entities...");
  const nerResult = await extractEntities(translationResult.translatedText);
  successfulSteps.push('ner');

  console.log("Classifying document...");
  const classificationResult = await classifyDocument(translationResult.translatedText);
  successfulSteps.push('classification');

  console.log("Generating embeddings...");
  const embeddingResult = await generateEmbedding(translationResult.translatedText);
  successfulSteps.push('embedding');

  console.log("Building metadata...");
  const metadata = await buildMetadata(
    docId,
    fileName,
    detectedLang,
    ocrResult.text,
    summaryResult,
    nerResult,
    classificationResult,
    embeddingResult,
    ocrResult // Enhanced OCR result
  );

  console.log("Saving document and metadata...");
  await saveDocument(docId, translationResult.translatedText);
  await saveMetadata(docId, metadata);

  console.log("Pipeline completed successfully.");
  return metadata;
}
