// Multilingual processing capabilities for Hindi, Malayalam, and English
import { detectLanguage } from './text-utils.js';

export interface MultilingualConfig {
  language: 'en' | 'hi' | 'ml' | 'auto';
  script: 'latin' | 'devanagari' | 'malayalam' | 'mixed';
  confidence: number;
}

export interface MultilingualEntity {
  text: string;
  type: 'person' | 'organization' | 'location' | 'asset' | 'date';
  language: string;
  transliterated?: string; // Roman script version
  confidence: number;
}

/**
 * Detect language and script type from text
 */
export async function detectMultilingualContent(text: string): Promise<MultilingualConfig> {
  // Script detection using Unicode ranges
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  const hasMalayalam = /[\u0D00-\u0D7F]/.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);
  
  let script: MultilingualConfig['script'] = 'latin';
  let language: MultilingualConfig['language'] = 'en';
  let confidence = 0.8;
  
  if (hasDevanagari && hasMalayalam && hasLatin) {
    script = 'mixed';
    language = 'auto';
    confidence = 0.6;
  } else if (hasDevanagari) {
    script = 'devanagari';
    language = 'hi';
    confidence = 0.9;
  } else if (hasMalayalam) {
    script = 'malayalam';
    language = 'ml';
    confidence = 0.9;
  } else if (hasLatin) {
    // Use existing language detection for Latin script
    try {
      const detectedLang = await detectLanguage(text);
      language = detectedLang === 'hin' ? 'hi' : detectedLang === 'mal' ? 'ml' : 'en';
      confidence = 0.7;
    } catch (err) {
      console.warn('[multilingual] Language detection failed, defaulting to English:', (err as Error).message);
    }
  }
  
  return { language, script, confidence };
}

/**
 * Extract entities with multilingual awareness
 */
export function extractMultilingualEntities(text: string, config: MultilingualConfig): MultilingualEntity[] {
  const entities: MultilingualEntity[] = [];
  
  // Language-specific patterns
  switch (config.language) {
    case 'hi':
      entities.push(...extractHindiEntities(text));
      break;
    case 'ml':
      entities.push(...extractMalayalamEntities(text));
      break;
    case 'en':
      entities.push(...extractEnglishEntities(text));
      break;
    case 'auto':
      // Extract from all languages
      entities.push(...extractHindiEntities(text));
      entities.push(...extractMalayalamEntities(text));
      entities.push(...extractEnglishEntities(text));
      break;
  }
  
  return deduplicateEntities(entities);
}

/**
 * Hindi-specific entity extraction
 */
function extractHindiEntities(text: string): MultilingualEntity[] {
  const entities: MultilingualEntity[] = [];
  
  // Hindi person names (common patterns)
  const hindiPersonPatterns = [
    /श्री\s+([^\s]+(?:\s+[^\s]+)*)/g, // श्री (Mr.)
    /श्रीमती\s+([^\s]+(?:\s+[^\s]+)*)/g, // श्रीमती (Mrs.)
    /डॉ\.\s+([^\s]+(?:\s+[^\s]+)*)/g, // डॉ. (Dr.)
  ];
  
  for (const pattern of hindiPersonPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        entities.push({
          text: match[1],
          type: 'person',
          language: 'hi',
          transliterated: transliterateDevanagari(match[1]),
          confidence: 0.8
        });
      }
    }
  }
  
  // Hindi organizations
  const hindiOrgPatterns = [
    /केएमआरएल|कोच्चि मेट्रो/g, // KMRL variants
    /दिल्ली मेट्रो|डीएमआरसी/g, // DMRC variants
    /रेल मंत्रालय|भारतीय रेल/g, // Railway Ministry, Indian Railways
  ];
  
  for (const pattern of hindiOrgPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'organization',
        language: 'hi',
        transliterated: transliterateDevanagari(match[0]),
        confidence: 0.9
      });
    }
  }
  
  // Hindi locations
  const hindiLocationPatterns = [
    /([^\s]+(?:\s+[^\s]+)*)\s+स्टेशन/g, // Station names
    /([^\s]+(?:\s+[^\s]+)*)\s+डिपो/g, // Depot names
  ];
  
  for (const pattern of hindiLocationPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        entities.push({
          text: match[1],
          type: 'location',
          language: 'hi',
          transliterated: transliterateDevanagari(match[1]),
          confidence: 0.7
        });
      }
    }
  }
  
  return entities;
}

/**
 * Malayalam-specific entity extraction
 */
