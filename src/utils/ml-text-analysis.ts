import { ENV } from '../config/env.js';

// ML-driven text analysis utilities using Transformers.js (offline-friendly)
let tfns: any | null = null;
async function ensureTransformers() {
  if (tfns) return tfns;
  try {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const $import: any = (Function('return import')());
  const mod = await $import('@xenova/transformers');
    // Enforce offline usage
    if (mod?.env) {
      const allowRemote = ENV.ALLOW_REMOTE_MODELS;
      mod.env.allowRemoteModels = allowRemote;
      // @ts-ignore legacy flag
      mod.env.allowLocalModelsOnly = !allowRemote;
      mod.env.localModelPath = './models';
      mod.env.cacheDir = './models';
    }
    tfns = mod;
  } catch (e) {
    tfns = null;
  }
  return tfns;
}

// Cache for ML pipelines
const pipelineCache = new Map<string, any>();

/**
 * Get or create a cached ML pipeline
 */
async function getCachedPipeline(task: string, model: string) {
  const key = `${task}:${model}`;
  if (!pipelineCache.has(key)) {
    try {
      const tf = await ensureTransformers();
      if (!tf) throw new Error('transformers not available');
      const pipe = await tf.pipeline(task as any, model);
      pipelineCache.set(key, pipe);
    } catch (error) {
      console.warn(`Failed to load ML model ${model}:`, error);
      return null;
    }
  }
  return pipelineCache.get(key);
}

/**
 * ML-driven Named Entity Recognition for multilingual content
 */
export async function extractEntitiesML(text: string, language: string = 'en'): Promise<{
  persons: string[];
  organizations: string[];
  locations: string[];
  dates: string[];
  assets: string[];
  confidence: number;
}> {
  // Use multilingual NER model
  const nerPipeline = await getCachedPipeline('token-classification', 'Xenova/bert-base-multilingual-cased-ner');
  
  if (!nerPipeline) {
    // Fallback to regex-based extraction
    return extractEntitiesRegex(text);
  }

  try {
    const entities = await nerPipeline(text);
    
    const persons: string[] = [];
    const organizations: string[] = [];
    const locations: string[] = [];
    const dates: string[] = [];
    const assets: string[] = [];
    
    let totalConfidence = 0;
    let entityCount = 0;
    
    for (const entity of entities) {
      if (entity.score > 0.7) { // Confidence threshold
        const word = entity.word.replace(/^##/, ''); // Remove BERT subword prefix
        
        switch (entity.entity) {
          case 'B-PER':
          case 'I-PER':
            if (!persons.includes(word)) persons.push(word);
            break;
          case 'B-ORG':
          case 'I-ORG':
            if (!organizations.includes(word)) organizations.push(word);
            break;
          case 'B-LOC':
          case 'I-LOC':
            if (!locations.includes(word)) locations.push(word);
            break;
        }
        
        // Check for KMRL-specific assets
        if (/^(TS|ts)[-\s]*\d+/i.test(word)) {
          if (!assets.includes(word)) assets.push(word);
        }
        
        totalConfidence += entity.score;
        entityCount++;
      }
    }
    
    // Extract dates with ML date detector
    const extractedDates = await extractDatesML(text);
    dates.push(...extractedDates);
    
    return {
      persons,
      organizations,
      locations,
      dates,
      assets,
      confidence: entityCount > 0 ? totalConfidence / entityCount : 0.5
    };
    
  } catch (error) {
    console.warn('ML NER failed, falling back to regex:', error);
    return extractEntitiesRegex(text);
  }
}

/**
 * ML-driven date extraction using question-answering model
 */
export async function extractDatesML(text: string): Promise<string[]> {
  const qaPipeline = await getCachedPipeline('question-answering', 'Xenova/distilbert-base-cased-distilled-squad');
  
  if (!qaPipeline) {
    return extractDatesRegex(text);
  }

  const dateQuestions = [
    "When is the due date?",
    "What is the deadline?",
    "When was this document created?",
    "What is the completion date?",
    "When should this be finished?"
  ];
  
  const dates: string[] = [];
  
  try {
    for (const question of dateQuestions) {
      const result = await qaPipeline(question, text);
      if (result.score > 0.5) {
        const dateMatch = result.answer.match(/\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}/);
        if (dateMatch) {
          const normalizedDate = normalizeDateString(dateMatch[0]);
          if (normalizedDate && !dates.includes(normalizedDate)) {
            dates.push(normalizedDate);
          }
        }
      }
    }
  } catch (error) {
    console.warn('ML date extraction failed:', error);
  }
  
  return dates.length > 0 ? dates : extractDatesRegex(text);
}

