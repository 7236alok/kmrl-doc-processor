import './bootstrap/xenova-env.js';
import { bootstrapSummarizerModel } from './bootstrap/summarizer-bootstrap.js';
import { bootstrapLangDetectModel } from './bootstrap/langdetect-bootstrap.js';
import path from "path";
import fs from "fs/promises";
import fssync from "fs";
import { readDocument } from "./utils/file-utils.js";
import { cleanText, detectLanguage, getLangName, initLangDetect, detectMultilingualContent } from "./utils/text-utils.js";
import { normalizeLangCode } from "./utils/lang-utils.js";
import { saveDocument, saveMetadata } from "./utils/storage-utils.js";
import logger from "./config/logger.js"; // Structured logger

// Pipeline modules
import { extractText } from "./modules/ocr/index.js";
import { translateText } from "./modules/translation/index.js";
import { summarizeText } from "./modules/summarization/index.js";
import { extractEntities } from "./modules/ner/index.js";
import { classifyDocument } from "./modules/classification/index.js";
import { generateEmbedding } from "./modules/embeddings/index.js";
import { buildMetadata } from "./modules/metadata/index.js";

/** Interfaces for module results */
interface PipelineResults {
  summary?: import("./types/summary.js").SummaryResult | string;
  entities?: import("./types/ner.js").NEROutput | any[];
  classification?: import("./types/classification.js").ClassificationResult;
  embedding?: import("./types/embedding.js").EmbeddingResult | number[];
}

/**
 * Process a single document
 * @param filePath Path to document
 * @param docId Unique document ID
 */
async function processDocument(filePath: string, docId: string) {
  const startTime = Date.now();
  const successfulSteps: string[] = [];
  
  logger.info(`=== Starting Document Processing Pipeline for ${docId} ===`);

  // Validate file exists
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`File not found: ${filePath}`);
  }

  // Read original file content for metadata
  let originalFileContent: Buffer | undefined;
  try {
    originalFileContent = await fs.readFile(filePath);
  } catch (error) {
    logger.warn("Could not read original file content for metadata", { error: String(error) });
  }

  // Step 1: Read & clean document
  logger.info("Reading document...");
  let rawText = "";
  try {
    rawText = await readDocument(filePath);
  } catch (err) {
    logger.error("Error reading document", { error: String(err) });
    throw err;
  }
  const text = cleanText(rawText);
  logger.info(`Document length: ${text.length} characters`);

  // Step 2: OCR (even for text files for consistency)
  const ocrResult = {
    text: text,
    confidence: 1,
    language: "unknown",
    engine: "direct-text",
    method: "direct" as const
  };
  successfulSteps.push('ocr');

  // Step 3: Detect language
  const rawDetectedLang = await detectLanguage(text);
  let detectedLang = normalizeLangCode(rawDetectedLang);
  if (detectedLang === "unknown" && /^[\x00-\x7F]*$/.test(text)) {
    // If the text is ASCII-only, assume English
    detectedLang = "eng";
  }
  const langName = getLangName(detectedLang);
  const multiInfo = detectMultilingualContent(text);
  const languageLabel = multiInfo.scripts.length > 1 ? multiInfo.label : langName;
  logger.info(`Detected language: ${detectedLang} (${languageLabel})`);

  // Step 4: Translation to English if needed
  let translatedText = text;
  if (detectedLang !== "eng" && detectedLang !== "unknown") {
    try {
      logger.info("Translating text to English...");
      const translationResult = await translateText(text, detectedLang, "English");
      translatedText = translationResult.translatedText;
      successfulSteps.push('translation');
    } catch (err) {
      logger.warn("Translation failed, continuing with original text", { error: String(err) });
    }
  } else {
    successfulSteps.push('translation'); // No translation needed
  }
  
  // Determine summarizer language based on whether translation changed the text
  const summarizerLang = (() => {
    const iso3 = translatedText === text ? detectedLang : "eng";
    switch (iso3) {
      case "eng": return "english";
      case "hin": return "hindi"; 
      case "mal": return "malayalam";
      default: return "english";
    }
  })();

  // Step 5–8: Run independent modules in parallel
  const results: PipelineResults = {};
  // Quick diagnostic: ensure model path exists (helps distinguish MOCK fallback causes)
  try {
    const modelPath = path.resolve(process.cwd(), "models/Xenova/distilbart-cnn-6-6");
    console.log("[DIAG] Checking model path exists:", fssync.existsSync(modelPath), modelPath);
  } catch {}
  await Promise.allSettled([
    (async () => {
      try {
        logger.info("Summarizing document...");
        results.summary = await summarizeText(translatedText, summarizerLang);
        successfulSteps.push('summarization');
      } catch (err) {
        logger.warn("Summarization failed", { error: String(err) });
      }
    })(),
    (async () => {
      try {
        logger.info("Extracting entities...");
        results.entities = await extractEntities(translatedText);
        successfulSteps.push('ner');
      } catch (err) {
        logger.warn("NER failed", { error: String(err) });
      }
    })(),
    (async () => {
      try {
        logger.info("Classifying document...");
        results.classification = await classifyDocument(translatedText);
        successfulSteps.push('classification');
      } catch (err) {
        logger.warn("Classification failed", { error: String(err) });
      }
    })(),
    (async () => {
      try {
        logger.info("Generating embeddings...");
        results.embedding = await generateEmbedding(translatedText);
        successfulSteps.push('embedding');
      } catch (err) {
        logger.warn("Embedding generation failed", { error: String(err) });
      }
    })(),
  ]);

  // Step 9: Build enhanced metadata
  const metadata = await buildMetadata(
    docId,
    path.basename(filePath),
    languageLabel,
    text, // Use original text for analysis
    results.summary as any,
    results.entities as any,
    results.classification as any,
    results.embedding as any,
    ocrResult // Enhanced OCR result
  );

  // Step 10: Save document and metadata
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

