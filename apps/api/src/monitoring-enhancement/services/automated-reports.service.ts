import { Injectable, Logger } from '@nestjs/common';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'performance' | 'security' | 'usage' | 'error' | 'custom';
  sections: Array<{
    title: string;
    type: 'chart' | 'table' | 'metric' | 'text';
    config: Record<string, unknown>;
  }>;
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:MM format
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
  };
  recipients: string[];
  format: 'pdf' | 'html' | 'json' | 'csv';
  metadata: Record<string, unknown>;
}

export interface Report {
  id: string;
  templateId: string;
  name: string;
  type: string;
  status: 'generating' | 'completed' | 'failed';
  generatedAt: Date;
  generatedBy: string;
  data: Record<string, unknown>;
  filePath?: string;
  fileSize?: number;
  format: string;
  metadata: Record<string, unknown>;
}

export interface ReportConfig {
  templateId?: string;
  name: string;
  type: 'performance' | 'security' | 'usage' | 'error' | 'custom';
  timeRange: string;
  sections: Array<{
    title: string;
    type: 'chart' | 'table' | 'metric' | 'text';
    config: Record<string, unknown>;
  }>;
  format: 'pdf' | 'html' | 'json' | 'csv';
  recipients?: string[];
}

@Injectable()
export class AutomatedReportsService {
  private readonly logger = new Logger(AutomatedReportsService.name);
  private reportTemplates: Map<string, ReportTemplate> = new Map();
  private reports: Map<string, Report> = new Map();
  private scheduledReports: Map<string, ReportTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  async generateReport(config: ReportConfig): Promise<{
    success: boolean;
    reportId: string;
    report: Report;
  }> {
    try {
      this.logger.log(`Generating report: ${config.name}`);

      const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const report: Report = {
        id: reportId,
        templateId: config.templateId ?? 'custom',
        name: config.name,
        type: config.type,
        status: 'generating',
        generatedAt: new Date(),
        generatedBy: 'system', // In real implementation, get from auth context
        data: {},
        format: config.format,
        metadata: {
          timeRange: config.timeRange,
          recipients: config.recipients ?? [],
        },
      };

      this.reports.set(reportId, report);

      // Simulate report generation
      await this.generateReportData(report, config);

      report.status = 'completed';
      report.filePath = `/reports/${reportId}.${config.format}`;
      report.fileSize = Math.floor(Math.random() * 1000000) + 100000; // Random file size

      this.logger.log(
        `Generated report ${reportId} with ${config.sections.length} sections`
      );

      return {
        success: true,
        reportId,
        report,
      };
    } catch (error) {
      this.logger.error('Failed to generate report', error);
      throw error;
    }
  }

  async getScheduledReports(): Promise<{
    scheduled: ReportTemplate[];
    total: number;
    active: number;
    inactive: number;
  }> {
    try {
      this.logger.log('Getting scheduled reports');

      const scheduled = Array.from(this.scheduledReports.values());
      const active = scheduled.filter(
        template => template.schedule?.enabled === true
      ).length;
      const inactive = scheduled.filter(
        template => template.schedule?.enabled === false
      ).length;

      return {
        scheduled,
        total: scheduled.length,
        active,
        inactive,
      };
    } catch (error) {
      this.logger.error('Failed to get scheduled reports', error);
      throw error;
    }
  }

  async createReportTemplate(template: Omit<ReportTemplate, 'id'>): Promise<{
    success: boolean;
    templateId: string;
    template: ReportTemplate;
  }> {
    try {
      this.logger.log(`Creating report template: ${template.name}`);

      const templateId = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newTemplate: ReportTemplate = {
        ...template,
        id: templateId,
      };

      this.reportTemplates.set(templateId, newTemplate);

      // Add to scheduled reports if schedule is enabled
      if (template.schedule?.enabled === true) {
        this.scheduledReports.set(templateId, newTemplate);
      }

      this.logger.log(`Created report template ${templateId}`);

      return {
        success: true,
        templateId,
        template: newTemplate,
      };
    } catch (error) {
      this.logger.error('Failed to create report template', error);
      throw error;
    }
  }

