// Enhanced audit trail and versioning system
import crypto from 'crypto';
import { readFileSync } from 'fs';

export interface DocumentVersion {
  version: number;
  timestamp: string;
  checksum: string;
  signature?: string; // Cryptographic signature
  changes: DocumentChange[];
  approvalStatus: ApprovalStatus;
  metadata: VersionMetadata;
}

export interface DocumentChange {
  type: 'content' | 'classification' | 'metadata' | 'action-items' | 'entities';
  field: string;
  oldValue: any;
  newValue: any;
  confidence: number;
  source: 'manual' | 'ml' | 'automated';
  timestamp: string;
}

export interface ApprovalStatus {
  status: 'pending' | 'approved' | 'rejected' | 'requires-review';
  approver?: string;
  approvalDate?: string;
  comments?: string;
  complianceChecks: ComplianceCheck[];
}

export interface ComplianceCheck {
  rule: string;
  description: string;
  status: 'pass' | 'fail' | 'warning' | 'not-applicable';
  details?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface VersionMetadata {
  processor: string;
  pipelineVersion: string;
  modelVersions: Record<string, string>;
  processingTime: number;
  qualityScore: number;
  auditTrail: AuditEntry[];
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  user: string;
  details: string;
  systemInfo: {
    version: string;
    environment: string;
    nodeVersion: string;
  };
}

/**
 * Generate comprehensive document version with audit trail
 */
export function createDocumentVersion(
  docId: string,
  content: string,
  previousVersion?: DocumentVersion,
  metadata?: any
): DocumentVersion {
  const timestamp = new Date().toISOString();
  const checksum = generateSecureChecksum(content);
  const version = (previousVersion?.version || 0) + 1;
  
  // Detect changes from previous version
  const changes = previousVersion ? detectChanges(previousVersion, metadata) : [];
  
  // Run compliance checks
  const complianceChecks = runComplianceChecks(content, metadata);
  
  // Determine approval status
  const approvalStatus: ApprovalStatus = {
    status: determineApprovalStatus(changes, complianceChecks),
    complianceChecks
  };
  
  // Create audit entry
  const auditEntry: AuditEntry = {
    timestamp,
    action: `Document version ${version} created`,
    user: process.env.USER || 'system',
    details: `Generated version ${version} with ${changes.length} changes`,
    systemInfo: {
      version: getSystemVersion(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    }
  };
  
  const versionMetadata: VersionMetadata = {
    processor: 'enhanced-metadata-builder',
    pipelineVersion: getPipelineVersion(),
    modelVersions: getModelVersions(),
    processingTime: Date.now(),
    qualityScore: calculateQualityScore(metadata),
    auditTrail: [...(previousVersion?.metadata.auditTrail || []), auditEntry]
  };
  
  return {
    version,
    timestamp,
    checksum,
    signature: generateCryptographicSignature(checksum, timestamp),
    changes,
    approvalStatus,
    metadata: versionMetadata
  };
}

/**
 * Detect changes between document versions
 */
function detectChanges(previousVersion: DocumentVersion, currentMetadata: any): DocumentChange[] {
  const changes: DocumentChange[] = [];
  const timestamp = new Date().toISOString();
  
  // Compare classification
  if (currentMetadata.classification && previousVersion.metadata) {
    const oldClassification = extractFromPreviousMetadata(previousVersion, 'classification');
    if (oldClassification && JSON.stringify(oldClassification) !== JSON.stringify(currentMetadata.classification)) {
      changes.push({
        type: 'classification',
        field: 'categories',
        oldValue: oldClassification,
        newValue: currentMetadata.classification,
        confidence: currentMetadata.classification.confidence || 0.5,
        source: 'ml',
        timestamp
      });
    }
  }
  
  // Compare action items
  if (currentMetadata.actionItems) {
    const oldActionItems = extractFromPreviousMetadata(previousVersion, 'actionItems') || [];
    if (JSON.stringify(oldActionItems) !== JSON.stringify(currentMetadata.actionItems)) {
      changes.push({
        type: 'action-items',
        field: 'actionItems',
        oldValue: oldActionItems,
        newValue: currentMetadata.actionItems,
        confidence: 0.8,
        source: 'ml',
        timestamp
      });
    }
  }
  
  // Compare entities
  if (currentMetadata.ner) {
    const oldEntities = extractFromPreviousMetadata(previousVersion, 'ner') || {};
    if (JSON.stringify(oldEntities) !== JSON.stringify(currentMetadata.ner)) {
      changes.push({
        type: 'entities',
        field: 'entities',
        oldValue: oldEntities,
        newValue: currentMetadata.ner,
        confidence: currentMetadata.ner.confidence || 0.5,
        source: 'ml',
        timestamp
      });
    }
  }
  
  return changes;
}

/**
 * Run compliance checks against KMRL rules
 */
function runComplianceChecks(content: string, metadata: any): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  
  // Safety compliance check
  const safetyCheck = checkSafetyCompliance(content, metadata);
  checks.push(safetyCheck);
  
  // Document completeness check
  const completenessCheck = checkDocumentCompleteness(metadata);
  checks.push(completenessCheck);
  
  // Action item validity check
  const actionItemCheck = checkActionItemValidity(metadata.actionItems || []);
  checks.push(actionItemCheck);
  
  // Asset reference check
  const assetCheck = checkAssetReferences(content, metadata);
  checks.push(assetCheck);
  
  // Date validity check
  const dateCheck = checkDateValidity(metadata.dueDates || []);
  checks.push(dateCheck);
  
  return checks;
}

/**
 * Check safety compliance
 */
function checkSafetyCompliance(content: string, metadata: any): ComplianceCheck {
  const safetyKeywords = ['safety', 'hazard', 'emergency', 'accident', 'risk'];
  const hasSafetyContent = safetyKeywords.some(keyword => 
    content.toLowerCase().includes(keyword)
  );
  
  if (hasSafetyContent) {
    const hasActionItems = metadata.actionItems && metadata.actionItems.length > 0;
    const hasSafetyActions = metadata.actionItems?.some((item: any) => 
      item.category === 'safety' || item.priority === 'critical'
    );
    
    if (!hasActionItems) {
      return {
        rule: 'KMRL-SAF-001',
        description: 'Safety documents must include action items',
        status: 'fail',
        details: 'Safety-related content detected but no action items found',
        severity: 'high'
      };
    } else if (!hasSafetyActions) {
      return {
        rule: 'KMRL-SAF-001',
        description: 'Safety documents must include safety-specific action items',
        status: 'warning',
        details: 'Action items present but none categorized as safety-related',
        severity: 'medium'
      };
    }
  }
  
  return {
    rule: 'KMRL-SAF-001',
    description: 'Safety content compliance',
    status: 'pass',
    severity: 'low'
  };
}

/**
 * Check document completeness
 */
function checkDocumentCompleteness(metadata: any): ComplianceCheck {
  const requiredFields = ['summary', 'classification', 'source'];
  const missingFields = requiredFields.filter(field => !metadata[field]);
  
  if (missingFields.length > 0) {
    return {
      rule: 'KMRL-DOC-001',
      description: 'Document must have complete metadata',
      status: 'fail',
      details: `Missing required fields: ${missingFields.join(', ')}`,
      severity: 'medium'
    };
  }
  
  return {
    rule: 'KMRL-DOC-001',
    description: 'Document completeness check',
    status: 'pass',
    severity: 'low'
  };
}

/**
 * Check action item validity
 */
function checkActionItemValidity(actionItems: any[]): ComplianceCheck {
  if (actionItems.length === 0) {
    return {
      rule: 'KMRL-ACT-001',
      description: 'Action item validity',
      status: 'not-applicable',
      severity: 'low'
    };
  }
  
  const invalidItems = actionItems.filter(item => 
    !item.text || !item.priority || !item.category
  );
  
  if (invalidItems.length > 0) {
    return {
      rule: 'KMRL-ACT-001',
      description: 'Action items must have text, priority, and category',
      status: 'fail',
      details: `${invalidItems.length} action items missing required fields`,
      severity: 'medium'
    };
  }
  
  // Check for critical items without due dates
  const criticalWithoutDates = actionItems.filter(item => 
    item.priority === 'critical' && !item.dueDate
  );
  
  if (criticalWithoutDates.length > 0) {
    return {
      rule: 'KMRL-ACT-001',
      description: 'Critical action items should have due dates',
      status: 'warning',
      details: `${criticalWithoutDates.length} critical items without due dates`,
      severity: 'high'
    };
  }
  
  return {
    rule: 'KMRL-ACT-001',
    description: 'Action item validity check',
    status: 'pass',
    severity: 'low'
  };
}

/**
 * Check asset references
 */
function checkAssetReferences(content: string, metadata: any): ComplianceCheck {
  const assetPattern = /\b(?:TS|ts)[-\s]*\d+\b/g;
  const contentAssets = content.match(assetPattern) || [];
  const metadataAssets = metadata.relatedAssets || [];
  
  if (contentAssets.length > 0 && metadataAssets.length === 0) {
    return {
      rule: 'KMRL-AST-001',
      description: 'Asset references should be captured in metadata',
      status: 'warning',
      details: `Found ${contentAssets.length} asset references in content but none in metadata`,
      severity: 'medium'
    };
  }
  
  return {
    rule: 'KMRL-AST-001',
    description: 'Asset reference tracking',
    status: 'pass',
    severity: 'low'
  };
}

/**
 * Check date validity
 */
function checkDateValidity(dueDates: string[]): ComplianceCheck {
  const now = new Date();
  const pastDates = dueDates.filter(dateStr => {
    const date = new Date(dateStr);
    return date < now;
  });
  
  if (pastDates.length > 0) {
    return {
      rule: 'KMRL-DTE-001',
      description: 'Due dates should not be in the past',
      status: 'warning',
      details: `${pastDates.length} due dates are in the past`,
      severity: 'medium'
    };
  }
  
  return {
    rule: 'KMRL-DTE-001',
    description: 'Date validity check',
    status: 'pass',
    severity: 'low'
  };
}

/**
 * Determine approval status based on changes and compliance
 */
function determineApprovalStatus(
  changes: DocumentChange[], 
  complianceChecks: ComplianceCheck[]
): ApprovalStatus['status'] {
  const hasFailedChecks = complianceChecks.some(check => check.status === 'fail');
  const hasCriticalWarnings = complianceChecks.some(check => 
    check.status === 'warning' && check.severity === 'critical'
  );
  const hasHighConfidenceChanges = changes.some(change => change.confidence > 0.8);
  
  if (hasFailedChecks) {
    return 'rejected';
  } else if (hasCriticalWarnings || hasHighConfidenceChanges) {
    return 'requires-review';
  } else if (changes.length > 0) {
    return 'pending';
  } else {
    return 'approved';
  }
}

/**
 * Generate secure checksum with salt
 */
function generateSecureChecksum(content: string): string {
  const salt = process.env.CHECKSUM_SALT || 'kmrl-default-salt';
  return crypto
    .createHash('sha256')
    .update(content + salt)
    .digest('hex');
}

/**
 * Generate cryptographic signature
 */
function generateCryptographicSignature(checksum: string, timestamp: string): string {
  const secret = process.env.DOCUMENT_SIGNING_KEY || 'kmrl-default-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(checksum + timestamp)
    .digest('hex');
}

/**
 * Verify document signature
 */
export function verifyDocumentSignature(
  checksum: string,
  timestamp: string,
  signature: string
): boolean {
  const expectedSignature = generateCryptographicSignature(checksum, timestamp);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Calculate document quality score
 */
function calculateQualityScore(metadata: any): number {
  let score = 0.5; // Base score
  
  // Boost for completeness
  if (metadata.summary) score += 0.1;
  if (metadata.classification) score += 0.1;
  if (metadata.ner) score += 0.1;
  if (metadata.actionItems && metadata.actionItems.length > 0) score += 0.1;
  
  // Boost for confidence
  if (metadata.confidence?.overall) {
    score += metadata.confidence.overall * 0.2;
  }
  
  // Boost for structured action items
  if (metadata.actionItems?.some((item: any) => item.assignee && item.dueDate)) {
    score += 0.1;
  }
  
  return Math.min(score, 1.0);
}

// Helper functions
function extractFromPreviousMetadata(previousVersion: DocumentVersion, field: string): any {
  // This would normally extract from stored metadata
  // For now, return null to indicate no previous data
  return null;
}

function getSystemVersion(): string {
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    return packageJson.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

function getPipelineVersion(): string {
  return '2.0.0-enhanced';
}

function getModelVersions(): Record<string, string> {
  return {
    'summarization': 'distilbart-cnn-6-6',
    'ner': 'bert-base-multilingual-cased-ner',
    'classification': 'distilbert-base-uncased-finetuned-sst-2-english',
    'embedding': 'all-MiniLM-L6-v2'
  };
}