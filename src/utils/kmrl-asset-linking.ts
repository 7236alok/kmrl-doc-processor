// Domain-specific asset linking and knowledge management for KMRL
export interface KMRLAssetDatabase {
  stations: KMRLStation[];
  rollingStock: RollingStock[];
  infrastructure: Infrastructure[];
  equipment: Equipment[];
  complianceRules: ComplianceRule[];
  operationalProcedures: OperationalProcedure[];
  knowledgeGraph: KnowledgeGraph;
}

export interface KMRLStation {
  id: string;
  name: string;
  code: string;
  line: 'Blue' | 'Red' | 'Green' | 'Orange';
  type: 'underground' | 'elevated' | 'at-grade';
  coordinates: { lat: number; lng: number };
  platforms: Platform[];
  facilities: StationFacility[];
  operationalStatus: 'active' | 'under-construction' | 'planned';
  safetyEquipment: SafetyEquipment[];
  maintenanceSchedule: MaintenanceWindow[];
  complianceRequirements: string[];
}

export interface RollingStock {
  id: string;
  type: 'metro-coach' | 'locomotive' | 'maintenance-vehicle';
  manufacturer: string;
  model: string;
  yearOfManufacture: number;
  capacity: number;
  operationalStatus: 'active' | 'maintenance' | 'retired';
  assignedLine: string;
  lastMaintenance: string;
  nextMaintenance: string;
  safetyFeatures: string[];
  technicalSpecs: TechnicalSpec[];
  maintenanceHistory: MaintenanceRecord[];
}

export interface Infrastructure {
  id: string;
  type: 'track' | 'bridge' | 'tunnel' | 'depot' | 'substation' | 'signal';
  location: string;
  description: string;
  installationDate: string;
  manufacturer?: string;
  operationalStatus: 'active' | 'maintenance' | 'planned';
  inspectionSchedule: InspectionSchedule;
  safetyRating: 'A' | 'B' | 'C' | 'D';
  relatedAssets: string[];
}

export interface Equipment {
  id: string;
  name: string;
  type: 'safety' | 'operational' | 'maintenance' | 'communication';
  location: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  installationDate: string;
  warrantyExpiry?: string;
  maintenanceContract?: string;
  operationalParameters: Record<string, any>;
  calibrationSchedule?: CalibrationSchedule;
}

export interface ComplianceRule {
  id: string;
  title: string;
  description: string;
  category: 'safety' | 'operational' | 'environmental' | 'quality' | 'security';
  source: 'KMRL' | 'DMRC' | 'GOI' | 'METRO-RAIL-ACT' | 'IS-STANDARDS';
  version: string;
  effectiveDate: string;
  reviewDate: string;
  applicableAssets: string[];
  requirements: Requirement[];
  penalties: Penalty[];
  checklistItems: ChecklistItem[];
}

export interface OperationalProcedure {
  id: string;
  title: string;
  category: 'emergency' | 'routine' | 'maintenance' | 'safety' | 'security';
  version: string;
  approvalDate: string;
  reviewDate: string;
  applicableRoles: string[];
  steps: ProcedureStep[];
  relatedProcedures: string[];
  safetyPrecautions: string[];
  equipment: string[];
  documentation: string[];
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  metadata: GraphMetadata;
}

export interface KnowledgeNode {
  id: string;
  type: 'asset' | 'procedure' | 'rule' | 'document' | 'person' | 'event';
  label: string;
  properties: Record<string, any>;
  importance: number;
  lastUpdated: string;
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  relationship: 'relates-to' | 'depends-on' | 'used-by' | 'maintained-by' | 'governed-by' | 'located-at';
  strength: number;
  properties: Record<string, any>;
}

// Supporting interfaces
export interface Platform {
  number: number;
  length: number;
  accessibility: boolean;
  screenDoors: boolean;
  emergencyEquipment: string[];
}

export interface StationFacility {
  type: 'elevator' | 'escalator' | 'restroom' | 'parking' | 'commercial';
  status: 'operational' | 'maintenance' | 'out-of-service';
  capacity?: number;
  accessibility: boolean;
}

export interface SafetyEquipment {
  type: 'fire-extinguisher' | 'emergency-alarm' | 'cctv' | 'emergency-exit' | 'aed';
  location: string;
  lastInspection: string;
  nextInspection: string;
  status: 'operational' | 'maintenance' | 'expired';
}

