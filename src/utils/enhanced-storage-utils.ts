// src/utils/enhanced-storage-utils.ts
import fs from "fs-extra";
import path from "path";
import { connectToDatabase, getDb, closeDatabase } from '../db/mongo-adapter.js';

const DOCUMENTS_PATH = path.join(process.cwd(), "storage/documents");
const METADATA_PATH = path.join(process.cwd(), "storage/metadata");

export interface DocumentMetadata {
  id: string;
  fileName: string;
  fileId?: string;
  mimeType?: string;
  source: {
    system: string;
    originalPath: string;
    departments?: string[];
  };
  language: string;
  fileInfo: {
    originalName: string;
    extension: string;
    sizeBytes: number;
    checksum: string;
  };
  summary: string;
  enhancedSummary?: {
    summary: string;
    fullSummary: string;
    chunkSummaries: any[];
    actionItems: string[];
    compressionRatio: number;
    numSentences: number;
    method: string;
    department?: string;
    departments?: string[];
  };
  actionItems: any[];
  classification: {
    category: string;
    confidence: number;
    categories: any[];
  };
  ner: {
    persons: string[];
    dates: string[];
    locations: string[];
    organizations: string[];
  };
  dueDates: string[];
  relatedAssets: string[];
  mlInsights: any;
  domain: any;
  knowledgeLinks: any;
  confidenceScores: any;
  traceabilityInfo: any;
  generatedAt: string;
  version: string;
  processingStats: any;
  // MongoDB specific fields
  modifiedTime?: Date;
  downloadedAt?: Date;
  processed?: boolean;
  storagePath?: string;
  uploadedToDataset?: boolean;
  datasetUploadTime?: Date;
}

/**
 * Enhanced metadata saving that stores to both local storage and MongoDB
 */
export async function saveEnhancedMetadata(
  docId: string, 
  metadata: any, // More flexible type to handle existing Metadata interface
  uploadToDataset: boolean = true
): Promise<void> {
  try {
    // 1. Save to local storage/metadata directory
    await fs.ensureDir(METADATA_PATH);
    const localPath = path.join(METADATA_PATH, `${docId}.json`);
    await fs.writeJSON(localPath, metadata, { spaces: 2 });
    console.log(`✅ Metadata saved locally: ${localPath}`);

    // 2. Save to MongoDB khub database, metadata collection
    try {
      const db = await connectToDatabase();
      const metadataCollection = db.collection('metadata');
      
      // Prepare document for MongoDB with additional fields
      const mongoDoc = {
        ...metadata,
        id: metadata.id || docId,
        fileName: metadata.fileName || metadata.fileInfo?.originalName || `${docId}.txt`,
        modifiedTime: metadata.modifiedTime || new Date(),
        downloadedAt: metadata.downloadedAt || new Date(),
        processed: metadata.processed ?? true,
        storagePath: metadata.storagePath || `${DOCUMENTS_PATH}/${docId}.txt`,
        uploadedToDataset: false,
        datasetUploadTime: null,
        _createdAt: new Date(),
        _updatedAt: new Date()
      };

      // Upsert document (update if exists, insert if new)
      const result = await metadataCollection.replaceOne(
        { id: docId },
        mongoDoc,
        { upsert: true }
      );

      if (result.upsertedId) {
        console.log(`✅ Metadata inserted to MongoDB: ${result.upsertedId}`);
      } else if (result.modifiedCount > 0) {
        console.log(`✅ Metadata updated in MongoDB for document: ${docId}`);
      }

      // 3. Upload JSON to dataset if requested
      if (uploadToDataset) {
        await uploadMetadataToDataset(docId, metadata, metadataCollection);
      }

    } catch (mongoError) {
      console.error(`⚠️ MongoDB save failed for ${docId}:`, mongoError);
      console.log(`✅ Local save succeeded, MongoDB save failed - continuing...`);
    }

  } catch (err) {
    console.error(`Error saving enhanced metadata for ${docId}:`, err);
    throw err;
  }
}

/**
 * Upload metadata JSON to dataset with proper configuration
 */
async function uploadMetadataToDataset(
  docId: string, 
  metadata: any, // More flexible type
  collection: any
): Promise<void> {
  try {
    // Create dataset-ready JSON structure
    const datasetJson = {
      document_id: docId,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        dataset_version: "1.0",
        processing_pipeline: "kmrl-doc-processor",
        upload_timestamp: new Date().toISOString()
      }
    };

    // Save to dataset directory
    const datasetPath = path.join(process.cwd(), "storage/dataset");
    await fs.ensureDir(datasetPath);
    const datasetFile = path.join(datasetPath, `${docId}_dataset.json`);
    await fs.writeJSON(datasetFile, datasetJson, { spaces: 2 });

    console.log(`📊 Dataset JSON created: ${datasetFile}`);

    // Update MongoDB record to mark as uploaded to dataset
    await collection.updateOne(
      { id: docId },
      { 
        $set: { 
          uploadedToDataset: true,
          datasetUploadTime: new Date(),
          datasetFilePath: datasetFile
        }
      }
    );

    console.log(`✅ Dataset upload completed for document: ${docId}`);

  } catch (error) {
    console.error(`❌ Dataset upload failed for ${docId}:`, error);
    throw error;
  }
}

