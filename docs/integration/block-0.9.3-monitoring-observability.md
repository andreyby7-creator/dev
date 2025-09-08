# Блок 0.9.3. Мониторинг и наблюдаемость

## Обзор

Блок 0.9.3 реализует единую систему мониторинга и наблюдаемости для всех сервисов с распределенной трассировкой, централизованным логированием и комплексными проверками здоровья системы.

## Статус

**✅ ПОЛНОСТЬЮ ЗАВЕРШЕН (100%)**

## Архитектура

### Unified Monitoring System

Единая система мониторинга обеспечивает:

- **Unified Metrics Dashboard** - единая панель мониторинга всех сервисов
- **Distributed Tracing** - сквозная трассировка запросов через все сервисы
- **Centralized Logging** - агрегация логов со всех компонентов
- **Health Checks** - комплексные проверки здоровья всей системы
- **Alerting System** - единая система оповещений
- **Performance Analytics** - аналитика производительности

### Monitoring Stack

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Applications  │    │   Infrastructure│    │   Business      │
│                 │    │                 │    │   Metrics       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌─────────────────────────────────────────────────┐
         │           Unified Metrics Dashboard             │
         └─────────────────────────────────────────────────┘
                                 │
         ┌─────────────────────────────────────────────────┐
         │         Distributed Tracing (Jaeger)            │
         └─────────────────────────────────────────────────┘
                                 │
         ┌─────────────────────────────────────────────────┐
         │         Centralized Logging (ELK)               │
         └─────────────────────────────────────────────────┘
```

## Ключевые сервисы

### UnifiedMetricsDashboardService

**Файл:** `apps/api/src/monitoring/unified-metrics-dashboard.service.ts`

**Функциональность:**

- Агрегация метрик со всех сервисов
- Единая панель мониторинга
- Real-time обновления метрик
- Интеграция с Prometheus и Grafana

**Основные методы:**

```typescript
async getSystemMetrics(): Promise<ISystemMetrics>
async getServiceMetrics(serviceId: string): Promise<IServiceMetrics>
async getBusinessMetrics(): Promise<IBusinessMetrics>
async getSystemHealth(): Promise<ISystemHealth>
```

### DistributedTracingService

**Файл:** `apps/api/src/monitoring/distributed-tracing.service.ts`

**Функциональность:**

- Распределенная трассировка запросов
- Интеграция с Jaeger
- Корреляция трасс между сервисами
- Анализ производительности

**Основные методы:**

```typescript
async startTrace(operationName: string, context?: ITraceContext): Promise<ITrace>
async addSpan(traceId: string, spanName: string, data?: any): Promise<ISpan>
async finishTrace(traceId: string): Promise<void>
async getTrace(traceId: string): Promise<ITrace>
```

### CentralizedLoggingService

**Файл:** `apps/api/src/monitoring/centralized-logging.service.ts`

**Функциональность:**

- Централизованная агрегация логов
- Интеграция с ELK Stack
- Структурированное логирование
- Поиск и анализ логов

**Основные методы:**

```typescript
async log(level: LogLevel, message: string, context?: any): Promise<void>
async searchLogs(query: ILogSearchQuery): Promise<ILogEntry[]>
async getLogStatistics(): Promise<ILogStatistics>
async exportLogs(query: ILogExportQuery): Promise<Buffer>
```

### SystemHealthCheckService

**Файл:** `apps/api/src/monitoring/system-health-check.service.ts`

**Функциональность:**

- Комплексные проверки здоровья системы
- Health checks для всех компонентов
- Агрегация статуса здоровья
- Автоматическое восстановление

**Основные методы:**

```typescript
async checkSystemHealth(): Promise<ISystemHealthStatus>
async checkServiceHealth(serviceId: string): Promise<IServiceHealthStatus>
async checkDependencyHealth(dependencyId: string): Promise<IDependencyHealthStatus>
async getHealthHistory(): Promise<IHealthHistory[]>
```

### UnifiedAlertingService

**Файл:** `apps/api/src/monitoring/unified-alerting.service.ts`

**Функциональность:**

- Единая система оповещений
- Интеграция всех каналов уведомлений
- Настраиваемые правила алертов
- Эскалация критических проблем

**Основные методы:**

```typescript
async createAlert(alert: IAlert): Promise<void>
async updateAlert(alertId: string, updates: Partial<IAlert>): Promise<void>
async resolveAlert(alertId: string): Promise<void>
async getActiveAlerts(): Promise<IAlert[]>
```

### PerformanceAnalyticsService

**Файл:** `apps/api/src/monitoring/performance-analytics.service.ts`

**Функциональность:**

- Аналитика производительности системы
- Выявление узких мест
- Рекомендации по оптимизации
- Тренды производительности

**Основные методы:**

```typescript
async analyzePerformance(timeRange: ITimeRange): Promise<IPerformanceAnalysis>
async getPerformanceTrends(): Promise<IPerformanceTrend[]>
async getBottlenecks(): Promise<IBottleneck[]>
async getOptimizationRecommendations(): Promise<IOptimizationRecommendation[]>
```

## Метрики и мониторинг

### Application Metrics

```typescript
interface IApplicationMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    rate: number; // requests per second
  };
  responseTime: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
  };
  errors: {
    total: number;
    rate: number;
    byType: Record<string, number>;
  };
  throughput: {
    bytesPerSecond: number;
    requestsPerSecond: number;
  };
}
```

### Infrastructure Metrics

```typescript
interface IInfrastructureMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  disk: {
    used: number;
    total: number;
    usage: number;
    iops: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
}
```

### Business Metrics

```typescript
interface IBusinessMetrics {
  users: {
    active: number;
    new: number;
    churn: number;
  };
  revenue: {
    total: number;
    monthly: number;
    growth: number;
  };
  conversions: {
    rate: number;
    funnel: Record<string, number>;
  };
  engagement: {
    sessions: number;
    duration: number;
    pages: number;
  };
}
```

## Distributed Tracing

### Trace Structure

```typescript
interface ITrace {
  traceId: string;
  spans: ISpan[];
  startTime: Date;
  endTime: Date;
  duration: number;
  serviceName: string;
  operationName: string;
  tags: Record<string, string>;
  logs: ITraceLog[];
}

