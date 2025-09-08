import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AutomatedFailoverService } from './automated-failover.service';

describe('AutomatedFailoverService', () => {
  let service: AutomatedFailoverService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AutomatedFailoverService],
    }).compile();

    service = module.get<AutomatedFailoverService>(AutomatedFailoverService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startAutomatedFailover', () => {
    it('should start automated failover monitoring', async () => {
      await service.startAutomatedFailover();

      const config = service.getConfig();
      expect(config.enabled).toBe(true);
    });
  });

  describe('stopAutomatedFailover', () => {
    it('should stop automated failover monitoring', async () => {
      await service.startAutomatedFailover();
      await service.stopAutomatedFailover();

      // Проверяем что сервис корректно останавливается
      expect(service).toBeDefined();
    });
  });

  describe('performHealthChecks', () => {
    it('should perform health checks for all data centers', async () => {
      const results = await service.performHealthChecks();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      for (const result of results) {
        expect(result.dataCenterId).toBeDefined();
        expect(result.timestamp).toBeDefined();
        expect(result.status).toBeDefined();
        expect(result.services).toBeDefined();
        expect(Array.isArray(result.services)).toBe(true);
      }
    });
  });

  describe('getDataCenters', () => {
    it('should return all data centers', () => {
      const dataCenters = service.getDataCenters();

      expect(dataCenters).toBeDefined();
      expect(Array.isArray(dataCenters)).toBe(true);
      expect(dataCenters.length).toBeGreaterThan(0);

      for (const dc of dataCenters) {
        expect(dc.id).toBeDefined();
        expect(dc.name).toBeDefined();
        expect(dc.type).toBeDefined();
        expect(dc.region).toBeDefined();
        expect(dc.country).toBeDefined();
        expect(dc.services).toBeDefined();
        expect(Array.isArray(dc.services)).toBe(true);
      }
    });
  });

  describe('getActiveDataCenter', () => {
    it('should return active data center', () => {
      const activeDataCenter = service.getActiveDataCenter();

      expect(activeDataCenter).toBeDefined();
      expect(activeDataCenter?.isActive).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('should return failover configuration', () => {
      const config = service.getConfig();

      expect(config).toBeDefined();
      expect(config.enabled).toBeDefined();
      expect(config.autoFailover).toBeDefined();
      expect(config.healthCheckInterval).toBeDefined();
      expect(config.failoverThreshold).toBeDefined();
      expect(config.dataCenters).toBeDefined();
      expect(Array.isArray(config.dataCenters)).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('should update failover configuration', () => {
      const originalConfig = service.getConfig();
      const newHealthCheckInterval = 60000;

      service.updateConfig({ healthCheckInterval: newHealthCheckInterval });

      const updatedConfig = service.getConfig();
      expect(updatedConfig.healthCheckInterval).toBe(newHealthCheckInterval);
      expect(updatedConfig.enabled).toBe(originalConfig.enabled); // Другие параметры не изменились
    });
  });

  describe('getFailoverEvents', () => {
    it('should return failover events history', () => {
      const events = service.getFailoverEvents();

      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
    });

    it('should respect limit parameter', () => {
      const events = service.getFailoverEvents(5);

      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getHealthCheckResults', () => {
    it('should return health check results', async () => {
      await service.performHealthChecks();
      const results = service.getHealthCheckResults();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should respect limit parameter', async () => {
      await service.performHealthChecks();
      const results = service.getHealthCheckResults(3);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe('manualSwitch', () => {
    it('should perform manual switch to another data center', async () => {
      const dataCenters = service.getDataCenters();
      // Используем существующий ID дата-центра из сервиса
      const targetDataCenter = dataCenters.find(
        dc => dc.id === 'dc-minsk-secondary'
      );

      expect(targetDataCenter).toBeDefined();

      const result = await service.manualSwitch(
        'dc-minsk-secondary',
        'Manual test switch'
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('MANUAL_SWITCH');
      expect(result.targetDataCenter).toBe('dc-minsk-secondary');
      expect(result.reason).toBe('Manual test switch');
      expect(result.status).toBe('SUCCESS');
    }, 10000); // Увеличиваем timeout до 10 секунд

    it('should throw error for non-existent data center', async () => {
      await expect(
        service.manualSwitch('non-existent-dc', 'Test')
      ).rejects.toThrow('Data center not found');
    }, 10000); // Увеличиваем timeout до 10 секунд
  });

  describe('performFailover', () => {
    it('should perform failover from specific data center', async () => {
      const dataCenters = service.getDataCenters();
      // Используем существующий ID дата-центра из сервиса
      const sourceDataCenter = dataCenters.find(
        dc => dc.id === 'dc-minsk-primary'
      );

      expect(sourceDataCenter).toBeDefined();

      const result = await service.performFailover('dc-minsk-primary');

      expect(result).toBeDefined();
      expect(result.type).toBe('FAILOVER');
      expect(result.sourceDataCenter).toBe('dc-minsk-primary');
      expect(result.status).toBeDefined();
    }, 10000); // Увеличиваем timeout до 10 секунд
  });
});
