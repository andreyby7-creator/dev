import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { getConfig } from '../config/env.config';

// Zod схемы для валидации
const FeatureFlagSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  enabled: z.boolean(),
  type: z.enum(['boolean', 'string', 'number', 'json']),
  defaultValue: z.unknown(),
  rules: z
    .array(
      z.object({
        condition: z.enum(['user_id', 'role', 'environment', 'percentage']),
        value: z.unknown(),
        operator: z.enum([
          'equals',
          'not_equals',
          'contains',
          'greater_than',
          'less_than',
        ]),
      })
    )
    .optional(),
  environments: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// TypeScript типы из схем
type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

// Интерфейсы для конфигурации
interface FeatureFlagsConfig {
  provider: 'launchdarkly' | 'unleash' | 'custom';
  apiKey?: string;
  baseUrl?: string;
  environment: string;
  cacheEnabled: boolean;
  cacheTtl: number;
}

interface UserContext {
  userId?: string;
  email?: string;
  role?: string;
  environment?: string;
  custom?: Record<string, unknown>;
}

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private readonly flags: Map<string, FeatureFlag> = new Map();

  private readonly cache: Map<string, { value: unknown; timestamp: number }> =
    new Map();
  private config!: FeatureFlagsConfig;

  constructor() {
    this.initializeConfig();
    this.initializeDefaultFlags();
  }

  private initializeConfig(): void {
    const envConfig = getConfig();
    this.config = {
      provider: 'custom' as FeatureFlagsConfig['provider'],
      apiKey: '',
      baseUrl: '',
      environment: envConfig.NODE_ENV,
      cacheEnabled: false,
      cacheTtl: 300,
    };
  }

  private initializeDefaultFlags(): void {
    const defaultFlags: FeatureFlag[] = [
      {
        key: 'new-ui-enabled',
        name: 'New UI Enabled',
        description: 'Enable new user interface',
        enabled: true,
        type: 'boolean',
        defaultValue: false,
        environments: ['development', 'staging'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'beta-features',
        name: 'Beta Features',
        description: 'Enable beta features for testing',
        enabled: true,
        type: 'boolean',
        defaultValue: false,
        rules: undefined,
        environments: ['development', 'staging'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'rate-limit-percentage',
        name: 'Rate Limit Percentage',
        description: 'Percentage of users to apply rate limiting',
        enabled: true,
        type: 'number',
        defaultValue: 10,
        environments: ['production'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'maintenance-mode',
        name: 'Maintenance Mode',
        description: 'Enable maintenance mode',
        enabled: false,
        type: 'boolean',
        defaultValue: false,
        environments: ['production', 'staging'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultFlags.forEach(flag => {
      this.flags.set(flag.key, flag);
    });
  }

  /**
   * Get feature flag value for user
   */
  async getFlagValue(
    flagKey: string,
    userContext: UserContext
  ): Promise<unknown> {
    try {
      // Check cache first
      const cacheKey = `${flagKey}:${JSON.stringify(userContext)}`;
      if (this.config.cacheEnabled) {
        const cached = this.cache.get(cacheKey);
        if (
          cached &&
          Date.now() - cached.timestamp < this.config.cacheTtl * 1000
        ) {
          return cached.value;
        }
      }

      const flag = this.flags.get(flagKey);
      if (!flag) {
        this.logger.warn(`Feature flag not found: ${flagKey}`);
        return null;
      }

      if (!flag.enabled) {
        return flag.defaultValue;
      }

      // Check environment
      if (!flag.environments.includes(this.config.environment)) {
        return flag.defaultValue;
      }

      // Apply rules
      const value = this.applyRules(flag, userContext);

      // Cache result
      if (this.config.cacheEnabled) {
        this.cache.set(cacheKey, { value, timestamp: Date.now() });
      }

      return value;
    } catch (error) {
      this.logger.error(`Error getting feature flag ${flagKey}:`, error);
      return null;
    }
  }

  /**
   * Get boolean feature flag value
   */
  async isEnabled(flagKey: string, userContext: UserContext): Promise<boolean> {
    const value = await this.getFlagValue(flagKey, userContext);
    return Boolean(value);
  }

  /**
   * Get string feature flag value
   */
  async getString(flagKey: string, userContext: UserContext): Promise<string> {
    const value = await this.getFlagValue(flagKey, userContext);
    return String(value ?? '');
  }

  /**
   * Get number feature flag value
   */
  async getNumber(flagKey: string, userContext: UserContext): Promise<number> {
    const value = await this.getFlagValue(flagKey, userContext);
    return Number(value ?? 0);
  }

  /**
   * Get JSON feature flag value
   */
  async getJson<T>(
    flagKey: string,
    userContext: UserContext
  ): Promise<T | null> {
    const value = await this.getFlagValue(flagKey, userContext);
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    }
    return value as T;
  }

  /**
   * Apply rules to determine flag value
   */
  private applyRules(flag: FeatureFlag, userContext: UserContext): unknown {
    if (!flag.rules || flag.rules.length === 0) {
      return flag.defaultValue;
    }

    // Sort rules by priority (if available)
    const sortedRules = [...flag.rules].sort((a, b) => {
      const priorityA = (a as Record<string, unknown>).priority ?? 0;
      const priorityB = (b as Record<string, unknown>).priority ?? 0;
      return (priorityB as number) - (priorityA as number);
    });

    for (const rule of sortedRules) {
      if (this.evaluateRule(rule, userContext)) {
        return rule.value;
      }
    }

    return flag.defaultValue;
  }

  /**
   * Evaluate a single rule
   */
  private evaluateRule(
    rule: NonNullable<FeatureFlag['rules']>[0],
    userContext: UserContext
  ): boolean {
    switch (rule.condition) {
      case 'user_id':
        return this.evaluateCondition(
          userContext.userId,
          rule.value,
          rule.operator
        );
      case 'role':
        return this.evaluateCondition(
          userContext.role,
          rule.value,
          rule.operator
        );
      case 'environment':
        return this.evaluateCondition(
          this.config.environment,
          rule.value,
          rule.operator
        );
      case 'percentage':
        return this.evaluatePercentage(
          userContext.userId,
          rule.value as number
        );
      default:
        return false;
    }
  }

  /**
   * Evaluate condition with operator
   */
  private evaluateCondition(
    actual: unknown,
    expected: unknown,
    operator: string
  ): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'not_equals':
        return actual !== expected;
      case 'contains':
        return String(actual).includes(String(expected));
      case 'greater_than':
        return Number(actual) > Number(expected);
      case 'less_than':
        return Number(actual) < Number(expected);
      default:
        return false;
    }
  }

  /**
   * Evaluate percentage-based rule
   */
  private evaluatePercentage(
    userId: string | undefined,
    percentage: number
  ): boolean {
    if (userId == null || userId === '') return false;

    // Simple hash-based percentage calculation
    const hash = this.hashString(userId);
    const userPercentage = hash % 100;

    return userPercentage < percentage;
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Create new feature flag
   */
  async createFlag(
    flagData: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>
  ): Promise<FeatureFlag> {
    try {
      const validatedFlag = FeatureFlagSchema.parse({
        ...flagData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      this.flags.set(validatedFlag.key, validatedFlag);
      this.logger.log(`Feature flag created: ${validatedFlag.key}`);

      return validatedFlag;
    } catch (error) {
      this.logger.error('Error creating feature flag:', error);
      throw error;
    }
  }

  /**
   * Update feature flag
   */
  async updateFlag(
    flagKey: string,
    updates: Partial<FeatureFlag>
  ): Promise<FeatureFlag | null> {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      return null;
    }

    const updatedFlag = FeatureFlagSchema.parse({
      ...flag,
      ...updates,
      updatedAt: new Date(),
    });

    this.flags.set(flagKey, updatedFlag);
    this.logger.log(`Feature flag updated: ${flagKey}`);

    // Clear cache
    this.clearCache();

    return updatedFlag;
  }

  /**
   * Delete feature flag
   */
  async deleteFlag(flagKey: string): Promise<boolean> {
    const deleted = this.flags.delete(flagKey);
    if (deleted) {
      this.logger.log(`Feature flag deleted: ${flagKey}`);
      this.clearCache();
    }
    return deleted;
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.flags.values());
  }

  /**
   * Get feature flag by key
   */
  async getFlag(flagKey: string): Promise<FeatureFlag | null> {
    return this.flags.get(flagKey) ?? null;
  }

  /**
   * Clear cache
   */
  private clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // TODO: Implement hit rate calculation
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test basic functionality
      const testFlag = await this.isEnabled('new-ui-enabled', {
        userId: 'test',
      });
      return typeof testFlag === 'boolean';
    } catch (error) {
      this.logger.error('Feature flags health check failed:', error);
      return false;
    }
  }
}