export interface MaintenanceWindow {
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  schedule: string;
  duration: number;
  activities: string[];
  responsible: string;
}

export interface TechnicalSpec {
  parameter: string;
  value: string;
  unit: string;
  tolerance?: string;
}

export interface MaintenanceRecord {
  date: string;
  type: 'routine' | 'corrective' | 'preventive' | 'emergency';
  description: string;
  technician: string;
  parts: string[];
  duration: number;
  cost: number;
  nextMaintenance?: string;
}

export interface InspectionSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  lastInspection: string;
  nextInspection: string;
  inspector: string;
  checklist: string[];
}

export interface CalibrationSchedule {
  frequency: 'monthly' | 'quarterly' | 'annual';
  lastCalibration: string;
  nextCalibration: string;
  calibrator: string;
  certificate?: string;
}

export interface Requirement {
  id: string;
  description: string;
  mandatory: boolean;
  verificationMethod: 'inspection' | 'testing' | 'documentation' | 'observation';
  frequency: string;
}

export interface Penalty {
  severity: 'minor' | 'major' | 'critical';
  description: string;
  monetaryPenalty?: number;
  operationalImpact: string;
}

export interface ChecklistItem {
  id: string;
  description: string;
  verificationMethod: string;
  acceptanceCriteria: string;
  responsible: string;
}

export interface ProcedureStep {
  number: number;
  description: string;
  responsible: string;
  timeLimit?: number;
  safetyNote?: string;
  documentation?: string[];
}

export interface GraphMetadata {
  version: string;
  lastUpdated: string;
  nodeCount: number;
  edgeCount: number;
  dataSource: string[];
}

/**
 * Enhanced asset linking service
 */
export class KMRLAssetLinker {
  private assetDatabase: KMRLAssetDatabase;
  
  constructor(assetDatabase: KMRLAssetDatabase) {
    this.assetDatabase = assetDatabase;
  }
  
  /**
   * Extract and link assets from document content
   */
  extractAndLinkAssets(content: string, metadata: any): {
    linkedAssets: LinkedAsset[];
    complianceLinks: ComplianceLink[];
    procedureLinks: ProcedureLink[];
    knowledgeConnections: KnowledgeConnection[];
  } {
    const linkedAssets = this.extractAssetReferences(content);
    const complianceLinks = this.findComplianceReferences(content, metadata);
    const procedureLinks = this.findProcedureReferences(content, metadata);
    const knowledgeConnections = this.buildKnowledgeConnections(linkedAssets, complianceLinks, procedureLinks);
    
    return {
      linkedAssets,
      complianceLinks,
      procedureLinks,
      knowledgeConnections
    };
  }
  
  /**
   * Extract asset references from content
   */
  private extractAssetReferences(content: string): LinkedAsset[] {
    const linkedAssets: LinkedAsset[] = [];
    
    // Station references
    const stationMatches = this.findStationReferences(content);
    linkedAssets.push(...stationMatches);
    
    // Rolling stock references
    const rollingStockMatches = this.findRollingStockReferences(content);
    linkedAssets.push(...rollingStockMatches);
    
    // Infrastructure references
    const infrastructureMatches = this.findInfrastructureReferences(content);
    linkedAssets.push(...infrastructureMatches);
    
    // Equipment references
    const equipmentMatches = this.findEquipmentReferences(content);
    linkedAssets.push(...equipmentMatches);
    
    return linkedAssets;
  }
  
