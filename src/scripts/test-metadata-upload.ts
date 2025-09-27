import { connectToDatabase, getDb, closeDatabase } from '../db/mongo-adapter.js';
import fs from 'fs-extra';
import path from 'path';

async function uploadMetadataFilesToMongoDB() {
  console.log('📤 Testing Metadata Upload from storage/metadata/ to MongoDB...');
  console.log('');

  const METADATA_PATH = path.join(process.cwd(), "storage/metadata");
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB (khub database)...');
    const db = await connectToDatabase();
    const metadataCollection = db.collection('metadata');
    console.log('✅ Connected successfully');
    console.log('');

    // Read all JSON files from storage/metadata/
    console.log('📁 Reading metadata files from storage/metadata/...');
    
    if (!await fs.pathExists(METADATA_PATH)) {
      console.log('❌ Metadata directory not found:', METADATA_PATH);
      return;
    }

    const files = await fs.readdir(METADATA_PATH);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    console.log(`📊 Found ${jsonFiles.length} JSON metadata files:`);
    jsonFiles.forEach(file => console.log(`   - ${file}`));
    console.log('');

    let uploadedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each metadata file
    for (const fileName of jsonFiles) {
      const filePath = path.join(METADATA_PATH, fileName);
      const docId = path.basename(fileName, '.json');
      
      try {
        console.log(`📤 Processing: ${fileName}`);
        
        // Read the JSON file
        const metadata = await fs.readJSON(filePath);
        
        // Print metadata summary
        console.log(`   📋 Document ID: ${metadata.id || docId}`);
        console.log(`   📄 File Name: ${metadata.fileInfo?.originalName || metadata.fileName || 'Unknown'}`);
        console.log(`   🏷️  Category: ${metadata.classification?.category || 'Unclassified'}`);
        console.log(`   🔍 Summary: ${metadata.summary ? metadata.summary.substring(0, 80) + '...' : 'No summary'}`);
        console.log(`   📅 Generated: ${metadata.generatedAt || 'Unknown'}`);
        
        // Check if document already exists in MongoDB
        const existingDoc = await metadataCollection.findOne({ 
          id: metadata.id || docId 
        });

        if (existingDoc) {
          console.log(`   ⚠️  Document already exists in MongoDB - updating...`);
        } else {
          console.log(`   🆕 New document - inserting...`);
        }

        // Prepare document for MongoDB upload
        const mongoDoc = {
          ...metadata,
          id: metadata.id || docId,
          fileName: metadata.fileName || metadata.fileInfo?.originalName || `${docId}.txt`,
          uploadedFromLocal: true,
          localFilePath: filePath,
          uploadedToMongoDB: new Date(),
          _createdAt: existingDoc?._createdAt || new Date(),
          _updatedAt: new Date()
        };

        // Upload to MongoDB (upsert)
        const result = await metadataCollection.replaceOne(
          { id: mongoDoc.id },
          mongoDoc,
          { upsert: true }
        );

        if (result.upsertedId) {
          console.log(`   ✅ Inserted with ID: ${result.upsertedId}`);
          uploadedCount++;
        } else if (result.modifiedCount > 0) {
          console.log(`   ✅ Updated existing document`);
          uploadedCount++;
        } else {
          console.log(`   ⚠️  No changes made (document identical)`);
          skippedCount++;
        }

      } catch (fileError) {
        const errorMessage = fileError instanceof Error ? fileError.message : String(fileError);
        console.error(`   ❌ Error processing ${fileName}:`, errorMessage);
        errorCount++;
      }

      console.log(''); // Add spacing between files
    }

    // Print final statistics
    console.log('📊 Upload Results Summary:');
    console.log(`   ✅ Successfully uploaded/updated: ${uploadedCount}`);
    console.log(`   ⚠️  Skipped (no changes): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📁 Total files processed: ${jsonFiles.length}`);
    console.log('');

    // Verify uploads by querying MongoDB
    console.log('🔍 Verifying uploads in MongoDB...');
    const totalDocsInMongo = await metadataCollection.countDocuments();
    const uploadedFromLocal = await metadataCollection.countDocuments({ 
      uploadedFromLocal: true 
    });
    
    console.log(`   📊 Total documents in MongoDB: ${totalDocsInMongo}`);
    console.log(`   📤 Documents uploaded from local: ${uploadedFromLocal}`);
    console.log('');

    // Show sample documents in MongoDB
    console.log('📋 Sample documents in MongoDB:');
    const sampleDocs = await metadataCollection.find({})
      .limit(5)
      .project({ 
        id: 1, 
        fileName: 1, 
        'classification.category': 1,
        uploadedFromLocal: 1,
        _createdAt: 1 
      })
      .toArray();

    sampleDocs.forEach((doc, index) => {
      console.log(`   ${index + 1}. ID: ${doc.id}`);
      console.log(`      File: ${doc.fileName}`);
      console.log(`      Category: ${doc.classification?.category || 'N/A'}`);
      console.log(`      From Local: ${doc.uploadedFromLocal ? '✅' : '❌'}`);
      console.log(`      Created: ${doc._createdAt?.toISOString().substring(0, 19) || 'N/A'}`);
      console.log('');
    });

    console.log('🎉 Metadata upload test completed successfully!');

  } catch (error) {
    console.error('❌ Upload test failed:');
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

// Run the upload test
uploadMetadataFilesToMongoDB().catch(console.error);