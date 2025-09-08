import { Injectable } from '@nestjs/common';
import { RedactedLogger } from '../utils/redacted-logger';

export interface ScalingPolicy {
  id: string;
  name: string;
  type: 'cpu' | 'memory' | 'network' | 'custom';
  threshold: number;
  action: 'scale-up' | 'scale-down' | 'maintain';
  minInstances: number;
  maxInstances: number;
  currentInstances: number;
  cooldownPeriod: number; // в минутах
  lastScalingAction?: Date;
  enabled: boolean;
}

export interface TrafficPattern {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly' | 'holiday' | 'event';
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  daysOfWeek?: number[]; // 0-6 (воскресенье-суббота)
  date?: string; // для праздничных дней
  expectedTrafficMultiplier: number;
  scalingAdjustment: number;
}

export interface ScalingAction {
  id: string;
  policyId: string;
  action: 'scale-up' | 'scale-down';
  reason: string;
  fromInstances: number;
  toInstances: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface HolidayCalendar {
  id: string;
  name: string;
  region: 'RU' | 'BY';
  date: string;
  type: 'national' | 'religious' | 'commercial';
  trafficImpact: 'high' | 'medium' | 'low';
  scalingMultiplier: number;
}

@Injectable()
export class AutomatedScalingService {
  private readonly redactedLogger = new RedactedLogger(
    AutomatedScalingService.name
  );
  private readonly scalingPolicies = new Map<string, ScalingPolicy>();
  private readonly trafficPatterns = new Map<string, TrafficPattern>();
  private readonly scalingActions = new Map<string, ScalingAction>();
  private readonly holidayCalendar = new Map<string, HolidayCalendar>();

  constructor() {
    this.initializeScalingPolicies();
    this.initializeTrafficPatterns();
    this.initializeHolidayCalendar();
  }

  private initializeScalingPolicies(): void {
    const defaultPolicies: ScalingPolicy[] = [
      {
        id: 'cpu-scaling',
        name: 'CPU-based scaling',
        type: 'cpu',
        threshold: 80, // 80% CPU
        action: 'scale-up',
        minInstances: 2,
        maxInstances: 20,
        currentInstances: 3,
        cooldownPeriod: 5,
        enabled: true,
      },
      {
        id: 'memory-scaling',
        name: 'Memory-based scaling',
        type: 'memory',
        threshold: 85, // 85% Memory
        action: 'scale-up',
        minInstances: 2,
        maxInstances: 20,
        currentInstances: 3,
        cooldownPeriod: 5,
        enabled: true,
      },
      {
        id: 'network-scaling',
        name: 'Network-based scaling',
        type: 'network',
        threshold: 75, // 75% Network
        action: 'scale-up',
        minInstances: 2,
        maxInstances: 20,
        currentInstances: 3,
        cooldownPeriod: 3,
        enabled: true,
      },
    ];

    defaultPolicies.forEach(policy => {
      this.scalingPolicies.set(policy.id, policy);
    });
  }

  private initializeTrafficPatterns(): void {
    const patterns: TrafficPattern[] = [
      {
        id: 'morning-rush',
        name: 'Morning rush hour',
        type: 'daily',
        startTime: '08:00',
        endTime: '10:00',
        expectedTrafficMultiplier: 1.5,
        scalingAdjustment: 2,
      },
      {
        id: 'lunch-break',
        name: 'Lunch break traffic',
        type: 'daily',
        startTime: '12:00',
        endTime: '14:00',
        expectedTrafficMultiplier: 1.3,
        scalingAdjustment: 1,
      },
      {
        id: 'evening-peak',
        name: 'Evening peak',
        type: 'daily',
        startTime: '18:00',
        endTime: '21:00',
        expectedTrafficMultiplier: 1.8,
        scalingAdjustment: 3,
      },
      {
        id: 'weekend-traffic',
        name: 'Weekend traffic increase',
        type: 'weekly',
        startTime: '00:00',
        endTime: '23:59',
        daysOfWeek: [0, 6], // воскресенье и суббота
        expectedTrafficMultiplier: 1.2,
        scalingAdjustment: 1,
      },
    ];

    patterns.forEach(pattern => {
      this.trafficPatterns.set(pattern.id, pattern);
    });
  }

