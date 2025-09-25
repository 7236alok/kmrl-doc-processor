# Metadata Module

Builds rich, structured metadata for a processed document by combining OCR, summarization, NER, classification, and embeddings outputs.

## Exports
- `buildMetadata(docId, fileName, language, ocrText, summary, ner, classification, embedding, ocrResult?, startTime?, successfulSteps?, originalFileContent?): Promise<Metadata>`

`Metadata` type is defined in `src/types/metadata.ts`.

## Inputs
- `docId: string` – Unique document ID used for storage.
- `fileName: string` – Original file name.
- `language: string` – Detected language code (e.g., `eng|hin|mal`).
- `ocrText: string` – OCR or extracted text.
- `summary?: SummaryResult` – Summary and departments.
- `ner?: NEROutput` – Named entities (persons, dates, locations, organizations).
- `classification?: ClassificationResult` – Category + confidence.
- `embedding?: EmbeddingResult` – Vector embedding info.
- `ocrResult?: OCRResult` – Detailed OCR info (engine, confidence).
- `startTime?: number` – Pipeline start timestamp (ms).
- `successfulSteps?: string[]` – List of completed steps.
- `originalFileContent?: Buffer` – Optional for file size.

## Output Highlights
- `summary`, `actionItems` (deduplicated + cleaned, with priority/category heuristics)
- `classification`, `ner`, `dueDates` (ISO)
- `relatedAssets` – TS-IDs, stations, equipment mentions
- `fileInfo` – extension, size, checksum
- `mlInsights` – simple confidence and script breakdowns
- `domain` – topic tags, compliance flags, alert level
- `knowledgeLinks` – asset connections and compliance references
- `traceabilityInfo` – pipeline steps, provenance, quality metrics

## Usage
```ts
import { buildMetadata } from "./index.js";

const metadata = await buildMetadata(
  docId,
  fileName,
  detectedLang,
  ocrText,
  summary,
  ner,
  classification,
  embedding,
  ocrResult,
  startTime,
  successfulSteps,
  originalFileContent,
);
```

## Notes
- Includes defensive sanitization and fallbacks for dates/action items.
- KMRL domain heuristics for stations, equipment, and TS ranges.
- Ensure `ocrText` is cleaned; noisy input reduces heuristic accuracy.
