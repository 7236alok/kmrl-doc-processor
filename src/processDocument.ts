// src/processDocument.ts
import path from "path";
import fs from "fs/promises";
import { readDocument } from "./utils/file-utils.js";
import { cleanText, detectLanguage, getLangName, detectMultilingualContent } from "./utils/text-utils.js";
import { normalizeLangCode } from "./utils/lang-utils.js";
import { saveDocument, saveMetadata, saveOCRText } from "./utils/storage-utils.js";
import logger from "./config/logger.js"; // structured logger

// Pipeline modules
import { translateText } from "./modules/translation/index.js";
import { summarizeText } from "./modules/summarization/index.js";
import { extractEntities } from "./modules/ner/index.js";
import { classifyDocument } from "./modules/classification/index.js";
import { generateEmbedding } from "./modules/embeddings/index.js";
import { buildMetadata } from "./modules/metadata/index.js";
import { extractText, getOCRConfigForDocument } from "./modules/ocr/index.js";

/** Interfaces for module results */
interface PipelineResults {
  summary?: import("./types/summary.js").SummaryResult | string;
  entities?: import("./types/ner.js").NEROutput | any[];
  classification?: import("./types/classification.js").ClassificationResult;
  embedding?: import("./types/embedding.js").EmbeddingResult | number[];
  ocr?: import("./types/ocr.js").OCRResult;
}

/**
 * Process a single document with enhanced OCR support
 * @param filePath Path to the document (PDF/DOCX/image)
 * @param docId Unique document ID
 * @param documentType Optional document type hint for OCR optimization
 */
