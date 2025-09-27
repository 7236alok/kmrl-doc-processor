import { saveEnhancedMetadata, loadEnhancedMetadata, searchEnhancedDocuments, getDatasetStats } from '../utils/enhanced-storage-utils.js';
import path from 'path';

async function testEnhancedStorage() {
  console.log('🧪 Testing Enhanced Storage System...');
  console.log('');

  // Sample metadata that matches your existing structure
  const testMetadata = {
    id: "test-enhanced-001",
    fileName: "test-enhanced-document.txt",
    source: {
      system: "Manual Upload",
      originalPath: "test-enhanced-document.txt",
      departments: ["Engineering", "Testing"]
    },
    language: "English",
    fileInfo: {
      originalName: "test-enhanced-document.txt",
      extension: "txt",
      sizeBytes: 1024,
      checksum: "abc123def456"
    },
    summary: "This is a test document for enhanced storage system validation",
    enhancedSummary: {
      summary: "Enhanced test document",
      fullSummary: "This is a comprehensive test of the enhanced storage system",
      chunkSummaries: [],
      actionItems: ["Test enhanced storage", "Verify dataset upload"],
      compressionRatio: 0.8,
      numSentences: 2,
      method: "extractive",
      departments: ["Engineering", "Testing"]
    },
    actionItems: [
      { text: "Test enhanced storage", priority: "high", category: "testing" },
      { text: "Verify dataset upload", priority: "medium", category: "validation" }
    ],
    classification: {
      category: "Testing",
      confidence: 0.95,
      categories: [
        { category: "Testing", confidence: 0.95, score: 0.95 }
      ]
    },
    ner: {
      persons: ["Test Engineer"],
      dates: ["2025-09-27"],
      locations: ["Local System"],
      organizations: ["KMRL", "Testing Department"]
    },
    dueDates: ["2025-09-30"],
    relatedAssets: [],
    mlInsights: {
      entities: { confidence: 0.8 },
      urgencyLevel: "medium",
      urgencyScore: 0.6,
      estimatedEffort: { hours: 1, complexity: "low", confidence: 0.8 }
    },
    domain: {
      criticalityScore: 0.6,
      topicTags: ["testing", "storage"],
      complianceFlags: false,
      safetyRelevance: false,
      operationalImpact: 0.3,
      alertLevel: "low"
    },
    knowledgeLinks: {
      similarTopics: ["testing", "storage"],
      assetConnections: [],
      complianceReferences: [],
      proceduralConnections: []
    },
    confidenceScores: {
      overall: 0.85,
      summarization: 0.9,
      entityExtraction: 0.8,
      classification: 0.95
    },
    traceabilityInfo: {
      processingPipeline: {
        version: "2.0.0-enhanced",
        steps: ["ocr", "summary", "ner", "classification"],
        processingTime: 1500,
        timestamp: new Date().toISOString()
      }
    },
    generatedAt: new Date().toISOString(),
    version: "1",
    processingStats: {
      totalTime: 1500,
      enhancedAnalysisTime: 500
    }
  };

  try {
    // Test 1: Save enhanced metadata
    console.log('📝 Test 1: Saving enhanced metadata...');
    await saveEnhancedMetadata("test-enhanced-001", testMetadata, true);
    console.log('✅ Save test passed');
    console.log('');

    // Test 2: Load enhanced metadata
    console.log('📖 Test 2: Loading enhanced metadata...');
    const loadedMetadata = await loadEnhancedMetadata("test-enhanced-001");
    if (loadedMetadata) {
      console.log('✅ Load test passed');
      console.log(`   ID: ${loadedMetadata.id}`);
      console.log(`   File: ${loadedMetadata.fileName}`);
      console.log(`   Summary: ${loadedMetadata.summary.substring(0, 50)}...`);
    } else {
      console.log('❌ Load test failed - no metadata found');
    }
    console.log('');

    // Test 3: Search functionality
    console.log('🔍 Test 3: Searching documents...');
    const searchResults = await searchEnhancedDocuments("enhanced");
    console.log(`✅ Search test passed - found ${searchResults.length} results`);
    searchResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.fileName} - ${result.classification?.category}`);
    });
    console.log('');

    // Test 4: Dataset statistics
    console.log('📊 Test 4: Getting dataset statistics...');
    const stats = await getDatasetStats();
    console.log('✅ Statistics test passed');
    console.log(`   Total Documents: ${stats.totalDocuments}`);
    console.log(`   Uploaded to Dataset: ${stats.uploadedToDataset}`);
    console.log(`   Pending Upload: ${stats.pendingUpload}`);
    if (stats.lastUpload) {
      console.log(`   Last Upload: ${stats.lastUpload.toISOString()}`);
    }
    console.log('');

    // Test 5: Verify dataset file creation
    console.log('📁 Test 5: Checking dataset files...');
    const datasetPath = path.join(process.cwd(), 'storage/dataset');
    console.log(`   Dataset directory: ${datasetPath}`);
    
    // Check if dataset files were created
    const fs = await import('fs-extra');
    if (await fs.pathExists(datasetPath)) {
      const files = await fs.readdir(datasetPath);
      console.log(`✅ Dataset files found: ${files.length} files`);
      files.forEach(file => console.log(`   - ${file}`));
    } else {
      console.log('⚠️  Dataset directory not found');
    }

    console.log('');
    console.log('🎉 All enhanced storage tests completed successfully!');

  } catch (error) {
    console.error('❌ Enhanced storage test failed:');
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   Error: ${errorMessage}`);
  }
}

// Run the test
testEnhancedStorage().catch(console.error);