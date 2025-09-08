import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { ConfigSnapshotTestingService } from './config-snapshot-testing.service';

// Mock the getConfig function
vi.mock('../config/env.config', () => ({
  getConfig: vi.fn(() => ({
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: 'test-db',
    REDIS_URL: 'test-redis',
  })),
}));

describe('ConfigSnapshotTestingService', () => {
  let service: ConfigSnapshotTestingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigSnapshotTestingService],
    }).compile();

    service = module.get<ConfigSnapshotTestingService>(
      ConfigSnapshotTestingService
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createSnapshot', () => {
    it('should create a config snapshot', async () => {
      const snapshot = await service.createSnapshot(
        'test-snapshot',
        'Test description'
      );

      expect(snapshot).toBeDefined();
      expect(snapshot.name).toBe('test-snapshot');
      expect(snapshot.description).toBe('Test description');
      expect(snapshot.config).toBeDefined();
      expect(snapshot.timestamp).toBeInstanceOf(Date);
      expect(snapshot.environment).toBeDefined();
      expect(snapshot.version).toBeDefined();
      expect(snapshot.checksum).toBeDefined();
    });

    it('should create snapshot without description', async () => {
      const snapshot = await service.createSnapshot('test-snapshot');

      expect(snapshot.description).toBe('');
    });
  });

  describe('getSnapshot', () => {
    it('should return snapshot by ID', async () => {
      const snapshot = await service.createSnapshot('test-snapshot');
      const retrieved = service.getSnapshot(snapshot.id);

      expect(retrieved).toEqual(snapshot);
    });

    it('should return undefined for non-existent snapshot', () => {
      const retrieved = service.getSnapshot('non-existent-id');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllSnapshots', () => {
    it('should return all snapshots', async () => {
      await service.createSnapshot('snapshot-1');
      await service.createSnapshot('snapshot-2');

      const snapshots = service.getAllSnapshots();

      expect(snapshots.length).toBeGreaterThanOrEqual(2);
      expect(snapshots.some(s => s.name === 'snapshot-1')).toBe(true);
      expect(snapshots.some(s => s.name === 'snapshot-2')).toBe(true);
    });
  });

  describe('createTest', () => {
    it('should create a config test', () => {
      const testData = {
        snapshotId: 'test-snapshot-id',
        name: 'test-name',
        description: 'test description',
        testFunction: (_config: Record<string, unknown>) => true,
        expectedResult: true,
        timeout: 5000,
        retries: 3,
      };

      const test = service.createTest(testData);

      expect(test).toBeDefined();
      expect(test.id).toBeDefined();
      expect(test.snapshotId).toBe(testData.snapshotId);
      expect(test.name).toBe(testData.name);
      expect(test.description).toBe(testData.description);
      expect(test.testFunction).toBe(testData.testFunction);
      expect(test.expectedResult).toBe(testData.expectedResult);
      expect(test.timeout).toBe(testData.timeout);
      expect(test.retries).toBe(testData.retries);
    });
  });

  describe('runTest', () => {
    it('should run test successfully', async () => {
      const snapshot = await service.createSnapshot('test-snapshot');
      const test = service.createTest({
        snapshotId: snapshot.id,
        name: 'test-name',
        testFunction: (_config: Record<string, unknown>) => true,
        expectedResult: true,
      });

      const result = await service.runTest(test.id);

      expect(result).toBeDefined();
      expect(result.testId).toBe(test.id);
      expect(result.snapshotId).toBe(snapshot.id);
      expect(result.passed).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.error).toBe('');
      expect(result.configUsed).toEqual(snapshot.config);
    });

    it('should handle test failure', async () => {
      const snapshot = await service.createSnapshot('test-snapshot');
      const test = service.createTest({
        snapshotId: snapshot.id,
        name: 'test-name',
        testFunction: (_config: Record<string, unknown>) => false,
        expectedResult: true,
      });

      const result = await service.runTest(test.id);

      expect(result.passed).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle test timeout', async () => {
      const snapshot = await service.createSnapshot('test-snapshot');
      const test = service.createTest({
        snapshotId: snapshot.id,
        name: 'test-name',
        testFunction: async (_config: Record<string, unknown>) => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return true;
        },
        expectedResult: true,
        timeout: 50,
      });

      const result = await service.runTest(test.id);

      expect(result.passed).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('runAllTests', () => {
    it('should run all tests', async () => {
      const snapshot = await service.createSnapshot('test-snapshot');
      service.createTest({
        snapshotId: snapshot.id,
        name: 'test-1',
        testFunction: (_config: Record<string, unknown>) => true,
        expectedResult: true,
      });
      service.createTest({
        snapshotId: snapshot.id,
        name: 'test-2',
        testFunction: (_config: Record<string, unknown>) => true,
        expectedResult: true,
      });

      const results = await service.runAllTests(snapshot.id);

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every(r => r.passed)).toBe(true);
    });
  });

  describe('getTestResults', () => {
    it('should return test results', async () => {
      const snapshot = await service.createSnapshot('test-snapshot');
      const test = service.createTest({
        snapshotId: snapshot.id,
        name: 'test-name',
        testFunction: (_config: Record<string, unknown>) => true,
        expectedResult: true,
      });

      await service.runTest(test.id);
      const results = service.getTestResults();

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(r => r.testId === test.id)).toBe(true);
    });
  });

  describe('validateSnapshot', () => {
    it('should validate snapshot integrity', async () => {
      const snapshot = await service.createSnapshot('test-snapshot');

      const isValid = service.validateSnapshot(snapshot.id);
      expect(isValid).toBe(true);
    });

    it('should detect corrupted snapshot', async () => {
      const snapshot = await service.createSnapshot('test-snapshot');

      // Manually corrupt the snapshot
      (snapshot as unknown as { config: unknown }).config = { corrupted: true };

      const isValid = service.validateSnapshot(snapshot.id);
      expect(isValid).toBe(false);
    });
  });
});
