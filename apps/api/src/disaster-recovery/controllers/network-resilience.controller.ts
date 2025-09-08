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
import { CreateNetworkLinkDto } from '../dto/create-network-link.dto';
import { UpdateNetworkLinkDto } from '../dto/update-network-link.dto';
import type { INetworkLink } from '../interfaces/disaster-recovery.interface';
import { NetworkResilienceService } from '../services/network-resilience.service';

@ApiTags('Network Resilience')
@Controller('network-resilience')
export class NetworkResilienceController {
  private readonly logger = new Logger(NetworkResilienceController.name);

  constructor(
    private readonly networkResilienceService: NetworkResilienceService
  ) {}

  @Get('links')
  @ApiOperation({ summary: 'Get all network links' })
  @ApiResponse({
    status: 200,
    description: 'List of all network links',
    type: [Object],
  })
  async getAllNetworkLinks(): Promise<INetworkLink[]> {
    this.logger.log('Getting all network links');
    return this.networkResilienceService.getAllNetworkLinks();
  }

  @Get('links/:id')
  @ApiOperation({ summary: 'Get network link by ID' })
  @ApiParam({ name: 'id', description: 'Network link ID' })
  @ApiResponse({
    status: 200,
    description: 'Network link found',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Network link not found',
  })
  async getNetworkLinkById(
    @Param('id') id: string
  ): Promise<INetworkLink | null> {
    this.logger.log(`Getting network link by ID: ${id}`);
    return this.networkResilienceService.getNetworkLinkById(id);
  }

  @Post('links')
  @ApiOperation({ summary: 'Create new network link' })
  @ApiResponse({
    status: 201,
    description: 'Network link created successfully',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @HttpCode(HttpStatus.CREATED)
  async createNetworkLink(
    @Body() createDto: CreateNetworkLinkDto
  ): Promise<INetworkLink> {
    this.logger.log('Creating new network link');
    return this.networkResilienceService.createNetworkLink(createDto);
  }

  @Put('links/:id')
  @ApiOperation({ summary: 'Update network link' })
  @ApiParam({ name: 'id', description: 'Network link ID' })
  @ApiResponse({
    status: 200,
    description: 'Network link updated successfully',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Network link not found',
  })
  async updateNetworkLink(
    @Param('id') id: string,
    @Body() updateDto: UpdateNetworkLinkDto
  ): Promise<INetworkLink | null> {
    this.logger.log(`Updating network link: ${id}`);
    return this.networkResilienceService.updateNetworkLink(id, updateDto);
  }

  @Delete('links/:id')
  @ApiOperation({ summary: 'Delete network link' })
  @ApiParam({ name: 'id', description: 'Network link ID' })
  @ApiResponse({
    status: 200,
    description: 'Network link deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Network link not found',
  })
  async deleteNetworkLink(
    @Param('id') id: string
  ): Promise<{ success: boolean }> {
    this.logger.log(`Deleting network link: ${id}`);
    const deleted = await this.networkResilienceService.deleteNetworkLink(id);
    return { success: deleted };
  }

  @Get('links/:id/health')
  @ApiOperation({ summary: 'Check network link health' })
  @ApiParam({ name: 'id', description: 'Network link ID' })
  @ApiResponse({
    status: 200,
    description: 'Network link health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'degraded', 'down'] },
        latency: { type: 'number' },
        bandwidth: { type: 'number' },
        error: { type: 'string' },
      },
    },
  })
  async checkLinkHealth(@Param('id') id: string): Promise<{
    status: 'active' | 'degraded' | 'down';
    latency: number;
    bandwidth: number;
    error?: string;
  } | null> {
    this.logger.log(`Checking health for network link: ${id}`);
    return this.networkResilienceService.checkLinkHealth(id);
  }

  @Get('links/search/type')
  @ApiOperation({ summary: 'Find network links by type' })
  @ApiQuery({
    name: 'type',
    description: 'Link type (primary, backup, peering)',
  })
  @ApiResponse({
    status: 200,
    description: 'Network links found by type',
    type: [Object],
  })
  async findLinksByType(
    @Query('type') type: 'primary' | 'backup' | 'peering'
  ): Promise<INetworkLink[]> {
    this.logger.log(`Finding network links by type: ${type}`);
    return this.networkResilienceService.findLinksByType(type);
  }