function extractMalayalamEntities(text: string): MultilingualEntity[] {
  const entities: MultilingualEntity[] = [];
  
  // Malayalam person names
  const malayalamPersonPatterns = [
    /ശ്രീ\s+([^\s]+(?:\s+[^\s]+)*)/g, // ശ്രീ (Mr.)
    /ശ്രീമതി\s+([^\s]+(?:\s+[^\s]+)*)/g, // ശ്രീമതി (Mrs.)
    /ഡോ\.\s+([^\s]+(?:\s+[^\s]+)*)/g, // ഡോ. (Dr.)
  ];
  
  for (const pattern of malayalamPersonPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        entities.push({
          text: match[1],
          type: 'person',
          language: 'ml',
          transliterated: transliterateMalayalam(match[1]),
          confidence: 0.8
        });
      }
    }
  }
  
  // Malayalam organizations
  const malayalamOrgPatterns = [
    /കെഎംആർഎൽ|കൊച്ചി മെട്രോ/g, // KMRL variants
    /റെയിൽവേ മന്ത്രാലയം|ഇന്ത്യൻ റെയിൽവേ/g, // Railway Ministry
  ];
  
  for (const pattern of malayalamOrgPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'organization',
        language: 'ml',
        transliterated: transliterateMalayalam(match[0]),
        confidence: 0.9
      });
    }
  }
  
  // Malayalam locations
  const malayalamLocationPatterns = [
    /([^\s]+(?:\s+[^\s]+)*)\s+സ്റ്റേഷൻ/g, // Station names
    /([^\s]+(?:\s+[^\s]+)*)\s+ഡിപ്പോ/g, // Depot names
  ];
  
  for (const pattern of malayalamLocationPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        entities.push({
          text: match[1],
          type: 'location',
          language: 'ml',
          transliterated: transliterateMalayalam(match[1]),
          confidence: 0.7
        });
      }
    }
  }
  
  return entities;
}

/**
 * English entity extraction (enhanced)
 */
function extractEnglishEntities(text: string): MultilingualEntity[] {
  const entities: MultilingualEntity[] = [];
  
  // Enhanced English person patterns
  const personPatterns = [
    /(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Prof\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    /([A-Z][a-z]+\s+[A-Z][a-z]+),?\s+(?:Chief|Manager|Officer|Director|Engineer)/gi,
  ];
  
  for (const pattern of personPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        entities.push({
          text: match[1],
          type: 'person',
          language: 'en',
          confidence: 0.8
        });
      }
    }
  }
  
  // Enhanced organization patterns
  const orgPatterns = [
    /\b(KMRL|Kochi Metro Rail Limited|Kochi Metro)\b/g,
    /\b(DMRC|Delhi Metro Rail Corporation)\b/g,
    /\b(Indian Railways?|Railway Board|Ministry of Railways)\b/g,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Corporation|Company|Ltd|Limited|Inc)\b/g,
  ];
  
  for (const pattern of orgPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'organization',
        language: 'en',
        confidence: 0.9
      });
    }
  }
  
  // Enhanced location patterns
  const locationPatterns = [
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Station|Depot|Yard|Terminal)\b/g,
    /\b(Aluva|Palarivattom|Ernakulam|Kaloor|Lissie|JLN Stadium|MG Road|Town Hall|Maharajas|Edapally)\b/g, // KMRL stations
  ];
  
  for (const pattern of locationPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        text: match[1] || match[0],
        type: 'location',
        language: 'en',
        confidence: 0.8
      });
    }
  }
  
  // Asset patterns (train sets, equipment)
  const assetPatterns = [
    /\b(?:Train\s+Set|TS|Trainset)[-\s]*(\d+)\b/gi,
    /\b(?:Coach|Car)[-\s]*([A-Z0-9]+)\b/g,
    /\b(?:Equipment|Asset)\s+(?:ID|No|Number)[-:\s]*([A-Z0-9-]+)\b/gi,
  ];
  
  for (const pattern of assetPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'asset',
        language: 'en',
        confidence: 0.9
      });
    }
  }
  
  return entities;
}

/**
 * Basic Devanagari transliteration (simplified)
 */
