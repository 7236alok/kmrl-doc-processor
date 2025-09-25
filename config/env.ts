import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root if present
const envPath = path.resolve(process.cwd(), '.env');
const result = dotenv.config({ path: envPath });
const dotenvLoaded = !result.error;

function getEnv(key: string, fallback?: string) {
  const v = process.env[key];
  if (v !== undefined && v !== '') return v;
  return fallback;
}

export const config = {
  port: Number(getEnv('PORT', '3000')),
  dbPath: (getEnv('DB_PATH', './storage/documents') as string),
  openaiApiKey: (getEnv('OPENAI_API_KEY', '') as string),
  embeddingModel: (getEnv('EMBEDDING_MODEL', 'text-embedding-3-small') as string),
  summarizationModel: (getEnv('SUMMARIZATION_MODEL', 'gpt-4o-mini') as string),
  enableOcr: getEnv('ENABLE_OCR', 'true') === 'true',
  enableNer: getEnv('ENABLE_NER', 'true') === 'true',
  dotenvLoaded,
};

export default config;
