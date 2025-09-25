#!/usr/bin/env node

/**
 * Download Xenova/t5-small model with ONNX files
 * This is a lightweight T5 model that works well with @xenova/transformers
 */

import fs from 'fs-extra';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = path.join(__dirname, 'models', 'Xenova', 't5-small');
const ONNX_DIR = path.join(MODEL_DIR, 'onnx');

// Essential files for Xenova/t5-small
const REQUIRED_FILES = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'generation_config.json'
];

// ONNX files (the key difference from regular t5-small)
const ONNX_FILES = [
  'onnx/encoder_model_quantized.onnx',
  'onnx/decoder_model_merged_quantized.onnx',
  'onnx/decoder_with_past_model_quantized.onnx'
];

// Base URL for Xenova models
const HF_BASE_URL = 'https://huggingface.co/Xenova/t5-small/resolve/main';

async function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Downloading: ${path.basename(filePath)}...`);
    
    const file = fs.createWriteStream(filePath);
    
    const makeRequest = (requestUrl) => {
      https.get(requestUrl, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`✅ Downloaded: ${path.basename(filePath)} (${(fs.statSync(filePath).size / 1024).toFixed(1)} KB)`);
            resolve();
          });
        } else if ([301, 302, 307, 308].includes(response.statusCode)) {
          let redirectUrl = response.headers.location;
          if (redirectUrl.startsWith('/')) {
            redirectUrl = `https://huggingface.co${redirectUrl}`;
          }
          file.close();
          fs.unlink(filePath, () => {});
          makeRequest(redirectUrl);
        } else {
          console.log(`❌ Failed to download ${path.basename(filePath)}: HTTP ${response.statusCode}`);
          file.close();
          fs.unlink(filePath, () => {});
          resolve(); // Continue with other files
        }
      }).on('error', (err) => {
        file.close();
        fs.unlink(filePath, () => {});
        console.log(`❌ Error downloading ${path.basename(filePath)}: ${err.message}`);
        resolve(); // Continue with other files
      });
    };
    
    makeRequest(url);
  });
}

async function setupT5Small() {
  console.log('🚀 Setting up Xenova/t5-small model');
  console.log('====================================');
  
  // Ensure directories exist
  await fs.ensureDir(MODEL_DIR);
  await fs.ensureDir(ONNX_DIR);
  
  // Download required files
  const allFiles = [...REQUIRED_FILES, ...ONNX_FILES];
  
  console.log(`📦 Downloading ${allFiles.length} files...`);
  
  for (const file of allFiles) {
    const filePath = path.join(MODEL_DIR, file);
    
    // Skip if file already exists and has reasonable size
    if (await fs.pathExists(filePath)) {
      const stats = await fs.stat(filePath);
      if (stats.size > 100) {
        console.log(`✅ Already exists: ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
        continue;
      }
    }
    
    const url = `${HF_BASE_URL}/${file}`;
    await fs.ensureDir(path.dirname(filePath));
    await downloadFile(url, filePath);
  }
  
  // Verify setup
  console.log('\n🔬 Verifying model setup...');
  
  try {
    const configPath = path.join(MODEL_DIR, 'config.json');
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJSON(configPath);
      console.log(`📋 Model: ${config.model_type || 'unknown'}`);
      console.log(`📋 Max length: ${config.n_positions || config.max_position_embeddings || 'unknown'}`);
      console.log(`📋 Vocab size: ${config.vocab_size || 'unknown'}`);
    }
    
    // List final structure
    console.log('\n📁 Final model structure:');
    const files = await fs.readdir(MODEL_DIR);
    for (const file of files.sort()) {
      const filePath = path.join(MODEL_DIR, file);
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        console.log(`📁 ${file}/`);
        const subFiles = await fs.readdir(filePath);
        for (const subFile of subFiles.sort()) {
          const subStat = await fs.stat(path.join(filePath, subFile));
          console.log(`   📄 ${subFile} (${(subStat.size / 1024).toFixed(1)} KB)`);
        }
      } else {
        console.log(`📄 ${file} (${(stat.size / 1024).toFixed(1)} KB)`);
      }
    }
    
    console.log('\n✅ Xenova/t5-small setup complete!');
    console.log('\n📝 Benefits of t5-small:');
    console.log('- Lightweight and fast');
    console.log('- Good performance for summarization');
    console.log('- Reliable ONNX format');
    console.log('- Works well with @xenova/transformers');
    
    console.log('\n🔄 Test your pipeline: npm run start:dist');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

setupT5Small().catch(console.error);