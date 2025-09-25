# Pipeline Module

Runs the full document processing pipeline end-to-end and persists outputs.

## Exports
- `runPipeline(filePath: string, docId: string): Promise<Metadata>`

## Steps
1. OCR: `extractText(filePath)`
2. Language detection: simple script-based heuristic → `eng|hin|mal`
3. Translation: `translateText(text, sourceLang, "English")` (offline passthrough)
4. Summarization: `summarizeText(translatedText, lang)` with offline model or extractive fallback
5. NER: `extractEntities(translatedText)`
6. Classification: `classifyDocument(translatedText)`
7. Embeddings: `generateEmbedding(translatedText)`
8. Metadata: `buildMetadata(...)`
9. Persist: `saveDocument(docId, text)` and `saveMetadata(docId, metadata)`

## Usage
```ts
import { runPipeline } from "./index.js";

const metadata = await runPipeline("./storage/documents/test-document.txt", "doc-001");
console.log(metadata.id, metadata.classification);
```

## Notes
- Returns the final `Metadata` object; also writes to `storage/documents` and `storage/metadata`.
- Designed to run fully offline with graceful fallbacks.
- See individual module READMEs for configuration details (OCR, summarization).
