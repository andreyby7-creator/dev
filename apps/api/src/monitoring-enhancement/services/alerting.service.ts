import { Injectable, Logger } from '@nestjs/common';

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown: number; // seconds
  lastTriggered?: Date;
}

export interface Alert {
  id: string;
  ruleId: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'acknowledged';
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  metadata: Record<string, unknown>;
}

export interface AlertConfig {
  rules: AlertRule[];
  channels: string[];
  escalation: {
    enabled: boolean;
    levels: Array<{
      delay: number; // minutes
      channels: string[];
    }>;
  };
}

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private alertRules: AlertRule[] = [];
  private activeAlerts: Alert[] = [];
  // private alertConfig: AlertConfig | null = null;

  async configureAlerts(config: AlertConfig): Promise<{
    success: boolean;
    rulesConfigured: number;
    channelsConfigured: number;
  }> {
    try {
      this.logger.log(`Configuring alerts with ${config.rules.length} rules`);

      // this.alertConfig = config;
      this.alertRules = config.rules;

      this.logger.log(
        `Configured ${config.rules.length} alert rules and ${config.channels.length} channels`
      );

      return {
        success: true,
        rulesConfigured: config.rules.length,
        channelsConfigured: config.channels.length,
      };
    } catch (error) {
      this.logger.error('Failed to configure alerts', error);
      throw error;
    }
  }

  async getAlertStatus(): Promise<{
    totalRules: number;
    activeAlerts: number;
    resolvedAlerts: number;
    acknowledgedAlerts: number;
    alerts: Alert[];
  }> {
    try {
      this.logger.log('Getting alert status');

      const activeAlerts = this.activeAlerts.filter(a => a.status === 'active');
      const resolvedAlerts = this.activeAlerts.filter(
        a => a.status === 'resolved'
      );
      const acknowledgedAlerts = this.activeAlerts.filter(
        a => a.status === 'acknowledged'
      );

      return {
        totalRules: this.alertRules.length,
        activeAlerts: activeAlerts.length,
        resolvedAlerts: resolvedAlerts.length,
        acknowledgedAlerts: acknowledgedAlerts.length,
        alerts: this.activeAlerts,
      };
    } catch (error) {
      this.logger.error('Failed to get alert status', error);
      throw error;
    }
  }

  async evaluateAlerts(metricData: Record<string, number>): Promise<{
    triggered: number;
    resolved: number;
    newAlerts: Alert[];
  }> {
    try {
      this.logger.log(
        `Evaluating alerts for metrics: ${Object.keys(metricData).join(', ')}`
      );

      let triggered = 0;
      let resolved = 0;
      const newAlerts: Alert[] = [];

      for (const rule of this.alertRules) {
        if (!rule.enabled) continue;

        const metricValue = metricData[rule.metric];
        if (metricValue == null) continue;

        const shouldTrigger = this.evaluateCondition(
          metricValue,
          rule.condition,
          rule.threshold
        );
        const isInCooldown =
          rule.lastTriggered != null &&
          Date.now() - rule.lastTriggered.getTime() < rule.cooldown * 1000;

        if (shouldTrigger && !isInCooldown) {
          const alert: Alert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ruleId: rule.id,
            message: `Alert: ${rule.name} - ${rule.metric} ${rule.condition} ${rule.threshold} (current: ${metricValue})`,
            severity: rule.severity,
            status: 'active',
            triggeredAt: new Date(),
            metadata: {
              metric: rule.metric,
              value: metricValue,
              threshold: rule.threshold,
              condition: rule.condition,
            },
          };

          this.activeAlerts.push(alert);
          newAlerts.push(alert);
          rule.lastTriggered = new Date();
          triggered++;
        } else if (!shouldTrigger) {
          // Check if there are active alerts for this rule that should be resolved
          const activeRuleAlerts = this.activeAlerts.filter(
            a => a.ruleId === rule.id && a.status === 'active'
          );

          for (const alert of activeRuleAlerts) {
            alert.status = 'resolved';
            alert.resolvedAt = new Date();
            resolved++;
          }
        }
      }

      this.logger.log(
        `Alert evaluation complete: ${triggered} triggered, ${resolved} resolved`
      );

      return {
        triggered,
        resolved,
        newAlerts,
      };
    } catch (error) {
      this.logger.error('Failed to evaluate alerts', error);
      throw error;
    }
  }

  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string
  ): Promise<{
    success: boolean;
    alert: Alert | null;
  }> {
    try {
      this.logger.log(`Acknowledging alert ${alertId} by ${acknowledgedBy}`);

      const alert = this.activeAlerts.find(a => a.id === alertId);
      if (!alert) {
        return { success: false, alert: null };
      }

      alert.status = 'acknowledged';
      alert.acknowledgedAt = new Date();
      alert.acknowledgedBy = acknowledgedBy;

      this.logger.log(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);

      return {
        success: true,
        alert,
      };
    } catch (error) {
      this.logger.error('Failed to acknowledge alert', error);
      throw error;
    }
  }

  async getAlertHistory(timeRange: string): Promise<{
    timeRange: string;
    alerts: Alert[];
    summary: {
      total: number;
      bySeverity: Record<string, number>;
      byStatus: Record<string, number>;
    };
  }> {
    try {
      this.logger.log(`Getting alert history for time range: ${timeRange}`);

      const cutoffTime = this.getCutoffTime(timeRange);
      const filteredAlerts = this.activeAlerts.filter(
        a => a.triggeredAt >= cutoffTime
      );

      const summary = {
        total: filteredAlerts.length,
        bySeverity: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
      };

      for (const alert of filteredAlerts) {
        summary.bySeverity[alert.severity] =
          (summary.bySeverity[alert.severity] ?? 0) + 1;
        summary.byStatus[alert.status] =
          (summary.byStatus[alert.status] ?? 0) + 1;
      }

      return {
        timeRange,
        alerts: filteredAlerts,
        summary,
      };
    } catch (error) {
      this.logger.error('Failed to get alert history', error);
      throw error;
    }
  }

  private evaluateCondition(
    value: number,
    condition: string,
    threshold: number
  ): boolean {
    switch (condition) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'eq':
        return value === threshold;
      case 'gte':
        return value >= threshold;
      case 'lte':
        return value <= threshold;
      default:
        return false;
    }
  }

  private getCutoffTime(timeRange: string): Date {
    const now = new Date();
    const range = timeRange.toLowerCase();

    if (range.includes('1h') || range.includes('hour')) {
      return new Date(now.getTime() - 60 * 60 * 1000);
    } else if (range.includes('24h') || range.includes('day')) {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (range.includes('7d') || range.includes('week')) {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range.includes('30d') || range.includes('month')) {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Default to 1 hour
    return new Date(now.getTime() - 60 * 60 * 1000);
  }
}
