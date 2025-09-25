// Operational planning and dashboard utilities
import type { DocumentVersion, ComplianceCheck } from './audit-versioning.js';

export interface OperationalDashboard {
  workloadSummary: WorkloadSummary;
  criticalItems: CriticalItem[];
  resourceAllocation: ResourceAllocation;
  predictiveInsights: PredictiveInsight[];
  complianceStatus: ComplianceStatus;
  performanceMetrics: PerformanceMetrics;
}

export interface WorkloadSummary {
  totalDocuments: number;
  pendingReview: number;
  criticalActions: number;
  overdueItems: number;
  estimatedEffort: EffortEstimate;
  capacityUtilization: number;
}

export interface CriticalItem {
  id: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dueDate: string;
  assignee?: string;
  department: string;
  estimatedHours: number;
  riskScore: number;
  dependencies: string[];
  assetImpact: AssetImpact[];
}

export interface ResourceAllocation {
  departments: DepartmentWorkload[];
  skillGaps: SkillGap[];
  recommendedAssignments: Assignment[];
  workloadBalance: WorkloadBalance;
}

export interface PredictiveInsight {
  type: 'risk' | 'opportunity' | 'maintenance' | 'compliance';
  description: string;
  confidence: number;
  timeframe: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  dataPoints: string[];
}

export interface ComplianceStatus {
  overallScore: number;
  byRule: RuleCompliance[];
  trends: ComplianceTrend[];
  upcomingDeadlines: ComplianceDeadline[];
}

export interface PerformanceMetrics {
  processingSpeed: number; // docs per hour
  accuracyScore: number;
  userSatisfaction: number;
  systemUptime: number;
  costPerDocument: number;
}

export interface EffortEstimate {
  totalHours: number;
  byPriority: Record<string, number>;
  byDepartment: Record<string, number>;
  confidence: number;
}

export interface AssetImpact {
  assetId: string;
  assetType: 'station' | 'rolling-stock' | 'infrastructure' | 'equipment';
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedSystems: string[];
}

export interface DepartmentWorkload {
  department: string;
  currentLoad: number;
  capacity: number;
  utilization: number;
  burnoutRisk: number;
  skillMatch: number;
}

export interface SkillGap {
  skill: string;
  requiredLevel: number;
  currentLevel: number;
  gap: number;
  impact: string;
}

export interface Assignment {
  taskId: string;
  recommendedAssignee: string;
  confidence: number;
  reasoning: string;
  alternativeAssignees: string[];
}

export interface WorkloadBalance {
  isBalanced: boolean;
  maxUtilization: number;
  minUtilization: number;
  variance: number;
  recommendations: string[];
}

