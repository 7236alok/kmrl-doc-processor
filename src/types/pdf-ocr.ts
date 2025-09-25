export interface PDFTextRegion {
  x: number; // left
  y: number; // top (PDF user space)
  w: number; // width
  h: number; // height
  text: string;
  source?: 'native' | 'ocr';
  confidence?: number; // for OCR regions
  page: number; // 1-based
}

export interface PDFImageRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
  id?: string;
}

export interface PDFPageMap {
  page: number;
  width: number;
  height: number;
  textRegions: PDFTextRegion[];
  imageRegions: PDFImageRegion[];
  ocrRegions?: PDFImageRegion[]; // subset chosen for OCR
}

export interface RegionOCROptions {
  languages: string;
  langPath: string;
  confidenceThreshold: number;
}

export interface RegionOCRResult {
  pages: PDFPageMap[];
  mergedText: string; // reading-order merged text
  rawRegions: PDFTextRegion[]; // flattened list
  processingTime: number;
  engine: string;
}
