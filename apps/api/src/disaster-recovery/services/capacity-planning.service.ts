import { Injectable, Logger } from '@nestjs/common';
import type {
  ICapacityPlan,
  IScalingAction,
} from '../interfaces/disaster-recovery.interface';

@Injectable()
export class CapacityPlanningService {
  private readonly logger = new Logger(CapacityPlanningService.name);
  private readonly capacityPlans = new Map<string, ICapacityPlan>();
  private readonly scalingActions = new Map<string, IScalingAction>();
  // private readonly capacityMetrics = new Map<string, ICapacityMetrics>(); // Временно закомментировано

  constructor() {
    this.initializeDefaultCapacityPlans();
  }

  /**
   * Инициализация базовых планов мощностей
   */
  private initializeDefaultCapacityPlans(): void {
    const defaultPlans: ICapacityPlan[] = [
      {
        id: 'plan-minsk-primary-q1-2024',
        dcId: 'dc-minsk-primary',
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-03-31'),
        },
        currentCapacity: {
          cpu: 1000,
          memory: 8192,
          storage: 100000,
          network: 10000,
        },
        projectedDemand: {
          cpu: 1200,
          memory: 10240,
          storage: 120000,
          network: 12000,
        },
        scalingActions: [
          {
            id: 'action-1',
            type: 'scale-up',
            resource: 'cpu',
            amount: 200,
            priority: 'high',
            estimatedCost: 5000,
            implementationDate: new Date('2024-02-01'),
            status: 'planned',
          },
        ],
        status: 'approved',
      },
      {
        id: 'plan-moscow-primary-q1-2024',
        dcId: 'dc-moscow-primary',
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-03-31'),
        },
        currentCapacity: {
          cpu: 1200,
          memory: 10240,
          storage: 120000,
          network: 12000,
        },
        projectedDemand: {
          cpu: 1500,
          memory: 12288,
          storage: 150000,
          network: 15000,
        },
        scalingActions: [
          {
            id: 'action-2',
            type: 'scale-out',
            resource: 'storage',
            amount: 30000,
            priority: 'medium',
            estimatedCost: 8000,
            implementationDate: new Date('2024-02-15'),
            status: 'planned',
          },
        ],
        status: 'draft',
      },
    ];

    defaultPlans.forEach(plan => this.capacityPlans.set(plan.id, plan));
    this.logger.log(
      `Initialized ${defaultPlans.length} default capacity plans`
    );
  }

  /**
   * Получение всех планов мощностей
   */
  async getAllCapacityPlans(): Promise<ICapacityPlan[]> {
    return Array.from(this.capacityPlans.values());
  }

  /**
   * Получение плана мощностей по ID
   */
  async getCapacityPlanById(id: string): Promise<ICapacityPlan | null> {
    return this.capacityPlans.get(id) ?? null;
  }

  /**
   * Создание нового плана мощностей
   */
  async createCapacityPlan(createDto: {
    dcId: string;
    period: { start: Date; end: Date };
    currentCapacity: {
      cpu: number;
      memory: number;
      storage: number;
      network: number;
    };
    projectedDemand: {
      cpu: number;
      memory: number;
      storage: number;
      network: number;
    };
  }): Promise<ICapacityPlan> {
    const id = `plan-${Date.now()}`;
    const plan: ICapacityPlan = {
      id,
      dcId: createDto.dcId,
      period: createDto.period,
      currentCapacity: createDto.currentCapacity,
      projectedDemand: createDto.projectedDemand,
      scalingActions: [],
      status: 'draft',
    };

    this.capacityPlans.set(id, plan);
    this.logger.log(`Created capacity plan: ${id}`);

    return plan;
  }

  /**
   * Обновление плана мощностей
   */
  async updateCapacityPlan(
    id: string,
    updateDto: Partial<ICapacityPlan>
  ): Promise<ICapacityPlan | null> {
    const plan = this.capacityPlans.get(id);
    if (!plan) {
      return null;
    }

    const updatedPlan: ICapacityPlan = {
      ...plan,
      dcId: updateDto.dcId ?? plan.dcId,
      period: updateDto.period ?? plan.period,
      currentCapacity: updateDto.currentCapacity ?? plan.currentCapacity,
      projectedDemand: updateDto.projectedDemand ?? plan.projectedDemand,
      status: updateDto.status ?? plan.status,
    };

    this.capacityPlans.set(id, updatedPlan);
    this.logger.log(`Updated capacity plan: ${id}`);

    return updatedPlan;
  }

  /**
   * Удаление плана мощностей
   */
  async deleteCapacityPlan(id: string): Promise<boolean> {
    const deleted = this.capacityPlans.delete(id);
    if (deleted) {
      this.logger.log(`Deleted capacity plan: ${id}`);
    }
    return deleted;
  }

  /**
   * Добавление действия масштабирования к плану
   */
  async addScalingAction(
    planId: string,
    action: Omit<IScalingAction, 'id'>
  ): Promise<IScalingAction | null> {
    const plan = this.capacityPlans.get(planId);
    if (!plan) {
      return null;
    }

    const newAction: IScalingAction = {
      id: `action-${Date.now()}`,
      ...action,
    };

    plan.scalingActions.push(newAction);
    this.capacityPlans.set(planId, plan);

    this.logger.log(
      `Added scaling action to plan ${planId}: ${action.type} ${action.resource}`
    );

    return newAction;
  }

  /**
   * Обновление статуса действия масштабирования
   */
  async updateScalingActionStatus(
    planId: string,
    actionId: string,
    status: IScalingAction['status']
  ): Promise<IScalingAction | null> {
    const plan = this.capacityPlans.get(planId);
    if (!plan) {
      return null;
    }

    const action = plan.scalingActions.find(a => a.id === actionId);
    if (!action) {
      return null;
    }

    action.status = status;
    this.capacityPlans.set(planId, plan);

    this.logger.log(
      `Updated scaling action status in plan ${planId}: ${actionId} -> ${status}`
    );

    return action;
  }

  /**
   * Анализ потребности в мощностях
   */
  async analyzeCapacityNeeds(dcId: string): Promise<{
    currentCapacity: ICapacityPlan['currentCapacity'];
    projectedDemand: ICapacityPlan['projectedDemand'];
    capacityGap: {
      cpu: number;
      memory: number;
      storage: number;
      network: number;
    };
    recommendations: Array<{
      _resource: string;
      action: 'scale-up' | 'scale-down' | 'scale-out' | 'scale-in';
      amount: number;
      priority: 'low' | 'medium' | 'high' | 'critical';
      estimatedCost: number;
    }>;
  }> {
    this.logger.log(`Analyzing capacity needs for DC: ${dcId}`);

    // В реальной реализации здесь был бы анализ исторических данных и прогнозирование
    const currentCapacity = {
      cpu: 1000,
      memory: 8192,
      storage: 100000,
      network: 10000,
    };

    const projectedDemand = {
      cpu: Math.round(currentCapacity.cpu * (1 + Math.random() * 0.5)), // +0-50%
      memory: Math.round(currentCapacity.memory * (1 + Math.random() * 0.3)), // +0-30%
      storage: Math.round(currentCapacity.storage * (1 + Math.random() * 0.4)), // +0-40%
      network: Math.round(currentCapacity.network * (1 + Math.random() * 0.2)), // +0-20%
    };

    const capacityGap = {
      cpu: Math.max(0, projectedDemand.cpu - currentCapacity.cpu),
      memory: Math.max(0, projectedDemand.memory - currentCapacity.memory),
      storage: Math.max(0, projectedDemand.storage - currentCapacity.storage),
      network: Math.max(0, projectedDemand.network - currentCapacity.network),
    };

    const recommendations = [];

    if (capacityGap.cpu > 0) {
      recommendations.push({
        resource: 'cpu',
        action: 'scale-up' as
          | 'scale-up'
          | 'scale-down'
          | 'scale-out'
          | 'scale-in',
        amount: capacityGap.cpu,
        priority: (capacityGap.cpu > 200
          ? 'critical'
          : capacityGap.cpu > 100
            ? 'high'
            : 'medium') as 'high' | 'low' | 'medium' | 'critical',
        estimatedCost: capacityGap.cpu * 25, // 25 за CPU unit
      });
    }

    if (capacityGap.memory > 0) {
      recommendations.push({
        resource: 'memory',
        action: 'scale-up' as
          | 'scale-up'
          | 'scale-down'
          | 'scale-out'
          | 'scale-in',
        amount: capacityGap.memory,
        priority: (capacityGap.memory > 2048
          ? 'critical'
          : capacityGap.memory > 100
            ? 'high'
            : 'medium') as 'high' | 'low' | 'medium' | 'critical',
        estimatedCost: capacityGap.memory * 2, // 2 за GB
      });
    }

    if (capacityGap.storage > 0) {
      recommendations.push({
        resource: 'storage',
        action: 'scale-out' as
          | 'scale-up'
          | 'scale-down'
          | 'scale-out'
          | 'scale-in',
        amount: capacityGap.storage,
        priority: (capacityGap.storage > 50000
          ? 'critical'
          : capacityGap.storage > 25000
            ? 'high'
            : 'medium') as 'high' | 'low' | 'medium' | 'critical',
        estimatedCost: capacityGap.storage * 0.1, // 0.1 за GB
      });
    }

    if (capacityGap.network > 0) {
      recommendations.push({
        resource: 'network',
        action: 'scale-up' as
          | 'scale-up'
          | 'scale-down'
          | 'scale-out'
          | 'scale-in',
        amount: capacityGap.network,
        priority: (capacityGap.network > 5000
          ? 'critical'
          : capacityGap.network > 2500
            ? 'high'
            : 'medium') as 'high' | 'low' | 'medium' | 'critical',
        estimatedCost: capacityGap.network * 0.5, // 0.5 за Mbps
      });
    }

    return {
      currentCapacity,
      projectedDemand,
      capacityGap,
      recommendations: recommendations.map(rec => ({
        ...rec,
        _resource: rec.resource,
      })),
    };
  }

  /**
   * Стресс-тестирование мощностей
   */
  async performStressTest(
    dcId: string,
    testScenario: {
      cpuLoad: number; // 0-100%
      memoryLoad: number; // 0-100%
      storageLoad: number; // 0-100%
      networkLoad: number; // 0-100%
      duration: number; // в минутах
    }
  ): Promise<{
    success: boolean;
    results: {
      cpu: { maxUsage: number; averageUsage: number; bottlenecks: string[] };
      memory: { maxUsage: number; averageUsage: number; bottlenecks: string[] };
      storage: {
        maxUsage: number;
        averageUsage: number;
        bottlenecks: string[];
      };
      network: {
        maxUsage: number;
        averageUsage: number;
        bottlenecks: string[];
      };
    };
    recommendations: string[];
    testDuration: number;
  }> {
    this.logger.log(
      `Performing stress test for DC: ${dcId} with scenario: ${JSON.stringify(testScenario)}`
    );

    const startTime = Date.now();

    // Симуляция стресс-теста (уменьшаем время для тестов)
    const duration = testScenario.duration;
    await this.delay(Math.min(duration * 1000, 100)); // максимум 100мс для тестов

    const testDuration = Date.now() - startTime;

    // Симуляция результатов теста
    const results = {
      cpu: {
        maxUsage: Math.min(
          100,
          testScenario.cpuLoad * (1 + Math.random() * 0.2)
        ),
        averageUsage: testScenario.cpuLoad,
        bottlenecks:
          testScenario.cpuLoad > 80 ? ['CPU utilization exceeded 80%'] : [],
      },
      memory: {
        maxUsage: Math.min(
          100,
          testScenario.memoryLoad * (1 + Math.random() * 0.15)
        ),
        averageUsage: testScenario.memoryLoad,
        bottlenecks:
          testScenario.memoryLoad > 85
            ? ['Memory usage approaching limits']
            : [],
      },
      storage: {
        maxUsage: Math.min(
          100,
          testScenario.storageLoad * (1 + Math.random() * 0.1)
        ),
        averageUsage: testScenario.storageLoad,
        bottlenecks:
          testScenario.storageLoad > 90 ? ['Storage capacity critical'] : [],
      },
      network: {
        maxUsage: Math.min(
          100,
          testScenario.networkLoad * (1 + Math.random() * 0.25)
        ),
        averageUsage: testScenario.networkLoad,
        bottlenecks:
          testScenario.networkLoad > 75
            ? ['Network bandwidth constraints']
            : [],
      },
    };

    const recommendations: string[] = [];

    if (results.cpu.maxUsage > 90) {
      recommendations.push('Critical: Immediate CPU scaling required');
    } else if (results.cpu.maxUsage > 80) {
      recommendations.push('High: Plan CPU scaling within 1 month');
    }

    if (results.memory.maxUsage > 95) {
      recommendations.push('Critical: Immediate memory scaling required');
    } else if (results.memory.maxUsage > 85) {
      recommendations.push('High: Plan memory scaling within 2 weeks');
    }

    if (results.storage.maxUsage > 95) {
      recommendations.push('Critical: Immediate storage scaling required');
    } else if (results.storage.maxUsage > 90) {
      recommendations.push('High: Plan storage scaling within 1 month');
    }

    if (results.network.maxUsage > 90) {
      recommendations.push('Critical: Immediate network scaling required');
    } else if (results.network.maxUsage > 75) {
      recommendations.push('Medium: Monitor network usage and plan scaling');
    }

    const success =
      recommendations.filter(r => r.includes('Critical')).length === 0;

    return {
      success,
      results,
      recommendations,
      testDuration,
    };
  }

  /**
   * Получение планов по дата-центру
   */
  async findPlansByDataCenter(dcId: string): Promise<ICapacityPlan[]> {
    return Array.from(this.capacityPlans.values()).filter(
      plan => plan.dcId === dcId
    );
  }

  /**
   * Получение планов по статусу
   */
  async findPlansByStatus(
    status: ICapacityPlan['status']
  ): Promise<ICapacityPlan[]> {
    return Array.from(this.capacityPlans.values()).filter(
      plan => plan.status === status
    );
  }

  /**
   * Получение планов по периоду
   */
  async findPlansByPeriod(start: Date, end: Date): Promise<ICapacityPlan[]> {
    return Array.from(this.capacityPlans.values()).filter(
      plan => plan.period.start >= start && plan.period.end <= end
    );
  }

  /**
   * Получение истории масштабирования
   */
  async getScalingHistory(): Promise<Record<string, unknown>[]> {
    return []; // This method is not used in the new_code, so returning an empty array.
  }

  /**
   * Анализ текущей мощности
   */
  analyzeCurrentCapacity(datacenterId: string): {
    datacenterId: string;
    cpu: number;
    memory: number;
    storage: number;
    network: number;
  } {
    return {
      datacenterId,
      cpu: 1000,
      memory: 8192,
      storage: 100000,
      network: 10000,
    };
  }

  /**
   * Создание плана масштабирования
   */
  createScalingPlan(datacenterId: string): {
    datacenterId: string;
    recommendations: string[];
    priority: 'immediate' | 'short_term' | 'long_term';
  } {
    return {
      datacenterId,
      recommendations: ['Scale CPU by 200 units', 'Add 2TB storage'],
      priority: 'short_term',
    };
  }

  /**
   * Установка базовых показателей производительности
   */
  setPerformanceBaseline(
    datacenterId: string,
    metrics: {
      cpu: number;
      memory: number;
      storage: number;
      network: number;
    }
  ): {
    datacenterId: string;
    cpu: number;
    memory: number;
    storage: number;
    network: number;
  } {
    return {
      datacenterId,
      ...metrics,
    };
  }

  /**
   * Получение статистики планирования мощностей
   */
  async getCapacityPlanningStatistics(): Promise<{
    totalPlans: number;
    draftPlans: number;
    approvedPlans: number;
    implementedPlans: number;
    reviewedPlans: number;
    totalScalingActions: number;
    averageCostPerPlan: number;
    lastUpdated?: Date;
  }> {
    const plans = Array.from(this.capacityPlans.values());
    const actions = Array.from(this.scalingActions.values());

    const totalPlans = plans.length;
    const draftPlans = plans.filter(plan => plan.status === 'draft').length;
    const approvedPlans = plans.filter(
      plan => plan.status === 'approved'
    ).length;
    const implementedPlans = plans.filter(
      plan => plan.status === 'implemented'
    ).length;
    const reviewedPlans = plans.filter(
      plan => plan.status === 'reviewed'
    ).length;
    const totalScalingActions = actions.length;

    const totalCost = plans.reduce((sum, plan) => {
      const planCost = plan.scalingActions.reduce(
        (actionSum, action) => actionSum + action.estimatedCost,
        0
      );
      return sum + planCost;
    }, 0);

    const averageCostPerPlan = totalPlans > 0 ? totalCost / totalPlans : 0;
    const lastUpdated =
      plans.length > 0
        ? new Date(Math.max(...plans.map(p => p.period.end.getTime())))
        : undefined;

    return {
      totalPlans,
      draftPlans,
      approvedPlans,
      implementedPlans,
      reviewedPlans,
      totalScalingActions,
      averageCostPerPlan,
      ...(lastUpdated && { lastUpdated }),
    };
  }

  /**
   * Задержка для симуляции
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve =>
      (
        globalThis as unknown as {
          setTimeout: (fn: () => void, ms: number) => void;
        }
      ).setTimeout(resolve, ms)
    );
  }
}