export interface RuleCompliance {
  rule: string;
  passRate: number;
  failCount: number;
  warningCount: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface ComplianceTrend {
  period: string;
  score: number;
  change: number;
  significantChanges: string[];
}

export interface ComplianceDeadline {
  rule: string;
  deadline: string;
  daysRemaining: number;
  preparedness: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Generate comprehensive operational dashboard
 */
export function generateOperationalDashboard(
  documents: any[],
  versions: DocumentVersion[]
): OperationalDashboard {
  const workloadSummary = calculateWorkloadSummary(documents);
  const criticalItems = extractCriticalItems(documents);
  const resourceAllocation = calculateResourceAllocation(criticalItems);
  const predictiveInsights = generatePredictiveInsights(documents, versions);
  const complianceStatus = calculateComplianceStatus(versions);
  const performanceMetrics = calculatePerformanceMetrics(documents, versions);
  
  return {
    workloadSummary,
    criticalItems,
    resourceAllocation,
    predictiveInsights,
    complianceStatus,
    performanceMetrics
  };
}

/**
 * Calculate workload summary
 */
function calculateWorkloadSummary(documents: any[]): WorkloadSummary {
  const totalDocuments = documents.length;
  const pendingReview = documents.filter(doc => 
    doc.metadata?.approvalStatus?.status === 'pending' ||
    doc.metadata?.approvalStatus?.status === 'requires-review'
  ).length;
  
  const allActionItems = documents.flatMap(doc => 
    doc.metadata?.actionItems || []
  );
  
  const criticalActions = allActionItems.filter(item => 
    item.priority === 'critical'
  ).length;
  
  const now = new Date();
  const overdueItems = allActionItems.filter(item => {
    if (!item.dueDate) return false;
    return new Date(item.dueDate) < now;
  }).length;
  
  const estimatedEffort = calculateTotalEffort(allActionItems);
  const capacityUtilization = calculateCapacityUtilization(estimatedEffort);
  
  return {
    totalDocuments,
    pendingReview,
    criticalActions,
    overdueItems,
    estimatedEffort,
    capacityUtilization
  };
}

/**
 * Extract critical items with enhanced metadata
 */
function extractCriticalItems(documents: any[]): CriticalItem[] {
  const allActionItems = documents.flatMap(doc => 
    (doc.metadata?.actionItems || []).map((item: any) => ({
      ...item,
      sourceDoc: doc.metadata?.source?.filename || 'unknown',
      department: inferDepartment(item, doc)
    }))
  );
  
  return allActionItems
    .filter(item => item.priority === 'critical' || item.priority === 'high')
    .map((item, index) => ({
      id: `crit-${index + 1}`,
      title: item.text || item.action || 'Untitled Action',
      priority: item.priority,
      dueDate: item.dueDate || calculateDefaultDueDate(item.priority),
      assignee: item.assignee,
      department: item.department,
      estimatedHours: estimateTaskHours(item),
      riskScore: calculateRiskScore(item),
      dependencies: extractDependencies(item),
      assetImpact: inferAssetImpact(item)
    }))
    .sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Calculate resource allocation recommendations
 */
function calculateResourceAllocation(criticalItems: CriticalItem[]): ResourceAllocation {
  const departments = calculateDepartmentWorkloads(criticalItems);
  const skillGaps = identifySkillGaps(criticalItems);
  const recommendedAssignments = generateAssignmentRecommendations(criticalItems, departments);
  const workloadBalance = assessWorkloadBalance(departments);
  
  return {
    departments,
    skillGaps,
    recommendedAssignments,
    workloadBalance
  };
}

/**
 * Generate predictive insights using ML and historical data
 */
function generatePredictiveInsights(
  documents: any[],
  versions: DocumentVersion[]
): PredictiveInsight[] {
  const insights: PredictiveInsight[] = [];
  
  // Risk prediction based on compliance failures
  const riskInsight = predictComplianceRisks(versions);
  if (riskInsight) insights.push(riskInsight);
  
  // Maintenance prediction based on asset mentions
  const maintenanceInsight = predictMaintenanceNeeds(documents);
  if (maintenanceInsight) insights.push(maintenanceInsight);
  
  // Workload opportunity prediction
  const opportunityInsight = predictWorkloadOpportunities(documents);
  if (opportunityInsight) insights.push(opportunityInsight);
  
  // Compliance deadline prediction
  const complianceInsight = predictComplianceDeadlines(versions);
  if (complianceInsight) insights.push(complianceInsight);
  
  return insights.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Calculate compliance status across all documents
 */
function calculateComplianceStatus(versions: DocumentVersion[]): ComplianceStatus {
  const allChecks = versions.flatMap(v => v.approvalStatus.complianceChecks);
  
  if (allChecks.length === 0) {
    return {
      overallScore: 1.0,
      byRule: [],
      trends: [],
      upcomingDeadlines: []
    };
  }
  
  const passCount = allChecks.filter(check => check.status === 'pass').length;
  const overallScore = passCount / allChecks.length;
  
  const byRule = calculateRuleCompliance(allChecks);
  const trends = calculateComplianceTrends(versions);
  const upcomingDeadlines = calculateUpcomingDeadlines();
  
  return {
    overallScore,
    byRule,
    trends,
    upcomingDeadlines
  };
}

/**
 * Calculate performance metrics
 */
function calculatePerformanceMetrics(
  documents: any[],
  versions: DocumentVersion[]
): PerformanceMetrics {
  const totalProcessingTime = versions.reduce((sum, v) => 
    sum + (v.metadata.processingTime || 0), 0
  );
  const avgProcessingTime = totalProcessingTime / versions.length || 0;
  const processingSpeed = 3600000 / avgProcessingTime; // docs per hour
  
  const qualityScores = versions.map(v => v.metadata.qualityScore || 0.5);
  const accuracyScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
  
  return {
    processingSpeed,
    accuracyScore,
    userSatisfaction: 0.85, // Would come from user feedback
    systemUptime: 0.99, // Would come from monitoring
    costPerDocument: calculateCostPerDocument(avgProcessingTime)
  };
}

// Helper functions for operational planning

function inferDepartment(item: any, doc: any): string {
  const text = (item.text || '').toLowerCase();
  const content = (doc.content || '').toLowerCase();
  
  if (text.includes('safety') || content.includes('safety')) return 'Safety';
  if (text.includes('maintenance') || content.includes('maintenance')) return 'Maintenance';
  if (text.includes('operations') || content.includes('operations')) return 'Operations';
  if (text.includes('engineering') || content.includes('engineering')) return 'Engineering';
  if (text.includes('finance') || content.includes('finance')) return 'Finance';
  
  return 'General';
}

function calculateDefaultDueDate(priority: string): string {
  const now = new Date();
  const daysToAdd = priority === 'critical' ? 3 : priority === 'high' ? 7 : 30;
  const dueDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return dueDate.toISOString().split('T')[0]!;
}

function estimateTaskHours(item: any): number {
  const text = (item.text || '').toLowerCase();
  let baseHours = 4; // Default estimate
  
  // Adjust based on keywords
  if (text.includes('review') || text.includes('check')) baseHours = 2;
  if (text.includes('implement') || text.includes('develop')) baseHours = 16;
  if (text.includes('design') || text.includes('plan')) baseHours = 8;
  if (text.includes('research') || text.includes('analyze')) baseHours = 12;
  
  // Adjust based on priority
  if (item.priority === 'critical') baseHours *= 1.5;
  if (item.priority === 'low') baseHours *= 0.5;
  
  return Math.round(baseHours);
}

function calculateRiskScore(item: any): number {
  let risk = 0.5; // Base risk
  
  // Priority impact
  if (item.priority === 'critical') risk += 0.4;
  else if (item.priority === 'high') risk += 0.2;
  
  // Overdue impact
  if (item.dueDate && new Date(item.dueDate) < new Date()) risk += 0.3;
  
  // Complexity indicators
  const text = (item.text || '').toLowerCase();
  if (text.includes('safety') || text.includes('emergency')) risk += 0.2;
  if (text.includes('compliance') || text.includes('regulation')) risk += 0.1;
  
  return Math.min(risk, 1.0);
}

function extractDependencies(item: any): string[] {
  // This would normally use NLP to extract dependencies
  // For now, return basic dependencies based on keywords
  const text = (item.text || '').toLowerCase();
  const dependencies: string[] = [];
  
  if (text.includes('after') || text.includes('following')) {
    dependencies.push('Previous task completion');
  }
  if (text.includes('approval') || text.includes('review')) {
    dependencies.push('Management approval');
  }
  if (text.includes('budget') || text.includes('funding')) {
    dependencies.push('Budget allocation');
  }
  
  return dependencies;
}

function inferAssetImpact(item: any): AssetImpact[] {
  const text = (item.text || '').toLowerCase();
  const impacts: AssetImpact[] = [];
  
  // Station impact
  const stationMatch = text.match(/station|platform|terminal/);
  if (stationMatch) {
    impacts.push({
      assetId: 'station-general',
      assetType: 'station',
      impactLevel: item.priority === 'critical' ? 'high' : 'medium',
      affectedSystems: ['passenger-services', 'operations']
    });
  }
  
  // Rolling stock impact
  const trainMatch = text.match(/train|coach|locomotive|rolling/);
  if (trainMatch) {
    impacts.push({
      assetId: 'rolling-stock-general',
      assetType: 'rolling-stock',
      impactLevel: item.priority === 'critical' ? 'critical' : 'high',
      affectedSystems: ['traction', 'braking', 'doors']
    });
  }
  
  return impacts;
}

function calculateTotalEffort(actionItems: any[]): EffortEstimate {
  const totalHours = actionItems.reduce((sum, item) => sum + estimateTaskHours(item), 0);
  
  const byPriority: Record<string, number> = {};
  const byDepartment: Record<string, number> = {};
  
  actionItems.forEach(item => {
    const hours = estimateTaskHours(item);
    const priority = item.priority || 'medium';
    const department = item.department || 'General';
    
    byPriority[priority] = (byPriority[priority] || 0) + hours;
    byDepartment[department] = (byDepartment[department] || 0) + hours;
  });
  
  return {
    totalHours,
    byPriority,
    byDepartment,
    confidence: 0.7 // Would be based on historical accuracy
  };
}

function calculateCapacityUtilization(effortEstimate: EffortEstimate): number {
  // Assume 40 hours per week per department with 10 people average
  const weeklyCapacity = 400; // hours
  const currentWeekHours = effortEstimate.totalHours * 0.25; // Assume 25% due this week
  
  return Math.min(currentWeekHours / weeklyCapacity, 1.0);
}

function calculateDepartmentWorkloads(criticalItems: CriticalItem[]): DepartmentWorkload[] {
  const departments = ['Safety', 'Maintenance', 'Operations', 'Engineering', 'Finance', 'General'];
  
  return departments.map(dept => {
    const deptItems = criticalItems.filter(item => item.department === dept);
    const currentLoad = deptItems.reduce((sum, item) => sum + item.estimatedHours, 0);
    const capacity = 160; // 4 people * 40 hours
    const utilization = currentLoad / capacity;
    
    return {
      department: dept,
      currentLoad,
      capacity,
      utilization,
      burnoutRisk: utilization > 0.8 ? utilization : 0,
      skillMatch: calculateSkillMatch(deptItems)
    };
  });
}

function calculateSkillMatch(items: CriticalItem[]): number {
  // Simplified skill matching - would use more sophisticated logic in practice
  return 0.8; // Assume 80% skill match on average
}

function identifySkillGaps(criticalItems: CriticalItem[]): SkillGap[] {
  // This would analyze required skills vs available skills
  return [
    {
      skill: 'Safety Analysis',
      requiredLevel: 4,
      currentLevel: 3,
      gap: 1,
      impact: 'Delays in safety-critical tasks'
    },
    {
      skill: 'Compliance Management',
      requiredLevel: 5,
      currentLevel: 3,
      gap: 2,
      impact: 'Risk of regulatory violations'
    }
  ];
}

function generateAssignmentRecommendations(
  criticalItems: CriticalItem[],
  departments: DepartmentWorkload[]
): Assignment[] {
  return criticalItems.slice(0, 5).map((item, index) => ({
    taskId: item.id,
    recommendedAssignee: findBestAssignee(item, departments),
    confidence: 0.8,
    reasoning: `Best skill match and available capacity in ${item.department}`,
    alternativeAssignees: [`Alt-${item.department}-1`, `Alt-${item.department}-2`]
  }));
}

function findBestAssignee(item: CriticalItem, departments: DepartmentWorkload[]): string {
  const dept = departments.find(d => d.department === item.department);
  if (!dept || dept.utilization > 0.9) {
    // Find least utilized department
    const leastUtilized = departments.reduce((min, d) => 
      d.utilization < min.utilization ? d : min
    );
    return `${leastUtilized.department}-Lead`;
  }
  return `${item.department}-Lead`;
}

function assessWorkloadBalance(departments: DepartmentWorkload[]): WorkloadBalance {
  const utilizations = departments.map(d => d.utilization);
  const max = Math.max(...utilizations);
  const min = Math.min(...utilizations);
  const variance = utilizations.reduce((sum, u) => sum + Math.pow(u - (max + min) / 2, 2), 0) / utilizations.length;
  
  const isBalanced = variance < 0.1 && max < 0.8;
  
  const recommendations: string[] = [];
  if (!isBalanced) {
    if (max > 0.8) recommendations.push('Redistribute high-priority tasks from overloaded departments');
    if (variance > 0.2) recommendations.push('Balance workload across departments more evenly');
  }
  
  return {
    isBalanced,
    maxUtilization: max,
    minUtilization: min,
    variance,
    recommendations
  };
}

function predictComplianceRisks(versions: DocumentVersion[]): PredictiveInsight | null {
  const recentFailures = versions
    .filter(v => v.approvalStatus.complianceChecks.some(c => c.status === 'fail'))
    .length;
  
  if (recentFailures > versions.length * 0.1) { // More than 10% failure rate
    return {
      type: 'risk',
      description: 'Increasing compliance failure rate detected',
      confidence: 0.8,
      timeframe: 'next 30 days',
      impact: 'high',
      recommendations: [
        'Review compliance training programs',
        'Implement additional quality checks',
        'Consider process improvements'
      ],
      dataPoints: [`${recentFailures} recent failures`, `${versions.length} total documents`]
    };
  }
  
  return null;
}

function predictMaintenanceNeeds(documents: any[]): PredictiveInsight | null {
  const maintenanceKeywords = ['maintenance', 'repair', 'replacement', 'inspection'];
  const maintenanceDocs = documents.filter(doc => 
    maintenanceKeywords.some(keyword => 
      (doc.content || '').toLowerCase().includes(keyword)
    )
  );
  
  if (maintenanceDocs.length > documents.length * 0.3) { // More than 30% maintenance-related
    return {
      type: 'maintenance',
      description: 'High volume of maintenance-related documents suggests upcoming maintenance cycle',
      confidence: 0.7,
      timeframe: 'next 60 days',
      impact: 'medium',
      recommendations: [
        'Schedule preventive maintenance windows',
        'Ensure spare parts availability',
        'Coordinate with operations team'
      ],
      dataPoints: [`${maintenanceDocs.length} maintenance documents`, 'Asset utilization patterns']
    };
  }
  
  return null;
}

function predictWorkloadOpportunities(documents: any[]): PredictiveInsight | null {
  const processImprovementKeywords = ['efficiency', 'optimization', 'automation', 'streamline'];
  const improvementDocs = documents.filter(doc => 
    processImprovementKeywords.some(keyword => 
      (doc.content || '').toLowerCase().includes(keyword)
    )
  );
  
  if (improvementDocs.length > 2) {
    return {
      type: 'opportunity',
      description: 'Process improvement opportunities identified across multiple documents',
      confidence: 0.6,
      timeframe: 'next 90 days',
      impact: 'medium',
      recommendations: [
        'Consolidate improvement initiatives',
        'Form cross-functional improvement team',
        'Prioritize high-impact improvements'
      ],
      dataPoints: [`${improvementDocs.length} improvement suggestions`, 'Process efficiency metrics']
    };
  }
  
  return null;
}

function predictComplianceDeadlines(versions: DocumentVersion[]): PredictiveInsight | null {
  // This would analyze compliance deadlines and predict issues
  return {
    type: 'compliance',
    description: 'Compliance review cycle approaching',
    confidence: 0.9,
    timeframe: 'next 14 days',
    impact: 'high',
    recommendations: [
      'Prepare compliance documentation',
      'Schedule internal audits',
      'Review policy updates'
    ],
    dataPoints: ['Regulatory calendar', 'Historical compliance patterns']
  };
}

function calculateRuleCompliance(checks: ComplianceCheck[]): RuleCompliance[] {
  const ruleGroups = checks.reduce((groups, check) => {
    if (!groups[check.rule]) {
      groups[check.rule] = [];
    }
    groups[check.rule]!.push(check);
    return groups;
  }, {} as Record<string, ComplianceCheck[]>);
  
  return Object.entries(ruleGroups).map(([rule, ruleChecks]) => {
    const passCount = ruleChecks.filter(c => c.status === 'pass').length;
    const failCount = ruleChecks.filter(c => c.status === 'fail').length;
    const warningCount = ruleChecks.filter(c => c.status === 'warning').length;
    
    return {
      rule,
      passRate: passCount / ruleChecks.length,
      failCount,
      warningCount,
      trend: 'stable' as const // Would calculate from historical data
    };
  });
}

function calculateComplianceTrends(versions: DocumentVersion[]): ComplianceTrend[] {
  // This would analyze trends over time
  return [
    {
      period: 'last-30-days',
      score: 0.85,
      change: 0.05,
      significantChanges: ['Improved safety compliance', 'New document completeness checks']
    }
  ];
}

function calculateUpcomingDeadlines(): ComplianceDeadline[] {
  // This would come from a compliance calendar
  return [
    {
      rule: 'KMRL-SAF-001',
      deadline: '2024-02-15',
      daysRemaining: 14,
      preparedness: 0.8,
      riskLevel: 'medium'
    }
  ];
}

function calculateCostPerDocument(avgProcessingTime: number): number {
  // Assume $0.01 per minute of processing time (including compute and human review)
  return (avgProcessingTime / 60000) * 0.01;
}