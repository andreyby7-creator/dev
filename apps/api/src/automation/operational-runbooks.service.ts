import { Injectable } from '@nestjs/common';
import { RedactedLogger } from '../utils/redacted-logger';

export interface OperationalRunbook {
  id: string;
  name: string;
  description: string;
  category:
    | 'incident-response'
    | 'maintenance'
    | 'deployment'
    | 'troubleshooting'
    | 'recovery'
    | 'monitoring'
    | 'security';
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  version: string;
  lastUpdated: Date;
  author: string;
  status: 'draft' | 'active' | 'deprecated' | 'archived';
  estimatedTime: number; // в минутах
  prerequisites: string[];
  tools: string[];
  contacts: Array<{
    role: string;
    name: string;
    email: string;
    phone?: string;
    telegram?: string;
  }>;
  steps: RunbookStep[];
  rollbackSteps: RunbookStep[];
  successCriteria: string[];
  failureCriteria: string[];
  relatedRunbooks: string[];
  attachments: Array<{
    name: string;
    type: 'document' | 'script' | 'diagram' | 'template';
    url: string;
    description: string;
  }>;
}

export interface RunbookStep {
  id: string;
  order: number;
  title: string;
  description: string;
  type: 'manual' | 'automated' | 'decision' | 'verification' | 'wait';
  estimatedTime: number; // в минутах
  instructions: string;
  expectedResult: string;
  failureAction: 'retry' | 'skip' | 'abort' | 'escalate';
  maxRetries: number;
  retryDelay: number; // в секундах
  automationScript?: string;
  decisionCriteria?: Array<{
    condition: string;
    action: string;
    nextStep: string;
  }>;
  verificationMethod?: string;
  waitCondition?: string;
  waitTimeout?: number; // в секундах
  requiredRole?: string;
  requiredPermissions?: string[];
  notes?: string;
}

export interface IncidentType {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category:
    | 'infrastructure'
    | 'application'
    | 'network'
    | 'security'
    | 'storage'
    | 'compute';
  priority: 'p1' | 'p2' | 'p3' | 'p4';
  sla: {
    responseTime: number; // в минутах
    resolutionTime: number; // в минутах
    escalationTime: number; // в минутах
  };
  runbooks: string[];
  escalationPath: Array<{
    level: number;
    role: string;
    contact: string;
    timeout: number; // в минутах
  }>;
  notificationChannels: string[];
  autoAssignment: boolean;
  defaultAssignee?: string;
}

export interface IncidentResponse {
  id: string;
  incidentTypeId: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status:
    | 'new'
    | 'assigned'
    | 'in-progress'
    | 'waiting'
    | 'resolved'
    | 'closed';
  priority: 'p1' | 'p2' | 'p3' | 'p4';
  assignedTo?: string;
  reporter: string;
  detectedAt: Date;
  assignedAt?: Date;
  startedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  slaBreach: boolean;
  slaBreachReason?: string;
  impact: {
    users: number;
    services: string[];
    businessImpact: 'low' | 'medium' | 'high' | 'critical';
    estimatedCost: number;
    currency: 'BYN' | 'RUB' | 'USD';
  };
  timeline: Array<{
    timestamp: Date;
    action: string;
    user: string;
    details: string;
  }>;
  runbookExecutions: Array<{
    runbookId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt?: Date;
    completedAt?: Date;
    executor: string;
    notes: string;
  }>;
  rootCause?: string;
  resolution?: string;
  lessonsLearned?: string[];
  followUpActions?: string[];
  tags: string[];
}

export interface MaintenanceProcedure {
  id: string;
  name: string;
  description: string;
  type: 'scheduled' | 'emergency' | 'preventive' | 'corrective';
  category: 'hardware' | 'software' | 'network' | 'security' | 'infrastructure';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number; // в минутах
  maintenanceWindow: {
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    timezone: string;
    recurrence?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    recurrenceDay?: number; // день недели или месяца
  };
  affectedServices: string[];
  affectedUsers: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  rollbackPlan: string;
  notificationChannels: string[];
  approvalRequired: boolean;
  approvers: string[];
  runbooks: string[];
  checklist: Array<{
    item: string;
    completed: boolean;
    completedBy?: string;
    completedAt?: Date;
    notes?: string;
  }>;
  status: 'planned' | 'approved' | 'in-progress' | 'completed' | 'cancelled';
  scheduledDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  executor?: string;
  notes?: string;
  postMaintenanceReport?: string;
}

