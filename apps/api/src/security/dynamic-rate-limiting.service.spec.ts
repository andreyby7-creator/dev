import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DynamicRateLimitingService } from './dynamic-rate-limiting.service';
import { vi } from 'vitest';

describe('DynamicRateLimitingService', () => {
  let service: DynamicRateLimitingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DynamicRateLimitingService],
    }).compile();

    service = module.get<DynamicRateLimitingService>(
      DynamicRateLimitingService
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with default rules', () => {
      const rules = service.getAllRules();
      expect(rules.length).toBeGreaterThan(0);
    });
  });

  describe('rule management', () => {
    it('should create a new rule', () => {
      const ruleData = {
        name: 'test-rule',
        pattern: '/api/test/**',
        type: 'url' as const,
        limit: 50,
        window: 60000,
        enabled: true,
        priority: 5,
        actions: ['throttle', 'log'] as ('log' | 'block' | 'throttle')[],
      };

      const rule = service.createRule(ruleData);
      expect(rule).toBeDefined();
      expect(rule.name).toBe(ruleData.name);
      expect(rule.pattern).toBe(ruleData.pattern);
      expect(rule.enabled).toBe(true);
    });

    it('should get rule by ID', () => {
      const ruleData = {
        name: 'test-rule-get',
        pattern: '/api/test-get/**',
        type: 'url' as const,
        limit: 50,
        window: 60000,
        enabled: true,
        priority: 5,
        actions: ['throttle', 'log'] as ('log' | 'block' | 'throttle')[],
      };

      const createdRule = service.createRule(ruleData);
      const retrievedRule = service.getRule(createdRule.id);

      expect(retrievedRule).toBeDefined();
      expect(retrievedRule?.id).toBe(createdRule.id);
    });

    it('should update rule', () => {
      const ruleData = {
        name: 'test-rule-update',
        pattern: '/api/test-update/**',
        type: 'url' as const,
        limit: 50,
        window: 60000,
        enabled: true,
        priority: 5,
        actions: ['throttle', 'log'] as ('log' | 'block' | 'throttle')[],
      };

      const rule = service.createRule(ruleData);
      const updatedRule = service.updateRule(rule.id, { limit: 100 });

      expect(updatedRule.limit).toBe(100);
    });

    it('should delete rule', () => {
      const ruleData = {
        name: 'test-rule-delete',
        pattern: '/api/test-delete/**',
        type: 'url' as const,
        limit: 50,
        window: 60000,
        enabled: true,
        priority: 5,
        actions: ['throttle', 'log'] as ('log' | 'block' | 'throttle')[],
      };

      const rule = service.createRule(ruleData);
      service.deleteRule(rule.id);

      const deletedRule = service.getRule(rule.id);
      expect(deletedRule).toBeUndefined();
    });

    it('should list all rules', () => {
      const rules = service.getAllRules();
      expect(Array.isArray(rules)).toBe(true);
    });

    it('should get rules by type', () => {
      const urlRules = service.getRulesByType('url');
      const ipRules = service.getRulesByType('ip');

      expect(Array.isArray(urlRules)).toBe(true);
      expect(Array.isArray(ipRules)).toBe(true);
    });
  });

  describe('rate limiting', () => {
    it('should check rate limit for URL', () => {
      const result = service.checkRateLimit('/api/test', '127.0.0.1');
      expect(result).toBeDefined();
      expect(result.allowed).toBeDefined();
      expect(result.remaining).toBeDefined();
      expect(result.resetTime).toBeDefined();
    });

    it('should check rate limit for IP', () => {
      const result = service.checkRateLimit('/api/test', '192.168.1.100');
      expect(result).toBeDefined();
      expect(result.allowed).toBeDefined();
    });

    it('should respect rate limits', () => {
      const ruleData = {
        name: 'strict-test-rule',
        pattern: '/api/strict/**',
        type: 'url' as const,
        limit: 2,
        window: 60000,
        enabled: true,
        priority: 0, // Высший приоритет (меньше числа = выше приоритет)
        actions: ['block', 'log'] as ('log' | 'block' | 'throttle')[],
      };

      service.createRule(ruleData);

      // First request should be allowed
      const result1 = service.checkRateLimit('/api/strict/test', '127.0.0.1');
      expect(result1.allowed).toBe(true);

      // Second request should be allowed
      const result2 = service.checkRateLimit('/api/strict/test', '127.0.0.1');
      expect(result2.allowed).toBe(true);

      // Third request should be blocked
      const result3 = service.checkRateLimit('/api/strict/test', '127.0.0.1');
      expect(result3.allowed).toBe(false);
    });

    it('should handle different user agents', () => {
      const ruleData = {
        name: 'user-agent-rule',
        pattern: '/api/user-agent/**',
        type: 'url' as const,
        limit: 10,
        window: 60000,
        enabled: true,
        priority: 0, // Высший приоритет
        actions: ['throttle', 'log'] as ('log' | 'block' | 'throttle')[],
        conditions: {
          userAgent: 'TestBot',
        },
      };

      service.createRule(ruleData);

      const result = service.checkRateLimit(
        '/api/user-agent/test',
        '127.0.0.1',
        'TestBot'
      );
      expect(result).toBeDefined();
    });
  });

  describe('adaptive rate limiting', () => {
    it('should adjust limits based on load', () => {
      const ruleData = {
        name: 'adaptive-rule',
        pattern: '/api/adaptive/**',
        type: 'url' as const,
        limit: 100,
        window: 60000,
        enabled: true,
        priority: 5,
        actions: ['throttle', 'log'] as ('log' | 'block' | 'throttle')[],
      };

      const rule = service.createRule(ruleData);

      // Simulate high load
      service.updateLoadMetrics(rule.id, { cpuUsage: 90, memoryUsage: 85 });

      const adjustedRule = service.getRule(rule.id);
      expect(adjustedRule).toBeDefined();
    });

    it('should scale limits dynamically', () => {
      const ruleData = {
        name: 'scaling-rule',
        pattern: '/api/scaling/**',
        type: 'url' as const,
        limit: 50,
        window: 60000,
        enabled: true,
        priority: 5,
        actions: ['throttle', 'log'] as ('log' | 'block' | 'throttle')[],
      };

      const rule = service.createRule(ruleData);

      // Simulate low load - should increase limits
      service.updateLoadMetrics(rule.id, { cpuUsage: 20, memoryUsage: 25 });

      const adjustedRule = service.getRule(rule.id);
      expect(adjustedRule).toBeDefined();
    });
  });

  describe('statistics and monitoring', () => {
    it('should track request statistics', () => {
      const ruleData = {
        name: 'stats-rule',
        pattern: '/api/stats/**',
        type: 'url' as const,
        limit: 10,
        window: 60000,
        enabled: true,
        priority: 0, // Высший приоритет
        actions: ['throttle', 'log'] as ('log' | 'block' | 'throttle')[],
      };

      const rule = service.createRule(ruleData);

      // Make some requests
      service.checkRateLimit('/api/stats/test', '127.0.0.1');
      service.checkRateLimit('/api/stats/test', '127.0.0.1');

      const stats = service.getRuleStats(rule.id);
      expect(stats).toBeDefined();
      expect(stats?.totalRequests).toBeGreaterThan(0);
    });

    it('should get overall statistics', () => {
      const stats = service.getOverallStats();
      expect(stats).toBeDefined();
      expect(stats.totalRules).toBeGreaterThan(0);
    });

    it('should get performance metrics', () => {
      const metrics = service.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe('IP filtering', () => {
    it('should block suspicious IPs', () => {
      // Создаем правило с высоким приоритетом для блокировки IP
      // Используем другой IP, чтобы избежать конфликта с правилом по умолчанию
      const ipRule = {
        name: 'test-suspicious-ip',
        pattern: '192.168.1.200', // Изменили IP
        type: 'ip' as const,
        limit: 1,
        window: 60000,
        enabled: true,
        priority: 0, // Высший приоритет
        actions: ['block', 'log'] as ('log' | 'block' | 'throttle')[],
      };

      const createdRule = service.createRule(ipRule);

      // Проверяем, что правило создано
      expect(createdRule).toBeDefined();
      expect(createdRule.type).toBe('ip');
      expect(createdRule.pattern).toBe('192.168.1.200');

      // Проверяем, что правило можно получить
      const retrievedRule = service.getRule(createdRule.id);
      expect(retrievedRule).toBeDefined();
      expect(retrievedRule?.type).toBe('ip');

      // Проверяем все правила
      const allRules = service.getAllRules();
      expect(allRules.length).toBeGreaterThan(0);

      // Проверяем IP правила отдельно
      const ipRules = service.getRulesByType('ip');
      expect(ipRules.length).toBeGreaterThan(0);
      expect(ipRules.some(r => r.pattern === '192.168.1.200')).toBe(true);

      // ПРЯМАЯ ПРОВЕРКА: что возвращает getApplicableRules для IP
      const applicableIpRules = service.getApplicableRules(
        '192.168.1.200',
        'ip'
      );

      // ОТЛАДКА: выводим информацию через expect
      expect(applicableIpRules).toBeDefined();
      expect(applicableIpRules.length).toBeGreaterThan(0);
      expect(applicableIpRules.some(r => r.pattern === '192.168.1.200')).toBe(
        true
      );

      // Проверяем, что правило действительно найдено
      const foundRule = applicableIpRules.find(
        r => r.pattern === '192.168.1.200'
      );
      expect(foundRule).toBeDefined();
      expect(foundRule?.type).toBe('ip');
      expect(foundRule?.enabled).toBe(true);
      expect(foundRule?.actions).toContain('block');

      // Используем URL, который не попадает под правило /api/**
      // Проверяем, что IP правило действительно существует перед вызовом
      const finalAllRules = service.getAllRules();
      const finalIpRules = service.getRulesByType('ip');

      expect(finalAllRules.length).toBeGreaterThan(0);
      expect(finalIpRules.length).toBeGreaterThan(0);
      expect(finalIpRules.some(r => r.pattern === '192.168.1.200')).toBe(true);

      // ОТЛАДКА: проверяем правило перед вызовом checkRateLimit
      const ruleBeforeCall = service.getRule(createdRule.id);
      expect(ruleBeforeCall).toBeDefined();
      expect(ruleBeforeCall?.limit).toBe(1);
      expect(ruleBeforeCall?.actions).toContain('block');

      // ПЕРВЫЙ запрос - должен быть разрешен (limit = 1, count = 1)
      const result1 = service.checkRateLimit('/test', '192.168.1.200');
      expect(result1.allowed).toBe(true); // Первый запрос разрешен
      expect(result1.remaining).toBe(0); // Осталось 0 запросов

      // ВТОРОЙ запрос - должен быть заблокирован (limit = 1, count = 2)
      const result = service.checkRateLimit('/test', '192.168.1.200');

      // ОТЛАДКА: проверяем результат
      expect(result).toBeDefined();
      expect(result.ruleId).toBeDefined();
      expect(result.ruleId).not.toBe('');

      // ДЕТАЛЬНАЯ ОТЛАДКА: что именно возвращает второй запрос
      expect(result.limit).toBe(1); // Ожидаем лимит = 1
      expect(result.remaining).toBe(0); // Ожидаем remaining = 0 (лимит исчерпан)
      expect(result.allowed).toBe(false); // Ожидаем allowed = false (второй запрос заблокирован)

      expect(result).toBeDefined();
      expect(result.allowed).toBe(false);
      expect(result.action).toBe('block');
    });

    it('should whitelist trusted IPs', () => {
      service.addWhitelistedIP('127.0.0.1');

      const result = service.checkRateLimit('/api/test', '127.0.0.1');
      expect(result).toBeDefined();
    });

    it('should blacklist malicious IPs', () => {
      service.addBlacklistedIP('10.0.0.1');

      const result = service.checkRateLimit('/api/test', '10.0.0.1');
      expect(result.allowed).toBe(false);
      expect(result.action).toBe('block');
    });
  });

  describe('user quotas', () => {
    it('should manage user-specific quotas', () => {
      const userId = 'user123';
      service.setUserQuota(userId, 100, 60000);

      const result = service.checkUserRateLimit(userId);
      expect(result).toBeDefined();
      expect(result.allowed).toBe(true);
    });

    it('should respect user quotas', () => {
      const userId = 'user456';
      service.setUserQuota(userId, 1, 60000);

      // First request should be allowed
      const result1 = service.checkUserRateLimit(userId);
      expect(result1.allowed).toBe(true);

      // Second request should be blocked
      const result2 = service.checkUserRateLimit(userId);
      expect(result2.allowed).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle invalid rule ID', () => {
      const rule = service.getRule('invalid-id');
      expect(rule).toBeUndefined();
    });

    it('should handle invalid rule data', () => {
      expect(() => {
        service.createRule({
          name: '',
          pattern: '',
          type: 'url',
          limit: -1,
          window: 0,
          enabled: true,
          priority: 0,
          actions: ['log'],
        });
      }).toThrow();
    });
  });

  describe('cleanup and maintenance', () => {
    it('should cleanup expired counters', () => {
      service.cleanupExpiredCounters();

      const stats = service.getOverallStats();
      expect(stats).toBeDefined();
    });

    it('should reset counters', () => {
      const ruleData = {
        name: 'reset-rule',
        pattern: '/api/reset/**',
        type: 'url' as const,
        limit: 10,
        window: 60000,
        enabled: true,
        priority: 5,
        actions: ['throttle', 'log'] as ('log' | 'block' | 'throttle')[],
      };

      const rule = service.createRule(ruleData);

      // Make some requests
      service.checkRateLimit('/api/reset/test', '127.0.0.1');

      // Reset counters
      service.resetCounters(rule.id);

      const stats = service.getRuleStats(rule.id);
      expect(stats?.totalRequests).toBe(0);
    });
  });
});
