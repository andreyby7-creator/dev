import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AlertingService } from '../alerting.service';

describe('AlertingService', () => {
  let service: AlertingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertingService],
    }).compile();

    service = module.get<AlertingService>(AlertingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('configureAlerts', () => {
    it('should configure alerts successfully', async () => {
      const config = {
        rules: [
          {
            id: 'rule-1',
            name: 'High CPU Usage',
            metric: 'cpu.usage',
            condition: 'gt' as const,
            threshold: 80,
            severity: 'high' as const,
            enabled: true,
            cooldown: 300,
          },
          {
            id: 'rule-2',
            name: 'Low Memory',
            metric: 'memory.usage',
            condition: 'lt' as const,
            threshold: 10,
            severity: 'medium' as const,
            enabled: true,
            cooldown: 600,
          },
        ],
        channels: ['email', 'slack'],
        escalation: {
          enabled: true,
          levels: [
            {
              delay: 5,
              channels: ['email'],
            },
            {
              delay: 15,
              channels: ['slack', 'sms'],
            },
          ],
        },
      };

      const result = await service.configureAlerts(config);

      expect(result.success).toBe(true);
      expect(result.rulesConfigured).toBe(2);
      expect(result.channelsConfigured).toBe(2);
    });

    it('should handle empty rules configuration', async () => {
      const config = {
        rules: [],
        channels: ['email'],
        escalation: {
          enabled: false,
          levels: [],
        },
      };

      const result = await service.configureAlerts(config);

      expect(result.success).toBe(true);
      expect(result.rulesConfigured).toBe(0);
      expect(result.channelsConfigured).toBe(1);
    });
  });

  describe('getAlertStatus', () => {
    it('should return alert status', async () => {
      // First configure some alerts
      await service.configureAlerts({
        rules: [
          {
            id: 'rule-1',
            name: 'Test Rule',
            metric: 'test.metric',
            condition: 'gt',
            threshold: 50,
            severity: 'medium',
            enabled: true,
            cooldown: 300,
          },
        ],
        channels: ['email'],
        escalation: {
          enabled: false,
          levels: [],
        },
      });

      const result = await service.getAlertStatus();

      expect(result.totalRules).toBe(1);
      expect(result.activeAlerts).toBe(0);
      expect(result.resolvedAlerts).toBe(0);
      expect(result.acknowledgedAlerts).toBe(0);
      expect(result.alerts).toBeDefined();
    });
  });

  describe('evaluateAlerts', () => {
    beforeEach(async () => {
      await service.configureAlerts({
        rules: [
          {
            id: 'rule-1',
            name: 'High CPU Usage',
            metric: 'cpu.usage',
            condition: 'gt',
            threshold: 80,
            severity: 'high',
            enabled: true,
            cooldown: 0, // No cooldown for testing
          },
          {
            id: 'rule-2',
            name: 'Low Memory',
            metric: 'memory.usage',
            condition: 'lt',
            threshold: 10,
            severity: 'medium',
            enabled: true,
            cooldown: 0,
          },
        ],
        channels: ['email'],
        escalation: {
          enabled: false,
          levels: [],
        },
      });
    });

    it('should trigger alerts when conditions are met', async () => {
      const metricData = {
        'cpu.usage': 90,
        'memory.usage': 5,
      };

      const result = await service.evaluateAlerts(metricData);

      expect(result.triggered).toBeGreaterThan(0);
      expect(result.newAlerts).toBeDefined();
      expect(result.newAlerts.length).toBeGreaterThan(0);
    });

    it('should not trigger alerts when conditions are not met', async () => {
      const metricData = {
        'cpu.usage': 50,
        'memory.usage': 50,
      };

      const result = await service.evaluateAlerts(metricData);

      expect(result.triggered).toBe(0);
      expect(result.newAlerts).toHaveLength(0);
    });

    it('should resolve alerts when conditions are no longer met', async () => {
      // First trigger an alert
      await service.evaluateAlerts({ 'cpu.usage': 90 });

      // Then resolve it
      const result = await service.evaluateAlerts({ 'cpu.usage': 50 });

      expect(result.resolved).toBeGreaterThan(0);
    });

    it('should handle missing metrics gracefully', async () => {
      const metricData = {
        'other.metric': 100,
      };

      const result = await service.evaluateAlerts(metricData);

      expect(result.triggered).toBe(0);
      expect(result.resolved).toBe(0);
    });
  });

  describe('acknowledgeAlert', () => {
    beforeEach(async () => {
      await service.configureAlerts({
        rules: [
          {
            id: 'rule-1',
            name: 'Test Rule',
            metric: 'test.metric',
            condition: 'gt',
            threshold: 50,
            severity: 'medium',
            enabled: true,
            cooldown: 0,
          },
        ],
        channels: ['email'],
        escalation: {
          enabled: false,
          levels: [],
        },
      });

      // Trigger an alert
      await service.evaluateAlerts({ 'test.metric': 60 });
    });

    it('should acknowledge alert successfully', async () => {
      const alertStatus = await service.getAlertStatus();
      const alert = alertStatus.alerts.find(a => a.status === 'active');

      if (alert) {
        const result = await service.acknowledgeAlert(alert.id, 'admin');

        expect(result.success).toBe(true);
        expect(result.alert).toBeDefined();
        expect(result.alert?.status).toBe('acknowledged');
        expect(result.alert?.acknowledgedBy).toBe('admin');
        expect(result.alert?.acknowledgedAt).toBeDefined();
      }
    });

    it('should return false for non-existent alert', async () => {
      const result = await service.acknowledgeAlert('non-existent-id', 'admin');

      expect(result.success).toBe(false);
      expect(result.alert).toBeNull();
    });
  });

  describe('getAlertHistory', () => {
    beforeEach(async () => {
      await service.configureAlerts({
        rules: [
          {
            id: 'rule-1',
            name: 'Test Rule',
            metric: 'test.metric',
            condition: 'gt',
            threshold: 50,
            severity: 'medium',
            enabled: true,
            cooldown: 0,
          },
        ],
        channels: ['email'],
        escalation: {
          enabled: false,
          levels: [],
        },
      });

      // Trigger some alerts
      await service.evaluateAlerts({ 'test.metric': 60 });
      await service.evaluateAlerts({ 'test.metric': 70 });
    });

    it('should return alert history', async () => {
      const result = await service.getAlertHistory('1h');

      expect(result.timeRange).toBe('1h');
      expect(result.alerts).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBeGreaterThanOrEqual(0);
      expect(result.summary.bySeverity).toBeDefined();
      expect(result.summary.byStatus).toBeDefined();
    });

    it('should return alert history for different time ranges', async () => {
      const timeRanges = ['1h', '24h', '7d', '30d'];

      for (const timeRange of timeRanges) {
        const result = await service.getAlertHistory(timeRange);

        expect(result.timeRange).toBe(timeRange);
        expect(result.alerts).toBeDefined();
        expect(result.summary).toBeDefined();
      }
    });

    it('should aggregate alerts by severity and status', async () => {
      const result = await service.getAlertHistory('1h');

      expect(result.summary.bySeverity).toBeDefined();
      expect(result.summary.byStatus).toBeDefined();
      expect(typeof result.summary.bySeverity).toBe('object');
      expect(typeof result.summary.byStatus).toBe('object');
    });
  });
});
