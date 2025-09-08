import { Injectable } from '@nestjs/common';
import { redactedLogger } from '../../utils/redacted-logger';

interface MetricValue {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // в секундах
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

interface Alert {
  id: string;
  ruleId: string;
  name: string;
  severity: string;
  message: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
}

interface MetricsConfig {
  prometheus: {
    enabled: boolean;
    port: number;
    path: string;
  };
  grafana: {
    enabled: boolean;
    url: string;
    apiKey?: string;
  };
  alerts: {
    enabled: boolean;
    channels: {
      telegram?: string;
      slack?: string;
      email?: string;
    };
  };
}

@Injectable()
export class MetricsAndAlertsService {
  private readonly config: MetricsConfig;
  private readonly metrics: Map<string, MetricValue[]> = new Map();
  private readonly alertRules: AlertRule[] = [];
  private readonly activeAlerts: Alert[] = [];
  private readonly checkInterval = 30000; // 30 секунд

  constructor() {
    this.config = {
      prometheus: {
        enabled: process.env.PROMETHEUS_ENABLED === 'true',
        port: parseInt(process.env.PROMETHEUS_PORT ?? '9090'),
        path: process.env.PROMETHEUS_PATH ?? '/metrics',
      },
      grafana: {
        enabled: process.env.GRAFANA_ENABLED === 'true',
        url: process.env.GRAFANA_URL ?? 'http://localhost:3000',
        apiKey: process.env.GRAFANA_API_KEY ?? '',
      },
      alerts: {
        enabled: process.env.ALERTS_ENABLED === 'true',
        channels: {
          telegram: process.env.TELEGRAM_BOT_TOKEN ?? '',
          slack: process.env.SLACK_WEBHOOK_URL ?? '',
          email: process.env.ALERT_EMAIL ?? '',
        },
      },
    };

    // Инициализируем базовые метрики
    this.initializeDefaultMetrics();

    // Запускаем проверку алертов
    if (this.config.alerts.enabled) {
      setInterval(() => void this.checkAlerts(), this.checkInterval);
    }

    redactedLogger.log(
      'Metrics and Alerts service initialized',
      'MetricsAndAlertsService'
    );
  }

  // Метрики
  recordMetric(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    const metric: MetricValue = {
      name,
      value,
      timestamp: Date.now(),
      labels: labels ?? {},
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricArray = this.metrics.get(name);
    if (metricArray != null) {
      metricArray.push(metric);

      // Ограничиваем количество метрик в памяти
      const maxMetrics = 1000;
      if (metricArray.length > maxMetrics) {
        metricArray.shift();
      }
    }

    // Проверяем алерты для этой метрики
    this.checkMetricAlerts(name, value, labels);
  }

  incrementCounter(name: string, labels?: Record<string, string>): void {
    const currentValue = this.getMetricValue(name, labels) ?? 0;
    this.recordMetric(name, currentValue + 1, labels);
  }

  recordHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    this.recordMetric(`${name}_sum`, value, labels);
    this.recordMetric(`${name}_count`, 1, labels);
    this.recordMetric(`${name}_bucket`, value, {
      ...labels,
      le: this.getBucketLabel(value),
    });
  }

  recordGauge(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    this.recordMetric(name, value, labels);
  }

  // Алерты
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
    redactedLogger.log(
      `Alert rule added: ${rule.name}`,
      'MetricsAndAlertsService'
    );
  }

