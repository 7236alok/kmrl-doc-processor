# OCR Module

Extracts text from documents using a smart, multi-engine offline pipeline with fallbacks. Supports English, Hindi, Malayalam when Tesseract language data is present.

## Exports
- `extractText(filePath: string, config?: OCRConfig): Promise<OCRResult>`
- Types re-exported:
  - `OCRResult`, `OCREngine`, `OCRConfig` from `src/types/ocr.ts`
  - Config helpers from `src/config/ocr-config.ts` (`OCR_PROFILES`, `DEFAULT_OCR_CONFIG`, `getOCRConfigForDocument`, `LANGUAGE_CODES`)

## Engines
- `direct` (Direct Text): for text-based files (`.txt`, `.doc`, `.docx`, `.rtf`).
- `pdf-first` (PDF Optimized): tries direct PDF text first, falls back to OCR.
- `tesseract` (Tesseract OCR): for images and scanned PDFs.

Smart selection chooses an engine based on file type/size; low-confidence results automatically try fallbacks.

## Config
`OCRConfig` fields:
- `preferredEngine?: "auto" | "direct" | "tesseract" | "pdf-first"`
- `fallbackEnabled?: boolean` (default true)
- `confidenceThreshold?: number` (default 0.7)
- `timeout?: number` (ms)
- `languages?: string[]` (default `['eng','hin','mal']`)

## Requirements
- Tesseract language data in `./tessdata` for the configured languages:
  - `eng.traineddata`, `hin.traineddata`, `mal.traineddata` (or appropriate codes)

## Usage
```ts
import { extractText } from "./index.js";

const result = await extractText("./storage/documents/test-document.txt", {
  preferredEngine: "auto",
  languages: ["eng", "hin", "mal"],
});

console.log(result.engine, result.confidence);
console.log(result.text.slice(0, 200));
```

## Notes
- PaddleOCR integration was removed; only built-in engines are used.
- `pdf-first` first attempts text extraction, then Tesseract if needed.
- Place `.traineddata` files in `tessdata/` adjacent to the project root.
