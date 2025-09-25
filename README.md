# KMRL Document Processor

Modular, offline-first document processing pipeline for OCR, translation, summarization, NER, classification, embeddings, and rich metadata extraction. Designed for multilingual content (English, Hindi, Malayalam) with resilient parallel execution and graceful fallbacks.

## Highlights
- Modular services per step under `src/modules/*`
- Parallel, resilient pipeline with `Promise.allSettled()`
- Offline-first design with deterministic fallbacks
- Strict TypeScript types and ESM modules
- Storage abstraction with JSON metadata persistence
- Local transformer models for abstractive summarization

## 🚀 Getting Started (For GitHub Clone)

### Prerequisites
- **Node.js 22.14.x** (see `.nvmrc`)
- **Git** for cloning

### Step 1: Clone Repository
```powershell
git clone https://github.com/7236alok/kmrl-doc-processor.git
cd kmrl-doc-processor
```

### Step 2: Install Dependencies
```powershell
# Install all npm dependencies
npm install

# Or use the setup script (if available)
npm run setup-env
```

### Step 3: Set Up Environment Variables
Create a `.env` file in the root directory:
```env
# Optional - for enhanced AI features (not required for basic operation)
OPENAI_API_KEY=your_openai_api_key_here
HF_API_KEY=your_huggingface_api_key_here

# OCR Configuration
OCR_AUTO_DOWNLOAD=1
OCR_LANGUAGES=eng,hin,mal
```

### Step 4: Download Required Models & Data

#### A) Download Tesseract Language Data (Required for OCR)
```powershell
# Option 1: Automatic download (recommended)
npm run download-tessdata

# Option 2: Manual - files will auto-download on first OCR run if OCR_AUTO_DOWNLOAD=1
```

#### B) Download Transformer Models (Optional - for AI summarization)
```powershell
# Download pre-trained models for local AI processing
npm run download-models

# This downloads models to ./models/Xenova/ directory:
# - t5-small (for summarization)
# - distilbert-base-uncased-finetuned-sst-2-english (for classification)
# - distilbart-cnn-6-6 (alternative summarization)
```

### Step 5: Build and Run
```powershell
# Build TypeScript to JavaScript
npm run build

# Run the processor
npm run start:dist

# Or for development (with live reload)
npm start
```

### Step 6: Verify Installation
The system should:
- ✅ Process documents from `storage/documents/not-processed/`
- ✅ Generate summaries using local AI models
- ✅ Extract entities and classify documents
- ✅ Save results to `storage/documents/processed/` and `storage/metadata/`

## Quick Start Commands
## Quick Start Commands
```powershell
# Complete setup from scratch
git clone https://github.com/7236alok/kmrl-doc-processor.git
cd kmrl-doc-processor
npm install
npm run build
npm run start:dist
```

## Detailed Setup Instructions

### For Windows Users:
```powershell
# 1) Install dependencies
npm install

# 2) Create environment file (optional)
echo 'OCR_AUTO_DOWNLOAD=1' > .env
echo 'OCR_LANGUAGES=eng,hin,mal' >> .env

# 3) Build project
npm run build

# 4) Start processing
npm run start:dist
```

### For Linux/Mac Users:
```bash
# 1) Install dependencies
npm install

# 2) Create environment file (optional)
echo "OCR_AUTO_DOWNLOAD=1" > .env
echo "OCR_LANGUAGES=eng,hin,mal" >> .env

# 3) Build and run
npm run build
npm run start:dist
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

## Common Issues & Troubleshooting

### 🔧 Setup Issues

**Problem: "Module not found" errors**
```powershell
# Solution: Ensure Node.js 22.14.x is installed
node --version  # Should show v22.14.x
npm install     # Reinstall dependencies
```

**Problem: TypeScript compilation errors**
```powershell
# Solution: Clean build and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Problem: Tesseract language files missing**
```powershell
# Solution: Download language data manually
npm run download-tessdata
# Or set OCR_AUTO_DOWNLOAD=1 in .env file
```

**Problem: "Transformer model unavailable" warnings**
```powershell
# Solution: Models will download automatically on first use
# Or manually download with:
npm run download-models
```

### 🚀 First Run Checklist

After cloning from GitHub:
- [ ] Node.js 22.14.x installed
- [ ] `npm install` completed successfully  
- [ ] `npm run build` completes without errors
- [ ] Create `.env` file with `OCR_AUTO_DOWNLOAD=1`
- [ ] Place test documents in `storage/documents/not-processed/`
- [ ] Run `npm run start:dist`
- [ ] Check `storage/documents/processed/` for results

### 📁 Directory Structure After Setup
```
kmrl-doc-processor/
├── node_modules/           # Dependencies (auto-created)
├── dist/                   # Compiled JS (after npm run build)
├── models/                 # AI models (auto-downloaded)
├── tessdata/               # OCR language files (auto-downloaded)
├── storage/
│   ├── documents/
│   │   ├── not-processed/  # Input: Place documents here
│   │   └── processed/      # Output: Results appear here
│   └── metadata/           # Extracted metadata JSON
├── src/                    # Source code
├── .env                    # Environment variables (create this)
└── package.json
```

## Common Issues
- Missing Tesseract files → place traineddata files in `./tessdata`
- ESM loader errors → ensure Node 22+, use `--loader ts-node/esm` for TS
- Model not found → summarization falls back automatically; place models under `./models` to enable ML summarization

## Links
- Architecture: `./docs/architecture.md`
- Dataflow: `./docs/dataflow.md`
- API Spec: `./docs/api-spec.md`
- Module READMEs: `./src/modules/*/README.md`
