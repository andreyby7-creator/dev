import { Injectable, Logger } from '@nestjs/common';

export interface IDynamicRateLimitRule {
  id: string;
  name: string;
  pattern: string; // URL pattern или IP pattern
  type: 'url' | 'ip' | 'user' | 'api_key';
  limit: number;
  window: number; // в миллисекундах
  enabled: boolean;
  priority: number;
  actions: ('block' | 'throttle' | 'log')[];
  conditions?: {
    userAgent?: string;
    country?: string;
    timeOfDay?: { start: string; end: string };
    dayOfWeek?: number[];
  };
}

export interface IRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
  ruleId: string;
  action: 'block' | 'throttle' | 'log';
  reason?: string;
}

export interface IRateLimitStats {
  ruleId: string;
  totalRequests: number;
  blockedRequests: number;
  throttledRequests: number;
  averageResponseTime: number;
  lastReset: Date;
}

@Injectable()
export class DynamicRateLimitingService {
  private readonly logger = new Logger(DynamicRateLimitingService.name);
  private readonly rules: Map<string, IDynamicRateLimitRule> = new Map();
  private readonly counters: Map<string, { count: number; resetTime: number }> =
    new Map();
  private readonly stats: Map<string, IRateLimitStats> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Инициализирует правила по умолчанию
   */
  private initializeDefaultRules(): void {
    const defaultRules: IDynamicRateLimitRule[] = [
      {
        id: 'default_api',
        name: 'Default API Rate Limit',
        pattern: '/api/**',
        type: 'url',
        limit: 100,
        window: 60000, // 1 минута
        enabled: true,
        priority: 1,
        actions: ['throttle', 'log'],
      },
      {
        id: 'auth_endpoints',
        name: 'Authentication Endpoints',
        pattern: '/api/auth/**',
        type: 'url',
        limit: 10,
        window: 300000, // 5 минут
        enabled: true,
        priority: 2,
        actions: ['block', 'log'],
      },
      {
        id: 'admin_endpoints',
        name: 'Admin Endpoints',
        pattern: '/api/admin/**',
        type: 'url',
        limit: 50,
        window: 60000,
        enabled: true,
        priority: 3,
        actions: ['throttle', 'log'],
      },
      {
        id: 'suspicious_ip',
        name: 'Suspicious IP Block',
        pattern: '192.168.1.100',
        type: 'ip',
        limit: 1,
        window: 3600000, // 1 час
        enabled: true,
        priority: 10,
        actions: ['block', 'log'],
      },
    ];

    for (const rule of defaultRules) {
      this.addRule(rule);
    }

    this.logger.log('Dynamic rate limiting initialized with default rules', {
      ruleCount: defaultRules.length,
    });
  }

  /**
   * Добавляет новое правило rate limiting
   */
  addRule(rule: IDynamicRateLimitRule): void {
    this.rules.set(rule.id, rule);
    this.stats.set(rule.id, {
      ruleId: rule.id,
      totalRequests: 0,
      blockedRequests: 0,
      throttledRequests: 0,
      averageResponseTime: 0,
      lastReset: new Date(),
    });

    this.logger.log(`Added rate limit rule: ${rule.id}`, {
      name: rule.name,
      pattern: rule.pattern,
      limit: rule.limit,
      window: rule.window,
    });
  }

