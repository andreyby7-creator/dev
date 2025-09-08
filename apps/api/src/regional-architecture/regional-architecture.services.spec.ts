import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CdnProvidersService } from './cdn-providers.service';
import { CloudHostingService } from './cloud-hosting.service';
import { HybridArchitectureService } from './hybrid-architecture.service';
import { LocalDatacentersService } from './local-datacenters.service';
import { PaymentSystemsService } from './payment-systems.service';

describe('Regional Architecture Services', () => {
  let localDatacentersService: LocalDatacentersService;
  let cloudHostingService: CloudHostingService;
  let cdnProvidersService: CdnProvidersService;
  let hybridArchitectureService: HybridArchitectureService;
  let paymentSystemsService: PaymentSystemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalDatacentersService,
        CloudHostingService,
        CdnProvidersService,
        HybridArchitectureService,
        PaymentSystemsService,
      ],
    }).compile();

    localDatacentersService = module.get<LocalDatacentersService>(
      LocalDatacentersService
    );
    cloudHostingService = module.get<CloudHostingService>(CloudHostingService);
    cdnProvidersService = module.get<CdnProvidersService>(CdnProvidersService);
    hybridArchitectureService = module.get<HybridArchitectureService>(
      HybridArchitectureService
    );
    paymentSystemsService = module.get<PaymentSystemsService>(
      PaymentSystemsService
    );
  });

  describe('LocalDatacentersService', () => {
    it('should be defined', () => {
      expect(localDatacentersService).toBeDefined();
    });

    it('should return all datacenters', () => {
      const datacenters = localDatacentersService.getAllDatacenters();
      expect(datacenters).toBeDefined();
      expect(Array.isArray(datacenters)).toBe(true);
      expect(datacenters.length).toBeGreaterThan(0);
    });

    it('should return datacenters by region', () => {
      const ruDatacenters =
        localDatacentersService.getDatacentersByRegion('RU');
      const byDatacenters =
        localDatacentersService.getDatacentersByRegion('BY');

      expect(ruDatacenters).toBeDefined();
      expect(byDatacenters).toBeDefined();
      expect(Array.isArray(ruDatacenters)).toBe(true);
      expect(Array.isArray(byDatacenters)).toBe(true);
    });

    it('should check datacenter health', async () => {
      const health =
        await localDatacentersService.checkDatacenterHealth('selectel-moscow');
      expect(health).toBeDefined();
      expect(health?.provider).toBe('selectel');
      expect(['healthy', 'degraded', 'down']).toContain(health?.status);
    });

    it('should select optimal datacenter', () => {
      const optimal = localDatacentersService.selectOptimalDatacenter('RU', {
        minCpu: 4,
        minMemory: 16,
        minStorage: 500,
      });

      expect(optimal).toBeDefined();
      expect(optimal?.resources.cpu).toBeGreaterThanOrEqual(4);
      expect(optimal?.resources.memory).toBeGreaterThanOrEqual(16);
      expect(optimal?.resources.storage).toBeGreaterThanOrEqual(500);
    });
  });

  describe('CloudHostingService', () => {
    it('should be defined', () => {
      expect(cloudHostingService).toBeDefined();
    });

    it('should return all hosting providers', () => {
      const providers = cloudHostingService.getAllProviders();
      expect(providers).toBeDefined();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should return providers by region', () => {
      const ruProviders = cloudHostingService.getProvidersByRegion('RU');
      const byProviders = cloudHostingService.getProvidersByRegion('BY');

      expect(ruProviders).toBeDefined();
      expect(byProviders).toBeDefined();
      expect(Array.isArray(ruProviders)).toBe(true);
      expect(Array.isArray(byProviders)).toBe(true);
    });

    it('should create hosting deployment', () => {
      const deployment = cloudHostingService.createHostingDeployment({
        providerId: 'hoster-by',
        planId: 'start',
        domain: 'test.by',
      });

      expect(deployment).toBeDefined();
      expect(deployment?.providerId).toBe('hoster-by');
      expect(deployment?.domain).toBe('test.by');
      expect(['pending', 'active', 'suspended', 'cancelled']).toContain(
        deployment?.status
      );
    });

    it('should get hosting plans by provider', () => {
      const plans = cloudHostingService.getPlansByProvider('hoster-by');
      expect(plans).toBeDefined();
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThan(0);
    });
  });

  describe('CdnProvidersService', () => {
    it('should be defined', () => {
      expect(cdnProvidersService).toBeDefined();
    });

    it('should return all CDN providers', () => {
      const providers = cdnProvidersService.getAllProviders();
      expect(providers).toBeDefined();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should return providers by type', () => {
      const localProviders = cdnProvidersService.getProvidersByType('local');
      const internationalProviders =
        cdnProvidersService.getProvidersByType('international');

      expect(localProviders).toBeDefined();
      expect(internationalProviders).toBeDefined();
      expect(Array.isArray(localProviders)).toBe(true);
      expect(Array.isArray(internationalProviders)).toBe(true);
    });

    it('should create CDN configuration', () => {
      const config = cdnProvidersService.createConfiguration({
        providerId: 'yandex-cloud-cdn',
        domain: 'test.ru',
        settings: {
          ssl: true,
          compression: true,
          cacheHeaders: {},
          customHeaders: {},
        },
      });

      expect(config).toBeDefined();
      expect(config.providerId).toBe('yandex-cloud-cdn');
      expect(config.domain).toBe('test.ru');
      expect(['active', 'inactive', 'pending']).toContain(config.status);
    });

    it('should get CDN performance metrics', () => {
      const metrics =
        cdnProvidersService.getPerformanceMetrics('yandex-cloud-cdn');
      expect(metrics).toBeDefined();
      expect(metrics?.averageLatency).toBeGreaterThan(0);
      expect(metrics?.uptime).toBeGreaterThan(0);
      expect(metrics?.edgeLocations).toBeGreaterThan(0);
    });
  });

  describe('HybridArchitectureService', () => {
    it('should be defined', () => {
      expect(hybridArchitectureService).toBeDefined();
    });

    it('should return all hybrid providers', () => {
      const providers = hybridArchitectureService.getAllProviders();
      expect(providers).toBeDefined();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should return providers by type', () => {
      const localProviders =
        hybridArchitectureService.getProvidersByType('local');
      const internationalProviders =
        hybridArchitectureService.getProvidersByType('international');

      expect(localProviders).toBeDefined();
      expect(internationalProviders).toBeDefined();
      expect(Array.isArray(localProviders)).toBe(true);
      expect(Array.isArray(internationalProviders)).toBe(true);
    });

    it('should create hybrid deployment', () => {
      const deployment = hybridArchitectureService.createDeployment({
        localProvider: 'selectel',
        internationalProvider: 'alibaba-cloud',
        configuration: {
          primaryRegion: 'RU',
          failoverRegion: 'GLOBAL',
          dataSync: true,
          loadBalancing: true,
        },
      });

      expect(deployment).toBeDefined();
      expect(deployment.localProvider).toBe('selectel');
      expect(deployment.internationalProvider).toBe('alibaba-cloud');
      expect(['active', 'migrating', 'failed']).toContain(deployment.status);
    });

    it('should get hybrid deployment status', () => {
      const deployment = hybridArchitectureService.createDeployment({
        localProvider: 'selectel',
        internationalProvider: 'alibaba-cloud',
        configuration: {
          primaryRegion: 'RU',
          failoverRegion: 'GLOBAL',
          dataSync: true,
          loadBalancing: true,
        },
      });

      const status = hybridArchitectureService.getDeploymentStatus(
        deployment.id
      );
      expect(status).toBeDefined();
    });
  });

  describe('PaymentSystemsService', () => {
    it('should be defined', () => {
      expect(paymentSystemsService).toBeDefined();
    });

    it('should return all payment providers', () => {
      const providers = paymentSystemsService.getAllProviders();
      expect(providers).toBeDefined();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should return providers by type', () => {
      const localProviders = paymentSystemsService.getProvidersByType('local');
      const internationalProviders =
        paymentSystemsService.getProvidersByType('international');

      expect(localProviders).toBeDefined();
      expect(internationalProviders).toBeDefined();
      expect(Array.isArray(localProviders)).toBe(true);
      expect(Array.isArray(internationalProviders)).toBe(true);
    });

    it('should create payment transaction', () => {
      const transaction = paymentSystemsService.createTransactionWithAutoId({
        providerId: 'erip',
        amount: 100,
        currency: 'BYN',
      });

      expect(transaction).toBeDefined();
      expect(transaction?.providerId).toBe('erip');
      expect(transaction?.amount).toBe(100);
      expect(transaction?.currency).toBe('BYN');
      expect(['pending', 'completed', 'failed', 'refunded']).toContain(
        transaction?.status
      );
    });

    it('should get payment provider by region', () => {
      const byProviders = paymentSystemsService.getProvidersByRegion('BY');
      const ruProviders = paymentSystemsService.getProvidersByRegion('RU');

      expect(byProviders).toBeDefined();
      expect(ruProviders).toBeDefined();
      expect(Array.isArray(byProviders)).toBe(true);
      expect(Array.isArray(ruProviders)).toBe(true);
    });

    it('should get transaction history', () => {
      const history = paymentSystemsService.getTransactionHistory('erip');
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should process refund', () => {
      const transaction = paymentSystemsService.createTransactionWithAutoId({
        providerId: 'erip',
        amount: 100,
        currency: 'BYN',
      });

      // Сохраняем транзакцию в сервисе
      paymentSystemsService['transactions'].set(transaction.id, transaction);

      const refund = paymentSystemsService.processRefund(transaction.id, 50);
      expect(refund).toBeDefined();
      expect(refund?.amount).toBe(50);
    });
  });

  describe('Integration Tests', () => {
    it('should work together for regional deployment', () => {
      // 1. Select optimal datacenter
      const datacenter = localDatacentersService.selectOptimalDatacenter('RU', {
        minCpu: 8,
        minMemory: 32,
        minStorage: 1000,
      });

      // 2. Create hosting deployment
      const hosting = cloudHostingService.createHostingDeployment({
        providerId: 'hoster-by',
        planId: 'start',
        domain: 'test.by',
      });

      // 3. Configure CDN
      const cdn = cdnProvidersService.createConfiguration({
        providerId: 'yandex-cloud-cdn',
        domain: 'test.ru',
        settings: {
          ssl: true,
          compression: true,
          cacheHeaders: {},
          customHeaders: {},
        },
      });

      // 4. Create hybrid deployment
      const hybrid = hybridArchitectureService.createDeployment({
        localProvider: 'selectel',
        internationalProvider: 'alibaba-cloud',
        configuration: {
          primaryRegion: 'RU',
          failoverRegion: 'GLOBAL',
          dataSync: true,
          loadBalancing: true,
        },
      });

      // 5. Process payment
      const payment = paymentSystemsService.createTransactionWithAutoId({
        providerId: 'erip',
        amount: 100,
        currency: 'BYN',
      });

      // Verify all components are working
      expect(datacenter).toBeDefined();
      expect(hosting).toBeDefined();
      expect(cdn).toBeDefined();
      expect(hybrid).toBeDefined();
      expect(payment).toBeDefined();

      expect(['selectel', 'vk-cloud']).toContain(datacenter?.provider);
      expect(hosting?.providerId).toBe('hoster-by');
      expect(cdn?.providerId).toBe('yandex-cloud-cdn');
      expect(hybrid?.localProvider).toBe('selectel');
      expect(payment?.providerId).toBe('erip');
    });
  });
});
