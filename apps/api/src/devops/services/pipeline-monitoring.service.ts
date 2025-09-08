import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PipelineEvent {
  id: string;
  type:
    | 'build_started'
    | 'build_completed'
    | 'test_started'
    | 'test_completed'
    | 'deploy_started'
    | 'deploy_completed'
    | 'pipeline_failed';
  buildId: string;
  stage: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
  duration?: number;
  success?: boolean;
  error?: string;
}

export interface PipelineAlert {
  id: string;
  type: 'failure' | 'performance' | 'security' | 'quality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  buildId?: string;
  stage?: string;
  timestamp: Date;
  resolved: boolean;
  metadata: Record<string, unknown>;
}

export interface PipelineMetrics {
  totalBuilds: number;
  successfulBuilds: number;
  failedBuilds: number;
  averageBuildTime: number;
  averageTestTime: number;
  averageDeployTime: number;
  successRate: number;
  failureRate: number;
  lastBuildTime: Date;
  trends: {
    buildsPerDay: number;
    successRateTrend: number;
    buildTimeTrend: number;
  };
}

@Injectable()
export class PipelineMonitoringService implements OnModuleInit {
  private readonly logger = new Logger(PipelineMonitoringService.name);
  private readonly events: PipelineEvent[] = [];
  private readonly alerts: PipelineAlert[] = [];

  constructor(private readonly configService: ConfigService) {
    // Инициализация перенесена в onModuleInit
  }

  onModuleInit() {
    // Инициализация конфигурации после инжекции зависимостей
    this.configService.get('PIPELINE_MONITORING_ENABLED');
  }

  /**
   * Record pipeline event
   */
  async recordEvent(
    event: Omit<PipelineEvent, 'id' | 'timestamp'>
  ): Promise<void> {
    const pipelineEvent: PipelineEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
    };

    this.events.push(pipelineEvent);
    this.logger.log(
      `Recorded pipeline event: ${event.type} for build ${event.buildId}`
    );