export async function processDocument(filePath: string, docId: string, documentType?: string) {
  logger.info(`=== Starting Document Processing Pipeline for ${docId} ===`);
  const startTime = Date.now();

  // Step 0: Validate file exists
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`File not found: ${filePath}`);
  }

  // Step 1: Enhanced text extraction with multi-engine OCR support
  logger.info("Reading document...");
  let rawText = "";
  let ocrResult: any = null;
  
  try {
    // Decide whether to run OCR based on file type. Only PDFs, Office docs and images go through OCR.
    const ext = path.extname(filePath).toLowerCase();
    const imageOrPdfExts = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'];

    if (imageOrPdfExts.includes(ext)) {
      // Get OCR configuration based on document type and filename
      const ocrConfig = getOCRConfigForDocument(filePath, documentType);
      // Use enhanced OCR system for text extraction
      ocrResult = await extractText(filePath, ocrConfig);
      rawText = ocrResult.text;
    } else {
      // Non-OCR file types: use fast legacy read and continue pipeline
      logger.info('Skipping OCR for non-image/text-heavy file type, using fast reader');
      rawText = await readDocument(filePath);
    }
    try {
      const ocrPath = await saveOCRText(docId, rawText);
      logger.info(`Saved raw OCR text: ${ocrPath}`);
    } catch (saveErr) {
      logger.warn("Failed to save raw OCR text", { error: String(saveErr) });
    }
    
    logger.info(`Text extraction completed using ${ocrResult.engine} engine`);
    if (ocrResult.fallbackUsed) {
      logger.info("Fallback engine was used for processing");
    }
    
  } catch (err) {
    logger.error("Error extracting text from document", { error: String(err) });
    
    // Fallback to legacy file reading for compatibility
    try {
      logger.info("Attempting legacy file reading...");
      rawText = await readDocument(filePath);
    } catch (legacyErr) {
      logger.error("Legacy file reading also failed", { error: String(legacyErr) });
      throw err;
    }
  }

  const text = cleanText(rawText);
  logger.info(`Document length: ${text.length} characters`);

  // Log OCR performance metrics if available
  if (ocrResult) {
    logger.info(`OCR confidence: ${(ocrResult.confidence * 100).toFixed(1)}%`);
    if (ocrResult.processingTime) {
      logger.info(`OCR processing time: ${ocrResult.processingTime}ms`);
    }
  }

  // Step 2: Detect language
  const rawDetectedLang = await detectLanguage(text);
  const detectedLang = normalizeLangCode(rawDetectedLang);
  const langName = getLangName(detectedLang);
  const multiInfo = detectMultilingualContent(text);
  const asciiRatio = text.length ? ((text.match(/[\x00-\x7F]/g)?.length ?? 0) / text.length) : 0;
  const mixedLabel = multiInfo.scripts.length > 1 ? multiInfo.label : langName;
  const finalLangName = (detectedLang === "unknown" && asciiRatio > 0.9) ? "English" : mixedLabel;
  logger.info(`Detected language: ${detectedLang} (${finalLangName})`);

  // Step 3: Translate to English if needed
  let translatedText = text;
  if (detectedLang !== "eng" && detectedLang !== "unknown") {
    try {
      logger.info("Translating text to English...");
      const translationResult = await translateText(text, detectedLang, "English");
      translatedText = translationResult.translatedText;
    } catch (err) {
      logger.warn("Translation failed, continuing with original text", { error: String(err) });
    }
  }
  // Persist the post-translation text for downstream pipeline consumption.
  try {
    await saveDocument(docId, translatedText);
    logger.info(`Saved translated document: ${docId}.txt`);
  } catch (saveErr) {
    logger.warn('Failed to save translated document .txt', { error: String(saveErr) });
  }
  // Determine summarizer language based on whether translation changed the text
  const summarizerLang = (() => {
    const iso3 = translatedText === text ? detectedLang : "eng";
    switch (iso3) {
      case "eng": return "en";
      case "hin": return "hi";
      case "mal": return "ml";
      default: return "en";
    }
  })();

  // Step 4–7: Run independent modules in parallel
  const results: PipelineResults = {};
  
  // Store OCR result for metadata
  if (ocrResult) {
    results.ocr = ocrResult;
  }
  
  await Promise.allSettled([
    (async () => {
      try {
    logger.info("Summarizing document...");
  results.summary = await summarizeText(translatedText, summarizerLang) as any;
      } catch (err) {
        logger.warn("Summarization failed", { error: String(err) });
      }
    })(),
    (async () => {
      try {
        logger.info("Extracting entities...");
  results.entities = await extractEntities(translatedText) as any;
      } catch (err) {
        logger.warn("NER failed", { error: String(err) });
      }
    })(),
    (async () => {
      try {
        logger.info("Classifying document...");
  results.classification = await classifyDocument(translatedText) as any;
      } catch (err) {
        logger.warn("Classification failed", { error: String(err) });
      }
    })(),
    (async () => {
      try {
        logger.info("Generating embeddings...");
  results.embedding = await generateEmbedding(translatedText) as any;
      } catch (err) {
        logger.warn("Embedding generation failed", { error: String(err) });
      }
    })(),
  ]);

  // Step 8: Build metadata (exclude full text)
  // Build list of successful steps for traceability
  const successfulSteps: string[] = ['ocr'];
  if (results.summary) successfulSteps.push('summarization');
  if (results.entities) successfulSteps.push('ner');
  if (results.classification) successfulSteps.push('classification');
  if (results.embedding) successfulSteps.push('embedding');

  const metadata = await buildMetadata(
    docId,
    path.basename(filePath),
    finalLangName,
    translatedText, // provide text for hashing/metrics only (not stored)
    results.summary as any,
    results.entities as any,
    results.classification as any,
    results.embedding as any,
    results.ocr // pass OCR result for enhanced metadata
  );

  // Step 9: Save document and metadata
  try {
    logger.info("Saving document and metadata...");
    await saveDocument(docId, translatedText);
    await saveMetadata(docId, metadata);
  } catch (err) {
    logger.error("Failed to save document/metadata", { error: String(err) });
  }

  logger.info(`=== Document Processing Completed for ${docId} ===`);
  logger.info("Metadata:", { metadata });

  return metadata;
}