export interface TroubleshootingGuide {
  id: string;
  name: string;
  description: string;
  symptom: string;
  category:
    | 'performance'
    | 'connectivity'
    | 'error'
    | 'behavior'
    | 'availability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedComponents: string[];
  commonCauses: string[];
  diagnosticSteps: Array<{
    step: number;
    action: string;
    expectedResult: string;
    failureResult: string;
    nextStep: string;
    tools: string[];
    commands?: string[];
  }>;
  quickFixes: Array<{
    name: string;
    description: string;
    successRate: number; // 0-1
    risk: 'low' | 'medium' | 'high';
    estimatedTime: number; // в минутах
    steps: string[];
  }>;
  escalationCriteria: string[];
  relatedIssues: string[];
  preventionTips: string[];
  documentation: string[];
  lastUpdated: Date;
  author: string;
  status: 'draft' | 'active' | 'deprecated';
}

@Injectable()
export class OperationalRunbooksService {
  private readonly redactedLogger = new RedactedLogger();
  private readonly runbooks = new Map<string, OperationalRunbook>();
  private readonly incidentTypes = new Map<string, IncidentType>();
  private readonly incidentResponses = new Map<string, IncidentResponse>();
  private readonly maintenanceProcedures = new Map<
    string,
    MaintenanceProcedure
  >();
  private readonly troubleshootingGuides = new Map<
    string,
    TroubleshootingGuide
  >();

  constructor() {
    this.initializeRunbooks();
    this.initializeIncidentTypes();
    this.initializeMaintenanceProcedures();
    this.initializeTroubleshootingGuides();
  }

