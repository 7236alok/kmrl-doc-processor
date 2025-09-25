import type { TranslationResult } from "../../types/translation.js";

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string = "English"
): Promise<TranslationResult> {
  // Offline passthrough: if source is already English or unknown but ASCII-heavy, return as-is.
  const asciiRatio = text.length ? ((text.match(/[\x00-\x7F]/g)?.length ?? 0) / text.length) : 1;
  const isEnglishish = /eng|english|unknown/i.test(sourceLang) || asciiRatio > 0.9;
  const translatedText = isEnglishish ? text : text; // placeholder for future offline MT
  return { sourceLang, targetLang, translatedText };
}
