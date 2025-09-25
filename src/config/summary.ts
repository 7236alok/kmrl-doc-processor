export const SUMMARY_CONFIG = {
  chunkSize: 3000,
  modelId: "Xenova/t5-small", // Switch primary model to t5-small
  maxNewTokens: 80,
  minLength: 20,
  fallbackSentences: 5,
  defaultModel: "Xenova/t5-small", // Use t5-small as default
  langModels: {
    en: "Xenova/t5-small", // Use t5-small for English
    hi: "Xenova/mt5-small",
    ml: "Xenova/mt5-small",
  } as Record<string, string>,
  longDocModel: "Xenova/t5-small", // Using t5-small for better compatibility and performance
  longDocChars: 12000,
};

export default SUMMARY_CONFIG;