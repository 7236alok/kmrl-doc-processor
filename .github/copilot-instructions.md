# GitHub Copilot Instructions for KMRL Document Processor

## Project Overview
This is a modular document processing pipeline for OCR, translation, and NLP analysis. The system processes documents through a parallel pipeline that handles multilingual content (English, Hindi, Malayalam) and extracts structured metadata.

## Core Architecture Patterns

### 1. Modular Service Architecture
Each processing step is isolated in `src/modules/`:
- **OCR**: `modules/ocr/` - Tesseract.js for multilingual text extraction
- **Translation**: `modules/translation/` - OpenAI-powered translation to English
- **Summarization**: `modules/summarization/` - Document summarization with action items
- **NER**: `modules/ner/` - Named entity recognition
- **Classification**: `modules/classification/` - Document categorization
- **Embeddings**: `modules/embeddings/` - Vector embeddings generation
- **Metadata**: `modules/metadata/` - Structured metadata compilation

Each module exports through `index.ts` and implements a single service interface.

### 2. Parallel Processing Pipeline
The main pipeline (`src/index.ts`) runs modules in parallel using `Promise.allSettled()` for resilience:
```typescript
await Promise.allSettled([
  summarizeText(text),
  extractEntities(text),
  classifyDocument(text),
  generateEmbedding(text)
]);
```

### 3. Error Handling Philosophy
- Use `Promise.allSettled()` to prevent single module failures from breaking the entire pipeline
- Log warnings for module failures but continue processing
- Always save partial results even when some modules fail

## Configuration Patterns

### Environment Setup
- All configuration through `src/config/env.ts` using dotenv
- Model configurations centralized in `src/config/model-config.ts`
- Required: `OPENAI_API_KEY` for translation/summarization
- Optional: `HF_API_KEY` for alternative AI services

### File Path Conventions
- **Storage**: `storage/documents/` for processed documents
- **Metadata**: `storage/metadata/` for extracted metadata JSON
- **Uploads**: `storage/uploads/` for API file uploads

## Development Workflow

### Build & Run Commands
```bash
npm run setup-env    # Install deps + TypeScript build
npm start           # Development with ts-node
npm run build       # Production build to ./dist
npm run start:dist  # Run compiled version
```

### Node Version Management
- Uses Node.js 22.14.0 (see `.nvmrc`)
- Supports nvm-windows, Volta, or nvs for version management
- ESM modules with `"type": "module"` in package.json

## Type System Patterns

### Strict TypeScript Configuration
- Uses `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
- All modules have corresponding type definitions in `src/types/`
- Interface definitions separate from implementation (e.g., `types/ocr.ts`)

### Import/Export Convention
- All modules export through barrel files (`index.ts`)
- Use `.js` extensions in imports for ESM compatibility
- TypeScript verbatim module syntax enabled

## API Integration

### External Service Clients
- OpenAI client in `utils/api-client.ts` with chat completions API
- Hugging Face client for alternative models
- Default to `gpt-4o-mini` for cost optimization

### Storage Utilities
- File utilities in `utils/file-utils.ts` handle various document formats (PDF, DOCX, TXT)
- Storage utilities abstract document and metadata persistence
- Language detection and normalization in `utils/lang-utils.ts`

## Testing Strategy
- Test files mirror source structure in `src/tests/`
- Each module has corresponding `.test.ts` file
- Focus on testing individual module interfaces rather than end-to-end pipeline

## Key Implementation Notes

### Language Processing
- Primary support for English, Hindi, Malayalam
- Language detection using `franc-min` library
- Automatic translation to English for consistent downstream processing

### Logging
- Structured JSON logging via custom logger (`config/logger.js`)
- Include metadata context for debugging pipeline failures
- Timestamp and log level standardization

When working with this codebase:
1. Add new processing modules to `src/modules/` following the established pattern
2. Update `src/index.ts` to include new modules in parallel processing
3. Define types in `src/types/` before implementation
4. Use the structured logger for consistent error tracking
5. Test modules independently before integration