// Map ISO codes to human-readable
const LANG_MAP: Record<string, string> = {
  eng: 'English',
  hin: 'Hindi',
  mal: 'Malayalam',
  unknown: 'Unknown',
};

// Check if a language is supported
export function isSupportedLang(langCode: string): boolean {
  return ['eng', 'hin', 'mal'].includes(langCode);
}

// Convert ISO to full name
export function getLangName(langCode: string): string {
  return LANG_MAP[langCode] || 'Unknown';
}

export default { isSupportedLang, getLangName };