    // Check for alerts
    this.checkForAlerts(pipelineEvent);
  }

  /**
   * Get pipeline metrics
   */
  async getPipelineMetrics(timeRange?: {
    from: Date;
    to: Date;
  }): Promise<PipelineMetrics> {
    const filteredEvents = this.filterEventsByTimeRange(this.events, timeRange);
    const buildEvents = filteredEvents.filter(e => e.type.includes('build'));
    const testEvents = filteredEvents.filter(e => e.type.includes('test'));
    const deployEvents = filteredEvents.filter(e => e.type.includes('deploy'));

    const totalBuilds = buildEvents.filter(
      e => e.type === 'build_started'
    ).length;
    const successfulBuilds = buildEvents.filter(
      e => e.type === 'build_completed' && e.success === true
    ).length;
    const failedBuilds = buildEvents.filter(
      e => e.type === 'build_completed' && e.success === false
    ).length;

    const averageBuildTime = this.calculateAverageDuration(buildEvents);
    const averageTestTime = this.calculateAverageDuration(testEvents);
    const averageDeployTime = this.calculateAverageDuration(deployEvents);

    const successRate =
      totalBuilds > 0 ? (successfulBuilds / totalBuilds) * 100 : 0;
    const failureRate =
      totalBuilds > 0 ? (failedBuilds / totalBuilds) * 100 : 0;

    const lastBuildEvent = buildEvents
      .filter(e => e.type === 'build_completed')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    return {
      totalBuilds,
      successfulBuilds,
      failedBuilds,
      averageBuildTime,
      averageTestTime,
      averageDeployTime,
      successRate,
      failureRate,
      lastBuildTime: lastBuildEvent?.timestamp ?? new Date(),
      trends: {
        buildsPerDay: this.calculateBuildsPerDay(filteredEvents),
        successRateTrend: this.calculateSuccessRateTrend(filteredEvents),
        buildTimeTrend: this.calculateBuildTimeTrend(filteredEvents),
      },
    };
  }

  /**
   * Get pipeline alerts
   */
  async getPipelineAlerts(
    resolved?: boolean,
    severity?: string,
    type?: string
  ): Promise<PipelineAlert[]> {
    let filteredAlerts = [...this.alerts];

    if (typeof resolved === 'boolean') {
      filteredAlerts = filteredAlerts.filter(
        alert => alert.resolved === resolved
      );
    }

    if (severity != null && severity !== '') {
      filteredAlerts = filteredAlerts.filter(
        alert => alert.severity === severity
      );
    }

    if (type != null && type !== '') {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
    }

    return filteredAlerts.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Resolve alert
   */
  async resolveAlert(
    alertId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const alert = this.alerts.find(a => a.id === alertId);
      if (!alert) {
        return { success: false, error: 'Alert not found' };
      }

      alert.resolved = true;
      this.logger.log(`Alert resolved: ${alertId}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get pipeline events
   */
  async getPipelineEvents(
    buildId?: string,
    type?: string,
    timeRange?: { from: Date; to: Date }
  ): Promise<PipelineEvent[]> {
    let filteredEvents = [...this.events];

    if (buildId != null && buildId !== '') {
      filteredEvents = filteredEvents.filter(
        event => event.buildId === buildId
      );
    }

    if (type != null && type !== '') {
      filteredEvents = filteredEvents.filter(event => event.type === type);
    }

    if (timeRange) {
      filteredEvents = this.filterEventsByTimeRange(filteredEvents, timeRange);
    }

    return filteredEvents.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Get build timeline
   */
  async getBuildTimeline(buildId: string): Promise<PipelineEvent[]> {
    return this.events
      .filter(event => event.buildId === buildId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get performance insights
   */
  async getPerformanceInsights(timeRange?: { from: Date; to: Date }): Promise<{
    slowestStages: Array<{ stage: string; averageTime: number }>;
    bottlenecks: string[];
    recommendations: string[];
  }> {
    const filteredEvents = this.filterEventsByTimeRange(this.events, timeRange);

    const stageTimes = new Map<string, number[]>();

    // Group events by stage and calculate durations
    for (const event of filteredEvents) {
      if (event.duration != null) {
        if (!stageTimes.has(event.stage)) {
          stageTimes.set(event.stage, []);
        }
        const times = stageTimes.get(event.stage);
        if (times != null) {
          times.push(event.duration);
        }
      }
    }

    // Calculate average times for each stage
    const slowestStages = Array.from(stageTimes.entries())
      .map(([stage, times]) => ({
        stage,
        averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 5);

    // Identify bottlenecks (stages with high variance or consistently slow times)
    const bottlenecks: string[] = [];
    for (const [stage, times] of stageTimes.entries()) {
      const average = times.reduce((sum, time) => sum + time, 0) / times.length;
      const variance =
        times.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) /
        times.length;
      const standardDeviation = Math.sqrt(variance);

      if (standardDeviation > average * 0.5 || average > 300000) {
        // High variance or > 5 minutes
        bottlenecks.push(stage);
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (bottlenecks.includes('build')) {
      recommendations.push(
        'Consider optimizing build process with better caching'
      );
    }
    if (bottlenecks.includes('test')) {
      recommendations.push('Parallelize test execution or optimize test suite');
    }
    if (bottlenecks.includes('deploy')) {
      recommendations.push('Review deployment strategy and infrastructure');
    }

    return {
      slowestStages,
      bottlenecks,
      recommendations,
    };
  }

  // Helper methods
  private checkForAlerts(event: PipelineEvent): void {
    // Check for failure alerts
    if (event.type === 'pipeline_failed' || event.success === false) {
      this.createAlert({
        type: 'failure',
        severity: 'high',
        title: `Pipeline failed in stage: ${event.stage}`,
        description: `Build ${event.buildId} failed in ${event.stage} stage`,
        buildId: event.buildId,
        stage: event.stage,
        metadata: { eventId: event.id, error: event.error },
      });
    }

    // Check for performance alerts
    if (event.duration != null && event.duration > 600000) {
      // > 10 minutes
      this.createAlert({
        type: 'performance',
        severity: 'medium',
        title: `Slow pipeline stage: ${event.stage}`,
        description: `Stage ${event.stage} took ${Math.round(event.duration / 1000 / 60)} minutes`,
        buildId: event.buildId,
        stage: event.stage,
        metadata: { eventId: event.id, duration: event.duration },
      });
    }
  }

  private createAlert(
    alert: Omit<PipelineAlert, 'id' | 'timestamp' | 'resolved'>
  ): void {
    const pipelineAlert: PipelineAlert = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: new Date(),
      resolved: false,
    };

    this.alerts.push(pipelineAlert);
    this.logger.warn(`Created pipeline alert: ${alert.title}`);
  }

  private filterEventsByTimeRange(
    events: PipelineEvent[],
    timeRange?: { from: Date; to: Date }
  ): PipelineEvent[] {
    if (!timeRange) return events;

    return events.filter(
      event =>
        event.timestamp >= timeRange.from && event.timestamp <= timeRange.to
    );
  }

  private calculateAverageDuration(events: PipelineEvent[]): number {
    const eventsWithDuration = events.filter(
      e => e.duration != null && e.duration > 0
    );
    if (eventsWithDuration.length === 0) return 0;

    const totalDuration = eventsWithDuration.reduce(
      (sum, e) => sum + (e.duration ?? 0),
      0
    );
    return totalDuration / eventsWithDuration.length;
  }

  private calculateBuildsPerDay(events: PipelineEvent[]): number {
    const buildEvents = events.filter(e => e.type === 'build_started');
    if (buildEvents.length === 0) return 0;

    const days = this.getDaysBetween(
      Math.min(...buildEvents.map(e => e.timestamp.getTime())),
      Math.max(...buildEvents.map(e => e.timestamp.getTime()))
    );

    return days > 0 ? buildEvents.length / days : buildEvents.length;
  }

  private calculateSuccessRateTrend(events: PipelineEvent[]): number {
    // Simplified trend calculation
    const recentEvents = events.slice(-10);
    const olderEvents = events.slice(-20, -10);

    const recentSuccessRate = this.calculateSuccessRate(recentEvents);
    const olderSuccessRate = this.calculateSuccessRate(olderEvents);

    return recentSuccessRate - olderSuccessRate;
  }

  private calculateBuildTimeTrend(events: PipelineEvent[]): number {
    // Simplified trend calculation
    const recentEvents = events.slice(-10);
    const olderEvents = events.slice(-20, -10);

    const recentAvgTime = this.calculateAverageDuration(recentEvents);
    const olderAvgTime = this.calculateAverageDuration(olderEvents);

    return recentAvgTime - olderAvgTime;
  }

  private calculateSuccessRate(events: PipelineEvent[]): number {
    const completedEvents = events.filter(e => e.type.includes('completed'));
    if (completedEvents.length === 0) return 0;

    const successfulEvents = completedEvents.filter(e => e.success === true);
    return (successfulEvents.length / completedEvents.length) * 100;
  }

  private getDaysBetween(startTime: number, endTime: number): number {
    return Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24));
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