/**
 * Load metadata with fallback from MongoDB to local storage
 */
export async function loadEnhancedMetadata(docId: string): Promise<DocumentMetadata | null> {
  try {
    // Try MongoDB first
    const db = await connectToDatabase();
    const metadataCollection = db.collection('metadata');
    const mongoDoc = await metadataCollection.findOne({ id: docId });
    
    if (mongoDoc) {
      console.log(`📖 Metadata loaded from MongoDB: ${docId}`);
      // Remove MongoDB _id field and return as DocumentMetadata
      const { _id, ...cleanDoc } = mongoDoc;
      return cleanDoc as unknown as DocumentMetadata;
    }

    // Fallback to local storage
    const localPath = path.join(METADATA_PATH, `${docId}.json`);
    if (fs.existsSync(localPath)) {
      const localData = await fs.readJSON(localPath);
      console.log(`📖 Metadata loaded from local storage: ${docId}`);
      return localData as DocumentMetadata;
    }

    return null;

  } catch (error) {
    console.error(`Error loading metadata for ${docId}:`, error);
    
    // Final fallback to local storage only
    try {
      const localPath = path.join(METADATA_PATH, `${docId}.json`);
      if (fs.existsSync(localPath)) {
        return await fs.readJSON(localPath);
      }
    } catch (localError) {
      console.error(`Local storage fallback failed:`, localError);
    }
    
    return null;
  }
}

/**
 * Search documents across both MongoDB and local storage
 */
export async function searchEnhancedDocuments(keyword: string): Promise<DocumentMetadata[]> {
  const results: DocumentMetadata[] = [];
  
  try {
    // Search MongoDB first
    const db = await connectToDatabase();
    const metadataCollection = db.collection('metadata');
    
    const mongoResults = await metadataCollection.find({
      $or: [
        { "summary": { $regex: keyword, $options: "i" } },
        { "classification.category": { $regex: keyword, $options: "i" } },
        { "ner.persons": { $regex: keyword, $options: "i" } },
        { "ner.organizations": { $regex: keyword, $options: "i" } },
        { "fileName": { $regex: keyword, $options: "i" } }
      ]
    }).toArray();

    results.push(...(mongoResults.map(doc => {
      const { _id, ...cleanDoc } = doc;
      return cleanDoc as unknown as DocumentMetadata;
    })));
    console.log(`🔍 Found ${mongoResults.length} results in MongoDB`);

  } catch (mongoError) {
    console.error(`MongoDB search failed, using local fallback:`, mongoError);
    
    // Fallback to local storage search
    try {
      if (fs.existsSync(METADATA_PATH)) {
        const files = fs.readdirSync(METADATA_PATH);
        for (const file of files) {
          const meta = fs.readJSONSync(path.join(METADATA_PATH, file));
          if (JSON.stringify(meta).toLowerCase().includes(keyword.toLowerCase())) {
            results.push(meta);
          }
        }
      }
    } catch (localError) {
      console.error("Local search also failed:", localError);
    }
  }

  return results;
}

/**
 * Get dataset upload statistics
 */
export async function getDatasetStats(): Promise<{
  totalDocuments: number;
  uploadedToDataset: number;
  pendingUpload: number;
  lastUpload?: Date;
}> {
  try {
    const db = await connectToDatabase();
    const metadataCollection = db.collection('metadata');
    
    const totalDocuments = await metadataCollection.countDocuments();
    const uploadedToDataset = await metadataCollection.countDocuments({ uploadedToDataset: true });
    const pendingUpload = totalDocuments - uploadedToDataset;
    
    const lastUploadDoc = await metadataCollection.findOne(
      { uploadedToDataset: true },
      { sort: { datasetUploadTime: -1 } }
    );

    return {
      totalDocuments,
      uploadedToDataset,
      pendingUpload,
      lastUpload: lastUploadDoc?.datasetUploadTime
    };

  } catch (error) {
    console.error("Error getting dataset stats:", error);
    return {
      totalDocuments: 0,
      uploadedToDataset: 0,
      pendingUpload: 0
    };
  }
}

export { DOCUMENTS_PATH, METADATA_PATH };