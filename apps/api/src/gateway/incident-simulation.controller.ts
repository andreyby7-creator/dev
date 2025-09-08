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
  IncidentSeverity,
  IncidentSimulationService,
  IncidentType,
} from './incident-simulation.service';

@ApiTags('Incident Simulation & Self-healing')
@Controller('gateway/incidents')
export class IncidentSimulationController {
  constructor(private readonly incidentService: IncidentSimulationService) {}

  @Post('simulate')
  @ApiOperation({ summary: 'Симулировать инцидент' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: Object.values(IncidentType),
          description: 'Тип инцидента',
        },
        severity: {
          type: 'string',
          enum: Object.values(IncidentSeverity),
          description: 'Серьезность инцидента (опционально)',
        },
      },
      required: ['type'],
    },
  })
  @ApiResponse({ status: 201, description: 'Инцидент успешно симулирован' })
  @ApiResponse({ status: 400, description: 'Неверные параметры' })
  async simulateIncident(
    @Body() body: { type: IncidentType; severity?: IncidentSeverity }
  ) {
    return await this.incidentService.simulateIncident(
      body.type,
      body.severity
    );
  }

  @Get()
  @ApiOperation({ summary: 'Получить все инциденты' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Фильтр по статусу',
  })
  @ApiResponse({ status: 200, description: 'Список всех инцидентов' })
  async getAllIncidents(@Query('status') status?: string) {
    if (status != null && status !== '') {
      // Используем getIncidentStats вместо несуществующего getIncidentsByStatus
      const stats = await this.incidentService.getIncidentStats();
      return (
        stats.incidentsByStatus[
          status as 'detected' | 'responding' | 'mitigated' | 'resolved'
        ] ?? []
      );
    }
    return await this.incidentService.getAllIncidents();
  }

  @Get('active')
  @ApiOperation({ summary: 'Получить активные инциденты' })
  @ApiResponse({ status: 200, description: 'Список активных инцидентов' })
  async getActiveIncidents() {
    return await this.incidentService.getActiveIncidents();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить инцидент по ID' })
  @ApiParam({ name: 'id', description: 'ID инцидента' })
  @ApiResponse({ status: 200, description: 'Детали инцидента' })
  @ApiResponse({ status: 404, description: 'Инцидент не найден' })
  async getIncident(@Param('id') id: string) {
    return await this.incidentService.getIncident(id);
  }

  @Put(':id/resolve')
  @ApiOperation({ summary: 'Разрешить инцидент вручную' })
  @ApiParam({ name: 'id', description: 'ID инцидента' })
  @ApiResponse({ status: 200, description: 'Инцидент разрешен' })
  @ApiResponse({ status: 404, description: 'Инцидент не найден' })
  async resolveIncident(@Param('id') id: string) {
    await this.incidentService.resolveIncident(id);
    return { message: 'Incident resolved successfully' };
  }

  @Put(':id/escalate')
  @ApiOperation({ summary: 'Эскалировать инцидент' })
  @ApiParam({ name: 'id', description: 'ID инцидента' })
  @ApiResponse({ status: 200, description: 'Инцидент эскалирован' })
  @ApiResponse({ status: 404, description: 'Инцидент не найден' })
  async escalateIncident(@Param('id') id: string) {
    await this.incidentService.escalateIncident(id);
    return { message: 'Incident escalated successfully' };
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Получить общую статистику инцидентов' })
  @ApiResponse({ status: 200, description: 'Статистика инцидентов' })
  async getIncidentStats() {
    return await this.incidentService.getIncidentStats();
  }

  @Put('config/auto-recovery')
  @ApiOperation({
    summary: 'Обновить конфигурацию автоматического восстановления',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Включить/выключить автоматическое восстановление',
        },
        maxAttempts: {
          type: 'number',
          description: 'Максимальное количество попыток восстановления',
        },
      },
      required: ['enabled'],
    },
  })
  @ApiResponse({ status: 200, description: 'Конфигурация обновлена' })
  async updateAutoRecoveryConfig(
    @Body() body: { enabled: boolean; maxAttempts?: number }
  ) {
    await this.incidentService.updateAutoRecoveryConfig(
      body.enabled,
      body.maxAttempts
    );
    return { message: 'Auto-recovery configuration updated successfully' };
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Очистить все инциденты' })
  @ApiResponse({ status: 200, description: 'Все инциденты очищены' })
  async clearIncidents() {
    await this.incidentService.clearIncidents();
    return { message: 'All incidents cleared successfully' };
  }

  @Post('demo/load-test')
  @ApiOperation({
    summary: 'Демо: Создать несколько инцидентов для тестирования',
  })
  @ApiResponse({ status: 201, description: 'Демо инциденты созданы' })
  async createDemoIncidents() {
    const incidents = [];

    // Создаем различные типы инцидентов для демонстрации
    const types = Object.values(IncidentType);
    const severities = Object.values(IncidentSeverity);

    for (let i = 0; i < 5; i++) {
      const type = types[
        Math.floor(Math.random() * types.length)
      ] as IncidentType;
      const severity =
        severities[Math.floor(Math.random() * severities.length)];

      const incident = await this.incidentService.simulateIncident(
        type,
        severity
      );
      incidents.push(incident);

      // Небольшая задержка между созданием инцидентов
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      message: 'Demo incidents created successfully',
      count: incidents.length,
      incidents: incidents.map(inc => ({
        id: inc.id,
        type: inc.type,
        severity: inc.severity,
      })),
    };
  }

  @Get('demo/status')
  @ApiOperation({ summary: 'Демо: Статус системы инцидентов' })
  @ApiResponse({ status: 200, description: 'Статус системы' })
  async getDemoStatus() {
    const stats = await this.incidentService.getIncidentStats();
    const activeIncidents = await this.incidentService.getActiveIncidents();

    return {
      systemStatus: 'OPERATIONAL',
      autoRecovery: 'ENABLED',
      totalIncidents: stats.totalIncidents,
      activeIncidents: activeIncidents.length,
      resolvedIncidents: stats.resolvedIncidents,
      escalatedIncidents: stats.escalatedIncidents,
      autoRecoverySuccessRate: `${(stats.autoRecoverySuccessRate * 100).toFixed(1)}%`,
      averageResolutionTime: `${stats.averageResolutionTime.toFixed(1)} minutes`,
      lastUpdated: new Date().toISOString(),
    };
  }
}