  removeAlertRule(ruleId: string): void {
    const index = this.alertRules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.alertRules.splice(index, 1);
      redactedLogger.log(
        `Alert rule removed: ${ruleId}`,
        'MetricsAndAlertsService'
      );
    }
  }

  getActiveAlerts(): Alert[] {
    return this.activeAlerts.filter(alert => !alert.resolved);
  }

  resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      redactedLogger.log(
        `Alert resolved: ${alert.name}`,
        'MetricsAndAlertsService'
      );
    }
  }

  // Prometheus метрики
  getPrometheusMetrics(): string {
    if (!this.config.prometheus.enabled) return '';

    let metrics = '';

    for (const [metricName, values] of this.metrics) {
      if (values.length === 0) continue;

      const latestValue = values[values.length - 1];
      if (!latestValue) continue;

      const labels = latestValue.labels
        ? `{${Object.entries(latestValue.labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',')}}`
        : '';

      metrics += `# HELP ${metricName} ${metricName} metric\n`;
      metrics += `# TYPE ${metricName} gauge\n`;
      metrics += `${metricName}${labels} ${latestValue.value}\n`;
    }

    return metrics;
  }

  // Grafana интеграция
  async sendToGrafana(): Promise<void> {
    if (!this.config.grafana.enabled) return;

    try {
      // Здесь будет интеграция с Grafana API
      redactedLogger.debug(
        'Sending metrics to Grafana',
        'MetricsAndAlertsService'
      );

      // Пример интеграции с Grafana
      // const response = await fetch(`${this.config.grafana.url}/api/datasources/proxy/1/api/v1/write`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.config.grafana.apiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(this.getMetricsForGrafana()),
      // });
    } catch (error) {
      redactedLogger.error(
        'Failed to send metrics to Grafana',
        error as string
      );
    }
  }

  // Приватные методы
  private initializeDefaultMetrics(): void {
    // Системные метрики
    this.recordMetric('app_uptime_seconds', process.uptime());
    this.recordMetric('app_memory_usage_bytes', process.memoryUsage().heapUsed);
    this.recordMetric('app_cpu_usage_percent', 0);

    // Бизнес метрики
    this.recordMetric('http_requests_total', 0);
    this.recordMetric('http_request_duration_seconds', 0);
    this.recordMetric('database_connections_active', 0);
    this.recordMetric('redis_connections_active', 0);

    // Инициализируем базовые алерты
    this.initializeDefaultAlerts();
  }

  private initializeDefaultAlerts(): void {
    const defaultAlerts: AlertRule[] = [
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        metric: 'app_memory_usage_bytes',
        condition: 'gt',
        threshold: 100 * 1024 * 1024, // 100MB
        duration: 300, // 5 минут
        severity: 'high',
        enabled: true,
      },
      {
        id: 'high_cpu_usage',
        name: 'High CPU Usage',
        metric: 'app_cpu_usage_percent',
        condition: 'gt',
        threshold: 80,
        duration: 300,
        severity: 'medium',
        enabled: true,
      },
      {
        id: 'high_response_time',
        name: 'High Response Time',
        metric: 'http_request_duration_seconds',
        condition: 'gt',
        threshold: 5,
        duration: 60,
        severity: 'high',
        enabled: true,
      },
    ];

    defaultAlerts.forEach(rule => this.addAlertRule(rule));
  }

  private checkMetricAlerts(
    metricName: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    // Используем labels, чтобы TypeScript не ругался
    redactedLogger.debug(
      `Checking alerts for metric: ${metricName}, value: ${value}, labels: ${JSON.stringify(labels ?? {})}`
    );

    const relevantRules = this.alertRules.filter(
      rule => rule.metric === metricName && rule.enabled
    );

    for (const rule of relevantRules) {
      const shouldTrigger = this.evaluateCondition(
        value,
        rule.condition,
        rule.threshold
      );

      if (shouldTrigger) {
        this.triggerAlert(rule, value);
      } else {
        this.resolveAlertByRule(rule.id);
      }
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
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      default:
        return false;
    }
  }

  private triggerAlert(rule: AlertRule, value: number): void {
    const existingAlert = this.activeAlerts.find(
      alert => alert.ruleId === rule.id && !alert.resolved
    );

    if (existingAlert) return; // Алерт уже активен

    const alert: Alert = {
      id: `${rule.id}_${Date.now()}`,
      ruleId: rule.id,
      name: rule.name,
      severity: rule.severity,
      message: `${rule.name}: ${rule.metric} = ${value} (threshold: ${rule.condition} ${rule.threshold})`,
      timestamp: Date.now(),
      resolved: false,
    };

    this.activeAlerts.push(alert);
    redactedLogger.warn(
      `Alert triggered: ${alert.message}`,
      'MetricsAndAlertsService'
    );

    // Отправляем уведомление
    void this.sendAlertNotification(alert);
  }

  private resolveAlertByRule(ruleId: string): void {
    const alerts = this.activeAlerts.filter(
      alert => alert.ruleId === ruleId && !alert.resolved
    );

    alerts.forEach(alert => this.resolveAlert(alert.id));
  }

  private async sendAlertNotification(alert: Alert): Promise<void> {
    if (!this.config.alerts.enabled) return;

    try {
      await Promise.allSettled([
        this.sendTelegramAlert(alert),
        this.sendSlackAlert(alert),
        this.sendEmailAlert(alert),
      ]);
    } catch (error) {
      redactedLogger.error(
        'Failed to send alert notification',
        error as string
      );
    }
  }

  private async sendTelegramAlert(alert: Alert): Promise<void> {
    if (
      this.config.alerts.channels.telegram == null ||
      this.config.alerts.channels.telegram === ''
    )
      return;

    try {
      // Здесь будет интеграция с Telegram Bot API
      redactedLogger.debug(
        `Sending Telegram alert: ${alert.message}`,
        'MetricsAndAlertsService'
      );
    } catch (error) {
      redactedLogger.error('Failed to send Telegram alert', error as string);
    }
  }

  private async sendSlackAlert(alert: Alert): Promise<void> {
    if (
      this.config.alerts.channels.slack == null ||
      this.config.alerts.channels.slack === ''
    )
      return;

    try {
      // Здесь будет интеграция с Slack Webhook
      redactedLogger.debug(
        `Sending Slack alert: ${alert.message}`,
        'MetricsAndAlertsService'
      );
    } catch (error) {
      redactedLogger.error('Failed to send Slack alert', error as string);
    }
  }

  private async sendEmailAlert(alert: Alert): Promise<void> {
    if (
      this.config.alerts.channels.email == null ||
      this.config.alerts.channels.email === ''
    )
      return;

    try {
      // Здесь будет интеграция с email сервисом
      redactedLogger.debug(
        `Sending email alert: ${alert.message}`,
        'MetricsAndAlertsService'
      );
    } catch (error) {
      redactedLogger.error('Failed to send email alert', error as string);
    }
  }

  private async checkAlerts(): Promise<void> {
    // Периодическая проверка всех метрик на соответствие правилам алертов
    for (const [metricName, values] of this.metrics) {
      if (values.length === 0) continue;

      const latestValue = values[values.length - 1];
      if (latestValue != null) {
        this.checkMetricAlerts(
          metricName,
          latestValue.value,
          latestValue.labels
        );
      }
    }
  }

  private getMetricValue(
    name: string,
    labels?: Record<string, string>
  ): number | undefined {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return undefined;

    if (!labels) {
      const latestValue = values[values.length - 1];
      return latestValue?.value;
    }

    // Ищем значение с соответствующими лейблами
    for (let i = values.length - 1; i >= 0; i--) {
      const value = values[i];
      if (value != null && this.labelsMatch(value.labels, labels)) {
        return value.value;
      }
    }

    return undefined;
  }

  private labelsMatch(
    labels1?: Record<string, string>,
    labels2?: Record<string, string>
  ): boolean {
    if (!labels1 && !labels2) return true;
    if (!labels1 || !labels2) return false;

    const keys1 = Object.keys(labels1);
    const keys2 = Object.keys(labels2);

    if (keys1.length !== keys2.length) return false;

    return keys1.every(key => labels1[key] === labels2[key]);
  }

  private getBucketLabel(value: number): string {
    const buckets = [0.1, 0.5, 1, 2, 5, 10, 30, 60];
    for (const bucket of buckets) {
      if (value <= bucket) return bucket.toString();
    }
    return '+Inf';
  }

  private _getMetricsForGrafana(): Record<string, unknown> {
    // Преобразуем метрики в формат для Grafana
    const result: Record<string, unknown> = {};

    for (const [metricName, values] of this.metrics) {
      if (values.length === 0) continue;

      const latestValue = values[values.length - 1];
      if (latestValue != null) {
        result[metricName] = {
          value: latestValue.value,
          timestamp: latestValue.timestamp,
          labels: latestValue.labels ?? {},
        };
      }
    }

    return result;
  }

  // Публичный метод для получения метрик для Grafana
  public getMetricsForGrafana(): Record<string, unknown> {
    return this._getMetricsForGrafana();
  }

  // Методы для получения статистики
  getMetricsStats() {
    return {
      totalMetrics: this.metrics.size,
      totalValues: Array.from(this.metrics.values()).reduce(
        (sum, values) => sum + values.length,
        0
      ),
      activeAlerts: this.activeAlerts.filter(alert => !alert.resolved).length,
      alertRules: this.alertRules.length,
      config: {
        prometheus: this.config.prometheus.enabled,
        grafana: this.config.grafana.enabled,
        alerts: this.config.alerts.enabled,
      },
    };
  }
}
