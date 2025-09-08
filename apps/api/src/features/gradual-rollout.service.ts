import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { RedisService } from '../redis/redis.service';

export interface RolloutRule {
  id: string;
  featureKey: string;
  percentage: number; // 0-100
  targetAudience: {
    userIds?: string[];
    roles?: string[];
    environments?: string[];
    regions?: string[];
    userSegments?: string[];
  };
  conditions?: {
    timeWindow?: {
      startTime: string; // HH:mm format
      endTime: string; // HH:mm format
      timezone: string;
    };
    dateRange?: {
      startDate: Date;
      endDate: Date;
    };
    customRules?: Record<string, unknown>;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RolloutMetrics {
  totalUsers: number;
  enabledUsers: number;
  disabledUsers: number;
  conversionRate: number;
  errorRate: number;
  lastUpdated: Date;
}

export interface RolloutEvent {
  type:
    | 'feature_enabled'
    | 'feature_disabled'
    | 'rollout_started'
    | 'rollout_completed'
    | 'rollout_paused';
  featureKey: string;
  userId?: string;
  ruleId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface GradualRolloutConfig {
  defaultRolloutDuration: number; // days
  maxRolloutPercentage: number; // 100
  enableAgressiveRollout: boolean;
  enableRollback: boolean;
  maxConcurrentRollouts: number;
}

@Injectable()
export class GradualRolloutService {
  private readonly logger = new Logger(GradualRolloutService.name);
  private readonly config: GradualRolloutConfig;
  private readonly activeRollouts: Map<string, RolloutRule> = new Map();
  private readonly eventEmitter = new EventEmitter();

  constructor(private readonly redisService: RedisService) {
    this.config = {
      defaultRolloutDuration: 7,
      maxRolloutPercentage: 100,
      enableAgressiveRollout: false,
      enableRollback: true,
      maxConcurrentRollouts: 10,
    };
  }

  /**
   * Create new rollout rule
   */
  async createRolloutRule(
    ruleData: Omit<RolloutRule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<RolloutRule> {
    try {
      const rule: RolloutRule = {
        ...ruleData,
        id: this.generateRuleId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.storeRolloutRule(rule);

      if (rule.isActive) {
        this.activeRollouts.set(rule.featureKey, rule);
      }

      this.logger.log(
        `Rollout rule created: ${rule.featureKey} (${rule.percentage}%)`
      );

      // Emit event
      this.eventEmitter.emit('rollout.rule.created', rule);

      return rule;
    } catch (error) {
      this.logger.error('Error creating rollout rule:', error);
      throw error;
    }
  }

  /**
   * Get rollout rule by ID
   */
  async getRolloutRule(ruleId: string): Promise<RolloutRule | null> {
    try {
      const key = `rollout_rule:${ruleId}`;
      const serializedRule = await this.redisService.get(key);

      if (serializedRule == null || serializedRule === '') {
        return null;
      }

      return JSON.parse(serializedRule) as RolloutRule;
    } catch (error) {
      this.logger.error(`Error retrieving rollout rule ${ruleId}:`, error);
      return null;
    }
  }

  /**
   * Get all active rollout rules
   */
  async getActiveRolloutRules(): Promise<RolloutRule[]> {
    try {
      const keys = await this.redisService.keys('rollout_rule:*');
      const rules: RolloutRule[] = [];

      for (const key of keys) {
        const rule = await this.getRolloutRule(
          key.replace('rollout_rule:', '')
        );
        if (rule?.isActive === true) {
          rules.push(rule);
        }
      }

      return rules;
    } catch (error) {
      this.logger.error('Error retrieving active rollout rules:', error);
      return [];
    }
  }

  /**
   * Check if feature is enabled for user
   */
  async isFeatureEnabled(
    featureKey: string,
    userId: string,
    context?: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const rule = this.activeRollouts.get(featureKey);
      if (!rule) {
        return false;
      }

      // Check if user is in target audience
      if (!this.isUserInTargetAudience(rule, userId, context)) {
        return false;
      }

      // Check time conditions
      if (!this.checkTimeConditions(rule)) {
        return false;
      }

      // Check date conditions
      if (!this.checkDateConditions(rule)) {
        return false;
      }

      // Check custom rules
      if (!this.checkCustomRules(rule, context)) {
        return false;
      }

      // Determine if user should get the feature based on percentage
      const isEnabled = this.shouldEnableFeature(rule, userId);

      // Record metrics
      await this.recordRolloutMetrics(featureKey, userId, isEnabled);

      // Emit event
      this.eventEmitter.emit('rollout.feature_checked', {
        type: isEnabled ? 'feature_enabled' : 'feature_disabled',
        featureKey,
        userId,
        ruleId: rule.id,
        timestamp: new Date(),
      });

      return isEnabled;
    } catch (error) {
      this.logger.error(
        `Error checking feature ${featureKey} for user ${userId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Update rollout rule
   */
  async updateRolloutRule(
    ruleId: string,
    updates: Partial<RolloutRule>
  ): Promise<RolloutRule | null> {
    try {
      const rule = await this.getRolloutRule(ruleId);
      if (!rule) {
        return null;
      }

      const updatedRule = { ...rule, ...updates, updatedAt: new Date() };
      await this.storeRolloutRule(updatedRule);

      // Update active rollouts map
      if (updatedRule.isActive) {
        this.activeRollouts.set(updatedRule.featureKey, updatedRule);
      } else {
        this.activeRollouts.delete(updatedRule.featureKey);
      }

      this.logger.log(
        `Rollout rule updated: ${updatedRule.featureKey} (${ruleId})`
      );

      // Emit event
      this.eventEmitter.emit('rollout.rule.updated', updatedRule);

      return updatedRule;
    } catch (error) {
      this.logger.error(`Error updating rollout rule ${ruleId}:`, error);
      return null;
    }
  }

  /**
   * Delete rollout rule
   */
  async deleteRolloutRule(ruleId: string): Promise<boolean> {
    try {
      const rule = await this.getRolloutRule(ruleId);
      if (!rule) {
        return false;
      }

      await this.redisService.del(`rollout_rule:${ruleId}`);

      // Remove from active rollouts
      this.activeRollouts.delete(rule.featureKey);

      this.logger.log(`Rollout rule deleted: ${rule.featureKey} (${ruleId})`);

      // Emit event
      this.eventEmitter.emit('rollout.rule.deleted', rule);

      return true;
    } catch (error) {
      this.logger.error(`Error deleting rollout rule ${ruleId}:`, error);
      return false;
    }
  }

  /**
   * Pause rollout for feature
   */
  async pauseRollout(featureKey: string): Promise<boolean> {
    try {
      const rule = this.activeRollouts.get(featureKey);
      if (!rule) {
        return false;
      }

      rule.isActive = false;
      await this.storeRolloutRule(rule);

      this.activeRollouts.delete(featureKey);

      this.logger.log(`Rollout paused for feature: ${featureKey}`);

      // Emit event
      this.eventEmitter.emit('rollout.paused', {
        type: 'rollout_paused',
        featureKey,
        ruleId: rule.id,
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      this.logger.error(
        `Error pausing rollout for feature ${featureKey}:`,
        error
      );
      return false;
    }
  }

  /**
   * Resume rollout for feature
   */
  async resumeRollout(featureKey: string): Promise<boolean> {
    try {
      const rule = await this.getRolloutRuleByFeature(featureKey);
      if (!rule) {
        return false;
      }

      rule.isActive = true;
      await this.storeRolloutRule(rule);

      this.activeRollouts.set(featureKey, rule);

      this.logger.log(`Rollout resumed for feature: ${featureKey}`);

      // Emit event
      this.eventEmitter.emit('rollout.resumed', {
        type: 'rollout_started',
        featureKey,
        ruleId: rule.id,
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      this.logger.error(
        `Error resuming rollout for feature ${featureKey}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get rollout metrics for feature
   */
  async getRolloutMetrics(featureKey: string): Promise<RolloutMetrics | null> {
    try {
      const key = `rollout_metrics:${featureKey}`;
      const serializedMetrics = await this.redisService.get(key);

      if (serializedMetrics == null || serializedMetrics === '') {
        return null;
      }

      return JSON.parse(serializedMetrics) as RolloutMetrics;
    } catch (error) {
      this.logger.error(
        `Error retrieving rollout metrics for ${featureKey}:`,
        error
      );
      return null;
    }
  }

  /**
   * Get rollout analytics
   */
  async getRolloutAnalytics(featureKey: string): Promise<{
    currentPercentage: number;
    totalUsers: number;
    enabledUsers: number;
    conversionRate: number;
    errorRate: number;
    rolloutDuration: number;
    estimatedCompletion: Date;
  } | null> {
    try {
      const rule = this.activeRollouts.get(featureKey);
      if (!rule) {
        return null;
      }

      const metrics = await this.getRolloutMetrics(featureKey);
      if (!metrics) {
        return null;
      }

      const currentPercentage =
        metrics.totalUsers > 0
          ? (metrics.enabledUsers / metrics.totalUsers) * 100
          : 0;
      const rolloutDuration = Math.ceil(
        (new Date().getTime() - rule.createdAt.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // Estimate completion date
      const estimatedCompletion = new Date();
      if (currentPercentage > 0 && currentPercentage < rule.percentage) {
        const remainingDays = Math.ceil(
          (rule.percentage - currentPercentage) /
            (currentPercentage / rolloutDuration)
        );
        estimatedCompletion.setDate(
          estimatedCompletion.getDate() + remainingDays
        );
      }

      return {
        currentPercentage,
        totalUsers: metrics.totalUsers,
        enabledUsers: metrics.enabledUsers,
        conversionRate: metrics.conversionRate,
        errorRate: metrics.errorRate,
        rolloutDuration,
        estimatedCompletion,
      };
    } catch (error) {
      this.logger.error(
        `Error getting rollout analytics for ${featureKey}:`,
        error
      );
      return null;
    }
  }

  /**
   * Get all rollout events
   */
  async getRolloutEvents(
    featureKey?: string,
    limit = 100
  ): Promise<RolloutEvent[]> {
    try {
      const pattern =
        featureKey != null && featureKey !== ''
          ? `rollout_event:${featureKey}:*`
          : 'rollout_event:*';
      const keys = await this.redisService.keys(pattern);

      const events: RolloutEvent[] = [];

      for (const key of keys.slice(-limit)) {
        const event = await this.redisService.get(key);
        if (event != null && event !== '') {
          events.push(JSON.parse(event));
        }
      }

      return events.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );
    } catch (error) {
      this.logger.error('Error retrieving rollout events:', error);
      return [];
    }
  }

  /**
   * Get service statistics
   */
  getServiceStats(): {
    activeRollouts: number;
    totalRules: number;
    maxConcurrentRollouts: number;
    enableRollback: boolean;
  } {
    return {
      activeRollouts: this.activeRollouts.size,
      totalRules: this.activeRollouts.size,
      maxConcurrentRollouts: this.config.maxConcurrentRollouts,
      enableRollback: this.config.enableRollback,
    };
  }

  // Private helper methods

  private async storeRolloutRule(rule: RolloutRule): Promise<void> {
    const key = `rollout_rule:${rule.id}`;
    await this.redisService.set(key, JSON.stringify(rule), 0);
  }

  private generateRuleId(): string {
    return `rollout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isUserInTargetAudience(
    rule: RolloutRule,
    userId: string,
    context?: Record<string, unknown>
  ): boolean {
    const { targetAudience } = rule;

    if (
      targetAudience.userIds != null &&
      targetAudience.userIds.length > 0 &&
      !targetAudience.userIds.includes(userId)
    ) {
      return false;
    }

    if (
      targetAudience.roles != null &&
      context?.role != null &&
      !targetAudience.roles.includes(context.role as string)
    ) {
      return false;
    }

    if (
      targetAudience.environments != null &&
      context?.environment != null &&
      !targetAudience.environments.includes(context.environment as string)
    ) {
      return false;
    }

    if (
      targetAudience.regions != null &&
      context?.region != null &&
      !targetAudience.regions.includes(context.region as string)
    ) {
      return false;
    }

    if (
      targetAudience.userSegments != null &&
      context?.userSegment != null &&
      !targetAudience.userSegments.includes(context.userSegment as string)
    ) {
      return false;
    }

    return true;
  }

  private checkTimeConditions(rule: RolloutRule): boolean {
    if (rule.conditions?.timeWindow == null) {
      return true;
    }

    const { timeWindow } = rule.conditions;
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      timeZone: timeWindow.timezone || 'UTC',
    });

    return (
      currentTime >= timeWindow.startTime && currentTime <= timeWindow.endTime
    );
  }

  private checkDateConditions(rule: RolloutRule): boolean {
    if (rule.conditions?.dateRange == null) {
      return true;
    }

    const { dateRange } = rule.conditions;
    const now = new Date();

    return now >= dateRange.startDate && now <= dateRange.endDate;
  }

  private checkCustomRules(
    rule: RolloutRule,
    context?: Record<string, unknown>
  ): boolean {
    if (rule.conditions?.customRules == null || context == null) {
      return true;
    }

    // Implement custom rule evaluation logic here
    // This is a placeholder for complex rule evaluation
    return true;
  }

  private shouldEnableFeature(rule: RolloutRule, userId: string): boolean {
    // Use consistent hashing for user assignment
    const hash = this.hashString(`${userId}_${rule.featureKey}`);
    const normalizedHash = hash % 100;

    return normalizedHash < rule.percentage;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private async recordRolloutMetrics(
    featureKey: string,
    userId: string,
    isEnabled: boolean
  ): Promise<void> {
    try {
      const key = `rollout_metrics:${featureKey}`;
      let metrics = await this.getRolloutMetrics(featureKey);

      metrics ??= {
        totalUsers: 0,
        enabledUsers: 0,
        disabledUsers: 0,
        conversionRate: 0,
        errorRate: 0,
        lastUpdated: new Date(),
      };

      // Check if user was already counted
      const userKey = `rollout_user:${featureKey}:${userId}`;
      const existingUser = await this.redisService.exists(userKey);

      if (existingUser === 0) {
        metrics.totalUsers++;
        await this.redisService.set(
          userKey,
          JSON.stringify({ timestamp: new Date(), enabled: isEnabled }),
          86400 * 365
        );

        if (isEnabled) {
          metrics.enabledUsers++;
        } else {
          metrics.disabledUsers++;
        }

        metrics.lastUpdated = new Date();

        await this.redisService.set(key, JSON.stringify(metrics), 0);
      }
    } catch (error) {
      this.logger.error(
        `Error recording rollout metrics for ${featureKey}:`,
        error
      );
    }
  }

  private async getRolloutRuleByFeature(
    featureKey: string
  ): Promise<RolloutRule | null> {
    const keys = await this.redisService.keys('rollout_rule:*');

    for (const key of keys) {
      const rule = await this.getRolloutRule(key.replace('rollout_rule:', ''));
      if (rule && rule.featureKey === featureKey) {
        return rule;
      }
    }

    return null;
  }
}