import { runBatchProcessor } from "./batchProcessor.js";
// Dynamic import for the public fetcher to avoid loading network deps in build unless needed
async function fetchDriveIfConfigured() {
  try {
    const candidates = [
      // Prefer advanced script compiled from src first (has upload/delete logic)
      path.join(process.cwd(), 'dist', 'src', 'scripts', 'fetch-drive-public.js'),
      // Fallback: script placed outside src (basic download-only version)
      path.join(process.cwd(), 'dist', 'scripts', 'fetch-drive-public.js'),
      // Shim (compiled)
      path.join(process.cwd(), 'dist', 'src', 'scripts', 'fetch-drive-public-shim.js'),
      // Direct relative path from compiled index (works when running under ts-node in dev with ESM transpile)
      path.join(process.cwd(), 'src', 'scripts', 'fetch-drive-public.js'),
      path.join(process.cwd(), 'scripts', 'fetch-drive-public.js'),
      // TypeScript sources (last resort if ts-node style runtime supports .ts imports)
      path.join(process.cwd(), 'src', 'scripts', 'fetch-drive-public.ts'),
      path.join(process.cwd(), 'scripts', 'fetch-drive-public.ts')
    ];
    let attempted = 0;
    for (const p of candidates) {
      try {
        attempted++;
        if (!fssync.existsSync(p)) continue;
        // Windows Node ESM requires file:// URLs for absolute paths
        let spec = p;
        if (!spec.startsWith('file://')) {
          const normalized = p.replace(/\\/g, '/');
            spec = 'file://' + (normalized.startsWith('/') ? normalized : '/' + normalized);
        }
        const fetchModule: any = await import(spec + `?v=${Date.now()}`); // bust stale cache
        if (fetchModule && typeof fetchModule.run === 'function') {
          console.log('[FETCH] Using fetch module at', p);
          console.log('[FETCH] Fetching files from Google Drive into not-processed folder...');
          await fetchModule.run();
          return;
        } else if (process.env.DRIVE_FETCH_DEBUG === '1') {
          console.log('[FETCH][DEBUG] Module found but no run() export:', p);
        }
      } catch (e) {
        if (process.env.DRIVE_FETCH_DEBUG === '1') console.log('[FETCH][DEBUG] Import failed for', p, (e as Error).message);
      }
    }
    if (process.env.DRIVE_FETCH_DEBUG === '1') {
      console.log('[FETCH][DEBUG] No fetch-drive-public module located. Attempted paths:', attempted, '\n', candidates.join('\n'));
    }
  } catch (err) {
    console.warn('[FETCH] Fetch-from-Drive skipped or failed:', (err as Error).message);
  }
}

/** Demo runner for a single document */
async function main() {
  const filePath = path.join(process.cwd(), "test-document.txt");
  const documentName = "test-document";  // Example document to process

  try {
    await processDocument(filePath, documentName);
  } catch (err) {
    console.error("Caught error in main:", err);
    logger.error("Pipeline error:", { 
      error: String(err), 
      stack: (err instanceof Error ? err.stack : 'N/A') 
    });
  }
}

/** Batch processor main function */
async function batchMain() {
  try {
    await runBatchProcessor();
  } catch (err) {
    console.error("Batch processing failed:", err);
    logger.error("Batch processing error:", { 
      error: String(err), 
      stack: (err instanceof Error ? err.stack : 'N/A') 
    });
    process.exit(1);
  }
}

// Unified startup: always attempt Drive fetch first, then decide mode.
(async () => {
  // Optional summarizer bootstrap prior to fetching drive files
  try { await bootstrapSummarizerModel(); } catch {}
  // Ensure langdetect artifacts are present (best-effort)
  try { await bootstrapLangDetectModel(); } catch {}

  try {
    await initLangDetect();
  } catch (err) {
    logger.warn('Language detector init failed; will fallback to lazy init', { error: String(err) });
  }

  // Always attempt fetch on every start
  await fetchDriveIfConfigured();

  // Determine mode after fetch: batch if --batch OR any files in not-processed OR missing test-document.txt
  const forceBatchFlag = process.argv.includes('--batch');
  const testDocExists = fssync.existsSync(path.join(process.cwd(), 'test-document.txt'));
  const notProcessedDir = path.join(process.cwd(), 'storage', 'documents', 'not-processed');
  let hasIncoming = false;
  try {
    if (!fssync.existsSync(notProcessedDir)) {
      fssync.mkdirSync(notProcessedDir, { recursive: true });
    }
    const entries = fssync.readdirSync(notProcessedDir).filter(f => !f.startsWith('.'));
    hasIncoming = entries.length > 0;
    if (hasIncoming) console.log(`[FETCH] Found ${entries.length} file(s) in not-processed after fetch.`);
  } catch (e) {
    console.warn('[FETCH] Could not inspect not-processed directory:', (e as Error).message);
  }

  const runBatch = forceBatchFlag || hasIncoming || !testDocExists;
  if (runBatch) {
    batchMain().catch(err => {
      console.error('Unhandled rejection in batch mode:', err);
      logger.error('Unhandled rejection in batch:', { error: String(err), stack: (err instanceof Error ? err.stack : 'N/A') });
      process.exit(1);
    });
  } else {
    main().catch(err => {
      console.error('Unhandled rejection in main:', err);
      logger.error('Unhandled rejection:', { error: String(err), stack: (err instanceof Error ? err.stack : 'N/A') });
      process.exit(1);
    });
  }
})();