/**
 * ML-driven priority and urgency classification
 */
export async function classifyUrgencyML(text: string): Promise<{
  priority: 'low' | 'medium' | 'high' | 'critical';
  urgency: number; // 0-1 scale
  confidence: number;
}> {
  const classifierPipeline = await getCachedPipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
  
  if (!classifierPipeline) {
    return classifyUrgencyRegex(text);
  }

  try {
    // Check for urgent keywords in context
    const urgentContext = extractUrgentContext(text);
    const result = await classifierPipeline(urgentContext);
    
    // Map sentiment to urgency (negative sentiment often indicates urgency)
    const sentimentScore = result[0].label === 'NEGATIVE' ? result[0].score : 1 - result[0].score;
    
    // Combine with keyword-based urgency detection
    const keywordUrgency = getKeywordUrgencyScore(text);
    const combinedUrgency = (sentimentScore * 0.6) + (keywordUrgency * 0.4);
    
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (combinedUrgency > 0.8) priority = 'critical';
    else if (combinedUrgency > 0.6) priority = 'high';
    else if (combinedUrgency < 0.3) priority = 'low';
    
    return {
      priority,
      urgency: combinedUrgency,
      confidence: result[0].score
    };
    
  } catch (error) {
    console.warn('ML urgency classification failed:', error);
    return classifyUrgencyRegex(text);
  }
}

/**
 * ML-driven effort estimation for action items
 */
export async function estimateEffortML(actionText: string): Promise<{
  estimatedHours: number;
  complexity: 'simple' | 'moderate' | 'complex' | 'very-complex';
  confidence: number;
}> {
  // Use text classification to estimate complexity
  const classifierPipeline = await getCachedPipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
  
  if (!classifierPipeline) {
    return estimateEffortRegex(actionText);
  }

  try {
    // Extract complexity indicators
    const complexityText = extractComplexityIndicators(actionText);
    const result = await classifierPipeline(complexityText);
    
    // Map to effort estimation
    const baseEffort = getBaseEffortFromKeywords(actionText);
    const complexityMultiplier = result[0].score;
    
    const estimatedHours = Math.max(1, Math.round(baseEffort * complexityMultiplier));
    
    let complexity: 'simple' | 'moderate' | 'complex' | 'very-complex' = 'moderate';
    if (estimatedHours <= 2) complexity = 'simple';
    else if (estimatedHours <= 8) complexity = 'moderate';
    else if (estimatedHours <= 24) complexity = 'complex';
    else complexity = 'very-complex';
    
    return {
      estimatedHours,
      complexity,
      confidence: result[0].score
    };
    
  } catch (error) {
    console.warn('ML effort estimation failed:', error);
    return estimateEffortRegex(actionText);
  }
}

// Fallback regex-based functions
function extractEntitiesRegex(text: string) {
  const persons = text.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g) || [];
  const organizations = text.match(/\b(KMRL|DMRC|CMRS)\b/g) || [];
  const locations = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:station|depot|yard)\b/gi) || [];
  const assets = text.match(/\b(?:TS|ts)[-\s]*\d+\b/g) || [];
  
  return {
    persons: [...new Set(persons)],
    organizations: [...new Set(organizations)],
    locations: [...new Set(locations)],
    dates: extractDatesRegex(text),
    assets: [...new Set(assets)],
    confidence: 0.6
  };
}

function extractDatesRegex(text: string): string[] {
  const datePatterns = [
    /\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}/g,
    /\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4}/gi
  ];
  
  const dates: string[] = [];
  for (const pattern of datePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const normalized = normalizeDateString(match);
        if (normalized && !dates.includes(normalized)) {
          dates.push(normalized);
        }
      }
    }
  }
  
  return dates;
}

