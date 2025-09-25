#!/usr/bin/env node

// Ensure SUMMARIZER_TEST_MODE is fully unset before any imports
process.env.SUMMARIZER_TEST_MODE = '';

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

function getArg(name, defVal) {
  const p = `--${name}=`;
  const a = process.argv.find(x => x.startsWith(p));
  return a ? a.slice(p.length) : defVal;
}

async function main() {
  const lang = getArg('lang', 'en');
  const text = getArg('text', 'This is a KMRL test document for offline summarization.');
  let summarizeText;
  // Prefer compiled dist if present
  const distEntry = path.resolve('dist', 'src', 'modules', 'summarization', 'index.js');
  if (fs.existsSync(distEntry)) {
    const entryUrl = pathToFileURL(distEntry).href;
    ({ summarizeText } = await import(entryUrl));
  } else {
    // Register ts-node/esm dynamically, then import TS entry
    const mod = await import('node:module');
    const { register } = mod;
    register('ts-node/esm', pathToFileURL('./'));
    const tsEntry = pathToFileURL(path.resolve('src/modules/summarization/index.ts')).href;
    ({ summarizeText } = await import(tsEntry));
  }
  const res = await summarizeText(text, lang);
  console.log(JSON.stringify({ method: res.method, summary: res.summary?.slice(0, 200) }));
}

main().catch((e) => { console.error(e); process.exit(1); });
