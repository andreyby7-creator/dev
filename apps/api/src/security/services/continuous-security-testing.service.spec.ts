import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { ISecurityTestRequest } from './continuous-security-testing.service';
import { ContinuousSecurityTestingService } from './continuous-security-testing.service';

describe('ContinuousSecurityTestingService', () => {
  let service: ContinuousSecurityTestingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContinuousSecurityTestingService],
    }).compile();

    service = module.get<ContinuousSecurityTestingService>(
      ContinuousSecurityTestingService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runSecurityTest', () => {
    it('should run OWASP test successfully', async () => {
      const request: ISecurityTestRequest = {
        type: 'OWASP',
        target: 'https://api.example.com',
      };

      const result = await service.runSecurityTest(request);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe('OWASP');
      expect(result.status).toBe('COMPLETED');
      expect(result.target).toBe('https://api.example.com');
      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
      expect(result.duration).toBeDefined();
    });

    it('should run Trivy test successfully', async () => {
      const request: ISecurityTestRequest = {
        type: 'TRIVY',
        target: 'package.json',
      };

      const result = await service.runSecurityTest(request);

      expect(result).toBeDefined();
      expect(result.type).toBe('TRIVY');
      expect(result.status).toBe('COMPLETED');
      expect(result.results).toBeDefined();
    });

    it('should run Snyk test successfully', async () => {
      const request: ISecurityTestRequest = {
        type: 'SNYK',
        target: 'package.json',
      };

      const result = await service.runSecurityTest(request);

      expect(result).toBeDefined();
      expect(result.type).toBe('SNYK');
      expect(result.status).toBe('COMPLETED');
      expect(result.results).toBeDefined();
    });
  });

  describe('runAllSecurityTests', () => {
    it('should run all security tests for a target', async () => {
      const target = 'https://api.example.com';
      const results = await service.runAllSecurityTests(target);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // Проверяем, что все типы тестов выполнены
      const testTypes = results.map(r => r.type);
      expect(testTypes).toContain('OWASP');
      expect(testTypes).toContain('FUZZING');
      expect(testTypes).toContain('DEPENDENCY_CHECK');
    }, 15000); // Увеличиваем timeout до 15 секунд для security тестов
  });

  describe('generateSecurityReport', () => {
    it('should generate report for test IDs', async () => {
      // Сначала запустим тест
      const test = await service.runSecurityTest({
        type: 'OWASP',
        target: 'https://api.example.com',
      });

      const report = await service.generateSecurityReport([test.id]);

      expect(report).toBeDefined();
      expect(report.testId).toBe(test.id);
      expect(report.summary).toBeDefined();
      expect(report.summary.totalTests).toBe(1);
      expect(report.results).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.compliance).toBeDefined();
    });

    it('should throw error for non-existent test IDs', async () => {
      await expect(
        service.generateSecurityReport(['non-existent-id'])
      ).rejects.toThrow('No tests found for the provided IDs');
    });
  });

  describe('getActiveTests', () => {
    it('should return empty array when no active tests', () => {
      const activeTests = service.getActiveTests();
      expect(activeTests).toBeDefined();
      expect(Array.isArray(activeTests)).toBe(true);
      expect(activeTests.length).toBe(0);
    });
  });

  describe('getTestHistory', () => {
    it('should return test history', async () => {
      // Запустим несколько тестов
      await service.runSecurityTest({
        type: 'OWASP',
        target: 'https://api.example.com',
      });

      await service.runSecurityTest({
        type: 'TRIVY',
        target: 'package.json',
      });

      const history = service.getTestHistory();

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    }, 10000);

    it('should respect limit parameter', async () => {
      // Запустим несколько тестов
      await service.runSecurityTest({
        type: 'OWASP',
        target: 'https://api.example.com',
      });

      await service.runSecurityTest({
        type: 'TRIVY',
        target: 'package.json',
      });

      const history = service.getTestHistory(1);

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeLessThanOrEqual(1);
    }, 10000);
  });

  describe('getTestById', () => {
    it('should return test by ID', async () => {
      const test = await service.runSecurityTest({
        type: 'OWASP',
        target: 'https://api.example.com',
      });

      const foundTest = service.getTestById(test.id);

      expect(foundTest).toBeDefined();
      expect(foundTest?.id).toBe(test.id);
    });

    it('should return undefined for non-existent ID', () => {
      const test = service.getTestById('non-existent-id');
      expect(test).toBeUndefined();
    });
  });

  describe('stopTest', () => {
    it('should return false for non-existent test', async () => {
      const result = await service.stopTest('non-existent-id');
      expect(result).toBe(false);
    });
  });
});
