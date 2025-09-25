export interface OCRResult {
  text: string;
  confidence: number; // 0..1
  language?: string;
  source?: string;
  method?: string;
  engine?: string;
  processingTime?: number;
  fallbackUsed?: boolean;
}

export interface OCREngine {
  name: string;
  supportedTypes: string[];
  priority: number;
  process: (filePath: string) => Promise<OCRResult>;
}

export interface OCRConfig {
  preferredEngine?: string;
  fallbackEnabled?: boolean;
  confidenceThreshold?: number;
  timeout?: number;
  languages?: string[];
  hybridPdf?: boolean; // enable hybrid (native+image+page OCR) pipeline when poppler available
}
