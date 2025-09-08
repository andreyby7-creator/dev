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
import { CreateDataCenterDto } from '../dto/create-data-center.dto';
import { UpdateDataCenterDto } from '../dto/update-data-center.dto';
import type { IDataCenter } from '../interfaces/disaster-recovery.interface';
import { DisasterRecoveryService } from '../services/disaster-recovery.service';

@ApiTags('Disaster Recovery')
@Controller('disaster-recovery')
export class DisasterRecoveryController {
  private readonly logger = new Logger(DisasterRecoveryController.name);

  constructor(
    private readonly disasterRecoveryService: DisasterRecoveryService
  ) {}

  @Get('data-centers')
  @ApiOperation({ summary: 'Get all data centers' })
  @ApiResponse({
    status: 200,
    description: 'List of all data centers',
    type: [Object],
  })
  async getAllDataCenters(): Promise<IDataCenter[]> {
    this.logger.log('Getting all data centers');
    return this.disasterRecoveryService.getAllDataCenters();
  }

  @Get('data-centers/:id')
  @ApiOperation({ summary: 'Get data center by ID' })
  @ApiParam({ name: 'id', description: 'Data center ID' })
  @ApiResponse({
    status: 200,
    description: 'Data center found',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Data center not found',
  })
  async getDataCenterById(
    @Param('id') id: string
  ): Promise<IDataCenter | null> {
    this.logger.log(`Getting data center by ID: ${id}`);
    return this.disasterRecoveryService.getDataCenterById(id);
  }

