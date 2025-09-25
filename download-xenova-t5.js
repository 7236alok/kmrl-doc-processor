#!/usr/bin/env node

/**
 * Download Xenova/t5-small model - the ONNX version that works with @xenova/transformers
 */

import fs from 'fs-extra';
import path from 'path';
import https from 'https';

const MODEL_DIR = './models/Xenova/t5-small';
const ONNX_DIR = path.join(MODEL_DIR, 'onnx');

// Files needed for Xenova/t5-small
const FILES_TO_DOWNLOAD = [
  'config.json',
  'tokenizer.json', 
  'tokenizer_config.json',
  'generation_config.json',
  'onnx/encoder_model_quantized.onnx',
  'onnx/decoder_model_merged_quantized.onnx'
];

const BASE_URL = 'https://huggingface.co/Xenova/t5-small/resolve/main';

async function downloadFile(url, filePath) {
  return new Promise((resolve) => {
    console.log(`📥 Downloading: ${path.basename(filePath)}...`);
    
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(1);
          console.log(`✅ Downloaded: ${path.basename(filePath)} (${sizeMB} MB)`);
          resolve();
        });
      } else if ([301, 302, 307, 308].includes(response.statusCode)) {
        // Handle redirects
        let redirectUrl = response.headers.location;
        if (redirectUrl && redirectUrl.startsWith('/')) {
          redirectUrl = `https://huggingface.co${redirectUrl}`;
        }
        file.close();
        fs.unlink(filePath, () => {});
        https.get(redirectUrl, (redirectResponse) => {
          if (redirectResponse.statusCode === 200) {
            const newFile = fs.createWriteStream(filePath);
            redirectResponse.pipe(newFile);
            newFile.on('finish', () => {
              newFile.close();
              const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(1);
              console.log(`✅ Downloaded: ${path.basename(filePath)} (${sizeMB} MB)`);
              resolve();
            });
          } else {
            console.log(`❌ Failed: ${path.basename(filePath)} (${redirectResponse.statusCode})`);
            resolve();
          }
        }).on('error', () => {
          console.log(`❌ Error: ${path.basename(filePath)}`);
          resolve();
        });
      } else {
        console.log(`❌ Failed: ${path.basename(filePath)} (${response.statusCode})`);
        file.close();
        fs.unlink(filePath, () => {});
        resolve();
      }
    }).on('error', () => {
      console.log(`❌ Network error: ${path.basename(filePath)}`);
      file.close();
      fs.unlink(filePath, () => {});
      resolve();
    });
  });
}

async function downloadXenovaT5Small() {
  console.log('🚀 Downloading Xenova/t5-small model');
  console.log('====================================');
  
  // Create directories
  await fs.ensureDir(MODEL_DIR);
  await fs.ensureDir(ONNX_DIR);
  
  // Download files
  for (const file of FILES_TO_DOWNLOAD) {
    const filePath = path.join(MODEL_DIR, file);
    
    // Skip if already exists and has content
    if (await fs.pathExists(filePath)) {
      const stats = await fs.stat(filePath);
      if (stats.size > 1000) {
        console.log(`✅ Already exists: ${file}`);
        continue;
      }
    }
    
    const url = `${BASE_URL}/${file}`;
    await fs.ensureDir(path.dirname(filePath));
    await downloadFile(url, filePath);
  }
  
  console.log('\n📋 Final structure:');
  await listModelFiles(MODEL_DIR);
  
  console.log('\n🎉 Xenova/t5-small setup complete!');
  console.log('💡 Now you can test with: node src/test-t5-small.js');
  console.log('💡 Or run the full pipeline: npm run start:dist');
}

async function listModelFiles(dir) {
  const files = await fs.readdir(dir);
  for (const file of files.sort()) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      console.log(`📁 ${file}/`);
      const subFiles = await fs.readdir(filePath);
      for (const subFile of subFiles.sort()) {
        const subStat = await fs.stat(path.join(filePath, subFile));
        const size = subStat.size > 1024 * 1024 
          ? `${(subStat.size / 1024 / 1024).toFixed(1)} MB`
          : `${(subStat.size / 1024).toFixed(1)} KB`;
        console.log(`   📄 ${subFile} (${size})`);
      }
    } else {
      const size = stat.size > 1024 * 1024 
        ? `${(stat.size / 1024 / 1024).toFixed(1)} MB`
        : `${(stat.size / 1024).toFixed(1)} KB`;
      console.log(`📄 ${file} (${size})`);
    }
  }
}

downloadXenovaT5Small().catch(console.error);