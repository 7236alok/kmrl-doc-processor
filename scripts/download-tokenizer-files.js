/**
 * Download tokenizer files specifically for distilbart-cnn-6-6
 */

import fs from 'fs-extra';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = path.join(__dirname, '..', 'models', 'Xenova', 'distilbart-cnn-6-6');

// Try alternative URLs for the missing files
const ALTERNATIVE_SOURCES = [
  {
    file: 'vocab.json',
    url: 'https://huggingface.co/sshleifer/distilbart-cnn-6-6/resolve/main/vocab.json'
  },
  {
    file: 'merges.txt', 
    url: 'https://huggingface.co/sshleifer/distilbart-cnn-6-6/resolve/main/merges.txt'
  }
];

async function downloadWithRedirect(url, filePath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${path.basename(filePath)} from ${url}...`);
    
    const file = fs.createWriteStream(filePath);
    
    const makeRequest = (requestUrl) => {
      https.get(requestUrl, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`✅ Downloaded: ${path.basename(filePath)}`);
            resolve();
          });
        } else if (response.statusCode === 302 || response.statusCode === 301 || response.statusCode === 307) {
          // Handle redirects
          let redirectUrl = response.headers.location;
          if (redirectUrl.startsWith('/')) {
            // Relative redirect - construct full URL
            redirectUrl = `https://huggingface.co${redirectUrl}`;
          }
          console.log(`🔄 Redirecting to: ${redirectUrl}`);
          file.close();
          fs.unlinkSync(filePath);
          makeRequest(redirectUrl);
        } else {
          console.log(`❌ Failed to download ${path.basename(filePath)}: HTTP ${response.statusCode}`);
          file.close();
          fs.unlink(filePath, () => {});
          resolve(); // Don't reject
        }
      }).on('error', (err) => {
        file.close();
        fs.unlink(filePath, () => {});
        console.log(`❌ Error downloading ${path.basename(filePath)}: ${err.message}`);
        resolve();
      });
    };
    
    makeRequest(url);
  });
}

async function main() {
  console.log('📥 Attempting to download tokenizer files from original model...');
  
  await fs.ensureDir(MODEL_DIR);
  
  for (const source of ALTERNATIVE_SOURCES) {
    const filePath = path.join(MODEL_DIR, source.file);
    
    if (await fs.pathExists(filePath)) {
      console.log(`✅ Already exists: ${source.file}`);
      continue;
    }
    
    await downloadWithRedirect(source.url, filePath);
  }
  
  console.log('\n📋 Final model structure:');
  try {
    const files = await fs.readdir(MODEL_DIR);
    for (const file of files) {
      const filePath = path.join(MODEL_DIR, file);
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        console.log(`📁 ${file}/`);
        const subFiles = await fs.readdir(filePath);
        subFiles.forEach(subFile => console.log(`   - ${subFile}`));
      } else {
        console.log(`📄 ${file} (${(stat.size / 1024).toFixed(1)} KB)`);
      }
    }
  } catch (err) {
    console.error('Error listing files:', err.message);
  }
}

main().catch(console.error);