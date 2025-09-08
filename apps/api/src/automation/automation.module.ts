import { Module } from '@nestjs/common';
import { SelfHealingService } from './self-healing.service';
import { AutomatedScalingService } from './automated-scaling.service';
import { ResourceOptimizationService } from './resource-optimization.service';
import { CostManagementService } from './cost-management.service';
import { AutomatedMonitoringService } from './automated-monitoring.service';
import { CapacityPlanningService } from './capacity-planning.service';
import { OperationalRunbooksService } from './operational-runbooks.service';
import { DevOpsIntegrationService } from './devops-integration.service';
import { CostOptimizationAIService } from './cost-optimization-ai.service';

@Module({
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
  exports: [
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
})
export class AutomationModule {}
