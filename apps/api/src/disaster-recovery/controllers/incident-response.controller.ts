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
import { CreateIncidentResponseDto } from '../dto/create-incident-response.dto';
import { UpdateIncidentResponseDto } from '../dto/update-incident-response.dto';
import type {
  IIncidentAction,
  IIncidentResponse,
} from '../interfaces/disaster-recovery.interface';
import { IncidentResponseService } from '../services/incident-response.service';

@ApiTags('Incident Response')
@Controller('incident-response')
export class IncidentResponseController {
  private readonly logger = new Logger(IncidentResponseController.name);

  constructor(
    private readonly incidentResponseService: IncidentResponseService
  ) {}

  @Get('incidents')
  @ApiOperation({ summary: 'Get all incidents' })
  @ApiResponse({
    status: 200,
    description: 'List of all incidents',
    type: [Object],
  })
  async getAllIncidents(): Promise<IIncidentResponse[]> {
    this.logger.log('Getting all incidents');
    return this.incidentResponseService.getAllIncidents();
  }

  @Get('incidents/:id')
  @ApiOperation({ summary: 'Get incident by ID' })
  @ApiParam({ name: 'id', description: 'Incident ID' })
  @ApiResponse({
    status: 200,
    description: 'Incident found',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Incident not found',
  })
  async getIncidentById(
    @Param('id') id: string
  ): Promise<IIncidentResponse | null> {
    this.logger.log(`Getting incident by ID: ${id}`);
    return this.incidentResponseService.getIncidentById(id);
  }

