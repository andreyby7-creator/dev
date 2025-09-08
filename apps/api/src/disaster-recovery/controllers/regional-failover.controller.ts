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
import { CreateFailoverConfigDto } from '../dto/create-failover-config.dto';
import { UpdateFailoverConfigDto } from '../dto/update-failover-config.dto';
import type { IFailoverConfig } from '../interfaces/disaster-recovery.interface';
import { RegionalFailoverService } from '../services/regional-failover.service';

@ApiTags('Regional Failover')
@Controller('regional-failover')
export class RegionalFailoverController {
  private readonly logger = new Logger(RegionalFailoverController.name);

  constructor(
    private readonly regionalFailoverService: RegionalFailoverService
  ) {}

  @Get('configs')
  @ApiOperation({ summary: 'Get all failover configurations' })
  @ApiResponse({
    status: 200,
    description: 'List of all failover configurations',
    type: [Object],
  })
  async getAllFailoverConfigs(): Promise<IFailoverConfig[]> {
    this.logger.log('Getting all failover configurations');
    return this.regionalFailoverService.getAllFailoverConfigs();
  }

  @Get('configs/:id')
  @ApiOperation({ summary: 'Get failover configuration by ID' })
  @ApiParam({ name: 'id', description: 'Failover configuration ID' })
  @ApiResponse({
    status: 200,
    description: 'Failover configuration found',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Failover configuration not found',
  })
  async getFailoverConfigById(
    @Param('id') id: string
  ): Promise<IFailoverConfig | null> {
    this.logger.log(`Getting failover config by ID: ${id}`);
    return this.regionalFailoverService.getFailoverConfigById(id);
  }

  @Post('configs')
  @ApiOperation({ summary: 'Create new failover configuration' })
  @ApiResponse({
    status: 201,
    description: 'Failover configuration created successfully',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @HttpCode(HttpStatus.CREATED)
  async createFailoverConfig(
    @Body() createDto: CreateFailoverConfigDto
  ): Promise<IFailoverConfig> {
    this.logger.log('Creating new failover configuration');
    return this.regionalFailoverService.createFailoverConfig(createDto);
  }

  @Put('configs/:id')
  @ApiOperation({ summary: 'Update failover configuration' })
  @ApiParam({ name: 'id', description: 'Failover configuration ID' })
  @ApiResponse({
    status: 200,
    description: 'Failover configuration updated successfully',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Failover configuration not found',
  })
  async updateFailoverConfig(
    @Param('id') id: string,
    @Body() updateDto: UpdateFailoverConfigDto
  ): Promise<IFailoverConfig | null> {
    this.logger.log(`Updating failover config: ${id}`);
    return this.regionalFailoverService.updateFailoverConfig(id, updateDto);
  }

  @Delete('configs/:id')
  @ApiOperation({ summary: 'Delete failover configuration' })
  @ApiParam({ name: 'id', description: 'Failover configuration ID' })
  @ApiResponse({
    status: 200,
    description: 'Failover configuration deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Failover configuration not found',
  })
  async deleteFailoverConfig(
    @Param('id') id: string
  ): Promise<{ success: boolean }> {
    this.logger.log(`Deleting failover config: ${id}`);
    const deleted = await this.regionalFailoverService.deleteFailoverConfig(id);
    return { success: deleted };
  }

  @Post('configs/:id/auto-failover')
  @ApiOperation({ summary: 'Perform automatic failover for configuration' })
  @ApiParam({ name: 'id', description: 'Failover configuration ID' })
  @ApiResponse({
    status: 200,
    description: 'Auto failover completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        action: { type: 'string', enum: ['failover', 'failback', 'none'] },
        reason: { type: 'string' },
        duration: { type: 'number' },
      },
    },
  })
  async performAutoFailover(@Param('id') id: string): Promise<{
    success: boolean;
    action: 'failover' | 'failback' | 'none';
    reason: string;
    duration: number;
  }> {
    this.logger.log(`Performing auto failover for config: ${id}`);
    return this.regionalFailoverService.performAutoFailover(id);
  }

