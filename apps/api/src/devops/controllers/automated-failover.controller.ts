import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type {
  IDataCenter,
  IFailoverConfig,
  IFailoverEvent,
  IHealthCheckResult,
} from '../services/automated-failover.service';
import { AutomatedFailoverService } from '../services/automated-failover.service';

// DTOs
export class UpdateFailoverConfigDto implements Partial<IFailoverConfig> {
  enabled?: boolean;
  autoFailover?: boolean;
  healthCheckInterval?: number;
  failoverThreshold?: number;
  recoveryThreshold?: number;
  maxFailoverAttempts?: number;
  failoverTimeout?: number;
  notificationChannels?: string[];
}

export class ManualSwitchDto {
  dataCenterId!: string;
  reason!: string;
}

@ApiTags('Automated Failover')
@Controller('devops/failover')
export class AutomatedFailoverController {
  constructor(
    private readonly automatedFailoverService: AutomatedFailoverService
  ) {}

  @Post('start')
  @ApiOperation({ summary: 'Start automated failover monitoring' })
  @ApiResponse({
    status: 201,
    description: 'Automated failover started successfully',
  })
  async startAutomatedFailover(): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.automatedFailoverService.startAutomatedFailover();
    return {
      success: true,
      message: 'Automated failover monitoring started',
    };
  }

  @Post('stop')
  @ApiOperation({ summary: 'Stop automated failover monitoring' })
  @ApiResponse({
    status: 201,
    description: 'Automated failover stopped successfully',
  })
  async stopAutomatedFailover(): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.automatedFailoverService.stopAutomatedFailover();
    return {
      success: true,
      message: 'Automated failover monitoring stopped',
    };
  }

  @Post('health-check')
  @ApiOperation({ summary: 'Perform manual health checks' })
  @ApiResponse({
    status: 201,
    description: 'Health checks performed successfully',
  })
  async performHealthChecks(): Promise<IHealthCheckResult[]> {
    return this.automatedFailoverService.performHealthChecks();
  }

  @Post('failover/:dataCenterId')
  @ApiOperation({
    summary: 'Perform manual failover from specific data center',
  })
  @ApiResponse({ status: 201, description: 'Failover initiated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid data center or no suitable target',
  })
  @ApiParam({ name: 'dataCenterId', description: 'Source data center ID' })
  async performFailover(
    @Param('dataCenterId') dataCenterId: string
  ): Promise<IFailoverEvent> {
    return this.automatedFailoverService.performFailover(dataCenterId);
  }

  @Post('manual-switch')
  @ApiOperation({ summary: 'Manually switch to a specific data center' })
  @ApiResponse({
    status: 201,
    description: 'Manual switch completed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data center or switch failed',
  })
  @ApiBody({ type: ManualSwitchDto })
  async manualSwitch(
    @Body() request: ManualSwitchDto
  ): Promise<IFailoverEvent> {
    return this.automatedFailoverService.manualSwitch(
      request.dataCenterId,
      request.reason
    );
  }

  @Get('config')
  @ApiOperation({ summary: 'Get failover configuration' })
  @ApiResponse({
    status: 200,
    description: 'Configuration retrieved successfully',
  })
  async getConfig(): Promise<IFailoverConfig> {
    return this.automatedFailoverService.getConfig();
  }

  @Post('config')
  @ApiOperation({ summary: 'Update failover configuration' })
  @ApiResponse({
    status: 201,
    description: 'Configuration updated successfully',
  })
  @ApiBody({ type: UpdateFailoverConfigDto })
  async updateConfig(
    @Body() config: UpdateFailoverConfigDto
  ): Promise<{ success: boolean; message: string }> {
    this.automatedFailoverService.updateConfig(config);
    return {
      success: true,
      message: 'Failover configuration updated',
    };
  }

  @Get('data-centers')
  @ApiOperation({ summary: 'Get all data centers' })
  @ApiResponse({
    status: 200,
    description: 'Data centers retrieved successfully',
  })
  async getDataCenters(): Promise<IDataCenter[]> {
    return this.automatedFailoverService.getDataCenters();
  }

  @Get('data-centers/active')
  @ApiOperation({ summary: 'Get active data center' })
  @ApiResponse({
    status: 200,
    description: 'Active data center retrieved successfully',
  })
  async getActiveDataCenter(): Promise<IDataCenter | undefined> {
    return this.automatedFailoverService.getActiveDataCenter();
  }

  @Get('events')
  @ApiOperation({ summary: 'Get failover events history' })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of events to return',
    type: Number,
  })
  async getFailoverEvents(
    @Query('limit') limit?: number
  ): Promise<IFailoverEvent[]> {
    return this.automatedFailoverService.getFailoverEvents(limit);
  }

  @Get('health-results')
  @ApiOperation({ summary: 'Get health check results' })
  @ApiResponse({
    status: 200,
    description: 'Health check results retrieved successfully',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of results to return',
    type: Number,
  })
  async getHealthCheckResults(
    @Query('limit') limit?: number
  ): Promise<IHealthCheckResult[]> {
    return this.automatedFailoverService.getHealthCheckResults(limit);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get failover system status' })
  @ApiResponse({ status: 200, description: 'Status retrieved successfully' })
  async getStatus(): Promise<{
    isMonitoring: boolean;
    activeDataCenter?: IDataCenter;
    totalDataCenters: number;
    healthyDataCenters: number;
    lastHealthCheck: string;
    recentFailoverEvents: number;
  }> {
    const config = this.automatedFailoverService.getConfig();
    const dataCenters = this.automatedFailoverService.getDataCenters();
    const activeDataCenter =
      this.automatedFailoverService.getActiveDataCenter();
    const events = this.automatedFailoverService.getFailoverEvents(10);
    const healthResults =
      this.automatedFailoverService.getHealthCheckResults(1);

    const healthyDataCenters = dataCenters.filter(
      dc => dc.status === 'HEALTHY'
    ).length;
    const recentFailoverEvents = events.filter(
      e =>
        e.type === 'FAILOVER' &&
        Date.now() - new Date(e.timestamp).getTime() < 3600000 // 1 час
    ).length;

    const result: {
      isMonitoring: boolean;
      activeDataCenter?: IDataCenter;
      totalDataCenters: number;
      healthyDataCenters: number;
      lastHealthCheck: string;
      recentFailoverEvents: number;
    } = {
      isMonitoring: config.enabled,
      totalDataCenters: dataCenters.length,
      healthyDataCenters,
      lastHealthCheck:
        healthResults.length > 0 && healthResults[0] != null
          ? healthResults[0].timestamp
          : 'Never',
      recentFailoverEvents,
    };

    if (activeDataCenter != null) {
      result.activeDataCenter = activeDataCenter;
    }

    return result;
  }
}
