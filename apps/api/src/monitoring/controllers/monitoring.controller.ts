import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { redactedLogger } from '../../utils/redacted-logger';
import { ConfigCachingService } from '../services/config-caching.service';
import { SelfHealingService } from '../services/self-healing.service';
import { UnifiedMetricsService } from '../services/unified-metrics.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly unifiedMetricsService: UnifiedMetricsService,
    private readonly selfHealingService: SelfHealingService,
    private readonly configCachingService: ConfigCachingService
  ) {}

  // ===== METRICS ENDPOINTS =====

  @Get('metrics')
  async getAllMetrics() {
    try {
      const metrics = this.unifiedMetricsService.getAllMetrics();
      redactedLogger.debug('Retrieved all metrics', 'MonitoringController');
      return {
        success: true,
        data: metrics,
        timestamp: new Date(),
        count: metrics.length,
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to retrieve metrics',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Get('metrics/:name')
  async getMetricsByName(@Param('name') name: string) {
    try {
      const metrics = this.unifiedMetricsService.getMetrics(name);
      redactedLogger.debug(
        `Retrieved metrics for: ${name}`,
        'MonitoringController'
      );
      return {
        success: true,
        data: metrics,
        timestamp: new Date(),
        count: metrics.length,
      };
    } catch (error) {
      redactedLogger.error(
        `Failed to retrieve metrics for: ${name}`,
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Post('metrics')
  async recordMetric(
    @Body()
    body: {
      name: string;
      value: number;
      labels?: Record<string, string>;
    }
  ) {
    try {
      this.unifiedMetricsService.recordMetric(
        body.name,
        body.value,
        body.labels
      );
      redactedLogger.debug(
        `Recorded metric: ${body.name} = ${body.value}`,
        'MonitoringController'
      );
      return {
        success: true,
        message: 'Metric recorded successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        `Failed to record metric: ${body.name}`,
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Post('metrics/counter/:name/increment')
  async incrementCounter(
    @Param('name') name: string,
    @Body() body: { labels?: Record<string, string> }
  ) {
    try {
      this.unifiedMetricsService.incrementCounter(name, 1, body.labels);
      redactedLogger.debug(
        `Incremented counter: ${name}`,
        'MonitoringController'
      );
      return {
        success: true,
        message: 'Counter incremented successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        `Failed to increment counter: ${name}`,
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Get('metrics/export/:format')
  async exportMetrics(
    @Param('format') format: 'prometheus' | 'opentelemetry' | 'custom'
  ) {
    try {
      const exportedMetrics = this.unifiedMetricsService.exportMetrics(format);
      redactedLogger.debug(
        `Exported metrics in ${format} format`,
        'MonitoringController'
      );
      return {
        success: true,
        data: exportedMetrics,
        format,
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        `Failed to export metrics in ${format} format`,
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Delete('metrics')
  async clearMetrics() {
    try {
      this.unifiedMetricsService.clearMetrics();
      redactedLogger.debug('Cleared all metrics', 'MonitoringController');
      return {
        success: true,
        message: 'All metrics cleared successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to clear metrics',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Get('metrics/summary')
  async getMetricsSummary() {
    try {
      const summary = this.unifiedMetricsService.getMetricsSummary();
      redactedLogger.debug('Retrieved metrics summary', 'MonitoringController');
      return {
        success: true,
        data: summary,
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to retrieve metrics summary',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  // ===== HEALTH ENDPOINTS =====

  @Get('health/system')
  async getSystemHealth() {
    try {
      const health = this.selfHealingService.checkSystemHealth();
      redactedLogger.debug('Retrieved system health', 'MonitoringController');
      return {
        success: true,
        data: health,
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to retrieve system health',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Get('health/service/:name')
  async getServiceHealth(@Param('name') name: string) {
    try {
      const health = this.selfHealingService.checkServiceHealth(name);
      redactedLogger.debug(
        `Retrieved health for service: ${name}`,
        'MonitoringController'
      );
      return {
        success: true,
        data: health,
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        `Failed to retrieve health for service: ${name}`,
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Get('health/services')
  async getAllServicesHealth() {
    try {
      const healthChecks = this.selfHealingService.getHealthChecks();
      const servicesHealth = healthChecks.map(serviceCheck =>
        this.selfHealingService.checkServiceHealth(serviceCheck._service)
      );

      redactedLogger.debug(
        'Retrieved all services health',
        'MonitoringController'
      );
      return {
        success: true,
        data: servicesHealth,
        timestamp: new Date(),
        count: servicesHealth.length,
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to retrieve all services health',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Get('health/summary')
  async getHealthSummary() {
    try {
      const summary = this.selfHealingService.getHealthSummary();
      redactedLogger.debug('Retrieved health summary', 'MonitoringController');
      return {
        success: true,
        data: summary,
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to retrieve health summary',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Get('health/status')
  async getServiceStatus() {
    try {
      const status = this.selfHealingService.getServiceStatus();
      redactedLogger.debug('Retrieved service status', 'MonitoringController');
      return {
        success: true,
        data: status,
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to retrieve service status',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Get('health/uptime')
  async getUptime() {
    try {
      const uptime = this.selfHealingService.getUptime();
      redactedLogger.debug('Retrieved uptime', 'MonitoringController');
      return {
        success: true,
        data: { uptime },
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to retrieve uptime',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  // ===== CACHE ENDPOINTS =====

  @Get('cache/stats')
  async getCacheStats() {
    try {
      const stats = this.configCachingService.getStats();
      redactedLogger.debug('Retrieved cache stats', 'MonitoringController');
      return {
        success: true,
        data: stats,
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to retrieve cache stats',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Get('cache/keys')
  async getCacheKeys() {
    try {
      const keys = this.configCachingService.keys();
      redactedLogger.debug('Retrieved cache keys', 'MonitoringController');
      return {
        success: true,
        data: keys,
        timestamp: new Date(),
        count: keys.length,
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to retrieve cache keys',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Get('cache/:key')
  async getCacheValue(@Param('key') key: string) {
    try {
      const value = this.configCachingService.get(key);
      redactedLogger.debug(
        `Retrieved cache value for key: ${key}`,
        'MonitoringController'
      );
      return {
        success: true,
        data: { key, value },
        timestamp: new Date(),
        exists: value !== null,
      };
    } catch (error) {
      redactedLogger.error(
        `Failed to retrieve cache value for key: ${key}`,
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Post('cache/:key')
  async setCacheValue(
    @Param('key') key: string,
    @Body() body: { value: unknown; ttl?: number }
  ) {
    try {
      this.configCachingService.set(key, body.value, body.ttl);
      redactedLogger.debug(
        `Set cache value for key: ${key}`,
        'MonitoringController'
      );
      return {
        success: true,
        message: 'Cache value set successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        `Failed to set cache value for key: ${key}`,
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Delete('cache/:key')
  async deleteCacheValue(@Param('key') key: string) {
    try {
      const deleted = this.configCachingService.delete(key);
      redactedLogger.debug(
        `Deleted cache value for key: ${key}`,
        'MonitoringController'
      );
      return {
        success: true,
        message: deleted
          ? 'Cache value deleted successfully'
          : 'Cache key not found',
        deleted,
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        `Failed to delete cache value for key: ${key}`,
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Delete('cache')
  async clearCache() {
    try {
      this.configCachingService.clear();
      redactedLogger.debug('Cleared all cache', 'MonitoringController');
      return {
        success: true,
        message: 'All cache cleared successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to clear cache',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Post('cache/invalidate-pattern')
  async invalidateCachePattern(@Body() body: { pattern: string }) {
    try {
      const deletedCount = this.configCachingService.invalidatePattern(
        body.pattern
      );
      redactedLogger.debug(
        `Invalidated cache pattern: ${body.pattern}`,
        'MonitoringController'
      );
      return {
        success: true,
        message: 'Cache pattern invalidated successfully',
        deletedCount,
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        `Failed to invalidate cache pattern: ${body.pattern}`,
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  // ===== ALERTS ENDPOINTS =====

  @Get('alerts/config')
  async getAlertConfig() {
    try {
      const config = this.selfHealingService.getAlertConfig();
      redactedLogger.debug('Retrieved alert config', 'MonitoringController');
      return {
        success: true,
        data: config,
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to retrieve alert config',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Get('alerts/history')
  async getAlertHistory() {
    try {
      const history = this.selfHealingService.getAlertHistory();
      redactedLogger.debug('Retrieved alert history', 'MonitoringController');
      return {
        success: true,
        data: history,
        timestamp: new Date(),
        count: history.length,
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to retrieve alert history',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Delete('alerts/history')
  async clearAlertHistory() {
    try {
      this.selfHealingService.clearAlertHistory();
      redactedLogger.debug('Cleared alert history', 'MonitoringController');
      return {
        success: true,
        message: 'Alert history cleared successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to clear alert history',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Get('alerts/count')
  async getAlertCount() {
    try {
      const count = this.selfHealingService.getAlertCount();
      redactedLogger.debug('Retrieved alert count', 'MonitoringController');
      return {
        success: true,
        data: { count },
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to retrieve alert count',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Post('alerts/count/reset')
  async resetAlertCount() {
    try {
      this.selfHealingService.resetAlertCount();
      redactedLogger.debug('Reset alert count', 'MonitoringController');
      return {
        success: true,
        message: 'Alert count reset successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to reset alert count',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  // ===== PERFORMANCE ENDPOINTS =====

  @Get('performance/metrics')
  async getPerformanceMetrics() {
    try {
      const metrics = this.selfHealingService.getPerformanceMetrics();
      redactedLogger.debug(
        'Retrieved performance metrics',
        'MonitoringController'
      );
      return {
        success: true,
        data: metrics,
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to retrieve performance metrics',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Get('performance/baseline')
  async getPerformanceBaseline() {
    try {
      const baseline = this.selfHealingService.getPerformanceBaseline();
      redactedLogger.debug(
        'Retrieved performance baseline',
        'MonitoringController'
      );
      return {
        success: true,
        data: baseline,
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to retrieve performance baseline',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Post('performance/baseline')
  async setPerformanceBaseline(
    @Body()
    body: {
      responseTime: number;
      throughput: number;
      errorRate: number;
      availability: number;
    }
  ) {
    try {
      this.selfHealingService.setPerformanceBaseline({
        ...body,
        timestamp: new Date(),
      });
      redactedLogger.debug('Set performance baseline', 'MonitoringController');
      return {
        success: true,
        message: 'Performance baseline set successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to set performance baseline',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  // ===== SYSTEM ENDPOINTS =====

  @Get('system/metrics')
  async getSystemMetrics() {
    try {
      const metrics = this.selfHealingService.getSystemMetrics();
      redactedLogger.debug('Retrieved system metrics', 'MonitoringController');
      return {
        success: true,
        data: metrics,
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to retrieve system metrics',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  @Get('system/uptime')
  async getSystemUptime() {
    try {
      const uptime = this.selfHealingService.getUptime();
      redactedLogger.debug('Retrieved system uptime', 'MonitoringController');
      return {
        success: true,
        data: { uptime },
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to retrieve system uptime',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  // ===== OVERVIEW ENDPOINT =====

  @Get('overview')
  async getMonitoringOverview() {
    try {
      const [metricsSummary, healthSummary, cacheStats, alertCount, uptime] =
        await Promise.all([
          this.unifiedMetricsService.getMetricsSummary(),
          this.selfHealingService.getHealthSummary(),
          this.configCachingService.getStats(),
          this.selfHealingService.getAlertCount(),
          this.selfHealingService.getUptime(),
        ]);

      redactedLogger.debug(
        'Retrieved monitoring overview',
        'MonitoringController'
      );

      return {
        success: true,
        data: {
          metrics: metricsSummary,
          health: healthSummary,
          cache: cacheStats,
          alerts: { count: alertCount },
          system: { uptime },
        },
        timestamp: new Date(),
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to retrieve monitoring overview',
        'MonitoringController',
        error instanceof Error ? error.message : String(error)
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }
}