  @Post('configs/:id/manual-failover')
  @ApiOperation({ summary: 'Perform manual failover to secondary DC' })
  @ApiParam({ name: 'id', description: 'Failover configuration ID' })
  @ApiQuery({ name: 'reason', description: 'Reason for manual failover' })
  @ApiResponse({
    status: 200,
    description: 'Manual failover completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        action: { type: 'string', enum: ['failover', 'failback', 'none'] },
        reason: { type: 'string' },
        duration: { type: 'number' },
      },
    },
  })
  async manualFailover(
    @Param('id') id: string,
    @Query('reason') reason: string
  ): Promise<{
    success: boolean;
    action: 'failover' | 'failback' | 'none';
    reason: string;
    duration: number;
  }> {
    this.logger.log(
      `Performing manual failover for config: ${id}, reason: ${reason}`
    );
    return this.regionalFailoverService.manualFailover(id, reason);
  }

  @Post('configs/:id/manual-failback')
  @ApiOperation({ summary: 'Perform manual failback to primary DC' })
  @ApiParam({ name: 'id', description: 'Failover configuration ID' })
  @ApiQuery({ name: 'reason', description: 'Reason for manual failback' })
  @ApiResponse({
    status: 200,
    description: 'Manual failback completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        action: { type: 'string', enum: ['failover', 'failback', 'none'] },
        reason: { type: 'string' },
        duration: { type: 'number' },
      },
    },
  })
  async manualFailback(
    @Param('id') id: string,
    @Query('reason') reason: string
  ): Promise<{
    success: boolean;
    action: 'failover' | 'failback' | 'none';
    reason: string;
    duration: number;
  }> {
    this.logger.log(
      `Performing manual failback for config: ${id}, reason: ${reason}`
    );
    return this.regionalFailoverService.manualFailback(id, reason);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get failover history' })
  @ApiQuery({
    name: 'limit',
    description: 'Number of history records to return',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Failover history',
    type: [Object],
  })
  async getFailoverHistory(@Query('limit') limit = 50): Promise<
    Array<{
      timestamp: Date;
      configId: string;
      action: 'failover' | 'failback' | 'manual-switch';
      reason: string;
      duration: number;
    }>
  > {
    this.logger.log(`Getting failover history with limit: ${limit}`);
    const history =
      await this.regionalFailoverService.getFailoverHistory(limit);
    return history.map(item => ({
      timestamp: item.timestamp,
      configId: item.configId,
      action: item.action as 'failover' | 'failback' | 'manual-switch',
      reason: item.details,
      duration: item.duration,
    }));
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get failover statistics' })
  @ApiResponse({
    status: 200,
    description: 'Failover statistics',
    schema: {
      type: 'object',
      properties: {
        totalFailovers: { type: 'number' },
        totalFailbacks: { type: 'number' },
        averageFailoverTime: { type: 'number' },
        averageFailbackTime: { type: 'number' },
        lastFailover: { type: 'string', format: 'date-time' },
        lastFailback: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getFailoverStatistics(): Promise<{
    totalFailovers: number;
    totalFailbacks: number;
    averageFailoverTime: number;
    averageFailbackTime: number;
    lastFailover?: Date;
    lastFailback?: Date;
  }> {
    this.logger.log('Getting failover statistics');
    return this.regionalFailoverService.getFailoverStatistics();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check regional failover system health' })
  @ApiResponse({
    status: 200,
    description: 'System health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', format: 'date-time' },
        totalConfigs: { type: 'number', example: 3 },
        activeConfigs: { type: 'number', example: 3 },
        autoFailoverEnabled: { type: 'number', example: 2 },
        system: { type: 'string', example: 'operational' },
      },
    },
  })
  async getSystemHealth(): Promise<{
    status: string;
    timestamp: Date;
    totalConfigs: number;
    activeConfigs: number;
    autoFailoverEnabled: number;
    system: string;
  }> {
    this.logger.log('Checking regional failover system health');

    const allConfigs =
      await this.regionalFailoverService.getAllFailoverConfigs();
    const autoFailoverConfigs = allConfigs.filter(
      config => config.autoFailover
    );

    return {
      status: 'healthy',
      timestamp: new Date(),
      totalConfigs: allConfigs.length,
      activeConfigs: allConfigs.length,
      autoFailoverEnabled: autoFailoverConfigs.length,
      system: 'operational',
    };
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get regional failover system overview' })
  @ApiResponse({
    status: 200,
    description: 'System overview',
    schema: {
      type: 'object',
      properties: {
        totalConfigurations: { type: 'number' },
        autoFailoverEnabled: { type: 'number' },
        manualFailoverOnly: { type: 'number' },
        primaryDCs: { type: 'array', items: { type: 'string' } },
        secondaryDCs: { type: 'array', items: { type: 'string' } },
        averageRTO: { type: 'number' },
        averageRPO: { type: 'number' },
        lastUpdated: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getSystemOverview(): Promise<{
    totalConfigurations: number;
    autoFailoverEnabled: number;
    manualFailoverOnly: number;
    primaryDCs: string[];
    secondaryDCs: string[];
    averageRTO: number;
    averageRPO: number;
    lastUpdated: Date;
  }> {
    this.logger.log('Getting regional failover system overview');

    const allConfigs =
      await this.regionalFailoverService.getAllFailoverConfigs();
    const autoFailoverConfigs = allConfigs.filter(
      config => config.autoFailover
    );
    const manualConfigs = allConfigs.filter(config => !config.autoFailover);

    const primaryDCs = [...new Set(allConfigs.map(config => config.primaryDc))];
    const secondaryDCs = [
      ...new Set(allConfigs.map(config => config.secondaryDc)),
    ];

    const totalRTO = allConfigs.reduce(
      (sum, config) => sum + config.recoveryTimeObjective,
      0
    );
    const totalRPO = allConfigs.reduce(
      (sum, config) => sum + config.recoveryPointObjective,
      0
    );

    return {
      totalConfigurations: allConfigs.length,
      autoFailoverEnabled: autoFailoverConfigs.length,
      manualFailoverOnly: manualConfigs.length,
      primaryDCs,
      secondaryDCs,
      averageRTO:
        allConfigs.length > 0 ? Math.round(totalRTO / allConfigs.length) : 0,
      averageRPO:
        allConfigs.length > 0 ? Math.round(totalRPO / allConfigs.length) : 0,
      lastUpdated: new Date(),
    };
  }
}
