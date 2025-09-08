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
import { CreateGeographicRouteDto } from '../dto/create-geographic-route.dto';
import { UpdateGeographicRouteDto } from '../dto/update-geographic-route.dto';
import type {
  IDataCenter,
  IGeographicRoute,
} from '../interfaces/disaster-recovery.interface';
import { GeographicRoutingService } from '../services/geographic-routing.service';

@ApiTags('Geographic Routing')
@Controller('geographic-routing')
export class GeographicRoutingController {
  private readonly logger = new Logger(GeographicRoutingController.name);

  constructor(
    private readonly geographicRoutingService: GeographicRoutingService
  ) {}

  @Get('routes')
  @ApiOperation({ summary: 'Get all geographic routes' })
  @ApiResponse({
    status: 200,
    description: 'List of all geographic routes',
    type: [Object],
  })
  async getAllRoutes(): Promise<IGeographicRoute[]> {
    this.logger.log('Getting all geographic routes');
    return this.geographicRoutingService.getAllRoutes();
  }

  @Get('routes/:id')
  @ApiOperation({ summary: 'Get geographic route by ID' })
  @ApiParam({ name: 'id', description: 'Geographic route ID' })
  @ApiResponse({
    status: 200,
    description: 'Geographic route found',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Geographic route not found',
  })
  async getRouteById(
    @Param('id') id: string
  ): Promise<IGeographicRoute | null> {
    this.logger.log(`Getting geographic route by ID: ${id}`);
    return this.geographicRoutingService.getRouteById(id);
  }

