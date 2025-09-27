import { connectToDatabase, getDb, closeDatabase } from '../db/mongo-adapter.js';
import { ENV } from '../config/env.js';

async function testMongoConnection() {
  console.log('🔍 Testing MongoDB Connection...');
  console.log('📊 Configuration:');
  console.log(`   MongoDB URI: ${ENV.MONGO_URI}`);
  console.log('');

  try {
    console.log('🚀 Attempting to connect to MongoDB...');
    const startTime = Date.now();
    
    // Connect to database
    const db = await connectToDatabase();
    const connectTime = Date.now() - startTime;
    
    console.log(`✅ Connected successfully in ${connectTime}ms`);
    console.log(`📦 Database: ${db.databaseName}`);
    
    // Test basic operations
    console.log('');
    console.log('🧪 Testing database operations...');
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`📁 Collections found: ${collections.length}`);
    collections.forEach(col => console.log(`   - ${col.name}`));
    
    // Test ping
    const pingResult = await db.admin().ping();
    console.log(`🏓 Ping result:`, pingResult);
    
    // Get server status
    try {
      const serverStatus = await db.admin().serverStatus();
      console.log(`🖥️  Server version: ${serverStatus.version}`);
      console.log(`⚡ Uptime: ${Math.floor(serverStatus.uptime / 3600)}h ${Math.floor((serverStatus.uptime % 3600) / 60)}m`);
    } catch (err) {
      console.log('ℹ️  Server status not available (normal for some setups)');
    }
    
    // Test write operation
    console.log('');
    console.log('✍️  Testing write operation...');
    const testCollection = db.collection('connection-test');
    const testDoc = {
      timestamp: new Date(),
      test: 'MongoDB connection test',
      status: 'success'
    };
    
    const insertResult = await testCollection.insertOne(testDoc);
    console.log(`✅ Test document inserted with ID: ${insertResult.insertedId}`);
    
    // Test read operation
    const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId });
    console.log(`📖 Test document retrieved:`, foundDoc);
    
    // Clean up test document
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log(`🧹 Test document cleaned up`);
    
    console.log('');
    console.log('🎉 MongoDB connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   Error: ${errorMessage}`);
    
    if (errorMessage.includes('ECONNREFUSED')) {
      console.error('');
      console.error('🔧 Troubleshooting tips:');
      console.error('   1. Make sure MongoDB is running:');
      console.error('      - Windows: Check if MongoDB service is started');
      console.error('      - macOS/Linux: Run `brew services start mongodb` or `sudo systemctl start mongod`');
      console.error('   2. Check if MongoDB is listening on the correct port (default: 27017)');
      console.error('   3. Verify the connection string in .env file');
    }
    
    if (errorMessage.includes('Authentication')) {
      console.error('');
      console.error('🔐 Authentication issue:');
      console.error('   Update MONGO_URI in .env with credentials:');
      console.error('   MONGO_URI=mongodb://username:password@localhost:27017/kmrl-doc-processor');
    }
    
  } finally {
    // Always close the connection
    try {
      await closeDatabase();
      console.log('🔌 Database connection closed');
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      console.error('⚠️  Error closing connection:', errMessage);
    }
  }
}

// Self-executing async function
testMongoConnection().catch(console.error);