  private initializeRunbooks(): void {
    const runbooks: OperationalRunbook[] = [
      {
        id: 'runbook-server-outage-response',
        name: 'Server Outage Response',
        description:
          'Standard procedure for responding to server outages and service disruptions',
        category: 'incident-response',
        priority: 'high',
        tags: ['server', 'outage', 'incident', 'response'],
        version: '1.0.0',
        lastUpdated: new Date(),
        author: 'System Administrator',
        status: 'active',
        estimatedTime: 30,
        prerequisites: [
          'Access to monitoring systems',
          'Server access credentials',
          'Emergency contact list',
        ],
        tools: [
          'SSH',
          'Monitoring Dashboard',
          'Alert System',
          'Communication Tools',
        ],
        contacts: [
          {
            role: 'Primary On-Call',
            name: 'Primary Engineer',
            email: 'primary@company.com',
            phone: '+375291234567',
            telegram: '@primary_engineer',
          },
          {
            role: 'Secondary On-Call',
            name: 'Secondary Engineer',
            email: 'secondary@company.com',
            phone: '+375291234568',
            telegram: '@secondary_engineer',
          },
        ],
        steps: [
          {
            id: 'step-1',
            order: 1,
            title: 'Assess Situation',
            description: 'Quickly assess the scope and impact of the outage',
            type: 'manual',
            estimatedTime: 5,
            instructions:
              'Check monitoring dashboards and alert systems to understand the current state',
            expectedResult:
              'Clear understanding of affected services and users',
            failureAction: 'escalate',
            maxRetries: 0,
            retryDelay: 0,
            requiredRole: 'Engineer',
            notes: 'Focus on business impact assessment',
          },
          {
            id: 'step-2',
            order: 2,
            title: 'Communicate Status',
            description: 'Notify stakeholders about the outage',
            type: 'automated',
            estimatedTime: 2,
            instructions: 'Send initial status update to all stakeholders',
            expectedResult: 'Stakeholders informed of outage status',
            failureAction: 'retry',
            maxRetries: 3,
            retryDelay: 30,
            automationScript: 'send-outage-notification.sh',
            requiredRole: 'Engineer',
          },
          {
            id: 'step-3',
            order: 3,
            title: 'Investigate Root Cause',
            description: 'Determine the underlying cause of the outage',
            type: 'manual',
            estimatedTime: 15,
            instructions: 'Check logs, system metrics, and recent changes',
            expectedResult: 'Identified root cause of the outage',
            failureAction: 'escalate',
            maxRetries: 0,
            retryDelay: 0,
            requiredRole: 'Senior Engineer',
            notes: 'Document findings for post-incident review',
          },
          {
            id: 'step-4',
            order: 4,
            title: 'Implement Fix',
            description: 'Apply the necessary fix to resolve the outage',
            type: 'manual',
            estimatedTime: 8,
            instructions: 'Execute the fix based on root cause analysis',
            expectedResult: 'Service restored and functioning normally',
            failureAction: 'retry',
            maxRetries: 2,
            retryDelay: 60,
            requiredRole: 'Senior Engineer',
            notes: 'Monitor closely after fix implementation',
          },
        ],
        rollbackSteps: [
          {
            id: 'rollback-1',
            order: 1,
            title: 'Stop Fix Implementation',
            description: 'Immediately stop the current fix if it causes issues',
            type: 'manual',
            estimatedTime: 2,
            instructions: 'Stop any ongoing fix implementation',
            expectedResult: 'Fix implementation stopped',
            failureAction: 'escalate',
            maxRetries: 0,
            retryDelay: 0,
            requiredRole: 'Engineer',
          },
          {
            id: 'rollback-2',
            order: 2,
            title: 'Restore Previous State',
            description: 'Restore the system to its previous working state',
            type: 'manual',
            estimatedTime: 10,
            instructions:
              'Use backup or restore procedures to return to previous state',
            expectedResult: 'System restored to previous working state',
            failureAction: 'escalate',
            maxRetries: 0,
            retryDelay: 0,
            requiredRole: 'Senior Engineer',
          },
        ],
        successCriteria: [
          'All affected services restored',
          'System performance back to normal',
          'No data loss occurred',
          'Stakeholders informed of resolution',
        ],
        failureCriteria: [
          'Service still unavailable after fix',
          'Performance degradation persists',
          'Data integrity compromised',
          'Escalation required',
        ],
        relatedRunbooks: [
          'runbook-database-recovery',
          'runbook-network-troubleshooting',
        ],
        attachments: [
          {
            name: 'Server Outage Checklist',
            type: 'document',
            url: '/docs/runbooks/server-outage-checklist.pdf',
            description: 'Quick reference checklist for server outages',
          },
          {
            name: 'Emergency Contact List',
            type: 'template',
            url: '/templates/emergency-contacts.json',
            description: 'Template for emergency contact information',
          },
        ],
      },
      {
        id: 'runbook-database-backup-restore',
        name: 'Database Backup and Restore',
        description:
          'Procedure for creating database backups and restoring from them',
        category: 'maintenance',
        priority: 'medium',
        tags: ['database', 'backup', 'restore', 'maintenance'],
        version: '1.0.0',
        lastUpdated: new Date(),
        author: 'Database Administrator',
        status: 'active',
        estimatedTime: 45,
        prerequisites: [
          'Database access credentials',
          'Backup storage location',
          'Maintenance window approval',
        ],
        tools: ['Database Client', 'Backup Tools', 'Monitoring System'],
        contacts: [
          {
            role: 'Database Administrator',
            name: 'DB Admin',
            email: 'dbadmin@company.com',
            phone: '+375291234569',
          },
        ],
        steps: [
          {
            id: 'step-1',
            order: 1,
            title: 'Verify Backup Requirements',
            description: 'Ensure backup requirements are met before proceeding',
            type: 'verification',
            estimatedTime: 5,
            instructions:
              'Check available disk space and backup retention policies',
            expectedResult: 'Backup requirements verified and met',
            failureAction: 'abort',
            maxRetries: 0,
            retryDelay: 0,
            verificationMethod: 'Check disk space and backup policies',
            requiredRole: 'Database Administrator',
          },
          {
            id: 'step-2',
            order: 2,
            title: 'Create Backup',
            description: 'Create a full database backup',
            type: 'automated',
            estimatedTime: 20,
            instructions: 'Execute backup command with appropriate parameters',
            expectedResult: 'Backup created successfully',
            failureAction: 'retry',
            maxRetries: 3,
            retryDelay: 300,
            automationScript: 'create-db-backup.sh',
            requiredRole: 'Database Administrator',
          },
          {
            id: 'step-3',
            order: 3,
            title: 'Verify Backup Integrity',
            description: 'Verify the backup file is valid and complete',
            type: 'verification',
            estimatedTime: 10,
            instructions: 'Check backup file size and run integrity checks',
            expectedResult: 'Backup integrity verified',
            failureAction: 'retry',
            maxRetries: 2,
            retryDelay: 60,
            verificationMethod: 'Backup integrity check',
            requiredRole: 'Database Administrator',
          },
          {
            id: 'step-4',
            order: 4,
            title: 'Test Restore Process',
            description: 'Test the restore process in a safe environment',
            type: 'manual',
            estimatedTime: 10,
            instructions: 'Perform a test restore to verify backup usability',
            expectedResult: 'Restore process tested successfully',
            failureAction: 'escalate',
            maxRetries: 0,
            retryDelay: 0,
            requiredRole: 'Database Administrator',
            notes: 'Use test environment only',
          },
        ],
        rollbackSteps: [
          {
            id: 'rollback-1',
            order: 1,
            title: 'Stop Backup Process',
            description: 'Stop any ongoing backup process',
            type: 'manual',
            estimatedTime: 2,
            instructions: 'Terminate backup process if issues occur',
            expectedResult: 'Backup process stopped',
            failureAction: 'escalate',
            maxRetries: 0,
            retryDelay: 0,
            requiredRole: 'Database Administrator',
          },
        ],
        successCriteria: [
          'Backup created successfully',
          'Backup integrity verified',
          'Restore process tested',
          'Documentation updated',
        ],
        failureCriteria: [
          'Backup creation failed',
          'Backup integrity check failed',
          'Restore test failed',
          'Performance impact on production',
        ],
        relatedRunbooks: [
          'runbook-database-recovery',
          'runbook-maintenance-procedures',
        ],
        attachments: [
          {
            name: 'Backup Script Template',
            type: 'script',
            url: '/scripts/backup-template.sh',
            description: 'Template script for database backups',
          },
        ],
      },
    ];

    runbooks.forEach(runbook => {
      this.runbooks.set(runbook.id, runbook);
    });
  }