  /**
   * Find station references in content
   */
  private findStationReferences(content: string): LinkedAsset[] {
    const stations = this.assetDatabase.stations;
    const linkedAssets: LinkedAsset[] = [];
    
    stations.forEach(station => {
      const patterns = [
        new RegExp(`\\b${station.name}\\b`, 'gi'),
        new RegExp(`\\b${station.code}\\b`, 'gi'),
        new RegExp(`station\\s+${station.code}`, 'gi')
      ];
      
      patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          linkedAssets.push({
            assetId: station.id,
            assetType: 'station',
            assetName: station.name,
            matchText: matches[0],
            confidence: this.calculateMatchConfidence(matches[0], station.name),
            context: this.extractContext(content, matches[0]),
            metadata: {
              line: station.line,
              type: station.type,
              operationalStatus: station.operationalStatus
            }
          });
        }
      });
    });
    
    return linkedAssets;
  }
  
  /**
   * Find rolling stock references
   */
  private findRollingStockReferences(content: string): LinkedAsset[] {
    const rollingStock = this.assetDatabase.rollingStock;
    const linkedAssets: LinkedAsset[] = [];
    
    // Generic rolling stock patterns
    const genericPatterns = [
      /\b(?:train|coach|car)\s*(?:no\.?|number)?\s*([A-Z0-9-]+)\b/gi,
      /\b([A-Z]{2,3}\d{3,4})\b/gi, // Asset number pattern
      /\bTS[-\s]*(\d+)\b/gi // TS number pattern
    ];
    
    genericPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const assetNumber = match[1] || match[0];
        const matchingStock = rollingStock.find(stock => 
          stock.id.includes(assetNumber) || 
          assetNumber.includes(stock.id)
        );
        
        if (matchingStock) {
          linkedAssets.push({
            assetId: matchingStock.id,
            assetType: 'rolling-stock',
            assetName: `${matchingStock.type} ${matchingStock.id}`,
            matchText: match[0],
            confidence: 0.8,
            context: this.extractContext(content, match[0]),
            metadata: {
              type: matchingStock.type,
              manufacturer: matchingStock.manufacturer,
              operationalStatus: matchingStock.operationalStatus
            }
          });
        }
      }
    });
    
    return linkedAssets;
  }
  
  /**
   * Find infrastructure references
   */
  private findInfrastructureReferences(content: string): LinkedAsset[] {
    const infrastructure = this.assetDatabase.infrastructure;
    const linkedAssets: LinkedAsset[] = [];
    
    // Infrastructure patterns
    const patterns = [
      /\b(?:track|bridge|tunnel|depot|substation|signal)\s*(?:no\.?|number)?\s*([A-Z0-9-]+)\b/gi,
      /\b(BR\d{3,4}|TN\d{3,4}|DP\d{2,3}|SS\d{2,3})\b/gi // Bridge, Tunnel, Depot, Substation patterns
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const assetRef = match[1] || match[0];
        const matchingInfra = infrastructure.find(infra => 
          infra.id.includes(assetRef) || 
          infra.description.toLowerCase().includes(assetRef.toLowerCase())
        );
        
        if (matchingInfra) {
          linkedAssets.push({
            assetId: matchingInfra.id,
            assetType: 'infrastructure',
            assetName: matchingInfra.description,
            matchText: match[0],
            confidence: 0.7,
            context: this.extractContext(content, match[0]),
            metadata: {
              type: matchingInfra.type,
              location: matchingInfra.location,
              operationalStatus: matchingInfra.operationalStatus
            }
          });
        }
      }
    });
    
    return linkedAssets;
  }
  
  /**
   * Find equipment references
   */
  private findEquipmentReferences(content: string): LinkedAsset[] {
    const equipment = this.assetDatabase.equipment;
    const linkedAssets: LinkedAsset[] = [];
    
    // Equipment type patterns
    const equipmentTypes = ['fire extinguisher', 'emergency alarm', 'cctv', 'elevator', 'escalator'];
    
    equipmentTypes.forEach(type => {
      const pattern = new RegExp(`\\b${type}\\b`, 'gi');
      const matches = content.match(pattern);
      
      if (matches) {
        const matchingEquipment = equipment.filter(eq => 
          eq.type.toLowerCase().includes(type.toLowerCase()) ||
          eq.name.toLowerCase().includes(type.toLowerCase())
        );
        
        matchingEquipment.forEach(eq => {
          linkedAssets.push({
            assetId: eq.id,
            assetType: 'equipment',
            assetName: eq.name,
            matchText: matches[0],
            confidence: 0.6,
            context: this.extractContext(content, matches[0]),
            metadata: {
              type: eq.type,
              location: eq.location,
              manufacturer: eq.manufacturer
            }
          });
        });
      }
    });
    
    return linkedAssets;
  }
  
  /**
   * Find compliance rule references
   */
  private findComplianceReferences(content: string, metadata: any): ComplianceLink[] {
    const complianceRules = this.assetDatabase.complianceRules;
    const links: ComplianceLink[] = [];
    
    complianceRules.forEach(rule => {
      const patterns = [
        new RegExp(`\\b${rule.id}\\b`, 'gi'),
        new RegExp(`\\b${rule.title}\\b`, 'gi')
      ];
      
      // Check for rule-specific keywords
      const ruleKeywords = this.extractRuleKeywords(rule);
      const keywordMatches = ruleKeywords.filter(keyword => 
        content.toLowerCase().includes(keyword.toLowerCase())
      ).length;
      
      if (keywordMatches > 0 || patterns.some(p => p.test(content))) {
        links.push({
          ruleId: rule.id,
          ruleTitle: rule.title,
          category: rule.category,
          source: rule.source,
          relevanceScore: keywordMatches / ruleKeywords.length,
          matchedKeywords: ruleKeywords.filter(keyword => 
            content.toLowerCase().includes(keyword.toLowerCase())
          ),
          applicableRequirements: rule.requirements.filter(req => 
            req.description.toLowerCase().split(' ').some(word => 
              content.toLowerCase().includes(word)
            )
          )
        });
      }
    });
    
    return links.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
  
  /**
   * Find procedure references
   */
  private findProcedureReferences(content: string, metadata: any): ProcedureLink[] {
    const procedures = this.assetDatabase.operationalProcedures;
    const links: ProcedureLink[] = [];
    
    procedures.forEach(procedure => {
      const titleWords = procedure.title.toLowerCase().split(' ');
      const matchingWords = titleWords.filter(word => 
        content.toLowerCase().includes(word) && word.length > 3
      );
      
      if (matchingWords.length > titleWords.length * 0.5) {
        const categoryMatch = content.toLowerCase().includes(procedure.category);
        const relevanceScore = (matchingWords.length / titleWords.length) + (categoryMatch ? 0.2 : 0);
        
        links.push({
          procedureId: procedure.id,
          procedureTitle: procedure.title,
          category: procedure.category,
          version: procedure.version,
          relevanceScore,
          matchedTerms: matchingWords,
          applicableSteps: procedure.steps.filter(step => 
            step.description.toLowerCase().split(' ').some(word => 
              content.toLowerCase().includes(word) && word.length > 3
            )
          )
        });
      }
    });
    
    return links.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
  
  /**
   * Build knowledge graph connections
   */
  private buildKnowledgeConnections(
    assets: LinkedAsset[],
    compliance: ComplianceLink[],
    procedures: ProcedureLink[]
  ): KnowledgeConnection[] {
    const connections: KnowledgeConnection[] = [];
    
    // Asset-to-compliance connections
    assets.forEach(asset => {
      compliance.forEach(comp => {
        if (comp.applicableRequirements.length > 0) {
          connections.push({
            sourceType: 'asset',
            sourceId: asset.assetId,
            targetType: 'compliance',
            targetId: comp.ruleId,
            relationshipType: 'governed-by',
            strength: comp.relevanceScore * asset.confidence,
            context: `Asset ${asset.assetName} is governed by ${comp.ruleTitle}`
          });
        }
      });
    });
    
    // Asset-to-procedure connections
    assets.forEach(asset => {
      procedures.forEach(proc => {
        if (proc.applicableSteps.length > 0) {
          connections.push({
            sourceType: 'asset',
            sourceId: asset.assetId,
            targetType: 'procedure',
            targetId: proc.procedureId,
            relationshipType: 'used-by',
            strength: proc.relevanceScore * asset.confidence,
            context: `Asset ${asset.assetName} is used in ${proc.procedureTitle}`
          });
        }
      });
    });
    
    // Compliance-to-procedure connections
    compliance.forEach(comp => {
      procedures.forEach(proc => {
        const categoryMatch = comp.category === proc.category;
        if (categoryMatch) {
          connections.push({
            sourceType: 'compliance',
            sourceId: comp.ruleId,
            targetType: 'procedure',
            targetId: proc.procedureId,
            relationshipType: 'relates-to',
            strength: 0.8,
            context: `Compliance rule ${comp.ruleTitle} relates to procedure ${proc.procedureTitle}`
          });
        }
      });
    });
    
    return connections.sort((a, b) => b.strength - a.strength);
  }
  
  /**
   * Calculate match confidence
   */
  private calculateMatchConfidence(matchText: string, assetName: string): number {
    const similarity = this.calculateStringSimilarity(matchText.toLowerCase(), assetName.toLowerCase());
    return Math.min(similarity + 0.2, 1.0); // Boost base similarity
  }
  
  /**
   * Calculate string similarity
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [];
      matrix[i]![0] = i;
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0]![j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i]![j] = matrix[i - 1]![j - 1]!;
        } else {
          matrix[i]![j] = Math.min(
            matrix[i - 1]![j - 1]! + 1,
            matrix[i]![j - 1]! + 1,
            matrix[i - 1]![j]! + 1
          );
        }
      }
    }
    
    return matrix[str2.length]![str1.length]!;
  }
  
  /**
   * Extract context around a match
   */
  private extractContext(content: string, matchText: string): string {
    const index = content.indexOf(matchText);
    if (index === -1) return '';
    
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + matchText.length + 50);
    
    return content.substring(start, end).trim();
  }
  
  /**
   * Extract keywords from compliance rule
   */
  private extractRuleKeywords(rule: ComplianceRule): string[] {
    const keywords = new Set<string>();
    
    // Extract from title and description
    const text = `${rule.title} ${rule.description}`.toLowerCase();
    const words = text.split(/\s+/).filter(word => word.length > 3);
    words.forEach(word => keywords.add(word));
    
    // Add category-specific keywords
    keywords.add(rule.category);
    
    // Add requirement keywords
    rule.requirements.forEach(req => {
      const reqWords = req.description.toLowerCase().split(/\s+/).filter(word => word.length > 3);
      reqWords.forEach(word => keywords.add(word));
    });
    
    return Array.from(keywords);
  }
}

