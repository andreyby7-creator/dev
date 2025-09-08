import type { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import { AnsibleService } from '../ansible.service';

describe('AnsibleService', () => {
  let service: AnsibleService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Создаем мок ConfigService
    configService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          ANSIBLE_ENABLED: true,
          ANSIBLE_PATH: '/usr/bin/ansible',
          ANSIBLE_TIMEOUT: 300,
          ANSIBLE_RETRY_COUNT: 3,
        };
        return config[key] ?? defaultValue;
      }),
      getOrThrow: vi.fn((key: string) => {
        const config = {
          ANSIBLE_ENABLED: true,
          ANSIBLE_PATH: '/usr/bin/ansible',
          ANSIBLE_TIMEOUT: 300,
          ANSIBLE_RETRY_COUNT: 3,
        };
        if (key in config) return (config as Record<string, unknown>)[key];
        throw new Error(`Configuration key "${key}" not found`);
      }),
    } as unknown as ConfigService;

    // Создаем сервис напрямую с моком
    service = new AnsibleService(configService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPlaybooks', () => {
    it('should return playbooks successfully', async () => {
      const result = await service.getPlaybooks();

      expect(result.success).toBe(true);
      expect(result.playbooks).toBeDefined();
      expect(result.playbooks).toHaveLength(4);
      expect(result.playbooks?.[0]).toHaveProperty('playbook');
      expect(result.playbooks?.[0]).toHaveProperty('inventory');
      expect(result.playbooks?.[0]).toHaveProperty('tags');
      expect(result.playbooks?.[0]).toHaveProperty('variables');
    });
  });

  describe('executePlaybook', () => {
    it('should execute playbook successfully', async () => {
      const playbookConfig = {
        playbook: '/playbooks/deploy-app.yml',
        inventory: '/inventories/production',
        variables: { app_version: '1.0.0' },
        tags: ['deployment'],
      };

      const result = await service.executePlaybook(playbookConfig);

      expect(result.success).toBe(true);
      expect(result.executionId).toBeDefined();
    });
  });

  describe('getInventory', () => {
    it('should return inventory successfully', async () => {
      const result = await service.getInventory();

      expect(result.success).toBe(true);
      expect(result.inventories).toBeDefined();
      expect(result.inventories).toHaveLength(2);
      expect(result.inventories?.[0]).toHaveProperty('name');
      expect(result.inventories?.[0]).toHaveProperty('hosts');
      expect(result.inventories?.[0]).toHaveProperty('groups');
    });
  });

  describe('getExecutionStatus', () => {
    it('should return execution status successfully', async () => {
      // Сначала создаем execution
      const playbookConfig = {
        playbook: '/playbooks/deploy-app.yml',
        inventory: '/inventories/production',
      };
      const executionResult = await service.executePlaybook(playbookConfig);
      const executionId = executionResult.executionId!;

      const result = await service.getExecutionStatus(executionId);

      expect(result.success).toBe(true);
      expect(result.execution).toBeDefined();
      expect(result.execution?.id).toBe(executionId);
      expect(result.execution?.status).toBe('running');
    });

    it('should return error for non-existent execution', async () => {
      const result = await service.getExecutionStatus('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Execution not found');
    });
  });

  describe('getExecutions', () => {
    it('should return executions successfully', async () => {
      const result = await service.getExecutions();

      expect(result.success).toBe(true);
      expect(result.executions).toBeDefined();
      expect(Array.isArray(result.executions)).toBe(true);
    });
  });

  describe('validatePlaybook', () => {
    it('should validate valid playbook successfully', async () => {
      const result = await service.validatePlaybook(
        '/playbooks/deploy-app.yml'
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return validation errors for invalid playbook', async () => {
      const result = await service.validatePlaybook('invalid.txt');

      expect(result.success).toBe(true);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Playbook must be a YAML file');
    });

    it('should return validation errors for empty playbook path', async () => {
      const result = await service.validatePlaybook('');

      expect(result.success).toBe(true);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Playbook path is required');
    });
  });

  describe('getPlaybookOutput', () => {
    it('should return playbook output successfully', async () => {
      // Сначала создаем execution
      const playbookConfig = {
        playbook: '/playbooks/deploy-app.yml',
        inventory: '/inventories/production',
      };
      const executionResult = await service.executePlaybook(playbookConfig);
      const executionId = executionResult.executionId!;

      const result = await service.getPlaybookOutput(executionId);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
    });

    it('should return error for non-existent execution', async () => {
      const result = await service.getPlaybookOutput('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Execution not found');
    });
  });
});