  private initializeHolidayCalendar(): void {
    const holidays: HolidayCalendar[] = [
      // Беларусь
      {
        id: 'by-new-year',
        name: 'Новый год',
        region: 'BY',
        date: '01-01',
        type: 'national',
        trafficImpact: 'high',
        scalingMultiplier: 2.0,
      },
      {
        id: 'by-independence-day',
        name: 'День независимости',
        region: 'BY',
        date: '07-03',
        type: 'national',
        trafficImpact: 'medium',
        scalingMultiplier: 1.5,
      },
      // Россия
      {
        id: 'ru-new-year',
        name: 'Новый год',
        region: 'RU',
        date: '01-01',
        type: 'national',
        trafficImpact: 'high',
        scalingMultiplier: 2.0,
      },
      {
        id: 'ru-victory-day',
        name: 'День Победы',
        region: 'RU',
        date: '05-09',
        type: 'national',
        trafficImpact: 'medium',
        scalingMultiplier: 1.3,
      },
      {
        id: 'ru-black-friday',
        name: 'Черная пятница',
        region: 'RU',
        date: '11-29',
        type: 'commercial',
        trafficImpact: 'high',
        scalingMultiplier: 2.5,
      },
    ];

    holidays.forEach(holiday => {
      this.holidayCalendar.set(holiday.id, holiday);
    });

    this.redactedLogger.log(
      'Automated scaling service initialized',
      'AutomatedScalingService'
    );
  }

  async evaluateScalingNeeds(currentMetrics: {
    cpu: number;
    memory: number;
    network: number;
    activeConnections: number;
  }): Promise<ScalingAction[]> {
    const actions: ScalingAction[] = [];

    for (const policy of this.scalingPolicies.values()) {
      if (!policy.enabled) continue;

      const shouldScale = await this.shouldTriggerScaling(
        policy,
        currentMetrics
      );
      if (shouldScale) {
        const action = await this.createScalingAction(policy, currentMetrics);
        if (action) {
          actions.push(action);
        }
      }
    }

    return actions;
  }

  private async shouldTriggerScaling(
    policy: ScalingPolicy,
    metrics: {
      cpu: number;
      memory: number;
      network: number;
      activeConnections: number;
    }
  ): Promise<boolean> {
    // Проверка cooldown периода
    if (policy.lastScalingAction) {
      const cooldownMs = policy.cooldownPeriod * 60 * 1000;
      const timeSinceLastAction =
        Date.now() - policy.lastScalingAction.getTime();
      if (timeSinceLastAction < cooldownMs) {
        return false;
      }
    }

    let currentValue: number;
    switch (policy.type) {
      case 'cpu':
        currentValue = metrics.cpu;
        break;
      case 'memory':
        currentValue = metrics.memory;
        break;
      case 'network':
        currentValue = metrics.network;
        break;
      default:
        return false;
    }

    // Проверка порога
    if (currentValue > policy.threshold) {
      return (
        policy.action === 'scale-up' &&
        policy.currentInstances < policy.maxInstances
      );
    } else if (currentValue < policy.threshold * 0.6) {
      // 60% от порога для scale-down
      return (
        policy.action === 'scale-down' &&
        policy.currentInstances > policy.minInstances
      );
    }

    return false;
  }