// Supporting interfaces for asset linking
export interface LinkedAsset {
  assetId: string;
  assetType: 'station' | 'rolling-stock' | 'infrastructure' | 'equipment';
  assetName: string;
  matchText: string;
  confidence: number;
  context: string;
  metadata: Record<string, any>;
}

export interface ComplianceLink {
  ruleId: string;
  ruleTitle: string;
  category: string;
  source: string;
  relevanceScore: number;
  matchedKeywords: string[];
  applicableRequirements: Requirement[];
}

export interface ProcedureLink {
  procedureId: string;
  procedureTitle: string;
  category: string;
  version: string;
  relevanceScore: number;
  matchedTerms: string[];
  applicableSteps: ProcedureStep[];
}

export interface KnowledgeConnection {
  sourceType: 'asset' | 'compliance' | 'procedure' | 'document';
  sourceId: string;
  targetType: 'asset' | 'compliance' | 'procedure' | 'document';
  targetId: string;
  relationshipType: 'relates-to' | 'depends-on' | 'used-by' | 'governed-by';
  strength: number;
  context: string;
}

/**
 * Create sample KMRL asset database for demonstration
 */
export function createSampleKMRLDatabase(): KMRLAssetDatabase {
  return {
    stations: [
      {
        id: 'STN001',
        name: 'Aluva',
        code: 'ALV',
        line: 'Blue',
        type: 'at-grade',
        coordinates: { lat: 10.1102, lng: 76.3534 },
        platforms: [
          { number: 1, length: 140, accessibility: true, screenDoors: true, emergencyEquipment: ['fire-extinguisher', 'emergency-alarm'] }
        ],
        facilities: [
          { type: 'elevator', status: 'operational', accessibility: true },
          { type: 'parking', status: 'operational', capacity: 200, accessibility: true }
        ],
        operationalStatus: 'active',
        safetyEquipment: [
          { type: 'fire-extinguisher', location: 'Platform 1', lastInspection: '2024-01-15', nextInspection: '2024-04-15', status: 'operational' }
        ],
        maintenanceSchedule: [
          { type: 'daily', schedule: '05:00-06:00', duration: 60, activities: ['cleaning', 'inspection'], responsible: 'Station-ALV-Team' }
        ],
        complianceRequirements: ['KMRL-SAF-001', 'KMRL-OPS-001']
      }
    ],
    rollingStock: [
      {
        id: 'TS001',
        type: 'metro-coach',
        manufacturer: 'Alstom',
        model: 'Metropolis',
        yearOfManufacture: 2017,
        capacity: 975,
        operationalStatus: 'active',
        assignedLine: 'Blue',
        lastMaintenance: '2024-01-10',
        nextMaintenance: '2024-02-10',
        safetyFeatures: ['emergency-brake', 'passenger-alarm', 'fire-detection'],
        technicalSpecs: [
          { parameter: 'max-speed', value: '80', unit: 'kmph', tolerance: '±2' }
        ],
        maintenanceHistory: [
          { date: '2024-01-10', type: 'routine', description: 'Monthly inspection', technician: 'Tech-001', parts: [], duration: 4, cost: 5000 }
        ]
      }
    ],
    infrastructure: [
      {
        id: 'BR001',
        type: 'bridge',
        location: 'Between Aluva and Pulinchodu',
        description: 'Periyar River Bridge',
        installationDate: '2016-08-15',
        manufacturer: 'L&T Construction',
        operationalStatus: 'active',
        inspectionSchedule: {
          frequency: 'monthly',
          lastInspection: '2024-01-20',
          nextInspection: '2024-02-20',
          inspector: 'Bridge-Inspector-01',
          checklist: ['structural-integrity', 'bearing-condition', 'drainage']
        },
        safetyRating: 'A',
        relatedAssets: ['STN001', 'STN002']
      }
    ],
    equipment: [
      {
        id: 'EQ001',
        name: 'Platform Fire Extinguisher - ALV-P1',
        type: 'safety',
        location: 'Aluva Station Platform 1',
        manufacturer: 'Minimax',
        model: 'MX-ABC-6',
        serialNumber: 'MX123456',
        installationDate: '2017-03-15',
        warrantyExpiry: '2022-03-15',
        operationalParameters: { capacity: '6kg', type: 'ABC-Powder' }
      }
    ],
    complianceRules: [
      {
        id: 'KMRL-SAF-001',
        title: 'Platform Safety Equipment Requirements',
        description: 'Mandatory safety equipment placement and maintenance on platforms',
        category: 'safety',
        source: 'KMRL',
        version: '2.1',
        effectiveDate: '2023-01-01',
        reviewDate: '2024-12-31',
        applicableAssets: ['STN001', 'STN002'],
        requirements: [
          {
            id: 'REQ001',
            description: 'Fire extinguishers must be placed every 25 meters on platforms',
            mandatory: true,
            verificationMethod: 'inspection',
            frequency: 'monthly'
          }
        ],
        penalties: [
          { severity: 'major', description: 'Non-compliance with fire safety', monetaryPenalty: 50000, operationalImpact: 'Platform closure' }
        ],
        checklistItems: [
          {
            id: 'CHK001',
            description: 'Verify fire extinguisher placement',
            verificationMethod: 'visual inspection',
            acceptanceCriteria: 'All locations covered within 25m',
            responsible: 'Safety Officer'
          }
        ]
      }
    ],
    operationalProcedures: [
      {
        id: 'PROC001',
        title: 'Emergency Evacuation Procedure',
        category: 'emergency',
        version: '1.3',
        approvalDate: '2023-06-15',
        reviewDate: '2024-06-15',
        applicableRoles: ['Station Controller', 'Safety Officer', 'Security Officer'],
        steps: [
          {
            number: 1,
            description: 'Activate emergency alarm system',
            responsible: 'Station Controller',
            timeLimit: 30,
            safetyNote: 'Ensure all areas are alerted simultaneously'
          }
        ],
        relatedProcedures: ['PROC002', 'PROC003'],
        safetyPrecautions: ['Maintain calm', 'Follow designated evacuation routes'],
        equipment: ['emergency-alarm', 'public-address-system'],
        documentation: ['evacuation-log', 'incident-report']
      }
    ],
    knowledgeGraph: {
      nodes: [
        {
          id: 'STN001',
          type: 'asset',
          label: 'Aluva Station',
          properties: { type: 'station', line: 'Blue' },
          importance: 0.9,
          lastUpdated: '2024-01-20'
        }
      ],
      edges: [
        {
          source: 'STN001',
          target: 'KMRL-SAF-001',
          relationship: 'governed-by',
          strength: 1.0,
          properties: { mandatory: true }
        }
      ],
      metadata: {
        version: '1.0',
        lastUpdated: '2024-01-20',
        nodeCount: 1,
        edgeCount: 1,
        dataSource: ['KMRL-Database', 'Compliance-Manual']
      }
    }
  };
}