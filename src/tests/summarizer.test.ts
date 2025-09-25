// ESM test runnable with: node --loader ts-node/esm ./src/tests/summarizer.test.ts
import assert from 'node:assert/strict';
import path from 'node:path';

import { summarizeText } from '../modules/summarization/index.js';
import { SUMMARY_CONFIG } from '../config/summary.js';

// Tests now rely on built-in SUMMARIZER_TEST_MODE hooks instead of patching node_modules.

async function testErrorWhenNoModel() {
  process.env.SUMMARIZER_TEST_MODE = '';
  // Force a non-existent model to ensure local load fails
  const original = { ...SUMMARY_CONFIG } as any;
  // mutate fields on the shared object to influence summarizer
  SUMMARY_CONFIG.defaultModel = 'NonExistent/Model-X';
  SUMMARY_CONFIG.modelId = 'NonExistent/Model-X';

  const input = 'This is a simple input intended to trigger error when no local model is available.';
  let threw = false;
  try {
    await summarizeText(input, 'en');
  } catch (e) {
    threw = true;
  }
  assert.equal(threw, true, 'Expected summarizer to throw when no transformer model is available');

  // restore config
  SUMMARY_CONFIG.defaultModel = original.defaultModel;
  SUMMARY_CONFIG.modelId = original.modelId;
}

async function testAbstractiveWhenModelPresent() {
  process.env.SUMMARIZER_TEST_MODE = 'mock';

  // Point to a "mock" model id so the pipeline caches under a distinct key
  const original = { ...SUMMARY_CONFIG } as any;
  SUMMARY_CONFIG.defaultModel = 'Mock/Model';
  SUMMARY_CONFIG.modelId = 'Mock/Model';
  SUMMARY_CONFIG.langModels.en = 'Mock/Model';

  const input = 'KMRL document: Maintenance team will inspect brake systems at Kalamassery depot next week.';
  const res = await summarizeText(input, 'en');
  console.log('[debug] summarizer method:', res.method);
  assert.equal(res.method, 'abstractive', 'Expected abstractive method when mock pipeline is enabled');
  assert.ok((res.summary || '').startsWith('TEST_MOCK_SUMMARY:'), 'Abstractive summary should come from mock pipeline');

  // cleanup + restore
  SUMMARY_CONFIG.defaultModel = original.defaultModel;
  SUMMARY_CONFIG.modelId = original.modelId;
  SUMMARY_CONFIG.langModels.en = original.langModels?.en || 'Xenova/distilbart-cnn-6-6';
  process.env.SUMMARIZER_TEST_MODE = '';
}

(async () => {
  try {
    await testErrorWhenNoModel();
    // Run abstractive test second to avoid cache issues and to ensure mock is created just-in-time
    await testAbstractiveWhenModelPresent();
    console.log('[summarizer.test] All checks passed.');
  } catch (err) {
    console.error('[summarizer.test] Failed:', err);
    process.exit(1);
  }
})();
