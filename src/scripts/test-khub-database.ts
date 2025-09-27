import { connectToDatabase, getDb, closeDatabase } from '../db/mongo-adapter.js';
import { ENV } from '../config/env.js';

async function testKhubDatabase() {
  console.log('🔍 Testing Khub Database Configuration...');
  console.log('📊 Configuration:');
  console.log(`   MongoDB URI: ${ENV.MONGO_URI}`);
  console.log('');

  try {
    console.log('🚀 Connecting to MongoDB...');
    const db = await connectToDatabase();
    
    console.log(`✅ Connected successfully!`);
    console.log(`📦 Database: ${db.databaseName}`);
    console.log('');
    
    // Test metadata collection operations
    console.log('🧪 Testing metadata collection...');
    const metadataCollection = db.collection('metadata');
    
    // Test document structure that matches your use case
    const testMetadata = {
      fileId: 'test-doc-001',
      fileName: 'test-document.txt',
      mimeType: 'text/plain',
      modifiedTime: new Date(),
      size: 1024,
      downloadedAt: new Date(),
      processed: false,
      storagePath: '/storage/test-document.txt',
      documentMetadata: {
        summary: 'Test document summary',
        entities: ['Person', 'Location'],
        classification: 'General',
        language: 'English'
      }
    };
    
    // Insert test document
    console.log('✍️  Inserting test metadata...');
    const insertResult = await metadataCollection.insertOne(testMetadata);
    console.log(`✅ Test metadata inserted with ID: ${insertResult.insertedId}`);
    
    // Query the document back
    const foundDoc = await metadataCollection.findOne({ fileId: 'test-doc-001' });
    console.log(`📖 Retrieved document:`, {
      _id: foundDoc?._id,
      fileId: foundDoc?.fileId,
      fileName: foundDoc?.fileName,
      processed: foundDoc?.processed
    });
    
    // Count documents in collection
    const docCount = await metadataCollection.countDocuments();
    console.log(`📊 Total documents in metadata collection: ${docCount}`);
    
    // List all collections
    console.log('');
    console.log('📁 All collections in khub database:');
    const collections = await db.listCollections().toArray();
    collections.forEach(col => console.log(`   - ${col.name}`));
    
    // Clean up test document
    await metadataCollection.deleteOne({ _id: insertResult.insertedId });
    console.log(`🧹 Test document cleaned up`);
    
    console.log('');
    console.log('🎉 Khub database and metadata collection are working perfectly!');
    
  } catch (error) {
    console.error('❌ Database test failed:');
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   Error: ${errorMessage}`);
    
  } finally {
    try {
      await closeDatabase();
      console.log('🔌 Database connection closed');
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      console.error('⚠️  Error closing connection:', errMessage);
    }
  }
}

// Run the test
testKhubDatabase().catch(console.error);