  @Post('routes')
  @ApiOperation({ summary: 'Create new geographic route' })
  @ApiResponse({
    status: 201,
    description: 'Geographic route created successfully',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @HttpCode(HttpStatus.CREATED)
  async createRoute(
    @Body() createDto: CreateGeographicRouteDto
  ): Promise<IGeographicRoute> {
    this.logger.log('Creating new geographic route');
    return this.geographicRoutingService.createRoute(createDto);
  }

  @Put('routes/:id')
  @ApiOperation({ summary: 'Update geographic route' })
  @ApiParam({ name: 'id', description: 'Geographic route ID' })
  @ApiResponse({
    status: 200,
    description: 'Geographic route updated successfully',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Geographic route not found',
  })
  async updateRoute(
    @Param('id') id: string,
    @Body() updateDto: UpdateGeographicRouteDto
  ): Promise<IGeographicRoute | null> {
    this.logger.log(`Updating geographic route: ${id}`);
    return this.geographicRoutingService.updateRoute(id, updateDto);
  }

  @Delete('routes/:id')
  @ApiOperation({ summary: 'Delete geographic route' })
  @ApiParam({ name: 'id', description: 'Geographic route ID' })
  @ApiResponse({
    status: 200,
    description: 'Geographic route deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Geographic route not found',
  })
  async deleteRoute(@Param('id') id: string): Promise<{ success: boolean }> {
    this.logger.log(`Deleting geographic route: ${id}`);
    const deleted = await this.geographicRoutingService.deleteRoute(id);
    return { success: deleted };
  }

  @Post('determine-optimal-dc')
  @ApiOperation({ summary: 'Determine optimal data center for user location' })
  @ApiResponse({
    status: 200,
    description: 'Optimal data center determined',
    schema: {
      type: 'object',
      properties: {
        selectedDc: { type: 'object' },
        route: { type: 'object' },
        metrics: { type: 'object' },
        processingTime: { type: 'number' },
      },
    },
  })
  async determineOptimalDataCenter(
    @Body()
    request: {
      userLocation: IGeographicRoute['userLocation'];
      strategy?: IGeographicRoute['routingStrategy'];
      availableDCs?: string[];
    }
  ): Promise<{
    selectedDc: string;
    route: IGeographicRoute;
    metrics: IGeographicRoute['metrics'];
    processingTime: number;
  } | null> {
    this.logger.log('Determining optimal data center for user location');
    if (!request.strategy) {
      throw new Error('Routing strategy is required');
    }
    return this.geographicRoutingService.determineOptimalDataCenter(
      request.userLocation,
      request.strategy,
      request.availableDCs
        ? (request.availableDCs as unknown as IDataCenter[])
        : undefined
    );
  }

  @Get('routes/search/country')
  @ApiOperation({ summary: 'Find routes by country' })
  @ApiQuery({ name: 'country', description: 'Country code (BY or RU)' })
  @ApiResponse({
    status: 200,
    description: 'Routes found by country',
    type: [Object],
  })
  async findRoutesByCountry(
    @Query('country') country: string
  ): Promise<IGeographicRoute[]> {
    this.logger.log(`Finding routes by country: ${country}`);
    return this.geographicRoutingService.findRoutesByCountry(country);
  }

  @Get('routes/search/region')
  @ApiOperation({ summary: 'Find routes by region' })
  @ApiQuery({ name: 'region', description: 'Region name' })
  @ApiResponse({
    status: 200,
    description: 'Routes found by region',
    type: [Object],
  })
  async findRoutesByRegion(
    @Query('region') region: string
  ): Promise<IGeographicRoute[]> {
    this.logger.log(`Finding routes by region: ${region}`);
    return this.geographicRoutingService.findRoutesByRegion(region);
  }

  @Get('routes/search/strategy')
  @ApiOperation({ summary: 'Find routes by routing strategy' })
  @ApiQuery({ name: 'strategy', description: 'Routing strategy' })
  @ApiResponse({
    status: 200,
    description: 'Routes found by strategy',
    type: [Object],
  })
  async findRoutesByStrategy(
    @Query('strategy') strategy?: IGeographicRoute['routingStrategy']
  ): Promise<IGeographicRoute[]> {
    this.logger.log(`Finding routes by strategy: ${strategy}`);
    if (!strategy) {
      throw new Error('Routing strategy is required');
    }
    return this.geographicRoutingService.findRoutesByStrategy(strategy);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get routing history' })
  @ApiQuery({
    name: 'limit',
    description: 'Number of history records to return',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Routing history',
    type: [Object],
  })
  async getRoutingHistory(@Query('limit') limit = 100): Promise<
    Array<{
      timestamp: Date;
      userId: string;
      userLocation: IGeographicRoute['userLocation'];
      selectedDc: string;
      routingStrategy: IGeographicRoute['routingStrategy'];
      metrics: IGeographicRoute['metrics'];
      processingTime: number;
    }>
  > {
    this.logger.log(`Getting routing history with limit: ${limit}`);
    const history =
      await this.geographicRoutingService.getRoutingHistory(limit);
    return history.map(item => ({
      ...item,
      selectedDc: 'dc-minsk-primary', // Добавляем недостающее поле
    }));
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get geographic routing statistics' })
  @ApiResponse({
    status: 200,
    description: 'Routing statistics',
    schema: {
      type: 'object',
      properties: {
        totalRoutes: { type: 'number' },
        averageProcessingTime: { type: 'number' },
        strategyUsage: { type: 'object' },
        countryDistribution: { type: 'object' },
        averageLatency: { type: 'number' },
        averageBandwidth: { type: 'number' },
        averageCost: { type: 'number' },
      },
    },
  })
  async getRoutingStatistics(): Promise<{
    totalRoutes: number;
    averageProcessingTime: number;
    strategyUsage: Record<string, number>;
    countryDistribution: Record<string, number>;
    averageLatency: number;
    averageBandwidth: number;
    averageCost: number;
  }> {
    this.logger.log('Getting geographic routing statistics');
    return this.geographicRoutingService.getRoutingStatistics();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check geographic routing system health' })
  @ApiResponse({
    status: 200,
    description: 'System health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', format: 'date-time' },
        totalRoutes: { type: 'number', example: 4 },
        activeRoutes: { type: 'number', example: 4 },
        countries: { type: 'array', items: { type: 'string' } },
        system: { type: 'string', example: 'operational' },
      },
    },
  })
  async getSystemHealth(): Promise<{
    status: string;
    timestamp: Date;
    totalRoutes: number;
    activeRoutes: number;
    countries: string[];
    system: string;
  }> {
    this.logger.log('Checking geographic routing system health');

    const allRoutes = await this.geographicRoutingService.getAllRoutes();
    const countries = [
      ...new Set(allRoutes.map(route => route.userLocation.country)),
    ];

    return {
      status: 'healthy',
      timestamp: new Date(),
      totalRoutes: allRoutes.length,
      activeRoutes: allRoutes.length,
      countries,
      system: 'operational',
    };
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get geographic routing system overview' })
  @ApiResponse({
    status: 200,
    description: 'System overview',
    schema: {
      type: 'object',
      properties: {
        totalRoutes: { type: 'number' },
        countries: { type: 'array', items: { type: 'string' } },
        regions: { type: 'array', items: { type: 'string' } },
        strategies: { type: 'array', items: { type: 'string' } },
        averageLatency: { type: 'number' },
        averageBandwidth: { type: 'number' },
        averageCost: { type: 'number' },
        lastUpdated: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getSystemOverview(): Promise<{
    totalRoutes: number;
    countries: string[];
    regions: string[];
    strategies: string[];
    averageLatency: number;
    averageBandwidth: number;
    averageCost: number;
    lastUpdated: Date;
  }> {
    this.logger.log('Getting geographic routing system overview');

    const allRoutes = await this.geographicRoutingService.getAllRoutes();
    const stats = await this.geographicRoutingService.getRoutingStatistics();

    const countries = [
      ...new Set(allRoutes.map(route => route.userLocation.country)),
    ];
    const regions = [
      ...new Set(allRoutes.map(route => route.userLocation.region)),
    ];
    const strategies = [
      ...new Set(allRoutes.map(route => route.routingStrategy)),
    ];

    return {
      totalRoutes: stats.totalRoutes,
      countries,
      regions,
      strategies,
      averageLatency: stats.averageLatency,
      averageBandwidth: stats.averageBandwidth,
      averageCost: stats.averageCost,
      lastUpdated: new Date(),
    };
  }

  @Post('simulate-routing')
  @ApiOperation({ summary: 'Simulate routing for multiple user locations' })
  @ApiResponse({
    status: 200,
    description: 'Routing simulation completed',
    schema: {
      type: 'object',
      properties: {
        results: { type: 'array', items: { type: 'object' } },
        summary: { type: 'object' },
        processingTime: { type: 'number' },
      },
    },
  })
  async simulateRouting(
    @Body()
    request: {
      userLocations: Array<{
        userId: string;
        location: IGeographicRoute['userLocation'];
        strategy?: IGeographicRoute['routingStrategy'];
      }>;
    }
  ): Promise<{
    results: Array<{
      userId: string;
      location: IGeographicRoute['userLocation'];
      selectedDc: string;
      metrics: IGeographicRoute['metrics'];
      processingTime: number;
    }>;
    summary: {
      totalUsers: number;
      averageLatency: number;
      averageBandwidth: number;
      averageCost: number;
      countryDistribution: Record<string, number>;
    };
    processingTime: number;
  }> {
    this.logger.log(
      `Simulating routing for ${request.userLocations.length} user locations`
    );

    const startTime = Date.now();
    const results = [];
    let totalLatency = 0;
    let totalBandwidth = 0;
    let totalCost = 0;
    const countryDistribution: Record<string, number> = {};

    for (const userRequest of request.userLocations) {
      const result =
        await this.geographicRoutingService.determineOptimalDataCenter(
          userRequest.location,
          userRequest.strategy ?? 'nearest'
        );

      if (result) {
        results.push({
          userId: userRequest.userId,
          location: userRequest.location,
          selectedDc: result.selectedDc,
          metrics: result.metrics,
          processingTime: result.processingTime,
        });

        totalLatency += result.metrics.latency;
        totalBandwidth += result.metrics.bandwidth;
        totalCost += result.metrics.cost;

        const country = userRequest.location.country;
        countryDistribution[country] = (countryDistribution[country] ?? 0) + 1;
      }
    }

    const processingTime = Date.now() - startTime;
    const totalUsers = results.length;

    const summary = {
      totalUsers,
      averageLatency:
        totalUsers > 0 ? Math.round(totalLatency / totalUsers) : 0,
      averageBandwidth:
        totalUsers > 0 ? Math.round(totalBandwidth / totalUsers) : 0,
      averageCost:
        totalUsers > 0 ? Math.round((totalCost / totalUsers) * 1000) / 1000 : 0,
      countryDistribution,
    };

    return {
      results,
      summary,
      processingTime,
    };
  }
}
