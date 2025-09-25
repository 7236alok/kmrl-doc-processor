// src/utils/lang-utils.ts

/**
 * Supported languages in the system
 */
export const SUPPORTED_LANGS = ["eng", "hin", "mal"] as const;
export type SupportedLang = typeof SUPPORTED_LANGS[number];

/**
 * Map ISO 639-3 codes to human-readable names
 */
export const LANG_MAP: Record<SupportedLang | "unknown", string> = {
  eng: "English",
  hin: "Hindi",
  mal: "Malayalam",
  unknown: "Unknown",
};

/**
 * Normalize language code and validate if supported
 * @param langCode ISO 639-3 code
 * @returns Normalized supported code or 'unknown'
 */
export function normalizeLangCode(langCode: string): SupportedLang | "unknown" {
  const code = langCode.toLowerCase();
  if (SUPPORTED_LANGS.includes(code as SupportedLang)) return code as SupportedLang;
  return "unknown";
}

/**
 * Get human-readable name for ISO code
 * @param langCode ISO code
 */
export function getLangName(langCode: string): string {
  return LANG_MAP[normalizeLangCode(langCode)];
}

/**
 * Check if a language code is supported
 * @param langCode ISO code
 */
export function isSupportedLang(langCode: string): boolean {
  return SUPPORTED_LANGS.includes(langCode as SupportedLang);
}
