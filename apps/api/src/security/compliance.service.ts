import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { z } from 'zod';

// Zod схемы для валидации
const ComplianceConfigSchema = z.object({
  enabled: z.boolean().default(true),
  gdprEnabled: z.boolean().default(true),
  pciDssEnabled: z.boolean().default(true),
  soxEnabled: z.boolean().default(true),
  hipaaEnabled: z.boolean().default(false),
  auditLogging: z.boolean().default(true),
  dataRetention: z.number().min(30).max(2555).default(2555), // 7 лет
  encryptionRequired: z.boolean().default(true),
  accessControl: z.boolean().default(true),
});

const ComplianceRequirementSchema = z.object({
  id: z.string().uuid(),
  standard: z.enum(['GDPR', 'PCI_DSS', 'SOX', 'HIPAA', 'ISO_27001', 'SOC_2']),
  requirement: z.string(),
  description: z.string(),
  status: z.enum([
    'compliant',
    'non_compliant',
    'in_progress',
    'not_applicable',
  ]),
  lastAssessment: z.date(),
  nextAssessment: z.date(),
  evidence: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const ComplianceAuditSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  action: z.string(),
  userId: z.string().uuid().optional(),
  resource: z.string(),
  dataType: z.enum([
    'personal',
    'financial',
    'health',
    'business',
    'technical',
  ]),
  accessType: z.enum(['read', 'write', 'delete', 'export']),
  compliance: z.boolean(),
  violations: z.array(z.string()).optional(),
});

// Типы
type ComplianceConfig = z.infer<typeof ComplianceConfigSchema>;
type ComplianceRequirement = z.infer<typeof ComplianceRequirementSchema>;
type ComplianceAudit = z.infer<typeof ComplianceAuditSchema>;

export interface ComplianceStats {
  totalRequirements: number;
  compliantRequirements: number;
  nonCompliantRequirements: number;
  inProgressRequirements: number;
  lastAudit: Date;
  violationsThisMonth: number;
  dataBreaches: number;
}

