import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface IUserSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  pageViews: number;
  events: number;
  referrer?: string;
  userAgent: string;
  ipAddress: string;
  device: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
  };
  location: {
    country: string;
    city: string;
    timezone: string;
  };
  isActive: boolean;
}

export interface IUserJourney {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  steps: Array<{
    timestamp: Date;
    event: string;
    page: string;
    properties: Record<string, unknown>;
    duration?: number;
  }>;
  conversion: boolean;
  conversionValue?: number;
  dropOffPoint?: string;
  totalDuration: number;
}

export interface IUserSegment {
  id: string;
  name: string;
  description: string;
  criteria: Array<{
    field: string;
    operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
    value: unknown;
  }>;
  users: string[];
  size: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserProfile {
  userId: string;
  firstSeen: Date;
  lastSeen: Date;
  totalSessions: number;
  totalPageViews: number;
  totalEvents: number;
  averageSessionDuration: number;
  totalDuration: number;
  deviceBreakdown: Record<string, number>;
  locationBreakdown: Record<string, number>;
  topPages: Array<{ page: string; views: number }>;
  topEvents: Array<{ event: string; count: number }>;
  conversionFunnel: {
    visitors: number;
    signups: number;
    trials: number;
    paid: number;
  };
  lifetimeValue: number;
  churnRisk: 'low' | 'medium' | 'high';
  engagementScore: number;
}

export interface IEngagementMetrics {
  userId: string;
  sessionCount: number;
  pageViewCount: number;
  eventCount: number;
  averageSessionDuration: number;
  bounceRate: number;
  returnRate: number;
  engagementScore: number;
  lastActivity: Date;
  streak: number; // consecutive days of activity
  totalTimeSpent: number;
}

@Injectable()
export class UserAnalyticsService {
  private readonly logger = new Logger(UserAnalyticsService.name);
  private userSessions = new Map<string, IUserSession[]>();
  private userJourneys = new Map<string, IUserJourney[]>();
  private userSegments = new Map<string, IUserSegment>();
  private userProfiles = new Map<string, IUserProfile>();
  private engagementMetrics = new Map<string, IEngagementMetrics>();

  constructor(
    private _configService: ConfigService,
    private eventEmitter: EventEmitter2
  ) {
    this._configService.get('USER_ANALYTICS_ENABLED');
    this.eventEmitter.emit('analytics.initialized');
    this.initializeDefaultSegments();
    this.startAnalyticsProcessing();
  }

