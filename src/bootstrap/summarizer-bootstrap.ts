import { env, pipeline } from '@xenova/transformers';
import path from 'path';
import fs from 'fs';
import { SUMMARY_CONFIG } from '../config/summary.js';

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

export async function bootstrapSummarizerModel() {
  const modelId = SUMMARY_CONFIG.defaultModel || SUMMARY_CONFIG.modelId;
  const modelsDir = path.resolve(process.cwd(), 'models');
  const modelPath = path.join(modelsDir, modelId);
  const { present, missing } = listArtifacts(modelPath);
  const essentials = [
    'config.json',
    'tokenizer.json',
    'onnx/decoder_model_merged_quantized.onnx'
  ];
  const hasEssentials = essentials.every(e => present.includes(e));

  if (hasEssentials) {
    console.log('[BOOTSTRAP] Summarizer essentials already present.');
    return;
  }
  if (process.env.ALLOW_MODEL_BOOTSTRAP !== '1') {
    console.warn('[BOOTSTRAP] Missing summarizer essentials and ALLOW_MODEL_BOOTSTRAP!=1; skipping auto-download.');
    return;
  }
  console.log('[BOOTSTRAP] Attempting one-time remote bootstrap for summarizer model:', modelId);
  const prev = env.allowRemoteModels;
  try {
    env.allowRemoteModels = true;
    env.localModelPath = modelsDir;
    env.cacheDir = modelsDir;
    const pipe = await pipeline('summarization' as any, modelId as any, { quantized: false });
    await pipe('Warmup summarizer bootstrap.');
  } catch (err) {
    console.warn('[BOOTSTRAP] Failed to bootstrap summarizer:', (err as Error).message);
  } finally {
    env.allowRemoteModels = prev;
  }
  const post = listArtifacts(modelPath);
  console.log('[BOOTSTRAP] Post-bootstrap artifact status:', post);
}
