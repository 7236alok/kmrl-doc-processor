#!/usr/bin/env node

/**
 * OCR Engine Testing CLI
 * Usage: node ocr-test.js <file-path> [engine] [document-type]
 */

import { extractText, OCR_PROFILES, getOCRConfigForDocument } from '../modules/ocr/index.js';
import { performance } from 'perf_hooks';
import path from 'path';

async function testOCREngine(filePath: string, engineName?: string, documentType?: string) {
  console.log(`\n🔍 Testing OCR Engine on: ${path.basename(filePath)}`);
  console.log('='.repeat(60));
  
  try {
    // Get configuration
    const config = getOCRConfigForDocument(filePath, documentType, {
      ...(engineName && { preferredEngine: engineName }),
    });
    
    console.log(`📋 Configuration:`);
    console.log(`   Engine: ${config.preferredEngine}`);
    console.log(`   Languages: ${config.languages?.join(', ')}`);
    console.log(`   Confidence Threshold: ${(config.confidenceThreshold! * 100).toFixed(1)}%`);
    console.log(`   Fallback: ${config.fallbackEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`   Timeout: ${config.timeout}ms\n`);
    
    // Run OCR
    const startTime = performance.now();
    const result = await extractText(filePath, config);
    const endTime = performance.now();
    
    // Display results
    console.log(`✅ OCR Results:`);
    console.log(`   Engine Used: ${result.engine}`);
    console.log(`   Method: ${result.method}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Language: ${result.language}`);
    console.log(`   Processing Time: ${(endTime - startTime).toFixed(0)}ms`);
    console.log(`   Fallback Used: ${result.fallbackUsed ? 'Yes' : 'No'}`);
    console.log(`   Text Length: ${result.text.length} characters\n`);
    
    // Show text preview
    const preview = result.text.slice(0, 200).replace(/\n/g, ' ');
    console.log(`📄 Text Preview:`);
    console.log(`   "${preview}${result.text.length > 200 ? '...' : ''}"\n`);
    
    // Performance assessment
    if (result.confidence > 0.9) {
      console.log(`🎯 Assessment: Excellent quality`);
    } else if (result.confidence > 0.7) {
      console.log(`✨ Assessment: Good quality`);
    } else if (result.confidence > 0.5) {
      console.log(`⚠️  Assessment: Fair quality - consider manual review`);
    } else {
      console.log(`❌ Assessment: Poor quality - manual intervention recommended`);
    }
    
  } catch (error) {
    console.error(`❌ OCR failed:`, error);
  }
}

async function comparEngines(filePath: string, documentType?: string) {
  console.log(`\n🔬 Comparing OCR Engines on: ${path.basename(filePath)}`);
  console.log('='.repeat(60));
  
  const engines = ['direct', 'tesseract', 'pdf-first'];
  const results: Array<{ engine: string; result?: any; error?: string; time: number }> = [];
  
  for (const engine of engines) {
    console.log(`\nTesting ${engine} engine...`);
    
    try {
      const startTime = performance.now();
      const result = await extractText(filePath, { preferredEngine: engine as any });
      const endTime = performance.now();
      
      results.push({
        engine,
        result,
        time: endTime - startTime
      });
      
      console.log(`✅ ${engine}: ${(result.confidence * 100).toFixed(1)}% confidence, ${result.text.length} chars`);
      
    } catch (error) {
      results.push({
        engine,
        error: String(error),
        time: 0
      });
      
      console.log(`❌ ${engine}: Failed - ${error}`);
    }
  }
  
  // Summary comparison
  console.log(`\n📊 Engine Comparison Summary:`);
  console.log('Engine'.padEnd(15) + 'Confidence'.padEnd(12) + 'Time (ms)'.padEnd(12) + 'Characters'.padEnd(12) + 'Status');
  console.log('-'.repeat(60));
  
  for (const { engine, result, error, time } of results) {
    if (result) {
      const confidence = `${(result.confidence * 100).toFixed(1)}%`;
      const timeStr = `${time.toFixed(0)}ms`;
      const chars = `${result.text.length}`;
      console.log(engine.padEnd(15) + confidence.padEnd(12) + timeStr.padEnd(12) + chars.padEnd(12) + '✅ Success');
    } else {
      console.log(engine.padEnd(15) + 'N/A'.padEnd(12) + 'N/A'.padEnd(12) + 'N/A'.padEnd(12) + `❌ ${error}`);
    }
  }
  
  // Recommendation
  const successful = results.filter(r => r.result);
  if (successful.length > 0) {
    const best = successful.reduce((prev, curr) => 
      curr.result.confidence > prev.result.confidence ? curr : prev
    );
    console.log(`\n🏆 Recommended: ${best.engine} (${(best.result.confidence * 100).toFixed(1)}% confidence)`);
  }
}

async function listProfiles() {
  console.log(`\n📋 Available OCR Profiles:`);
  console.log('='.repeat(40));
  
  for (const [name, config] of Object.entries(OCR_PROFILES)) {
    console.log(`\n📄 ${name}:`);
    console.log(`   Engine: ${config.preferredEngine}`);
    console.log(`   Languages: ${config.languages?.join(', ')}`);
    console.log(`   Confidence: ${(config.confidenceThreshold! * 100).toFixed(1)}%`);
    console.log(`   Fallback: ${config.fallbackEnabled ? 'Yes' : 'No'}`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🔍 OCR Engine Testing CLI

Usage:
  node ocr-test.js <file-path> [engine] [document-type]
  node ocr-test.js --compare <file-path> [document-type]
  node ocr-test.js --profiles

Examples:
  node ocr-test.js document.pdf
  node ocr-test.js scan.jpg tesseract scanned_docs
  node ocr-test.js --compare complex.pdf legal
  node ocr-test.js --profiles

Available engines: auto, direct, tesseract, pdf-first
Available document types: legal, financial, memo, scan, multilingual
    `);
    return;
  }
  
  if (args[0] === '--profiles') {
    await listProfiles();
    return;
  }
  
  if (args[0] === '--compare') {
    if (args.length < 2) {
      console.error('❌ File path required for comparison');
      return;
    }
    await comparEngines(args[1]!, args[2]);
    return;
  }
  
  const filePath = args[0]!;
  const engine = args[1];
  const documentType = args[2];
  
  await testOCREngine(filePath, engine, documentType);
}

// Run CLI
main().catch(console.error);