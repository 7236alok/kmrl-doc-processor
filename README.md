# KMRL Document Processor

Modular, offline-first document processing pipeline for OCR, translation, summarization, NER, classification, embeddings, and rich metadata extraction. Designed for multilingual content (English, Hindi, Malayalam) with resilient parallel execution and graceful fallbacks.

## Highlights
- Modular services per step under `src/modules/*`
- Parallel, resilient pipeline with `Promise.allSettled()`
- Offline-first design with deterministic fallbacks
- Strict TypeScript types and ESM modules
- Storage abstraction with JSON metadata persistence

## Quick Start (Windows PowerShell)
```powershell
# 1) Install dependencies
npm run setup-env

# 2) Start in dev mode (ts-node)
npm start

# 3) Or build + run compiled output
npm run build
npm run start:dist
```

If `npm run setup-env` is unavailable, use:
```powershell
npm install
```

## Environment & Requirements
- Node.js 22.14.x (see `.nvmrc`)
- ESM project (`"type": "module"`)
- Tesseract language data in `./tessdata` for OCR:
  - `eng.traineddata`, `hin.traineddata`, `mal.traineddata`
  - Option 1 (auto): set env var `OCR_AUTO_DOWNLOAD=1` on first run and the app will fetch missing files automatically into `tessdata/`.
  - Option 2 (manual): run `npm run download-tessdata` (uses languages from `OCR_LANGUAGES` env or defaults to eng,hin,mal).
  - Option 3 (offline/manual copy): place the `.traineddata` files manually in `tessdata/`.
- Optional local models for summarization under `./models` (see below)

Environment variables (via `.env`, loaded by `src/config/env.ts`):
- `OPENAI_API_KEY` (optional; not required by the default offline pipeline)
- `HF_API_KEY` (optional)

## Project Structure
- `src/index.ts` – entry for orchestrating the pipeline in code
- `src/modules/` – modular services
  - `ocr/` – Tesseract + text/PDF engines (`extractText`)
  - `translation/` – offline passthrough interface (`translateText`)
  - `summarization/` – offline Transformers or extractive fallback (`summarizeText`)
  - `ner/` – regex/heuristics NER (`extractEntities`)
  - `classification/` – deterministic category classifier (`classifyDocument`)
  - `embeddings/` – deterministic offline vectors (`generateEmbedding`)
  - `metadata/` – metadata compiler (`buildMetadata`)
  - `pipeline/` – end-to-end runner (`runPipeline`)
- `src/config/` – env, logger, model and OCR config
- `src/utils/` – file, storage, language, and text utilities
- `storage/documents/` – processed text storage
- `storage/metadata/` – extracted metadata JSON
- `tessdata/` – Tesseract language files
- `docs/` – API spec, architecture, and dataflow notes

Each module has its own README under `src/modules/<module>/README.md`.

## How The Pipeline Works
The main runner (`src/modules/pipeline/runPipeline`) performs:
1. OCR → `extractText(filePath)`
2. Language detection → simple script-based heuristic (`eng|hin|mal`)
3. Translation → `translateText` (offline passthrough by default)
4. Summarization → local Transformers if available, else extractive fallback
5. NER → regex/heuristics entity extraction
6. Classification → deterministic category selection
7. Embeddings → seeded, deterministic vector generation
8. Metadata build → `buildMetadata` combining all outputs
9. Persistence → saves processed text and metadata under `storage/`

The top-level pipeline aims to run fully offline with graceful degradation.

## Running Programmatically
```ts
// ESM TypeScript
import { runPipeline } from "./src/modules/pipeline/index.js";

const meta = await runPipeline(
  "./storage/documents/test-document.txt",
  "doc-001"
);
console.log(meta.id, meta.classification, meta.actionItems?.length);
```

You can also explore helper scripts in `src/scripts/` (e.g., `process-doc.ts`).

## Summarization Models (Optional)
If using local Transformers with `@xenova/transformers`, place models under `./models`. For example:
- `./models/Xenova/distilbart-cnn-6-6`

The summarizer runs strictly offline and falls back to TextRank/TF heuristics when models are missing.

## Testing
Unit tests mirror the source structure in `src/tests/`. You can run individual tests with an ESM loader setup, for example:
```powershell
# Example: running a test file with ts-node's ESM loader
node --loader ts-node/esm ./src/tests/ocr.test.ts
```
(Adjust to your environment; if you maintain a test runner script, use that.)

## Configuration Notes
- See `src/config/model-config.ts` for model names used by modules
- See `src/config/ocr-config.ts` for OCR profiles and language codes
- See `src/config/summary.ts` for summarizer model selection and fallbacks
- Logging: `src/config/logger.ts` (structured JSON logging)

## Design Principles
- Offline-first with deterministic fallbacks
- Parallel execution with `Promise.allSettled()` to isolate failures
- Always persist partial results when possible
- Strong typing with strict TS config (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)

## Common Issues
- Missing Tesseract files → place traineddata files in `./tessdata`
- ESM loader errors → ensure Node 22+, use `--loader ts-node/esm` for TS
- Model not found → summarization falls back automatically; place models under `./models` to enable ML summarization

## Links
- Architecture: `./docs/architecture.md`
- Dataflow: `./docs/dataflow.md`
- API Spec: `./docs/api-spec.md`
- Module READMEs: `./src/modules/*/README.md`