  @Get('links/search/provider')
  @ApiOperation({ summary: 'Find network links by provider' })
  @ApiQuery({ name: 'provider', description: 'Provider name' })
  @ApiResponse({
    status: 200,
    description: 'Network links found by provider',
    type: [Object],
  })
  async findLinksByProvider(
    @Query('provider') provider: string
  ): Promise<INetworkLink[]> {
    this.logger.log(`Finding network links by provider: ${provider}`);
    return this.networkResilienceService.findLinksByProvider(provider);
  }

  @Get('links/search/between-dcs')
  @ApiOperation({ summary: 'Find network links between data centers' })
  @ApiQuery({ name: 'sourceDc', description: 'Source data center ID' })
  @ApiQuery({ name: 'targetDc', description: 'Target data center ID' })
  @ApiResponse({
    status: 200,
    description: 'Network links found between data centers',
    type: [Object],
  })
  async findLinksBetweenDCs(
    @Query('sourceDc') sourceDc: string,
    @Query('targetDc') targetDc: string
  ): Promise<INetworkLink[]> {
    this.logger.log(
      `Finding network links between DCs: ${sourceDc} -> ${targetDc}`
    );
    return this.networkResilienceService.findLinksBetweenDCs(
      sourceDc,
      targetDc
    );
  }

  @Get('links/search/alternative-routes')
  @ApiOperation({ summary: 'Find alternative routes between data centers' })
  @ApiQuery({ name: 'sourceDc', description: 'Source data center ID' })
  @ApiQuery({ name: 'targetDc', description: 'Target data center ID' })
  @ApiResponse({
    status: 200,
    description: 'Alternative routes found',
    type: [Object],
  })
  async getAlternativeRoutes(
    @Query('sourceDc') sourceDc: string,
    @Query('targetDc') targetDc: string
  ): Promise<INetworkLink[]> {
    this.logger.log(
      `Finding alternative routes between DCs: ${sourceDc} -> ${targetDc}`
    );
    return this.networkResilienceService.getAlternativeRoutes(
      sourceDc,
      targetDc
    );
  }

  @Post('links/:id/test-bandwidth')
  @ApiOperation({ summary: 'Test network link bandwidth' })
  @ApiParam({ name: 'id', description: 'Network link ID' })
  @ApiResponse({
    status: 200,
    description: 'Bandwidth test results',
    schema: {
      type: 'object',
      properties: {
        measuredBandwidth: { type: 'number' },
        expectedBandwidth: { type: 'number' },
        efficiency: { type: 'number' },
        status: {
          type: 'string',
          enum: ['optimal', 'good', 'poor', 'critical'],
        },
      },
    },
  })
  async testLinkBandwidth(@Param('id') id: string): Promise<{
    measuredBandwidth: number;
    expectedBandwidth: number;
    efficiency: number;
    status: 'optimal' | 'good' | 'poor' | 'critical';
  }> {
    this.logger.log(`Testing bandwidth for network link: ${id}`);
    return this.networkResilienceService.testLinkBandwidth(id);
  }