  private initializeIncidentTypes(): void {
    const incidentTypes: IncidentType[] = [
      {
        id: 'incident-server-outage',
        name: 'Server Outage',
        description: 'Complete or partial server unavailability',
        severity: 'high',
        category: 'infrastructure',
        priority: 'p1',
        sla: {
          responseTime: 5,
          resolutionTime: 30,
          escalationTime: 15,
        },
        runbooks: ['runbook-server-outage-response'],
        escalationPath: [
          {
            level: 1,
            role: 'Primary On-Call Engineer',
            contact: 'primary@company.com',
            timeout: 5,
          },
          {
            level: 2,
            role: 'Senior Engineer',
            contact: 'senior@company.com',
            timeout: 15,
          },
          {
            level: 3,
            role: 'Engineering Manager',
            contact: 'manager@company.com',
            timeout: 30,
          },
        ],
        notificationChannels: ['email', 'telegram', 'slack'],
        autoAssignment: true,
        defaultAssignee: 'primary-oncall',
      },
      {
        id: 'incident-database-performance',
        name: 'Database Performance Degradation',
        description: 'Significant decrease in database performance',
        severity: 'medium',
        category: 'infrastructure',
        priority: 'p2',
        sla: {
          responseTime: 15,
          resolutionTime: 60,
          escalationTime: 30,
        },
        runbooks: ['runbook-database-troubleshooting'],
        escalationPath: [
          {
            level: 1,
            role: 'Database Administrator',
            contact: 'dbadmin@company.com',
            timeout: 15,
          },
          {
            level: 2,
            role: 'Senior DBA',
            contact: 'senior-dba@company.com',
            timeout: 30,
          },
        ],
        notificationChannels: ['email', 'telegram'],
        autoAssignment: true,
        defaultAssignee: 'dbadmin',
      },
    ];

    incidentTypes.forEach(incidentType => {
      this.incidentTypes.set(incidentType.id, incidentType);
    });
  }

