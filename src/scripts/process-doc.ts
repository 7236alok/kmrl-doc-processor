#!/usr/bin/env node

/**
 * Enhanced Document Processing CLI with Multi-Engine OCR
 * Usage: node process-doc.js <file-path> [document-type]
 */

import { processDocument } from '../processDocument.js';
import path from 'path';

async function runProcessing() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🔍 Enhanced Document Processing CLI

Usage:
  node process-doc.js <file-path> [document-type]

Examples:
  node process-doc.js document.pdf
  node process-doc.js scan.jpg scanned_docs
  node process-doc.js contract.pdf legal
  node process-doc.js memo.docx memo

Available document types: legal, financial, memo, scan, multilingual
    `);
    return;
  }
  
  const filePath = args[0]!;
  const documentType = args[1];
  
  // Generate document ID from filename
  const docId = path.basename(filePath, path.extname(filePath));
  
  try {
    console.log(`\n🚀 Processing: ${path.basename(filePath)}`);
    console.log(`📁 Document ID: ${docId}`);
    if (documentType) {
      console.log(`📋 Document Type: ${documentType}`);
    }
    console.log('=' .repeat(60));
    
    const result = await processDocument(filePath, docId, documentType);
    
    console.log(`\n✅ Processing completed successfully!`);
    console.log(`📊 Results:`);
    console.log(`   - Document processed: ${docId}`);
    console.log(`   - Document saved to: storage/documents/${docId}.txt`);
    console.log(`   - Metadata saved to: storage/metadata/${docId}.json`);
    
    // Enhanced metadata information
    console.log(`\n� Processing Information:`);
    console.log(`   - Language detected: ${result.language}`);
    const classificationCategories = result.classification?.categories ?? [];
    if (classificationCategories.length > 0) {
      const primary = classificationCategories[0]!;
      console.log(`   - Primary classification: ${primary.category} (${(primary.confidence * 100).toFixed(0)}%)`);
      if (classificationCategories.length > 1) {
        const secondary = classificationCategories
          .slice(1)
          .map((c) => `${c.category} (${(c.confidence * 100).toFixed(0)}%)`)
          .join(', ');
        console.log(`   - Additional categories: ${secondary}`);
      }
    } else {
      console.log(`   - Classification: unavailable`);
    }
    console.log(`   - Action items found: ${result.actionItems.length}`);
    console.log(`   - ML urgency level: ${result.mlInsights.urgencyLevel}`);
    console.log(`   - Criticality score: ${result.domain.criticalityScore.toFixed(2)}`);
    console.log(`   - Total processing time: ${result.processingStats.totalTime}ms`);
    
    if (result.traceabilityInfo?.processingPipeline) {
      console.log(`\n🔄 Pipeline Information:`);
      console.log(`   - Pipeline version: ${result.traceabilityInfo.processingPipeline.version}`);
      console.log(`   - Steps completed: ${result.traceabilityInfo.processingPipeline.steps.join(', ')}`);
    }
    
  } catch (error) {
    console.error(`❌ Processing failed:`, error);
    process.exit(1);
  }
}

// Run CLI
runProcessing().catch(console.error);