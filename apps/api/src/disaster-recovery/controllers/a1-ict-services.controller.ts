import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
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
import { CreateA1IctServiceDto } from '../dto/create-a1-ict-service.dto';
import { UpdateA1IctServiceDto } from '../dto/update-a1-ict-service.dto';
import type {
  IA1IctService,
  IA1ServiceRequest,
} from '../interfaces/disaster-recovery.interface';
import { A1IctServicesService } from '../services/a1-ict-services.service';

@ApiTags('A1 ICT Services')
@Controller('a1-ict-services')
export class A1IctServicesController {
  private readonly logger = new Logger(A1IctServicesController.name);

  constructor(private readonly a1IctServicesService: A1IctServicesService) {}

  @Get('services')
  @ApiOperation({ summary: 'Get all A1 ICT services' })
  @ApiResponse({
    status: 200,
    description: 'List of all A1 ICT services',
    type: [Object],
  })
  async getAllServices(): Promise<IA1IctService[]> {
    this.logger.log('Getting all A1 ICT services');
    return this.a1IctServicesService.getAllServices();
  }

  @Get('services/:id')
  @ApiOperation({ summary: 'Get A1 ICT service by ID' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({
    status: 200,
    description: 'Service found',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
  })
  async getServiceById(@Param('id') id: string): Promise<IA1IctService | null> {
    this.logger.log(`Getting A1 ICT service by ID: ${id}`);
    return this.a1IctServicesService.getServiceById(id);
  }

  @Post('services')
  @ApiOperation({ summary: 'Create new A1 ICT service' })
  @ApiResponse({
    status: 201,
    description: 'Service created successfully',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @HttpCode(HttpStatus.CREATED)
  async createService(
    @Body() createDto: CreateA1IctServiceDto
  ): Promise<IA1IctService> {
    this.logger.log('Creating new A1 ICT service');
    return this.a1IctServicesService.createService(createDto);
  }

  @Put('services/:id')
  @ApiOperation({ summary: 'Update A1 ICT service' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({
    status: 200,
    description: 'Service updated successfully',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
  })
  async updateService(
    @Param('id') id: string,
    @Body() updateDto: UpdateA1IctServiceDto
  ): Promise<IA1IctService | null> {
    this.logger.log(`Updating A1 ICT service: ${id}`);
    return this.a1IctServicesService.updateService(id, updateDto);
  }

  @Delete('services/:id')
  @ApiOperation({ summary: 'Delete A1 ICT service' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({
    status: 200,
    description: 'Service deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
  })
  async deleteService(@Param('id') id: string): Promise<{ message: string }> {
    this.logger.log(`Deleting A1 ICT service: ${id}`);
    await this.a1IctServicesService.deleteService(id);
    return { message: 'Service deleted successfully' };
  }

  @Get('services/search/type')
  @ApiOperation({ summary: 'Find services by type' })
  @ApiQuery({
    name: 'type',
    description: 'Service type (DRaaS, BaaS, TierIII-DC)',
  })
  @ApiResponse({
    status: 200,
    description: 'Services found by type',
    type: [Object],
  })
  async findServicesByType(
    @Query('type') type: string
  ): Promise<IA1IctService[]> {
    this.logger.log(`Finding services by type: ${type}`);
    return this.a1IctServicesService.findServicesByType(
      type as 'DRaaS' | 'BaaS' | 'TierIII-DC'
    );
  }

  @Get('services/search/datacenter')
  @ApiOperation({ summary: 'Find services by data center' })
  @ApiQuery({ name: 'dcId', description: 'Data center ID' })
  @ApiResponse({
    status: 200,
    description: 'Services found by data center',
    type: [Object],
  })
  async findServicesByDataCenter(
    @Query('dcId') dcId: string
  ): Promise<IA1IctService[]> {
    this.logger.log(`Finding services by data center: ${dcId}`);
    return this.a1IctServicesService.findServicesByDataCenter(dcId);
  }

  @Post('services/:id/calculate-cost')
  @ApiOperation({ summary: 'Calculate service cost' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({
    status: 200,
    description: 'Service cost calculated',
    schema: {
      type: 'object',
      properties: {
        monthlyCost: { type: 'number' },
        totalCost: { type: 'number' },
        setupCost: { type: 'number' },
        bandwidthCost: { type: 'number' },
        breakdown: { type: 'object' },
      },
    },
  })
  async calculateServiceCost(
    @Param('id') id: string,
    @Body()
    requirements: {
      cpu: number;
      memory: number;
      storage: number;
      network: number;
      duration: number;
    }
  ): Promise<{
    monthlyCost: number;
    totalCost: number;
    setupCost: number;
    bandwidthCost: number;
    breakdown: Record<string, number>;
  }> {
    this.logger.log(`Calculating cost for service: ${id}`);
    return this.a1IctServicesService.calculateServiceCost(id, requirements);
  }

  @Get('services/:id/availability')
  @ApiOperation({ summary: 'Check service availability' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({
    status: 200,
    description: 'Service availability status',
    schema: {
      type: 'object',
      properties: {
        available: { type: 'boolean' },
        currentCapacity: { type: 'object' },
        usedCapacity: { type: 'object' },
        utilization: { type: 'object' },
      },
    },
  })
  async checkServiceAvailability(@Param('id') id: string): Promise<{
    available: boolean;
    currentCapacity: {
      cpu: number;
      memory: number;
      storage: number;
      network: number;
    };
    usedCapacity: {
      cpu: number;
      memory: number;
      storage: number;
      network: number;
    };
    utilization: {
      cpu: number;
      memory: number;
      storage: number;
      network: number;
    };
  }> {
    this.logger.log(`Checking availability for service: ${id}`);
    return this.a1IctServicesService.checkServiceAvailability(id);
  }

  @Post('services/:id/scale')
  @ApiOperation({ summary: 'Scale service resources' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({
    status: 200,
    description: 'Service scaled successfully',
    type: Object,
  })
  async scaleService(
    @Param('id') id: string,
    @Body()
    scaling: {
      cpu?: number;
      memory?: number;
      storage?: number;
      network?: number;
    }
  ): Promise<{
    id: string;
    name: string;
    type: string;
    status: string;
  }> {
    this.logger.log(`Scaling service: ${id}`);
    const result = await this.a1IctServicesService.scaleService(id, scaling);
    return {
      id: result ? '1' : '0',
      name: result ? 'Scaled Service' : 'Failed Service',
      type: 'DRaaS',
      status: result ? 'scaled' : 'failed',
    };
  }

  @Get('services/:id/backup-status')
  @ApiOperation({ summary: 'Get backup status for a service' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({
    status: 200,
    description: 'Backup status retrieved successfully',
  })
  async getBackupStatus(
    @Param('id') id: string
  ): Promise<{ status: string; lastBackup: Date; nextBackup: Date }> {
    const result = await this.a1IctServicesService.getBackupStatus(id);
    return {
      status: result.status,
      lastBackup: result.lastBackup,
      nextBackup: result.nextBackup,
    };
  }

  @Post('services/:id/backup')
  @ApiOperation({ summary: 'Trigger backup for a service' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Backup triggered successfully' })
  async triggerBackup(
    @Param('id') id: string
  ): Promise<{ success: boolean; backupId: string }> {
    const result = await this.a1IctServicesService.triggerBackup(id);
    return {
      success: result.success,
      backupId: result.backupId,
    };
  }

  @Get('services/:id/recovery-points')
  @ApiOperation({ summary: 'Get available recovery points' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({
    status: 200,
    description: 'Recovery points retrieved successfully',
  })
  async getRecoveryPoints(
    @Param('id') id: string
  ): Promise<{ id: string; timestamp: Date; type: string; size: number }[]> {
    const result = await this.a1IctServicesService.getRecoveryPoints(id);
    return result.map(item => ({
      id: item.id,
      timestamp: item.timestamp,
      type: item.type,
      size: item.size,
    }));
  }

  @Post('services/:id/recover')
  @ApiOperation({ summary: 'Recover service from backup' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service recovery initiated' })
  async recoverService(
    @Param('id') id: string
  ): Promise<{ success: boolean; recoveryTime: number }> {
    const result = await this.a1IctServicesService.recoverService(
      id,
      'default-recovery-point'
    );
    return {
      success: result.success,
      recoveryTime: result.recoveryTime,
    };
  }

  @Get('services/:id/performance')
  @ApiOperation({ summary: 'Get service performance metrics' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics retrieved',
    schema: {
      type: 'object',
      properties: {
        cpu: { type: 'object' },
        memory: { type: 'object' },
        storage: { type: 'object' },
        network: { type: 'object' },
        sla: { type: 'object' },
      },
    },
  })
  async getPerformanceMetrics(@Param('id') id: string): Promise<{
    cpu: {
      usage: number;
      average: number;
      peak: number;
    };
    memory: {
      usage: number;
      average: number;
      peak: number;
    };
    storage: {
      usage: number;
      average: number;
      peak: number;
    };
    network: {
      usage: number;
      average: number;
      peak: number;
    };
    sla: {
      uptime: number;
      responseTime: number;
      throughput: number;
    };
  }> {
    this.logger.log(`Getting performance metrics for service: ${id}`);
    const result = await this.a1IctServicesService.getPerformanceMetrics(id);
    return {
      cpu: result.cpu,
      memory: result.memory,
      storage: result.storage,
      network: result.network,
      sla: result.sla,
    };
  }

  @Get('services/:id/requests')
  @ApiOperation({ summary: 'Get service requests' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({
    status: 200,
    description: 'Service requests retrieved',
    type: [Object],
  })
  async getServiceRequests(
    @Param('id') id: string
  ): Promise<IA1ServiceRequest[]> {
    this.logger.log(`Getting requests for service: ${id}`);
    return this.a1IctServicesService.getAllServiceRequests();
  }

  @Post('services/:id/requests')
  @ApiOperation({ summary: 'Create service request' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({
    status: 201,
    description: 'Service request created successfully',
    type: Object,
  })
  @HttpCode(HttpStatus.CREATED)
  async createServiceRequest(
    @Param('id') id: string,
    @Body()
    request: {
      type: string;
      description: string;
      priority: string;
      requestedBy: string;
    }
  ): Promise<IA1ServiceRequest> {
    this.logger.log(`Creating request for service: ${id}`);
    const serviceRequest = {
      serviceType: request.type as 'DRaaS' | 'BaaS' | 'TierIII-DC',
      dcId: id,
      configuration: {
        sla: 99.9,
        backupRetention: 30,
        recoveryTime: 4,
        replicationFrequency: 24,
      },
      cost: 0,
      contractEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };
    const result = await this.a1IctServicesService.createServiceRequest(
      id,
      serviceRequest
    );

    if (!result) {
      throw new NotFoundException('Failed to create service request');
    }

    return result;
  }

  @Get('services/:id/requests/:requestId')
  @ApiOperation({ summary: 'Get service request by ID' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiParam({ name: 'requestId', description: 'Request ID' })
  @ApiResponse({
    status: 200,
    description: 'Service request found',
    type: Object,
  })
  async getServiceRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string
  ): Promise<IA1ServiceRequest> {
    this.logger.log(`Getting request ${requestId} for service: ${id}`);
    const requests = await this.a1IctServicesService.getAllServiceRequests();
    const request = requests.find(r => r.id === requestId);
    if (request == null) {
      throw new NotFoundException('Service request not found');
    }
    return request;
  }

  @Put('services/:id/requests/:requestId')
  @ApiOperation({ summary: 'Update service request' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiParam({ name: 'requestId', description: 'Request ID' })
  @ApiResponse({
    status: 200,
    description: 'Service request updated successfully',
    type: Object,
  })
  async updateServiceRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string
  ): Promise<IA1ServiceRequest> {
    this.logger.log(`Updating request ${requestId} for service: ${id}`);
    const result = await this.a1IctServicesService.createServiceRequest(id, {
      serviceType: 'DRaaS' as const,
      dcId: id,
      configuration: {
        sla: 99.9,
        backupRetention: 30,
        recoveryTime: 4,
        replicationFrequency: 24,
      },
      cost: 0,
      contractEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    if (!result) {
      throw new NotFoundException('Failed to update service request');
    }

    return result;
  }

  @Get('services/analytics/overview')
  @ApiOperation({ summary: 'Get services analytics overview' })
  @ApiResponse({
    status: 200,
    description: 'Analytics overview retrieved',
    schema: {
      type: 'object',
      properties: {
        totalServices: { type: 'number' },
        activeServices: { type: 'number' },
        servicesByType: { type: 'object' },
        servicesByLocation: { type: 'object' },
        servicesByTier: { type: 'object' },
        totalRequests: { type: 'number' },
        requestsByStatus: { type: 'object' },
        averageSLA: { type: 'object' },
      },
    },
  })
  async getServicesAnalytics(): Promise<{
    totalServices: number;
    activeServices: number;
    servicesByType: Record<string, number>;
    servicesByLocation: Record<string, number>;
    servicesByTier: Record<string, number>;
    totalRequests: number;
    requestsByStatus: Record<string, number>;
    averageSLA: {
      uptime: number;
      responseTime: number;
      recoveryTime: number;
    };
  }> {
    this.logger.log('Getting services analytics overview');
    const result = await this.a1IctServicesService.getServicesAnalytics();
    return {
      totalServices: result.totalServices,
      activeServices: result.activeServices,
      servicesByType: result.servicesByType,
      servicesByLocation: result.servicesByLocation,
      servicesByTier: result.servicesByTier,
      totalRequests: result.totalRequests,
      requestsByStatus: result.requestsByStatus,
      averageSLA: result.averageSLA,
    };
  }

  @Get('services/analytics/performance')
  @ApiOperation({ summary: 'Get services performance analytics' })
  @ApiResponse({
    status: 200,
    description: 'Performance analytics retrieved',
    schema: {
      type: 'object',
      properties: {
        averageCPU: { type: 'number' },
        averageMemory: { type: 'number' },
        averageStorage: { type: 'number' },
        averageNetwork: { type: 'number' },
        slaCompliance: { type: 'number' },
        costEfficiency: { type: 'number' },
      },
    },
  })
  async getPerformanceAnalytics(): Promise<{
    averageCPU: number;
    averageMemory: number;
    averageStorage: number;
    averageNetwork: number;
    slaCompliance: number;
    costEfficiency: number;
  }> {
    this.logger.log('Getting services performance analytics');
    const result = await this.a1IctServicesService.getPerformanceAnalytics();
    return {
      averageCPU: result.averageCPU,
      averageMemory: result.averageMemory,
      averageStorage: result.averageStorage,
      averageNetwork: result.averageNetwork,
      slaCompliance: result.slaCompliance,
      costEfficiency: result.costEfficiency,
    };
  }

  @Get('services/analytics/costs')
  @ApiOperation({ summary: 'Get services cost analytics' })
  @ApiResponse({
    status: 200,
    description: 'Cost analytics retrieved',
    schema: {
      type: 'object',
      properties: {
        totalMonthlyCost: { type: 'number' },
        costByService: { type: 'object' },
        costByType: { type: 'object' },
        costTrends: { type: 'array' },
        savings: { type: 'number' },
      },
    },
  })
  async getCostAnalytics(): Promise<{
    totalMonthlyCost: number;
    costByService: Record<string, number>;
    costByType: Record<string, number>;
    costTrends: Array<{
      month: string;
      cost: number;
    }>;
    savings: number;
  }> {
    this.logger.log('Getting services cost analytics');
    const result = await this.a1IctServicesService.getCostAnalytics();
    return {
      totalMonthlyCost: result.totalMonthlyCost,
      costByService: result.costByService,
      costByType: result.costByType,
      costTrends: result.costTrends,
      savings: result.savings,
    };
  }
}