  private initializeMaintenanceProcedures(): void {
    const maintenanceProcedures: MaintenanceProcedure[] = [
      {
        id: 'maintenance-database-backup',
        name: 'Database Backup Maintenance',
        description: 'Regular database backup and maintenance procedures',
        type: 'scheduled',
        category: 'infrastructure',
        priority: 'medium',
        estimatedDuration: 60,
        maintenanceWindow: {
          startTime: '02:00',
          endTime: '04:00',
          timezone: 'Europe/Minsk',
          recurrence: 'daily',
        },
        affectedServices: ['Database Service'],
        affectedUsers: 0,
        riskLevel: 'low',
        rollbackPlan: 'Restore from previous backup if issues occur',
        notificationChannels: ['email'],
        approvalRequired: false,
        approvers: [],
        runbooks: ['runbook-database-backup-restore'],
        checklist: [
          {
            item: 'Verify backup storage space',
            completed: false,
          },
          {
            item: 'Create full database backup',
            completed: false,
          },
          {
            item: 'Verify backup integrity',
            completed: false,
          },
          {
            item: 'Clean up old backup files',
            completed: false,
          },
          {
            item: 'Update backup documentation',
            completed: false,
          },
        ],
        status: 'planned',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // завтра
      },
    ];

    maintenanceProcedures.forEach(procedure => {
      this.maintenanceProcedures.set(procedure.id, procedure);
    });
  }

  private initializeTroubleshootingGuides(): void {
    const troubleshootingGuides: TroubleshootingGuide[] = [
      {
        id: 'guide-slow-database-queries',
        name: 'Slow Database Queries Troubleshooting',
        description:
          'Guide for identifying and resolving slow database query performance issues',
        symptom: 'Database queries taking longer than expected to execute',
        category: 'performance',
        severity: 'medium',
        affectedComponents: ['Database', 'Application', 'API'],
        commonCauses: [
          'Missing database indexes',
          'Inefficient query structure',
          'Large result sets',
          'Database resource constraints',
          'Network latency',
        ],
        diagnosticSteps: [
          {
            step: 1,
            action: 'Identify slow queries',
            expectedResult: 'List of queries with execution times',
            failureResult: 'Unable to identify slow queries',
            nextStep: 'Analyze query execution plans',
            tools: ['Database Monitoring', 'Query Analyzer'],
            commands: ['SHOW PROCESSLIST', 'EXPLAIN ANALYZE'],
          },
          {
            step: 2,
            action: 'Analyze query execution plans',
            expectedResult: 'Understanding of query execution path',
            failureResult: 'Unable to analyze execution plans',
            nextStep: 'Check database indexes',
            tools: ['Query Analyzer'],
            commands: ['EXPLAIN', 'ANALYZE TABLE'],
          },
          {
            step: 3,
            action: 'Check database indexes',
            expectedResult: 'Index usage analysis',
            failureResult: 'Index analysis failed',
            nextStep: 'Review query structure',
            tools: ['Database Client'],
            commands: ['SHOW INDEX', 'ANALYZE TABLE'],
          },
        ],
        quickFixes: [
          {
            name: 'Add Missing Indexes',
            description: 'Create indexes for frequently queried columns',
            successRate: 0.8,
            risk: 'low',
            estimatedTime: 15,
            steps: [
              'Identify missing indexes',
              'Create appropriate indexes',
              'Monitor performance improvement',
            ],
          },
          {
            name: 'Optimize Query Structure',
            description: 'Rewrite queries for better performance',
            successRate: 0.7,
            risk: 'medium',
            estimatedTime: 30,
            steps: [
              'Analyze query logic',
              'Rewrite for efficiency',
              'Test performance impact',
            ],
          },
        ],
        escalationCriteria: [
          'Performance degradation persists after fixes',
          'Multiple services affected',
          'Business impact significant',
        ],
        relatedIssues: ['Database Connection Issues', 'Memory Usage Problems'],
        preventionTips: [
          'Regular query performance monitoring',
          'Proactive index maintenance',
          'Query optimization reviews',
          'Resource capacity planning',
        ],
        documentation: [
          'Database Performance Tuning Guide',
          'Query Optimization Best Practices',
          'Index Management Procedures',
        ],
        lastUpdated: new Date(),
        author: 'Database Administrator',
        status: 'active',
      },
    ];

    troubleshootingGuides.forEach(guide => {
      this.troubleshootingGuides.set(guide.id, guide);
    });
  }

  async createRunbook(
    runbook: Omit<OperationalRunbook, 'id' | 'lastUpdated'>
  ): Promise<string> {
    const runbookId = `runbook-${Date.now()}`;
    const newRunbook: OperationalRunbook = {
      ...runbook,
      id: runbookId,
      lastUpdated: new Date(),
    };

    this.runbooks.set(runbookId, newRunbook);

    this.redactedLogger.log(`Runbook created`, 'OperationalRunbooksService', {
      runbookId,
      name: newRunbook.name,
      category: newRunbook.category,
    });

    return runbookId;
  }