export interface DataSubject {
  id: string;
  email: string;
  consentGiven: boolean;
  consentDate: Date;
  dataCategories: string[];
  retentionPeriod: Date;
  lastAccess: Date;
}

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);
  private config: ComplianceConfig;
  private requirements: ComplianceRequirement[] = [];
  private audits: ComplianceAudit[] = [];
  private dataSubjects: DataSubject[] = [];
  private stats: ComplianceStats;

  constructor() {
    this.config = ComplianceConfigSchema.parse({
      enabled: true,
      gdprEnabled: true,
      pciDssEnabled: true,
      soxEnabled: true,
      hipaaEnabled: false,
      auditLogging: true,
      dataRetention: 2555,
      encryptionRequired: true,
      accessControl: true,
    });

    this.stats = {
      totalRequirements: 0,
      compliantRequirements: 0,
      nonCompliantRequirements: 0,
      inProgressRequirements: 0,
      lastAudit: new Date(),
      violationsThisMonth: 0,
      dataBreaches: 0,
    };

    this.initializeDefaultRequirements();
    this.logger.log('Compliance Service initialized');
  }

  /**
   * Получить конфигурацию соответствия
   */
  getConfig(): ComplianceConfig {
    return { ...this.config };
  }

  /**
   * Обновить конфигурацию соответствия
   */
  updateConfig(updates: Partial<ComplianceConfig>): ComplianceConfig {
    const newConfig = { ...this.config, ...updates };
    this.config = ComplianceConfigSchema.parse(newConfig);

    this.logger.log(`Compliance config updated: ${JSON.stringify(updates)}`);
    return this.getConfig();
  }

  /**
   * Добавить требование соответствия
   */
  addRequirement(
    requirement: Omit<
      ComplianceRequirement,
      'id' | 'lastAssessment' | 'nextAssessment'
    >
  ): ComplianceRequirement {
    const now = new Date();
    const newRequirement: ComplianceRequirement = {
      ...requirement,
      id: crypto.randomUUID(),
      lastAssessment: now,
      nextAssessment: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 год
    };

    const validatedRequirement =
      ComplianceRequirementSchema.parse(newRequirement);
    this.requirements.push(validatedRequirement);
    this.updateStats();

    this.logger.log(`Compliance requirement added: ${requirement.requirement}`);
    return validatedRequirement;
  }

  /**
   * Обновить статус требования
   */
  updateRequirementStatus(
    requirementId: string,
    status: ComplianceRequirement['status'],
    evidence?: string[]
  ): ComplianceRequirement | null {
    const requirement = this.requirements.find(r => r.id === requirementId);
    if (!requirement) {
      return null;
    }

    requirement.status = status;
    requirement.lastAssessment = new Date();
    requirement.nextAssessment = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000
    );

    if (evidence) {
      requirement.evidence = evidence;
    }

    this.updateStats();
    this.logger.log(
      `Requirement status updated: ${requirement.requirement} -> ${status}`
    );
    return requirement;
  }

  /**
   * Получить требования соответствия
   */
  getRequirements(filters?: {
    standard?: ComplianceRequirement['standard'];
    status?: ComplianceRequirement['status'];
  }): ComplianceRequirement[] {
    let filteredRequirements = [...this.requirements];

    if (filters?.standard) {
      filteredRequirements = filteredRequirements.filter(
        r => r.standard === filters.standard
      );
    }

    if (filters?.status) {
      filteredRequirements = filteredRequirements.filter(
        r => r.status === filters.status
      );
    }

    return filteredRequirements.sort(
      (a, b) => b.lastAssessment.getTime() - a.lastAssessment.getTime()
    );
  }

  /**
   * Зарегистрировать аудит соответствия
   */
  logAudit(
    audit: Omit<ComplianceAudit, 'id' | 'timestamp' | 'compliance'>
  ): ComplianceAudit {
    const now = new Date();
    const isCompliant = this.checkCompliance(audit);

    const newAudit: ComplianceAudit = {
      ...audit,
      id: crypto.randomUUID(),
      timestamp: now,
      compliance: isCompliant,
    };

    const validatedAudit = ComplianceAuditSchema.parse(newAudit);
    this.audits.push(validatedAudit);
    this.stats.lastAudit = now;

    if (!isCompliant) {
      this.stats.violationsThisMonth++;
    }

    this.logger.log(
      `Compliance audit logged: ${audit.action} - ${isCompliant ? 'compliant' : 'non-compliant'}`
    );
    return validatedAudit;
  }

  /**
   * Получить аудиты соответствия
   */
  getAudits(filters?: {
    compliance?: boolean;
    dataType?: ComplianceAudit['dataType'];
    accessType?: ComplianceAudit['accessType'];
    userId?: string;
    limit?: number;
  }): ComplianceAudit[] {
    let filteredAudits = [...this.audits];

    if (filters?.compliance !== undefined) {
      filteredAudits = filteredAudits.filter(
        a => a.compliance === filters.compliance
      );
    }

    if (filters?.dataType) {
      filteredAudits = filteredAudits.filter(
        a => a.dataType === filters.dataType
      );
    }

    if (filters?.accessType) {
      filteredAudits = filteredAudits.filter(
        a => a.accessType === filters.accessType
      );
    }

    if (filters?.userId != null && filters.userId !== '') {
      filteredAudits = filteredAudits.filter(a => a.userId === filters.userId);
    }

    if (filters?.limit != null && filters.limit > 0) {
      filteredAudits = filteredAudits.slice(-filters.limit);
    }

    return filteredAudits.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Управление субъектами данных (GDPR)
   */
  addDataSubject(
    subject: Omit<DataSubject, 'id' | 'consentDate' | 'lastAccess'>
  ): DataSubject {
    const now = new Date();
    const newSubject: DataSubject = {
      ...subject,
      id: crypto.randomUUID(),
      consentDate: now,
      lastAccess: now,
    };

    this.dataSubjects.push(newSubject);
    this.logger.log(`Data subject added: ${subject.email}`);
    return newSubject;
  }

  /**
   * Получить субъектов данных
   */
  getDataSubjects(): DataSubject[] {
    return [...this.dataSubjects];
  }

  /**
   * Обновить согласие субъекта данных
   */
  updateDataSubjectConsent(
    subjectId: string,
    consentGiven: boolean
  ): DataSubject | null {
    const subject = this.dataSubjects.find(s => s.id === subjectId);
    if (!subject) {
      return null;
    }

    subject.consentGiven = consentGiven;
    subject.consentDate = new Date();

    this.logger.log(
      `Data subject consent updated: ${subject.email} -> ${consentGiven}`
    );
    return subject;
  }

  /**
   * Удалить данные субъекта (право на забвение)
   */
  deleteDataSubject(subjectId: string): boolean {
    const index = this.dataSubjects.findIndex(s => s.id === subjectId);
    if (index === -1) {
      return false;
    }

    const subject = this.dataSubjects[index];
    if (subject == null) {
      return false;
    }
    this.dataSubjects.splice(index, 1);

    this.logger.log(
      `Data subject deleted (right to be forgotten): ${subject.email}`
    );
    return true;
  }

  /**
   * Получить статистику соответствия
   */
  getStats(): ComplianceStats {
    return { ...this.stats };
  }

  /**
   * Проверить соответствие требованиям
   */
  healthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: string;
  } {
    const complianceRate =
      this.stats.totalRequirements > 0
        ? this.stats.compliantRequirements / this.stats.totalRequirements
        : 1;

    if (complianceRate < 0.8) {
      return {
        status: 'unhealthy',
        details: `Low compliance rate: ${(complianceRate * 100).toFixed(1)}%`,
      };
    }

    if (this.stats.violationsThisMonth > 10) {
      return {
        status: 'degraded',
        details: `High number of violations this month: ${this.stats.violationsThisMonth}`,
      };
    }

    return {
      status: 'healthy',
      details: `Compliance rate: ${(complianceRate * 100).toFixed(1)}%`,
    };
  }

  /**
   * Генерировать отчет о соответствии
   */
  generateComplianceReport(): {
    summary: ComplianceStats;
    requirements: ComplianceRequirement[];
    recentAudits: ComplianceAudit[];
    dataSubjects: DataSubject[];
  } {
    const recentAudits = this.getAudits({ limit: 100 });

    return {
      summary: this.getStats(),
      requirements: this.getRequirements(),
      recentAudits,
      dataSubjects: this.getDataSubjects(),
    };
  }

  /**
   * Проверить соответствие конкретного действия
   */
  private checkCompliance(
    audit: Omit<ComplianceAudit, 'id' | 'timestamp' | 'compliance'>
  ): boolean {
    // Проверка GDPR
    if (this.config.gdprEnabled && audit.dataType === 'personal') {
      if (audit.accessType === 'delete' || audit.accessType === 'export') {
        // Разрешаем удаление и экспорт персональных данных
        return true;
      }

      // Проверяем согласие субъекта данных
      const subject = this.dataSubjects.find(s => s.email === audit.resource);
      if (subject && !subject.consentGiven) {
        return false;
      }
    }

    // Проверка PCI DSS
    if (this.config.pciDssEnabled && audit.dataType === 'financial') {
      if (!this.config.encryptionRequired) {
        return false;
      }

      if (audit.accessType === 'read' && !this.config.accessControl) {
        return false;
      }
    }

    // Проверка SOX
    if (this.config.soxEnabled && audit.dataType === 'business') {
      if (audit.accessType === 'delete') {
        return false; // Запрещаем удаление бизнес-данных
      }
    }

    return true;
  }

  /**
   * Обновить статистику
   */
  private updateStats(): void {
    this.stats.totalRequirements = this.requirements.length;
    this.stats.compliantRequirements = this.requirements.filter(
      r => r.status === 'compliant'
    ).length;
    this.stats.nonCompliantRequirements = this.requirements.filter(
      r => r.status === 'non_compliant'
    ).length;
    this.stats.inProgressRequirements = this.requirements.filter(
      r => r.status === 'in_progress'
    ).length;
  }

  /**
   * Инициализировать стандартные требования
   */
  private initializeDefaultRequirements(): void {
    const defaultRequirements = [
      {
        standard: 'GDPR' as const,
        requirement: 'Data Protection by Design',
        description:
          'Implement data protection measures from the start of system design',
        status: 'compliant' as const,
      },
      {
        standard: 'GDPR' as const,
        requirement: 'Right to be Forgotten',
        description:
          'Allow data subjects to request deletion of their personal data',
        status: 'compliant' as const,
      },
      {
        standard: 'PCI_DSS' as const,
        requirement: 'Encrypt Cardholder Data',
        description: 'Encrypt all cardholder data in transit and at rest',
        status: 'compliant' as const,
      },
      {
        standard: 'PCI_DSS' as const,
        requirement: 'Access Control',
        description: 'Implement strong access controls for cardholder data',
        status: 'compliant' as const,
      },
      {
        standard: 'SOX' as const,
        requirement: 'Financial Data Integrity',
        description: 'Ensure integrity and accuracy of financial data',
        status: 'compliant' as const,
      },
      {
        standard: 'SOX' as const,
        requirement: 'Audit Trail',
        description:
          'Maintain comprehensive audit trails for financial transactions',
        status: 'compliant' as const,
      },
    ];

    defaultRequirements.forEach(req => this.addRequirement(req));
  }
}