interface ISpan {
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  tags: Record<string, string>;
  logs: ISpanLog[];
  references: ISpanReference[];
}
```

### Tracing Integration

```typescript
@Injectable()
export class TracingInterceptor implements NestInterceptor {
  constructor(private tracingService: DistributedTracingService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const traceId = request.headers['x-trace-id'] || this.generateTraceId();

    const trace = await this.tracingService.startTrace(
      `${request.method} ${request.url}`,
      { traceId, userId: request.user?.id }
    );

    return next.handle().pipe(
      tap({
        next: response => {
          this.tracingService.addSpan(traceId, 'response', { statusCode: 200 });
        },
        error: error => {
          this.tracingService.addSpan(traceId, 'error', {
            error: error.message,
            statusCode: error.status,
          });
        },
        finalize: () => {
          this.tracingService.finishTrace(traceId);
        },
      })
    );
  }
}
```

## Централизованное логирование

### Log Structure

```typescript
interface ILogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  service: string;
  traceId?: string;
  userId?: string;
  context: Record<string, any>;
  tags: string[];
  metadata: Record<string, any>;
}

enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}
```

### Structured Logging

```typescript
@Injectable()
export class LoggerService {
  constructor(private loggingService: CentralizedLoggingService) {}

  async log(level: LogLevel, message: string, context?: any): Promise<void> {
    const logEntry: ILogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      message,
      service: this.serviceName,
      traceId: this.getCurrentTraceId(),
      userId: this.getCurrentUserId(),
      context: context || {},
      tags: this.extractTags(context),
      metadata: {
        hostname: process.env.HOSTNAME,
        pid: process.pid,
        version: process.env.npm_package_version,
      },
    };

    await this.loggingService.log(logEntry);
  }

  async error(message: string, error?: Error, context?: any): Promise<void> {
    await this.log(LogLevel.ERROR, message, {
      ...context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }
}
```

## Health Checks

### Health Check Types

```typescript
interface IHealthCheck {
  name: string;
  type: HealthCheckType;
  timeout: number;
  retries: number;
  check: () => Promise<IHealthCheckResult>;
}

enum HealthCheckType {
  DATABASE = 'database',
  REDIS = 'redis',
  EXTERNAL_API = 'external_api',
  DISK_SPACE = 'disk_space',
  MEMORY = 'memory',
  CUSTOM = 'custom',
}

interface IHealthCheckResult {
  status: HealthStatus;
  message?: string;
  details?: Record<string, any>;
  timestamp: Date;
  duration: number;
}

enum HealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded',
}
```

### Health Check Implementation

```typescript
@Injectable()
export class DatabaseHealthCheck implements IHealthCheck {
  name = 'database';
  type = HealthCheckType.DATABASE;
  timeout = 5000;
  retries = 3;