  async updateRunbook(
    runbookId: string,
    updates: Partial<Omit<OperationalRunbook, 'id' | 'lastUpdated'>>
  ): Promise<boolean> {
    const runbook = this.runbooks.get(runbookId);
    if (!runbook) {
      return false;
    }

    Object.assign(runbook, updates);
    runbook.lastUpdated = new Date();

    this.redactedLogger.log(`Runbook updated`, 'OperationalRunbooksService', {
      runbookId,
      name: runbook.name,
    });

    return true;
  }

  async createIncidentResponse(
    incident: Omit<
      IncidentResponse,
      'id' | 'detectedAt' | 'status' | 'slaBreach' | 'timeline'
    >
  ): Promise<string> {
    const incidentId = `incident-${Date.now()}`;
    const newIncident: IncidentResponse = {
      ...incident,
      id: incidentId,
      detectedAt: new Date(),
      status: 'new',
      slaBreach: false,
      timeline: [
        {
          timestamp: new Date(),
          action: 'Incident created',
          user: incident.reporter,
          details: 'Initial incident report',
        },
      ],
    };

    this.incidentResponses.set(incidentId, newIncident);

    this.redactedLogger.log(
      `Incident response created`,
      'OperationalRunbooksService',
      {
        incidentId,
        title: newIncident.title,
        severity: newIncident.severity,
      }
    );

    return incidentId;
  }

  async updateIncidentStatus(
    incidentId: string,
    status: IncidentResponse['status'],
    userId: string,
    details: string
  ): Promise<boolean> {
    const incident = this.incidentResponses.get(incidentId);
    if (!incident) {
      return false;
    }

    incident.status = status;
    incident.timeline.push({
      timestamp: new Date(),
      action: `Status changed to ${status}`,
      user: userId,
      details,
    });

    // Обновляем временные метки
    switch (status) {
      case 'assigned':
        incident.assignedAt = new Date();
        break;
      case 'in-progress':
        incident.startedAt = new Date();
        break;
      case 'resolved':
        if (incident.resolvedAt !== undefined) {
          incident.resolvedAt = new Date();
        }
        break;
      case 'closed':
        incident.closedAt = new Date();
        break;
    }

    // Проверяем SLA
    if (status === 'resolved' || status === 'closed') {
      const incidentType = this.incidentTypes.get(incident.incidentTypeId);
      if (incidentType) {
        const resolutionTime =
          incident.resolvedAt !== undefined
            ? (incident.resolvedAt.getTime() - incident.detectedAt.getTime()) /
              (1000 * 60)
            : 0;

        incident.slaBreach = resolutionTime > incidentType.sla.resolutionTime;
        if (incident.slaBreach) {
          incident.slaBreachReason = `Resolution time ${resolutionTime} minutes exceeded SLA of ${incidentType.sla.resolutionTime} minutes`;
        }
      }
    }

    this.redactedLogger.log(
      `Incident status updated`,
      'OperationalRunbooksService',
      {
        incidentId,
        status,
        userId,
      }
    );

    return true;
  }

  async createMaintenanceProcedure(
    procedure: Omit<MaintenanceProcedure, 'id' | 'status'>
  ): Promise<string> {
    const procedureId = `maintenance-${Date.now()}`;
    const newProcedure: MaintenanceProcedure = {
      ...procedure,
      id: procedureId,
      status: 'planned',
    };

    this.maintenanceProcedures.set(procedureId, newProcedure);

    this.redactedLogger.log(
      `Maintenance procedure created`,
      'OperationalRunbooksService',
      {
        procedureId,
        name: newProcedure.name,
        type: newProcedure.type,
      }
    );

    return procedureId;
  }

  async updateMaintenanceStatus(
    procedureId: string,
    status: MaintenanceProcedure['status'],
    userId: string,
    notes?: string
  ): Promise<boolean> {
    const procedure = this.maintenanceProcedures.get(procedureId);
    if (!procedure) {
      return false;
    }

    procedure.status = status;
    if (notes != null) {
      procedure.notes = notes;
    }

    if (status === 'in-progress') {
      procedure.startedAt = new Date();
      procedure.executor = userId;
    } else if (status === 'completed') {
      procedure.completedAt = new Date();
    }

    this.redactedLogger.log(
      `Maintenance procedure status updated`,
      'OperationalRunbooksService',
      {
        procedureId,
        status,
        userId,
      }
    );

    return true;
  }