  private async createScalingAction(
    policy: ScalingPolicy,
    metrics: {
      cpu: number;
      memory: number;
      network: number;
      activeConnections: number;
    }
  ): Promise<ScalingAction | null> {
    const currentValue = this.getMetricValue(policy.type, metrics);
    const isScaleUp = currentValue > policy.threshold;

    if (isScaleUp && policy.currentInstances >= policy.maxInstances) {
      return null; // Достигнут максимум
    }

    if (!isScaleUp && policy.currentInstances <= policy.minInstances) {
      return null; // Достигнут минимум
    }

    const action: ScalingAction = {
      id: `scaling-${Date.now()}`,
      policyId: policy.id,
      action: isScaleUp ? 'scale-up' : 'scale-down',
      reason: `${policy.type.toUpperCase()} threshold exceeded: ${currentValue}% > ${policy.threshold}%`,
      fromInstances: policy.currentInstances,
      toInstances: isScaleUp
        ? policy.currentInstances + 1
        : policy.currentInstances - 1,
      timestamp: new Date(),
      success: false,
    };

    this.scalingActions.set(action.id, action);
    return action;
  }

  private getMetricValue(
    type: ScalingPolicy['type'],
    metrics: {
      cpu: number;
      memory: number;
      network: number;
      activeConnections: number;
    }
  ): number {
    switch (type) {
      case 'cpu':
        return metrics.cpu;
      case 'memory':
        return metrics.memory;
      case 'network':
        return metrics.network;
      default:
        return 0;
    }
  }

  async applyTrafficPatternScaling(): Promise<void> {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    const currentDay = now.getDay();

    for (const pattern of this.trafficPatterns.values()) {
      if (this.isPatternActive(pattern, currentTime, currentDay)) {
        await this.applyPatternScaling(pattern);
      }
    }
  }

  private isPatternActive(
    pattern: TrafficPattern,
    currentTime: string,
    currentDay: number
  ): boolean {
    if (pattern.type === 'daily') {
      return currentTime >= pattern.startTime && currentTime <= pattern.endTime;
    } else if (pattern.type === 'weekly' && pattern.daysOfWeek) {
      return (
        pattern.daysOfWeek.includes(currentDay) &&
        currentTime >= pattern.startTime &&
        currentTime <= pattern.endTime
      );
    }
    return false;
  }

  private async applyPatternScaling(pattern: TrafficPattern): Promise<void> {
    // Применяем масштабирование на основе паттерна трафика
    for (const policy of this.scalingPolicies.values()) {
      if (policy.enabled && policy.currentInstances < policy.maxInstances) {
        const newInstances = Math.min(
          policy.maxInstances,
          policy.currentInstances + pattern.scalingAdjustment
        );

        if (newInstances !== policy.currentInstances) {
          policy.currentInstances = newInstances;
          policy.lastScalingAction = new Date();

          this.redactedLogger.log(
            `Traffic pattern scaling applied`,
            'AutomatedScalingService',
            {
              pattern: pattern.name,
              policy: policy.name,
              instances: newInstances,
            }
          );
        }
      }
    }
  }

