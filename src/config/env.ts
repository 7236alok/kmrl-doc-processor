import dotenv from 'dotenv';

dotenv.config();

function resolveBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') return defaultValue;
  return value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
}

const allowOnlineDefault = resolveBoolean(process.env.ALLOW_ONLINE, true);

export const ENV = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  HF_API_KEY: process.env.HF_API_KEY || '',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/khub',
  ALLOW_ONLINE: allowOnlineDefault,
  ALLOW_REMOTE_MODELS: resolveBoolean(process.env.ALLOW_REMOTE_MODELS, allowOnlineDefault),
};

export default ENV;
