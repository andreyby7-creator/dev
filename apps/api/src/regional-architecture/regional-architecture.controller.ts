import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../types/roles';
import { LocalDatacentersService } from './local-datacenters.service';
import { CloudHostingService } from './cloud-hosting.service';
import { CdnProvidersService } from './cdn-providers.service';
import { HybridArchitectureService } from './hybrid-architecture.service';
import { PaymentSystemsService } from './payment-systems.service';

@ApiTags('Regional Architecture')
@Controller('regional-architecture')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RegionalArchitectureController {
  constructor(
    private readonly localDatacentersService: LocalDatacentersService,
    private readonly cloudHostingService: CloudHostingService,
    private readonly cdnProvidersService: CdnProvidersService,
    private readonly hybridArchitectureService: HybridArchitectureService,
    private readonly paymentSystemsService: PaymentSystemsService
  ) {}

  // Local Datacenters
  @Get('datacenters')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get all local datacenters' })
  @ApiResponse({ status: 200, description: 'List of datacenters' })
  async getAllDatacenters() {
    return this.localDatacentersService.getAllDatacenters();
  }

  @Get('datacenters/:id/health')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Check datacenter health' })
  @ApiResponse({ status: 200, description: 'Datacenter health status' })
  async checkDatacenterHealth(@Param('id') id: string) {
    return this.localDatacentersService.checkDatacenterHealth(id);
  }

  @Get('datacenters/health/all')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Check all datacenters health' })
  @ApiResponse({ status: 200, description: 'All datacenters health status' })
  async getAllDatacenterHealth() {
    return this.localDatacentersService.getAllDatacenterHealth();
  }

  @Post('datacenters/select-optimal')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Select optimal datacenter' })
  @ApiResponse({ status: 200, description: 'Optimal datacenter configuration' })
  async selectOptimalDatacenter(
    @Body()
    requirements: {
      region: 'RU' | 'BY';
      minCpu: number;
      minMemory: number;
      minStorage: number;
    }
  ) {
    return this.localDatacentersService.selectOptimalDatacenter(
      requirements.region,
      requirements
    );
  }

  // Cloud Hosting
  @Get('hosting/providers')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get all hosting providers' })
  @ApiResponse({ status: 200, description: 'List of hosting providers' })
  async getAllHostingProviders() {
    return this.cloudHostingService.getAllProviders();
  }

  @Get('hosting/providers/:region')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get hosting providers by region' })
  @ApiResponse({ status: 200, description: 'Hosting providers by region' })
  async getHostingProvidersByRegion(@Param('region') region: 'RU' | 'BY') {
    return this.cloudHostingService.getProvidersByRegion(region);
  }

  @Post('hosting/create')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Create hosting deployment' })
  @ApiResponse({ status: 201, description: 'Hosting deployment created' })
  async createHosting(
    @Body()
    request: {
      providerId: string;
      planId: string;
      domain: string;
      settings: {
        ssl: boolean;
        backup: boolean;
        monitoring: boolean;
      };
    }
  ) {
    return this.cloudHostingService.createHosting(
      request.providerId,
      request.planId,
      request.domain,
      request.settings
    );
  }

  // CDN Providers
  @Get('cdn/providers')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get all CDN providers' })
  @ApiResponse({ status: 200, description: 'List of CDN providers' })
  async getAllCdnProviders() {
    return this.cdnProvidersService.getAllProviders();
  }

  @Get('cdn/providers/local')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get local CDN providers' })
  @ApiResponse({ status: 200, description: 'Local CDN providers' })
  async getLocalCdnProviders() {
    return this.cdnProvidersService.getLocalProviders();
  }

  @Get('cdn/providers/international')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get international CDN providers' })
  @ApiResponse({ status: 200, description: 'International CDN providers' })
  async getInternationalCdnProviders() {
    return this.cdnProvidersService.getInternationalProviders();
  }

  @Post('cdn/create-configuration')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Create CDN configuration' })
  @ApiResponse({ status: 201, description: 'CDN configuration created' })
  async createCdnConfiguration(
    @Body()
    request: {
      providerId: string;
      domain: string;
      settings: {
        ssl: boolean;
        compression: boolean;
        cacheHeaders: Record<string, string>;
        customHeaders: Record<string, string>;
      };
    }
  ) {
    return this.cdnProvidersService.createCdnConfiguration(
      request.providerId,
      request.domain,
      request.settings
    );
  }

  // Hybrid Architecture
  @Get('hybrid/providers')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get all hybrid providers' })
  @ApiResponse({ status: 200, description: 'List of hybrid providers' })
  async getAllHybridProviders() {
    return this.hybridArchitectureService.getAllProviders();
  }

  @Post('hybrid/create-deployment')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Create hybrid deployment' })
  @ApiResponse({ status: 201, description: 'Hybrid deployment created' })
  async createHybridDeployment(
    @Body()
    request: {
      localProvider: string;
      internationalProvider: string;
      configuration: {
        primaryRegion: 'RU' | 'BY';
        failoverRegion: 'GLOBAL';
        dataSync: boolean;
        loadBalancing: boolean;
      };
    }
  ) {
    return this.hybridArchitectureService.createHybridDeployment(
      request.localProvider,
      request.internationalProvider,
      request.configuration
    );
  }

  @Post('hybrid/:id/migrate-workload')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Migrate workload in hybrid deployment' })
  @ApiResponse({ status: 200, description: 'Workload migration started' })
  async migrateWorkload(
    @Param('id') deploymentId: string,
    @Body()
    workload: {
      type: 'compute' | 'storage' | 'database';
      size: number;
      priority: 'high' | 'medium' | 'low';
    }
  ) {
    return this.hybridArchitectureService.migrateWorkload(
      deploymentId,
      workload
    );
  }

  // Payment Systems
  @Get('payments/providers')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get all payment providers' })
  @ApiResponse({ status: 200, description: 'List of payment providers' })
  async getAllPaymentProviders() {
    return this.paymentSystemsService.getAllProviders();
  }

  @Get('payments/providers/:region')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get payment providers by region' })
  @ApiResponse({ status: 200, description: 'Payment providers by region' })
  async getPaymentProvidersByRegion(
    @Param('region') region: 'RU' | 'BY' | 'GLOBAL'
  ) {
    return this.paymentSystemsService.getProvidersByRegion(region);
  }

  @Post('payments/process')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Process payment' })
  @ApiResponse({ status: 201, description: 'Payment processed' })
  async processPayment(
    @Body()
    request: {
      providerId: string;
      amount: number;
      currency: string;
      cardType?: string;
    }
  ) {
    return this.paymentSystemsService.processPayment(
      request.providerId,
      request.amount,
      request.currency,
      request.cardType
    );
  }

  @Post('payments/:id/refund')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Refund payment' })
  @ApiResponse({ status: 200, description: 'Payment refunded' })
  async refundPayment(
    @Param('id') transactionId: string,
    @Body() request: { amount?: number }
  ) {
    return this.paymentSystemsService.refundPayment(
      transactionId,
      request.amount
    );
  }

  // Analytics and Statistics
  @Get('analytics/overview')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get regional architecture overview' })
  @ApiResponse({ status: 200, description: 'Regional architecture overview' })
  async getRegionalArchitectureOverview() {
    const datacenters = this.localDatacentersService.getAllDatacenters();
    const hostingProviders = this.cloudHostingService.getAllProviders();
    const cdnProviders = this.cdnProvidersService.getAllProviders();
    const hybridProviders = this.hybridArchitectureService.getAllProviders();
    const paymentProviders = this.paymentSystemsService.getAllProviders();

    return {
      datacenters: {
        total: datacenters.length,
        byRegion: {
          RU: datacenters.filter(
            dc => dc.region === 'Moscow' || dc.region === 'Saint Petersburg'
          ).length,
          BY: datacenters.filter(dc => dc.region === 'Minsk').length,
        },
      },
      hosting: {
        total: hostingProviders.length,
        byRegion: {
          RU: hostingProviders.filter(hp => hp.region === 'RU').length,
          BY: hostingProviders.filter(hp => hp.region === 'BY').length,
        },
      },
      cdn: {
        total: cdnProviders.length,
        local: cdnProviders.filter(cp => cp.type === 'local').length,
        international: cdnProviders.filter(cp => cp.type === 'international')
          .length,
      },
      hybrid: {
        total: hybridProviders.length,
        local: hybridProviders.filter(hp => hp.type === 'local').length,
        international: hybridProviders.filter(hp => hp.type === 'international')
          .length,
      },
      payments: {
        total: paymentProviders.length,
        local: paymentProviders.filter(pp => pp.type === 'local').length,
        international: paymentProviders.filter(
          pp => pp.type === 'international'
        ).length,
      },
    };
  }
}