  constructor(private dataSource: DataSource) {}

  async check(): Promise<IHealthCheckResult> {
    const startTime = Date.now();

    try {
      await this.dataSource.query('SELECT 1');

      return {
        status: HealthStatus.HEALTHY,
        message: 'Database connection is healthy',
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: `Database connection failed: ${error.message}`,
        details: { error: error.message },
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }
}
```

## Система алертов

### Alert Configuration

```typescript
interface IAlert {
  id: string;
  name: string;
  description: string;
  condition: IAlertCondition;
  severity: AlertSeverity;
  channels: string[];
  enabled: boolean;
  cooldown: number;
  lastTriggered?: Date;
  metadata: Record<string, any>;
}

interface IAlertCondition {
  metric: string;
  operator: ComparisonOperator;
  threshold: number;
  timeWindow: number;
  aggregation: AggregationType;
}

enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

enum ComparisonOperator {
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
}
```

### Alert Processing

```typescript
@Injectable()
export class AlertProcessor {
  constructor(
    private alertingService: UnifiedAlertingService,
    private notificationService: NotificationService
  ) {}

  async processAlert(alert: IAlert, metricValue: number): Promise<void> {
    if (!alert.enabled) return;

    const isTriggered = this.evaluateCondition(alert.condition, metricValue);

    if (isTriggered && this.shouldTrigger(alert)) {
      await this.triggerAlert(alert, metricValue);
    }
  }

  private async triggerAlert(
    alert: IAlert,
    metricValue: number
  ): Promise<void> {
    const alertInstance: IAlertInstance = {
      id: this.generateAlertInstanceId(),
      alertId: alert.id,
      severity: alert.severity,
      message: this.formatAlertMessage(alert, metricValue),
      timestamp: new Date(),
      resolved: false,
    };

    await this.alertingService.createAlert(alertInstance);

    // Send notifications
    for (const channel of alert.channels) {
      await this.notificationService.sendAlert(channel, alertInstance);
    }

    // Update last triggered time
    alert.lastTriggered = new Date();
  }
}
```

## Performance Analytics

### Performance Analysis

```typescript
interface IPerformanceAnalysis {
  timeRange: ITimeRange;
  metrics: {
    responseTime: IPerformanceMetric;
    throughput: IPerformanceMetric;
    errorRate: IPerformanceMetric;
    availability: IPerformanceMetric;
  };
  trends: IPerformanceTrend[];
  bottlenecks: IBottleneck[];
  recommendations: IOptimizationRecommendation[];
}

interface IPerformanceMetric {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: TrendDirection;
}

enum TrendDirection {
  IMPROVING = 'improving',
  DEGRADING = 'degrading',
  STABLE = 'stable',
}
```

### Bottleneck Detection

```typescript
@Injectable()
export class BottleneckDetector {
  async detectBottlenecks(metrics: ISystemMetrics): Promise<IBottleneck[]> {
    const bottlenecks: IBottleneck[] = [];

    // CPU bottleneck
    if (metrics.cpu.usage > 80) {
      bottlenecks.push({
        type: 'cpu',
        severity: 'high',
        description: 'High CPU usage detected',
        recommendation:
          'Consider scaling horizontally or optimizing CPU-intensive operations',
        impact: 'May cause response time degradation',
      });
    }

    // Memory bottleneck
    if (metrics.memory.usage > 85) {
      bottlenecks.push({
        type: 'memory',
        severity: 'critical',
        description: 'High memory usage detected',
        recommendation: 'Check for memory leaks or increase memory allocation',
        impact: 'May cause out-of-memory errors',
      });
    }

    // Database bottleneck
    if (metrics.database.connectionPool.usage > 90) {
      bottlenecks.push({
        type: 'database',
        severity: 'high',
        description: 'Database connection pool nearly exhausted',
        recommendation: 'Increase connection pool size or optimize queries',
        impact: 'May cause database connection timeouts',
      });
    }

    return bottlenecks;
  }
}
```

## Dashboard и визуализация

### Grafana Integration

```typescript
@Injectable()
export class GrafanaService {
  constructor(private httpService: HttpService) {}

  async createDashboard(dashboard: IGrafanaDashboard): Promise<string> {
    const response = await this.httpService
      .post('/api/dashboards/db', {
        dashboard,
        overwrite: true,
      })
      .toPromise();

    return response.data.url;
  }

  async updateDashboard(
    dashboardId: string,
    updates: Partial<IGrafanaDashboard>
  ): Promise<void> {
    await this.httpService
      .put(`/api/dashboards/db/${dashboardId}`, {
        dashboard: updates,
        overwrite: true,
      })
      .toPromise();
  }

  async getDashboardData(
    dashboardId: string,
    timeRange: ITimeRange
  ): Promise<any> {
    const response = await this.httpService
      .get(`/api/dashboards/db/${dashboardId}`, {
        params: {
          from: timeRange.from.getTime(),
          to: timeRange.to.getTime(),
        },
      })
      .toPromise();

    return response.data;
  }
}
```

### Custom Dashboard API

```typescript
@Controller('monitoring/dashboard')
export class MonitoringDashboardController {
  constructor(private dashboardService: UnifiedMetricsDashboardService) {}

  @Get('system')
  async getSystemDashboard(): Promise<ISystemDashboard> {
    return this.dashboardService.getSystemDashboard();
  }

  @Get('service/:serviceId')
  async getServiceDashboard(
    @Param('serviceId') serviceId: string
  ): Promise<IServiceDashboard> {
    return this.dashboardService.getServiceDashboard(serviceId);
  }

  @Get('business')
  async getBusinessDashboard(): Promise<IBusinessDashboard> {
    return this.dashboardService.getBusinessDashboard();
  }

  @Get('alerts')
  async getAlertsDashboard(): Promise<IAlertsDashboard> {
    return this.dashboardService.getAlertsDashboard();
  }
}
```

## Конфигурация

### Monitoring Configuration

```yaml
# monitoring.yaml
monitoring:
  prometheus:
    enabled: true
    port: 9090
    path: '/metrics'
    retention: '15d'

  grafana:
    enabled: true
    url: 'http://grafana:3000'
    apiKey: '${GRAFANA_API_KEY}'
    dashboards:
      - name: 'System Overview'
        path: '/dashboards/system.json'
      - name: 'Application Metrics'
        path: '/dashboards/application.json'

  jaeger:
    enabled: true
    endpoint: 'http://jaeger:14268/api/traces'
    samplingRate: 0.1

  elasticsearch:
    enabled: true
    url: 'http://elasticsearch:9200'
    index: 'logs-*'
    retention: '30d'

  alerts:
    enabled: true
    channels:
      - type: 'slack'
        webhook: '${SLACK_WEBHOOK}'
      - type: 'email'
        smtp: '${SMTP_CONFIG}'
    rules:
      - name: 'High Error Rate'
        condition: 'error_rate > 0.05'
        severity: 'high'
        cooldown: '5m'
```

## Тестирование

### Monitoring Tests

```typescript
describe('UnifiedMetricsDashboardService', () => {
  let service: UnifiedMetricsDashboardService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UnifiedMetricsDashboardService],
    }).compile();

