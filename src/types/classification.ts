export interface ClassifiedCategory {
  category: string;
  confidence: number; // 0..1
  score: number; // raw weighted score used to derive confidence
}

export type ClassificationResult = ClassifiedCategory[];
