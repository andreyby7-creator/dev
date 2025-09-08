import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BusinessIntelligenceService } from './business-intelligence.service';
import { UserAnalyticsService } from './user-analytics.service';

@ApiTags('Analytics & Business Intelligence')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly businessIntelligenceService: BusinessIntelligenceService,
    private readonly userAnalyticsService: UserAnalyticsService
  ) {}

  @Get('business/metrics')
  @ApiOperation({ summary: 'Get business metrics' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category',
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
    description: 'Business metrics retrieved successfully',
  })
  async getBusinessMetrics(
    @Query('category') category?: string,
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

    const metrics = await this.businessIntelligenceService.getBusinessMetrics(
      category,
      timeRange
    );

    return {
      success: true,
      data: metrics,
      count: metrics.length,
    };
  }

  @Get('business/reports')
  @ApiOperation({ summary: 'Get business reports' })
  @ApiResponse({
    status: 200,
    description: 'Business reports retrieved successfully',
  })
  async getBusinessReports() {
    const reports =
      await this.businessIntelligenceService.getAllBusinessReports();

    return {
      success: true,
      data: reports,
      count: reports.length,
    };
  }

  @Post('business/reports')
  @ApiOperation({ summary: 'Generate business report' })
  @ApiResponse({
    status: 201,
    description: 'Business report generated successfully',
  })
  async generateBusinessReport(
    @Body()
    body: {
      type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
      from: string;
      to: string;
      generatedBy: string;
    }
  ) {
    const report =
      await this.businessIntelligenceService.generateBusinessReport(
        body.type,
        {
          from: new Date(body.from),
          to: new Date(body.to),
        },
        body.generatedBy
      );

    return {
      success: true,
      data: report,
      message: 'Business report generated successfully',
    };
  }

  @Get('business/predictions')
  @ApiOperation({ summary: 'Get predictive analytics' })
  @ApiQuery({ name: 'model', required: false, description: 'Filter by model' })
  @ApiQuery({
    name: 'target',
    required: false,
    description: 'Filter by target',
  })
  @ApiResponse({
    status: 200,
    description: 'Predictive analytics retrieved successfully',
  })
  async getPredictiveAnalytics(
    @Query('model') model?: string,
    @Query('target') target?: string
  ) {
    const predictions =
      await this.businessIntelligenceService.getPredictiveAnalytics(
        model,
        target
      );

    return {
      success: true,
      data: predictions,
      count: predictions.length,
    };
  }

  @Post('business/predictions')
  @ApiOperation({ summary: 'Generate predictive analytics' })
  @ApiResponse({
    status: 201,
    description: 'Predictive analytics generated successfully',
  })
  async generatePredictiveAnalytics(
    @Body() body: { model: string; target: string; timeframe: string }
  ) {
    const prediction =
      await this.businessIntelligenceService.generatePredictiveAnalytics(
        body.model,
        body.target,
        body.timeframe
      );

    return {
      success: true,
      data: prediction,
      message: 'Predictive analytics generated successfully',
    };
  }

  @Get('business/visualizations')
  @ApiOperation({ summary: 'Get data visualizations' })
  @ApiResponse({
    status: 200,
    description: 'Data visualizations retrieved successfully',
  })
  async getDataVisualizations() {
    const visualizations =
      await this.businessIntelligenceService.getAllDataVisualizations();

    return {
      success: true,
      data: visualizations,
      count: visualizations.length,
    };
  }

  @Get('business/visualizations/:id')
  @ApiOperation({ summary: 'Get specific data visualization' })
  @ApiParam({ name: 'id', description: 'Visualization ID' })
  @ApiResponse({
    status: 200,
    description: 'Data visualization retrieved successfully',
  })
  async getDataVisualization(@Param('id') id: string) {
    const visualization =
      await this.businessIntelligenceService.getDataVisualization(id);

    if (!visualization) {
      return {
        success: false,
        error: 'Data visualization not found',
        statusCode: HttpStatus.NOT_FOUND,
      };
    }

    return {
      success: true,
      data: visualization,
    };
  }

  @Post('business/visualizations')
  @ApiOperation({ summary: 'Create data visualization' })
  @ApiResponse({
    status: 201,
    description: 'Data visualization created successfully',
  })
  async createDataVisualization(
    @Body()
    body: {
      name: string;
      type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'funnel';
      config: {
        title: string;
        xAxis?: string;
        yAxis?: string;
        colors?: string[];
        filters?: Record<string, unknown>;
      };
      refreshInterval: number;
      isPublic: boolean;
    }
  ) {
    const visualization =
      await this.businessIntelligenceService.createDataVisualization({
        ...body,
        data: [],
      });

    return {
      success: true,
      data: visualization,
      message: 'Data visualization created successfully',
    };
  }

  @Get('users/profiles/:userId')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  async getUserProfile(@Param('userId') userId: string) {
    const profile = await this.userAnalyticsService.getUserProfile(userId);

    if (!profile) {
      return {
        success: false,
        error: 'User profile not found',
        statusCode: HttpStatus.NOT_FOUND,
      };
    }

    return {
      success: true,
      data: profile,
    };
  }

  @Get('users/sessions/:userId')
  @ApiOperation({ summary: 'Get user sessions' })
  @ApiParam({ name: 'userId', description: 'User ID' })
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
    description: 'User sessions retrieved successfully',
  })
  async getUserSessions(
    @Param('userId') userId: string,
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

    const sessions = await this.userAnalyticsService.getUserSessions(
      userId,
      timeRange
    );

    return {
      success: true,
      data: sessions,
      count: sessions.length,
    };
  }

  @Get('users/journeys/:userId')
  @ApiOperation({ summary: 'Get user journeys' })
  @ApiParam({ name: 'userId', description: 'User ID' })
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
    description: 'User journeys retrieved successfully',
  })
  async getUserJourneys(
    @Param('userId') userId: string,
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

    const journeys = await this.userAnalyticsService.getUserJourneys(
      userId,
      timeRange
    );

    return {
      success: true,
      data: journeys,
      count: journeys.length,
    };
  }

  @Get('users/engagement/:userId')
  @ApiOperation({ summary: 'Get user engagement metrics' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User engagement metrics retrieved successfully',
  })
  async getUserEngagementMetrics(@Param('userId') userId: string) {
    const metrics =
      await this.userAnalyticsService.getEngagementMetrics(userId);

    if (!metrics) {
      return {
        success: false,
        error: 'User engagement metrics not found',
        statusCode: HttpStatus.NOT_FOUND,
      };
    }

    return {
      success: true,
      data: metrics,
    };
  }

  @Get('users/segments')
  @ApiOperation({ summary: 'Get user segments' })
  @ApiResponse({
    status: 200,
    description: 'User segments retrieved successfully',
  })
  async getUserSegments() {
    const segments = await this.userAnalyticsService.getAllUserSegments();

    return {
      success: true,
      data: segments,
      count: segments.length,
    };
  }

  @Get('users/segments/:segmentId')
  @ApiOperation({ summary: 'Get specific user segment' })
  @ApiParam({ name: 'segmentId', description: 'Segment ID' })
  @ApiResponse({
    status: 200,
    description: 'User segment retrieved successfully',
  })
  async getUserSegment(@Param('segmentId') segmentId: string) {
    const segment = await this.userAnalyticsService.getUserSegment(segmentId);

    if (!segment) {
      return {
        success: false,
        error: 'User segment not found',
        statusCode: HttpStatus.NOT_FOUND,
      };
    }

    return {
      success: true,
      data: segment,
    };
  }

  @Post('users/segments')
  @ApiOperation({ summary: 'Create user segment' })
  @ApiResponse({
    status: 201,
    description: 'User segment created successfully',
  })
  async createUserSegment(
    @Body()
    body: {
      name: string;
      description: string;
      criteria: Array<{
        field: string;
        operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
        value: unknown;
      }>;
    }
  ) {
    const segment = await this.userAnalyticsService.createUserSegment(body);

    return {
      success: true,
      data: segment,
      message: 'User segment created successfully',
    };
  }

  @Post('users/track')
  @ApiOperation({ summary: 'Track user event' })
  @ApiResponse({ status: 200, description: 'User event tracked successfully' })
  async trackUserEvent(
    @Body()
    body: {
      userId: string;
      event: string;
      properties: Record<string, unknown>;
      sessionId: string;
      userAgent: string;
      ipAddress: string;
    }
  ) {
    await this.userAnalyticsService.trackUserEvent(
      body.userId,
      body.event,
      body.properties,
      body.sessionId,
      body.userAgent,
      body.ipAddress
    );

    return {
      success: true,
      message: 'User event tracked successfully',
    };
  }

  @Get('performance/requests')
  @ApiOperation({ summary: 'Get performance analytics' })
  @ApiQuery({
    name: 'service',
    required: false,
    description: 'Filter by service',
  })
  @ApiQuery({
    name: 'endpoint',
    required: false,
    description: 'Filter by endpoint',
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
    description: 'Performance analytics retrieved successfully',
  })
  async getPerformanceAnalytics(
    @Query('service') service?: string,
    @Query('endpoint') endpoint?: string,
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

    const analytics =
      await this.businessIntelligenceService.getPerformanceAnalytics(
        service,
        endpoint,
        timeRange
      );

    return {
      success: true,
      data: analytics,
      count: analytics.length,
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get analytics summary' })
  @ApiResponse({
    status: 200,
    description: 'Analytics summary retrieved successfully',
  })
  async getAnalyticsSummary() {
    const businessSummary =
      await this.businessIntelligenceService.getAnalyticsSummary();
    const userSummary = await this.userAnalyticsService.getAnalyticsSummary();

    return {
      success: true,
      data: {
        business: businessSummary,
        users: userSummary,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get analytics service health' })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
  })
  async getHealth() {
    const businessSummary =
      await this.businessIntelligenceService.getAnalyticsSummary();
    const userSummary = await this.userAnalyticsService.getAnalyticsSummary();

    return {
      success: true,
      data: {
        status: 'healthy',
        business: {
          totalMetrics: businessSummary.totalBusinessMetrics,
          totalReports: businessSummary.totalReports,
          totalVisualizations: businessSummary.totalVisualizations,
        },
        users: {
          totalUsers: userSummary.totalUsers,
          totalSessions: userSummary.totalSessions,
          totalEvents: userSummary.totalEvents,
        },
        timestamp: new Date().toISOString(),
      },
    };
  }
}
