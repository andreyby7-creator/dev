import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface ABTestVariant {
  id: string;
  name: string;
  weight: number; // percentage from 0 to 100
  config: Record<string, unknown>;
  isActive: boolean;
}

export interface ABTest {
  id: string;
  name: string;
  description?: string;
  variants: ABTestVariant[];
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  targetAudience?: {
    userIds?: string[];
    roles?: string[];
    environments?: string[];
    percentage?: number;
  };
  metrics: {
    impressions: number;
    conversions: number;
    revenue: number;
  };
}

export interface ABTestResult {
  variantId: string;
  variantName: string;
  impressions: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  revenuePerUser: number;
  statisticalSignificance: number;
}

export interface ABTestConfig {
  defaultTestDuration: number; // days
  minSampleSize: number;
  confidenceLevel: number; // 0.95 for 95% confidence
  enableAutoOptimization: boolean;
}

@Injectable()
export class ABTestingService {
  private readonly logger = new Logger(ABTestingService.name);
  private readonly config: ABTestConfig;

  constructor(private readonly redisService: RedisService) {
    this.config = {
      defaultTestDuration: 30,
      minSampleSize: 100,
      confidenceLevel: 0.95,
      enableAutoOptimization: true,
    };
  }

  /**
   * Create new A/B test
   */
  async createTest(
    testData: Omit<ABTest, 'id' | 'startDate' | 'metrics'>
  ): Promise<ABTest> {
    try {
      const test: ABTest = {
        ...testData,
        id: this.generateTestId(),
        startDate: new Date(),
        metrics: {
          impressions: 0,
          conversions: 0,
          revenue: 0,
        },
      };

      await this.storeTest(test);
      this.logger.log(`A/B test created: ${test.name} (${test.id})`);

      return test;
    } catch (error) {
      this.logger.error('Error creating A/B test:', error);
      throw error;
    }
  }

  /**
   * Get A/B test by ID
   */
  async getTest(testId: string): Promise<ABTest | null> {
    try {
      const key = `ab_test:${testId}`;
      const serializedTest = await this.redisService.get(key);

      if (serializedTest == null || serializedTest === '') {
        return null;
      }

      return JSON.parse(serializedTest) as ABTest;
    } catch (error) {
      this.logger.error(`Error retrieving A/B test ${testId}:`, error);
      return null;
    }
  }

  /**
   * Get all active A/B tests
   */
  async getActiveTests(): Promise<ABTest[]> {
    try {
      const keys = await this.redisService.keys('ab_test:*');
      const tests: ABTest[] = [];

      for (const key of keys) {
        const test = await this.getTest(key.replace('ab_test:', ''));
        if (test?.isActive === true) {
          tests.push(test);
        }
      }

      return tests;
    } catch (error) {
      this.logger.error('Error retrieving active A/B tests:', error);
      return [];
    }
  }

