import { Injectable } from '@nestjs/common';
import { RedactedLogger } from '../utils/redacted-logger';

export interface BillingPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'closed' | 'pending';
  totalCost: number;
  currency: 'BYN' | 'RUB' | 'USD';
  exchangeRate?: number; // курс к основной валюте
}

export interface ResourceCost {
  id: string;
  resourceId: string;
  resourceType: 'cpu' | 'memory' | 'storage' | 'bandwidth' | 'service';
  providerId: string;
  billingPeriodId: string;
  usage: number;
  unit: string;
  unitPrice: number;
  currency: 'BYN' | 'RUB' | 'USD';
  totalCost: number;
  timestamp: Date;
}

export interface CostAlert {
  id: string;
  type:
    | 'budget-exceeded'
    | 'unusual-spending'
    | 'currency-fluctuation'
    | 'resource-optimization';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  _resourceId?: string;
  currentCost: number;
  threshold: number;
  currency: 'BYN' | 'RUB' | 'USD';
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
}

export interface Budget {
  id: string;
  name: string;
  amount: number;
  currency: 'BYN' | 'RUB' | 'USD';
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  spent: number;
  remaining: number;
  alerts: {
    warning: number; // процент для предупреждения
    critical: number; // процент для критического алерта
  };
  enabled: boolean;
}

export interface CurrencyRate {
  from: 'BYN' | 'RUB' | 'USD';
  to: 'BYN' | 'RUB' | 'USD';
  rate: number;
  timestamp: Date;
  source: 'central-bank' | 'commercial' | 'manual';
}

export interface CostOptimizationSuggestion {
  id: string;
  type:
    | 'resource-downsize'
    | 'provider-migration'
    | 'reserved-instance'
    | 'storage-optimization';
  priority: 'low' | 'medium' | 'high';
  estimatedSavings: number;
  currency: 'BYN' | 'RUB' | 'USD';
  implementationEffort: 'low' | 'medium' | 'high';
  description: string;
  resources: string[];
  createdAt: Date;
}

@Injectable()
export class CostManagementService {
  private readonly redactedLogger = new RedactedLogger(
    CostManagementService.name
  );
  private readonly billingPeriods = new Map<string, BillingPeriod>();
  private readonly resourceCosts = new Map<string, ResourceCost>();
  private readonly costAlerts = new Map<string, CostAlert>();
  private readonly budgets = new Map<string, Budget>();
  private readonly currencyRates = new Map<string, CurrencyRate>();

  constructor() {
    this.initializeBudgets();
    this.initializeCurrencyRates();
  }

  private initializeBudgets(): void {
    const defaultBudgets: Budget[] = [
      {
        id: 'monthly-main',
        name: 'Основной месячный бюджет',
        amount: 1000,
        currency: 'BYN',
        period: 'monthly',
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        endDate: new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          0
        ),
        spent: 0,
        remaining: 1000,
        alerts: {
          warning: 80, // 80% от бюджета
          critical: 95, // 95% от бюджета
        },
        enabled: true,
      },
      {
        id: 'quarterly-infrastructure',
        name: 'Квартальный бюджет инфраструктуры',
        amount: 5000,
        currency: 'RUB',
        period: 'quarterly',
        startDate: new Date(
          new Date().getFullYear(),
          Math.floor(new Date().getMonth() / 3) * 3,
          1
        ),
        endDate: new Date(
          new Date().getFullYear(),
          Math.floor(new Date().getMonth() / 3) * 3 + 3,
          0
        ),
        spent: 0,
        remaining: 5000,
        alerts: {
          warning: 75,
          critical: 90,
        },
        enabled: true,
      },
    ];

