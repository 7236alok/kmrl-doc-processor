#!/usr/bin/env node

/**
 * Create basic ONNX placeholder files for long-t5-tglobal-large
 * This creates minimal ONNX files that can be loaded by your summarizer code
 */

import fs from 'fs-extra';
import path from 'path';

const MODEL_DIR = './models/long-t5-tglobal-large';
const ONNX_DIR = path.join(MODEL_DIR, 'onnx');

async function createPlaceholderONNX() {
  console.log('🔧 Creating placeholder ONNX files for long-t5-tglobal-large');
  console.log('=' * 60);
  
  // Ensure ONNX directory exists
  await fs.ensureDir(ONNX_DIR);
  
  // Create placeholder ONNX files (minimal size)
  const placeholderFiles = [
    'encoder_model.onnx',
    'decoder_model.onnx', 
    'encoder_model_quantized.onnx',
    'decoder_model_quantized.onnx',
    'decoder_model_merged_quantized.onnx'
  ];
  
  // Minimal ONNX file content (just a header)
  const minimalONNX = Buffer.from([
    0x08, 0x01, 0x12, 0x00, 0x1a, 0x00, 0x22, 0x00  // Minimal ONNX header
  ]);
  
  for (const filename of placeholderFiles) {
    const filePath = path.join(ONNX_DIR, filename);
    await fs.writeFile(filePath, minimalONNX);
    console.log(`✅ Created placeholder: ${filename}`);
  }
  
  console.log('\n⚠️  WARNING: These are placeholder files!');
  console.log('Your summarizer will attempt to load them but may fail.');
  console.log('Consider using a smaller model or the TextRank fallback.');
  
  // Check current model files
  console.log('\n📋 Current model structure:');
  const files = await fs.readdir(MODEL_DIR);
  for (const file of files.sort()) {
    const filePath = path.join(MODEL_DIR, file);
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      console.log(`📁 ${file}/`);
      const subFiles = await fs.readdir(filePath);
      for (const subFile of subFiles) {
        const subStat = await fs.stat(path.join(filePath, subFile));
        console.log(`   📄 ${subFile} (${(subStat.size / 1024).toFixed(1)} KB)`);
      }
    } else {
      console.log(`📄 ${file} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
    }
  }
  
  console.log('\n💡 Alternative: Switch to a working model in your config');
  console.log('   - Edit src/config/summary.ts');  
  console.log('   - Change longDocModel back to "Xenova/distilbart-cnn-6-6"');
  console.log('   - Or use "t5-small" for testing');
}

createPlaceholderONNX().catch(console.error);