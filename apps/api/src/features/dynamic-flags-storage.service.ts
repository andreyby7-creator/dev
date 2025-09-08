import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface DynamicFlag {
  key: string;
  value: unknown;
  type: 'boolean' | 'string' | 'number' | 'json';
  rules?: Array<{
    userId?: string;
    role?: string;
    environment?: string;
    percentage?: number;
  }>;
  ttl?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DynamicFlagStorageConfig {
  defaultTtl: number;
  maxFlags: number;
  enableCompression: boolean;
}

@Injectable()
export class DynamicFlagsStorageService {
  private readonly logger = new Logger(DynamicFlagsStorageService.name);
  private readonly config: DynamicFlagStorageConfig;

  constructor(private readonly redisService: RedisService) {
    this.config = {
      defaultTtl: 3600, // 1 hour
      maxFlags: 1000,
      enableCompression: true,
    };
  }

  /**
   * Store feature flag in Redis
   */
  async storeFlag(flag: DynamicFlag): Promise<void> {
    try {
      const key = `feature_flag:${flag.key}`;
      const serializedFlag = JSON.stringify(flag);

      await this.redisService.set(
        key,
        serializedFlag,
        flag.ttl ?? this.config.defaultTtl
      );

      this.logger.log(`Feature flag stored: ${flag.key}`);
    } catch (error) {
      this.logger.error(`Error storing feature flag ${flag.key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve feature flag from Redis
   */
  async getFlag(flagKey: string): Promise<DynamicFlag | null> {
    try {
      const key = `feature_flag:${flagKey}`;
      const serializedFlag = await this.redisService.get(key);

      if (serializedFlag == null || serializedFlag === '') {
        return null;
      }

      return JSON.parse(serializedFlag) as DynamicFlag;
    } catch (error) {
      this.logger.error(`Error retrieving feature flag ${flagKey}:`, error);
      return null;
    }
  }

  /**
   * Delete feature flag from Redis
   */
  async deleteFlag(flagKey: string): Promise<boolean> {
    try {
      const key = `feature_flag:${flagKey}`;
      const result = await this.redisService.del(key);

      this.logger.log(`Feature flag deleted: ${flagKey}`);
      return result > 0;
    } catch (error) {
      this.logger.error(`Error deleting feature flag ${flagKey}:`, error);
      return false;
    }
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<DynamicFlag[]> {
    try {
      const keys = await this.redisService.keys('feature_flag:*');
      const flags: DynamicFlag[] = [];

      for (const key of keys) {
        const flag = await this.getFlag(key.replace('feature_flag:', ''));
        if (flag) {
          flags.push(flag);
        }
      }

      return flags;
    } catch (error) {
      this.logger.error('Error retrieving all feature flags:', error);
      return [];
    }
  }

  /**
   * Update feature flag TTL
   */
  async updateFlagTtl(flagKey: string, ttl: number): Promise<boolean> {
    try {
      const flag = await this.getFlag(flagKey);
      if (!flag) {
        return false;
      }

      flag.ttl = ttl;
      flag.updatedAt = new Date();

      await this.storeFlag(flag);
      return true;
    } catch (error) {
      this.logger.error(
        `Error updating TTL for feature flag ${flagKey}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get feature flags by pattern
   */
  async getFlagsByPattern(pattern: string): Promise<DynamicFlag[]> {
    try {
      const keys = await this.redisService.keys(`feature_flag:${pattern}`);
      const flags: DynamicFlag[] = [];

      for (const key of keys) {
        const flag = await this.getFlag(key.replace('feature_flag:', ''));
        if (flag) {
          flags.push(flag);
        }
      }

      return flags;
    } catch (error) {
      this.logger.error(`Error retrieving flags by pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Clear expired flags
   */
  async clearExpiredFlags(): Promise<number> {
    try {
      const allFlags = await this.getAllFlags();
      const now = new Date();
      let clearedCount = 0;

      for (const flag of allFlags) {
        if (
          flag.ttl != null &&
          flag.ttl > 0 &&
          flag.createdAt.getTime() + flag.ttl * 1000 < now.getTime()
        ) {
          await this.deleteFlag(flag.key);
          clearedCount++;
        }
      }

      this.logger.log(`Cleared ${clearedCount} expired feature flags`);
      return clearedCount;
    } catch (error) {
      this.logger.error('Error clearing expired feature flags:', error);
      return 0;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalFlags: number;
    totalKeys: number;
    memoryUsage: number;
    compressionEnabled: boolean;
  }> {
    try {
      const keys = await this.redisService.keys('feature_flag:*');
      const totalFlags = keys.length;

      return {
        totalFlags,
        totalKeys: keys.length,
        memoryUsage: 0, // Redis doesn't provide direct memory usage per key
        compressionEnabled: this.config.enableCompression,
      };
    } catch (error) {
      this.logger.error('Error getting storage statistics:', error);
      return {
        totalFlags: 0,
        totalKeys: 0,
        memoryUsage: 0,
        compressionEnabled: this.config.enableCompression,
      };
    }
  }
}
