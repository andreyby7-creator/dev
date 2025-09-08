import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../types/roles';
import type {
  IScalingConfig,
  IScalingHistory,
  IScalingMetrics,
  IScalingPolicy,
} from '../services/dynamic-scaling.service';
import {
  DynamicScalingService,
  type IScalingDecision,
} from '../services/dynamic-scaling.service';

interface IScalingStats {
  totalScalingEvents: number;
  successfulScalingEvents: number;
  failedScalingEvents: number;
  averageScalingTime: number;
  mostCommonAction: string;
  scalingFrequency: number;
}

export class CreateScalingPolicyDto {
  name!: string;
  type!: 'REACTIVE' | 'PREDICTIVE' | 'SCHEDULED' | 'MANUAL';
  _service!: string;
  metric!:
    | 'CPU_USAGE'
    | 'MEMORY_USAGE'
    | 'REQUEST_RATE'
    | 'RESPONSE_TIME'
    | 'ERROR_RATE'
    | 'QUEUE_SIZE';
  threshold!: number;
  action!: 'SCALE_UP' | 'SCALE_DOWN' | 'SCALE_OUT' | 'SCALE_IN';
  minInstances!: number;
  maxInstances!: number;
  cooldownPeriod!: number;
  enabled!: boolean;
  priority!: number;
  conditions!: Array<{
    metric:
      | 'CPU_USAGE'
      | 'MEMORY_USAGE'
      | 'REQUEST_RATE'
      | 'RESPONSE_TIME'
      | 'ERROR_RATE'
      | 'QUEUE_SIZE';
    operator: 'GT' | 'LT' | 'GTE' | 'LTE' | 'EQ';
    value: number;
    duration: number;
  }>;
  schedule?: {
    cronExpression: string;
    timezone: string;
    minInstances: number;
    maxInstances: number;
  };
}

export class UpdateScalingPolicyDto extends CreateScalingPolicyDto {}

export class EvaluateScalingDto {
  _service!: string;
  metrics!: {
    cpuUsage: number;
    memoryUsage: number;
    requestRate: number;
    responseTime: number;
    errorRate: number;
    queueSize: number;
    activeConnections: number;
  };
}

export class UpdateScalingConfigDto {
  enabled?: boolean;
  defaultMinInstances?: number;
  defaultMaxInstances?: number;
  defaultCooldownPeriod?: number;
  maxScalingRate?: number;
  predictiveScalingEnabled?: boolean;
  costOptimizationEnabled?: boolean;
  notificationChannels?: string[];
}

