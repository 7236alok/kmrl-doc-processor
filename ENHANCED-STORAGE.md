# Enhanced Storage Configuration Guide

## Overview
The KMRL Document Processor now supports dual storage with dataset upload functionality:
- **Local Storage**: JSON files in `storage/metadata/`
- **MongoDB**: Documents in `khub.metadata` collection
- **Dataset Upload**: Formatted JSON files in `storage/dataset/`

## Configuration

### Database Configuration
```env
MONGO_URI="mongodb+srv://og_strike:og_strike@cluster0.alvhotb.mongodb.net/khub?retryWrites=true&w=majority&appName=Cluster0"
```

### Storage Structure
```
storage/
├── metadata/           # Local JSON metadata files
├── dataset/           # Dataset-ready JSON files  
└── documents/
    ├── processed/     # Processed documents
    └── not-processed/ # Input documents
```

## Features

### 1. Enhanced Metadata Storage
- **Dual Storage**: Saves to both local files and MongoDB
- **Automatic Backup**: Falls back to local storage if MongoDB fails
- **Rich Metadata**: Includes processing pipeline info, confidence scores, traceability

### 2. Dataset Upload
- **Structured Format**: Creates dataset-ready JSON files
- **Timestamped**: Includes processing and upload timestamps
- **Versioned**: Dataset version tracking for ML pipelines

### 3. MongoDB Integration
- **Database**: `khub`
- **Collection**: `metadata`
- **Search**: Full-text search across summary, classification, entities
- **Statistics**: Track upload progress and processing status

## Usage

### Saving Metadata
```typescript
import { saveEnhancedMetadata } from './utils/enhanced-storage-utils.js';

// Save with dataset upload (default)
await saveEnhancedMetadata(docId, metadata, true);

// Save without dataset upload
await saveEnhancedMetadata(docId, metadata, false);
```

### Loading Metadata
```typescript
import { loadEnhancedMetadata } from './utils/enhanced-storage-utils.js';

// Tries MongoDB first, falls back to local storage
const metadata = await loadEnhancedMetadata(docId);
```

### Searching Documents
```typescript
import { searchEnhancedDocuments } from './utils/enhanced-storage-utils.js';

// Search across MongoDB and local storage
const results = await searchEnhancedDocuments("engineering");
```

### Getting Statistics
```typescript
import { getDatasetStats } from './utils/enhanced-storage-utils.js';

const stats = await getDatasetStats();
// Returns: totalDocuments, uploadedToDataset, pendingUpload, lastUpload
```

## Dataset JSON Format

Each dataset file (`{docId}_dataset.json`) contains:
```json
{
  "document_id": "doc-001",
  "timestamp": "2025-09-27T16:17:55.676Z",
  "metadata": {
    "id": "doc-001",
    "fileName": "document.txt",
    "source": {
      "system": "Manual Upload",
      "originalPath": "document.txt",
      "departments": ["Engineering"]
    },
    "language": "English",
    "fileInfo": {
      "originalName": "document.txt",
      "extension": "txt",
      "sizeBytes": 1024,
      "checksum": "abc123"
    },
    "summary": "Document summary",
    "classification": {
      "category": "Engineering",
      "confidence": 0.95
    },
    "ner": {
      "persons": ["John Doe"],
      "dates": ["2025-09-27"],
      "locations": ["Office"],
      "organizations": ["KMRL"]
    },
    "dataset_version": "1.0",
    "processing_pipeline": "kmrl-doc-processor",
    "upload_timestamp": "2025-09-27T16:17:55.676Z"
  }
}
```

## MongoDB Document Structure

MongoDB documents include additional fields:
- `modifiedTime`: When source document was last modified
- `downloadedAt`: When document was downloaded/processed
- `processed`: Boolean flag for processing status
- `storagePath`: Local file path
- `uploadedToDataset`: Boolean flag for dataset upload status
- `datasetUploadTime`: When uploaded to dataset
- `_createdAt`, `_updatedAt`: MongoDB timestamps

## Testing

Run the enhanced storage test:
```bash
npm run build
node ./dist/src/scripts/test-enhanced-storage.js
```

## Benefits

1. **Reliability**: Dual storage ensures data preservation
2. **Searchability**: MongoDB enables complex queries
3. **ML Ready**: Dataset format ready for machine learning pipelines
4. **Auditable**: Complete traceability and processing history
5. **Scalable**: MongoDB handles large document collections efficiently

## Migration

Existing local metadata files are automatically detected and can be loaded as fallback. The system seamlessly handles both old and new formats.