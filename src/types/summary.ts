export interface SummaryResult {
  summary: string;
  actionItems: string[];
  compressionRatio?: number;
  numSentences?: number;
  method?: 'abstractive' | 'extractive' | 'hybrid';
  department?: string;
  departments?: string[];
  chunkSummaries?: ChunkSummary[]; // Individual chunk summaries for reference
  fullSummary?: string; // Combined cohesive summary (same as summary but explicit)
}

export interface ChunkSummary {
  chunkIndex: number;
  chunkText: string; // First 100 chars of chunk for reference
  summary: string;
  wordCount: number;
  compressionRatio: number;
}