@ApiTags('Dynamic Scaling Policies')
@Controller('dynamic-scaling')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DynamicScalingController {
  constructor(private readonly dynamicScalingService: DynamicScalingService) {}

  @Post('policies')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Создать политику масштабирования' })
  @ApiResponse({
    status: 201,
    description: 'Политика масштабирования создана успешно',
  })
  async createPolicy(
    @Body() dto: CreateScalingPolicyDto
  ): Promise<{ success: boolean; data: IScalingPolicy }> {
    const policy = this.dynamicScalingService.createPolicy(dto);

    return {
      success: true,
      data: policy,
    };
  }

  @Put('policies/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Обновить политику масштабирования' })
  @ApiParam({ name: 'id', description: 'ID политики' })
  @ApiResponse({
    status: 200,
    description: 'Политика масштабирования обновлена',
  })
  async updatePolicy(
    @Param('id') id: string,
    @Body() dto: UpdateScalingPolicyDto
  ): Promise<{ success: boolean; data?: IScalingPolicy; message?: string }> {
    const policy = this.dynamicScalingService.updatePolicy(id, dto);

    if (!policy) {
      return {
        success: false,
        message: 'Policy not found',
      };
    }

    return {
      success: true,
      data: policy,
    };
  }

  @Delete('policies/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Удалить политику масштабирования' })
  @ApiParam({ name: 'id', description: 'ID политики' })
  @ApiResponse({
    status: 200,
    description: 'Политика масштабирования удалена',
  })
  async deletePolicy(
    @Param('id') id: string
  ): Promise<{ success: boolean; message: string }> {
    const deleted = this.dynamicScalingService.deletePolicy(id);

    return {
      success: deleted,
      message: deleted ? 'Policy deleted successfully' : 'Policy not found',
    };
  }

  @Get('policies')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Получить все политики масштабирования' })
  @ApiQuery({
    name: 'service',
    required: false,
    description: 'Фильтр по сервису',
  })
  @ApiResponse({
    status: 200,
    description: 'Список политик масштабирования',
  })
  async getPolicies(
    @Query('service') service?: string
  ): Promise<{ success: boolean; data: IScalingPolicy[] }> {
    const policies =
      service != null && service !== ''
        ? this.dynamicScalingService.getPoliciesForService(service)
        : this.dynamicScalingService.getAllPolicies();

    return {
      success: true,
      data: policies,
    };
  }

  @Post('evaluate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Оценить необходимость масштабирования' })
  @ApiResponse({
    status: 200,
    description: 'Результат оценки масштабирования',
  })
  async evaluateScaling(
    @Body() dto: EvaluateScalingDto
  ): Promise<{ success: boolean; data?: IScalingDecision }> {
    const metrics: IScalingMetrics = {
      ...dto.metrics,
      timestamp: new Date().toISOString(),
    };

    const decision = await this.dynamicScalingService.evaluateScaling(
      dto._service,
      metrics
    );

    if (decision != null) {
      return {
        success: true,
        data: decision,
      };
    }

    return {
      success: true,
    };
  }

  @Post('execute')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Выполнить масштабирование' })
  @ApiResponse({
    status: 200,
    description: 'Масштабирование выполнено',
  })
  async executeScaling(
    @Body() decision: IScalingDecision
  ): Promise<{ success: boolean; message: string }> {
    const success = await this.dynamicScalingService.executeScaling(decision);

    return {
      success,
      message: success
        ? 'Scaling executed successfully'
        : 'Scaling execution failed',
    };
  }

  @Get('history')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Получить историю масштабирования' })
  @ApiQuery({
    name: 'service',
    required: false,
    description: 'Фильтр по сервису',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Лимит записей',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'История масштабирования',
  })
  async getScalingHistory(
    @Query('service') service?: string,
    @Query('limit') limit?: number
  ): Promise<{ success: boolean; data: IScalingHistory[] }> {
    const history = this.dynamicScalingService.getScalingHistory(
      service,
      limit
    );

    return {
      success: true,
      data: history,
    };
  }

  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Получить статистику масштабирования' })
  @ApiQuery({
    name: 'service',
    required: false,
    description: 'Фильтр по сервису',
  })
  @ApiQuery({
    name: 'timeRange',
    required: false,
    description: 'Временной диапазон в часах',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Статистика масштабирования',
  })
  async getScalingStats(
    @Query('service') service?: string,
    @Query('timeRange') timeRange?: number
  ): Promise<{ success: boolean; data: IScalingStats }> {
    const timeRangeMs =
      timeRange != null && timeRange > 0
        ? timeRange * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
    const stats = this.dynamicScalingService.getScalingStats(
      service,
      timeRangeMs
    );

    return {
      success: true,
      data: stats,
    };
  }

  @Get('config')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Получить конфигурацию масштабирования' })
  @ApiResponse({
    status: 200,
    description: 'Конфигурация масштабирования',
  })
  async getScalingConfig(): Promise<{
    success: boolean;
    data: IScalingConfig;
  }> {
    const config = this.dynamicScalingService.getScalingConfig();

    return {
      success: true,
      data: config,
    };
  }

  @Post('config')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Обновить конфигурацию масштабирования' })
  @ApiResponse({
    status: 200,
    description: 'Конфигурация обновлена',
  })
  async updateScalingConfig(
    @Body() dto: UpdateScalingConfigDto
  ): Promise<{ success: boolean; message: string }> {
    this.dynamicScalingService.updateScalingConfig(dto);

    return {
      success: true,
      message: 'Scaling configuration updated successfully',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Проверка состояния сервиса масштабирования' })
  @ApiResponse({
    status: 200,
    description: 'Статус сервиса масштабирования',
  })
  async getHealth(): Promise<{
    success: boolean;
    data: {
      status: string;
      _service: string;
      policies: number;
      history: number;
    };
  }> {
    const policies = this.dynamicScalingService.getAllPolicies();
    const history = this.dynamicScalingService.getScalingHistory();

    return {
      success: true,
      data: {
        status: 'HEALTHY',
        _service: 'Dynamic Scaling Policies',
        policies: policies.length,
        history: history.length,
      },
    };
  }

  @Get('dashboard')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Дашборд масштабирования' })
  @ApiResponse({
    status: 200,
    description: 'Дашборд с аналитикой масштабирования',
  })
  async getDashboard(): Promise<{
    success: boolean;
    data: {
      policies: {
        total: number;
        enabled: number;
        disabled: number;
        byType: Record<string, number>;
        byService: Record<string, number>;
      };
      scaling: {
        totalEvents: number;
        successfulEvents: number;
        failedEvents: number;
        averageScalingTime: number;
        mostCommonAction: string;
        scalingFrequency: number;
      };
      services: {
        total: number;
        activePolicies: number;
        recentScaling: number;
      };
    };
  }> {
    const policies = this.dynamicScalingService.getAllPolicies();
    const stats = this.dynamicScalingService.getScalingStats();

    const enabledPolicies = policies.filter(policy => policy.enabled);
    const disabledPolicies = policies.filter(policy => !policy.enabled);

    const policiesByType = policies.reduce(
      (acc, policy) => {
        acc[policy.type] = (acc[policy.type] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const policiesByService = policies.reduce(
      (acc, policy) => {
        acc[policy._service] = (acc[policy._service] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const services = Array.from(
      new Set(policies.map(policy => policy._service))
    );
    const recentScaling = this.dynamicScalingService.getScalingHistory(
      undefined,
      10
    );

    return {
      success: true,
      data: {
        policies: {
          total: policies.length,
          enabled: enabledPolicies.length,
          disabled: disabledPolicies.length,
          byType: policiesByType,
          byService: policiesByService,
        },
        scaling: {
          totalEvents: stats.totalScalingEvents,
          successfulEvents: stats.successfulScalingEvents,
          failedEvents: stats.failedScalingEvents,
          averageScalingTime: stats.averageScalingTime,
          mostCommonAction: stats.mostCommonAction,
          scalingFrequency: stats.scalingFrequency,
        },
        services: {
          total: services.length,
          activePolicies: enabledPolicies.length,
          recentScaling: recentScaling.length,
        },
      },
    };
  }
}
