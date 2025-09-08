import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateCapacityPlanDto } from '../dto/create-capacity-plan.dto';
import { UpdateCapacityPlanDto } from '../dto/update-capacity-plan.dto';
import type {
  ICapacityPlan,
  IScalingAction,
} from '../interfaces/disaster-recovery.interface';
import { CapacityPlanningService } from '../services/capacity-planning.service';

@ApiTags('Capacity Planning')
@Controller('capacity-planning')
export class CapacityPlanningController {
  private readonly logger = new Logger(CapacityPlanningController.name);

  constructor(
    private readonly capacityPlanningService: CapacityPlanningService
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get all capacity plans' })
  @ApiResponse({
    status: 200,
    description: 'List of all capacity plans',
    type: [Object],
  })
  async getAllCapacityPlans(): Promise<ICapacityPlan[]> {
    this.logger.log('Getting all capacity plans');
    return this.capacityPlanningService.getAllCapacityPlans();
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get capacity plan by ID' })
  @ApiParam({ name: 'id', description: 'Capacity plan ID' })
  @ApiResponse({
    status: 200,
    description: 'Capacity plan found',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Capacity plan not found',
  })
  async getCapacityPlanById(
    @Param('id') id: string
  ): Promise<ICapacityPlan | null> {
    this.logger.log(`Getting capacity plan by ID: ${id}`);
    return this.capacityPlanningService.getCapacityPlanById(id);
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create new capacity plan' })
  @ApiResponse({
    status: 201,
    description: 'Capacity plan created successfully',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @HttpCode(HttpStatus.CREATED)
  async createCapacityPlan(
    @Body() createDto: CreateCapacityPlanDto
  ): Promise<ICapacityPlan> {
    this.logger.log('Creating new capacity plan');
    const planWithCurrentCapacity: CreateCapacityPlanDto = {
      ...createDto,
      currentCapacity: {
        cpu: 1000,
        memory: 8192,
        storage: 100000,
        network: 10000,
      },
    };
    return this.capacityPlanningService.createCapacityPlan(
      planWithCurrentCapacity
    );
  }

  @Put('plans/:id')
  @ApiOperation({ summary: 'Update capacity plan' })
  @ApiParam({ name: 'id', description: 'Capacity plan ID' })
  @ApiResponse({
    status: 200,
    description: 'Capacity plan updated successfully',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Capacity plan not found',
  })
  async updateCapacityPlan(
    @Param('id') id: string,
    @Body() updateDto: UpdateCapacityPlanDto
  ): Promise<ICapacityPlan | null> {
    this.logger.log(`Updating capacity plan: ${id}`);

    // убираем все undefined поля для exactOptionalPropertyTypes
    const cleanUpdateDto = Object.fromEntries(
      Object.entries(updateDto).filter(([, value]) => value != null)
    ) as Partial<ICapacityPlan>;

    const planWithCurrentCapacity: Partial<ICapacityPlan> = {
      ...cleanUpdateDto,
      currentCapacity: {
        cpu: 1000,
        memory: 8192,
        storage: 100000,
        network: 10000,
      },
    };

    return this.capacityPlanningService.updateCapacityPlan(
      id,
      planWithCurrentCapacity
    );
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Delete capacity plan' })
  @ApiParam({ name: 'id', description: 'Capacity plan ID' })
  @ApiResponse({
    status: 200,
    description: 'Capacity plan deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Capacity plan not found',
  })
  async deleteCapacityPlan(
    @Param('id') id: string
  ): Promise<{ success: boolean }> {
    this.logger.log(`Deleting capacity plan: ${id}`);
    const deleted = await this.capacityPlanningService.deleteCapacityPlan(id);
    return { success: deleted };
  }

  @Post('plans/:id/scaling-actions')
  @ApiOperation({ summary: 'Add scaling action to capacity plan' })
  @ApiParam({ name: 'id', description: 'Capacity plan ID' })
  @ApiResponse({
    status: 201,
    description: 'Scaling action added successfully',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Capacity plan not found',
  })
  @HttpCode(HttpStatus.CREATED)
  async addScalingAction(
    @Param('id') id: string,
    @Body() action: Omit<IScalingAction, 'id'>
  ): Promise<IScalingAction | null> {
    this.logger.log(`Adding scaling action to plan: ${id}`);
    return this.capacityPlanningService.addScalingAction(id, action);
  }

  @Put('plans/:planId/scaling-actions/:actionId/status')
  @ApiOperation({ summary: 'Update scaling action status' })
  @ApiParam({ name: 'planId', description: 'Capacity plan ID' })
  @ApiParam({ name: 'actionId', description: 'Scaling action ID' })
  @ApiResponse({
    status: 200,
    description: 'Scaling action status updated successfully',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Capacity plan or action not found',
  })
  async updateScalingActionStatus(
    @Param('planId') planId: string,
    @Param('actionId') actionId: string,
    @Body() updateData: { status: IScalingAction['status'] }
  ): Promise<IScalingAction | null> {
    this.logger.log(
      `Updating scaling action status: ${actionId} in plan: ${planId}`
    );
    return this.capacityPlanningService.updateScalingActionStatus(
      planId,
      actionId,
      updateData.status
    );
  }

  @Post('analyze-capacity-needs')
  @ApiOperation({ summary: 'Analyze capacity needs for data center' })
  @ApiResponse({
    status: 200,
    description: 'Capacity analysis completed',
    schema: {
      type: 'object',
      properties: {
        currentCapacity: { type: 'object' },
        projectedDemand: { type: 'object' },
        capacityGap: { type: 'object' },
        recommendations: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  async analyzeCapacityNeeds(
    @Body() request: { dcId: string; period: { start: Date; end: Date } }
  ): Promise<{
    currentCapacity: ICapacityPlan['currentCapacity'];
    projectedDemand: ICapacityPlan['projectedDemand'];
    capacityGap: {
      cpu: number;
      memory: number;
      storage: number;
      network: number;
    };
    recommendations: Array<{
      _resource: string;
      action: 'scale-up' | 'scale-down' | 'scale-out' | 'scale-in';
      amount: number;
      priority: 'low' | 'medium' | 'high' | 'critical';
      estimatedCost: number;
    }>;
  }> {
    this.logger.log(`Analyzing capacity needs for DC: ${request.dcId}`);
    return this.capacityPlanningService.analyzeCapacityNeeds(request.dcId);
  }

  @Post('stress-test')
  @ApiOperation({ summary: 'Perform stress test for data center' })
  @ApiResponse({
    status: 200,
    description: 'Stress test completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        results: { type: 'object' },
        recommendations: { type: 'array', items: { type: 'string' } },
        testDuration: { type: 'number' },
      },
    },
  })
  async performStressTest(
    @Body()
    request: {
      dcId: string;
      testScenario: {
        cpuLoad: number;
        memoryLoad: number;
        storageLoad: number;
        networkLoad: number;
        duration: number;
      };
    }
  ): Promise<{
    success: boolean;
    results: {
      cpu: { maxUsage: number; averageUsage: number; bottlenecks: string[] };
      memory: { maxUsage: number; averageUsage: number; bottlenecks: string[] };
      storage: {
        maxUsage: number;
        averageUsage: number;
        bottlenecks: string[];
      };
      network: {
        maxUsage: number;
        averageUsage: number;
        bottlenecks: string[];
      };
    };
    recommendations: string[];
    testDuration: number;
  }> {
    this.logger.log(`Performing stress test for DC: ${request.dcId}`);
    return this.capacityPlanningService.performStressTest(
      request.dcId,
      request.testScenario
    );
  }

  @Get('plans/search/data-center')
  @ApiOperation({ summary: 'Find capacity plans by data center' })
  @ApiQuery({ name: 'dcId', description: 'Data center ID' })
  @ApiResponse({
    status: 200,
    description: 'Capacity plans found by data center',
    type: [Object],
  })
  async findPlansByDataCenter(
    @Query('dcId') dcId: string
  ): Promise<ICapacityPlan[]> {
    this.logger.log(`Finding capacity plans by data center: ${dcId}`);
    return this.capacityPlanningService.findPlansByDataCenter(dcId);
  }

  @Get('plans/search/status')
  @ApiOperation({ summary: 'Find capacity plans by status' })
  @ApiQuery({ name: 'status', description: 'Plan status' })
  @ApiResponse({
    status: 200,
    description: 'Capacity plans found by status',
    type: [Object],
  })
  async findPlansByStatus(
    @Query('status') status: ICapacityPlan['status']
  ): Promise<ICapacityPlan[]> {
    this.logger.log(`Finding capacity plans by status: ${status}`);
    return this.capacityPlanningService.findPlansByStatus(status);
  }

  @Get('plans/search/period')
  @ApiOperation({ summary: 'Find capacity plans by period' })
  @ApiQuery({ name: 'start', description: 'Start date' })
  @ApiQuery({ name: 'end', description: 'End date' })
  @ApiResponse({
    status: 200,
    description: 'Capacity plans found by period',
    type: [Object],
  })
  async findPlansByPeriod(
    @Query('start') start: string,
    @Query('end') end: string
  ): Promise<ICapacityPlan[]> {
    this.logger.log(`Finding capacity plans by period: ${start} - ${end}`);
    return this.capacityPlanningService.findPlansByPeriod(
      new Date(start),
      new Date(end)
    );
  }

  @Get('scaling-history')
  @ApiOperation({ summary: 'Get scaling history' })
  @ApiResponse({
    status: 200,
    description: 'Scaling history',
    type: [Object],
  })
  async getScalingHistory(): Promise<Record<string, unknown>[]> {
    this.logger.log('Getting scaling history');
    return this.capacityPlanningService.getScalingHistory();
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get capacity planning statistics' })
  @ApiResponse({
    status: 200,
    description: 'Capacity planning statistics',
    schema: {
      type: 'object',
      properties: {
        totalPlans: { type: 'number' },
        draftPlans: { type: 'number' },
        approvedPlans: { type: 'number' },
        implementedPlans: { type: 'number' },
        reviewedPlans: { type: 'number' },
        totalScalingActions: { type: 'number' },
        averageCostPerPlan: { type: 'number' },
        lastUpdated: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getCapacityPlanningStatistics(): Promise<{
    totalPlans: number;
    draftPlans: number;
    approvedPlans: number;
    implementedPlans: number;
    reviewedPlans: number;
    totalScalingActions: number;
    averageCostPerPlan: number;
    lastUpdated?: Date;
  }> {
    this.logger.log('Getting capacity planning statistics');
    return this.capacityPlanningService.getCapacityPlanningStatistics();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check capacity planning system health' })
  @ApiResponse({
    status: 200,
    description: 'System health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', format: 'date-time' },
        totalPlans: { type: 'number', example: 2 },
        activePlans: { type: 'number', example: 2 },
        totalScalingActions: { type: 'number', example: 2 },
        system: { type: 'string', example: 'operational' },
      },
    },
  })
  async getSystemHealth(): Promise<{
    status: string;
    timestamp: Date;
    totalPlans: number;
    activePlans: number;
    totalScalingActions: number;
    system: string;
  }> {
    this.logger.log('Checking capacity planning system health');

    const stats =
      await this.capacityPlanningService.getCapacityPlanningStatistics();
    const activePlans = stats.totalPlans - stats.draftPlans;

    return {
      status: 'healthy',
      timestamp: new Date(),
      totalPlans: stats.totalPlans,
      activePlans,
      totalScalingActions: stats.totalScalingActions,
      system: 'operational',
    };
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get capacity planning system overview' })
  @ApiResponse({
    status: 200,
    description: 'System overview',
    schema: {
      type: 'object',
      properties: {
        totalPlans: { type: 'number' },
        draftPlans: { type: 'number' },
        approvedPlans: { type: 'number' },
        implementedPlans: { type: 'number' },
        reviewedPlans: { type: 'number' },
        totalScalingActions: { type: 'number' },
        averageCostPerPlan: { type: 'number' },
        lastUpdated: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getSystemOverview(): Promise<{
    totalPlans: number;
    draftPlans: number;
    approvedPlans: number;
    implementedPlans: number;
    reviewedPlans: number;
    totalScalingActions: number;
    averageCostPerPlan: number;
    lastUpdated: Date;
  }> {
    this.logger.log('Getting capacity planning system overview');

    const stats =
      await this.capacityPlanningService.getCapacityPlanningStatistics();

    return {
      totalPlans: stats.totalPlans,
      draftPlans: stats.draftPlans,
      approvedPlans: stats.approvedPlans,
      implementedPlans: stats.implementedPlans,
      reviewedPlans: stats.reviewedPlans,
      totalScalingActions: stats.totalScalingActions,
      averageCostPerPlan: stats.averageCostPerPlan,
      lastUpdated: stats.lastUpdated ?? new Date(),
    };
  }

  @Post('simulate-capacity-planning')
  @ApiOperation({ summary: 'Simulate capacity planning for testing' })
  @ApiResponse({
    status: 200,
    description: 'Capacity planning simulation completed',
    schema: {
      type: 'object',
      properties: {
        plan: { type: 'object' },
        analysis: { type: 'object' },
        stressTest: { type: 'object' },
        simulationTime: { type: 'number' },
      },
    },
  })
  async simulateCapacityPlanning(
    @Body()
    request: {
      dcId: string;
      period: { start: Date; end: Date };
      testScenario: {
        cpuLoad: number;
        memoryLoad: number;
        storageLoad: number;
        networkLoad: number;
        duration: number;
      };
    }
  ): Promise<{
    plan: ICapacityPlan;
    analysis: Record<string, unknown>;
    stressTest: Record<string, unknown>;
    simulationTime: number;
  }> {
    this.logger.log(`Simulating capacity planning for DC: ${request.dcId}`);

    const startTime = Date.now();

    // Создаем план мощностей
    const plan = await this.capacityPlanningService.createCapacityPlan({
      dcId: request.dcId,
      period: request.period,
      currentCapacity: {
        cpu: 1000,
        memory: 8192,
        storage: 100000,
        network: 10000,
      },
      projectedDemand: {
        cpu: 1200,
        memory: 10240,
        storage: 120000,
        network: 12000,
      },
    });

    // Анализируем потребности в мощностях
    const analysis = await this.capacityPlanningService.analyzeCapacityNeeds(
      request.dcId
    );

    // Выполняем стресс-тест
    const stressTest = await this.capacityPlanningService.performStressTest(
      request.dcId,
      request.testScenario
    );

    // Добавляем рекомендации как действия масштабирования
    for (const recommendation of analysis.recommendations) {
      await this.capacityPlanningService.addScalingAction(plan.id, {
        type: recommendation.action,
        resource: recommendation._resource as
          | 'cpu'
          | 'memory'
          | 'storage'
          | 'network',
        amount: recommendation.amount,
        priority: recommendation.priority,
        estimatedCost: recommendation.estimatedCost,
        implementationDate: new Date(),
        status: 'planned',
      });
    }

    const simulationTime = Date.now() - startTime;

    return {
      plan,
      analysis,
      stressTest,
      simulationTime,
    };
  }
}
