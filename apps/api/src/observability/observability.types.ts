export interface ILogContext {
  [key: string]: string | number | boolean | undefined | null;
}

export interface IMetricsData {
  timestamp: Date;
  value: number;
  labels: Record<string, string>;
}

export interface ITraceSpan {
  traceId: string;
  spanId: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  context?: ILogContext;
  result?: ILogContext;
  status: 'active' | 'completed' | 'error';
}

export interface IHealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  timestamp: string;
  duration?: number;
}

export interface IHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: IHealthCheck[];
}

export interface ISystemMetrics {
  cpu: number;
  memory: number;
  uptime: number;
  activeConnections: number;
  requestCount: number;
  errorRate: number;
}

export interface IBusinessMetrics {
  dau: number;
  mau: number;
  ctr: number;
  roi: number;
  activeUsers: number;
  totalTransactions: number;
}

export interface IDashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'status';
  title: string;
  description?: string;
  config?: ILogContext;
}

export interface IDashboardData {
  widgets: IDashboardWidget[];
  layout: Record<string, unknown>;
  refreshInterval: number;
}