  /**
   * Assign user to test variant
   */
  async assignUserToVariant(
    testId: string,
    userId: string,
    context?: Record<string, unknown>
  ): Promise<ABTestVariant | null> {
    try {
      const test = await this.getTest(testId);
      if (test?.isActive !== true) {
        return null;
      }

      // Check if user is in target audience
      if (!this.isUserInTargetAudience(test, userId, context)) {
        return null;
      }

      // Use consistent hashing for user assignment
      const variant = this.selectVariantForUser(test, userId);
      if (!variant) {
        return null;
      }

      // Record impression
      await this.recordImpression(testId, variant.id, userId);

      this.logger.log(
        `User ${userId} assigned to variant ${variant.name} in test ${test.name}`
      );

      return variant;
    } catch (error) {
      this.logger.error(
        `Error assigning user ${userId} to test ${testId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Record conversion for A/B test
   */
  async recordConversion(
    testId: string,
    variantId: string,
    userId: string,
    revenue = 0
  ): Promise<void> {
    try {
      const test = await this.getTest(testId);
      if (!test) {
        return;
      }

      const key = `ab_test_conversion:${testId}:${variantId}:${userId}`;
      const hasConverted = await this.redisService.exists(key);

      if (hasConverted) {
        return; // User already converted
      }

      // Record conversion
      await this.redisService.set(
        key,
        JSON.stringify({ timestamp: new Date(), revenue }),
        86400 * 365
      ); // 1 year TTL

      // Update test metrics
      test.metrics.conversions++;
      test.metrics.revenue += revenue;

      await this.storeTest(test);

      this.logger.log(
        `Conversion recorded for user ${userId} in test ${testId}, variant ${variantId}`
      );
    } catch (error) {
      this.logger.error(
        `Error recording conversion for test ${testId}:`,
        error
      );
    }
  }

  /**
   * Get test results and statistics
   */
  async getTestResults(testId: string): Promise<ABTestResult[]> {
    try {
      const test = await this.getTest(testId);
      if (!test) {
        return [];
      }

      const results: ABTestResult[] = [];

      for (const variant of test.variants) {
        const variantMetrics = await this.getVariantMetrics(testId, variant.id);

        const result: ABTestResult = {
          variantId: variant.id,
          variantName: variant.name,
          impressions: variantMetrics.impressions,
          conversions: variantMetrics.conversions,
          conversionRate:
            variantMetrics.impressions > 0
              ? variantMetrics.conversions / variantMetrics.impressions
              : 0,
          revenue: variantMetrics.revenue,
          revenuePerUser:
            variantMetrics.conversions > 0
              ? variantMetrics.revenue / variantMetrics.conversions
              : 0,
          statisticalSignificance: this.calculateStatisticalSignificance(
            variantMetrics,
            test.metrics
          ),
        };

        results.push(result);
      }

      return results;
    } catch (error) {
      this.logger.error(`Error getting test results for ${testId}:`, error);
      return [];
    }
  }

  /**
   * Stop A/B test
   */
  async stopTest(testId: string): Promise<boolean> {
    try {
      const test = await this.getTest(testId);
      if (!test) {
        return false;
      }

      test.isActive = false;
      test.endDate = new Date();

      await this.storeTest(test);

      this.logger.log(`A/B test stopped: ${test.name} (${test.id})`);

      return true;
    } catch (error) {
      this.logger.error(`Error stopping A/B test ${testId}:`, error);
      return false;
    }
  }

  /**
   * Update test configuration
   */
  async updateTest(
    testId: string,
    updates: Partial<ABTest>
  ): Promise<ABTest | null> {
    try {
      const test = await this.getTest(testId);
      if (!test) {
        return null;
      }

      const updatedTest = { ...test, ...updates, updatedAt: new Date() };
      await this.storeTest(updatedTest);

      this.logger.log(`A/B test updated: ${test.name} (${testId})`);

      return updatedTest;
    } catch (error) {
      this.logger.error(`Error updating A/B test ${testId}:`, error);
      return null;
    }
  }

  /**
   * Get test analytics
   */
  async getTestAnalytics(testId: string): Promise<{
    totalUsers: number;
    totalImpressions: number;
    totalConversions: number;
    totalRevenue: number;
    averageConversionRate: number;
    testDuration: number;
    isStatisticallySignificant: boolean;
  }> {
    try {
      const test = await this.getTest(testId);
      if (!test) {
        throw new Error('Test not found');
      }

      const results = await this.getTestResults(testId);
      const totalImpressions = results.reduce(
        (sum, r) => sum + r.impressions,
        0
      );
      const totalConversions = results.reduce(
        (sum, r) => sum + r.conversions,
        0
      );
      const totalRevenue = results.reduce((sum, r) => sum + r.revenue, 0);

      const now = new Date();
      const testDuration = Math.ceil(
        (now.getTime() - test.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        totalUsers: totalImpressions,
        totalImpressions,
        totalConversions,
        totalRevenue,
        averageConversionRate:
          totalImpressions > 0 ? totalConversions / totalImpressions : 0,
        testDuration,
        isStatisticallySignificant:
          this.isTestStatisticallySignificant(results),
      };
    } catch (error) {
      this.logger.error(`Error getting test analytics for ${testId}:`, error);
      throw error;
    }
  }

  // Private helper methods

  private async storeTest(test: ABTest): Promise<void> {
    const key = `ab_test:${test.id}`;
    await this.redisService.set(key, JSON.stringify(test), 86400 * 365); // 1 year TTL
  }

  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isUserInTargetAudience(
    test: ABTest,
    userId: string,
    context?: Record<string, unknown>
  ): boolean {
    if (!test.targetAudience) {
      return true;
    }

    const { targetAudience } = test;

    if (targetAudience.userIds && !targetAudience.userIds.includes(userId)) {
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
      targetAudience.percentage != null &&
      targetAudience.percentage > 0 &&
      Math.random() * 100 > targetAudience.percentage
    ) {
      return false;
    }

    return true;
  }

  private selectVariantForUser(
    test: ABTest,
    userId: string
  ): ABTestVariant | null {
    const activeVariants = test.variants.filter(v => v.isActive);
    if (activeVariants.length === 0) {
      return null;
    }

    // Use consistent hashing based on user ID and test ID
    const hash = this.hashString(`${userId}_${test.id}`);
    const normalizedHash = hash % 100;

    let cumulativeWeight = 0;
    for (const variant of activeVariants) {
      cumulativeWeight += variant.weight;
      if (normalizedHash < cumulativeWeight) {
        return variant;
      }
    }

    return activeVariants[activeVariants.length - 1] ?? null;
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

  private async recordImpression(
    testId: string,
    variantId: string,
    userId: string
  ): Promise<void> {
    const key = `ab_test_impression:${testId}:${variantId}:${userId}`;
    const hasImpression = await this.redisService.exists(key);

    if (!hasImpression) {
      await this.redisService.set(
        key,
        JSON.stringify({ timestamp: new Date() }),
        86400 * 365
      );

      // Update test metrics
      const test = await this.getTest(testId);
      if (test) {
        test.metrics.impressions++;
        await this.storeTest(test);
      }
    }
  }

  private async getVariantMetrics(
    testId: string,
    variantId: string
  ): Promise<{
    impressions: number;
    conversions: number;
    revenue: number;
  }> {
    const impressionKeys = await this.redisService.keys(
      `ab_test_impression:${testId}:${variantId}:*`
    );
    const conversionKeys = await this.redisService.keys(
      `ab_test_conversion:${testId}:${variantId}:*`
    );

    let totalRevenue = 0;
    for (const key of conversionKeys) {
      const conversion = await this.redisService.get(key);
      if (conversion != null && conversion !== '') {
        const data = JSON.parse(conversion);
        totalRevenue +=
          data.revenue != null && !isNaN(data.revenue) ? data.revenue : 0;
      }
    }

    return {
      impressions: impressionKeys.length,
      conversions: conversionKeys.length,
      revenue: totalRevenue,
    };
  }

  private calculateStatisticalSignificance(
    variantMetrics: { impressions: number; conversions: number },
    testMetrics: { impressions: number; conversions: number }
  ): number {
    // Simplified statistical significance calculation
    if (variantMetrics.impressions === 0 || testMetrics.impressions === 0) {
      return 0;
    }

    const variantRate = variantMetrics.conversions / variantMetrics.impressions;
    const testRate = testMetrics.conversions / testMetrics.impressions;

    if (testRate === 0) {
      return variantRate > 0 ? 1 : 0;
    }

    return Math.min(1, variantRate / testRate);
  }

  private isTestStatisticallySignificant(results: ABTestResult[]): boolean {
    if (results.length < 2) {
      return false;
    }

    const totalImpressions = results.reduce((sum, r) => sum + r.impressions, 0);
    return totalImpressions >= this.config.minSampleSize;
  }
}
