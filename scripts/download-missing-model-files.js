#!/usr/bin/env node

/**
 * Download missing files for Xenova/distilbart-cnn-6-6 model
 * Based on the diagnostic output from the pipeline
 */

import fs from 'fs-extra';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = path.join(__dirname, '..', 'models', 'Xenova', 'distilbart-cnn-6-6');
const ONNX_DIR = path.join(MODEL_DIR, 'onnx');

// Files that are missing according to the diagnostic output
const MISSING_FILES = [
  'vocab.json',
  'merges.txt', 
  'model.safetensors',
  'pytorch_model.bin',
  'onnx/model.onnx',
  'onnx/encoder_model.onnx',
  'onnx/decoder_model.onnx',
  'decoder_model_merged_quantized.onnx'
];

// Hugging Face model repository
const HF_BASE_URL = 'https://huggingface.co/Xenova/distilbart-cnn-6-6/resolve/main';

async function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${path.basename(filePath)}...`);
    
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✅ Downloaded: ${path.basename(filePath)}`);
          resolve();
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirects
        downloadFile(response.headers.location, filePath).then(resolve).catch(reject);
      } else {
        console.log(`❌ Failed to download ${path.basename(filePath)}: HTTP ${response.statusCode}`);
        fs.unlink(filePath, () => {}); // Delete partial file
        resolve(); // Don't reject - some files might not exist
      }
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      console.log(`❌ Error downloading ${path.basename(filePath)}: ${err.message}`);
      resolve(); // Don't reject - continue with other files
    });
  });
}

async function main() {
  console.log('🔍 Checking missing model files for Xenova/distilbart-cnn-6-6...');
  
  // Ensure directories exist
  await fs.ensureDir(MODEL_DIR);
  await fs.ensureDir(ONNX_DIR);
  
  const downloadPromises = [];
  
  for (const file of MISSING_FILES) {
    const filePath = path.join(MODEL_DIR, file);
    
    // Skip if file already exists
    if (await fs.pathExists(filePath)) {
      console.log(`✅ Already exists: ${file}`);
      continue;
    }
    
    const url = `${HF_BASE_URL}/${file}`;
    
    // Ensure parent directory exists
    await fs.ensureDir(path.dirname(filePath));
    
    downloadPromises.push(downloadFile(url, filePath));
  }
  
  console.log(`\n📥 Downloading ${downloadPromises.length} missing files...`);
  await Promise.all(downloadPromises);
  
  console.log('\n🎉 Download process completed!');
  
  // Verify what we have now
  console.log('\n📋 Current model files:');
  const currentFiles = await fs.readdir(MODEL_DIR);
  currentFiles.forEach(file => console.log(`   - ${file}`));
  
  const onnxFiles = await fs.readdir(ONNX_DIR);
  console.log('\n📋 ONNX files:');
  onnxFiles.forEach(file => console.log(`   - onnx/${file}`));
  
  console.log('\n✨ Model setup complete! You can now test the summarization pipeline.');
}

main().catch(console.error);