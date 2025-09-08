import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AutomatedReportsService } from '../automated-reports.service';

describe('AutomatedReportsService', () => {
  let service: AutomatedReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AutomatedReportsService],
    }).compile();

    service = module.get<AutomatedReportsService>(AutomatedReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateReport', () => {
    it('should generate report successfully', async () => {
      const config = {
        name: 'Test Report',
        type: 'performance' as const,
        timeRange: '24h',
        sections: [
          {
            title: 'CPU Usage',
            type: 'chart' as const,
            config: { metric: 'cpu.usage' },
          },
          {
            title: 'Memory Usage',
            type: 'metric' as const,
            config: { metric: 'memory.usage' },
          },
        ],
        format: 'pdf' as const,
        recipients: ['admin@example.com'],
      };

      const result = await service.generateReport(config);

      expect(result.success).toBe(true);
      expect(result.reportId).toBeDefined();
      expect(result.report).toBeDefined();
      expect(result.report.name).toBe(config.name);
      expect(result.report.type).toBe(config.type);
      expect(result.report.status).toBe('completed');
      expect(result.report.filePath).toBeDefined();
      expect(result.report.fileSize).toBeGreaterThan(0);
    });

    it('should generate report with minimal config', async () => {
      const config = {
        name: 'Minimal Report',
        type: 'usage' as const,
        timeRange: '1h',
        sections: [],
        format: 'html' as const,
      };

      const result = await service.generateReport(config);

      expect(result.success).toBe(true);
      expect(result.reportId).toBeDefined();
      expect(result.report.name).toBe(config.name);
      expect(result.report.type).toBe(config.type);
      expect(result.report.status).toBe('completed');
    });

    it('should generate report with different formats', async () => {
      const formats = ['pdf', 'html', 'json', 'csv'] as const;

      for (const format of formats) {
        const config = {
          name: `${format.toUpperCase()} Report`,
          type: 'performance' as const,
          timeRange: '24h',
          sections: [
            {
              title: 'Test Section',
              type: 'metric' as const,
              config: { metric: 'test.metric' },
            },
          ],
          format,
        };

        const result = await service.generateReport(config);

        expect(result.success).toBe(true);
        expect(result.report.format).toBe(format);
        expect(result.report.filePath).toContain(`.${format}`);
      }
    });

    it('should generate report with different types', async () => {
      const types = [
        'performance',
        'security',
        'usage',
        'error',
        'custom',
      ] as const;

      for (const type of types) {
        const config = {
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
          type,
          timeRange: '24h',
          sections: [
            {
              title: 'Test Section',
              type: 'metric' as const,
              config: { metric: 'test.metric' },
            },
          ],
          format: 'pdf' as const,
        };

        const result = await service.generateReport(config);

        expect(result.success).toBe(true);
        expect(result.report.type).toBe(type);
      }
    });

    it('should generate unique report IDs', async () => {
      const config1 = {
        name: 'Report 1',
        type: 'performance' as const,
        timeRange: '24h',
        sections: [],
        format: 'pdf' as const,
      };

      const config2 = {
        name: 'Report 2',
        type: 'security' as const,
        timeRange: '24h',
        sections: [],
        format: 'html' as const,
      };

      const result1 = await service.generateReport(config1);
      const result2 = await service.generateReport(config2);

      expect(result1.reportId).not.toBe(result2.reportId);
    });
  });

  describe('getScheduledReports', () => {
    it('should return scheduled reports', async () => {
      const result = await service.getScheduledReports();

      expect(result.scheduled).toBeDefined();
      expect(Array.isArray(result.scheduled)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.active).toBeGreaterThanOrEqual(0);
      expect(result.inactive).toBeGreaterThanOrEqual(0);
    });

    it('should have correct totals', async () => {
      const result = await service.getScheduledReports();

      expect(result.total).toBe(result.active + result.inactive);
    });

    it('should return templates with valid structure', async () => {
      const result = await service.getScheduledReports();

      for (const template of result.scheduled) {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('type');
        expect(template).toHaveProperty('sections');
        expect(template).toHaveProperty('recipients');
        expect(template).toHaveProperty('format');
        expect(template).toHaveProperty('metadata');

        expect(Array.isArray(template.sections)).toBe(true);
        expect(Array.isArray(template.recipients)).toBe(true);
      }
    });
  });

  describe('createReportTemplate', () => {
    it('should create report template successfully', async () => {
      const template = {
        name: 'Test Template',
        description: 'A test report template',
        type: 'performance' as const,
        sections: [
          {
            title: 'CPU Usage',
            type: 'chart' as const,
            config: { metric: 'cpu.usage' },
          },
        ],
        schedule: {
          enabled: true,
          frequency: 'daily' as const,
          time: '08:00',
        },
        recipients: ['admin@example.com'],
        format: 'pdf' as const,
        metadata: { category: 'system' },
      };

      const result = await service.createReportTemplate(template);

      expect(result.success).toBe(true);
      expect(result.templateId).toBeDefined();
      expect(result.template).toBeDefined();
      expect(result.template.name).toBe(template.name);
      expect(result.template.description).toBe(template.description);
      expect(result.template.type).toBe(template.type);
      expect(result.template.schedule?.enabled).toBe(template.schedule.enabled);
    });

    it('should create template with minimal config', async () => {
      const template = {
        name: 'Minimal Template',
        description: 'Minimal template',
        type: 'usage' as const,
        sections: [],
        recipients: [],
        format: 'html' as const,
        metadata: {},
      };

      const result = await service.createReportTemplate(template);

      expect(result.success).toBe(true);
      expect(result.templateId).toBeDefined();
      expect(result.template.name).toBe(template.name);
    });

    it('should add to scheduled reports when schedule is enabled', async () => {
      const template = {
        name: 'Scheduled Template',
        description: 'Template with schedule',
        type: 'performance' as const,
        sections: [],
        schedule: {
          enabled: true,
          frequency: 'weekly' as const,
          time: '09:00',
          dayOfWeek: 1,
        },
        recipients: ['admin@example.com'],
        format: 'pdf' as const,
        metadata: {},
      };

      const result = await service.createReportTemplate(template);

      expect(result.success).toBe(true);

      const scheduledReports = await service.getScheduledReports();
      const scheduledTemplate = scheduledReports.scheduled.find(
        t => t.id === result.templateId
      );
      expect(scheduledTemplate).toBeDefined();
    });

    it('should not add to scheduled reports when schedule is disabled', async () => {
      const template = {
        name: 'Non-Scheduled Template',
        description: 'Template without schedule',
        type: 'performance' as const,
        sections: [],
        schedule: {
          enabled: false,
          frequency: 'daily' as const,
          time: '08:00',
        },
        recipients: ['admin@example.com'],
        format: 'pdf' as const,
        metadata: {},
      };

      const result = await service.createReportTemplate(template);

      expect(result.success).toBe(true);

      const scheduledReports = await service.getScheduledReports();
      const scheduledTemplate = scheduledReports.scheduled.find(
        t => t.id === result.templateId
      );
      expect(scheduledTemplate).toBeUndefined();
    });
  });

  describe('getReportTemplates', () => {
    beforeEach(async () => {
      // Create some test templates
      await service.createReportTemplate({
        name: 'Performance Template',
        description: 'Performance report template',
        type: 'performance',
        sections: [],
        recipients: [],
        format: 'pdf',
        metadata: {},
      });

      await service.createReportTemplate({
        name: 'Security Template',
        description: 'Security report template',
        type: 'security',
        sections: [],
        recipients: [],
        format: 'html',
        metadata: {},
      });
    });

    it('should return all report templates', async () => {
      const result = await service.getReportTemplates();

      expect(result.templates).toBeDefined();
      expect(Array.isArray(result.templates)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.byType).toBeDefined();
    });

    it('should aggregate templates by type', async () => {
      const result = await service.getReportTemplates();

      expect(result.byType).toBeDefined();
      expect(typeof result.byType).toBe('object');

      // Should have at least performance and security types
      expect(result.byType.performance).toBeGreaterThanOrEqual(1);
      expect(result.byType.security).toBeGreaterThanOrEqual(1);
    });

    it('should return templates with valid structure', async () => {
      const result = await service.getReportTemplates();

      for (const template of result.templates) {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('type');
        expect(template).toHaveProperty('sections');
        expect(template).toHaveProperty('recipients');
        expect(template).toHaveProperty('format');
        expect(template).toHaveProperty('metadata');

        expect(Array.isArray(template.sections)).toBe(true);
        expect(Array.isArray(template.recipients)).toBe(true);
      }
    });
  });

  describe('getReport', () => {
    let reportId: string;

    beforeEach(async () => {
      const result = await service.generateReport({
        name: 'Test Report',
        type: 'performance',
        timeRange: '24h',
        sections: [
          {
            title: 'Test Section',
            type: 'metric',
            config: { metric: 'test.metric' },
          },
        ],
        format: 'pdf',
      });
      reportId = result.reportId;
    });

    it('should return report with data', async () => {
      const result = await service.getReport(reportId);

      expect(result.report).toBeDefined();
      expect(result.report?.id).toBe(reportId);
      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('object');
    });

    it('should return null for non-existent report', async () => {
      const result = await service.getReport('non-existent-id');

      expect(result.report).toBeNull();
      expect(result.data).toEqual({});
    });
  });

  describe('getReports', () => {
    beforeEach(async () => {
      // Generate some test reports
      await service.generateReport({
        name: 'Report 1',
        type: 'performance',
        timeRange: '24h',
        sections: [],
        format: 'pdf',
      });

      await service.generateReport({
        name: 'Report 2',
        type: 'security',
        timeRange: '7d',
        sections: [],
        format: 'html',
      });
    });

    it('should return all reports', async () => {
      const result = await service.getReports();

      expect(result.reports).toBeDefined();
      expect(Array.isArray(result.reports)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.byStatus).toBeDefined();
      expect(result.byType).toBeDefined();
    });

    it('should return reports for specific time range', async () => {
      const timeRanges = ['1h', '24h', '7d', '30d'];

      for (const timeRange of timeRanges) {
        const result = await service.getReports(timeRange);

        expect(result.reports).toBeDefined();
        expect(Array.isArray(result.reports)).toBe(true);
        expect(result.total).toBeGreaterThanOrEqual(0);
        expect(result.byStatus).toBeDefined();
        expect(result.byType).toBeDefined();
      }
    });

    it('should aggregate reports by status and type', async () => {
      const result = await service.getReports();

      expect(result.byStatus).toBeDefined();
      expect(result.byType).toBeDefined();
      expect(typeof result.byStatus).toBe('object');
      expect(typeof result.byType).toBe('object');
    });

    it('should sort reports by generation time descending', async () => {
      const result = await service.getReports();

      if (result.reports.length > 1) {
        for (let i = 1; i < result.reports.length; i++) {
          expect(
            result.reports?.[i]?.generatedAt.getTime()
          ).toBeLessThanOrEqual(
            result.reports?.[i - 1]?.generatedAt.getTime() ?? 0
          );
        }
      }
    });
  });

  describe('scheduleReport', () => {
    let templateId: string;

    beforeEach(async () => {
      const result = await service.createReportTemplate({
        name: 'Test Template',
        description: 'Test template',
        type: 'performance',
        sections: [],
        recipients: [],
        format: 'pdf',
        metadata: {},
      });
      templateId = result.templateId;
    });

    it('should schedule report successfully', async () => {
      const schedule = {
        enabled: true,
        frequency: 'daily' as const,
        time: '08:00',
      };

      const result = await service.scheduleReport(templateId, schedule);

      expect(result.success).toBe(true);
      expect(result.scheduled).toBe(true);
    });

    it('should unschedule report successfully', async () => {
      const schedule = {
        enabled: false,
        frequency: 'daily' as const,
        time: '08:00',
      };

      const result = await service.scheduleReport(templateId, schedule);

      expect(result.success).toBe(true);
      expect(result.scheduled).toBe(false);
    });

    it('should return false for non-existent template', async () => {
      const schedule = {
        enabled: true,
        frequency: 'daily' as const,
        time: '08:00',
      };

      const result = await service.scheduleReport('non-existent-id', schedule);

      expect(result.success).toBe(false);
      expect(result.scheduled).toBe(false);
    });
  });

  describe('executeScheduledReports', () => {
    it('should execute scheduled reports', async () => {
      const result = await service.executeScheduledReports();

      expect(result.executed).toBeGreaterThanOrEqual(0);
      expect(result.reports).toBeDefined();
      expect(Array.isArray(result.reports)).toBe(true);
    });

    it('should return executed reports with valid structure', async () => {
      const result = await service.executeScheduledReports();

      for (const report of result.reports) {
        expect(report).toHaveProperty('id');
        expect(report).toHaveProperty('name');
        expect(report).toHaveProperty('type');
        expect(report).toHaveProperty('status');
        expect(report).toHaveProperty('generatedAt');
        expect(report).toHaveProperty('generatedBy');
        expect(report).toHaveProperty('data');
        expect(report).toHaveProperty('metadata');

        expect(report.generatedAt).toBeInstanceOf(Date);
        expect(report.status).toBe('completed');
      }
    });
  });
});
