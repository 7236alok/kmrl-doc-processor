import { createRequire } from 'module';
import { pipeline, env } from '@xenova/transformers';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const _franc: any = require('franc-min');
const franc: (text: string, options?: Record<string, unknown>) => string =
  typeof _franc === 'function'
    ? _franc
    : _franc?.default
      ? _franc.default
      : () => 'und';

const SUPPORTED_LANGS = ['eng', 'hin', 'mal'] as const;
type SupportedLang = typeof SUPPORTED_LANGS[number];

const LABEL_MAP: Record<string, SupportedLang> = {
  en: 'eng',
  eng: 'eng',
  english: 'eng',
  'en-us': 'eng',
  'en-gb': 'eng',
  hi: 'hin',
  hin: 'hin',
  hindi: 'hin',
  ml: 'mal',
  mal: 'mal',
  malayalam: 'mal',
};

let langDetectPipeline: ((text: string) => Promise<any>) | null = null;
let langDetectInitPromise: Promise<void> | null = null;
let langDetectInitError: Error | null = null;

export async function initLangDetect(force = false): Promise<void> {
  if (langDetectPipeline && !force) return;
  if (langDetectInitPromise && !force) {
    await langDetectInitPromise;
    return;
  }

  langDetectInitPromise = (async () => {
    try {
      // Configure Xenova env to prefer local ./models cache
      const modelsDir = path.resolve(process.cwd(), 'models');
      env.localModelPath = env.localModelPath || modelsDir;
      env.cacheDir = env.cacheDir || modelsDir;

      // Try loading from local models directory first (offline preferred)
      const localDir = path.resolve(modelsDir, 'Xenova', 'langdetect');
      if (fs.existsSync(localDir)) {
        const relPath = path.relative(modelsDir, localDir).replace(/\\/g, '/');
        try {
          langDetectPipeline = await pipeline('text-classification' as any, relPath as any, {
            quantized: true as any,
            local_files_only: true as any,
          });
          langDetectInitError = null;
          return;
        } catch (_) {
          // Fall through to remote-capable attempt
          langDetectPipeline = null;
        }
      }

      // If remote is allowed, attempt fetching model by ID
      if (env.allowRemoteModels || process.env.ALLOW_MODEL_BOOTSTRAP === '1') {
        langDetectPipeline = await pipeline('text-classification' as any, 'Xenova/langdetect' as any, { quantized: true as any });
        langDetectInitError = null;
        return;
      }

      throw new Error('No local langdetect model found and remote fetch disabled');
    } catch (err) {
      langDetectPipeline = null;
      langDetectInitError = err as Error;
      console.warn('[lang-detect] Failed to initialise Xenova/langdetect pipeline:', langDetectInitError.message);
    }
  })();

  try {
    await langDetectInitPromise;
  } finally {
    langDetectInitPromise = null;
  }
}

/**
 * Clean a text string
 * - Remove extra spaces and newlines
 * - Remove unwanted special characters
 * - Preserve optional characters (like punctuation)
 * @param text Raw text
 * @param keepChars String of additional characters to preserve (optional)
 * @returns Cleaned text
 */
export function cleanText(text: string, keepChars: string = "., -():$%"): string {
  if (!text) return "";

  // Remove carriage returns, multiple spaces, and tabs
  let cleaned = text.replace(/\r\n/g, "\n").replace(/\t/g, " ").replace(/\s+/g, " ");

  // Escape any regex metacharacters in keepChars so they are treated
  // literally inside the character class.
  const safeKeep = keepChars.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  // Remove non-letter/number characters except specified
  const regex = new RegExp(`[^\\p{L}\\p{N}\\s${safeKeep}]`, "gu");
  cleaned = cleaned.replace(regex, "");

  // Trim leading/trailing spaces
  return cleaned.trim();
}

const LANG_NAME_MAP: Record<SupportedLang | 'unknown', string> = {
  eng: "English",
  hin: "Hindi",
  mal: "Malayalam",
  unknown: "Unknown",
};

function mapLabelToSupported(label: string | undefined): SupportedLang | undefined {
  if (!label) return undefined;
  const normalized = label.toLowerCase();
  return LABEL_MAP[normalized];
}

/**
 * Detect the language of a given text.
 * Returns ISO 639-3 code ('eng', 'hin', 'mal', 'unknown').
 */
