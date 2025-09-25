import type { OCRResult } from './ocr.js';
import type { TranslationResult } from './translation.js';
import type { SummaryResult } from './summary.js';
import type { NEROutput } from './ner.js';
import type { ClassificationResult } from './classification.js';
import type { EmbeddingResult } from './embedding.js';

export interface FileInfo {
  originalName: string;
  extension: string;
  sizeBytes: number;
  checksum: string;
  ocrRawPath?: string;
}

// 1. Document Provenance & Context
export interface DocumentSource {
  system: "Email" | "Maximo" | "SharePoint" | "WhatsApp" | "Scan" | "Manual Upload" | "API" | "Unknown";
  department?: "Engineering" | "Safety" | "HR" | "Procurement" | "Finance" | "Operations" | "Maintenance" | "Legal";
  departments?: string[];
  author?: string; // extracted from email headers or OCR signature blocks
  documentDate?: string; // ISO date string extracted from content
  originalPath?: string; // file path or email subject
}

// 2. Domain-Aware Features
export interface ActionItemStructured {
  text: string;
  assignee?: string; // extracted from text or inferred
  dueDate?: string; // ISO date string
  priority: "low" | "medium" | "high" | "critical";
  category?: "safety" | "maintenance" | "compliance" | "training" | "procurement" | "other";
  urgencyScore?: number;
  estimatedEffort?: number;
  complexity?: string;
}

// 3. Traceability & Audit Support
export interface TraceabilityInfo {
  processingPipeline: {
    version: string;
    steps: string[];
    processingTime: number;
    timestamp: string;
  };
  dataProvenance: {
    sourceHash: string;
    transformations: Array<{
      step: string;
      algorithm: string;
      confidence: number;
    }>;
    qualityMetrics: {
      textLength: number;
      structuredFields: number;
      assetLinks: number;
      complianceLinks: number;
      multilingualComplexity: number;
    };
  };
  auditTrail: Array<{
    timestamp: string;
    action: string;
    user: string;
    details: string;
    systemInfo: {
      version: string;
      environment: string;
      nodeVersion: string;
    };
  }>;
  changeHistory: Array<{
    version: number;
    timestamp: string;
    changes: any[];
    approvalStatus: string;
  }>;
}

// 4. Operational Metrics & Confidence
export interface ConfidenceScores {
  summarization?: number;
  entityExtraction?: number;
  classification?: number;
  embedding?: number;
  mlAnalysis?: {
    entityExtraction: number;
    urgencyClassification: number;
    effortEstimation: number;
    multilingualDetection: number;
  };
  overall: number; // weighted average
}

// 5. Knowledge Retention Features
export interface KnowledgeLinks {
  similarTopics: string[];
  assetConnections: Array<{
    assetId: string;
    assetType: string;
    relationshipType: string;
    confidence: number;
    context: string;
  }>;
  complianceReferences: Array<{
    ruleId: string;
    ruleTitle: string;
    category: string;
    relevanceScore: number;
    applicableRequirements: string[];
  }>;
  proceduralConnections: Array<{
    procedureId: string;
    procedureTitle: string;
    category: string;
    relevanceScore: number;
    applicableSteps: string[];
  }>;
  knowledgeGraph: Array<{
    sourceType: string;
    sourceId: string;
    targetType: string;
    targetId: string;
    relationshipType: string;
    strength: number;
    context: string;
  }>;
}

// Enhanced metadata structure
export interface Metadata {
  // Core identification
  id: string;
  source: DocumentSource;
  
  // Core content metadata
  summary: string;
  actionItems: ActionItemStructured[];
  classification: {
    category: string;
    confidence: number;
    categories: ClassificationResult;
  };
  ner: NEROutput;
  dueDates: string[];
  relatedAssets: string[];
  
  // Enhanced metadata
  language: string;
  fileInfo: FileInfo;
  
  // ML-driven insights
  mlInsights: {
    entities: any;
    urgencyLevel: string;
    urgencyScore: number;
    estimatedEffort: any;
    multilingualContent: any;
    multilingualEntities: any;
  };
  
  // Domain-specific features
  domain: {
    criticalityScore: number;
    departments?: string[];
    topicTags: string[];
    complianceFlags: boolean;
    safetyRelevance: boolean;
    operationalImpact: number;
    alertLevel?: 'low' | 'medium' | 'high' | 'critical';
  };
  
  // Enhanced structure
  knowledgeLinks: KnowledgeLinks;
  confidenceScores: ConfidenceScores;
  traceabilityInfo: TraceabilityInfo;
  
  // Enhanced summary data with chunk-level details
  enhancedSummary?: SummaryResult;
  
  // System metadata
  generatedAt: string;
  version: string;
  
  // Processing metadata
  processingStats: {
    totalTime: number;
    enhancedAnalysisTime: number;
    stepTimings: Record<string, number>;
  };
  
  // Additional compatibility fields
  fileType?: string;
  uploadTimestamp?: string;
  textLength?: number;
  pipelineSteps?: string[];
  processingTimeMs?: number;
  createdAt?: string;
}

// Legacy interface for backward compatibility
export interface LegacyMetadata {
  docId: string;
  fileName: string;
  fileType: string;
  uploadTimestamp: string;
  language: string;
  textLength: number;
  source: DocumentSource;
  file: FileInfo;
  ocr?: OCRResult;
  translation?: TranslationResult;
  summary?: SummaryResult;
  ner?: NEROutput;
  classification?: ClassificationResult;
  embedding?: EmbeddingResult;
  actionItems?: ActionItemStructured[];
  criticalityScore?: number;
  topicTags?: string[];
  dueDates?: string[];
  relatedAssets?: string[];
  traceability: TraceabilityInfo;
  confidence: ConfidenceScores;
  processingTimeMs: number;
  pipelineSteps: string[];
  knowledge?: KnowledgeLinks;
  embeddingsRef?: string;
  summaryEmbeddingRef?: string;
  createdAt: string;
  trace?: {
    processedBy: string;
    steps: string[];
    ocrEngine?: string;
  };
}

