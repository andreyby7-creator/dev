import type { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type {
  ISystemMetrics,
  IBusinessMetrics,
} from '../observability.service';

export interface IUserActivityMetrics {
  dau: number; // Daily Active Users
  mau: number; // Monthly Active Users
  wau: number; // Weekly Active Users
  ctr: number; // Click Through Rate (%)
  roi: number; // Return on Investment (%)
  activeUsers: number;
  totalTransactions: number;
  averageSessionDuration: number; // в минутах
  bounceRate: number; // процент отказов
  conversionRate: number; // процент конверсии
  revenuePerUser: number; // доход на пользователя
  retentionRate: number; // процент удержания
}

export interface IBusinessMetricsExtended extends IBusinessMetrics {
  userActivity: IUserActivityMetrics;
  trends: {
    dauGrowth: number; // рост DAU в %
    mauGrowth: number; // рост MAU в %
    revenueGrowth: number; // рост дохода в %
  };
}

@Injectable()
export class MetricsService implements OnModuleInit {
  private requestCount = 0;
  private errorCount = 0;
  private startTime = Date.now();
  private activeConnections = 0;
  private userSessions: Map<
    string,
    { startTime: number; lastActivity: number }
  > = new Map();
  private transactions: Array<{
    amount: number;
    timestamp: number;
    userId: string;
  }> = [];
  private clicks: Array<{ timestamp: number; userId: string; target: string }> =
    [];
  private conversions: Array<{
    timestamp: number;
    userId: string;
    value: number;
  }> = [];

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  async initialize(): Promise<void> {
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.activeConnections = 0;
    this.userSessions.clear();
    this.transactions = [];
    this.clicks = [];
    this.conversions = [];
  }

  async getSystemMetrics(): Promise<ISystemMetrics> {
    const processMemory = process.memoryUsage();
    const uptime = Date.now() - this.startTime;
    const errorRate =
      this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    return {
      cpu: process.cpuUsage().user / 1000000, // CPU usage in seconds
      memory: processMemory.heapUsed / 1024 / 1024, // Memory usage in MB
      uptime: uptime / 1000, // Uptime in seconds
      activeConnections: this.activeConnections,
      requestCount: this.requestCount,
      errorRate: Math.round(errorRate * 100) / 100, // Round to 2 decimal places
    };
  }

  async getBusinessMetrics(): Promise<IBusinessMetrics> {
    const userActivity = await this.getUserActivityMetrics();

    return {
      dau: userActivity.dau,
      mau: userActivity.mau,
      ctr: userActivity.ctr,
      roi: userActivity.roi,
      activeUsers: userActivity.activeUsers,
      totalTransactions: userActivity.totalTransactions,
    };
  }

  async getBusinessMetricsExtended(): Promise<IBusinessMetricsExtended> {
    const userActivity = await this.getUserActivityMetrics();
    const trends = await this.calculateTrends();

    return {
      dau: userActivity.dau,
      mau: userActivity.mau,
      ctr: userActivity.ctr,
      roi: userActivity.roi,
      activeUsers: userActivity.activeUsers,
      totalTransactions: userActivity.totalTransactions,
      userActivity,
      trends,
    };
  }

  private async getUserActivityMetrics(): Promise<IUserActivityMetrics> {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Подсчитываем активных пользователей
    const activeUsersToday = new Set<string>();
    const activeUsersWeek = new Set<string>();
    const activeUsersMonth = new Set<string>();

    this.userSessions.forEach((session, userId) => {
      if (session.lastActivity >= oneDayAgo) {
        activeUsersToday.add(userId);
      }
      if (session.lastActivity >= oneWeekAgo) {
        activeUsersWeek.add(userId);
      }
      if (session.lastActivity >= oneMonthAgo) {
        activeUsersMonth.add(userId);
      }
    });

    // Подсчитываем транзакции
    const recentTransactions = this.transactions.filter(
      t => t.timestamp >= oneDayAgo
    );
    const totalRevenue = recentTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );

    // Подсчитываем клики и конверсии
    const recentClicks = this.clicks.filter(c => c.timestamp >= oneDayAgo);
    const recentConversions = this.conversions.filter(
      c => c.timestamp >= oneDayAgo
    );

    // Вычисляем метрики
    const dau = activeUsersToday.size;
    const wau = activeUsersWeek.size;
    const mau = activeUsersMonth.size;
    const totalTransactions = recentTransactions.length;
    const conversionRate =
      recentClicks.length > 0
        ? (recentConversions.length / recentClicks.length) * 100
        : 0;
    const revenuePerUser = dau > 0 ? totalRevenue / dau : 0;

    // Вычисляем среднюю длительность сессии
    let totalSessionDuration = 0;
    let sessionCount = 0;
    this.userSessions.forEach(session => {
      const duration = session.lastActivity - session.startTime;
      if (duration > 0) {
        totalSessionDuration += duration;
        sessionCount++;
      }
    });
    const averageSessionDuration =
      sessionCount > 0 ? totalSessionDuration / sessionCount / (1000 * 60) : 0; // в минутах

    // Вычисляем CTR (Click Through Rate)
    const ctr =
      recentClicks.length > 0
        ? (recentConversions.length / recentClicks.length) * 100
        : 0;

    // Вычисляем ROI (Return on Investment) - упрощенная версия
    const roi = totalRevenue > 0 ? (totalRevenue / (dau * 0.1)) * 100 : 0; // предполагаем стоимость привлечения пользователя

    // Вычисляем процент отказов (bounce rate) - упрощенная версия
    const bounceRate =
      this.userSessions.size > 0
        ? (Array.from(this.userSessions.values()).filter(
            s => s.lastActivity - s.startTime < 30000
          ).length /
            this.userSessions.size) *
          100
        : 0;

    // Вычисляем процент удержания (retention rate) - упрощенная версия
    const retentionRate = mau > 0 ? (dau / mau) * 100 : 0;

    return {
      dau,
      mau,
      wau,
      ctr,
      roi,
      activeUsers: dau,
      totalTransactions,
      averageSessionDuration: Math.round(averageSessionDuration * 100) / 100,
      bounceRate: Math.round(bounceRate * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      revenuePerUser: Math.round(revenuePerUser * 100) / 100,
      retentionRate: Math.round(retentionRate * 100) / 100,
    };
  }

  private async calculateTrends(): Promise<{
    dauGrowth: number;
    mauGrowth: number;
    revenueGrowth: number;
  }> {
    // Упрощенный расчет трендов - в реальном проекте здесь была бы историческая база данных
    const currentDau = (await this.getUserActivityMetrics()).dau;
    const currentMau = (await this.getUserActivityMetrics()).mau;
    const currentRevenue = this.transactions
      .filter(t => t.timestamp >= Date.now() - 24 * 60 * 60 * 1000)
      .reduce((sum, t) => sum + t.amount, 0);

    // Предполагаем базовые значения для расчета роста
    const baseDau = Math.max(currentDau - 10, 1);
    const baseMau = Math.max(currentMau - 50, 1);
    const baseRevenue = Math.max(currentRevenue - 100, 1);

    return {
      dauGrowth: ((currentDau - baseDau) / baseDau) * 100,
      mauGrowth: ((currentMau - baseMau) / baseMau) * 100,
      revenueGrowth: ((currentRevenue - baseRevenue) / baseRevenue) * 100,
    };
  }

  // Методы для отслеживания пользовательской активности
  trackUserSession(userId: string): void {
    const now = Date.now();
    const session = this.userSessions.get(userId);
    if (session) {
      session.lastActivity = now;
    } else {
      this.userSessions.set(userId, { startTime: now, lastActivity: now });
    }
  }

  trackTransaction(amount: number, userId: string): void {
    this.transactions.push({
      userId,
      amount,
      timestamp: Date.now(),
    });
  }

  trackClick(target: string, userId: string): void {
    this.clicks.push({
      userId,
      target,
      timestamp: Date.now(),
    });
  }

  trackConversion(value: number, userId: string): void {
    this.conversions.push({
      userId,
      value,
      timestamp: Date.now(),
    });
  }

  incrementRequestCount(): void {
    this.requestCount++;
  }

  incrementErrorCount(): void {
    this.errorCount++;
  }

  setActiveConnections(count: number): void {
    this.activeConnections = count;
  }

  getPrometheusMetrics(): string {
    const systemMetrics = this.getSystemMetricsSync();
    const userActivity = this.getUserActivityMetricsSync();

    return `# HELP api_requests_total Total number of API requests
# TYPE api_requests_total counter
api_requests_total ${this.requestCount}

# HELP api_errors_total Total number of API errors
# TYPE api_errors_total counter
api_errors_total ${this.errorCount}

# HELP api_error_rate Error rate percentage
# TYPE api_error_rate gauge
api_error_rate ${systemMetrics.errorRate}

# HELP api_memory_usage_bytes Memory usage in bytes
# TYPE api_memory_usage_bytes gauge
api_memory_usage_bytes ${process.memoryUsage().heapUsed}

# HELP api_cpu_usage_seconds CPU usage in seconds
# TYPE api_cpu_usage_seconds gauge
api_cpu_usage_seconds ${systemMetrics.cpu}

# HELP api_uptime_seconds Application uptime in seconds
# TYPE api_uptime_seconds gauge
api_uptime_seconds ${systemMetrics.uptime}

# HELP api_active_connections Active connections count
# TYPE api_active_connections gauge
api_active_connections ${this.activeConnections}

# HELP business_dau Daily active users
# TYPE business_dau gauge
business_dau ${userActivity.dau}

# HELP business_mau Monthly active users
# TYPE business_mau gauge
business_mau ${userActivity.mau}

# HELP business_ctr Click through rate percentage
# TYPE business_ctr gauge
business_ctr ${userActivity.ctr}

# HELP business_roi Return on investment percentage
# TYPE business_roi gauge
business_roi ${userActivity.roi}

# HELP business_conversion_rate Conversion rate percentage
# TYPE business_conversion_rate gauge
business_conversion_rate ${userActivity.conversionRate}

# HELP business_revenue_per_user Revenue per user
# TYPE business_revenue_per_user gauge
business_revenue_per_user ${userActivity.revenuePerUser}`;
  }

  private getSystemMetricsSync(): ISystemMetrics {
    const processMemory = process.memoryUsage();
    const uptime = Date.now() - this.startTime;
    const errorRate =
      this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    return {
      cpu: process.cpuUsage().user / 1000000,
      memory: processMemory.heapUsed / 1024 / 1024,
      uptime: uptime / 1000,
      activeConnections: this.activeConnections,
      requestCount: this.requestCount,
      errorRate: Math.round(errorRate * 100) / 100,
    };
  }

  private getUserActivityMetricsSync(): IUserActivityMetrics {
    // Синхронная версия для Prometheus метрик
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const activeUsersToday = new Set<string>();
    const activeUsersMonth = new Set<string>();

    this.userSessions.forEach((session, userId) => {
      if (session.lastActivity >= oneDayAgo) {
        activeUsersToday.add(userId);
      }
      if (session.lastActivity >= oneMonthAgo) {
        activeUsersMonth.add(userId);
      }
    });

    const recentTransactions = this.transactions.filter(
      t => t.timestamp >= oneDayAgo
    );
    const recentClicks = this.clicks.filter(c => c.timestamp >= oneDayAgo);
    const recentConversions = this.conversions.filter(
      c => c.timestamp >= oneDayAgo
    );
    const totalRevenue = recentTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );

    const dau = activeUsersToday.size;
    const mau = activeUsersMonth.size;
    const ctr =
      recentClicks.length > 0
        ? (recentConversions.length / recentClicks.length) * 100
        : 0;
    const roi = totalRevenue > 0 ? (totalRevenue / (dau * 0.1)) * 100 : 0;
    const conversionRate =
      recentClicks.length > 0
        ? (recentConversions.length / recentClicks.length) * 100
        : 0;
    const revenuePerUser = dau > 0 ? totalRevenue / dau : 0;

    return {
      dau,
      mau,
      wau: 0, // Упрощено для синхронной версии
      ctr,
      roi,
      activeUsers: dau,
      totalTransactions: recentTransactions.length,
      averageSessionDuration: 0, // Упрощено для синхронной версии
      bounceRate: 0, // Упрощено для синхронной версии
      conversionRate,
      revenuePerUser,
      retentionRate: 0, // Упрощено для синхронной версии
    };
  }
}