export async function detectLanguage(text: string): Promise<SupportedLang | 'unknown'> {
  if (!text) return 'unknown';

  const trimmed = text.trim();
  if (!trimmed) return 'unknown';

  // Unicode heuristic (fast path for clear scripts)
  const firstCodePoint = trimmed.codePointAt(0);
  if (firstCodePoint !== undefined) {
    if (firstCodePoint >= 0x0900 && firstCodePoint <= 0x097F) return 'hin';
    if (firstCodePoint >= 0x0d00 && firstCodePoint <= 0x0d7f) return 'mal';
  }

  if (!langDetectPipeline && !langDetectInitError) {
    await initLangDetect();
  } else if (langDetectInitPromise) {
    await langDetectInitPromise;
  }

  if (langDetectPipeline) {
    try {
      const results = await langDetectPipeline(trimmed);
      const top = Array.isArray(results) ? results[0] : results;
      const mapped = mapLabelToSupported(top?.label ?? top?.language ?? top?.lang);
      if (mapped) return mapped;
    } catch (err) {
      console.warn('[lang-detect] Xenova detection failed, falling back to franc:', (err as Error).message);
    }
  }

  try {
    const francCode = franc(trimmed, { only: [...SUPPORTED_LANGS] });
    if (francCode && francCode !== 'und' && SUPPORTED_LANGS.includes(francCode as SupportedLang)) {
      return francCode as SupportedLang;
    }
  } catch (err) {
    console.warn('[lang-detect] franc-min detection failed:', (err as Error).message);
  }

  return 'unknown';
}

/**
 * Map ISO 639-3 code to human-readable name
 */
export function getLangName(langCode: string): string {
  return LANG_NAME_MAP[langCode as SupportedLang | 'unknown'] ?? 'Unknown';
}

/**
 * Check if a language code is supported
 */
export function isSupportedLang(langCode: string): langCode is SupportedLang {
  return SUPPORTED_LANGS.includes(langCode as SupportedLang);
}

/**
 * Detect multilingual script composition and produce a human-readable label.
 * Heuristic: count letters by Unicode blocks (Latin, Devanagari, Malayalam).
 */
export function detectMultilingualContent(text: string): {
  primary: SupportedLang | 'unknown';
  scripts: Array<'English' | 'Hindi' | 'Malayalam'>;
  breakdown: Record<'English' | 'Hindi' | 'Malayalam', number>;
  label: string;
  confidence: number; // share of primary language
} {
  const result = {
    primary: 'unknown' as SupportedLang | 'unknown',
    scripts: [] as Array<'English' | 'Hindi' | 'Malayalam'>,
    breakdown: { English: 0, Hindi: 0, Malayalam: 0 } as Record<'English' | 'Hindi' | 'Malayalam', number>,
    label: 'Unknown',
    confidence: 0
  };

  if (!text) return result;

  let eng = 0, hin = 0, mal = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    // Basic Latin + Latin-1 Supplement + Latin Extended (coarse proxy for English)
    if ((cp >= 0x0041 && cp <= 0x007A) || (cp >= 0x00C0 && cp <= 0x024F)) {
      eng++;
      continue;
    }
    // Devanagari
    if (cp >= 0x0900 && cp <= 0x097F) { hin++; continue; }
    // Malayalam
    if (cp >= 0x0D00 && cp <= 0x0D7F) { mal++; continue; }
  }

  const total = eng + hin + mal;
  if (total === 0) return result;

  const eShare = eng / total;
  const hShare = hin / total;
  const mShare = mal / total;
  result.breakdown.English = Number(eShare.toFixed(3));
  result.breakdown.Hindi = Number(hShare.toFixed(3));
  result.breakdown.Malayalam = Number(mShare.toFixed(3));

  // Determine present scripts with a minimal share threshold
  const THRESH = 0.1; // 10%
  const present: Array<[key: 'English' | 'Hindi' | 'Malayalam', share: number, code: SupportedLang]> = [];
  if (eShare >= THRESH) present.push(['English', eShare, 'eng']);
  if (hShare >= THRESH) present.push(['Hindi', hShare, 'hin']);
  if (mShare >= THRESH) present.push(['Malayalam', mShare, 'mal']);
  present.sort((a, b) => b[1] - a[1]);

  if (present.length === 0) {
    // If no single script crosses threshold, pick the max to avoid Unknown
    const maxShare = Math.max(eShare, hShare, mShare);
    if (maxShare === eShare) present.push(['English', eShare, 'eng']);
    else if (maxShare === hShare) present.push(['Hindi', hShare, 'hin']);
    else present.push(['Malayalam', mShare, 'mal']);
  }

  if (present.length > 0) {
    const first = present[0];
    if (first) {
      const [topName, topShare, topCode] = first;
      result.primary = topCode;
      result.confidence = Number(topShare.toFixed(3));
      result.scripts = present.map(p => p[0]);

      if (present.length === 1) {
        result.label = topName;
      } else if (present.length === 2) {
        const second = present[1];
        const secondName = second ? second[0] : '';
        result.label = `Mixed (${topName}-${secondName})`;
      } else {
        result.label = `Multilingual (${present.map(p => p[0]).join('/')})`;
      }
    }
  }

  return result;
}