  @Post('incidents')
  @ApiOperation({ summary: 'Create new incident' })
  @ApiResponse({
    status: 201,
    description: 'Incident created successfully',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @HttpCode(HttpStatus.CREATED)
  async createIncident(
    @Body() createDto: CreateIncidentResponseDto
  ): Promise<IIncidentResponse> {
    this.logger.log('Creating new incident');
    return this.incidentResponseService.createIncident(createDto);
  }

  @Put('incidents/:id')
  @ApiOperation({ summary: 'Update incident' })
  @ApiParam({ name: 'id', description: 'Incident ID' })
  @ApiResponse({
    status: 200,
    description: 'Incident updated successfully',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Incident not found',
  })
  async updateIncident(
    @Param('id') id: string,
    @Body() updateDto: UpdateIncidentResponseDto
  ): Promise<IIncidentResponse | null> {
    this.logger.log(`Updating incident: ${id}`);
    return this.incidentResponseService.updateIncident(id, updateDto);
  }

  @Delete('incidents/:id')
  @ApiOperation({ summary: 'Delete incident' })
  @ApiParam({ name: 'id', description: 'Incident ID' })
  @ApiResponse({
    status: 200,
    description: 'Incident deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Incident not found',
  })
  async deleteIncident(@Param('id') id: string): Promise<{ success: boolean }> {
    this.logger.log(`Deleting incident: ${id}`);
    const deleted = await this.incidentResponseService.deleteIncident(id);
    return { success: deleted };
  }

  @Post('incidents/:id/actions')
  @ApiOperation({ summary: 'Add action to incident' })
  @ApiParam({ name: 'id', description: 'Incident ID' })
  @ApiResponse({
    status: 201,
    description: 'Action added successfully',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Incident not found',
  })
  @HttpCode(HttpStatus.CREATED)
  async addActionToIncident(
    @Param('id') id: string,
    @Body() action: Omit<IIncidentAction, 'id'>
  ): Promise<IIncidentAction | null> {
    this.logger.log(`Adding action to incident: ${id}`);
    return this.incidentResponseService.addActionToIncident(id, action);
  }

  @Put('incidents/:incidentId/actions/:actionId/status')
  @ApiOperation({ summary: 'Update action status' })
  @ApiParam({ name: 'incidentId', description: 'Incident ID' })
  @ApiParam({ name: 'actionId', description: 'Action ID' })
  @ApiResponse({
    status: 200,
    description: 'Action status updated successfully',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Incident or action not found',
  })
  async updateActionStatus(
    @Param('incidentId') incidentId: string,
    @Param('actionId') actionId: string,
    @Body()
    updateData: {
      status: IIncidentAction['status'];
      result?: string;
      error?: string;
    }
  ): Promise<IIncidentAction | null> {
    this.logger.log(
      `Updating action status: ${actionId} in incident: ${incidentId}`
    );
    return this.incidentResponseService.updateActionStatus(
      incidentId,
      actionId,
      updateData.status,
      updateData.result,
      updateData.error
    );
  }

  @Post('incidents/:id/execute-recovery')
  @ApiOperation({ summary: 'Execute recovery procedures for incident' })
  @ApiParam({ name: 'id', description: 'Incident ID' })
  @ApiResponse({
    status: 200,
    description: 'Recovery procedures executed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        actionsExecuted: { type: 'number' },
        totalActions: { type: 'number' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async executeRecoveryProcedures(@Param('id') id: string): Promise<{
    success: boolean;
    actionsExecuted: number;
    totalActions: number;
    errors: string[];
  }> {
    this.logger.log(`Executing recovery procedures for incident: ${id}`);
    return this.incidentResponseService.executeRecoveryProcedures(id);
  }

  @Get('incidents/search/type')
  @ApiOperation({ summary: 'Find incidents by type' })
  @ApiQuery({ name: 'type', description: 'Incident type' })
  @ApiResponse({
    status: 200,
    description: 'Incidents found by type',
    type: [Object],
  })
  async findIncidentsByType(
    @Query('type') type: IIncidentResponse['type']
  ): Promise<IIncidentResponse[]> {
    this.logger.log(`Finding incidents by type: ${type}`);
    return this.incidentResponseService.findIncidentsByType(type);
  }

  @Get('incidents/search/severity')
  @ApiOperation({ summary: 'Find incidents by severity' })
  @ApiQuery({ name: 'severity', description: 'Incident severity' })
  @ApiResponse({
    status: 200,
    description: 'Incidents found by severity',
    type: [Object],
  })
  async findIncidentsBySeverity(
    @Query('severity') severity: IIncidentResponse['severity']
  ): Promise<IIncidentResponse[]> {
    this.logger.log(`Finding incidents by severity: ${severity}`);
    return this.incidentResponseService.findIncidentsBySeverity(severity);
  }

  @Get('incidents/search/status')
  @ApiOperation({ summary: 'Find incidents by status' })
  @ApiQuery({ name: 'status', description: 'Incident status' })
  @ApiResponse({
    status: 200,
    description: 'Incidents found by status',
    type: [Object],
  })
  async findIncidentsByStatus(
    @Query('status') status: IIncidentResponse['status']
  ): Promise<IIncidentResponse[]> {
    this.logger.log(`Finding incidents by status: ${status}`);
    return this.incidentResponseService.findIncidentsByStatus(status);
  }

  @Get('incidents/active')
  @ApiOperation({ summary: 'Get active incidents' })
  @ApiResponse({
    status: 200,
    description: 'Active incidents',
    type: [Object],
  })
  async getActiveIncidents(): Promise<IIncidentResponse[]> {
    this.logger.log('Getting active incidents');
    return this.incidentResponseService.getActiveIncidents();
  }

  @Get('history')
  @ApiOperation({ summary: 'Get incident history' })
  @ApiQuery({
    name: 'limit',
    description: 'Number of history records to return',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Incident history',
    type: [Object],
  })
  async getIncidentHistory(@Query('limit') limit = 100): Promise<
    Array<{
      timestamp: Date;
      incidentId: string;
      action: string;
      details: string;
    }>
  > {
    this.logger.log(`Getting incident history with limit: ${limit}`);
    return this.incidentResponseService.getIncidentHistory(limit);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get incident statistics' })
  @ApiResponse({
    status: 200,
    description: 'Incident statistics',
    schema: {
      type: 'object',
      properties: {
        totalIncidents: { type: 'number' },
        activeIncidents: { type: 'number' },
        resolvedIncidents: { type: 'number' },
        incidentsByType: { type: 'object' },
        incidentsBySeverity: { type: 'object' },
        averageResolutionTime: { type: 'number' },
        lastIncident: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getIncidentStatistics(): Promise<{
    totalIncidents: number;
    activeIncidents: number;
    resolvedIncidents: number;
    incidentsByType: Record<string, number>;
    incidentsBySeverity: Record<string, number>;
    averageResolutionTime: number;
    lastIncident?: Date;
  }> {
    this.logger.log('Getting incident statistics');
    return this.incidentResponseService.getIncidentStatistics();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check incident response system health' })
  @ApiResponse({
    status: 200,
    description: 'System health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', format: 'date-time' },
        totalIncidents: { type: 'number', example: 2 },
        activeIncidents: { type: 'number', example: 1 },
        resolvedIncidents: { type: 'number', example: 1 },
        system: { type: 'string', example: 'operational' },
      },
    },
  })
  async getSystemHealth(): Promise<{
    status: string;
    timestamp: Date;
    totalIncidents: number;
    activeIncidents: number;
    resolvedIncidents: number;
    system: string;
  }> {
    this.logger.log('Checking incident response system health');

    const stats = await this.incidentResponseService.getIncidentStatistics();

    return {
      status: stats.activeIncidents > 0 ? 'warning' : 'healthy',
      timestamp: new Date(),
      totalIncidents: stats.totalIncidents,
      activeIncidents: stats.activeIncidents,
      resolvedIncidents: stats.resolvedIncidents,
      system: stats.activeIncidents > 0 ? 'responding' : 'operational',
    };
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get incident response system overview' })
  @ApiResponse({
    status: 200,
    description: 'System overview',
    schema: {
      type: 'object',
      properties: {
        totalIncidents: { type: 'number' },
        activeIncidents: { type: 'number' },
        resolvedIncidents: { type: 'number' },
        incidentTypes: { type: 'array', items: { type: 'string' } },
        severityLevels: { type: 'array', items: { type: 'string' } },
        averageResolutionTime: { type: 'number' },
        lastUpdated: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getSystemOverview(): Promise<{
    totalIncidents: number;
    activeIncidents: number;
    resolvedIncidents: number;
    incidentTypes: string[];
    severityLevels: string[];
    averageResolutionTime: number;
    lastUpdated: Date;
  }> {
    this.logger.log('Getting incident response system overview');

    const stats = await this.incidentResponseService.getIncidentStatistics();

    const incidentTypes = Object.keys(stats.incidentsByType);
    const severityLevels = Object.keys(stats.incidentsBySeverity);

    return {
      totalIncidents: stats.totalIncidents,
      activeIncidents: stats.activeIncidents,
      resolvedIncidents: stats.resolvedIncidents,
      incidentTypes,
      severityLevels,
      averageResolutionTime: stats.averageResolutionTime,
      lastUpdated: new Date(),
    };
  }

  @Post('simulate-incident')
  @ApiOperation({ summary: 'Simulate incident for testing' })
  @ApiResponse({
    status: 200,
    description: 'Incident simulation completed',
    schema: {
      type: 'object',
      properties: {
        incident: { type: 'object' },
        actions: { type: 'array', items: { type: 'object' } },
        simulationTime: { type: 'number' },
      },
    },
  })
  async simulateIncident(
    @Body()
    request: {
      type: IIncidentResponse['type'];
      severity: IIncidentResponse['severity'];
      affectedDcs: string[];
      description: string;
      playbook: string;
    }
  ): Promise<{
    incident: IIncidentResponse;
    actions: IIncidentAction[];
    simulationTime: number;
  }> {
    this.logger.log(`Simulating incident: ${request.type}`);

    const startTime = Date.now();

    // Создаем инцидент
    const incident = await this.incidentResponseService.createIncident(request);

    // Добавляем автоматические действия на основе типа инцидента
    const actions: IIncidentAction[] = [];

    switch (request.type) {
      case 'power-outage': {
        const powerAction1 =
          await this.incidentResponseService.addActionToIncident(incident.id, {
            description:
              'Автоматическое переключение на резервный источник питания',
            type: 'automatic',
            status: 'pending',
          });
        const powerAction2 =
          await this.incidentResponseService.addActionToIncident(incident.id, {
            description: 'Уведомление технического персонала',
            type: 'automatic',
            status: 'pending',
          });
        if (powerAction1) actions.push(powerAction1);
        if (powerAction2) actions.push(powerAction2);
        break;
      }

      case 'network-failure': {
        const networkAction1 =
          await this.incidentResponseService.addActionToIncident(incident.id, {
            description: 'Переключение на резервный канал связи',
            type: 'automatic',
            status: 'pending',
          });
        const networkAction2 =
          await this.incidentResponseService.addActionToIncident(incident.id, {
            description: 'Диагностика сетевого оборудования',
            type: 'automatic',
            status: 'pending',
          });
        if (networkAction1) actions.push(networkAction1);
        if (networkAction2) actions.push(networkAction2);
        break;
      }

      case 'hardware-failure': {
        const hardwareAction1 =
          await this.incidentResponseService.addActionToIncident(incident.id, {
            description: 'Переключение на резервное оборудование',
            type: 'automatic',
            status: 'pending',
          });
        const hardwareAction2 =
          await this.incidentResponseService.addActionToIncident(incident.id, {
            description: 'Заказ замены оборудования',
            type: 'automatic',
            status: 'pending',
          });
        if (hardwareAction1) actions.push(hardwareAction1);
        if (hardwareAction2) actions.push(hardwareAction2);
        break;
      }

      case 'natural-disaster': {
        const disasterAction1 =
          await this.incidentResponseService.addActionToIncident(incident.id, {
            description: 'Активация плана эвакуации',
            type: 'automatic',
            status: 'pending',
          });
        const disasterAction2 =
          await this.incidentResponseService.addActionToIncident(incident.id, {
            description: 'Переключение на удаленный центр обработки данных',
            type: 'automatic',
            status: 'pending',
          });
        if (disasterAction1) actions.push(disasterAction1);
        if (disasterAction2) actions.push(disasterAction2);
        break;
      }
    }

    const simulationTime = Date.now() - startTime;

    return {
      incident,
      actions,
      simulationTime,
    };
  }
}