    service = module.get<UnifiedMetricsDashboardService>(
      UnifiedMetricsDashboardService
    );
  });

  it('should get system metrics', async () => {
    const metrics = await service.getSystemMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.cpu).toBeDefined();
    expect(metrics.memory).toBeDefined();
  });

  it('should detect bottlenecks', async () => {
    const mockMetrics = {
      cpu: { usage: 90 },
      memory: { usage: 85 },
      database: { connectionPool: { usage: 95 } },
    };

    const bottlenecks = await service.detectBottlenecks(mockMetrics);
    expect(bottlenecks.length).toBeGreaterThan(0);
  });
});
```

## Развертывание

### Docker Compose

```yaml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    ports:
      - '3001:3000'
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - '16686:16686'
      - '14268:14268'
    environment:
      - COLLECTOR_OTLP_ENABLED=true

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - '9200:9200'

  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    ports:
      - '5601:5601'
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  grafana-storage:
```

## Заключение

Блок 0.9.3 успешно реализует единую систему мониторинга и наблюдаемости с распределенной трассировкой, централизованным логированием и комплексными проверками здоровья. Система обеспечивает полную видимость в работу всех компонентов и позволяет быстро выявлять и устранять проблемы.

**Результат:** ✅ **Block 0.9.3: Мониторинг и наблюдаемость - 100% ГОТОВО!**
