#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS = [
  { id: 'Xenova/distilbart-cnn-6-6', task: 'summarization' },
  { id: 'Xenova/mt5-small', task: 'summarization' },
  // Add t5-small (general English summarizer with ONNX availability)
  { id: 'Xenova/t5-small', task: 'summarization' },
  // Use a supported pipeline name for Xenova
  { id: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', task: 'text-classification' },
  // Add Xenova/langdetect to support fully offline language detection
  { id: 'Xenova/langdetect', task: 'text-classification' },
];

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

async function main() {
  const modelsDir = path.resolve(process.cwd(), 'models');
  await ensureDir(modelsDir);

  const { env, pipeline, AutoTokenizer } = await import('@xenova/transformers');
  env.allowRemoteModels = true;
  env.localModelPath = modelsDir;
  env.cacheDir = modelsDir;
  
  console.log(`Using cache directory: ${modelsDir}`);

  for (const { id, task } of MODELS) {
    console.log(`Caching model: ${id} (task: ${task})`);
    try {
      const pipe = await pipeline(task, id);

      // Preload tokenizer
      try { await AutoTokenizer.from_pretrained(id); } catch {}

      // Warmup run
      try {
        if (task === 'summarization') {
          await pipe('Test input for warmup.', { max_new_tokens: 8, do_sample: false });
        } else {
          await pipe('Test input for warmup.');
        }
      } catch {}

      console.log(`✅ Cached: ${id}`);
    } catch (e) {
      console.warn(`❌ Could not cache model ${id} (task: ${task}):`, e?.message || e);
      process.exitCode = 1; // fail script if any model fails
    }
  }

  console.log('Done. Models cached under ./models.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
