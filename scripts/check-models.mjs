#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const MODELS = [
  'Xenova/distilbart-cnn-6-6',
  'Xenova/mt5-small',
  'Xenova/t5-small',
  'Xenova/langdetect'
];

function hasAny(files) {
  return files.some((f) => fs.existsSync(f));
}

function checkModel(root, modelId) {
  const base = path.resolve(root, modelId);
  const ok = fs.existsSync(base) && hasAny([
    path.join(base, 'config.json'),
    path.join(base, 'tokenizer.json'),
    path.join(base, 'onnx', 'model.onnx')
  ]);
  return { modelId, base, ok };
}

async function main() {
  const modelsRoot = path.resolve(process.cwd(), 'models');
  const results = MODELS.map((m) => checkModel(modelsRoot, m));
  const missing = results.filter(r => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? '✅' : '❌'} ${r.modelId} @ ${r.base}`);
  }
  if (missing.length) {
    console.error('\nOne or more models are missing. To run fully offline, place model folders here:');
    for (const r of missing) console.error(` - ${path.join(modelsRoot, r.modelId)}`);
    process.exit(2);
  }
  console.log('\nAll required models are present.');
}

main().catch((e) => { console.error(e); process.exit(1); });
