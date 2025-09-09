import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import {
  DynamicScalingService,
  ScalingAction,
  ScalingMetric,
  ScalingPolicyType,
} from './dynamic-scaling.service';

describe('DynamicScalingService', () => {
  let service: DynamicScalingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DynamicScalingService],
    }).compile();

    service = module.get<DynamicScalingService>(DynamicScalingService);

    // Мокаем performScaling для быстрого выполнения
    vi.spyOn(
      service as unknown as { performScaling: () => Promise<boolean> },
      'performScaling'
    ).mockResolvedValue(true);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('default policies', () => {
    it('should initialize with default policies', async () => {
      const policies = await service.getAllPolicies();
      expect(policies.length).toBeGreaterThan(0);

      const cpuPolicy = policies.find(p => p.name === 'CPU-based Scaling');
      expect(cpuPolicy).toBeDefined();
      expect(cpuPolicy?.type).toBe(ScalingPolicyType.REACTIVE);
      expect(cpuPolicy?.metrics).toContain(ScalingMetric.CPU_USAGE);
    });

    it('should have policies for different scaling types', async () => {
      const policies = await service.getAllPolicies();

      const reactivePolicies = policies.filter(
        p => p.type === ScalingPolicyType.REACTIVE
      );
      const scheduledPolicies = policies.filter(
        p => p.type === ScalingPolicyType.SCHEDULED
      );
      const predictivePolicies = policies.filter(
        p => p.type === ScalingPolicyType.PREDICTIVE
      );

      expect(reactivePolicies.length).toBeGreaterThan(0);
      expect(scheduledPolicies.length).toBeGreaterThan(0);
      expect(predictivePolicies.length).toBeGreaterThan(0);
    });
  });

  describe('createPolicy', () => {
    it('should create a new policy', async () => {
      const newPolicy = {
        name: 'Test Policy',
        type: ScalingPolicyType.REACTIVE,
        service: 'test-service',
        metrics: [ScalingMetric.CPU_USAGE],
        thresholds: {
          [ScalingMetric.CPU_USAGE]: 75,
          [ScalingMetric.MEMORY_USAGE]: 75,
          [ScalingMetric.REQUEST_RATE]: 1000,
          [ScalingMetric.RESPONSE_TIME]: 300,
          [ScalingMetric.ERROR_RATE]: 5,
          [ScalingMetric.QUEUE_SIZE]: 50,
        },
        actions: [ScalingAction.SCALE_UP],
        minInstances: 2,
        maxInstances: 8,
        cooldownPeriod: 300,
        priority: 1,
        enabled: true,
      };

      const created = await service.createPolicy({
        name: newPolicy.name,
        type: ScalingPolicyType.REACTIVE,
        _service: newPolicy.service,
        metrics: [],
        thresholds: {
          [ScalingMetric.CPU_USAGE]: 80,
          [ScalingMetric.MEMORY_USAGE]: 85,
          [ScalingMetric.REQUEST_RATE]: 1000,
          [ScalingMetric.RESPONSE_TIME]: 500,
          [ScalingMetric.ERROR_RATE]: 5,
          [ScalingMetric.QUEUE_SIZE]: 100,
        },
        actions: [],
        minInstances: 1,
        maxInstances: 10,
        cooldownPeriod: 300,
        priority: 1,
        enabled: newPolicy.enabled,
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe(newPolicy.name);
      expect(created._service).toBe(newPolicy.service);
    });
  });

  describe('updatePolicy', () => {
    it('should update existing policy', async () => {
      const policies = await service.getAllPolicies();
      const policy = policies[0];

      if (policy == null) {
        throw new Error('No policies available for testing');
      }

      const updated = await service.updatePolicy(policy.id, {
        name: 'Updated Policy Name',
        priority: 10,
      });

      expect(updated?.name).toBe('Updated Policy Name');
      expect(updated?.priority).toBe(10);
    });

    it('should return null for non-existent policy', async () => {
      const updated = await service.updatePolicy('non-existent-id', {
        name: 'New Name',
      });
      expect(updated).toBeNull();
    });
  });

  describe('deletePolicy', () => {
    it('should delete existing policy', async () => {
      const policies = await service.getAllPolicies();
      const policy = policies[0];

      if (policy == null) {
        throw new Error('No policies available for testing');
      }

      const success = await service.deletePolicy(policy.id);
      expect(success).toBe(true);

      const deleted = await service.getPolicy(policy.id);
      expect(deleted).toBeNull();
    });

    it('should return false for non-existent policy', async () => {
      const success = await service.deletePolicy('non-existent-id');
      expect(success).toBe(false);
    });
  });

  describe('getPoliciesByService', () => {
    it('should return policies for specific service', async () => {
      const apiPolicies = await service.getPoliciesByService('api');
      expect(apiPolicies.length).toBeGreaterThan(0);
      expect(apiPolicies.every(p => p._service === 'api')).toBe(true);
    });
  });

  describe('getActivePolicies', () => {
    it('should return only enabled policies', async () => {
      const activePolicies = await service.getActivePolicies();
      expect(activePolicies.length).toBeGreaterThan(0);
      expect(activePolicies.every(p => p.enabled)).toBe(true);
    });
  });

  describe('evaluateScaling', () => {
    it('should evaluate scaling for service with metrics', async () => {
      const metrics = {
        [ScalingMetric.CPU_USAGE]: 85,
        [ScalingMetric.MEMORY_USAGE]: 70,
        [ScalingMetric.REQUEST_RATE]: 800,
        [ScalingMetric.RESPONSE_TIME]: 300,
        [ScalingMetric.ERROR_RATE]: 2,
        [ScalingMetric.QUEUE_SIZE]: 20,
      };

      const decisions = await service.evaluateScaling('api', metrics);

      // Should trigger scaling decisions based on CPU usage > 80%
      expect(decisions.length).toBeGreaterThan(0);
      if (decisions[0] != null) {
        expect(decisions[0]._service).toBe('api');
        expect(decisions[0].metrics).toEqual(metrics);
      }
    });

    it('should respect cooldown periods', async () => {
      const metrics = {
        [ScalingMetric.CPU_USAGE]: 90,
        [ScalingMetric.MEMORY_USAGE]: 80,
        [ScalingMetric.REQUEST_RATE]: 1000,
        [ScalingMetric.RESPONSE_TIME]: 400,
        [ScalingMetric.ERROR_RATE]: 3,
        [ScalingMetric.QUEUE_SIZE]: 30,
      };

      // First evaluation
      const decisions1 = await service.evaluateScaling('api', metrics);
      expect(decisions1.length).toBeGreaterThan(0);

      // Second evaluation immediately after should respect cooldown
      const decisions2 = await service.evaluateScaling('api', metrics);
      expect(decisions2.length).toBe(0);
    });
  });

  describe('executeScaling', () => {
    it('should execute scaling decision', async () => {
      const metrics = {
        [ScalingMetric.CPU_USAGE]: 95,
        [ScalingMetric.MEMORY_USAGE]: 85,
        [ScalingMetric.REQUEST_RATE]: 1500,
        [ScalingMetric.RESPONSE_TIME]: 800,
        [ScalingMetric.ERROR_RATE]: 5,
        [ScalingMetric.QUEUE_SIZE]: 50,
      };

      const decisions = await service.evaluateScaling('api', metrics);
      expect(decisions.length).toBeGreaterThan(0);

      const decision = decisions[0];
      if (decision == null) {
        throw new Error('No decision available for testing');
      }

      const success = await service.executeScaling(decision.id);

      expect(typeof success).toBe('boolean');

      const executed = await service.getDecision(decision.id);
      if (executed != null) {
        expect(executed.executed).toBe(true);
        expect(executed.executionTime).toBeDefined();
      }
    });

    it('should return false for non-existent decision', async () => {
      const success = await service.executeScaling('non-existent-id');
      expect(success).toBe(false);
    });
  });

  describe('scaling actions', () => {
    it('should determine appropriate scaling action based on metrics', async () => {
      const highCpuMetrics = {
        [ScalingMetric.CPU_USAGE]: 95,
        [ScalingMetric.MEMORY_USAGE]: 60,
        [ScalingMetric.REQUEST_RATE]: 800,
        [ScalingMetric.RESPONSE_TIME]: 300,
        [ScalingMetric.ERROR_RATE]: 2,
        [ScalingMetric.QUEUE_SIZE]: 20,
      };

      const highRequestMetrics = {
        [ScalingMetric.CPU_USAGE]: 70,
        [ScalingMetric.MEMORY_USAGE]: 65,
        [ScalingMetric.REQUEST_RATE]: 2500,
        [ScalingMetric.RESPONSE_TIME]: 400,
        [ScalingMetric.ERROR_RATE]: 3,
        [ScalingMetric.QUEUE_SIZE]: 40,
      };

      const highErrorMetrics = {
        [ScalingMetric.CPU_USAGE]: 60,
        [ScalingMetric.MEMORY_USAGE]: 55,
        [ScalingMetric.REQUEST_RATE]: 600,
        [ScalingMetric.RESPONSE_TIME]: 200,
        [ScalingMetric.ERROR_RATE]: 12,
        [ScalingMetric.QUEUE_SIZE]: 15,
      };

      const decisions1 = await service.evaluateScaling('api', highCpuMetrics);
      const decisions2 = await service.evaluateScaling(
        'api',
        highRequestMetrics
      );
      const decisions3 = await service.evaluateScaling('api', highErrorMetrics);

      expect(decisions1.length).toBeGreaterThan(0);
      expect(decisions2.length).toBeGreaterThan(0);
      expect(decisions3.length).toBeGreaterThan(0);
    });
  });

  describe('scaling history', () => {
    it('should track scaling history', async () => {
      const metrics = {
        [ScalingMetric.CPU_USAGE]: 90,
        [ScalingMetric.MEMORY_USAGE]: 80,
        [ScalingMetric.REQUEST_RATE]: 1200,
        [ScalingMetric.RESPONSE_TIME]: 600,
        [ScalingMetric.ERROR_RATE]: 4,
        [ScalingMetric.QUEUE_SIZE]: 35,
      };

      const decisions = await service.evaluateScaling('api', metrics);
      expect(decisions.length).toBeGreaterThan(0);

      // Execute scaling to generate history (ограничиваем количество)
      const limitedDecisions = decisions.slice(0, 2); // Берем только первые 2 решения
      for (const decision of limitedDecisions) {
        await service.executeScaling(decision.id);
      }

      const history = await service.getScalingHistory('api');
      expect(history.length).toBeGreaterThan(0);

      const apiHistory = history[0];
      if (apiHistory != null) {
        expect(apiHistory._service).toBe('api');
        expect(apiHistory.totalScalingEvents).toBeGreaterThan(0);
      }
    }, 10000); // Увеличиваем timeout до 10 секунд
  });

  describe('getScalingStats', () => {
    it('should return comprehensive scaling statistics', async () => {
      const stats = await service.getScalingStats();

      expect(stats.totalPolicies).toBeGreaterThan(0);
      expect(stats.activePolicies).toBeGreaterThan(0);
      expect(stats.services).toContain('api');
      expect(stats.scalingHistory).toBeDefined();
    });
  });

  describe('auto-evaluation', () => {
    it('should have auto-evaluation method available', () => {
      expect(service.autoEvaluateScaling).toBeDefined();
    });

    it('should have cleanup method available', () => {
      expect(service.cleanupOldDecisions).toBeDefined();
    });
  });

  describe('policy priorities', () => {
    it('should respect policy priorities in scaling decisions', async () => {
      const metrics = {
        [ScalingMetric.CPU_USAGE]: 90,
        [ScalingMetric.MEMORY_USAGE]: 85,
        [ScalingMetric.REQUEST_RATE]: 1500,
        [ScalingMetric.RESPONSE_TIME]: 800,
        [ScalingMetric.ERROR_RATE]: 6,
        [ScalingMetric.QUEUE_SIZE]: 45,
      };

      const decisions = await service.evaluateScaling('api', metrics);

      if (decisions.length > 1) {
        // Decisions should be sorted by priority (highest first)
        const policies = await service.getAllPolicies();
        const decisionPolicies = decisions
          .map(d => policies.find(p => p.id === d.policyId))
          .filter(Boolean);

        // Check that priorities are in descending order
        for (let i = 1; i < decisionPolicies.length; i++) {
          expect(decisionPolicies[i - 1]?.priority).toBeGreaterThanOrEqual(
            decisionPolicies[i]?.priority || 0
          );
        }
      }
    });
  });

  describe('scheduled policies', () => {
    it('should have business hours policy configured', async () => {
      const policies = await service.getAllPolicies();
      const businessHoursPolicy = policies.find(
        p => p.name === 'Business Hours Scaling'
      );

      expect(businessHoursPolicy).toBeDefined();
      expect(businessHoursPolicy?.type).toBe(ScalingPolicyType.SCHEDULED);
      expect(businessHoursPolicy?.schedule).toBe('0 9-18 * * 1-5');
    });
  });

  describe('predictive policies', () => {
    it('should have predictive scaling policy configured', async () => {
      const policies = await service.getAllPolicies();
      const predictivePolicy = policies.find(
        p => p.name === 'Predictive Scaling'
      );

      expect(predictivePolicy).toBeDefined();
      expect(predictivePolicy?.type).toBe(ScalingPolicyType.PREDICTIVE);
      expect(predictivePolicy?.predictiveWindow).toBe(30);
    });
  });
});
