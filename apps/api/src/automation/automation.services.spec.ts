import { vi } from 'vitest';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AutomatedMonitoringService } from './automated-monitoring.service';
import { AutomatedScalingService } from './automated-scaling.service';
import { CapacityPlanningService } from './capacity-planning.service';
import { CostManagementService } from './cost-management.service';
import { CostOptimizationAIService } from './cost-optimization-ai.service';
import { DevOpsIntegrationService } from './devops-integration.service';
import { OperationalRunbooksService } from './operational-runbooks.service';
import { ResourceOptimizationService } from './resource-optimization.service';
import { SelfHealingService } from './self-healing.service';

describe('Automation Services', () => {
  let selfHealingService: SelfHealingService;
  let automatedScalingService: AutomatedScalingService;
  let resourceOptimizationService: ResourceOptimizationService;
  let costManagementService: CostManagementService;
  let automatedMonitoringService: AutomatedMonitoringService;
  let capacityPlanningService: CapacityPlanningService;
  let operationalRunbooksService: OperationalRunbooksService;
  let devOpsIntegrationService: DevOpsIntegrationService;
  let costOptimizationAIService: CostOptimizationAIService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SelfHealingService,
        AutomatedScalingService,
        ResourceOptimizationService,
        CostManagementService,
        AutomatedMonitoringService,
        CapacityPlanningService,
        OperationalRunbooksService,
        DevOpsIntegrationService,
        CostOptimizationAIService,
      ],
    }).compile();

    selfHealingService = module.get<SelfHealingService>(SelfHealingService);
    automatedScalingService = module.get<AutomatedScalingService>(
      AutomatedScalingService
    );
    resourceOptimizationService = module.get<ResourceOptimizationService>(
      ResourceOptimizationService
    );
    costManagementService = module.get<CostManagementService>(
      CostManagementService
    );
    automatedMonitoringService = module.get<AutomatedMonitoringService>(
      AutomatedMonitoringService
    );
    capacityPlanningService = module.get<CapacityPlanningService>(
      CapacityPlanningService
    );
    operationalRunbooksService = module.get<OperationalRunbooksService>(
      OperationalRunbooksService
    );
    devOpsIntegrationService = module.get<DevOpsIntegrationService>(
      DevOpsIntegrationService
    );
    costOptimizationAIService = module.get<CostOptimizationAIService>(
      CostOptimizationAIService
    );
  });

  describe('SelfHealingService', () => {
    it('should be defined', () => {
      expect(selfHealingService).toBeDefined();
    });

    it('should perform health check', async () => {
      const healthCheck =
        await selfHealingService.performHealthCheck('test-service');
      expect(healthCheck).toBeDefined();
      expect(healthCheck.serviceId).toBe('test-service');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(
        healthCheck.status
      );
    });

    it('should perform auto recovery', async () => {
      const recovery =
        await selfHealingService.performAutoRecovery('test-service');
      expect(recovery).toBeDefined();
      expect(recovery.serviceId).toBe('test-service');
      expect(['success', 'failed', 'in_progress']).toContain(recovery.status);
    });

    it('should handle critical incidents', async () => {
      const incident = await selfHealingService.reportLocalIncident({
        type: 'network',
        severity: 'critical',
        region: 'RU',
        affectedServices: ['test-service'],
        description: 'Test incident',
      });
      expect(incident).toBeDefined();
      expect(typeof incident).toBe('string');
    });
  });

  describe('AutomatedScalingService', () => {
    it('should be defined', () => {
      expect(automatedScalingService).toBeDefined();
    });

    it('should scale based on CPU usage', () => {
      const scaling = automatedScalingService.scaleBasedOnCPU(
        'test-service',
        90
      );
      expect(scaling).toBeDefined();
      expect(scaling.serviceId).toBe('test-service');
      expect(['scale_up', 'scale_down', 'no_action']).toContain(scaling.action);
    });

    it('should scale based on memory usage', () => {
      const scaling = automatedScalingService.scaleBasedOnMemory(
        'test-service',
        85
      );
      expect(scaling).toBeDefined();
      expect(scaling.serviceId).toBe('test-service');
      expect(['scale_up', 'scale_down', 'no_action']).toContain(scaling.action);
    });

    it('should scale based on network usage', () => {
      const scaling = automatedScalingService.scaleBasedOnNetwork(
        'test-service',
        80
      );
      expect(scaling).toBeDefined();
      expect(scaling.serviceId).toBe('test-service');
      expect(['scale_up', 'scale_down', 'no_action']).toContain(scaling.action);
    });

    it('should apply holiday calendar scaling', () => {
      const scaling = automatedScalingService.applyHolidayCalendarScaling(
        'RU',
        '2024-01-01'
      );
      expect(scaling).toBeDefined();
      expect(scaling.country).toBe('RU');
      expect(['holiday', 'weekend', 'workday']).toContain(scaling.dayType);
    });
  });

  describe('ResourceOptimizationService', () => {
    it('should be defined', () => {
      expect(resourceOptimizationService).toBeDefined();
    });

    it('should optimize CPU resources', () => {
      const optimization =
        resourceOptimizationService.optimizeCPU('test-service');
      expect(optimization).toBeDefined();
      expect(optimization.serviceId).toBe('test-service');
      expect(['optimized', 'no_action_needed', 'failed']).toContain(
        optimization.status
      );
    });

    it('should optimize memory resources', () => {
      const optimization =
        resourceOptimizationService.optimizeMemory('test-service');
      expect(optimization).toBeDefined();
      expect(optimization.serviceId).toBe('test-service');
      expect(['optimized', 'no_action_needed', 'failed']).toContain(
        optimization.status
      );
    });

    it('should optimize network resources', () => {
      const optimization =
        resourceOptimizationService.optimizeNetwork('test-service');
      expect(optimization).toBeDefined();
      expect(optimization.serviceId).toBe('test-service');
      expect(['optimized', 'no_action_needed', 'failed']).toContain(
        optimization.status
      );
    });

    it('should optimize storage resources', () => {
      const optimization =
        resourceOptimizationService.optimizeStorage('test-service');
      expect(optimization).toBeDefined();
      expect(optimization.serviceId).toBe('test-service');
      expect(['optimized', 'no_action_needed', 'failed']).toContain(
        optimization.status
      );
    });
  });

  describe('CostManagementService', () => {
    it('should be defined', () => {
      expect(costManagementService).toBeDefined();
    });

    it('should track costs by provider', () => {
      const costs = costManagementService.trackCostsByProvider('hoster-by');
      expect(costs).toBeDefined();
      expect(costs.provider).toBe('hoster-by');
      expect(Array.isArray(costs.costs)).toBe(true);
    });

    it('should convert currency', () => {
      const conversion = costManagementService.convertCurrency(
        100,
        'BYN',
        'USD'
      );
      expect(conversion).toBeDefined();
      expect(conversion.originalAmount).toBe(100);
      expect(conversion.originalCurrency).toBe('BYN');
      expect(conversion.targetCurrency).toBe('USD');
    });

    it('should set budget alerts', () => {
      const alert = costManagementService.setBudgetAlert(
        'test-budget',
        1000,
        'BYN'
      );
      expect(alert).toBeDefined();
      expect(alert.budgetId).toBe('test-budget');
      expect(alert.amount).toBe(1000);
      expect(alert.currency).toBe('BYN');
    });

    it('should get cost trends', () => {
      const trends = costManagementService.getCostTrends(
        'hoster-by',
        'monthly'
      );
      expect(trends).toBeDefined();
      expect(trends.provider).toBe('hoster-by');
      expect(trends.period).toBe('monthly');
      expect(Array.isArray(trends.data)).toBe(true);
    });
  });

  describe('AutomatedMonitoringService', () => {
    it('should be defined', () => {
      expect(automatedMonitoringService).toBeDefined();
    });

    it('should monitor CPU usage', () => {
      const monitoring = automatedMonitoringService.monitorCPU('test-service');
      expect(monitoring).toBeDefined();
      expect(monitoring.serviceId).toBe('test-service');
      expect(monitoring.metric).toBe('cpu');
      expect(typeof monitoring.value).toBe('number');
    });

    it('should monitor memory usage', () => {
      const monitoring =
        automatedMonitoringService.monitorMemory('test-service');
      expect(monitoring).toBeDefined();
      expect(monitoring.serviceId).toBe('test-service');
      expect(monitoring.metric).toBe('memory');
      expect(typeof monitoring.value).toBe('number');
    });

    it('should monitor disk usage', () => {
      const monitoring = automatedMonitoringService.monitorDisk('test-service');
      expect(monitoring).toBeDefined();
      expect(monitoring.serviceId).toBe('test-service');
      expect(monitoring.metric).toBe('disk');
      expect(typeof monitoring.value).toBe('number');
    });

    it('should monitor network usage', () => {
      const monitoring =
        automatedMonitoringService.monitorNetwork('test-service');
      expect(monitoring).toBeDefined();
      expect(monitoring.serviceId).toBe('test-service');
      expect(monitoring.metric).toBe('network');
      expect(typeof monitoring.value).toBe('number');
    });

    it('should send alerts', () => {
      const alert = automatedMonitoringService.sendAlert({
        serviceId: 'test-service',
        metric: 'cpu',
        value: 90,
        threshold: 80,
        severity: 'high',
      });
      expect(alert).toBeDefined();
      expect(alert.serviceId).toBe('test-service');
      expect(alert.severity).toBe('high');
      expect(['sent', 'failed', 'queued']).toContain(alert.status);
    });
  });

  describe('CapacityPlanningService', () => {
    it('should be defined', () => {
      expect(capacityPlanningService).toBeDefined();
    });

    it('should analyze current capacity', () => {
      const analysis =
        capacityPlanningService.analyzeCurrentCapacity('test-service');
      expect(analysis).toBeDefined();
      expect(analysis.serviceId).toBe('test-service');
      expect(analysis.cpu).toBeDefined();
      expect(analysis.memory).toBeDefined();
      expect(analysis.storage).toBeDefined();
    });

    it('should forecast capacity needs', () => {
      const forecast = capacityPlanningService.forecastCapacityNeeds(
        'test-service',
        'monthly'
      );
      expect(forecast).toBeDefined();
      expect(forecast.serviceId).toBe('test-service');
      expect(forecast.period).toBe('monthly');
      expect(Array.isArray(forecast.predictions)).toBe(true);
    });

    it('should create scaling plan', () => {
      const plan = capacityPlanningService.createScalingPlan('test-service');
      expect(plan).toBeDefined();
      expect(plan.serviceId).toBe('test-service');
      expect(Array.isArray(plan.recommendations)).toBe(true);
      expect(['immediate', 'short_term', 'long_term']).toContain(plan.priority);
    });

    it('should perform stress testing', async () => {
      const stressTest = await capacityPlanningService.performStressTest(
        'test-service',
        {
          cpuLoad: 80,
          memoryLoad: 75,
          storageLoad: 60,
          networkLoad: 70,
          duration: 5,
        }
      );
      expect(stressTest).toBeDefined();
      expect(stressTest.success).toBeDefined();
      expect(typeof stressTest.success).toBe('boolean');
      expect(Array.isArray(stressTest.recommendations)).toBe(true);
    });
  });

  describe('OperationalRunbooksService', () => {
    it('should be defined', () => {
      expect(operationalRunbooksService).toBeDefined();
    });

    it('should create incident response runbook', () => {
      const runbook =
        operationalRunbooksService.createIncidentResponseRunbook(
          'test-incident'
        );
      expect(runbook).toBeDefined();
      expect(runbook.type).toBe('incident_response');
      expect(Array.isArray(runbook.steps)).toBe(true);
      expect(['draft', 'active', 'archived']).toContain(runbook.status);
    });

    it('should create maintenance runbook', () => {
      const runbook =
        operationalRunbooksService.createMaintenanceRunbook('test-maintenance');
      expect(runbook).toBeDefined();
      expect(runbook.type).toBe('maintenance');
      expect(Array.isArray(runbook.steps)).toBe(true);
      expect(['draft', 'active', 'archived']).toContain(runbook.status);
    });

    it('should create deployment runbook', () => {
      const runbook =
        operationalRunbooksService.createDeploymentRunbook('test-deployment');
      expect(runbook).toBeDefined();
      expect(runbook.type).toBe('deployment');
      expect(Array.isArray(runbook.steps)).toBe(true);
      expect(['draft', 'active', 'archived']).toContain(runbook.status);
    });

    it('should execute runbook', () => {
      const execution =
        operationalRunbooksService.executeRunbook('test-runbook-id');
      expect(execution).toBeDefined();
      expect(execution.runbookId).toBe('test-runbook-id');
      expect(['running', 'completed', 'failed']).toContain(execution.status);
    });
  });

  describe('DevOpsIntegrationService', () => {
    it('should be defined', () => {
      expect(devOpsIntegrationService).toBeDefined();
    });

    it('should execute Terraform command', () => {
      const terraform = devOpsIntegrationService.executeTerraformCommand(
        'plan',
        'test-workspace'
      );
      expect(terraform).toBeDefined();
      expect(terraform.command).toBe('plan');
      expect(terraform.workspace).toBe('test-workspace');
      expect(['success', 'failed', 'in_progress']).toContain(terraform.status);
    });

    it('should execute Ansible playbook', async () => {
      try {
        const ansible = await devOpsIntegrationService.executeAnsiblePlaybook(
          'test-playbook.yml',
          ['test-inventory']
        );
        expect(ansible).toBeDefined();
        expect(ansible.executionId).toBeDefined();
        expect(['success', 'failed', 'in_progress']).toContain(ansible.status);
      } catch (error) {
        // Ожидаем ошибку, так как playbook не найден
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(
          'Ansible playbook not found'
        );
      }
    });

    it('should run CI/CD pipeline', () => {
      const pipeline = devOpsIntegrationService.runCICDPipeline(
        'test-pipeline',
        'main'
      );
      expect(pipeline).toBeDefined();
      expect(pipeline.pipelineId).toBe('test-pipeline');
      expect(pipeline.branch).toBe('main');
      expect(['running', 'success', 'failed']).toContain(pipeline.status);
    });

    it('should deploy to environment', () => {
      const deployment = devOpsIntegrationService.deployToEnvironment(
        'test-app',
        'staging'
      );
      expect(deployment).toBeDefined();
      expect(deployment.application).toBe('test-app');
      expect(deployment.environment).toBe('staging');
      expect(['deploying', 'success', 'failed']).toContain(deployment.status);
    });
  });

  describe('CostOptimizationAIService', () => {
    it('should be defined', () => {
      expect(costOptimizationAIService).toBeDefined();
    });

    it('should optimize costs', () => {
      const optimization =
        costOptimizationAIService.optimizeCosts('test-service');
      expect(optimization).toBeDefined();
      expect(optimization.serviceId).toBe('test-service');
      expect(Array.isArray(optimization.recommendations)).toBe(true);
      expect(optimization.confidenceScore).toBeGreaterThan(0);
      expect(optimization.confidenceScore).toBeLessThanOrEqual(1);
    });

    it('should predict resource usage', () => {
      const prediction = costOptimizationAIService.predictResourceUsage(
        'test-service',
        'monthly'
      );
      expect(prediction).toBeDefined();
      expect(prediction.serviceId).toBe('test-service');
      expect(prediction.period).toBe('monthly');
      expect(Array.isArray(prediction.predictions)).toBe(true);
    });

    it('should detect anomalies', () => {
      const anomaly = costOptimizationAIService.detectAnomalies('test-service');
      expect(anomaly).toBeDefined();
      expect(anomaly.serviceId).toBe('test-service');
      expect(Array.isArray(anomaly.anomalies)).toBe(true);
    });

    it('should analyze usage patterns', () => {
      const patterns =
        costOptimizationAIService.analyzeUsagePatterns('test-service');
      expect(patterns).toBeDefined();
      expect(patterns.serviceId).toBe('test-service');
      expect(Array.isArray(patterns.patterns)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should work together for full automation', async () => {
      // 1. Monitor service health
      const healthCheck =
        await selfHealingService.performHealthCheck('test-service');

      // 2. If unhealthy, perform auto recovery
      let recovery;
      if (healthCheck.status === 'unhealthy') {
        recovery = await selfHealingService.performAutoRecovery('test-service');
      }

      // 3. Check resource usage and scale if needed
      const cpuScaling = automatedScalingService.scaleBasedOnCPU(
        'test-service',
        85
      );

      // 4. Optimize resources
      const cpuOptimization =
        resourceOptimizationService.optimizeCPU('test-service');

      // 5. Monitor costs
      const costs = costManagementService.trackCostsByProvider('hoster-by');

      // 6. Send monitoring alerts
      const alert = automatedMonitoringService.sendAlert({
        serviceId: 'test-service',
        metric: 'cpu',
        value: 85,
        threshold: 80,
        severity: 'medium',
      });

      // 7. Plan capacity
      const capacityPlan =
        capacityPlanningService.createScalingPlan('test-service');

      // 8. Execute operational runbook if needed
      let runbookExecution;
      if (healthCheck.status === 'unhealthy') {
        const runbook =
          operationalRunbooksService.createIncidentResponseRunbook(
            'service-unhealthy'
          );
        runbookExecution = operationalRunbooksService.executeRunbook(
          runbook.id
        );
      }

      // 9. Run DevOps pipeline if deployment needed
      let pipeline;
      if (cpuScaling.action === 'scale_up') {
        pipeline = devOpsIntegrationService.runCICDPipeline(
          'auto-scaling',
          'main'
        );
      }

      // 10. AI cost optimization
      const aiOptimization =
        costOptimizationAIService.optimizeCosts('test-service');

      // Verify all components are working
      expect(healthCheck).toBeDefined();
      expect(cpuScaling).toBeDefined();
      expect(cpuOptimization).toBeDefined();
      expect(costs).toBeDefined();
      expect(alert).toBeDefined();
      expect(capacityPlan).toBeDefined();
      expect(aiOptimization).toBeDefined();

      if (recovery) expect(recovery).toBeDefined();
      if (runbookExecution) expect(runbookExecution).toBeDefined();
      if (pipeline) expect(pipeline).toBeDefined();
    });
  });

  afterEach(async () => {
    // Очистка ресурсов после каждого теста
    vi.clearAllMocks();
  });

  afterAll(async () => {
    // Финальная очистка
    vi.restoreAllMocks();
  });
});
