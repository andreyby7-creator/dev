import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
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
import { AutoScalingService } from './auto-scaling.service';
import { PerformanceOptimizationService } from './performance-optimization.service';

@ApiTags('Performance Management')
@Controller('performance')
export class PerformanceController {
  constructor(
    private readonly performanceOptimizationService: PerformanceOptimizationService,
    private readonly autoScalingService: AutoScalingService
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiQuery({
    name: 'service',
    required: false,
    description: 'Filter by service',
  })
  @ApiQuery({
    name: 'metricName',
    required: false,
    description: 'Filter by metric name',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start time (ISO string)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End time (ISO string)',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics retrieved successfully',
  })
  async getPerformanceMetrics(
    @Query('service') service?: string,
    @Query('metricName') metricName?: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const timeRange =
      from != null && to != null
        ? {
            from: new Date(from),
            to: new Date(to),
          }
        : undefined;

    const metrics =
      await this.performanceOptimizationService.getPerformanceMetrics(
        service,
        metricName,
        timeRange
      );

    return {
      success: true,
      data: metrics,
      count: metrics.length,
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get performance summary' })
  @ApiResponse({
    status: 200,
    description: 'Performance summary retrieved successfully',
  })
  async getPerformanceSummary() {
    const summary =
      await this.performanceOptimizationService.getPerformanceSummary();

    return {
      success: true,
      data: summary,
    };
  }

  @Get('profiles')
  @ApiOperation({ summary: 'Get performance profiles' })
  @ApiQuery({
    name: 'service',
    required: false,
    description: 'Filter by service',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance profiles retrieved successfully',
  })
  async getPerformanceProfiles(@Query('service') _service?: string) {
    // В реальном приложении здесь была бы логика получения профилей по сервису
    return {
      success: true,
      data: [],
      message: 'Performance profiles endpoint - implementation needed',
    };
  }

  @Post('profiles')
  @ApiOperation({ summary: 'Create performance profile' })
  @ApiResponse({
    status: 201,
    description: 'Performance profile created successfully',
  })
  async createPerformanceProfile(
    @Body()
    body: {
      _service: string;
      endpoint?: string;
      name: string;
      description: string;
    }
  ) {
    const profile =
      await this.performanceOptimizationService.createPerformanceProfile(
        body._service,
        body.endpoint,
        body.name,
        body.description
      );

    return {
      success: true,
      data: profile,
      message: 'Performance profile created successfully',
    };
  }

  @Get('optimization/rules')
  @ApiOperation({ summary: 'Get optimization rules' })
  @ApiResponse({
    status: 200,
    description: 'Optimization rules retrieved successfully',
  })
  async getOptimizationRules() {
    const rules =
      await this.performanceOptimizationService.getOptimizationRules();

    return {
      success: true,
      data: rules,
      count: rules.length,
    };
  }

  @Get('optimization/actions')
  @ApiOperation({ summary: 'Get optimization actions' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results' })
  @ApiResponse({
    status: 200,
    description: 'Optimization actions retrieved successfully',
  })
  async getOptimizationActions(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: number
  ) {
    const actions =
      await this.performanceOptimizationService.getOptimizationActions({
        ...(status != null && { status }),
        ...(type != null && { type }),
        ...(limit != null && { limit: parseInt(limit.toString()) }),
      });

    return {
      success: true,
      data: actions,
      count: actions.length,
    };
  }

  @Get('caching/strategies')
  @ApiOperation({ summary: 'Get caching strategies' })
  @ApiResponse({
    status: 200,
    description: 'Caching strategies retrieved successfully',
  })
  async getCachingStrategies() {
    const strategies =
      await this.performanceOptimizationService.getCachingStrategies();

    return {
      success: true,
      data: strategies,
      count: strategies.length,
    };
  }

  @Put('caching/strategies/:id')
  @ApiOperation({ summary: 'Update caching strategy' })
  @ApiParam({ name: 'id', description: 'Strategy ID' })
  @ApiResponse({
    status: 200,
    description: 'Caching strategy updated successfully',
  })
  async updateCachingStrategy(
    @Param('id') id: string,
    @Body() updates: Record<string, unknown>
  ) {
    const strategy =
      await this.performanceOptimizationService.updateCachingStrategy(
        id,
        updates
      );

    if (strategy == null) {
      return {
        success: false,
        error: 'Caching strategy not found',
        statusCode: HttpStatus.NOT_FOUND,
      };
    }

    return {
      success: true,
      data: strategy,
      message: 'Caching strategy updated successfully',
    };
  }

  @Get('scaling/policies')
  @ApiOperation({ summary: 'Get scaling policies' })
  @ApiResponse({
    status: 200,
    description: 'Scaling policies retrieved successfully',
  })
  async getScalingPolicies() {
    const policies = await this.autoScalingService.getAllScalingPolicies();

    return {
      success: true,
      data: policies,
      count: policies.length,
    };
  }

  @Post('scaling/policies')
  @ApiOperation({ summary: 'Create scaling policy' })
  @ApiResponse({
    status: 201,
    description: 'Scaling policy created successfully',
  })
  async createScalingPolicy(
    @Body()
    policy: {
      name: string;
      description: string;
      _service: string;
      enabled: boolean;
      minReplicas: number;
      maxReplicas: number;
      targetCpu: number;
      targetMemory: number;
      targetRequestsPerSecond: number;
      scaleUpCooldown: number;
      scaleDownCooldown: number;
      scaleUpStep: number;
      scaleDownStep: number;
      metrics: {
        cpu: boolean;
        memory: boolean;
        requests: boolean;
        custom: string[];
      };
      conditions: Array<{
        metric: string;
        operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
        threshold: number;
        duration: number;
      }>;
    }
  ) {
    const newPolicy = await this.autoScalingService.createScalingPolicy(policy);

    return {
      success: true,
      data: newPolicy,
      message: 'Scaling policy created successfully',
    };
  }

  @Put('scaling/policies/:id')
  @ApiOperation({ summary: 'Update scaling policy' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  @ApiResponse({
    status: 200,
    description: 'Scaling policy updated successfully',
  })
  async updateScalingPolicy(
    @Param('id') id: string,
    @Body() updates: Record<string, unknown>
  ) {
    const policy = await this.autoScalingService.updateScalingPolicy(
      id,
      updates
    );

    if (policy == null) {
      return {
        success: false,
        error: 'Scaling policy not found',
        statusCode: HttpStatus.NOT_FOUND,
      };
    }

    return {
      success: true,
      data: policy,
      message: 'Scaling policy updated successfully',
    };
  }

  @Delete('scaling/policies/:id')
  @ApiOperation({ summary: 'Delete scaling policy' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  @ApiResponse({
    status: 200,
    description: 'Scaling policy deleted successfully',
  })
  async deleteScalingPolicy(@Param('id') id: string) {
    const deleted = await this.autoScalingService.deleteScalingPolicy(id);

    if (!deleted) {
      return {
        success: false,
        error: 'Scaling policy not found',
        statusCode: HttpStatus.NOT_FOUND,
      };
    }

    return {
      success: true,
      message: 'Scaling policy deleted successfully',
    };
  }

  @Get('scaling/events')
  @ApiOperation({ summary: 'Get scaling events' })
  @ApiQuery({
    name: 'service',
    required: false,
    description: 'Filter by service',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    description: 'Filter by action',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results' })
  @ApiResponse({
    status: 200,
    description: 'Scaling events retrieved successfully',
  })
  async getScalingEvents(
    @Query('service') service?: string,
    @Query('action') action?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number
  ) {
    const events = await this.autoScalingService.getScalingEvents({
      ...(service != null && { service }),
      ...(action != null && { action }),
      ...(status != null && { status }),
      ...(limit != null && { limit: parseInt(limit.toString()) }),
    });

    return {
      success: true,
      data: events,
      count: events.length,
    };
  }

  @Get('scaling/metrics/:service')
  @ApiOperation({ summary: 'Get service scaling metrics' })
  @ApiParam({ name: 'service', description: 'Service name' })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start time (ISO string)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End time (ISO string)',
  })
  @ApiResponse({
    status: 200,
    description: 'Service metrics retrieved successfully',
  })
  async getServiceMetrics(
    @Param('service') _service: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const timeRange =
      from != null && to != null
        ? {
            from: new Date(from),
            to: new Date(to),
          }
        : undefined;

    const metrics = await this.autoScalingService.getServiceMetrics(
      _service || '',
      timeRange
    );

    return {
      success: true,
      data: metrics,
      count: metrics.length,
    };
  }

  @Get('scaling/recommendations')
  @ApiOperation({ summary: 'Get scaling recommendations' })
  @ApiQuery({
    name: 'service',
    required: false,
    description: 'Filter by service',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    description: 'Filter by priority',
  })
  @ApiResponse({
    status: 200,
    description: 'Scaling recommendations retrieved successfully',
  })
  async getScalingRecommendations(
    @Query('service') service?: string,
    @Query('priority') priority?: string
  ) {
    const recommendations =
      await this.autoScalingService.getScalingRecommendations(
        service,
        priority
      );

    return {
      success: true,
      data: recommendations,
      count: recommendations.length,
    };
  }

  @Post('scaling/recommendations/:service')
  @ApiOperation({ summary: 'Generate scaling recommendations for service' })
  @ApiParam({ name: 'service', description: 'Service name' })
  @ApiResponse({
    status: 200,
    description: 'Scaling recommendations generated successfully',
  })
  async generateScalingRecommendations(@Param('service') service: string) {
    const recommendations =
      await this.autoScalingService.generateScalingRecommendations(service);

    return {
      success: true,
      data: recommendations,
      count: recommendations.length,
      message: `Generated ${recommendations.length} recommendations for ${service}`,
    };
  }

  @Get('scaling/summary')
  @ApiOperation({ summary: 'Get scaling summary' })
  @ApiResponse({
    status: 200,
    description: 'Scaling summary retrieved successfully',
  })
  async getScalingSummary() {
    const summary = await this.autoScalingService.getScalingSummary();

    return {
      success: true,
      data: summary,
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get performance service health' })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
  })
  async getHealth() {
    const performanceSummary =
      await this.performanceOptimizationService.getPerformanceSummary();
    const scalingSummary = await this.autoScalingService.getScalingSummary();

    return {
      success: true,
      data: {
        status: 'healthy',
        performance: {
          totalMetrics: performanceSummary.totalMetrics,
          activeOptimizations: performanceSummary.activeOptimizations,
          cachingStrategies: performanceSummary.cachingStrategies,
        },
        scaling: {
          totalPolicies: scalingSummary.totalPolicies,
          activePolicies: scalingSummary.activePolicies,
          totalEvents: scalingSummary.totalEvents,
        },
        timestamp: new Date().toISOString(),
      },
    };
  }
}
