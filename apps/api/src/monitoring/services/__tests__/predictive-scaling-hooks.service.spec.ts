import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PredictiveScalingHooksService } from '../predictive-scaling-hooks.service';

describe('PredictiveScalingHooksService', () => {
  let service: PredictiveScalingHooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PredictiveScalingHooksService],
    }).compile();

    service = module.get<PredictiveScalingHooksService>(
      PredictiveScalingHooksService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Default Rules', () => {
    it('should have CPU high load rule', () => {
      const rules = service.getAllRules();
      const cpuRule = rules.find(r => r.id === 'cpu-high-load');

      expect(cpuRule).toBeDefined();
      expect(cpuRule?.name).toBe('CPU High Load Scaling');
      expect(cpuRule?.metric).toBe('cpu_usage_percent');
      expect(cpuRule?.condition).toBe('gt');
      expect(cpuRule?.threshold).toBe(80);
      expect(cpuRule?.action).toBe('scale_up');
    });
  });

  describe('Rule Management', () => {
    it('should create new rule', () => {
      const ruleData = {
        name: 'Test Rule',
        description: 'Test Description',
        metric: 'test_metric',
        condition: 'gt' as const,
        threshold: 100,
        duration: 300,
        action: 'scale_up' as const,
        parameters: { factor: 1.5 },
        enabled: true,
        priority: 5,
        cooldown: 300,
      };

      const rule = service.createRule(ruleData);

      expect(rule.id).toBeDefined();
      expect(rule.name).toBe(ruleData.name);
      expect(rule.metric).toBe(ruleData.metric);
      expect(rule.condition).toBe(ruleData.condition);
      expect(rule.threshold).toBe(ruleData.threshold);
      expect(rule.action).toBe(ruleData.action);
    });

    it('should get rule by ID', () => {
      const ruleData = {
        name: 'Test Rule',
        description: 'Test Description',
        metric: 'test_metric',
        condition: 'gt' as const,
        threshold: 100,
        duration: 300,
        action: 'scale_up' as const,
        parameters: { factor: 1.5 },
        enabled: true,
        priority: 5,
        cooldown: 300,
      };

      const createdRule = service.createRule(ruleData);
      const retrievedRule = service.getRule(createdRule.id);

      expect(retrievedRule).toEqual(createdRule);
    });

    it('should get rules by action', () => {
      const scaleUpRules = service.getRulesByAction('scale_up');
      const scaleDownRules = service.getRulesByAction('scale_down');

      expect(scaleUpRules.length).toBeGreaterThan(0);
      expect(scaleUpRules.every(r => r.action === 'scale_up')).toBe(true);
      expect(scaleDownRules.every(r => r.action === 'scale_down')).toBe(true);
    });

    it('should update rule', () => {
      const ruleData = {
        name: 'Test Rule',
        description: 'Test Description',
        metric: 'test_metric',
        condition: 'gt' as const,
        threshold: 100,
        duration: 300,
        action: 'scale_up' as const,
        parameters: { factor: 1.5 },
        enabled: true,
        priority: 5,
        cooldown: 300,
      };

      const createdRule = service.createRule(ruleData);
      const updatedRule = service.updateRule(createdRule.id, {
        name: 'Updated Rule',
        threshold: 150,
      });

      expect(updatedRule?.name).toBe('Updated Rule');
      expect(updatedRule?.threshold).toBe(150);
    });

    it('should delete rule', () => {
      const ruleData = {
        name: 'Test Rule',
        description: 'Test Description',
        metric: 'test_metric',
        condition: 'gt' as const,
        threshold: 100,
        duration: 300,
        action: 'scale_up' as const,
        parameters: { factor: 1.5 },
        enabled: true,
        priority: 5,
        cooldown: 300,
      };

      const createdRule = service.createRule(ruleData);
      const deleted = service.deleteRule(createdRule.id);

      expect(deleted).toBe(true);
      expect(service.getRule(createdRule.id)).toBeNull();
    });
  });

  describe('Metrics Recording', () => {
    it('should record metrics', () => {
      service.recordMetric('test_metric', 100, { label: 'test' });
      const metrics = service.getCurrentMetrics();

      expect(metrics.length).toBeGreaterThan(0);
      const recordedMetric = metrics.find(m => m.name === 'test_metric');
      expect(recordedMetric).toBeDefined();
      expect(recordedMetric?.value).toBe(100);
      expect(recordedMetric?.labels?.label).toBe('test');
    });

    it('should limit buffer size', () => {
      // Заполняем буфер
      for (let i = 0; i < 150; i++) {
        service.recordMetric(`metric_${i}`, i);
      }

      const metrics = service.getCurrentMetrics();
      expect(metrics.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Statistics', () => {
    it('should return correct statistics', () => {
      const stats = service.getStatistics();

      expect(stats.totalRules).toBeGreaterThan(0);
      expect(stats.enabledRules).toBeGreaterThan(0);
      expect(stats.totalEvents).toBeGreaterThanOrEqual(0);
      expect(stats.activeEvents).toBeGreaterThanOrEqual(0);
      expect(stats.successfulEvents).toBeGreaterThanOrEqual(0);
      expect(stats.failedEvents).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Event Management', () => {
    it('should get events by rule', () => {
      const events = service.getEventsByRule('cpu-high-load');
      expect(Array.isArray(events)).toBe(true);
    });

    it('should get active events', () => {
      const activeEvents = service.getActiveEvents();
      expect(Array.isArray(activeEvents)).toBe(true);
    });
  });
});