function classifyUrgencyRegex(text: string) {
  const urgentKeywords = ['urgent', 'critical', 'immediate', 'asap', 'emergency'];
  const highKeywords = ['high', 'important', 'priority', 'must'];
  const lowKeywords = ['when possible', 'eventually', 'consider'];
  
  const lowerText = text.toLowerCase();
  
  if (urgentKeywords.some(keyword => lowerText.includes(keyword))) {
    return { priority: 'critical' as const, urgency: 0.9, confidence: 0.7 };
  } else if (highKeywords.some(keyword => lowerText.includes(keyword))) {
    return { priority: 'high' as const, urgency: 0.7, confidence: 0.6 };
  } else if (lowKeywords.some(keyword => lowerText.includes(keyword))) {
    return { priority: 'low' as const, urgency: 0.3, confidence: 0.6 };
  }
  
  return { priority: 'medium' as const, urgency: 0.5, confidence: 0.5 };
}

function estimateEffortRegex(actionText: string) {
  const simpleKeywords = ['check', 'review', 'update', 'send', 'call'];
  const complexKeywords = ['design', 'implement', 'develop', 'construct', 'overhaul'];
  
  const lowerText = actionText.toLowerCase();
  let baseHours = 4; // Default
  
  if (simpleKeywords.some(keyword => lowerText.includes(keyword))) {
    baseHours = 2;
  } else if (complexKeywords.some(keyword => lowerText.includes(keyword))) {
    baseHours = 16;
  }
  
  return {
    estimatedHours: baseHours,
    complexity: baseHours <= 2 ? 'simple' as const : 
                baseHours <= 8 ? 'moderate' as const : 'complex' as const,
    confidence: 0.5
  };
}

// Helper functions
function normalizeDateString(dateStr: string): string | null {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    const isoString = date.toISOString().split('T')[0];
    return isoString || null;
  } catch {
    return null;
  }
}

function extractUrgentContext(text: string): string {
  const sentences = text.split(/[.!?]+/);
  const urgentSentences = sentences.filter(sentence => 
    /\b(urgent|critical|immediate|asap|emergency|deadline|due)\b/i.test(sentence)
  );
  return urgentSentences.join('. ') || text.substring(0, 500);
}

function getKeywordUrgencyScore(text: string): number {
  const urgencyKeywords = {
    'emergency': 1.0,
    'critical': 0.9,
    'urgent': 0.8,
    'immediate': 0.8,
    'asap': 0.7,
    'priority': 0.6,
    'important': 0.5
  };
  
  const lowerText = text.toLowerCase();
  let maxScore = 0;
  
  for (const [keyword, score] of Object.entries(urgencyKeywords)) {
    if (lowerText.includes(keyword)) {
      maxScore = Math.max(maxScore, score);
    }
  }
  
  return maxScore;
}

function extractComplexityIndicators(text: string): string {
  const complexityKeywords = [
    'design', 'implement', 'develop', 'construct', 'overhaul', 'install',
    'replace', 'repair', 'maintain', 'inspect', 'test', 'calibrate'
  ];
  
  const words = text.toLowerCase().split(/\s+/);
  const complexityWords = words.filter(word => 
    complexityKeywords.some(keyword => word.includes(keyword))
  );
  
  return complexityWords.join(' ') || text;
}

function getBaseEffortFromKeywords(text: string): number {
  const effortMap = {
    'inspect': 2,
    'check': 1,
    'review': 1,
    'update': 2,
    'send': 0.5,
    'call': 0.5,
    'replace': 4,
    'repair': 6,
    'install': 8,
    'design': 16,
    'implement': 12,
    'develop': 20,
    'construct': 40,
    'overhaul': 32
  };
  
  const lowerText = text.toLowerCase();
  let maxEffort = 4; // Default
  
  for (const [keyword, effort] of Object.entries(effortMap)) {
    if (lowerText.includes(keyword)) {
      maxEffort = Math.max(maxEffort, effort);
    }
  }
  
  return maxEffort;
}