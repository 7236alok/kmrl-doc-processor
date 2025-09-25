#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const LANGS = (process.env.OCR_LANGUAGES || 'eng,hin,mal')
  .split(/[,; ]+/)
  .map(s => s.trim())
  .filter(Boolean);

const DEST = path.resolve('./tessdata');
if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

async function download(lang){
  const url = `https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/main/${lang}.traineddata`;
  const outPath = path.join(DEST, `${lang}.traineddata`);
  if (fs.existsSync(outPath)) {
    console.log(`[skip] ${lang} already present`);
    return;
  }
  process.stdout.write(`[downloading] ${lang} ... `);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outPath, buf);
    console.log(`ok ${(buf.length/1024).toFixed(1)} KB`);
  } catch (e) {
    console.error(`failed: ${(e && e.message) || e}`);
  }
}

(async () => {
  console.log(`Downloading Tesseract traineddata for: ${LANGS.join(', ')}`);
  for (const l of LANGS) await download(l);
  console.log('Done.');
})();
