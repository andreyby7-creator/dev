import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { IncidentResponsePlaybooksService } from '../incident-response-playbooks.service';

describe('IncidentResponsePlaybooksService', () => {
  let service: IncidentResponsePlaybooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IncidentResponsePlaybooksService],
    }).compile();

    service = module.get<IncidentResponsePlaybooksService>(
      IncidentResponsePlaybooksService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Default Playbooks', () => {
    it('should have security critical playbook', () => {
      const playbooks = service.getAllPlaybooks();
      const securityPlaybook = playbooks.find(
        p => p.id === 'security-critical'
      );

      expect(securityPlaybook).toBeDefined();
      expect(securityPlaybook?.name).toBe(
        'Critical Security Incident Response'
      );
      expect(securityPlaybook?.severity).toBe('critical');
      expect(securityPlaybook?.category).toBe('security');
    });

    it('should have performance degradation playbook', () => {
      const playbooks = service.getAllPlaybooks();
      const performancePlaybook = playbooks.find(
        p => p.id === 'performance-degradation'
      );

      expect(performancePlaybook).toBeDefined();
      expect(performancePlaybook?.name).toBe(
        'Performance Degradation Response'
      );
      expect(performancePlaybook?.severity).toBe('high');
      expect(performancePlaybook?.category).toBe('performance');
    });
  });

  describe('Playbook Management', () => {
    it('should create new playbook', () => {
      const playbookData = {
        name: 'Test Playbook',
        description: 'Test Description',
        severity: 'medium' as const,
        category: 'network' as const,
        steps: [],
        enabled: true,
        autoExecute: false,
      };

      const playbook = service.createPlaybook(playbookData);

      expect(playbook.id).toBeDefined();
      expect(playbook.name).toBe(playbookData.name);
      expect(playbook.severity).toBe(playbookData.severity);
      expect(playbook.category).toBe(playbookData.category);
      expect(playbook.createdAt).toBeInstanceOf(Date);
      expect(playbook.updatedAt).toBeInstanceOf(Date);
    });

    it('should get playbook by ID', () => {
      const playbookData = {
        name: 'Test Playbook',
        description: 'Test Description',
        severity: 'medium' as const,
        category: 'network' as const,
        steps: [],
        enabled: true,
        autoExecute: false,
      };

      const createdPlaybook = service.createPlaybook(playbookData);
      const retrievedPlaybook = service.getPlaybook(createdPlaybook.id);

      expect(retrievedPlaybook).toEqual(createdPlaybook);
    });

    it('should get playbooks by category', () => {
      const securityPlaybooks = service.getPlaybooksByCategory('security');
      const performancePlaybooks =
        service.getPlaybooksByCategory('performance');

      expect(securityPlaybooks.length).toBeGreaterThan(0);
      expect(performancePlaybooks.length).toBeGreaterThan(0);
      expect(securityPlaybooks.every(p => p.category === 'security')).toBe(
        true
      );
      expect(
        performancePlaybooks.every(p => p.category === 'performance')
      ).toBe(true);
    });

    it('should get playbooks by severity', () => {
      const criticalPlaybooks = service.getPlaybooksBySeverity('critical');
      const highPlaybooks = service.getPlaybooksBySeverity('high');

      expect(criticalPlaybooks.length).toBeGreaterThan(0);
      expect(highPlaybooks.length).toBeGreaterThan(0);
      expect(criticalPlaybooks.every(p => p.severity === 'critical')).toBe(
        true
      );
      expect(highPlaybooks.every(p => p.severity === 'high')).toBe(true);
    });

    it('should update playbook', async () => {
      const playbookData = {
        name: 'Test Playbook',
        description: 'Test Description',
        severity: 'medium' as const,
        category: 'network' as const,
        steps: [],
        enabled: true,
        autoExecute: false,
      };

      const createdPlaybook = service.createPlaybook(playbookData);

      // Добавляем небольшую задержку для обновления временной метки
      await new Promise(resolve => setTimeout(resolve, 10));

      const updatedPlaybook = service.updatePlaybook(createdPlaybook.id, {
        name: 'Updated Playbook',
        enabled: false,
      });

      expect(updatedPlaybook?.name).toBe('Updated Playbook');
      expect(updatedPlaybook?.enabled).toBe(false);
      expect(updatedPlaybook?.updatedAt.getTime()).toBeGreaterThan(
        createdPlaybook.updatedAt.getTime()
      );
    });

    it('should delete playbook', () => {
      const playbookData = {
        name: 'Test Playbook',
        description: 'Test Description',
        severity: 'medium' as const,
        category: 'network' as const,
        steps: [],
        enabled: true,
        autoExecute: false,
      };

      const createdPlaybook = service.createPlaybook(playbookData);
      const deleted = service.deletePlaybook(createdPlaybook.id);

      expect(deleted).toBe(true);
      expect(service.getPlaybook(createdPlaybook.id)).toBeNull();
    });
  });

  describe('Playbook Execution', () => {
    it('should execute playbook', async () => {
      const playbook = service.getPlaybooksByCategory('security')[0];
      const execution = await service.executePlaybook(
        playbook?.id ?? '',
        'test-incident-123'
      );

      expect(execution.id).toBeDefined();
      expect(execution.playbookId).toBe(playbook?.id);
      expect(execution.incidentId).toBe('test-incident-123');
      expect(execution.status).toBe('running'); // Статус меняется на 'running' в runExecution
      expect(execution.startedAt).toBeInstanceOf(Date);
    });

    it('should fail execution for non-existent playbook', async () => {
      await expect(
        service.executePlaybook('non-existent', 'test-incident')
      ).rejects.toThrow('Playbook non-existent not found');
    });

    it('should fail execution for disabled playbook', async () => {
      const playbookData = {
        name: 'Disabled Playbook',
        description: 'Test Description',
        severity: 'medium' as const,
        category: 'network' as const,
        steps: [],
        enabled: false,
        autoExecute: false,
      };

      const playbook = service.createPlaybook(playbookData);
      await expect(
        service.executePlaybook(playbook.id, 'test-incident')
      ).rejects.toThrow(`Playbook ${playbook.id} is disabled`);
    });
  });

  describe('Statistics', () => {
    it('should return correct statistics', () => {
      const stats = service.getStatistics();

      expect(stats.totalPlaybooks).toBeGreaterThan(0);
      expect(stats.enabledPlaybooks).toBeGreaterThan(0);
      expect(stats.totalExecutions).toBeGreaterThanOrEqual(0);
      expect(stats.activeExecutions).toBeGreaterThanOrEqual(0);
      expect(stats.successfulExecutions).toBeGreaterThanOrEqual(0);
      expect(stats.failedExecutions).toBeGreaterThanOrEqual(0);
    });
  });
});