function transliterateDevanagari(text: string): string {
  const transliterationMap: Record<string, string> = {
    'श्री': 'Shri',
    'श्रीमती': 'Shrimati',
    'डॉ': 'Dr',
    'केएमआरएल': 'KMRL',
    'कोच्चि': 'Kochi',
    'मेट्रो': 'Metro',
    'दिल्ली': 'Delhi',
    'डीएमआरसी': 'DMRC',
    'रेल': 'Rail',
    'मंत्रालय': 'Ministry',
    'भारतीय': 'Indian',
    'स्टेशन': 'Station',
    'डिपो': 'Depot'
  };
  
  let transliterated = text;
  for (const [devanagari, latin] of Object.entries(transliterationMap)) {
    transliterated = transliterated.replace(new RegExp(devanagari, 'g'), latin);
  }
  
  return transliterated;
}

/**
 * Basic Malayalam transliteration (simplified)
 */
function transliterateMalayalam(text: string): string {
  const transliterationMap: Record<string, string> = {
    'ശ്രീ': 'Shri',
    'ശ്രീമതി': 'Shrimati',
    'ഡോ': 'Dr',
    'കെഎംആർഎൽ': 'KMRL',
    'കൊച്ചി': 'Kochi',
    'മെട്രോ': 'Metro',
    'റെയിൽവേ': 'Railway',
    'മന്ത്രാലയം': 'Ministry',
    'ഇന്ത്യൻ': 'Indian',
    'സ്റ്റേഷൻ': 'Station',
    'ഡിപ്പോ': 'Depot'
  };
  
  let transliterated = text;
  for (const [malayalam, latin] of Object.entries(transliterationMap)) {
    transliterated = transliterated.replace(new RegExp(malayalam, 'g'), latin);
  }
  
  return transliterated;
}

/**
 * Remove duplicate entities across languages
 */
function deduplicateEntities(entities: MultilingualEntity[]): MultilingualEntity[] {
  const seen = new Set<string>();
  const deduplicated: MultilingualEntity[] = [];
  
  for (const entity of entities) {
    // Use transliterated text for comparison if available
    const key = `${entity.type}:${entity.transliterated || entity.text}`.toLowerCase();
    
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(entity);
    }
  }
  
  return deduplicated;
}

/**
 * Get multilingual date formats
 */
export function extractMultilingualDates(text: string, config: MultilingualConfig): string[] {
  const dates: string[] = [];
  
  // English date patterns
  const englishDates = text.match(/\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}/g) || [];
  dates.push(...englishDates);
  
  // Hindi date patterns (Devanagari numerals)
  if (config.script === 'devanagari' || config.script === 'mixed') {
    const hindiDates = extractHindiDates(text);
    dates.push(...hindiDates);
  }
  
  // Malayalam date patterns
  if (config.script === 'malayalam' || config.script === 'mixed') {
    const malayalamDates = extractMalayalamDates(text);
    dates.push(...malayalamDates);
  }
  
  // Normalize and deduplicate
  const normalizedDates = dates
    .map(date => normalizeDateFromMultilingual(date))
    .filter((date): date is string => date !== null);
  
  return [...new Set(normalizedDates)];
}

function extractHindiDates(text: string): string[] {
  const dates: string[] = [];
  
  // Convert Devanagari numerals to Latin
  const convertedText = convertDevanagariNumerals(text);
  
  // Extract dates from converted text
  const dateMatches = convertedText.match(/\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}/g) || [];
  dates.push(...dateMatches);
  
  return dates;
}

function extractMalayalamDates(text: string): string[] {
  const dates: string[] = [];
  
  // Convert Malayalam numerals to Latin
  const convertedText = convertMalayalamNumerals(text);
  
  // Extract dates from converted text
  const dateMatches = convertedText.match(/\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}/g) || [];
  dates.push(...dateMatches);
  
  return dates;
}

function convertDevanagariNumerals(text: string): string {
  const numeralMap: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };
  
  let converted = text;
  for (const [devanagari, latin] of Object.entries(numeralMap)) {
    converted = converted.replace(new RegExp(devanagari, 'g'), latin);
  }
  
  return converted;
}

function convertMalayalamNumerals(text: string): string {
  const numeralMap: Record<string, string> = {
    '൦': '0', '൧': '1', '൨': '2', '൩': '3', '൪': '4',
    '൫': '5', '൬': '6', '൭': '7', '൮': '8', '൯': '9'
  };
  
  let converted = text;
  for (const [malayalam, latin] of Object.entries(numeralMap)) {
    converted = converted.replace(new RegExp(malayalam, 'g'), latin);
  }
  
  return converted;
}

function normalizeDateFromMultilingual(dateStr: string): string | null {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    const isoString = date.toISOString().split('T')[0];
    return isoString || null;
  } catch {
    return null;
  }
}