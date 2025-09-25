import path from 'path';
import fs from 'fs';
import { env, pipeline } from '@xenova/transformers';

function listArtifacts(modelDir: string) {
  const artifacts = [
    'config.json',
    'tokenizer.json',
    'tokenizer_config.json',
    'onnx/model.onnx',
    'onnx/encoder_model.onnx',
    'onnx/encoder_model_quantized.onnx',
    'onnx/decoder_model.onnx',
    'onnx/decoder_model_merged_quantized.onnx',
  ];
  const present: string[] = []; const missing: string[] = [];
  for (const a of artifacts) {
    const p = path.join(modelDir, a);
    (fs.existsSync(p) ? present : missing).push(a);
  }
  return { present, missing };
}

export async function bootstrapLangDetectModel() {
  const modelId = 'Xenova/langdetect';
  const modelsDir = path.resolve(process.cwd(), 'models');
  const modelPath = path.join(modelsDir, 'Xenova', 'langdetect');
  const { present } = listArtifacts(modelPath);
  const essentials = ['config.json', 'tokenizer.json'];
  const hasCore = essentials.every(e => present.includes(e)) || present.some(f => f.startsWith('onnx/'));
  if (hasCore) {
    // Already present enough to operate offline
    return;
  }
  if (process.env.ALLOW_MODEL_BOOTSTRAP !== '1' && env.allowRemoteModels !== true) {
    console.warn('[BOOTSTRAP] Xenova/langdetect artifacts missing and remote download disabled. Skipping bootstrap.');
    return;
  }
  console.log('[BOOTSTRAP] Attempting remote bootstrap for langdetect:', modelId);
  const prev = env.allowRemoteModels;
  try {
    env.allowRemoteModels = true;
    env.localModelPath = modelsDir;
    env.cacheDir = modelsDir;
    const pipe = await pipeline('text-classification' as any, modelId as any, { quantized: true });
    await pipe('Warmup langdetect bootstrap.');
  } catch (err) {
    console.warn('[BOOTSTRAP] Failed to bootstrap langdetect:', (err as Error).message);
  } finally {
    env.allowRemoteModels = prev;
  }
}
