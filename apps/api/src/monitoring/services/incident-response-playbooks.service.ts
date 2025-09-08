import { Injectable } from '@nestjs/common';
import { redactedLogger } from '../../utils/redacted-logger';

interface PlaybookStep {
  id: string;
  name: string;
  description: string;
  action: string;
  parameters?: Record<string, unknown>;
  order: number;
  required: boolean;
  timeout?: number; // в секундах
}

interface IncidentPlaybook {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'security' | 'performance' | 'availability' | 'data' | 'network';
  steps: PlaybookStep[];
  enabled: boolean;
  autoExecute: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface IncidentExecution {
  id: string;
  playbookId: string;
  incidentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep: number;
  startedAt: Date;
  completedAt?: Date;
  results: Record<string, unknown>;
  errors: string[];
}

@Injectable()
export class IncidentResponsePlaybooksService {
  private readonly playbooks: Map<string, IncidentPlaybook> = new Map();
  private readonly executions: Map<string, IncidentExecution> = new Map();
  private readonly maxExecutions = 1000;

  constructor() {
    this.initializeDefaultPlaybooks();
    redactedLogger.log(
      'Incident Response Playbooks service initialized',
      'IncidentResponsePlaybooksService'
    );
  }

  private initializeDefaultPlaybooks(): void {
    // Playbook для критических ошибок безопасности
    const securityPlaybook: IncidentPlaybook = {
      id: 'security-critical',
      name: 'Critical Security Incident Response',
      description:
        'Автоматизированный ответ на критические инциденты безопасности',
      severity: 'critical',
      category: 'security',
      steps: [
        {
          id: 'isolate',
          name: 'Изоляция системы',
          description: 'Автоматическое отключение затронутых сервисов',
          action: 'isolate_system',
          parameters: { scope: 'affected_services' },
          order: 1,
          required: true,
          timeout: 30,
        },
        {
          id: 'notify',
          name: 'Уведомление команды',
          description: 'Отправка уведомлений всем заинтересованным сторонам',
          action: 'notify_team',
          parameters: { channels: ['slack', 'email', 'telegram'] },
          order: 2,
          required: true,
          timeout: 60,
        },
        {
          id: 'backup',
          name: 'Создание бэкапа',
          description: 'Создание резервной копии текущего состояния',
          action: 'create_backup',
          parameters: { type: 'emergency' },
          order: 3,
          required: true,
          timeout: 300,
        },
        {
          id: 'investigate',
          name: 'Начало расследования',
          description: 'Запуск автоматизированного анализа',
          action: 'start_investigation',
          parameters: { tools: ['logs', 'metrics', 'traces'] },
          order: 4,
          required: true,
          timeout: 600,
        },
      ],
      enabled: true,
      autoExecute: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Playbook для проблем производительности
    const performancePlaybook: IncidentPlaybook = {
      id: 'performance-degradation',
      name: 'Performance Degradation Response',
      description: 'Автоматизированный ответ на проблемы производительности',
      severity: 'high',
      category: 'performance',
      steps: [
        {
          id: 'scale-up',
          name: 'Масштабирование',
          description: 'Автоматическое увеличение ресурсов',
          action: 'scale_up',
          parameters: { factor: 2, services: ['api', 'database'] },
          order: 1,
          required: true,
          timeout: 120,
        },
        {
          id: 'traffic-control',
          name: 'Контроль трафика',
          description: 'Ограничение входящего трафика',
          action: 'limit_traffic',
          parameters: { rate: 0.5, duration: 300 },
          order: 2,
          required: false,
          timeout: 60,
        },
        {
          id: 'cache-warmup',
          name: 'Прогрев кэша',
          description: 'Предварительная загрузка часто используемых данных',
          action: 'warm_cache',
          parameters: { patterns: ['user_profiles', 'product_catalog'] },
          order: 3,
          required: false,
          timeout: 180,
        },
      ],
      enabled: true,
      autoExecute: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.playbooks.set(securityPlaybook.id, securityPlaybook);
    this.playbooks.set(performancePlaybook.id, performancePlaybook);
  }

  // Создание нового playbook
  createPlaybook(
    playbookData: Omit<IncidentPlaybook, 'id' | 'createdAt' | 'updatedAt'>
  ): IncidentPlaybook {
    const id = `playbook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const playbook: IncidentPlaybook = {
      ...playbookData,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.playbooks.set(id, playbook);
    redactedLogger.log(
      `Created incident response playbook: ${playbook.name}`,
      'IncidentResponsePlaybooksService'
    );

    return playbook;
  }

  // Получение playbook по ID
  getPlaybook(id: string): IncidentPlaybook | null {
    return this.playbooks.get(id) ?? null;
  }

  // Получение всех playbooks
  getAllPlaybooks(): IncidentPlaybook[] {
    return Array.from(this.playbooks.values());
  }

  // Получение playbooks по категории
  getPlaybooksByCategory(
    category: IncidentPlaybook['category']
  ): IncidentPlaybook[] {
    return Array.from(this.playbooks.values()).filter(
      p => p.category === category
    );
  }

  // Получение playbooks по уровню критичности
  getPlaybooksBySeverity(
    severity: IncidentPlaybook['severity']
  ): IncidentPlaybook[] {
    return Array.from(this.playbooks.values()).filter(
      p => p.severity === severity
    );
  }

  // Обновление playbook
  updatePlaybook(
    id: string,
    updates: Partial<IncidentPlaybook>
  ): IncidentPlaybook | null {
    const playbook = this.playbooks.get(id);
    if (!playbook) {
      return null;
    }

    const updatedPlaybook: IncidentPlaybook = {
      ...playbook,
      ...updates,
      updatedAt: new Date(),
    };

    this.playbooks.set(id, updatedPlaybook);
    redactedLogger.log(
      `Updated incident response playbook: ${updatedPlaybook.name}`,
      'IncidentResponsePlaybooksService'
    );

    return updatedPlaybook;
  }

  // Удаление playbook
  deletePlaybook(id: string): boolean {
    const deleted = this.playbooks.delete(id);
    if (deleted) {
      redactedLogger.log(
        `Deleted incident response playbook: ${id}`,
        'IncidentResponsePlaybooksService'
      );
    }
    return deleted;
  }

  // Запуск playbook
  async executePlaybook(
    playbookId: string,
    incidentId: string
  ): Promise<IncidentExecution> {
    const playbook = this.playbooks.get(playbookId);
    if (!playbook) {
      throw new Error(`Playbook ${playbookId} not found`);
    }

    if (!playbook.enabled) {
      throw new Error(`Playbook ${playbookId} is disabled`);
    }

    const execution: IncidentExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playbookId,
      incidentId,
      status: 'pending',
      currentStep: 0,
      startedAt: new Date(),
      results: {},
      errors: [],
    };

    this.executions.set(execution.id, execution);

    // Очищаем старые выполнения
    if (this.executions.size > this.maxExecutions) {
      const firstKey = this.executions.keys().next().value;
      if (firstKey != null && firstKey !== '') {
        this.executions.delete(firstKey);
      }
    }

    redactedLogger.log(
      `Started execution of playbook: ${playbook.name} for incident: ${incidentId}`,
      'IncidentResponsePlaybooksService'
    );

    // Запускаем выполнение в фоне
    void this.runExecution(execution.id);

    return execution;
  }

  // Выполнение playbook
  private async runExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return;
    }

    const playbook = this.playbooks.get(execution.playbookId);
    if (!playbook) {
      execution.status = 'failed';
      execution.errors.push('Playbook not found');
      this.executions.set(executionId, execution);
      return;
    }

    execution.status = 'running';
    this.executions.set(executionId, execution);

    try {
      for (let i = 0; i < playbook.steps.length; i++) {
        const step = playbook.steps[i];
        execution.currentStep = i + 1;
        this.executions.set(executionId, execution);

        redactedLogger.log(
          `Executing step ${i + 1}/${playbook.steps.length}: ${step?.name ?? 'Unknown'}`,
          'IncidentResponsePlaybooksService'
        );

        try {
          if (!step) {
            throw new Error('Step is undefined');
          }
          const result = await this.executeStep(step);
          execution.results[step.id] = result;
        } catch (error) {
          execution.errors.push(
            `Step ${step?.name ?? 'Unknown'} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );

          if (step?.required === true) {
            execution.status = 'failed';
            this.executions.set(executionId, execution);
            return;
          }
        }

        // Небольшая пауза между шагами
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
      redactedLogger.log(
        `Completed execution of playbook: ${playbook.name}`,
        'IncidentResponsePlaybooksService'
      );
    } catch (error) {
      execution.status = 'failed';
      execution.errors.push(
        `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      redactedLogger.error(
        `Failed execution of playbook: ${playbook.name}`,
        error instanceof Error ? error.stack : 'Unknown error',
        'IncidentResponsePlaybooksService'
      );
    }

    this.executions.set(executionId, execution);
  }

  // Выполнение отдельного шага
  private async executeStep(step: PlaybookStep): Promise<unknown> {
    // Здесь должна быть реальная логика выполнения действий
    // Пока что это заглушка
    switch (step.action) {
      case 'isolate_system':
        return { status: 'isolated', services: ['api', 'database'] };

      case 'notify_team':
        return { status: 'notified', channels: ['slack', 'email'] };

      case 'create_backup':
        return { status: 'backup_created', size: '2.5GB' };

      case 'start_investigation':
        return { status: 'investigation_started', tools: ['logs', 'metrics'] };

      case 'scale_up':
        return { status: 'scaled_up', factor: 2 };

      case 'limit_traffic':
        return { status: 'traffic_limited', rate: 0.5 };

      case 'warm_cache':
        return { status: 'cache_warmed', patterns: ['user_profiles'] };

      default:
        return { status: 'unknown_action', action: step.action };
    }
  }

  // Получение выполнения по ID
  getExecution(id: string): IncidentExecution | null {
    return this.executions.get(id) ?? null;
  }

  // Получение всех выполнений
  getAllExecutions(): IncidentExecution[] {
    return Array.from(this.executions.values());
  }

  // Получение выполнений по playbook
  getExecutionsByPlaybook(playbookId: string): IncidentExecution[] {
    return Array.from(this.executions.values()).filter(
      e => e.playbookId === playbookId
    );
  }

  // Получение активных выполнений
  getActiveExecutions(): IncidentExecution[] {
    return Array.from(this.executions.values()).filter(
      e => e.status === 'running'
    );
  }

  // Остановка выполнения
  stopExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    execution.status = 'failed';
    execution.errors.push('Execution stopped manually');
    execution.completedAt = new Date();
    this.executions.set(executionId, execution);

    redactedLogger.log(
      `Stopped execution: ${executionId}`,
      'IncidentResponsePlaybooksService'
    );

    return true;
  }

  // Получение статистики
  getStatistics(): {
    totalPlaybooks: number;
    enabledPlaybooks: number;
    totalExecutions: number;
    activeExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
  } {
    const executions = Array.from(this.executions.values());

    return {
      totalPlaybooks: this.playbooks.size,
      enabledPlaybooks: Array.from(this.playbooks.values()).filter(
        p => p.enabled
      ).length,
      totalExecutions: executions.length,
      activeExecutions: executions.filter(e => e.status === 'running').length,
      successfulExecutions: executions.filter(e => e.status === 'completed')
        .length,
      failedExecutions: executions.filter(e => e.status === 'failed').length,
    };
  }
}