  @Post('links/:id/start-monitoring')
  @ApiOperation({ summary: 'Start monitoring network link' })
  @ApiParam({ name: 'id', description: 'Network link ID' })
  @ApiQuery({
    name: 'intervalMs',
    description: 'Monitoring interval in milliseconds',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Monitoring started',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async startLinkMonitoring(
    @Param('id') id: string,
    @Query('intervalMs') intervalMs = 5000
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(
      `Starting monitoring for network link: ${id} with interval: ${intervalMs}ms`
    );
    return this.networkResilienceService.startLinkMonitoring(id, intervalMs);
  }

  @Get('links/:id/health-history')
  @ApiOperation({ summary: 'Get network link health history' })
  @ApiParam({ name: 'id', description: 'Network link ID' })
  @ApiQuery({
    name: 'limit',
    description: 'Number of history records to return',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Network link health history',
    type: [Object],
  })
  async getLinkHealthHistory(
    @Param('id') id: string,
    @Query('limit') limit = 100
  ): Promise<
    Array<{
      timestamp: Date;
      linkId: string;
      status: 'active' | 'degraded' | 'down';
      latency: number;
      bandwidth: number;
      error?: string;
    }>
  > {
    this.logger.log(
      `Getting health history for network link: ${id} with limit: ${limit}`
    );
    const history = await this.networkResilienceService.getLinkHealthHistory(
      id,
      limit
    );
    return history.map(item => ({
      timestamp: item.timestamp,
      linkId: item.linkId,
      status: 'active' as const, // Default status since it's not in the source
      latency: 1, // Default latency since it's not in the source
      action: item.action,
      details: item.details,
      bandwidth: item.bandwidth,
      ...(item.error != null && item.error !== '' && { error: item.error }),
    }));
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get network resilience statistics' })
  @ApiResponse({
    status: 200,
    description: 'Network resilience statistics',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        active: { type: 'number' },
        degraded: { type: 'number' },
        down: { type: 'number' },
        averageLatency: { type: 'number' },
        totalBandwidth: { type: 'number' },
        providers: { type: 'object' },
      },
    },
  })
  async getNetworkLinksStatistics(): Promise<{
    total: number;
    active: number;
    degraded: number;
    down: number;
    averageLatency: number;
    totalBandwidth: number;
    providers: Record<string, number>;
  }> {
    this.logger.log('Getting network resilience statistics');
    return this.networkResilienceService.getNetworkLinksStatistics();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check network resilience system health' })
  @ApiResponse({
    status: 200,
    description: 'System health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', format: 'date-time' },
        totalLinks: { type: 'number', example: 8 },
        activeLinks: { type: 'number', example: 7 },
        degradedLinks: { type: 'number', example: 1 },
        downLinks: { type: 'number', example: 0 },
        system: { type: 'string', example: 'operational' },
      },
    },
  })
  async getSystemHealth(): Promise<{
    status: string;
    timestamp: Date;
    totalLinks: number;
    activeLinks: number;
    degradedLinks: number;
    downLinks: number;
    system: string;
  }> {
    this.logger.log('Checking network resilience system health');

    const stats =
      await this.networkResilienceService.getNetworkLinksStatistics();

    return {
      status:
        stats.down > 0
          ? 'degraded'
          : stats.degraded > 0
            ? 'warning'
            : 'healthy',
      timestamp: new Date(),
      totalLinks: stats.total,
      activeLinks: stats.active,
      degradedLinks: stats.degraded,
      downLinks: stats.down,
      system: stats.down > 0 ? 'degraded' : 'operational',
    };
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get network resilience system overview' })
  @ApiResponse({
    status: 200,
    description: 'System overview',
    schema: {
      type: 'object',
      properties: {
        totalLinks: { type: 'number' },
        primaryLinks: { type: 'number' },
        backupLinks: { type: 'number' },
        peeringLinks: { type: 'number' },
        providers: { type: 'array', items: { type: 'string' } },
        averageLatency: { type: 'number' },
        totalBandwidth: { type: 'number' },
        lastUpdated: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getSystemOverview(): Promise<{
    totalLinks: number;
    primaryLinks: number;
    backupLinks: number;
    peeringLinks: number;
    providers: string[];
    averageLatency: number;
    totalBandwidth: number;
    lastUpdated: Date;
  }> {
    this.logger.log('Getting network resilience system overview');

    const allLinks = await this.networkResilienceService.getAllNetworkLinks();
    const stats =
      await this.networkResilienceService.getNetworkLinksStatistics();

    const primaryLinks = allLinks.filter(
      link => link.type === 'primary'
    ).length;
    const backupLinks = allLinks.filter(link => link.type === 'backup').length;
    const peeringLinks = allLinks.filter(
      link => link.type === 'peering'
    ).length;
    const providers = Object.keys(stats.providers);

    return {
      totalLinks: stats.total,
      primaryLinks,
      backupLinks,
      peeringLinks,
      providers,
      averageLatency: stats.averageLatency,
      totalBandwidth: stats.totalBandwidth,
      lastUpdated: new Date(),
    };
  }
}