  @Post('data-centers')
  @ApiOperation({ summary: 'Create new data center' })
  @ApiResponse({
    status: 201,
    description: 'Data center created successfully',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @HttpCode(HttpStatus.CREATED)
  async createDataCenter(
    @Body() createDto: CreateDataCenterDto
  ): Promise<IDataCenter> {
    this.logger.log('Creating new data center');
    return this.disasterRecoveryService.createDataCenter(createDto);
  }

  @Put('data-centers/:id')
  @ApiOperation({ summary: 'Update data center' })
  @ApiParam({ name: 'id', description: 'Data center ID' })
  @ApiResponse({
    status: 200,
    description: 'Data center updated successfully',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Data center not found',
  })
  async updateDataCenter(
    @Param('id') id: string,
    @Body() updateDto: UpdateDataCenterDto
  ): Promise<IDataCenter | null> {
    this.logger.log(`Updating data center: ${id}`);
    return this.disasterRecoveryService.updateDataCenter(id, updateDto);
  }

  @Delete('data-centers/:id')
  @ApiOperation({ summary: 'Delete data center' })
  @ApiParam({ name: 'id', description: 'Data center ID' })
  @ApiResponse({
    status: 200,
    description: 'Data center deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Data center not found',
  })
  async deleteDataCenter(
    @Param('id') id: string
  ): Promise<{ success: boolean }> {
    this.logger.log(`Deleting data center: ${id}`);
    const deleted = await this.disasterRecoveryService.deleteDataCenter(id);
    return { success: deleted };
  }

  @Get('data-centers/:id/health')
  @ApiOperation({ summary: 'Check data center health' })
  @ApiParam({ name: 'id', description: 'Data center ID' })
  @ApiResponse({
    status: 200,
    description: 'Data center health status',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Data center not found',
  })
  async checkDataCenterHealth(
    @Param('id') id: string
  ): Promise<{ status: string; uptime: number; lastCheck: Date } | null> {
    this.logger.log(`Checking health for data center: ${id}`);
    return this.disasterRecoveryService.checkDataCenterHealth(id);
  }

  @Get('data-centers/status/overview')
  @ApiOperation({ summary: 'Get status overview of all data centers' })
  @ApiResponse({
    status: 200,
    description: 'Data centers status overview',
    type: Object,
  })
  async getDataCentersStatus(): Promise<Record<string, string>> {
    this.logger.log('Getting data centers status overview');
    return this.disasterRecoveryService.getDataCentersStatus();
  }

  @Get('data-centers/statistics/overview')
  @ApiOperation({ summary: 'Get statistics overview of all data centers' })
  @ApiResponse({
    status: 200,
    description: 'Data centers statistics overview',
    type: Object,
  })
  async getDataCentersStatistics(): Promise<{
    total: number;
    active: number;
    standby: number;
    maintenance: number;
    offline: number;
  }> {
    this.logger.log('Getting data centers statistics overview');
    return this.disasterRecoveryService.getDataCentersStatistics();
  }

  @Get('data-centers/search/region')
  @ApiOperation({ summary: 'Find data centers by region' })
  @ApiQuery({ name: 'region', description: 'Region name' })
  @ApiResponse({
    status: 200,
    description: 'Data centers found in region',
    type: [Object],
  })
  async findDataCentersByRegion(
    @Query('region') region: string
  ): Promise<IDataCenter[]> {
    this.logger.log(`Finding data centers by region: ${region}`);
    return this.disasterRecoveryService.findDataCentersByRegion(region);
  }

  @Get('data-centers/search/country')
  @ApiOperation({ summary: 'Find data centers by country' })
  @ApiQuery({ name: 'country', description: 'Country code (BY or RU)' })
  @ApiResponse({
    status: 200,
    description: 'Data centers found in country',
    type: [Object],
  })
  async findDataCentersByCountry(
    @Query('country') country: 'BY' | 'RU'
  ): Promise<IDataCenter[]> {
    this.logger.log(`Finding data centers by country: ${country}`);
    return this.disasterRecoveryService.findDataCentersByCountry(country);
  }

  @Get('data-centers/search/nearest')
  @ApiOperation({ summary: 'Find nearest data center by coordinates' })
  @ApiQuery({ name: 'latitude', description: 'Latitude coordinate' })
  @ApiQuery({ name: 'longitude', description: 'Longitude coordinate' })
  @ApiResponse({
    status: 200,
    description: 'Nearest data center found',
    type: Object,
  })
  async findNearestDataCenter(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number
  ): Promise<IDataCenter | null> {
    this.logger.log(
      `Finding nearest data center for coordinates: ${latitude}, ${longitude}`
    );
    return this.disasterRecoveryService.findNearestDataCenter(
      latitude,
      longitude
    );
  }

  @Get('health')
  @ApiOperation({ summary: 'Check disaster recovery system health' })
  @ApiResponse({
    status: 200,
    description: 'System health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', format: 'date-time' },
        dataCenters: { type: 'number', example: 4 },
        activeDataCenters: { type: 'number', example: 4 },
        system: { type: 'string', example: 'operational' },
      },
    },
  })
  async getSystemHealth(): Promise<{
    status: string;
    timestamp: Date;
    dataCenters: number;
    activeDataCenters: number;
    system: string;
  }> {
    this.logger.log('Checking disaster recovery system health');

    const allDCs = await this.disasterRecoveryService.getAllDataCenters();
    const activeDCs = allDCs.filter(dc => dc.status === 'active');

    return {
      status: 'healthy',
      timestamp: new Date(),
      dataCenters: allDCs.length,
      activeDataCenters: activeDCs.length,
      system: 'operational',
    };
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get disaster recovery system overview' })
  @ApiResponse({
    status: 200,
    description: 'System overview',
    schema: {
      type: 'object',
      properties: {
        totalDataCenters: { type: 'number' },
        activeDataCenters: { type: 'number' },
        standbyDataCenters: { type: 'number' },
        maintenanceDataCenters: { type: 'number' },
        offlineDataCenters: { type: 'number' },
        countries: { type: 'array', items: { type: 'string' } },
        regions: { type: 'array', items: { type: 'string' } },
        lastUpdated: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getSystemOverview(): Promise<{
    totalDataCenters: number;
    activeDataCenters: number;
    standbyDataCenters: number;
    maintenanceDataCenters: number;
    offlineDataCenters: number;
    countries: string[];
    regions: string[];
    lastUpdated: Date;
  }> {
    this.logger.log('Getting disaster recovery system overview');

    const allDCs = await this.disasterRecoveryService.getAllDataCenters();
    const stats = await this.disasterRecoveryService.getDataCentersStatistics();

    const countries = [...new Set(allDCs.map(dc => dc.country))];
    const regions = [...new Set(allDCs.map(dc => dc.region))];

    return {
      totalDataCenters: stats.total,
      activeDataCenters: stats.active,
      standbyDataCenters: stats.standby,
      maintenanceDataCenters: stats.maintenance,
      offlineDataCenters: stats.offline,
      countries,
      regions,
      lastUpdated: new Date(),
    };
  }
}