  async getRunbooks(
    category?: OperationalRunbook['category'],
    status?: OperationalRunbook['status']
  ): Promise<OperationalRunbook[]> {
    let runbooks = Array.from(this.runbooks.values());

    if (category) {
      runbooks = runbooks.filter(r => r.category === category);
    }

    if (status) {
      runbooks = runbooks.filter(r => r.status === status);
    }

    return runbooks.sort(
      (a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()
    );
  }

  async getIncidentTypes(): Promise<IncidentType[]> {
    return Array.from(this.incidentTypes.values());
  }

  async getIncidentResponses(
    status?: IncidentResponse['status'],
    severity?: IncidentResponse['severity']
  ): Promise<IncidentResponse[]> {
    let incidents = Array.from(this.incidentResponses.values());

    if (status) {
      incidents = incidents.filter(i => i.status === status);
    }

    if (severity) {
      incidents = incidents.filter(i => i.severity === severity);
    }

    return incidents.sort(
      (a, b) => b.detectedAt.getTime() - a.detectedAt.getTime()
    );
  }

  async getMaintenanceProcedures(
    type?: MaintenanceProcedure['type'],
    status?: MaintenanceProcedure['status']
  ): Promise<MaintenanceProcedure[]> {
    let procedures = Array.from(this.maintenanceProcedures.values());

    if (type) {
      procedures = procedures.filter(p => p.type === type);
    }

    if (status) {
      procedures = procedures.filter(p => p.status === status);
    }

    return procedures.sort((a, b) => {
      if (a.scheduledDate && b.scheduledDate) {
        return a.scheduledDate.getTime() - b.scheduledDate.getTime();
      }
      return 0;
    });
  }

  async getTroubleshootingGuides(
    category?: TroubleshootingGuide['category']
  ): Promise<TroubleshootingGuide[]> {
    let guides = Array.from(this.troubleshootingGuides.values());

    if (category) {
      guides = guides.filter(g => g.category === category);
    }

    return guides.sort(
      (a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()
    );
  }

  async searchRunbooks(query: string): Promise<OperationalRunbook[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.runbooks.values()).filter(
      runbook =>
        runbook.name.toLowerCase().includes(searchTerm) ||
        runbook.description.toLowerCase().includes(searchTerm) ||
        runbook.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  async getRunbookById(runbookId: string): Promise<OperationalRunbook | null> {
    return this.runbooks.get(runbookId) ?? null;
  }

  async getIncidentResponseById(
    incidentId: string
  ): Promise<IncidentResponse | null> {
    return this.incidentResponses.get(incidentId) ?? null;
  }

  async getMaintenanceProcedureById(
    procedureId: string
  ): Promise<MaintenanceProcedure | null> {
    return this.maintenanceProcedures.get(procedureId) ?? null;
  }

  async getTroubleshootingGuideById(
    guideId: string
  ): Promise<TroubleshootingGuide | null> {
    return this.troubleshootingGuides.get(guideId) ?? null;
  }

  async deleteRunbook(runbookId: string): Promise<boolean> {
    const runbook = this.runbooks.get(runbookId);
    if (!runbook) {
      return false;
    }

    this.runbooks.delete(runbookId);

    this.redactedLogger.log(`Runbook deleted`, 'OperationalRunbooksService', {
      runbookId,
      name: runbook.name,
    });

    return true;
  }

  async getRunbookStatistics(): Promise<{
    totalRunbooks: number;
    activeRunbooks: number;
    categories: Record<string, number>;
    averageSteps: number;
    mostUsedRunbooks: Array<{ id: string; name: string; usageCount: number }>;
  }> {
    const runbooks = Array.from(this.runbooks.values());
    const activeRunbooks = runbooks.filter(r => r.status === 'active');

    const categories: Record<string, number> = {};
    runbooks.forEach(r => {
      categories[r.category] = (categories[r.category] ?? 0) + 1;
    });

    const totalSteps = runbooks.reduce((sum, r) => sum + r.steps.length, 0);
    const averageSteps = runbooks.length > 0 ? totalSteps / runbooks.length : 0;

    // Имитация статистики использования
    const mostUsedRunbooks = [
      {
        id: 'runbook-server-outage-response',
        name: 'Server Outage Response',
        usageCount: 15,
      },
      {
        id: 'runbook-database-backup-restore',
        name: 'Database Backup and Restore',
        usageCount: 8,
      },
    ];

    return {
      totalRunbooks: runbooks.length,
      activeRunbooks: activeRunbooks.length,
      categories,
      averageSteps: Math.round(averageSteps * 100) / 100,
      mostUsedRunbooks,
    };
  }

  /**
   * Создание runbook для инцидентов
   */

  createIncidentResponseRunbook(_incidentType: string): {
    id: string;
    type: string;
    steps: Array<{
      order: number;
      title: string;
      description: string;
      action: string;
    }>;
    status: string;
    priority: string;
  } {
    const runbookId = `runbook-${Date.now()}`;

    const steps = [
      {
        order: 1,
        title: 'Assess Impact',
        description: 'Evaluate the scope and severity of the incident',
        action: 'Document affected services and users',
      },
      {
        order: 2,
        title: 'Contain Issue',
        description: 'Implement immediate measures to prevent escalation',
        action: 'Apply emergency fixes or workarounds',
      },
      {
        order: 3,
        title: 'Communicate Status',
        description: 'Notify stakeholders and update status page',
        action: 'Send incident notifications',
      },
    ];

    return {
      id: runbookId,
      type: 'incident_response',
      steps,
      status: 'active',
      priority: 'high',
    };
  }

  /**
   * Создание runbook для обслуживания
   */

  createMaintenanceRunbook(_maintenanceType: string): {
    id: string;
    type: string;
    steps: Array<{
      order: number;
      title: string;
      description: string;
      action: string;
    }>;
    status: string;
    priority: string;
  } {
    const runbookId = `runbook-${Date.now()}`;

    const steps = [
      {
        order: 1,
        title: 'Pre-maintenance Check',
        description: 'Verify system health before maintenance',
        action: 'Run health checks and backups',
      },
      {
        order: 2,
        title: 'Execute Maintenance',
        description: 'Perform scheduled maintenance tasks',
        action: 'Apply updates and configurations',
      },
      {
        order: 3,
        title: 'Post-maintenance Verification',
        description: 'Confirm system functionality after maintenance',
        action: 'Run tests and verify services',
      },
    ];

    return {
      id: runbookId,
      type: 'maintenance',
      steps,
      status: 'active',
      priority: 'medium',
    };
  }

  /**
   * Создание runbook для развертывания
   */

  createDeploymentRunbook(_deploymentType: string): {
    id: string;
    type: string;
    steps: Array<{
      order: number;
      title: string;
      description: string;
      action: string;
    }>;
    status: string;
    priority: string;
  } {
    const runbookId = `runbook-${Date.now()}`;

    const steps = [
      {
        order: 1,
        title: 'Pre-deployment Validation',
        description: 'Validate deployment artifacts and environment',
        action: 'Run automated tests and checks',
      },
      {
        order: 2,
        title: 'Deploy Application',
        description: 'Execute deployment process',
        action: 'Deploy to target environment',
      },
      {
        order: 3,
        title: 'Post-deployment Verification',
        description: 'Verify successful deployment',
        action: 'Run smoke tests and health checks',
      },
    ];

    return {
      id: runbookId,
      type: 'deployment',
      steps,
      status: 'active',
      priority: 'high',
    };
  }

  /**
   * Выполнение runbook
   */
  executeRunbook(runbookId: string): {
    runbookId: string;
    status: 'running' | 'completed' | 'failed';
    startTime: Date;
    currentStep: number;
    totalSteps: number;
    progress: number;
  } {
    const runbook = this.runbooks.get(runbookId);
    if (!runbook) {
      return {
        runbookId,
        status: 'failed',
        startTime: new Date(),
        currentStep: 0,
        totalSteps: 0,
        progress: 0,
      };
    }

    const currentStep = Math.floor(Math.random() * runbook.steps.length) + 1;
    const totalSteps = runbook.steps.length;
    const progress = (currentStep / totalSteps) * 100;

    let status: 'running' | 'completed' | 'failed';
    if (progress >= 100) {
      status = 'completed';
    } else if (Math.random() > 0.1) {
      status = 'running';
    } else {
      status = 'failed';
    }

    return {
      runbookId,
      status,
      startTime: new Date(),
      currentStep,
      totalSteps,
      progress: Math.round(progress * 100) / 100,
    };
  }
}