  private initializeDefaultSegments(): void {
    const defaultSegments: IUserSegment[] = [
      {
        id: 'new-users',
        name: 'New Users',
        description: 'Users who joined in the last 7 days',
        criteria: [
          {
            field: 'firstSeen',
            operator: 'gte',
            value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        ],
        users: [],
        size: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'active-users',
        name: 'Active Users',
        description: 'Users with activity in the last 30 days',
        criteria: [
          {
            field: 'lastSeen',
            operator: 'gte',
            value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
          {
            field: 'totalSessions',
            operator: 'gte',
            value: 3,
          },
        ],
        users: [],
        size: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'high-value-users',
        name: 'High Value Users',
        description: 'Users with high lifetime value',
        criteria: [
          {
            field: 'lifetimeValue',
            operator: 'gte',
            value: 1000,
          },
        ],
        users: [],
        size: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'churn-risk-users',
        name: 'Churn Risk Users',
        description: 'Users at risk of churning',
        criteria: [
          {
            field: 'churnRisk',
            operator: 'eq',
            value: 'high',
          },
        ],
        users: [],
        size: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultSegments.forEach(segment => {
      this.userSegments.set(segment.id, segment);
    });

    this.logger.log(
      `Initialized ${defaultSegments.length} default user segments`
    );
  }

  private startAnalyticsProcessing(): void {
    // Обрабатываем аналитику каждые 5 минут
    setInterval(() => {
      void this.processUserAnalytics();
    }, 300000);

    // Обновляем сегменты каждые 30 минут
    setInterval(() => {
      void this.updateUserSegments();
    }, 1800000);
  }

  async trackUserEvent(
    userId: string,
    event: string,
    properties: Record<string, unknown>,
    sessionId: string,
    userAgent: string,
    ipAddress: string
  ): Promise<void> {
    try {
      // Получаем или создаем сессию
      let session = await this.getActiveSession(userId, sessionId);
      session ??= await this.createSession(
        userId,
        sessionId,
        userAgent,
        ipAddress
      );

      // Обновляем сессию
      session.events++;
      if (event === 'page_view') {
        session.pageViews++;
      }

      // Создаем или обновляем путешествие пользователя
      await this.updateUserJourney(userId, event, properties, sessionId);

      // Обновляем профиль пользователя
      await this.updateUserProfile(userId, event, properties);

      // Обновляем метрики вовлеченности
      await this.updateEngagementMetrics(userId);

      this.logger.debug(`Tracked event: ${event} for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error tracking user event: ${error}`);
    }
  }

  private async getActiveSession(
    userId: string,
    sessionId: string
  ): Promise<IUserSession | null> {
    const userSessions = this.userSessions.get(userId) ?? [];
    return (
      userSessions.find(
        session => session.id === sessionId && session.isActive
      ) ?? null
    );
  }

  private async createSession(
    userId: string,
    sessionId: string,
    userAgent: string,
    ipAddress: string
  ): Promise<IUserSession> {
    const session: IUserSession = {
      id: sessionId,
      userId,
      startTime: new Date(),
      pageViews: 0,
      events: 0,
      userAgent,
      ipAddress,
      device: this.parseUserAgent(userAgent),
      location: this.getLocationFromIP(ipAddress),
      isActive: true,
    };

    const userSessions = this.userSessions.get(userId) ?? [];
    userSessions.push(session);
    this.userSessions.set(userId, userSessions);

    return session;
  }

  private parseUserAgent(userAgent: string): IUserSession['device'] {
    // Простой парсинг User Agent (в реальном приложении использовалась бы библиотека)
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    const isTablet = /iPad|Tablet/.test(userAgent);

    let type: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (isTablet) type = 'tablet';
    else if (isMobile) type = 'mobile';

    const os = /Windows/.test(userAgent)
      ? 'Windows'
      : /Mac/.test(userAgent)
        ? 'macOS'
        : /Linux/.test(userAgent)
          ? 'Linux'
          : /Android/.test(userAgent)
            ? 'Android'
            : /iOS/.test(userAgent)
              ? 'iOS'
              : 'Unknown';

    const browser = /Chrome/.test(userAgent)
      ? 'Chrome'
      : /Firefox/.test(userAgent)
        ? 'Firefox'
        : /Safari/.test(userAgent)
          ? 'Safari'
          : /Edge/.test(userAgent)
            ? 'Edge'
            : 'Unknown';

    return { type, os, browser };
  }

  private getLocationFromIP(ipAddress: string): IUserSession['location'] {
    // Простая симуляция геолокации (в реальном приложении использовался бы сервис геолокации)
    const locations = [
      {
        country: 'United States',
        city: 'New York',
        timezone: 'America/New_York',
      },
      { country: 'United Kingdom', city: 'London', timezone: 'Europe/London' },
      { country: 'Germany', city: 'Berlin', timezone: 'Europe/Berlin' },
      { country: 'France', city: 'Paris', timezone: 'Europe/Paris' },
      { country: 'Japan', city: 'Tokyo', timezone: 'Asia/Tokyo' },
    ];

    const hash = ipAddress
      .split('.')
      .reduce((acc, part) => acc + parseInt(part), 0);
    return (
      locations[hash % locations.length] ?? {
        country: 'Unknown',
        city: 'Unknown',
        timezone: 'UTC',
      }
    );
  }

  private async updateUserJourney(
    userId: string,
    event: string,
    properties: Record<string, unknown>,

    _sessionId: string
  ): Promise<void> {
    const userJourneys = this.userJourneys.get(userId) ?? [];
    let activeJourney = userJourneys.find(journey => !journey.endTime);

    if (activeJourney == null) {
      activeJourney = {
        id: `journey-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        startTime: new Date(),
        steps: [],
        conversion: false,
        totalDuration: 0,
      };
      userJourneys.push(activeJourney);
    }

    activeJourney.steps.push({
      timestamp: new Date(),
      event,
      page: (properties.page as string) || 'unknown',
      properties,
      duration:
        activeJourney.steps.length > 0
          ? new Date().getTime() -
            (activeJourney.steps[
              activeJourney.steps.length - 1
            ]?.timestamp.getTime() ?? 0)
          : 0,
    });

    // Проверяем конверсию
    if (
      event === 'purchase' ||
      event === 'signup' ||
      event === 'subscription'
    ) {
      activeJourney.conversion = true;
      activeJourney.conversionValue = (properties.value as number) || 0;
      activeJourney.endTime = new Date();
      activeJourney.totalDuration =
        activeJourney.endTime.getTime() - activeJourney.startTime.getTime();
    }

    this.userJourneys.set(userId, userJourneys);
  }

  private async updateUserProfile(
    userId: string,
    event: string,
    properties: Record<string, unknown>
  ): Promise<void> {
    let profile = this.userProfiles.get(userId);
    const now = new Date();

    profile ??= {
      userId,
      firstSeen: now,
      lastSeen: now,
      totalSessions: 0,
      totalPageViews: 0,
      totalEvents: 0,
      averageSessionDuration: 0,
      totalDuration: 0,
      deviceBreakdown: {},
      locationBreakdown: {},
      topPages: [],
      topEvents: [],
      conversionFunnel: {
        visitors: 1,
        signups: 0,
        trials: 0,
        paid: 0,
      },
      lifetimeValue: 0,
      churnRisk: 'low',
      engagementScore: 0,
    };

    profile.lastSeen = now;
    profile.totalEvents++;

    if (event === 'page_view') {
      profile.totalPageViews++;

      // Обновляем топ страницы
      const page = properties.page ?? 'unknown';
      const existingPage = profile.topPages.find(p => p.page === page);
      if (existingPage != null) {
        existingPage.views++;
      } else {
        profile.topPages.push({ page: page as string, views: 1 });
      }
      profile.topPages.sort((a, b) => b.views - a.views);
    }

    // Обновляем топ события
    const existingEvent = profile.topEvents.find(e => e.event === event);
    if (existingEvent != null) {
      existingEvent.count++;
    } else {
      profile.topEvents.push({ event, count: 1 });
    }
    profile.topEvents.sort((a, b) => b.count - a.count);

    // Обновляем воронку конверсии
    if (event === 'signup') profile.conversionFunnel.signups++;
    if (event === 'trial_start') profile.conversionFunnel.trials++;
    if (event === 'purchase') profile.conversionFunnel.paid++;

    // Обновляем lifetime value
    if (event === 'purchase' && properties.value != null) {
      profile.lifetimeValue += (properties.value as number) || 0;
    }

    this.userProfiles.set(userId, profile);
  }

  private async updateEngagementMetrics(userId: string): Promise<void> {
    const profile = this.userProfiles.get(userId);
    if (profile == null) return;

    const sessions = this.userSessions.get(userId) ?? [];
    const activeSessions = sessions.filter(s => s.isActive);
    // Используем переменную для избежания ошибки
    if (activeSessions.length > 0) {
      this.logger.debug(`Active sessions: ${activeSessions.length}`);
    }
    const completedSessions = sessions.filter(s => !s.isActive);

    const totalDuration = completedSessions.reduce(
      (sum, s) => sum + (s.duration ?? 0),
      0
    );
    const averageSessionDuration =
      completedSessions.length > 0
        ? totalDuration / completedSessions.length
        : 0;

    const engagementScore = this.calculateEngagementScore(profile, sessions);

    const metrics: IEngagementMetrics = {
      userId,
      sessionCount: sessions.length,
      pageViewCount: profile.totalPageViews,
      eventCount: profile.totalEvents,
      averageSessionDuration,
      bounceRate: this.calculateBounceRate(sessions),
      returnRate: this.calculateReturnRate(sessions),
      engagementScore,
      lastActivity: profile.lastSeen,
      streak: this.calculateStreak(userId),
      totalTimeSpent: totalDuration,
    };

    this.engagementMetrics.set(userId, metrics);
  }

  private calculateEngagementScore(
    profile: IUserProfile,

    _sessions: IUserSession[]
  ): number {
    let score = 0;

    // Базовый счет на основе активности
    score += Math.min(profile.totalSessions * 10, 100);
    score += Math.min(profile.totalPageViews * 2, 50);
    score += Math.min(profile.totalEvents * 1, 30);

    // Бонус за конверсии
    if (profile.conversionFunnel.signups > 0) score += 20;
    if (profile.conversionFunnel.trials > 0) score += 30;
    if (profile.conversionFunnel.paid > 0) score += 50;

    // Бонус за lifetime value
    score += Math.min(profile.lifetimeValue / 100, 50);

    return Math.min(score, 100);
  }

  private calculateBounceRate(sessions: IUserSession[]): number {
    if (sessions.length === 0) return 0;

    const bouncedSessions = sessions.filter(s => s.pageViews <= 1).length;
    return (bouncedSessions / sessions.length) * 100;
  }

  private calculateReturnRate(sessions: IUserSession[]): number {
    if (sessions.length <= 1) return 0;

    const uniqueDays = new Set(sessions.map(s => s.startTime.toDateString()))
      .size;

    return (uniqueDays / sessions.length) * 100;
  }

  private calculateStreak(userId: string): number {
    const sessions = this.userSessions.get(userId) ?? [];
    if (sessions.length === 0) return 0;

    const sortedSessions = sessions.sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    );
    let streak = 0;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const session of sortedSessions) {
      const sessionDate = new Date(session.startTime);
      sessionDate.setHours(0, 0, 0, 0);

      if (sessionDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (sessionDate.getTime() < currentDate.getTime()) {
        break;
      }
    }

    return streak;
  }

  private async processUserAnalytics(): Promise<void> {
    try {
      // Обрабатываем завершенные сессии
      for (const [, sessions] of this.userSessions) {
        for (const session of sessions) {
          if (session.isActive && this.isSessionExpired(session)) {
            await this.endSession(session);
          }
        }
      }

      // Обновляем метрики риска оттока
      await this.updateChurnRisk();

      this.logger.debug('User analytics processed');
    } catch (error) {
      this.logger.error('Error processing user analytics:', error);
    }
  }

  private isSessionExpired(session: IUserSession): boolean {
    const now = new Date();
    const sessionAge = now.getTime() - session.startTime.getTime();
    return sessionAge > 30 * 60 * 1000; // 30 минут
  }

  private async endSession(session: IUserSession): Promise<void> {
    session.endTime = new Date();
    session.duration = session.endTime.getTime() - session.startTime.getTime();
    session.isActive = false;

    // Обновляем профиль пользователя
    const profile = this.userProfiles.get(session.userId);
    if (profile) {
      profile.totalSessions++;
      profile.totalDuration += session.duration;
      profile.averageSessionDuration =
        profile.totalDuration / profile.totalSessions;

      // Обновляем разбивку по устройствам
      const deviceKey = `${session.device.type}-${session.device.os}`;
      profile.deviceBreakdown[deviceKey] =
        (profile.deviceBreakdown[deviceKey] ?? 0) + 1;

      // Обновляем разбивку по локациям
      const locationKey = session.location.country;
      profile.locationBreakdown[locationKey] =
        (profile.locationBreakdown[locationKey] ?? 0) + 1;
    }
  }

  private async updateChurnRisk(): Promise<void> {
    for (const [userId, profile] of this.userProfiles) {
      const daysSinceLastSeen =
        (Date.now() - profile.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
      const engagementScore =
        this.engagementMetrics.get(userId)?.engagementScore ?? 0;

      let churnRisk: 'low' | 'medium' | 'high' = 'low';

      if (daysSinceLastSeen > 30 || engagementScore < 20) {
        churnRisk = 'high';
      } else if (daysSinceLastSeen > 14 || engagementScore < 40) {
        churnRisk = 'medium';
      }

      profile.churnRisk = churnRisk;
    }
  }

  private async updateUserSegments(): Promise<void> {
    for (const [, segment] of this.userSegments) {
      const matchingUsers: string[] = [];

      for (const [userId, profile] of this.userProfiles) {
        if (this.userMatchesSegment(profile, segment)) {
          matchingUsers.push(userId);
        }
      }

      segment.users = matchingUsers;
      segment.size = matchingUsers.length;
      segment.updatedAt = new Date();
    }

    this.logger.debug('User segments updated');
  }

  private userMatchesSegment(
    profile: IUserProfile,
    segment: IUserSegment
  ): boolean {
    return segment.criteria.every(criteria => {
      const value = this.getProfileValue(profile, criteria.field);
      return this.evaluateCriteria(value, criteria.operator, criteria.value);
    });
  }

  private getProfileValue(profile: IUserProfile, field: string): unknown {
    switch (field) {
      case 'firstSeen':
        return profile.firstSeen;
      case 'lastSeen':
        return profile.lastSeen;
      case 'totalSessions':
        return profile.totalSessions;
      case 'lifetimeValue':
        return profile.lifetimeValue;
      case 'churnRisk':
        return profile.churnRisk;
      default:
        return undefined;
    }
  }

  private evaluateCriteria(
    value: unknown,
    operator: string,
    expectedValue: unknown
  ): boolean {
    switch (operator) {
      case 'eq':
        return value === expectedValue;
      case 'gt':
        return (value as number) > (expectedValue as number);
      case 'lt':
        return (value as number) < (expectedValue as number);
      case 'gte':
        return (value as number) >= (expectedValue as number);
      case 'lte':
        return (value as number) <= (expectedValue as number);
      case 'contains':
        return String(value).includes(String(expectedValue));
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(value);
      default:
        return false;
    }
  }

  async getUserProfile(userId: string): Promise<IUserProfile | null> {
    return this.userProfiles.get(userId) ?? null;
  }

  async getUserSessions(
    userId: string,
    timeRange?: { from: Date; to: Date }
  ): Promise<IUserSession[]> {
    let sessions = this.userSessions.get(userId) ?? [];

    if (timeRange != null) {
      sessions = sessions.filter(
        session =>
          session.startTime >= timeRange.from &&
          session.startTime <= timeRange.to
      );
    }

    return sessions.sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    );
  }

  async getUserJourneys(
    userId: string,
    timeRange?: { from: Date; to: Date }
  ): Promise<IUserJourney[]> {
    let journeys = this.userJourneys.get(userId) ?? [];

    if (timeRange != null) {
      journeys = journeys.filter(
        journey =>
          journey.startTime >= timeRange.from &&
          journey.startTime <= timeRange.to
      );
    }

    return journeys.sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    );
  }

  async getEngagementMetrics(
    userId: string
  ): Promise<IEngagementMetrics | null> {
    return this.engagementMetrics.get(userId) ?? null;
  }

  async getUserSegment(segmentId: string): Promise<IUserSegment | null> {
    return this.userSegments.get(segmentId) ?? null;
  }

  async getAllUserSegments(): Promise<IUserSegment[]> {
    return Array.from(this.userSegments.values());
  }

  async createUserSegment(
    segment: Omit<
      IUserSegment,
      'id' | 'users' | 'size' | 'createdAt' | 'updatedAt'
    >
  ): Promise<IUserSegment> {
    const id = `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newSegment: IUserSegment = {
      ...segment,
      id,
      users: [],
      size: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.userSegments.set(id, newSegment);

    // Обновляем пользователей в сегменте
    await this.updateUserSegments();

    this.logger.log(`Created user segment: ${id}`);

    return newSegment;
  }

  async getAnalyticsSummary(): Promise<{
    totalUsers: number;
    totalSessions: number;
    totalPageViews: number;
    totalEvents: number;
    averageSessionDuration: number;
    bounceRate: number;
    conversionRate: number;
    topPages: Array<{ page: string; views: number }>;
    topEvents: Array<{ event: string; count: number }>;
    deviceBreakdown: Array<{ device: string; percentage: number }>;
    locationBreakdown: Array<{ location: string; percentage: number }>;
    churnRiskBreakdown: Array<{
      risk: string;
      count: number;
      percentage: number;
    }>;
  }> {
    const totalUsers = this.userProfiles.size;
    const allSessions = Array.from(this.userSessions.values()).flat();
    const totalSessions = allSessions.length;
    const totalPageViews = Array.from(this.userProfiles.values()).reduce(
      (sum, profile) => sum + profile.totalPageViews,
      0
    );
    const totalEvents = Array.from(this.userProfiles.values()).reduce(
      (sum, profile) => sum + profile.totalEvents,
      0
    );

    const completedSessions = allSessions.filter(s => s.duration != null);
    const averageSessionDuration =
      completedSessions.length > 0
        ? completedSessions.reduce((sum, s) => sum + (s.duration ?? 0), 0) /
          completedSessions.length
        : 0;

    const bounceRate = this.calculateBounceRate(allSessions);

    const totalConversions = Array.from(this.userProfiles.values()).reduce(
      (sum, profile) => sum + profile.conversionFunnel.paid,
      0
    );
    const conversionRate =
      totalUsers > 0 ? (totalConversions / totalUsers) * 100 : 0;

    // Топ страницы
    const pageViews = new Map<string, number>();
    for (const profile of this.userProfiles.values()) {
      for (const page of profile.topPages) {
        pageViews.set(page.page, (pageViews.get(page.page) ?? 0) + page.views);
      }
    }

    const topPages = Array.from(pageViews.entries())
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Топ события
    const eventCounts = new Map<string, number>();
    for (const profile of this.userProfiles.values()) {
      for (const event of profile.topEvents) {
        eventCounts.set(
          event.event,
          (eventCounts.get(event.event) ?? 0) + event.count
        );
      }
    }

    const topEvents = Array.from(eventCounts.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Разбивка по устройствам
    const deviceCounts = new Map<string, number>();
    for (const profile of this.userProfiles.values()) {
      for (const [device, count] of Object.entries(profile.deviceBreakdown)) {
        deviceCounts.set(device, (deviceCounts.get(device) ?? 0) + count);
      }
    }

    const totalDeviceSessions = Array.from(deviceCounts.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    const deviceBreakdown = Array.from(deviceCounts.entries())
      .map(([device, count]) => ({
        device,
        percentage:
          totalDeviceSessions > 0 ? (count / totalDeviceSessions) * 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // Разбивка по локациям
    const locationCounts = new Map<string, number>();
    for (const profile of this.userProfiles.values()) {
      for (const [location, count] of Object.entries(
        profile.locationBreakdown
      )) {
        locationCounts.set(
          location,
          (locationCounts.get(location) ?? 0) + count
        );
      }
    }

    const totalLocationSessions = Array.from(locationCounts.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    const locationBreakdown = Array.from(locationCounts.entries())
      .map(([location, count]) => ({
        location,
        percentage:
          totalLocationSessions > 0 ? (count / totalLocationSessions) * 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // Разбивка по риску оттока
    const churnRiskCounts = { low: 0, medium: 0, high: 0 };
    for (const profile of this.userProfiles.values()) {
      churnRiskCounts[profile.churnRisk]++;
    }

    const churnRiskBreakdown = Object.entries(churnRiskCounts).map(
      ([risk, count]) => ({
        risk,
        count,
        percentage: totalUsers > 0 ? (count / totalUsers) * 100 : 0,
      })
    );

    return {
      totalUsers,
      totalSessions,
      totalPageViews,
      totalEvents,
      averageSessionDuration,
      bounceRate,
      conversionRate,
      topPages,
      topEvents,
      deviceBreakdown,
      locationBreakdown,
      churnRiskBreakdown,
    };
  }
}
