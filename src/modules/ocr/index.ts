export * from "./ocr-service.js";
export type { OCRResult, OCREngine, OCRConfig } from "../../types/ocr.js";
export { 
  OCR_PROFILES, 
  DEFAULT_OCR_CONFIG, 
  getOCRConfigForDocument,
  LANGUAGE_CODES 
} from "../../config/ocr-config.js";