// src/batchProcessor.ts
import './bootstrap/xenova-env.js';
import path from "path";
import fs from "fs/promises";
import fssync from "fs";
import { readDocument } from "./utils/file-utils.js";
import { processDocument } from "./processDocument.js";
import logger from "./config/logger.js";
import { uploadFileToFolder, getDriveClient } from './utils/drive-client.js';

const NOT_PROCESSED_DIR = path.resolve(process.cwd(), "storage", "documents", "not-processed");
const PROCESSED_DIR = path.resolve(process.cwd(), "storage", "documents", "processed");

/**
 * Get all files from the not-processed directory
 */
async function getUnprocessedFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(NOT_PROCESSED_DIR);
    return files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return [
        '.txt',
        '.pdf', '.docx', '.doc',
        '.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff'
      ].includes(ext);
    });
  } catch (error) {
    logger.warn(`Could not read not-processed directory: ${(error as Error).message}`);
    return [];
  }
}

/**
 * Move file from not-processed to processed directory
 */
async function moveToProcessed(filename: string): Promise<void> {
  const sourcePath = path.join(NOT_PROCESSED_DIR, filename);
  const destPath = path.join(PROCESSED_DIR, filename);
  
  try {
    await fs.rename(sourcePath, destPath);
    logger.info(`Moved ${filename} to processed folder`);
  } catch (error) {
    logger.error(`Failed to move ${filename}: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Process a single file
 */
async function processSingleFile(filename: string): Promise<void> {
  const filePath = path.join(NOT_PROCESSED_DIR, filename);
  const fileId = path.basename(filename, path.extname(filename));
  
  logger.info(`=== Processing ${filename} ===`);
  
  try {
    // Check if file exists
    if (!fssync.existsSync(filePath)) {
      logger.warn(`File ${filename} not found, skipping`);
      return;
    }
    
    // Process the document using existing pipeline
    await processDocument(filePath, fileId);
    
    // Move to processed folder after successful processing
    await moveToProcessed(filename);

    // Attempt to upload processed file back to Drive if configured
    try {
      const client = await getDriveClient();
      if (client && client.config && client.config.processedFolderId) {
        const processedPath = path.join(PROCESSED_DIR, filename);
        logger.info(`Uploading ${filename} to Drive folder ${client.config.processedFolderId}`);
        const res = await uploadFileToFolder(processedPath, client.config.processedFolderId, filename);
        logger.info(`Uploaded to Drive: ${res.id} ${res.name}`);
      }
    } catch (uploadErr) {
      logger.warn(`Drive upload skipped/failed: ${(uploadErr as Error).message}`);
    }
    
    logger.info(`=== Successfully processed ${filename} ===`);
    
  } catch (error) {
    logger.error(`Error processing ${filename}: ${(error as Error).message}`);
    // Don't move failed files - leave them for retry
    throw error;
  }
}

/**
 * Main batch processing function
 */
export async function runBatchProcessor(): Promise<void> {
  logger.info("=== Starting Batch Document Processor ===");
  
  // Ensure directories exist
  try {
    await fs.mkdir(NOT_PROCESSED_DIR, { recursive: true });
    await fs.mkdir(PROCESSED_DIR, { recursive: true });
  } catch (error) {
    logger.error(`Failed to create directories: ${(error as Error).message}`);
    return;
  }
  
  const files = await getUnprocessedFiles();
  
  if (files.length === 0) {
    logger.info("No files found in not-processed directory");
    return;
  }
  
  logger.info(`Found ${files.length} file(s) to process: ${files.join(', ')}`);
  
  let processedCount = 0;
  let failedCount = 0;
  
  // Process files one by one
  for (const file of files) {
    try {
      await processSingleFile(file);
      processedCount++;
      
      // Add a small delay between files to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      logger.error(`Failed to process ${file}: ${(error as Error).message}`);
      failedCount++;
      // Continue with next file
    }
  }
  
  logger.info(`=== Batch Processing Complete ===`);
  logger.info(`Successfully processed: ${processedCount} files`);
  logger.info(`Failed: ${failedCount} files`);
  
  if (failedCount > 0) {
    logger.info(`Failed files remain in not-processed directory for retry`);
  }
}

// If this file is run directly, start batch processing
if (import.meta.url === `file://${process.argv[1]}`) {
  runBatchProcessor().catch(error => {
    logger.error(`Batch processor failed: ${error.message}`);
    process.exit(1);
  });
}
