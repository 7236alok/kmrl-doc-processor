import { connectToDatabase, getDb, closeDatabase } from '../db/mongo-adapter.js';

async function checkAtlasData() {
  console.log('🔍 Checking Atlas Data from Command Line...');
  console.log('');

  try {
    const db = await connectToDatabase();
    const metadataCollection = db.collection('metadata');

    // 1. Count all documents
    console.log('📊 Collection Statistics:');
    const totalCount = await metadataCollection.countDocuments();
    console.log(`   Total Documents: ${totalCount}`);

    // 2. Count by category
    const safetyCount = await metadataCollection.countDocuments({ 'classification.category': 'Safety' });
    const testingCount = await metadataCollection.countDocuments({ 'classification.category': 'Testing' });
    console.log(`   Safety Documents: ${safetyCount}`);
    console.log(`   Testing Documents: ${testingCount}`);

    // 3. Check upload status
    const uploadedFromLocal = await metadataCollection.countDocuments({ uploadedFromLocal: true });
    const uploadedToDataset = await metadataCollection.countDocuments({ uploadedToDataset: true });
    console.log(`   Uploaded from Local: ${uploadedFromLocal}`);
    console.log(`   Uploaded to Dataset: ${uploadedToDataset}`);
    console.log('');

    // 4. Show all document IDs and basic info
    console.log('📋 All Documents in Atlas:');
    const allDocs = await metadataCollection.find({}, {
      projection: {
        id: 1,
        fileName: 1,
        'classification.category': 1,
        uploadedFromLocal: 1,
        uploadedToDataset: 1,
        'fileInfo.sizeBytes': 1,
        _createdAt: 1
      }
    }).toArray();

    allDocs.forEach((doc, index) => {
      console.log(`   ${index + 1}. ID: ${doc.id}`);
      console.log(`      File: ${doc.fileName}`);
      console.log(`      Category: ${doc.classification?.category || 'N/A'}`);
      console.log(`      Size: ${doc.fileInfo?.sizeBytes || 'N/A'} bytes`);
      console.log(`      From Local: ${doc.uploadedFromLocal ? '✅' : '❌'}`);
      console.log(`      To Dataset: ${doc.uploadedToDataset ? '✅' : '❌'}`);
      console.log(`      Created: ${doc._createdAt?.toISOString() || 'N/A'}`);
      console.log('');
    });

    // 5. Check database info
    console.log('🗄️  Database Information:');
    const stats = await db.stats();
    console.log(`   Database: ${db.databaseName}`);
    console.log(`   Collections: ${stats.collections}`);
    console.log(`   Data Size: ${Math.round(stats.dataSize / 1024)} KB`);
    console.log(`   Storage Size: ${Math.round(stats.storageSize / 1024)} KB`);
    console.log('');

    // 6. Sample document structure
    console.log('📄 Sample Document Structure:');
    const sampleDoc = await metadataCollection.findOne({});
    if (sampleDoc) {
      console.log('   Available Fields:');
      Object.keys(sampleDoc).forEach(key => {
        if (!key.startsWith('_')) {
          console.log(`   - ${key}: ${typeof sampleDoc[key]}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error checking Atlas data:');
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ${errorMessage}`);
  } finally {
    await closeDatabase();
    console.log('🔌 Connection closed');
  }
}

// Run the Atlas check
checkAtlasData().catch(console.error);