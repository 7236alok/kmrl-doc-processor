#!/usr/bin/env node

/**
 * Download long-t5-tglobal-large model for improved long document summarization
 * This model can handle much longer input sequences than DistilBART
 */

import fs from 'fs-extra';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = path.join(__dirname, '..', 'models', 'long-t5-tglobal-large');
const ONNX_DIR = path.join(MODEL_DIR, 'onnx');

// Essential files for long-t5-tglobal-large
const REQUIRED_FILES = [
  'config.json',
  'tokenizer.json', 
  'tokenizer_config.json',
  'generation_config.json'
];

// Optional files that improve performance
const OPTIONAL_FILES = [
  'model.safetensors',
  'pytorch_model.bin',
  'onnx/decoder_model_merged_quantized.onnx',
  'onnx/encoder_model_quantized.onnx'
];

// Base URL for the model repository
const HF_BASE_URL = 'https://huggingface.co/google/long-t5-tglobal-large/resolve/main';

async function downloadWithRedirect(url, filePath) {
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
          // Handle redirects
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
          resolve(); // Don't reject - continue with other files
        }
      }).on('error', (err) => {
        file.close();
        fs.unlink(filePath, () => {});
        console.log(`❌ Error downloading ${path.basename(filePath)}: ${err.message}`);
        resolve(); // Don't reject - continue with other files
      });
    };
    
    makeRequest(url);
  });
}

async function checkExistingModel() {
  console.log('🔍 Checking existing long-t5-tglobal-large model...');
  
  if (!await fs.pathExists(MODEL_DIR)) {
    return { hasModel: false, missingFiles: REQUIRED_FILES };
  }
  
  const missingFiles = [];
  for (const file of REQUIRED_FILES) {
    if (!await fs.pathExists(path.join(MODEL_DIR, file))) {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length === 0) {
    console.log('✅ long-t5-tglobal-large model appears to be complete');
    return { hasModel: true, missingFiles: [] };
  } else {
    console.log(`⚠️ Missing required files: ${missingFiles.join(', ')}`);
    return { hasModel: false, missingFiles };
  }
}

async function downloadModelFiles() {
  console.log('📦 Setting up long-t5-tglobal-large model...');
  
  // Ensure directories exist
  await fs.ensureDir(MODEL_DIR);
  await fs.ensureDir(ONNX_DIR);
  
  const allFiles = [...REQUIRED_FILES, ...OPTIONAL_FILES];
  const downloadPromises = [];
  
  for (const file of allFiles) {
    const filePath = path.join(MODEL_DIR, file);
    
    // Skip if file already exists and has reasonable size
    if (await fs.pathExists(filePath)) {
      const stats = await fs.stat(filePath);
      if (stats.size > 100) { // More than 100 bytes suggests valid file
        console.log(`✅ Already exists: ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
        continue;
      }
    }
    
    const url = `${HF_BASE_URL}/${file}`;
    await fs.ensureDir(path.dirname(filePath));
    downloadPromises.push(downloadWithRedirect(url, filePath));
  }
  
  if (downloadPromises.length > 0) {
    console.log(`\n📥 Downloading ${downloadPromises.length} files...`);
    await Promise.all(downloadPromises);
  } else {
    console.log('\n✅ All files already present');
  }
}

async function verifyModelSetup() {
  console.log('\n🔬 Verifying model setup...');
  
  try {
    const configPath = path.join(MODEL_DIR, 'config.json');
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJSON(configPath);
      console.log(`📋 Model: ${config.model_type || 'unknown'}`);
      console.log(`📋 Max position embeddings: ${config.max_position_embeddings || 'unknown'}`);
      console.log(`📋 Vocab size: ${config.vocab_size || 'unknown'}`);
    }
    
    const tokenizerPath = path.join(MODEL_DIR, 'tokenizer_config.json');
    if (await fs.pathExists(tokenizerPath)) {
      const tokenizer = await fs.readJSON(tokenizerPath);
      console.log(`🔤 Tokenizer: ${tokenizer.tokenizer_class || 'unknown'}`);
    }
    
    // List all downloaded files
    console.log('\n📁 Downloaded model structure:');
    const files = await fs.readdir(MODEL_DIR);
    for (const file of files) {
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
        console.log(`📄 ${file} (${(stat.size / 1024).toFixed(1)} KB)`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Long-T5 TGlobal Large Model Setup');
  console.log('=====================================');
  
  const { hasModel, missingFiles } = await checkExistingModel();
  
  if (hasModel) {
    console.log('✅ Model is already set up and ready to use!');
  } else {
    await downloadModelFiles();
    const verified = await verifyModelSetup();
    
    if (verified) {
      console.log('\n🎉 long-t5-tglobal-large model setup complete!');
      console.log('\n📝 Usage:');
      console.log('- The model will automatically be used for long English documents (>12,000 chars)');
      console.log('- It supports much longer input sequences than DistilBART');
      console.log('- Optimized chunking (1500 tokens vs 700) for better performance');
      console.log('- Smart second-pass logic reduces unnecessary processing');
    } else {
      console.log('\n⚠️ Setup completed but verification failed');
      console.log('You may need to download additional files manually');
    }
  }
  
  console.log('\n🔄 Test the model with:');
  console.log('npm run start:dist');
}

main().catch(console.error);