// Enhanced metadata builder (simplified & project-ready)
import type { Metadata } from "../../types/metadata.js";
import { detectMultilingualContent } from "../../utils/text-utils.js";
import type { SummaryResult } from "../../types/summary.js";
import type { NEROutput } from "../../types/ner.js";
import type { ClassificationResult } from "../../types/classification.js";
import type { OCRResult } from "../../types/ocr.js";
import crypto from "crypto";
import path from "path";

function sanitizeArray(arr: Array<string | null | undefined>): string[] {
  return (arr || []).filter((x): x is string => !!x?.trim());
}

function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function extractActionCandidates(text: string): string[] {
  const keywords = /\b(inspect|update|review|install|replace|repair|submit|train|audit|verify|schedule|complete)\b/i;
  return text
    .split(/\r?\n|(?<=\.)\s+/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => keywords.test(s));
}

function normalizeForDedup(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toISODateStrings(rawDates: string[]): string[] {
  // Simplified: Accepts YYYY-MM-DD or MM/DD/YYYY only
  const iso: string[] = [];
  for (const d of rawDates) {
    const dt = new Date(d);
    if (!isNaN(dt.getTime())) iso.push(dt.toISOString().slice(0, 10));
  }
  return Array.from(new Set(iso));
}

export async function buildMetadata(
  docId: string,
  fileName: string,
  language: string,
  ocrText: string,
  summary?: SummaryResult,
  ner?: NEROutput,
  classification?: ClassificationResult,
  embedding?: any,
  ocrResult?: OCRResult,
  startTime?: number,
  successfulSteps?: string[],
  originalFileContent?: Buffer
): Promise<Metadata> {
  // Sanitize NER
  const cleanNER: NEROutput = {
    persons: sanitizeArray(ner?.persons || []),
    dates: sanitizeArray(ner?.dates || []),
    locations: sanitizeArray(ner?.locations || []),
    organizations: sanitizeArray(ner?.organizations || [])
  };

  const dueDatesISO = toISODateStrings(cleanNER.dates);
  const classificationList = Array.isArray(classification) ? classification : [];
  const classificationResults = classificationList.map((entry) => ({ ...entry }));
  const primaryClassification = classificationResults[0];
  const inferredDepartments = Array.from(new Set(classificationResults.map((c) => c.category)));
  const summaryData: SummaryResult = summary ?? {
    summary: "",
    actionItems: [],
    fullSummary: "",
    chunkSummaries: []
  };

  // Combine action items from summary + OCR
  const aiCandidates = [
    ...summaryData.actionItems,
    ...extractActionCandidates(ocrText),
    ...(summaryData.fullSummary ? extractActionCandidates(summaryData.fullSummary) : [])
  ];
  // Deduplicate action items using normalized keys
  const seen = new Set<string>();
  const uniqueActionItems: string[] = [];
  for (const a of aiCandidates) {
    const norm = normalizeForDedup(a);
    if (!norm) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    uniqueActionItems.push(a.trim());
  }

  // Build lightweight metadata
  const multi = detectMultilingualContent(ocrText);
  const scripts = multi.scripts.length ? multi.scripts : ['English'];
  const breakdown = multi.scripts.length ? multi.breakdown : { English: 1.0, Hindi: 0, Malayalam: 0 } as any;
  const multilingualComplexity = Math.max(1, scripts.length);

  const metadata: Metadata = {
    id: docId,
    source: {
      system: "Manual Upload",
      originalPath: fileName,
      ...(inferredDepartments.length ? { departments: inferredDepartments } : {})
    },
    language,
    fileInfo: {
      originalName: fileName,
      extension: path.extname(fileName).replace('.', '') || 'unknown',
      sizeBytes: originalFileContent?.length || ocrText.length,
      checksum: generateContentHash(ocrText)
    },
    summary: summaryData.fullSummary || summaryData.summary || "",
    enhancedSummary: summaryData,
    actionItems: uniqueActionItems.map(item => ({
      text: item,
      priority: /critical|immediate|urgent/i.test(item) ? 'high' : 'low',
      category: /safety|brake|emergency/i.test(item) ? 'safety' : 'other'
    })),
    classification: {
      category: primaryClassification?.category || "uncategorized",
      confidence: primaryClassification?.confidence ?? 0.6,
      categories: classificationResults
    },
    ner: cleanNER,
    dueDates: dueDatesISO,
    relatedAssets: [], // Could be filled with TS IDs, stations, equipment if needed
    mlInsights: {
      entities: { confidence: 0.5 },
      urgencyLevel: 'medium',
      urgencyScore: 0.5,
      estimatedEffort: { hours: 2, complexity: 'medium', confidence: 0.5 },
      multilingualContent: {
        scripts,
        breakdown,
        confidence: multi.confidence || 0.8
      },
      multilingualEntities: { entities: {}, confidence: 0.5 }
    },
    domain: {
      criticalityScore: /critical|urgent/i.test(ocrText) ? 0.8 : 0.5,
      topicTags: ['document-processing'],
      complianceFlags: false,
      safetyRelevance: /safety|brake|emergency/i.test(ocrText),
      operationalImpact: 0.5,
      alertLevel: 'low' as const
    },
    knowledgeLinks: {
      similarTopics: ['document-processing'],
      assetConnections: [],
      complianceReferences: [],
      proceduralConnections: [],
      knowledgeGraph: []
    },
    confidenceScores: {
      overall: 0.7,
      summarization: 0.8,
      entityExtraction: 0.7,
  classification: primaryClassification?.confidence ?? 0.6
    },
    traceabilityInfo: {
      processingPipeline: {
        version: "2.0.0-light",
        steps: ['ocr', 'summary', 'ner', 'classification'],
        processingTime: 0,
        timestamp: new Date().toISOString()
      },
      dataProvenance: {
        sourceHash: generateContentHash(ocrText),
        transformations: [],
        qualityMetrics: {
          textLength: ocrText.length,
          structuredFields: uniqueActionItems.length,
          assetLinks: 0,
          complianceLinks: 0,
          multilingualComplexity
        }
      },
      auditTrail: [],
      changeHistory: []
    },
    generatedAt: new Date().toISOString(),
    version: '1',
    processingStats: {
      totalTime: 0,
      enhancedAnalysisTime: 0,
      stepTimings: { 'basic-processing': 0 }
    }
  };

  return metadata;
}