  async getReportTemplates(): Promise<{
    templates: ReportTemplate[];
    total: number;
    byType: Record<string, number>;
  }> {
    try {
      this.logger.log('Getting report templates');

      const templates = Array.from(this.reportTemplates.values());
      const byType: Record<string, number> = {};

      for (const template of templates) {
        byType[template.type] = (byType[template.type] ?? 0) + 1;
      }

      return {
        templates,
        total: templates.length,
        byType,
      };
    } catch (error) {
      this.logger.error('Failed to get report templates', error);
      throw error;
    }
  }

  async getReport(reportId: string): Promise<{
    report: Report | null;
    data: Record<string, unknown>;
  }> {
    try {
      this.logger.log(`Getting report: ${reportId}`);

      const report = this.reports.get(reportId);
      if (!report) {
        return {
          report: null,
          data: {},
        };
      }

      return {
        report,
        data: report.data,
      };
    } catch (error) {
      this.logger.error('Failed to get report', error);
      throw error;
    }
  }

  async getReports(timeRange?: string): Promise<{
    reports: Report[];
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  }> {
    try {
      this.logger.log(`Getting reports for time range: ${timeRange ?? 'all'}`);

      let reports = Array.from(this.reports.values());

      if (timeRange != null) {
        const cutoffTime = this.getCutoffTime(timeRange);
        reports = reports.filter(report => report.generatedAt >= cutoffTime);
      }

      // Sort by generation time descending
      reports.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());

      const byStatus: Record<string, number> = {};
      const byType: Record<string, number> = {};

      for (const report of reports) {
        byStatus[report.status] = (byStatus[report.status] ?? 0) + 1;
        byType[report.type] = (byType[report.type] ?? 0) + 1;
      }

      return {
        reports,
        total: reports.length,
        byStatus,
        byType,
      };
    } catch (error) {
      this.logger.error('Failed to get reports', error);
      throw error;
    }
  }

  async scheduleReport(
    templateId: string,
    schedule: ReportTemplate['schedule']
  ): Promise<{
    success: boolean;
    scheduled: boolean;
  }> {
    try {
      this.logger.log(`Scheduling report template: ${templateId}`);

      const template = this.reportTemplates.get(templateId);
      if (!template) {
        return {
          success: false,
          scheduled: false,
        };
      }

      template.schedule = schedule ?? {
        enabled: false,
        frequency: 'daily',
        time: '09:00',
      };

      if (schedule?.enabled === true) {
        this.scheduledReports.set(templateId, template);
      } else {
        this.scheduledReports.delete(templateId);
      }

      this.logger.log(
        `Report template ${templateId} ${schedule?.enabled === true ? 'scheduled' : 'unscheduled'}`
      );

      return {
        success: true,
        scheduled: schedule?.enabled === true,
      };
    } catch (error) {
      this.logger.error('Failed to schedule report', error);
      throw error;
    }
  }

  async executeScheduledReports(): Promise<{
    executed: number;
    reports: Report[];
  }> {
    try {
      this.logger.log('Executing scheduled reports');

      const now = new Date();
      const executedReports: Report[] = [];

      for (const [templateId, template] of this.scheduledReports) {
        if (template.schedule?.enabled !== true) continue;

        const shouldExecute = this.shouldExecuteSchedule(
          template.schedule,
          now
        );
        if (shouldExecute) {
          const reportConfig: ReportConfig = {
            templateId,
            name: `${template.name} - ${now.toISOString().split('T')[0]}`,
            type: template.type,
            timeRange: this.getDefaultTimeRange(template.schedule.frequency),
            sections: template.sections,
            format: template.format,
            recipients: template.recipients,
          };

          const result = await this.generateReport(reportConfig);
          executedReports.push(result.report);
        }
      }

      this.logger.log(`Executed ${executedReports.length} scheduled reports`);

      return {
        executed: executedReports.length,
        reports: executedReports,
      };
    } catch (error) {
      this.logger.error('Failed to execute scheduled reports', error);
      throw error;
    }
  }

  private async generateReportData(
    report: Report,
    config: ReportConfig
  ): Promise<void> {
    // Simulate report data generation
    const data: Record<string, unknown> = {};

    for (const section of config.sections) {
      switch (section.type) {
        case 'chart':
          data[section.title] = {
            type: 'line',
            data: Array.from({ length: 24 }, (_, i) => ({
              x: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
              y: Math.random() * 100,
            })),
          };
          break;

        case 'table':
          data[section.title] = {
            columns: ['Metric', 'Value', 'Change'],
            rows: Array.from({ length: 5 }, (_, i) => [
              `Metric ${i + 1}`,
              Math.random() * 1000,
              `${Math.random() > 0.5 ? '+' : '-'}${Math.random() * 20}%`,
            ]),
          };
          break;

        case 'metric':
          data[section.title] = {
            value: Math.random() * 1000,
            unit: 'ms',
            trend: Math.random() > 0.5 ? 'up' : 'down',
            change: Math.random() * 20,
          };
          break;

        case 'text':
          data[section.title] = {
            content: `Report section: ${section.title}\nGenerated at: ${new Date().toISOString()}`,
          };
          break;
      }
    }

    report.data = data;
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: ReportTemplate[] = [
      {
        id: 'performance-daily',
        name: 'Daily Performance Report',
        description: 'Daily system performance metrics',
        type: 'performance',
        sections: [
          {
            title: 'CPU Usage',
            type: 'chart',
            config: { metric: 'cpu.usage', timeRange: '24h' },
          },
          {
            title: 'Memory Usage',
            type: 'chart',
            config: { metric: 'memory.usage', timeRange: '24h' },
          },
          {
            title: 'Response Time',
            type: 'metric',
            config: { metric: 'response_time' },
          },
        ],
        schedule: {
          enabled: true,
          frequency: 'daily',
          time: '08:00',
        },
        recipients: ['admin@example.com'],
        format: 'pdf',
        metadata: { category: 'system' },
      },
      {
        id: 'error-weekly',
        name: 'Weekly Error Report',
        description: 'Weekly error analysis and trends',
        type: 'error',
        sections: [
          {
            title: 'Error Trends',
            type: 'chart',
            config: { query: 'level:error', timeRange: '7d' },
          },
          {
            title: 'Top Errors',
            type: 'table',
            config: { query: 'level:error', limit: 10 },
          },
        ],
        schedule: {
          enabled: true,
          frequency: 'weekly',
          time: '09:00',
          dayOfWeek: 1, // Monday
        },
        recipients: ['devops@example.com'],
        format: 'html',
        metadata: { category: 'errors' },
      },
    ];

    for (const template of defaultTemplates) {
      this.reportTemplates.set(template.id, template);
      if (template.schedule?.enabled === true) {
        this.scheduledReports.set(template.id, template);
      }
    }
  }

  private shouldExecuteSchedule(
    schedule: NonNullable<ReportTemplate['schedule']>,
    now: Date
  ): boolean {
    if (!schedule.enabled) return false;

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const [scheduleHour, scheduleMinute] = schedule.time.split(':').map(Number);

    // Check if current time matches schedule time (within 1 minute)
    if (
      currentHour !== scheduleHour ||
      Math.abs(currentMinute - (scheduleMinute ?? 0)) > 1
    ) {
      return false;
    }

    switch (schedule.frequency) {
      case 'daily':
        return true;
      case 'weekly':
        return now.getDay() === schedule.dayOfWeek;
      case 'monthly':
        return now.getDate() === schedule.dayOfMonth;
      default:
        return false;
    }
  }

  private getDefaultTimeRange(frequency: string): string {
    switch (frequency) {
      case 'daily':
        return '24h';
      case 'weekly':
        return '7d';
      case 'monthly':
        return '30d';
      default:
        return '24h';
    }
  }

  private getCutoffTime(timeRange: string): Date {
    const now = new Date();
    const range = timeRange.toLowerCase();

    if (range.includes('1h') || range.includes('hour')) {
      return new Date(now.getTime() - 60 * 60 * 1000);
    } else if (range.includes('24h') || range.includes('day')) {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (range.includes('7d') || range.includes('week')) {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range.includes('30d') || range.includes('month')) {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Default to 24 hours
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}
