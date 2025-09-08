import type { OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import { RedisService } from '../redis/redis.service';

export interface ConfigChangeEvent {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: Date;
  source: 'redis' | 'file' | 'api';
}

export interface HotReloadConfig {
  enabled: boolean;
  watchInterval: number; // milliseconds
  maxFileSize: number; // bytes
  allowedExtensions: string[];
  enableNotifications: boolean;
  backupChanges: boolean;
}

export interface ConfigWatcher {
  id: string;
  pattern: string;
  callback: (event: ConfigChangeEvent) => void;
  isActive: boolean;
}

@Injectable()
export class HotReloadConfigService implements OnModuleInit {
  private readonly logger = new Logger(HotReloadConfigService.name);
  private readonly config: HotReloadConfig;
  private readonly watchers: Map<string, ConfigWatcher> = new Map();
  private readonly configCache: Map<string, unknown> = new Map();
  private readonly changeHistory: ConfigChangeEvent[] = [];
  private readonly eventEmitter = new EventEmitter();
  private watchInterval?: NodeJS.Timeout;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService
  ) {
    this.config = {
      enabled: this.configService.get('HOT_RELOAD_ENABLED', 'true') === 'true',
      watchInterval: parseInt(
        this.configService.get('HOT_RELOAD_WATCH_INTERVAL', '5000')
      ),
      maxFileSize: parseInt(
        this.configService.get('HOT_RELOAD_MAX_FILE_SIZE', '1048576')
      ), // 1MB
      allowedExtensions: this.configService
        .get('HOT_RELOAD_ALLOWED_EXTENSIONS', 'json,yaml,yml,env')
        .split(','),
      enableNotifications:
        this.configService.get('HOT_RELOAD_NOTIFICATIONS', 'true') === 'true',
      backupChanges:
        this.configService.get('HOT_RELOAD_BACKUP', 'true') === 'true',
    };
  }

  async onModuleInit(): Promise<void> {
    if (this.config.enabled) {
      await this.initializeHotReload();
      this.logger.log('Hot reload configuration service initialized');
    } else {
      this.logger.log('Hot reload configuration service disabled');
    }
  }

  /**
   * Initialize hot reload functionality
   */
  private async initializeHotReload(): Promise<void> {
    try {
      // Load initial configuration
      await this.loadConfigurationFromRedis();

      // Start watching for changes
      this.startWatching();

      // Set up event listeners
      this.setupEventListeners();

      this.logger.log('Hot reload configuration initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing hot reload configuration:', error);
    }
  }

  /**
   * Load configuration from Redis
   */
  private async loadConfigurationFromRedis(): Promise<void> {
    try {
      const configKeys = await this.redisService.keys('config:*');

      for (const key of configKeys) {
        const configValue = await this.redisService.get(key);
        if (configValue != null && configValue !== '') {
          const configKey = key.replace('config:', '');
          this.configCache.set(configKey, JSON.parse(configValue));
        }
      }

      this.logger.log(
        `Loaded ${configKeys.length} configuration items from Redis`
      );
    } catch (error) {
      this.logger.error('Error loading configuration from Redis:', error);
    }
  }

  /**
   * Start watching for configuration changes
   */
  private startWatching(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
    }

    this.watchInterval = setInterval(() => {
      void this.checkForChanges();
    }, this.config.watchInterval);

    this.logger.log(
      `Started watching for configuration changes every ${this.config.watchInterval}ms`
    );
  }

  /**
   * Check for configuration changes
   */
  private async checkForChanges(): Promise<void> {
    try {
      const configKeys = await this.redisService.keys('config:*');

      for (const key of configKeys) {
        const configKey = key.replace('config:', '');
        const newValue = await this.redisService.get(key);

        if (newValue != null && newValue !== '') {
          const parsedValue = JSON.parse(newValue);
          const oldValue = this.configCache.get(configKey);

          if (JSON.stringify(oldValue) !== JSON.stringify(parsedValue)) {
            await this.handleConfigChange(
              configKey,
              oldValue,
              parsedValue,
              'redis'
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Error checking for configuration changes:', error);
    }
  }

  /**
   * Handle configuration change
   */
  private async handleConfigChange(
    key: string,
    oldValue: unknown,
    newValue: unknown,
    source: 'redis' | 'file' | 'api'
  ): Promise<void> {
    try {
      const changeEvent: ConfigChangeEvent = {
        key,
        oldValue,
        newValue,
        timestamp: new Date(),
        source,
      };

      // Update cache
      this.configCache.set(key, newValue);

      // Add to history
      this.changeHistory.push(changeEvent);
      if (this.changeHistory.length > 100) {
        this.changeHistory.shift();
      }

      // Backup if enabled
      if (this.config.backupChanges) {
        await this.backupConfiguration(key, oldValue, newValue);
      }

      // Emit event
      this.eventEmitter.emit('config.changed', changeEvent);

      // Notify watchers
      await this.notifyWatchers(changeEvent);

      // Log change
      this.logger.log(`Configuration changed: ${key} (${source})`);

      if (this.config.enableNotifications) {
        await this.sendNotification(changeEvent);
      }
    } catch (error) {
      this.logger.error(
        `Error handling configuration change for ${key}:`,
        error
      );
    }
  }

  /**
   * Update configuration value
   */
  async updateConfig(key: string, value: unknown): Promise<boolean> {
    try {
      const oldValue = this.configCache.get(key);

      // Store in Redis
      await this.redisService.set(`config:${key}`, JSON.stringify(value), 0);

      // Handle change
      await this.handleConfigChange(key, oldValue, value, 'api');

      return true;
    } catch (error) {
      this.logger.error(`Error updating configuration ${key}:`, error);
      return false;
    }
  }

  /**
   * Get configuration value
   */
  getConfig<T = unknown>(key: string, defaultValue?: T): T {
    const value = this.configCache.get(key);
    return value !== undefined ? (value as T) : (defaultValue as T);
  }

  /**
   * Get all configuration keys
   */
  getAllConfigKeys(): string[] {
    return Array.from(this.configCache.keys());
  }

  /**
   * Get configuration change history
   */
  getChangeHistory(limit = 50): ConfigChangeEvent[] {
    return this.changeHistory.slice(-limit);
  }

  /**
   * Add configuration watcher
   */
  addWatcher(
    pattern: string,
    callback: (event: ConfigChangeEvent) => void
  ): string {
    const watcherId = `watcher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const watcher: ConfigWatcher = {
      id: watcherId,
      pattern,
      callback,
      isActive: true,
    };

    this.watchers.set(watcherId, watcher);
    this.logger.log(`Added configuration watcher: ${pattern} (${watcherId})`);

    return watcherId;
  }

  /**
   * Remove configuration watcher
   */
  removeWatcher(watcherId: string): boolean {
    const watcher = this.watchers.get(watcherId);
    if (watcher) {
      watcher.isActive = false;
      this.watchers.delete(watcherId);
      this.logger.log(`Removed configuration watcher: ${watcherId}`);
      return true;
    }
    return false;
  }

  /**
   * Get all active watchers
   */
  getActiveWatchers(): ConfigWatcher[] {
    return Array.from(this.watchers.values()).filter(w => w.isActive);
  }

  /**
   * Reload configuration from source
   */
  async reloadConfiguration(): Promise<boolean> {
    try {
      this.logger.log('Reloading configuration...');

      // Clear cache
      this.configCache.clear();

      // Reload from Redis
      await this.loadConfigurationFromRedis();

      // Emit reload event
      this.eventEmitter.emit('config.reloaded');

      this.logger.log('Configuration reloaded successfully');
      return true;
    } catch (error) {
      this.logger.error('Error reloading configuration:', error);
      return false;
    }
  }

  /**
   * Validate configuration value
   */
  validateConfigValue(key: string, value: unknown): boolean {
    try {
      // Basic validation - can be extended with schemas
      if (value === null || value === undefined) {
        return false;
      }

      // Check file size if it's a file path
      if (typeof value === 'string' && value.includes('/')) {
        // This would need file system access to implement properly
        return true;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Error validating configuration value for ${key}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get service statistics
   */
  getServiceStats(): {
    enabled: boolean;
    watchersCount: number;
    cachedConfigsCount: number;
    changeHistoryCount: number;
    lastChangeTime?: Date;
  } {
    const lastChange =
      this.changeHistory.length > 0
        ? this.changeHistory[this.changeHistory.length - 1]?.timestamp
        : undefined;

    const result: {
      enabled: boolean;
      watchersCount: number;
      cachedConfigsCount: number;
      changeHistoryCount: number;
      lastChangeTime?: Date;
    } = {
      enabled: this.config.enabled,
      watchersCount: this.getActiveWatchers().length,
      cachedConfigsCount: this.configCache.size,
      changeHistoryCount: this.changeHistory.length,
    };

    if (lastChange) {
      result.lastChangeTime = lastChange;
    }

    return result;
  }

  // Private helper methods

  private setupEventListeners(): void {
    // Listen for Redis pub/sub events
    this.eventEmitter.on(
      'redis.message',
      (channel: string, message: string) => {
        if (channel.startsWith('config:')) {
          const key = channel.replace('config:', '');
          const newValue = JSON.parse(message);
          const oldValue = this.configCache.get(key);

          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            void this.handleConfigChange(key, oldValue, newValue, 'redis');
          }
        }
      }
    );
  }

  private async notifyWatchers(event: ConfigChangeEvent): Promise<void> {
    const activeWatchers = this.getActiveWatchers();

    for (const watcher of activeWatchers) {
      try {
        if (this.matchesPattern(event.key, watcher.pattern)) {
          watcher.callback(event);
        }
      } catch (error) {
        this.logger.error(`Error notifying watcher ${watcher.id}:`, error);
      }
    }
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Simple pattern matching - can be extended with regex support
    if (pattern === '*' || pattern === key) {
      return true;
    }

    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\*/g, '.*');
      return new RegExp(`^${regexPattern}$`).test(key);
    }

    return key.includes(pattern);
  }

  private async backupConfiguration(
    key: string,
    oldValue: unknown,
    newValue: unknown
  ): Promise<void> {
    try {
      const backupKey = `config_backup:${key}:${Date.now()}`;
      const backupData = {
        key,
        oldValue,
        newValue,
        timestamp: new Date(),
        source: 'hot_reload',
      };

      await this.redisService.set(
        backupKey,
        JSON.stringify(backupData),
        86400 * 7
      ); // 7 days TTL
    } catch (error) {
      this.logger.error(`Error backing up configuration for ${key}:`, error);
    }
  }

  private async sendNotification(event: ConfigChangeEvent): Promise<void> {
    try {
      // This would integrate with notification services (Slack, Email, etc.)
      this.logger.log(
        `Configuration change notification: ${event.key} changed via ${event.source}`
      );
    } catch (error) {
      this.logger.error(
        'Error sending configuration change notification:',
        error
      );
    }
  }

  onModuleDestroy(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
    }
  }
}
