import { env, pipeline } from '@xenova/transformers';
import path from 'path';
import fs from 'fs';

function listArtifacts(modelDir: string) {
  const artifacts = [
    'config.json',
    'tokenizer.json',
    'tokenizer_config.json',
    'vocab.json',
    'merges.txt',
    'model.safetensors',
    'pytorch_model.bin',
    'onnx/model.onnx',
    'onnx/encoder_model.onnx',
    'onnx/encoder_model_quantized.onnx',
    'onnx/decoder_model.onnx',
    'onnx/decoder_model_merged_quantized.onnx',
    'decoder_model_merged_quantized.onnx'
  ];
  const present: string[] = []; const missing: string[] = [];
  for (const a of artifacts) {
    const p = path.join(modelDir, a);
    (fs.existsSync(p) ? present : missing).push(a);
  }
  return { present, missing };
}

async function main() {
  const modelId = process.argv[2] || 'Xenova/distilbart-cnn-6-6';
  const modelsDir = path.resolve(process.cwd(), 'models');
  env.localModelPath = modelsDir;
  env.cacheDir = modelsDir;
  env.allowRemoteModels = true; // force remote download if missing

  console.log(`[DOWNLOAD] Ensuring summarization model: ${modelId}`);
  try {
    console.log('[DOWNLOAD] allowRemoteModels:', env.allowRemoteModels);
    const pipe = await pipeline('summarization' as any, modelId as any, { quantized: false });
    console.log('[DOWNLOAD] Pipeline loaded, running warmup...');
    await pipe('Short warmup run to finalize weight caching.');
    console.log('[DOWNLOAD] Warmup complete.');
  } catch (err) {
    console.error('[DOWNLOAD] Failed to initialize pipeline:', (err as any)?.message, err);
  }

  const modelPath = path.join(modelsDir, modelId);
  const diag = listArtifacts(modelPath);
  console.log('[DOWNLOAD] Artifact status:', JSON.stringify(diag, null, 2));

  const essential = [
    'config.json',
    'tokenizer.json',
    'onnx/decoder_model_merged_quantized.onnx'
  ];
  const hasEssential = essential.every(f => diag.present.includes(f));
  if (!hasEssential) {
    console.error('[DOWNLOAD] Missing essential model weight/tokenizer files (including ONNX weights).');
    process.exit(2);
  }
  console.log('[DOWNLOAD] Completed.');
}

main().catch(e => { console.error('[DOWNLOAD] Unexpected error:', e); process.exit(1); });
