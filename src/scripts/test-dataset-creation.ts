import { connectToDatabase, getDb, closeDatabase } from '../db/mongo-adapter.js';
import fs from 'fs-extra';
import path from 'path';

async function createDatasetFromMetadata() {
  console.log('📊 Creating Dataset Files from Uploaded Metadata...');
  console.log('');

  const DATASET_PATH = path.join(process.cwd(), "storage/dataset");
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    const db = await connectToDatabase();
    const metadataCollection = db.collection('metadata');
    
    // Ensure dataset directory exists
    await fs.ensureDir(DATASET_PATH);
    console.log(`📁 Dataset directory ready: ${DATASET_PATH}`);
    console.log('');

    // Get all documents from MongoDB
    console.log('📖 Fetching all metadata from MongoDB...');
    const allDocs = await metadataCollection.find({}).toArray();
    console.log(`📊 Found ${allDocs.length} documents in MongoDB`);
    console.log('');

    let datasetCreated = 0;
    let errors = 0;

    // Create dataset JSON for each document
    for (const doc of allDocs) {
      try {
        const docId = doc.id || doc._id.toString();
        console.log(`📄 Creating dataset file for: ${docId}`);

        // Create ML-ready dataset structure
        const datasetDoc = {
          document_id: docId,
          timestamp: new Date().toISOString(),
          source: "kmrl-doc-processor-mongodb",
          dataset_version: "1.0",
          metadata: {
            // Core document info
            id: doc.id,
            fileName: doc.fileName,
            originalName: doc.fileInfo?.originalName,
            extension: doc.fileInfo?.extension,
            sizeBytes: doc.fileInfo?.sizeBytes,
            language: doc.language,
            
            // Processing results
            summary: doc.summary,
            classification: {
              category: doc.classification?.category,
              confidence: doc.classification?.confidence,
              all_categories: doc.classification?.categories
            },
            
            // Named Entity Recognition
            entities: {
              persons: doc.ner?.persons || [],
              dates: doc.ner?.dates || [],
              locations: doc.ner?.locations || [],
              organizations: doc.ner?.organizations || []
            },
            
            // Action items and due dates
            actionItems: doc.actionItems || [],
            dueDates: doc.dueDates || [],
            
            // ML insights
            confidenceScores: doc.confidenceScores,
            urgencyLevel: doc.mlInsights?.urgencyLevel,
            estimatedEffort: doc.mlInsights?.estimatedEffort,
            
            // Processing metadata
            processingPipeline: doc.traceabilityInfo?.processingPipeline,
            generatedAt: doc.generatedAt,
            uploadedToMongoDB: doc.uploadedToMongoDB,
            
            // Department and source info
            departments: doc.source?.departments || [],
            sourceSystem: doc.source?.system
          },
          
          // ML features for training
          features: {
            text_length: doc.summary?.length || 0,
            entity_count: (doc.ner?.persons?.length || 0) + 
                         (doc.ner?.locations?.length || 0) + 
                         (doc.ner?.organizations?.length || 0),
            action_item_count: doc.actionItems?.length || 0,
            confidence_overall: doc.confidenceScores?.overall || 0,
            has_due_dates: (doc.dueDates?.length || 0) > 0,
            department_count: doc.source?.departments?.length || 0
          },
          
          // Labels for ML training
          labels: {
            category: doc.classification?.category,
            urgency: doc.mlInsights?.urgencyLevel,
            safety_relevant: doc.domain?.safetyRelevance || false,
            compliance_flags: doc.domain?.complianceFlags || false
          }
        };

        // Save dataset file
        const datasetFileName = `${docId}_dataset.json`;
        const datasetFilePath = path.join(DATASET_PATH, datasetFileName);
        await fs.writeJSON(datasetFilePath, datasetDoc, { spaces: 2 });

        // Update MongoDB to mark as uploaded to dataset
        await metadataCollection.updateOne(
          { id: docId },
          { 
            $set: { 
              uploadedToDataset: true,
              datasetUploadTime: new Date(),
              datasetFilePath: datasetFilePath,
              datasetFileName: datasetFileName
            }
          }
        );

        console.log(`   ✅ Dataset file created: ${datasetFileName}`);
        console.log(`   📊 Features: ${JSON.stringify(datasetDoc.features)}`);
        console.log(`   🏷️  Labels: ${JSON.stringify(datasetDoc.labels)}`);
        
        datasetCreated++;

      } catch (docError) {
        const errorMessage = docError instanceof Error ? docError.message : String(docError);
        console.error(`   ❌ Error creating dataset for ${doc.id}:`, errorMessage);
        errors++;
      }
      console.log('');
    }

    // Final statistics
    console.log('📊 Dataset Creation Summary:');
    console.log(`   ✅ Dataset files created: ${datasetCreated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📁 Total documents processed: ${allDocs.length}`);
    console.log('');

    // List created dataset files
    console.log('📁 Created dataset files:');
    const datasetFiles = await fs.readdir(DATASET_PATH);
    datasetFiles.forEach(file => {
      console.log(`   - ${file}`);
    });
    console.log('');

    // Show dataset statistics from MongoDB
    console.log('📈 Dataset Upload Statistics:');
    const totalDocs = await metadataCollection.countDocuments();
    const uploadedToDataset = await metadataCollection.countDocuments({ uploadedToDataset: true });
    const pendingUpload = totalDocs - uploadedToDataset;
    
    console.log(`   📊 Total documents: ${totalDocs}`);
    console.log(`   📤 Uploaded to dataset: ${uploadedToDataset}`);
    console.log(`   ⏳ Pending upload: ${pendingUpload}`);
    
    // Show sample dataset file content
    if (datasetFiles.length > 0 && datasetFiles[0]) {
      console.log('');
      console.log('📋 Sample Dataset File Content:');
      const sampleFile = path.join(DATASET_PATH, datasetFiles[0]);
      const sampleContent = await fs.readJSON(sampleFile);
      
      console.log(`   File: ${datasetFiles[0]}`);
      console.log(`   Document ID: ${sampleContent.document_id}`);
      console.log(`   Timestamp: ${sampleContent.timestamp}`);
      console.log(`   Features: ${JSON.stringify(sampleContent.features, null, 2)}`);
      console.log(`   Labels: ${JSON.stringify(sampleContent.labels, null, 2)}`);
    }

    console.log('');
    console.log('🎉 Dataset creation completed successfully!');

  } catch (error) {
    console.error('❌ Dataset creation failed:');
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   Error: ${errorMessage}`);
  } finally {
    try {
      await closeDatabase();
      console.log('🔌 Database connection closed');
    } catch (closeError) {
      console.error('⚠️  Error closing database:', closeError);
    }
  }
}

// Run the dataset creation test
createDatasetFromMetadata().catch(console.error);