import path from 'path';
import { env } from '@xenova/transformers';
import { ENV } from '../config/env.js';
// Configure Xenova transformers to use local ./models before any imports
const modelsDir = path.resolve(process.cwd(), 'models').replace(/\\/g, '/');
const allowRemoteModels = ENV.ALLOW_REMOTE_MODELS;
env.allowRemoteModels = allowRemoteModels;
env.localModelPath = modelsDir;
env.cacheDir = modelsDir;
env.useBrowserCache = false;
console.log('[bootstrap] Remote model downloads enabled:', allowRemoteModels);
// Mirror settings to process.env for any code paths reading from it
process.env.XENOVA_TRANSFORMERS_LOCAL = allowRemoteModels ? 'auto' : 'true';
process.env.XENOVA_TRANSFORMERS_CACHE = modelsDir;
process.env.TRANSFORMERS_OFFLINE = allowRemoteModels ? '0' : '1';
// Explicitly disable mock modes
process.env.SUMMARIZER_TEST_MODE = 'false';
process.env.HF_USE_MOCKS = 'false';
process.env.USE_MOCK_MODELS = 'false';
// Ensure WASM runtime files are resolved locally in Node
try {
  // Prefer native onnxruntime-node when available; fall back to WASM only if needed
  // @ts-ignore
  (env as any).backends = (env as any).backends || {};
  // @ts-ignore
  (env as any).backends.onnx = (env as any).backends.onnx || {};
  // Enable Node backend explicitly when running in Node
  // @ts-ignore
  (env as any).backends.onnx.js = (env as any).backends.onnx.js || {};
  // @ts-ignore
  (env as any).backends.onnx.js.proxy = 'node';
  // Configure WASM paths as a fallback (do not force usage)
  const wasmDir = path.resolve(process.cwd(), 'node_modules/@xenova/transformers/wasm').replace(/\\/g, '/');
  // @ts-ignore
  (env as any).backends.onnx.wasm = (env as any).backends.onnx.wasm || {};
  // @ts-ignore
  (env as any).backends.onnx.wasm.wasmPaths = wasmDir;
  // @ts-ignore
  (env as any).backends.onnx.wasm.numThreads = Math.max(1, Math.min(4, require('os').cpus()?.length || 2));
  // @ts-ignore
  (env as any).backends.onnx.wasm.simd = true;
} catch {}
// Ensure test-only env var is not leaking into dev/prod runs
if (process.env.NODE_ENV !== 'test' && process.env.SUMMARIZER_TEST_MODE) {
	delete process.env.SUMMARIZER_TEST_MODE;
	console.log('[bootstrap] Cleared SUMMARIZER_TEST_MODE for non-test environment');
}
console.log('[bootstrap] Configured @xenova/transformers env:', env.localModelPath);