    defaultBudgets.forEach(budget => {
      this.budgets.set(budget.id, budget);
    });
  }

  private initializeCurrencyRates(): void {
    const now = new Date();
    const defaultRates: CurrencyRate[] = [
      {
        from: 'BYN',
        to: 'USD',
        rate: 0.31, // 1 BYN = 0.31 USD
        timestamp: now,
        source: 'central-bank',
      },
      {
        from: 'USD',
        to: 'BYN',
        rate: 3.23, // 1 USD = 3.23 BYN
        timestamp: now,
        source: 'central-bank',
      },
      {
        from: 'RUB',
        to: 'USD',
        rate: 0.011, // 1 RUB = 0.011 USD
        timestamp: now,
        source: 'central-bank',
      },
      {
        from: 'USD',
        to: 'RUB',
        rate: 91.5, // 1 USD = 91.5 RUB
        timestamp: now,
        source: 'central-bank',
      },
      {
        from: 'BYN',
        to: 'RUB',
        rate: 28.3, // 1 BYN = 28.3 RUB
        timestamp: now,
        source: 'central-bank',
      },
      {
        from: 'RUB',
        to: 'BYN',
        rate: 0.035, // 1 RUB = 0.035 BYN
        timestamp: now,
        source: 'central-bank',
      },
    ];

    defaultRates.forEach(rate => {
      const key = `${rate.from}-${rate.to}`;
      this.currencyRates.set(key, rate);
    });
  }

  async createBillingPeriod(
    startDate: Date,
    endDate: Date,
    currency: 'BYN' | 'RUB' | 'USD'
  ): Promise<string> {
    const periodId = `period-${Date.now()}`;
    const period: BillingPeriod = {
      id: periodId,
      startDate,
      endDate,
      status: 'active',
      totalCost: 0,
      currency,
    };

    this.billingPeriods.set(periodId, period);

    this.redactedLogger.log(`Billing period created`, 'CostManagementService', {
      periodId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      currency,
    });

    return periodId;
  }

  async recordResourceCost(
    cost: Omit<ResourceCost, 'id' | 'timestamp' | 'totalCost'>
  ): Promise<string> {
    const costId = `cost-${Date.now()}`;
    const totalCost = cost.usage * cost.unitPrice;

    const fullCost: ResourceCost = {
      ...cost,
      id: costId,
      totalCost,
      timestamp: new Date(),
    };

    this.resourceCosts.set(costId, fullCost);

    // Обновляем общую стоимость в периоде биллинга
    await this.updateBillingPeriodCost(
      cost.billingPeriodId,
      totalCost,
      cost.currency
    );

    // Проверяем бюджеты
    await this.checkBudgetLimits(cost.providerId, totalCost, cost.currency);

    return costId;
  }

  private async updateBillingPeriodCost(
    periodId: string,
    cost: number,
    currency: 'BYN' | 'RUB' | 'USD'
  ): Promise<void> {
    const period = this.billingPeriods.get(periodId);
    if (!period) return;

    // Конвертируем валюту если нужно
    if (period.currency !== currency) {
      const convertedCost = await this.convertCurrencyInternal(
        cost,
        currency,
        period.currency
      );
      period.totalCost += convertedCost;
    } else {
      period.totalCost += cost;
    }
  }

  private async convertCurrencyInternal(
    amount: number,
    from: 'BYN' | 'RUB' | 'USD',
    to: 'BYN' | 'RUB' | 'USD'
  ): Promise<number> {
    if (from === to) return amount;

    const rateKey = `${from}-${to}`;
    const rate = this.currencyRates.get(rateKey);

    if (rate) {
      return amount * rate.rate;
    }

    // Если нет прямого курса, конвертируем через USD
    if (from !== 'USD' && to !== 'USD') {
      const toUsd = await this.convertCurrencyInternal(amount, from, 'USD');
      return await this.convertCurrencyInternal(toUsd, 'USD', to);
    }

    return amount; // Fallback
  }

  private async checkBudgetLimits(
    _providerId: string,
    cost: number,
    currency: 'BYN' | 'RUB' | 'USD'
  ): Promise<void> {
    for (const budget of this.budgets.values()) {
      if (!budget.enabled) continue;

      // Конвертируем стоимость в валюту бюджета
      const convertedCost = await this.convertCurrencyInternal(
        cost,
        currency,
        budget.currency
      );
      budget.spent += convertedCost;
      budget.remaining = budget.amount - budget.spent;

      // Проверяем алерты
      const spentPercentage = (budget.spent / budget.amount) * 100;

      if (spentPercentage >= budget.alerts.critical) {
        await this.createCostAlert(
          'budget-exceeded',
          'critical',
          budget,
          spentPercentage
        );
      } else if (spentPercentage >= budget.alerts.warning) {
        await this.createCostAlert(
          'budget-exceeded',
          'high',
          budget,
          spentPercentage
        );
      }
    }
  }

  private async createCostAlert(
    type: CostAlert['type'],
    severity: CostAlert['severity'],
    budget: Budget,
    spentPercentage: number
  ): Promise<void> {
    const alert: CostAlert = {
      id: `alert-${Date.now()}`,
      type,
      severity,
      message: `Бюджет "${budget.name}" превышен на ${spentPercentage.toFixed(1)}%`,
      currentCost: budget.spent,
      threshold: budget.amount,
      currency: budget.currency,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.costAlerts.set(alert.id, alert);

    this.redactedLogger.log(`Cost alert created`, 'CostManagementService', {
      alertId: alert.id,
      budget: budget.name,
      spentPercentage: spentPercentage.toFixed(1),
      severity,
    });
  }

  async updateCurrencyRate(
    from: 'BYN' | 'RUB' | 'USD',
    to: 'BYN' | 'RUB' | 'USD',
    rate: number,
    source: CurrencyRate['source'] = 'manual'
  ): Promise<void> {
    const rateKey = `${from}-${to}`;
    const currencyRate: CurrencyRate = {
      from,
      to,
      rate,
      timestamp: new Date(),
      source,
    };

    this.currencyRates.set(rateKey, currencyRate);

    // Обновляем обратный курс
    const reverseKey = `${to}-${from}`;
    const reverseRate: CurrencyRate = {
      from: to,
      to: from,
      rate: 1 / rate,
      timestamp: new Date(),
      source,
    };

    this.currencyRates.set(reverseKey, reverseRate);

    this.redactedLogger.log(`Currency rate updated`, 'CostManagementService', {
      from,
      to,
      rate,
      source,
    });
  }

  async getCostAnalysis(
    periodId: string,
    groupBy: 'resource' | 'provider' | 'type' = 'resource'
  ): Promise<{
    totalCost: number;
    currency: string;
    breakdown: Array<{
      key: string;
      cost: number;
      percentage: number;
    }>;
  }> {
    const period = this.billingPeriods.get(periodId);
    if (!period) {
      throw new Error('Billing period not found');
    }

    const costs = Array.from(this.resourceCosts.values()).filter(
      cost => cost.billingPeriodId === periodId
    );

    const totalCost = period.totalCost;
    const breakdown = new Map<string, number>();

    costs.forEach(cost => {
      let key: string;
      switch (groupBy) {
        case 'resource':
          key = cost.resourceId;
          break;
        case 'provider':
          key = cost.providerId;
          break;
        case 'type':
          key = cost.resourceType;
          break;
        default:
          key = cost.resourceId;
      }

      const currentCost = breakdown.get(key) ?? 0;
      breakdown.set(key, currentCost + cost.totalCost);
    });

    const breakdownArray = Array.from(breakdown.entries())
      .map(([key, cost]) => ({
        key,
        cost,
        percentage: (cost / totalCost) * 100,
      }))
      .sort((a, b) => b.cost - a.cost);

    return {
      totalCost,
      currency: period.currency,
      breakdown: breakdownArray,
    };
  }

  async getCostOptimizationSuggestions(): Promise<
    CostOptimizationSuggestion[]
  > {
    const suggestions: CostOptimizationSuggestion[] = [];

    // Анализируем использование ресурсов и предлагаем оптимизации
    const resourceUsage = await this.analyzeResourceUsage();

    // Предложения по оптимизации CPU
    if (resourceUsage.cpu.average < 30) {
      suggestions.push({
        id: `suggestion-${Date.now()}`,
        type: 'resource-downsize',
        priority: 'medium',
        estimatedSavings: resourceUsage.cpu.potentialSavings,
        currency: 'BYN',
        implementationEffort: 'low',
        description: 'CPU usage is consistently low, consider reducing cores',
        resources: resourceUsage.cpu.resources,
        createdAt: new Date(),
      });
    }

    // Предложения по оптимизации памяти
    if (resourceUsage.memory.average < 40) {
      suggestions.push({
        id: `suggestion-${Date.now() + 1}`,
        type: 'resource-downsize',
        priority: 'medium',
        estimatedSavings: resourceUsage.memory.potentialSavings,
        currency: 'BYN',
        implementationEffort: 'low',
        description:
          'Memory usage is consistently low, consider reducing allocation',
        resources: resourceUsage.memory.resources,
        createdAt: new Date(),
      });
    }

    // Предложения по миграции провайдеров
    const providerComparison = await this.compareProviderCosts();
    if (providerComparison.hasBetterOption) {
      suggestions.push({
        id: `suggestion-${Date.now() + 2}`,
        type: 'provider-migration',
        priority: 'high',
        estimatedSavings: providerComparison.potentialSavings,
        currency: providerComparison.currency,
        implementationEffort: 'medium',
        description: `Migration to ${providerComparison.betterProvider} could save costs`,
        resources: providerComparison.resources,
        createdAt: new Date(),
      });
    }

    return suggestions;
  }

  private async analyzeResourceUsage(): Promise<{
    cpu: { average: number; potentialSavings: number; resources: string[] };
    memory: { average: number; potentialSavings: number; resources: string[] };
  }> {
    // Имитация анализа использования ресурсов
    return {
      cpu: {
        average: 25,
        potentialSavings: 150,
        resources: ['server-1', 'server-2'],
      },
      memory: {
        average: 35,
        potentialSavings: 200,
        resources: ['server-1', 'server-3'],
      },
    };
  }

  private async compareProviderCosts(): Promise<{
    hasBetterOption: boolean;
    betterProvider: string;
    potentialSavings: number;
    currency: 'BYN' | 'RUB' | 'USD';
    resources: string[];
  }> {
    // Имитация сравнения провайдеров
    return {
      hasBetterOption: true,
      betterProvider: 'BeCloud',
      potentialSavings: 300,
      currency: 'BYN',
      resources: ['server-1', 'server-2', 'server-3'],
    };
  }

  async acknowledgeAlert(alertId: string): Promise<boolean> {
    const alert = this.costAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();

    return true;
  }

  async getBillingPeriods(): Promise<BillingPeriod[]> {
    return Array.from(this.billingPeriods.values());
  }

  async getResourceCosts(
    periodId?: string,
    limit: number = 100
  ): Promise<ResourceCost[]> {
    let costs = Array.from(this.resourceCosts.values());

    if (periodId !== undefined) {
      costs = costs.filter(c => c.billingPeriodId === periodId);
    }

    // Сортируем по времени (новые сначала)
    costs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return costs.slice(0, limit);
  }

  async getCostAlerts(): Promise<CostAlert[]> {
    return Array.from(this.costAlerts.values());
  }

  async getBudgets(): Promise<Budget[]> {
    return Array.from(this.budgets.values());
  }

  async getCurrencyRates(): Promise<CurrencyRate[]> {
    return Array.from(this.currencyRates.values());
  }

  async addBudget(
    budget: Omit<Budget, 'id' | 'spent' | 'remaining'>
  ): Promise<string> {
    const budgetId = `budget-${Date.now()}`;
    const newBudget: Budget = {
      ...budget,
      id: budgetId,
      spent: 0,
      remaining: budget.amount,
    };

    this.budgets.set(budgetId, newBudget);
    return budgetId;
  }

  async updateBudget(
    budgetId: string,
    updates: Partial<Omit<Budget, 'id' | 'spent' | 'remaining'>>
  ): Promise<boolean> {
    const budget = this.budgets.get(budgetId);
    if (!budget) {
      return false;
    }

    Object.assign(budget, updates);
    budget.remaining = budget.amount - budget.spent;
    return true;
  }

  /**
   * Отслеживание затрат по провайдеру
   */
  trackCostsByProvider(providerId: string): {
    provider: string;
    costs: Array<{
      resourceType: string;
      usage: number;
      unit: string;
      cost: number;
      currency: string;
    }>;
    totalCost: number;
    period: string;
  } {
    const providerCosts = Array.from(this.resourceCosts.values()).filter(
      cost => cost.providerId === providerId
    );

    const costs = providerCosts.map(cost => ({
      resourceType: cost.resourceType,
      usage: cost.usage,
      unit: cost.unit,
      cost: cost.totalCost,
      currency: cost.currency,
    }));

    const totalCost = costs.reduce((sum, cost) => sum + cost.cost, 0);

    return {
      provider: providerId,
      costs,
      totalCost: Math.round(totalCost * 100) / 100,
      period: 'current-month',
    };
  }

  /**
   * Конвертация валют
   */
  convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): {
    originalAmount: number;
    originalCurrency: string;
    targetCurrency: string;
    convertedAmount: number;
    exchangeRate: number;
    timestamp: Date;
  } {
    // Имитация конвертации валют
    const rates: Record<string, number> = {
      BYN: 1,
      RUB: 0.03,
      USD: 0.4,
    };

    const fromRate = rates[fromCurrency] ?? 1;
    const toRate = rates[toCurrency] ?? 1;
    const exchangeRate = toRate / fromRate;
    const convertedAmount = amount * exchangeRate;

    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      targetCurrency: toCurrency,
      convertedAmount: Math.round(convertedAmount * 100) / 100,
      exchangeRate: Math.round(exchangeRate * 10000) / 10000,
      timestamp: new Date(),
    };
  }

  /**
   * Установка бюджетных алертов
   */
  setBudgetAlert(
    budgetId: string,
    amount: number,
    currency: string
  ): {
    budgetId: string;
    amount: number;
    currency: string;
    alertId: string;
    status: 'active' | 'acknowledged';
    createdAt: Date;
  } {
    const alertId = `alert-${Date.now()}`;

    const alert: CostAlert = {
      id: alertId,
      type: 'budget-exceeded',
      severity: 'high',
      message: `Budget ${budgetId} exceeded threshold ${amount} ${currency}`,
      currentCost: amount * 1.1, // Предполагаем превышение
      threshold: amount,
      currency: currency as 'BYN' | 'RUB' | 'USD',
      timestamp: new Date(),
      acknowledged: false,
    };

    this.costAlerts.set(alertId, alert);

    return {
      budgetId,
      amount,
      currency,
      alertId,
      status: 'active',
      createdAt: alert.timestamp,
    };
  }

  /**
   * Получение трендов затрат
   */
  getCostTrends(
    providerId: string,
    period: string
  ): {
    provider: string;
    period: string;
    data: Array<{
      date: string;
      cost: number;
      currency: string;
    }>;
    trend: 'increasing' | 'decreasing' | 'stable';
    changePercentage: number;
  } {
    // Имитация данных трендов
    const data = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        cost: Math.random() * 100 + 50,
        currency: 'BYN',
      };
    }).reverse();

    const firstCost = data[0]?.cost ?? 0;
    const lastCost = data[data.length - 1]?.cost ?? 0;
    const changePercentage =
      firstCost > 0 ? ((lastCost - firstCost) / firstCost) * 100 : 0;

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (changePercentage > 5) {
      trend = 'increasing';
    } else if (changePercentage < -5) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    return {
      provider: providerId,
      period,
      data: data.map(d => ({ ...d, date: d.date ?? '' })),
      trend,
      changePercentage: Math.round(changePercentage * 100) / 100,
    };
  }
}