  /**
   * Обновляет существующее правило
   */
  updateRule(
    ruleId: string,
    updates: Partial<IDynamicRateLimitRule>
  ): IDynamicRateLimitRule {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rate limit rule not found: ${ruleId}`);
    }

    const updatedRule = { ...rule, ...updates };
    this.rules.set(ruleId, updatedRule);

    this.logger.log(`Updated rate limit rule: ${ruleId}`, updates);
    return updatedRule;
  }

  /**
   * Удаляет правило
   */
  removeRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rate limit rule not found: ${ruleId}`);
    }

    this.rules.delete(ruleId);
    this.stats.delete(ruleId);

    this.logger.log(`Removed rate limit rule: ${ruleId}`);
  }

  /**
   * Проверяет rate limit для запроса
   */
  checkRateLimit(
    path: string,
    ip: string,
    userAgent?: string
  ): IRateLimitResult {
    this.logger.debug(`=== checkRateLimit called ===`);
    this.logger.debug(`Path: ${path}, IP: ${ip}, UserAgent: ${userAgent}`);
    this.logger.debug(`Total rules in service: ${this.rules.size}`);
    this.logger.debug(
      `All rules:`,
      Array.from(this.rules.values()).map(r => ({
        id: r.id,
        name: r.name,
        pattern: r.pattern,
        type: r.type,
        enabled: r.enabled,
      }))
    );

    // Сначала проверяем IP правила (они имеют АБСОЛЮТНЫЙ приоритет)
    const ipRules = this.getApplicableRules(ip, 'ip');
    this.logger.debug(
      `IP rules for ${ip}:`,
      ipRules.map(r => ({
        id: r.id,
        pattern: r.pattern,
        limit: r.limit,
        priority: r.priority,
      }))
    );

    if (ipRules.length > 0) {
      // Сортируем по приоритету (высокий приоритет = низкий номер)
      ipRules.sort((a, b) => a.priority - b.priority);
      const selectedRule = ipRules[0];
      if (!selectedRule) return this.createDefaultResult();

      this.logger.debug(
        `Selected IP rule: ${selectedRule.id} (${selectedRule.name}) with priority ${selectedRule.priority}`
      );

      const result = this.evaluateRule(selectedRule, ip);
      this.updateStats(selectedRule.id, result);
      this.logger.debug(`Applied IP rule ${selectedRule.id}, result:`, result);
      return result;
    }

    // Затем проверяем правила для URL
    const urlRules = this.getApplicableRules(path, 'url', path);
    this.logger.debug(
      `URL rules for ${path}:`,
      urlRules.map(r => ({
        id: r.id,
        pattern: r.pattern,
        limit: r.limit,
        priority: r.priority,
      }))
    );

    if (urlRules.length > 0) {
      // Сортируем по приоритету
      urlRules.sort((a, b) => a.priority - b.priority);
      const selectedRule = urlRules[0];
      if (!selectedRule) return this.createDefaultResult();

      const result = this.evaluateRule(selectedRule, path);
      this.updateStats(selectedRule.id, result);
      this.logger.debug(`Applied URL rule ${selectedRule.id}, result:`, result);
      return result;
    }

    this.logger.debug(`No applicable rules found for path: ${path}, ip: ${ip}`);

    // Если нет применимых правил, разрешаем
    return {
      allowed: true,
      remaining: -1,
      resetTime: Date.now(),
      limit: -1,
      ruleId: '',
      action: 'log',
    };
  }

  /**
   * Создает результат по умолчанию для случаев, когда нет применимых правил
   */
  private createDefaultResult(): IRateLimitResult {
    return {
      allowed: true,
      remaining: -1,
      resetTime: Date.now(),
      limit: -1,
      ruleId: '',
      action: 'log',
    };
  }

  /**
   * Получает применимые правила
   */
  public getApplicableRules(
    identifier: string,
    type: 'url' | 'ip' | 'user' | 'api_key',
    url?: string
  ): IDynamicRateLimitRule[] {
    this.logger.debug(`=== getApplicableRules called ===`);
    this.logger.debug(`Identifier: ${identifier}, Type: ${type}, URL: ${url}`);

    const applicableRules: IDynamicRateLimitRule[] = [];

    for (const rule of this.rules.values()) {
      this.logger.debug(
        `Checking rule: ${rule.id} (${rule.name}) - Type: ${rule.type}, Enabled: ${rule.enabled}, Pattern: ${rule.pattern}`
      );

      if (!rule.enabled) {
        this.logger.debug(`Rule ${rule.id} skipped: not enabled`);
        continue;
      }
      if (rule.type !== type) {
        this.logger.debug(
          `Rule ${rule.id} skipped: type mismatch (${rule.type} vs ${type})`
        );
        continue;
      }

      let matches = false;

      switch (rule.type) {
        case 'url':
          if (
            url != null &&
            url !== '' &&
            this.matchesPattern(url, rule.pattern)
          ) {
            matches = true;
            this.logger.debug(
              `URL pattern match: ${url} vs ${rule.pattern} = true`
            );
          } else {
            this.logger.debug(
              `URL pattern match: ${url} vs ${rule.pattern} = false`
            );
          }
          break;
        case 'ip':
          if (this.matchesPattern(identifier, rule.pattern)) {
            matches = true;
            this.logger.debug(
              `IP pattern match: ${identifier} vs ${rule.pattern} = true`
            );
          } else {
            this.logger.debug(
              `IP pattern match: ${identifier} vs ${rule.pattern} = false`
            );
          }
          break;
        case 'user':
        case 'api_key':
          if (identifier === rule.pattern) {
            matches = true;
            this.logger.debug(
              `Exact match: ${identifier} vs ${rule.pattern} = true`
            );
          } else {
            this.logger.debug(
              `Exact match: ${identifier} vs ${rule.pattern} = false`
            );
          }
          break;
      }

      if (matches && this.evaluateConditions(rule)) {
        this.logger.debug(
          `Rule ${rule.id} is applicable and conditions passed`
        );
        applicableRules.push(rule);
      } else {
        this.logger.debug(
          `Rule ${rule.id} conditions failed or pattern didn't match`
        );
      }
    }

    this.logger.debug(
      `Found ${applicableRules.length} applicable rules:`,
      applicableRules.map(r => ({ id: r.id, name: r.name, pattern: r.pattern }))
    );
    return applicableRules;
  }

  /**
   * Проверяет соответствие паттерну
   */
  private matchesPattern(value: string, pattern: string): boolean {
    this.logger.debug(`=== matchesPattern called ===`);
    this.logger.debug(`Value: ${value}, Pattern: ${pattern}`);

    // Проверяем wildcard паттерны
    if (pattern.includes('**')) {
      const regexPattern = pattern.replace(/\*\*/g, '.*');
      const regex = new RegExp(`^${regexPattern}$`);
      const result = regex.test(value);
      this.logger.debug(
        `Wildcard pattern: ${pattern} -> ${regexPattern}, Result: ${result}`
      );
      return result;
    }

    // Проверяем точное совпадение для IP адресов
    if (this.isValidIP(value)) {
      const result = value === pattern;
      this.logger.debug(`IP exact match: ${value} === ${pattern} = ${result}`);
      return result;
    }

    // Для URL паттернов проверяем, начинается ли value с pattern
    if (pattern.startsWith('/')) {
      // Убираем ** в конце и проверяем, начинается ли value с базового паттерна
      const basePattern = pattern.replace(/\*\*$/, '');
      const result = value.startsWith(basePattern);
      this.logger.debug(
        `URL pattern: ${pattern} -> base: ${basePattern}, ${value}.startsWith(${basePattern}) = ${result}`
      );
      return result;
    }

    // Для остальных случаев используем includes
    const result = value.includes(pattern) || pattern.includes(value);
    this.logger.debug(
      `Default includes check: ${value}.includes(${pattern}) || ${pattern}.includes(${value}) = ${result}`
    );
    return result;
  }

  /**
   * Проверяет условия правила
   */
  private evaluateConditions(rule: IDynamicRateLimitRule): boolean {
    if (!rule.conditions) return true;

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // Проверяем время дня
    if (rule.conditions.timeOfDay) {
      const { start, end } = rule.conditions.timeOfDay;
      const startParts = start.split(':');
      const endParts = end.split(':');
      const startHour = parseInt(startParts[0] ?? '0');
      const endHour = parseInt(endParts[0] ?? '0');

      if (currentHour < startHour || currentHour > endHour) {
        return false;
      }
    }

    // Проверяем день недели
    if (
      rule.conditions.dayOfWeek &&
      !rule.conditions.dayOfWeek.includes(currentDay)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Оценивает правило
   */
  private evaluateRule(
    rule: IDynamicRateLimitRule,
    identifier: string
  ): IRateLimitResult {
    this.logger.debug(`=== evaluateRule called ===`);
    this.logger.debug(
      `Rule: ${rule.id} (${rule.name}), Identifier: ${identifier}`
    );

    const key = `${rule.id}:${identifier}`;
    const now = Date.now();

    let counter = this.counters.get(key);
    this.logger.debug(`Current counter for key ${key}:`, counter);

    if (!counter || now > counter.resetTime) {
      counter = {
        count: 0,
        resetTime: now + rule.window,
      };
      this.logger.debug(`Reset counter for ${key}`);
    }

    counter.count++;
    this.logger.debug(
      `Counter for ${key} increased to ${counter.count}, limit: ${rule.limit}`
    );

    // Важно: сохраняем обновленный счетчик
    this.counters.set(key, counter);

    const remaining = Math.max(0, rule.limit - counter.count);
    const allowed = counter.count <= rule.limit;

    this.logger.debug(
      `Rule evaluation: count=${counter.count}, limit=${rule.limit}, allowed=${allowed}, remaining=${remaining}`
    );

    let action: 'block' | 'throttle' | 'log' = 'log';
    if (!allowed) {
      if (rule.actions.includes('block')) {
        action = 'block';
      } else if (rule.actions.includes('throttle')) {
        action = 'throttle';
      }
    }

    const result = {
      allowed,
      remaining,
      resetTime: counter.resetTime,
      limit: rule.limit,
      ruleId: rule.id,
      action,
      reason: !allowed ? `Rate limit exceeded: ${rule.name}` : '',
    };

    this.logger.debug(`Rule evaluation result:`, result);
    this.logger.debug(`Final counter state:`, this.counters.get(key));
    return result;
  }

  /**
   * Обновляет статистику
   */
  private updateStats(ruleId: string, result: IRateLimitResult): void {
    this.logger.debug(`=== updateStats called ===`);
    this.logger.debug(`RuleId: ${ruleId}, Result:`, result);

    const stats = this.stats.get(ruleId);
    this.logger.debug(`Current stats for rule ${ruleId}:`, stats);

    if (!stats) {
      this.logger.debug(`No stats found for rule ${ruleId}, skipping update`);
      return;
    }

    stats.totalRequests++;
    this.logger.debug(`Updated totalRequests to ${stats.totalRequests}`);

    if (!result.allowed) {
      if (result.action === 'block') {
        stats.blockedRequests++;
        this.logger.debug(
          `Updated blockedRequests to ${stats.blockedRequests}`
        );
      } else if (result.action === 'throttle') {
        stats.throttledRequests++;
        this.logger.debug(
          `Updated throttledRequests to ${stats.throttledRequests}`
        );
      }
    }

    this.stats.set(ruleId, stats);
    this.logger.debug(`Stats saved for rule ${ruleId}:`, stats);
  }

  /**
   * Получает правило по ID
   */
  getRule(ruleId: string): IDynamicRateLimitRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Получает все правила
   */
  getAllRules(): IDynamicRateLimitRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Получает статистику правила
   */
  getRuleStats(ruleId: string): IRateLimitStats | undefined {
    return this.stats.get(ruleId);
  }

  /**
   * Получает всю статистику
   */
  getAllStats(): IRateLimitStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Сбрасывает счетчики для правила
   */
  resetCounters(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rate limit rule not found: ${ruleId}`);
    }

    for (const [key] of this.counters.entries()) {
      if (key.startsWith(`${ruleId}:`)) {
        this.counters.delete(key);
      }
    }

    this.logger.log(`Reset counters for rule: ${ruleId}`);
  }

  /**
   * Сбрасывает все счетчики
   */
  resetAllCounters(): void {
    this.counters.clear();
    this.logger.log('Reset all rate limit counters');
  }

  /**
   * Создает правило на основе аналитики
   */
  createRuleFromAnalytics(
    pattern: string,
    type: 'url' | 'ip' | 'user' | 'api_key',
    analytics: {
      requestCount: number;
      averageResponseTime: number;
      errorRate: number;
    }
  ): IDynamicRateLimitRule {
    // Анализируем данные и создаем оптимальное правило
    let limit = 100;
    let window = 60000;
    let actions: ('block' | 'throttle' | 'log')[] = ['throttle', 'log'];

    if (analytics.errorRate > 0.1) {
      // Высокий процент ошибок - более строгие лимиты
      limit = Math.floor(analytics.requestCount * 0.5);
      window = 300000; // 5 минут
      actions = ['block', 'log'];
    } else if (analytics.averageResponseTime > 1000) {
      // Медленные ответы - умеренные лимиты
      limit = Math.floor(analytics.requestCount * 0.8);
      window = 120000; // 2 минуты
      actions = ['throttle', 'log'];
    }

    const rule: IDynamicRateLimitRule = {
      id: `auto_${Date.now()}`,
      name: `Auto-generated rule for ${pattern}`,
      pattern,
      type,
      limit,
      window,
      enabled: true,
      priority: 5,
      actions,
    };

    this.addRule(rule);
    return rule;
  }

  /**
   * Оптимизирует правила на основе статистики
   */
  optimizeRules(): void {
    for (const [ruleId, stats] of this.stats.entries()) {
      const rule = this.rules.get(ruleId);
      if (!rule) continue;

      const blockRate = stats.blockedRequests / stats.totalRequests;
      const throttleRate = stats.throttledRequests / stats.totalRequests;

      // Если много блокировок, увеличиваем лимит
      if (blockRate > 0.2) {
        const newLimit = Math.floor(rule.limit * 1.5);
        this.updateRule(ruleId, { limit: newLimit });
        this.logger.log(
          `Optimized rule ${ruleId}: increased limit to ${newLimit}`,
          {
            blockRate,
            throttleRate,
          }
        );
      }

      // Если много throttling, немного увеличиваем лимит
      if (throttleRate > 0.3) {
        const newLimit = Math.floor(rule.limit * 1.2);
        this.updateRule(ruleId, { limit: newLimit });
        this.logger.log(
          `Optimized rule ${ruleId}: increased limit to ${newLimit}`,
          {
            blockRate,
            throttleRate,
          }
        );
      }
    }
  }

  /**
   * Создает новое правило
   */
  createRule(ruleData: {
    name: string;
    pattern: string;
    type: 'url' | 'ip' | 'user' | 'api_key';
    limit: number;
    window: number;
    enabled: boolean;
    priority: number;
    actions: ('block' | 'throttle' | 'log')[];
    conditions?: {
      userAgent?: string;
      country?: string;
      timeOfDay?: { start: string; end: string };
      dayOfWeek?: number[];
    };
  }): IDynamicRateLimitRule {
    // Валидация входных данных
    if (!ruleData.name || ruleData.name.trim() === '') {
      throw new Error('Rule name cannot be empty');
    }
    if (!ruleData.pattern || ruleData.pattern.trim() === '') {
      throw new Error('Rule pattern cannot be empty');
    }
    if (ruleData.limit <= 0) {
      throw new Error('Rule limit must be greater than 0');
    }
    if (ruleData.window <= 0) {
      throw new Error('Rule window must be greater than 0');
    }
    if (ruleData.priority < 0) {
      throw new Error('Rule priority must be non-negative');
    }
    if (ruleData.actions.length === 0) {
      throw new Error('Rule must have at least one action');
    }

    const rule: IDynamicRateLimitRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...ruleData,
    };

    this.addRule(rule);

    // Инициализируем статистику для нового правила
    this.stats.set(rule.id, {
      ruleId: rule.id,
      totalRequests: 0,
      blockedRequests: 0,
      throttledRequests: 0,
      averageResponseTime: 0,
      lastReset: new Date(),
    });

    return rule;
  }

  /**
   * Удаляет правило
   */
  deleteRule(ruleId: string): void {
    this.removeRule(ruleId);
  }

  /**
   * Получает правила по типу
   */
  getRulesByType(
    type: 'url' | 'ip' | 'user' | 'api_key'
  ): IDynamicRateLimitRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.type === type);
  }

  /**
   * Добавляет IP в whitelist
   */
  addWhitelistedIP(ip: string): void {
    const rule: IDynamicRateLimitRule = {
      id: `whitelist_${ip}`,
      name: `Whitelist IP: ${ip}`,
      pattern: ip,
      type: 'ip',
      limit: 10000, // Очень высокий лимит для whitelist
      window: 60000,
      enabled: true,
      priority: 1, // Высокий приоритет
      actions: ['log'],
    };

    this.addRule(rule);
    this.logger.log(`Added IP to whitelist: ${ip}`);
  }

  /**
   * Добавляет IP в blacklist
   */
  addBlacklistedIP(ip: string): void {
    const rule: IDynamicRateLimitRule = {
      id: `blacklist_${ip}`,
      name: `Blacklist IP: ${ip}`,
      pattern: ip,
      type: 'ip',
      limit: 0, // Нулевой лимит для blacklist
      window: 60000,
      enabled: true,
      priority: 1, // Высокий приоритет
      actions: ['block', 'log'],
    };

    this.addRule(rule);
    this.logger.log(`Added IP to blacklist: ${ip}`);
  }

  /**
   * Устанавливает квоту для пользователя
   */
  setUserQuota(userId: string, limit: number, window: number): void {
    const rule: IDynamicRateLimitRule = {
      id: `user_quota_${userId}`,
      name: `User Quota: ${userId}`,
      pattern: userId,
      type: 'user',
      limit,
      window,
      enabled: true,
      priority: 5,
      actions: ['throttle', 'log'],
    };

    this.addRule(rule);
    this.logger.log(
      `Set user quota for ${userId}: ${limit} requests per ${window}ms`
    );
  }

  /**
   * Проверяет rate limit для пользователя
   */
  checkUserRateLimit(userId: string): IRateLimitResult {
    // Получаем правила для пользователя
    const userRules = this.getApplicableRules(userId, 'user');
    if (userRules.length > 0) {
      const selectedRule = userRules[0];
      if (!selectedRule) return this.createDefaultResult();

      const result = this.evaluateRule(selectedRule, userId);
      this.updateStats(selectedRule.id, result);
      return result;
    }

    // Если нет правил для пользователя, разрешаем
    return {
      allowed: true,
      remaining: -1,
      resetTime: Date.now(),
      limit: -1,
      ruleId: '',
      action: 'log',
    };
  }

  /**
   * Обновляет метрики нагрузки
   */
  updateLoadMetrics(
    ruleId: string,
    metrics: {
      cpuUsage: number;
      memoryUsage: number;
      responseTime?: number;
      errorRate?: number;
    }
  ): void {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      this.logger.warn(`Cannot update load metrics: rule ${ruleId} not found`);
      return;
    }

    // Адаптивно изменяем лимиты на основе нагрузки
    if (metrics.cpuUsage > 80 || metrics.memoryUsage > 80) {
      // Высокая нагрузка - уменьшаем лимиты
      const newLimit = Math.floor(rule.limit * 0.7);
      this.updateRule(ruleId, { limit: newLimit });
      this.logger.log(
        `Reduced rate limit for rule ${ruleId} due to high load: ${newLimit}`
      );
    } else if (metrics.cpuUsage < 30 && metrics.memoryUsage < 30) {
      // Низкая нагрузка - увеличиваем лимиты
      const newLimit = Math.floor(rule.limit * 1.2);
      this.updateRule(ruleId, { limit: newLimit });
      this.logger.log(
        `Increased rate limit for rule ${ruleId} due to low load: ${newLimit}`
      );
    }
  }

  /**
   * Получает общую статистику
   */
  getOverallStats(): {
    totalRules: number;
    totalRequests: number;
    blockedRequests: number;
    throttledRequests: number;
    activeRules: number;
  } {
    const allStats = this.getAllStats();
    const totalRequests = allStats.reduce(
      (sum, stat) => sum + stat.totalRequests,
      0
    );
    const blockedRequests = allStats.reduce(
      (sum, stat) => sum + stat.blockedRequests,
      0
    );
    const throttledRequests = allStats.reduce(
      (sum, stat) => sum + stat.throttledRequests,
      0
    );
    const activeRules = Array.from(this.rules.values()).filter(
      rule => rule.enabled
    ).length;

    return {
      totalRules: this.rules.size,
      totalRequests,
      blockedRequests,
      throttledRequests,
      activeRules,
    };
  }

  /**
   * Получает метрики производительности
   */
  getPerformanceMetrics(): Array<{
    ruleId: string;
    ruleName: string;
    requestRate: number;
    blockRate: number;
    throttleRate: number;
    averageResponseTime: number;
  }> {
    const metrics = [];
    const now = Date.now();

    for (const [ruleId, stats] of this.stats.entries()) {
      const rule = this.rules.get(ruleId);
      if (!rule) continue;

      const timeWindow = (now - stats.lastReset.getTime()) / 1000; // в секундах
      const requestRate = timeWindow > 0 ? stats.totalRequests / timeWindow : 0;
      const blockRate =
        stats.totalRequests > 0
          ? stats.blockedRequests / stats.totalRequests
          : 0;
      const throttleRate =
        stats.totalRequests > 0
          ? stats.throttledRequests / stats.totalRequests
          : 0;

      metrics.push({
        ruleId,
        ruleName: rule.name,
        requestRate,
        blockRate,
        throttleRate,
        averageResponseTime: stats.averageResponseTime,
      });
    }

    return metrics;
  }

  /**
   * Очищает устаревшие счетчики
   */
  cleanupExpiredCounters(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, counter] of this.counters.entries()) {
      if (now > counter.resetTime) {
        this.counters.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired rate limit counters`);
    }
  }

  /**
   * Проверяет, является ли строка валидным IP адресом
   */
  private isValidIP(ip: string): boolean {
    // Упрощенная проверка для тестирования
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const result = ipRegex.test(ip);
    this.logger.debug(`isValidIP(${ip}) = ${result}`);
    return result;
  }
}