  async applyHolidayScaling(): Promise<void> {
    const now = new Date();
    const currentDate = `${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    for (const holiday of this.holidayCalendar.values()) {
      if (holiday.date === currentDate) {
        await this.applyHolidayScalingInternal(holiday);
      }
    }
  }

  private async applyHolidayScalingInternal(
    holiday: HolidayCalendar
  ): Promise<void> {
    for (const policy of this.scalingPolicies.values()) {
      if (policy.enabled) {
        const newInstances = Math.min(
          policy.maxInstances,
          Math.ceil(policy.currentInstances * holiday.scalingMultiplier)
        );

        if (newInstances !== policy.currentInstances) {
          policy.currentInstances = newInstances;
          policy.lastScalingAction = new Date();

          this.redactedLogger.log(
            `Holiday scaling applied`,
            'AutomatedScalingService',
            {
              holiday: holiday.name,
              region: holiday.region,
              policy: policy.name,
              instances: newInstances,
              multiplier: holiday.scalingMultiplier,
            }
          );
        }
      }
    }
  }

  async executeScalingAction(actionId: string): Promise<boolean> {
    const action = this.scalingActions.get(actionId);
    if (!action) {
      return false;
    }

    try {
      // Имитация выполнения масштабирования
      await new Promise(resolve =>
        setTimeout(resolve, 1000 + Math.random() * 2000)
      );

      action.success = true;

      // Обновляем политику
      const policy = this.scalingPolicies.get(action.policyId);
      if (policy) {
        policy.currentInstances = action.toInstances;
        policy.lastScalingAction = new Date();
      }

      this.redactedLogger.log(
        `Scaling action executed successfully`,
        'AutomatedScalingService',
        {
          action: action.action,
          from: action.fromInstances,
          to: action.toInstances,
          policy: action.policyId,
        }
      );

      return true;
    } catch (error) {
      action.success = false;
      action.error = error instanceof Error ? error.message : 'Unknown error';

      this.redactedLogger.errorWithData(
        `Scaling action failed`,
        {
          actionId,
          error: action.error,
        },
        'AutomatedScalingService'
      );

      return false;
    }
  }

  async getScalingPolicies(): Promise<ScalingPolicy[]> {
    return Array.from(this.scalingPolicies.values());
  }

  async getTrafficPatterns(): Promise<TrafficPattern[]> {
    return Array.from(this.trafficPatterns.values());
  }

  async getHolidayCalendar(): Promise<HolidayCalendar[]> {
    return Array.from(this.holidayCalendar.values());
  }

  async getScalingActions(): Promise<ScalingAction[]> {
    return Array.from(this.scalingActions.values());
  }

  async updateScalingPolicy(
    policyId: string,
    updates: Partial<Omit<ScalingPolicy, 'id'>>
  ): Promise<boolean> {
    const policy = this.scalingPolicies.get(policyId);
    if (!policy) {
      return false;
    }

    Object.assign(policy, updates);
    return true;
  }

  async addTrafficPattern(
    pattern: Omit<TrafficPattern, 'id'>
  ): Promise<string> {
    const patternId = `pattern-${Date.now()}`;
    const newPattern: TrafficPattern = {
      ...pattern,
      id: patternId,
    };

    this.trafficPatterns.set(patternId, newPattern);
    return patternId;
  }

  async addHoliday(holiday: Omit<HolidayCalendar, 'id'>): Promise<string> {
    const holidayId = `holiday-${Date.now()}`;
    const newHoliday: HolidayCalendar = {
      ...holiday,
      id: holidayId,
    };

    this.holidayCalendar.set(holidayId, newHoliday);
    return holidayId;
  }

  /**
   * Масштабирование на основе CPU
   */
  scaleBasedOnCPU(
    serviceId: string,
    cpuUsage: number
  ): {
    serviceId: string;
    action: 'scale_up' | 'scale_down' | 'no_action';
    reason: string;
    currentInstances: number;
    targetInstances: number;
  } {
    const policy = this.scalingPolicies.get('cpu-scaling');
    if (!policy) {
      return {
        serviceId,
        action: 'no_action',
        reason: 'CPU scaling policy not found',
        currentInstances: 0,
        targetInstances: 0,
      };
    }

    let action: 'scale_up' | 'scale_down' | 'no_action' = 'no_action';
    let reason = 'CPU usage within normal range';
    let targetInstances = policy.currentInstances;

    if (
      cpuUsage > policy.threshold &&
      policy.currentInstances < policy.maxInstances
    ) {
      action = 'scale_up';
      reason = `CPU usage ${cpuUsage}% exceeds threshold ${policy.threshold}%`;
      targetInstances = Math.min(
        policy.currentInstances + 1,
        policy.maxInstances
      );
    } else if (
      cpuUsage < policy.threshold * 0.5 &&
      policy.currentInstances > policy.minInstances
    ) {
      action = 'scale_down';
      reason = `CPU usage ${cpuUsage}% below 50% of threshold ${policy.threshold}%`;
      targetInstances = Math.max(
        policy.currentInstances - 1,
        policy.minInstances
      );
    }

    return {
      serviceId,
      action,
      reason,
      currentInstances: policy.currentInstances,
      targetInstances,
    };
  }

  /**
   * Масштабирование на основе памяти
   */
  scaleBasedOnMemory(
    serviceId: string,
    memoryUsage: number
  ): {
    serviceId: string;
    action: 'scale_up' | 'scale_down' | 'no_action';
    reason: string;
    currentInstances: number;
    targetInstances: number;
  } {
    const policy = this.scalingPolicies.get('memory-scaling');
    if (!policy) {
      return {
        serviceId,
        action: 'no_action',
        reason: 'Memory scaling policy not found',
        currentInstances: 0,
        targetInstances: 0,
      };
    }

    let action: 'scale_up' | 'scale_down' | 'no_action' = 'no_action';
    let reason = 'Memory usage within normal range';
    let targetInstances = policy.currentInstances;

    if (
      memoryUsage > policy.threshold &&
      policy.currentInstances < policy.maxInstances
    ) {
      action = 'scale_up';
      reason = `Memory usage ${memoryUsage}% exceeds threshold ${policy.threshold}%`;
      targetInstances = Math.min(
        policy.currentInstances + 1,
        policy.maxInstances
      );
    } else if (
      memoryUsage < policy.threshold * 0.5 &&
      policy.currentInstances > policy.minInstances
    ) {
      action = 'scale_down';
      reason = `Memory usage ${memoryUsage}% below 50% of threshold ${policy.threshold}%`;
      targetInstances = Math.max(
        policy.currentInstances - 1,
        policy.minInstances
      );
    }

    return {
      serviceId,
      action,
      reason,
      currentInstances: policy.currentInstances,
      targetInstances,
    };
  }

  /**
   * Масштабирование на основе сети
   */
  scaleBasedOnNetwork(
    serviceId: string,
    networkUsage: number
  ): {
    serviceId: string;
    action: 'scale_up' | 'scale_down' | 'no_action';
    reason: string;
    currentInstances: number;
    targetInstances: number;
  } {
    const policy = this.scalingPolicies.get('network-scaling');
    if (!policy) {
      return {
        serviceId,
        action: 'no_action',
        reason: 'Network scaling policy not found',
        currentInstances: 0,
        targetInstances: 0,
      };
    }

    let action: 'scale_up' | 'scale_down' | 'no_action' = 'no_action';
    let reason = 'Network usage within normal range';
    let targetInstances = policy.currentInstances;

    if (
      networkUsage > policy.threshold &&
      policy.currentInstances < policy.maxInstances
    ) {
      action = 'scale_up';
      reason = `Network usage ${networkUsage}% exceeds threshold ${policy.threshold}%`;
      targetInstances = Math.min(
        policy.currentInstances + 1,
        policy.maxInstances
      );
    } else if (
      networkUsage < policy.threshold * 0.5 &&
      policy.currentInstances > policy.minInstances
    ) {
      action = 'scale_down';
      reason = `Network usage ${networkUsage}% below 50% of threshold ${policy.threshold}%`;
      targetInstances = Math.max(
        policy.currentInstances - 1,
        policy.minInstances
      );
    }

    return {
      serviceId,
      action,
      reason,
      currentInstances: policy.currentInstances,
      targetInstances,
    };
  }

  /**
   * Применение праздничного календаря для масштабирования
   */
  applyHolidayCalendarScaling(
    country: string,
    date: string
  ): {
    country: string;
    date: string;
    dayType: 'holiday' | 'weekend' | 'workday';
    scalingMultiplier: number;
    reason: string;
  } {
    const holiday = Array.from(this.holidayCalendar.values()).find(
      h => h.region === country && h.date === date
    );

    if (holiday) {
      return {
        country,
        date,
        dayType: 'holiday',
        scalingMultiplier: holiday.scalingMultiplier,
        reason: `Holiday: ${holiday.name}`,
      };
    }

    // Проверка на выходные (упрощенная логика)
    const dayOfWeek = new Date(date).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        country,
        date,
        dayType: 'weekend',
        scalingMultiplier: 0.7,
        reason: 'Weekend - reduced traffic expected',
      };
    }

    return {
      country,
      date,
      dayType: 'workday',
      scalingMultiplier: 1.0,
      reason: 'Regular workday',
    };
  }
}
