import { vi } from 'vitest';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TestFixturesService } from './test-fixtures.service';

describe('TestFixturesService', () => {
  let service: TestFixturesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TestFixturesService],
    }).compile();

    service = module.get<TestFixturesService>(TestFixturesService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createFixture', () => {
    it('should create a test fixture', () => {
      const fixtureData = {
        name: 'test-fixture',
        description: 'Test fixture description',
        data: { key: 'value' },
        type: 'data' as const,
      };

      const fixture = service.createFixture(fixtureData);

      expect(fixture).toBeDefined();
      expect(fixture.id).toBeDefined();
      expect(fixture.name).toBe(fixtureData.name);
      expect(fixture.description).toBe(fixtureData.description);
      expect(fixture.data).toEqual(fixtureData.data);
      expect(fixture.type).toBe(fixtureData.type);
    });
  });

  describe('getFixture', () => {
    it('should return fixture by ID', () => {
      const fixture = service.createFixture({
        name: 'test-fixture',
        data: { key: 'value' },
        type: 'data',
      });

      const retrieved = service.getFixture(fixture.id);

      expect(retrieved).toEqual(fixture);
    });

    it('should return undefined for non-existent fixture', () => {
      const retrieved = service.getFixture('non-existent-id');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllFixtures', () => {
    it('should return all fixtures', () => {
      service.createFixture({ name: 'fixture-1', data: {}, type: 'data' });
      service.createFixture({ name: 'fixture-2', data: {}, type: 'data' });

      const fixtures = service.getAllFixtures();

      expect(fixtures.length).toBeGreaterThanOrEqual(2);
      expect(fixtures.some(f => f.name === 'fixture-1')).toBe(true);
      expect(fixtures.some(f => f.name === 'fixture-2')).toBe(true);
    });
  });

  describe('createEnvironment', () => {
    it('should create a test environment', async () => {
      const environment = await service.createEnvironment(
        'test-env',
        'Test environment'
      );

      expect(environment).toBeDefined();
      expect(environment.id).toBeDefined();
      expect(environment.name).toBe('test-env');
      expect(environment.description).toBe('Test environment');
      expect(environment.fixtures).toBeDefined();
      expect(environment.config).toBeDefined();
      expect(environment.createdAt).toBeInstanceOf(Date);
      expect(environment.isActive).toBe(true);
    });
  });

  describe('getEnvironment', () => {
    it('should return environment by ID', async () => {
      const environment = await service.createEnvironment(
        'test-env',
        'Test environment'
      );

      const retrieved = service.getEnvironment(environment.id);

      expect(retrieved).toEqual(environment);
    });

    it('should return undefined for non-existent environment', () => {
      const retrieved = service.getEnvironment('non-existent-id');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getActiveEnvironments', () => {
    it('should return active environments', async () => {
      await service.createEnvironment('env-1', 'Environment 1');
      await service.createEnvironment('env-2', 'Environment 2');

      const environments = service.getActiveEnvironments();

      expect(environments.length).toBeGreaterThanOrEqual(2);
      expect(environments.every(e => e.isActive)).toBe(true);
    });
  });

  describe('setupEnvironment', () => {
    it('should setup test environment', async () => {
      const environment = await service.createEnvironment(
        'test-env',
        'Test environment'
      );

      const results = await service.setupEnvironment(environment.id);

      expect(Array.isArray(results)).toBe(true);
      expect(results.every(r => typeof r.fixtureId === 'string')).toBe(true);
      expect(results.every(r => typeof r.environmentId === 'string')).toBe(
        true
      );
    });

    it('should throw error for non-existent environment', async () => {
      await expect(service.setupEnvironment('non-existent-id')).rejects.toThrow(
        'Environment not found'
      );
    });
  });

  describe('cleanupEnvironment', () => {
    it('should cleanup test environment', async () => {
      const environment = await service.createEnvironment(
        'test-env',
        'Test environment'
      );

      await expect(
        service.cleanupEnvironment(environment.id)
      ).resolves.not.toThrow();
    });

    it('should throw error for non-existent environment', async () => {
      await expect(
        service.cleanupEnvironment('non-existent-id')
      ).rejects.toThrow('Environment not found');
    });
  });

  describe('createUserFixture', () => {
    it('should create user fixture', () => {
      const userData = {
        email: 'test@example.com',
        role: 'user',
        permissions: ['read'],
      };

      const fixture = service.createUserFixture(userData);

      expect(fixture).toBeDefined();
      expect(fixture.type).toBe('user');
      expect(fixture.data).toEqual(userData);
      expect(fixture.setup).toBeDefined();
      expect(fixture.cleanup).toBeDefined();
    });
  });

  describe('createDataFixture', () => {
    it('should create data fixture', () => {
      const data = { test: 'value' };
      const fixture = service.createDataFixture('test-data', data);

      expect(fixture).toBeDefined();
      expect(fixture.type).toBe('data');
      expect(fixture.data).toEqual(data);
      expect(fixture.setup).toBeDefined();
      expect(fixture.cleanup).toBeDefined();
    });
  });

  describe('createMockFixture', () => {
    it('should create mock fixture', () => {
      const mockData = { mock: 'response' };
      const fixture = service.createMockFixture('test-mock', mockData);

      expect(fixture).toBeDefined();
      expect(fixture.type).toBe('mock');
      expect(fixture.data).toEqual(mockData);
      expect(fixture.setup).toBeDefined();
      expect(fixture.cleanup).toBeDefined();
    });
  });

  describe('cloneEnvironment', () => {
    it('should clone environment', async () => {
      const source = await service.createEnvironment(
        'source-env',
        'Source environment'
      );
      const cloned = await service.cloneEnvironment(source.id, 'cloned-env');

      expect(cloned).toBeDefined();
      expect(cloned.name).toBe('cloned-env');
      expect(cloned.description).toContain('Cloned from');
      expect(cloned.id).not.toBe(source.id);
    });

    it('should throw error for non-existent source environment', async () => {
      await expect(
        service.cloneEnvironment('non-existent-id', 'cloned-env')
      ).rejects.toThrow('Source environment not found');
    });
  });

  describe('exportEnvironment', () => {
    it('should export environment', async () => {
      const environment = await service.createEnvironment(
        'test-env',
        'Test environment'
      );
      const exported = service.exportEnvironment(environment.id);

      expect(typeof exported).toBe('string');
      expect(exported).toContain('test-env');
    });

    it('should throw error for non-existent environment', () => {
      expect(() => service.exportEnvironment('non-existent-id')).toThrow(
        'Environment not found'
      );
    });
  });

  describe('importEnvironment', () => {
    it('should import environment', () => {
      const environmentData = JSON.stringify({
        name: 'imported-env',
        description: 'Imported environment',
        fixtures: [],
        config: {},
        createdAt: new Date(),
        isActive: true,
      });

      const imported = service.importEnvironment(environmentData);

      expect(imported).toBeDefined();
      expect(imported.name).toBe('imported-env');
      expect(imported.id).toBeDefined();
    });

    it('should throw error for invalid JSON', () => {
      expect(() => service.importEnvironment('invalid-json')).toThrow(
        'Failed to import environment'
      );
    });
  });

  describe('getFixtureResults', () => {
    it('should return fixture results', async () => {
      const environment = await service.createEnvironment(
        'test-env',
        'Test environment'
      );
      await service.setupEnvironment(environment.id);

      const results = service.getFixtureResults();

      expect(Array.isArray(results)).toBe(true);
    });

    it('should return results for specific fixture', async () => {
      const environment = await service.createEnvironment(
        'test-env',
        'Test environment'
      );
      await service.setupEnvironment(environment.id);

      const fixtures = service.getAllFixtures();
      if (fixtures.length > 0) {
        const results = service.getFixtureResults(fixtures[0]?.id ?? '');
        expect(Array.isArray(results)).toBe(true);
      }
    });
  });
});
