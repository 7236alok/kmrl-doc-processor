import type { OCRConfig } from "../types/ocr.js";

/**
 * OCR Engine Configuration Profiles
 */
export const OCR_PROFILES: Record<string, OCRConfig> = {
  // High accuracy for important documents
  high_accuracy: {
    preferredEngine: "auto",
    fallbackEnabled: true,
    confidenceThreshold: 0.9,
    timeout: 60000, // 1 minute
    languages: ["eng", "hin", "mal"],
  },
  
  // Balanced performance and accuracy
  balanced: {
    preferredEngine: "auto",
    fallbackEnabled: true,
    confidenceThreshold: 0.7,
    timeout: 30000, // 30 seconds
    languages: ["eng", "hin", "mal"],
  },
  
  // Fast processing for bulk operations
  fast: {
    preferredEngine: "direct",
    fallbackEnabled: true,
    confidenceThreshold: 0.5,
    timeout: 15000, // 15 seconds
    languages: ["eng"],
  },
  
  // English-only documents
  english_only: {
    preferredEngine: "auto",
    fallbackEnabled: true,
    confidenceThreshold: 0.8,
    timeout: 30000,
    languages: ["eng"],
  },
  
  // Multilingual documents (Indian languages)
  multilingual: {
    preferredEngine: "tesseract",
    fallbackEnabled: true,
    confidenceThreshold: 0.6,
    timeout: 45000,
    languages: ["eng", "hin", "mal", "san", "ben", "guj", "kan", "mar", "ori", "pan", "tam", "tel"],
  },
  
  // Scanned documents optimization
  scanned_docs: {
    preferredEngine: "tesseract",
    fallbackEnabled: false,
    confidenceThreshold: 0.6,
    timeout: 60000,
    languages: ["eng", "hin", "mal"],
  },
  
  // PDF documents optimization
  pdf_optimized: {
    preferredEngine: "pdf-first",
    fallbackEnabled: true,
    confidenceThreshold: 0.8,
    timeout: 30000,
    languages: ["eng", "hin", "mal"],
  },
};

/**
 * Default OCR configuration
 */
export const DEFAULT_OCR_CONFIG: OCRConfig = {
  preferredEngine: "auto",
  fallbackEnabled: true,
  confidenceThreshold: 0.7,
  timeout: 30000,
  languages: ["eng", "hin", "mal"],
};

/**
 * Document type to profile mapping
 */
export const DOCUMENT_TYPE_PROFILES: Record<string, string> = {
  "legal": "high_accuracy",
  "financial": "high_accuracy",
  "contract": "high_accuracy",
  "memo": "balanced",
  "report": "balanced",
  "scan": "scanned_docs",
  "bulk": "fast",
  "multilingual": "multilingual",
};

/**
 * Get OCR config based on document metadata or type hint
 */
export function getOCRConfigForDocument(
  filePath: string, 
  documentType?: string,
  customConfig?: Partial<OCRConfig>
): OCRConfig {
  let baseProfile = DEFAULT_OCR_CONFIG;
  
  // Use document type hint if provided
  if (documentType && DOCUMENT_TYPE_PROFILES[documentType]) {
    const profileName = DOCUMENT_TYPE_PROFILES[documentType];
    baseProfile = OCR_PROFILES[profileName] || DEFAULT_OCR_CONFIG;
  }
  
  // Auto-detect based on filename patterns
  const fileName = filePath.toLowerCase();
  if (fileName.includes('legal') || fileName.includes('contract')) {
    baseProfile = OCR_PROFILES.high_accuracy || DEFAULT_OCR_CONFIG;
  } else if (fileName.includes('scan') || fileName.includes('photo')) {
    baseProfile = OCR_PROFILES.scanned_docs || DEFAULT_OCR_CONFIG;
  } else if (fileName.includes('multilingual') || fileName.includes('hindi') || fileName.includes('malayalam')) {
    baseProfile = OCR_PROFILES.multilingual || DEFAULT_OCR_CONFIG;
  }
  
  // Merge with custom configuration
  return {
    ...baseProfile,
    ...customConfig,
  };
}

/**
 * Language code mappings for Tesseract
 */
export const LANGUAGE_CODES: Record<string, string> = {
  "english": "eng",
  "hindi": "hin", 
  "malayalam": "mal",
  "sanskrit": "san",
  "bengali": "ben",
  "gujarati": "guj",
  "kannada": "kan",
  "marathi": "mar",
  "oriya": "ori",
  "punjabi": "pan",
  "tamil": "tam",
  "telugu": "tel",
  "urdu": "urd",
  "assamese": "asm",
};

export default {
  OCR_PROFILES,
  DEFAULT_OCR_CONFIG,
  DOCUMENT_TYPE_PROFILES,
  getOCRConfigForDocument,
  LANGUAGE_CODES,
};