import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  DynamicScalingService,
  ScalingAction,
  ScalingMetric,
  ScalingPolicyType,
} from './dynamic-scaling.service';

@ApiTags('Dynamic Scaling Policies')
@Controller('gateway/scaling')
export class DynamicScalingController {
  constructor(private readonly scalingService: DynamicScalingService) {}

  @Post('policies')
  @ApiOperation({ summary: 'Создать новую политику масштабирования' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Название политики' },
        type: {
          type: 'string',
          enum: Object.values(ScalingPolicyType),
          description: 'Тип политики',
        },
        service: { type: 'string', description: 'Название сервиса' },
        metrics: {
          type: 'array',
          items: { type: 'string', enum: Object.values(ScalingMetric) },
          description: 'Метрики для отслеживания',
        },
        thresholds: {
          type: 'object',
          description: 'Пороговые значения для метрик',
        },
        actions: {
          type: 'array',
          items: { type: 'string', enum: Object.values(ScalingAction) },
          description: 'Действия масштабирования',
        },
        minInstances: {
          type: 'number',
          description: 'Минимальное количество инстансов',
        },
        maxInstances: {
          type: 'number',
          description: 'Максимальное количество инстансов',
        },
        cooldownPeriod: {
          type: 'number',
          description: 'Период cooldown в секундах',
        },
        priority: { type: 'number', description: 'Приоритет политики' },
        enabled: { type: 'boolean', description: 'Включена ли политика' },
        schedule: {
          type: 'string',
          description: 'Cron выражение для SCHEDULED политик',
        },
        predictiveWindow: {
          type: 'number',
          description: 'Окно предсказания в минутах',
        },
      },
      required: [
        'name',
        'type',
        'service',
        'metrics',
        'thresholds',
        'actions',
        'minInstances',
        'maxInstances',
        'cooldownPeriod',
        'priority',
        'enabled',
      ],
    },
  })
  @ApiResponse({ status: 201, description: 'Политика создана успешно' })
  @ApiResponse({ status: 400, description: 'Неверные параметры' })
  async createPolicy(@Body() policy: Record<string, unknown>) {
    const validPolicy: Omit<
      {
        id: string;
        name: string;
        type: ScalingPolicyType;
        _service: string;
        metrics: ScalingMetric[];
        thresholds: Record<ScalingMetric, number>;
        actions: ScalingAction[];
        minInstances: number;
        maxInstances: number;
        cooldownPeriod: number;
        priority: number;
        enabled: boolean;
        schedule?: string;
        predictiveWindow?: number;
      },
      'id'
    > = {
      name: policy.name as string,
      type: policy.type as ScalingPolicyType,
      _service: policy.service as string,
      metrics: policy.metrics as ScalingMetric[],
      thresholds: policy.thresholds as Record<ScalingMetric, number>,
      actions: policy.actions as ScalingAction[],
      minInstances: policy.minInstances as number,
      maxInstances: policy.maxInstances as number,
      cooldownPeriod: policy.cooldownPeriod as number,
      priority: policy.priority as number,
      enabled: policy.enabled as boolean,
      ...(policy.schedule != null && { schedule: policy.schedule as string }),
      ...(policy.predictiveWindow != null && {
        predictiveWindow: policy.predictiveWindow as number,
      }),
    };
    return await this.scalingService.createPolicy(validPolicy);
  }

  @Get('policies')
  @ApiOperation({ summary: 'Получить все политики масштабирования' })
  @ApiQuery({
    name: 'service',
    required: false,
    description: 'Фильтр по сервису',
  })
  @ApiQuery({ name: 'type', required: false, description: 'Фильтр по типу' })
  @ApiQuery({
    name: 'enabled',
    required: false,
    description: 'Фильтр по статусу',
  })
  @ApiResponse({ status: 200, description: 'Список политик' })
  async getAllPolicies(
    @Query('service') service?: string,
    @Query('type') _type?: string,
    @Query('enabled') enabled?: string
  ) {
    if (service != null && service !== '') {
      return await this.scalingService.getPoliciesByService(service);
    }
    if (enabled === 'true') {
      return await this.scalingService.getActivePolicies();
    }
    return await this.scalingService.getAllPolicies();
  }

  @Get('policies/:id')
  @ApiOperation({ summary: 'Получить политику по ID' })
  @ApiParam({ name: 'id', description: 'ID политики' })
  @ApiResponse({ status: 200, description: 'Детали политики' })
  @ApiResponse({ status: 404, description: 'Политика не найдена' })
  async getPolicy(@Param('id') id: string) {
    return await this.scalingService.getPolicy(id);
  }

  @Put('policies/:id')
  @ApiOperation({ summary: 'Обновить политику масштабирования' })
  @ApiParam({ name: 'id', description: 'ID политики' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Название политики' },
        type: {
          type: 'string',
          enum: Object.values(ScalingPolicyType),
          description: 'Тип политики',
        },
        service: { type: 'string', description: 'Название сервиса' },
        metrics: {
          type: 'array',
          items: { type: 'string', enum: Object.values(ScalingMetric) },
          description: 'Метрики для отслеживания',
        },
        thresholds: {
          type: 'object',
          description: 'Пороговые значения для метрик',
        },
        actions: {
          type: 'array',
          items: { type: 'string', enum: Object.values(ScalingAction) },
          description: 'Действия масштабирования',
        },
        minInstances: {
          type: 'number',
          description: 'Минимальное количество инстансов',
        },
        maxInstances: {
          type: 'number',
          description: 'Максимальное количество инстансов',
        },
        cooldownPeriod: {
          type: 'number',
          description: 'Период cooldown в секундах',
        },
        priority: { type: 'number', description: 'Приоритет политики' },
        enabled: { type: 'boolean', description: 'Включена ли политика' },
        schedule: {
          type: 'string',
          description: 'Cron выражение для SCHEDULED политик',
        },
        predictiveWindow: {
          type: 'number',
          description: 'Окно предсказания в минутах',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Политика обновлена' })
  @ApiResponse({ status: 404, description: 'Политика не найдена' })
  async updatePolicy(
    @Param('id') id: string,
    @Body() updates: Record<string, unknown>
  ) {
    const validUpdates = {
      name: updates.name as string,
      type: updates.type as ScalingPolicyType,
      service: updates.service as string,
      metrics: updates.metrics as ScalingMetric[],
      thresholds: updates.thresholds as Record<ScalingMetric, number>,
      actions: updates.actions as ScalingAction[],
      minInstances: updates.minInstances as number,
      maxInstances: updates.maxInstances as number,
      cooldownPeriod: updates.cooldownPeriod as number,
      priority: updates.priority as number,
      enabled: updates.enabled as boolean,
      ...(updates.schedule != null && { schedule: updates.schedule as string }),
      ...(updates.predictiveWindow != null && {
        predictiveWindow: updates.predictiveWindow as number,
      }),
    };
    return await this.scalingService.updatePolicy(id, validUpdates);
  }

  @Delete('policies/:id')
  @ApiOperation({ summary: 'Удалить политику масштабирования' })
  @ApiParam({ name: 'id', description: 'ID политики' })
  @ApiResponse({ status: 200, description: 'Политика удалена' })
  @ApiResponse({ status: 404, description: 'Политика не найдена' })
  async deletePolicy(@Param('id') id: string) {
    const success = await this.scalingService.deletePolicy(id);
    if (success) {
      return { message: 'Policy deleted successfully' };
    }
    return { message: 'Policy not found' };
  }

  @Post('evaluate/:service')
  @ApiOperation({
    summary: 'Оценить необходимость масштабирования для сервиса',
  })
  @ApiParam({ name: 'service', description: 'Название сервиса' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        metrics: {
          type: 'object',
          description: 'Метрики сервиса',
        },
      },
      required: ['metrics'],
    },
  })
  @ApiResponse({ status: 200, description: 'Результат оценки' })
  async evaluateScaling(
    @Param('service') _service: string,
    @Body() body: { metrics: Record<string, number> }
  ) {
    return await this.scalingService.evaluateScaling(_service, body.metrics);
  }

  @Post('execute/:decisionId')
  @ApiOperation({ summary: 'Выполнить решение о масштабировании' })
  @ApiParam({ name: 'decisionId', description: 'ID решения' })
  @ApiResponse({ status: 200, description: 'Решение выполнено' })
  @ApiResponse({ status: 404, description: 'Решение не найдено' })
  async executeScaling(@Param('decisionId') decisionId: string) {
    const success = await this.scalingService.executeScaling(decisionId);
    return {
      message: success
        ? 'Scaling executed successfully'
        : 'Failed to execute scaling',
      success,
    };
  }

  @Get('decisions')
  @ApiOperation({ summary: 'Получить все решения о масштабировании' })
  @ApiQuery({
    name: 'service',
    required: false,
    description: 'Фильтр по сервису',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Фильтр по статусу (pending/executed)',
  })
  @ApiResponse({ status: 200, description: 'Список решений' })
  async getAllDecisions(
    @Query('service') service?: string,
    @Query('status') status?: string
  ) {
    if (service != null && service !== '') {
      return await this.scalingService.getDecisionsByService(service);
    }
    if (status === 'pending') {
      return await this.scalingService.getPendingDecisions();
    }
    return await this.scalingService.getAllDecisions();
  }

  @Get('decisions/:id')
  @ApiOperation({ summary: 'Получить решение по ID' })
  @ApiParam({ name: 'id', description: 'ID решения' })
  @ApiResponse({ status: 200, description: 'Детали решения' })
  @ApiResponse({ status: 404, description: 'Решение не найдено' })
  async getDecision(@Param('id') id: string) {
    return await this.scalingService.getDecision(id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Получить историю масштабирования' })
  @ApiQuery({
    name: 'service',
    required: false,
    description: 'Фильтр по сервису',
  })
  @ApiResponse({ status: 200, description: 'История масштабирования' })
  async getScalingHistory(@Query('service') service?: string) {
    return await this.scalingService.getScalingHistory(service);
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Получить общую статистику масштабирования' })
  @ApiResponse({ status: 200, description: 'Статистика масштабирования' })
  async getScalingStats() {
    return await this.scalingService.getScalingStats();
  }

  @Post('demo/simulate-metrics')
  @ApiOperation({ summary: 'Демо: Симуляция метрик для тестирования' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        service: { type: 'string', description: 'Название сервиса' },
      },
      required: ['service'],
    },
  })
  @ApiResponse({ status: 200, description: 'Метрики симулированы' })
  async simulateMetrics(@Body() body: { _service: string }) {
    // Этот метод будет вызывать внутренний метод симуляции метрик
    // Для демонстрации возвращаем заглушку
    return {
      message: 'Metrics simulation triggered',
      service: body._service,
      timestamp: new Date().toISOString(),
      note: 'Check logs for actual metrics simulation and scaling evaluation',
    };
  }

  @Get('demo/status')
  @ApiOperation({ summary: 'Демо: Статус системы масштабирования' })
  @ApiResponse({ status: 200, description: 'Статус системы' })
  async getDemoStatus() {
    const stats = await this.scalingService.getScalingStats();
    const pendingDecisions = await this.scalingService.getPendingDecisions();

    return {
      systemStatus: 'OPERATIONAL',
      autoScaling: 'ENABLED',
      totalPolicies: stats.totalPolicies,
      activePolicies: stats.activePolicies,
      totalScalingEvents: stats.totalScalingEvents,
      successfulScalingEvents: stats.successfulScalingEvents,
      pendingDecisions: pendingDecisions.length,
      averageExecutionTime: `${(stats.averageExecutionTime / 1000).toFixed(1)} seconds`,
      services: stats.services,
      lastUpdated: new Date().toISOString(),
      note: 'System automatically evaluates scaling every 30 seconds',
    };
  }

  @Post('demo/load-test')
  @ApiOperation({
    summary: 'Демо: Создать нагрузку для тестирования масштабирования',
  })
  @ApiResponse({ status: 200, description: 'Нагрузка создана' })
  async createLoadTest() {
    // Симулируем высокую нагрузку для демонстрации масштабирования
    const services = ['api', 'web'];
    const results = [];

    for (const service of services) {
      // Симулируем критические метрики
      const criticalMetrics = {
        [ScalingMetric.CPU_USAGE]: 95,
        [ScalingMetric.MEMORY_USAGE]: 90,
        [ScalingMetric.REQUEST_RATE]: 2500,
        [ScalingMetric.RESPONSE_TIME]: 1200,
        [ScalingMetric.ERROR_RATE]: 8,
        [ScalingMetric.QUEUE_SIZE]: 100,
      };

      const decisions = await this.scalingService.evaluateScaling(
        service,
        criticalMetrics
      );
      results.push({
        service,
        decisions: decisions.length,
        triggered: decisions.length > 0,
      });
    }

    return {
      message: 'Load test completed',
      results,
      note: 'Check scaling decisions and execution logs',
    };
  }
}
