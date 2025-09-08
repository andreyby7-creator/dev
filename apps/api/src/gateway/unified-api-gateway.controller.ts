import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { IApiVersion, IServiceRoute } from './unified-api-gateway.service';
import { UnifiedApiGatewayService } from './unified-api-gateway.service';

@ApiTags('Unified API Gateway')
@Controller('api')
export class UnifiedApiGatewayController {
  constructor(
    private readonly unifiedApiGatewayService: UnifiedApiGatewayService
  ) {}

  @Get('*')
  @ApiOperation({ summary: 'Route GET requests through API Gateway' })
  @ApiResponse({ status: 200, description: 'Request routed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async routeGetRequest(
    @Req() req: Request,
    @Res() res: Response,
    @Headers() headers: Record<string, string>
  ): Promise<void> {
    const result = await this.unifiedApiGatewayService.routeRequest(
      req.path,
      'GET',
      headers
    );

    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      error: result.error,
    });
  }

  @Post('*')
  @ApiOperation({ summary: 'Route POST requests through API Gateway' })
  @ApiResponse({ status: 200, description: 'Request routed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async routePostRequest(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>
  ): Promise<void> {
    const result = await this.unifiedApiGatewayService.routeRequest(
      req.path,
      'POST',
      headers,
      body
    );

    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      error: result.error,
    });
  }

  @Put('*')
  @ApiOperation({ summary: 'Route PUT requests through API Gateway' })
  @ApiResponse({ status: 200, description: 'Request routed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async routePutRequest(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>
  ): Promise<void> {
    const result = await this.unifiedApiGatewayService.routeRequest(
      req.path,
      'PUT',
      headers,
      body
    );

    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      error: result.error,
    });
  }

  @Delete('*')
  @ApiOperation({ summary: 'Route DELETE requests through API Gateway' })
  @ApiResponse({ status: 200, description: 'Request routed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async routeDeleteRequest(
    @Req() req: Request,
    @Res() res: Response,
    @Headers() headers: Record<string, string>
  ): Promise<void> {
    const result = await this.unifiedApiGatewayService.routeRequest(
      req.path,
      'DELETE',
      headers
    );

    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      error: result.error,
    });
  }

  @Get('gateway/health')
  @ApiOperation({ summary: 'Get API Gateway health status' })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
  })
  async getGatewayHealth(): Promise<{
    status: string;
    services: Record<string, { status: string; [key: string]: unknown }>;
    timestamp: string;
  }> {
    const services = await this.unifiedApiGatewayService.getServiceHealth();

    const totalServices = Object.keys(services).length;
    const healthyServices = Object.values(services).filter(
      (service: { status: string }) => service.status === 'healthy'
    ).length;

    return {
      status: healthyServices === totalServices ? 'healthy' : 'degraded',
      services,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('gateway/versions')
  @ApiOperation({ summary: 'Get available API versions' })
  @ApiResponse({
    status: 200,
    description: 'API versions retrieved successfully',
  })
  async getApiVersions(): Promise<{
    versions: IApiVersion[];
    timestamp: string;
  }> {
    const versions = await this.unifiedApiGatewayService.getApiVersions();

    return {
      versions,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('gateway/routes')
  @ApiOperation({ summary: 'Get all service routes' })
  @ApiResponse({
    status: 200,
    description: 'Service routes retrieved successfully',
  })
  async getServiceRoutes(): Promise<{
    routes: IServiceRoute[];
    timestamp: string;
  }> {
    const routes = await this.unifiedApiGatewayService.getServiceRoutes();

    return {
      routes,
      timestamp: new Date().toISOString(),
    };
  }
}
