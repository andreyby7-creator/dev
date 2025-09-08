import { Injectable } from '@nestjs/common';
import { redactedLogger } from '../utils/redacted-logger';

export interface IGeographicRegion {
  id: string;
  name: string;
  country: string;
  region?: string;
  city?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  timezone: string;
  currency: string;
  language: string;
}

export interface IRoutingRule {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  conditions: {
    countries?: string[];
    regions?: string[];
    cities?: string[];
    timezones?: string[];
    userAgents?: string[];
    ipRanges?: string[];
  };
  actions: {
    cdnProvider: 'cloudflare' | 'aws' | 'yandex' | 'vk' | 'local';
    databaseRegion: string;
    cacheRegion: string;
    redirectUrl?: string;
    customHeaders?: Record<string, string>;
  };
}

export interface IRoutingResult {
  region: IGeographicRegion;
  cdnProvider: string;
  databaseRegion: string;
  cacheRegion: string;
  latency: number;
  redirectUrl?: string;
  customHeaders?: Record<string, string>;
}

export interface IGeographicStats {
  regionId: string;
  requestCount: number;
  averageLatency: number;
  errorRate: number;
  lastUpdated: Date;
}

@Injectable()
export class GeographicRoutingService {
  private readonly logger = redactedLogger;
  private readonly regions: Map<string, IGeographicRegion> = new Map();
  private readonly routingRules: Map<string, IRoutingRule> = new Map();
  private readonly stats: Map<string, IGeographicStats> = new Map();

  constructor() {
    this.initializeRegions();
    this.initializeRoutingRules();
  }

  /**
   * Инициализирует регионы РФ и РБ
   */
  private initializeRegions(): void {
    const regions: IGeographicRegion[] = [
      // Россия
      {
        id: 'moscow',
        name: 'Москва',
        country: 'RU',
        region: 'Moscow',
        city: 'Moscow',
        coordinates: { lat: 55.7558, lng: 37.6176 },
        timezone: 'Europe/Moscow',
        currency: 'RUB',
        language: 'ru',
      },
      {
        id: 'spb',
        name: 'Санкт-Петербург',
        country: 'RU',
        region: 'Saint Petersburg',
        city: 'Saint Petersburg',
        coordinates: { lat: 59.9311, lng: 30.3609 },
        timezone: 'Europe/Moscow',
        currency: 'RUB',
        language: 'ru',
      },
      {
        id: 'novosibirsk',
        name: 'Новосибирск',
        country: 'RU',
        region: 'Novosibirsk',
        city: 'Novosibirsk',
        coordinates: { lat: 55.0084, lng: 82.9357 },
        timezone: 'Asia/Novosibirsk',
        currency: 'RUB',
        language: 'ru',
      },
      {
        id: 'ekaterinburg',
        name: 'Екатеринбург',
        country: 'RU',
        region: 'Sverdlovsk',
        city: 'Yekaterinburg',
        coordinates: { lat: 56.8431, lng: 60.6454 },
        timezone: 'Asia/Yekaterinburg',
        currency: 'RUB',
        language: 'ru',
      },
      {
        id: 'kazan',
        name: 'Казань',
        country: 'RU',
        region: 'Tatarstan',
        city: 'Kazan',
        coordinates: { lat: 55.7887, lng: 49.1221 },
        timezone: 'Europe/Moscow',
        currency: 'RUB',
        language: 'ru',
      },
      // Беларусь
      {
        id: 'minsk',
        name: 'Минск',
        country: 'BY',
        region: 'Minsk',
        city: 'Minsk',
        coordinates: { lat: 53.9045, lng: 27.5615 },
        timezone: 'Europe/Minsk',
        currency: 'BYN',
        language: 'be',
      },
      {
        id: 'gomel',
        name: 'Гомель',
        country: 'BY',
        region: 'Gomel',
        city: 'Gomel',
        coordinates: { lat: 52.4242, lng: 31.0143 },
        timezone: 'Europe/Minsk',
        currency: 'BYN',
        language: 'be',
      },
      {
        id: 'mogilev',
        name: 'Могилев',
        country: 'BY',
        region: 'Mogilev',
        city: 'Mogilev',
        coordinates: { lat: 53.9006, lng: 30.3324 },
        timezone: 'Europe/Minsk',
        currency: 'BYN',
        language: 'be',
      },
      {
        id: 'vitebsk',
        name: 'Витебск',
        country: 'BY',
        region: 'Vitebsk',
        city: 'Vitebsk',
        coordinates: { lat: 55.1904, lng: 30.2049 },
        timezone: 'Europe/Minsk',
        currency: 'BYN',
        language: 'be',
      },
      {
        id: 'grodno',
        name: 'Гродно',
        country: 'BY',
        region: 'Grodno',
        city: 'Grodno',
        coordinates: { lat: 53.6694, lng: 23.8131 },
        timezone: 'Europe/Minsk',
        currency: 'BYN',
        language: 'be',
      },
    ];

    for (const region of regions) {
      this.regions.set(region.id, region);
    }

    this.logger.log(
      'Geographic regions initialized',
      'GeographicRoutingService'
    );
  }

  /**
   * Инициализирует правила роутинга
   */
  private initializeRoutingRules(): void {
    const rules: IRoutingRule[] = [
      // Москва - высокий приоритет
      {
        id: 'moscow_rule',
        name: 'Москва - Основной регион',
        priority: 1,
        enabled: true,
        conditions: {
          countries: ['RU'],
          cities: ['Moscow'],
        },
        actions: {
          cdnProvider: 'yandex',
          databaseRegion: 'moscow',
          cacheRegion: 'moscow',
          customHeaders: {
            'X-Region': 'moscow',
            'X-CDN': 'yandex',
          },
        },
      },
      // Санкт-Петербург
      {
        id: 'spb_rule',
        name: 'Санкт-Петербург',
        priority: 2,
        enabled: true,
        conditions: {
          countries: ['RU'],
          cities: ['Saint Petersburg'],
        },
        actions: {
          cdnProvider: 'yandex',
          databaseRegion: 'spb',
          cacheRegion: 'spb',
          customHeaders: {
            'X-Region': 'spb',
            'X-CDN': 'yandex',
          },
        },
      },
      // Минск - высокий приоритет
      {
        id: 'minsk_rule',
        name: 'Минск - Основной регион',
        priority: 1,
        enabled: true,
        conditions: {
          countries: ['BY'],
          cities: ['Minsk'],
        },
        actions: {
          cdnProvider: 'local',
          databaseRegion: 'minsk',
          cacheRegion: 'minsk',
          customHeaders: {
            'X-Region': 'minsk',
            'X-CDN': 'local',
          },
        },
      },
      // Остальная Россия
      {
        id: 'russia_rule',
        name: 'Остальная Россия',
        priority: 5,
        enabled: true,
        conditions: {
          countries: ['RU'],
        },
        actions: {
          cdnProvider: 'yandex',
          databaseRegion: 'moscow',
          cacheRegion: 'moscow',
          customHeaders: {
            'X-Region': 'russia',
            'X-CDN': 'yandex',
          },
        },
      },
      // Остальная Беларусь
      {
        id: 'belarus_rule',
        name: 'Остальная Беларусь',
        priority: 5,
        enabled: true,
        conditions: {
          countries: ['BY'],
        },
        actions: {
          cdnProvider: 'local',
          databaseRegion: 'minsk',
          cacheRegion: 'minsk',
          customHeaders: {
            'X-Region': 'belarus',
            'X-CDN': 'local',
          },
        },
      },
    ];

    for (const rule of rules) {
      this.routingRules.set(rule.id, rule);
    }

    this.logger.log(
      'Geographic routing rules initialized',
      'GeographicRoutingService'
    );
  }

  /**
   * Определяет регион по IP адресу
   */
  async determineRegion(ipAddress: string): Promise<IGeographicRegion | null> {
    try {
      // Здесь была бы реальная интеграция с GeoIP сервисом
      const region = this.mockGeoIPLookup(ipAddress);

      if (region) {
        this.updateStats(region.id, { latency: 50, success: true });
      }

      return region;
    } catch (error) {
      this.logger.error(
        `Failed to determine region for IP: ${ipAddress}`,
        error as string
      );
      return null;
    }
  }

  /**
   * Получает правила роутинга для региона
   */
  async getRoutingRules(region: IGeographicRegion): Promise<IRoutingResult> {
    const applicableRules = this.getApplicableRules(region);

    if (applicableRules.length === 0) {
      // Возвращаем дефолтные настройки
      return {
        region,
        cdnProvider: 'cloudflare',
        databaseRegion: 'moscow',
        cacheRegion: 'moscow',
        latency: 100,
      };
    }

    // Сортируем по приоритету (низкий номер = высокий приоритет)
    applicableRules.sort((a, b) => a.priority - b.priority);
    const rule = applicableRules[0];

    const latency = this.calculateLatency(
      region,
      rule?.actions.databaseRegion ?? ''
    );

    return {
      region,
      cdnProvider: rule?.actions.cdnProvider ?? '',
      databaseRegion: rule?.actions.databaseRegion ?? '',
      cacheRegion: rule?.actions.cacheRegion ?? '',
      latency,
      redirectUrl: rule?.actions.redirectUrl ?? '',
      customHeaders: rule?.actions.customHeaders ?? {},
    };
  }

  /**
   * Получает применимые правила для региона
   */
  private getApplicableRules(region: IGeographicRegion): IRoutingRule[] {
    const applicableRules: IRoutingRule[] = [];

    for (const rule of this.routingRules.values()) {
      if (!rule.enabled) continue;

      if (this.matchesConditions(region, rule.conditions)) {
        applicableRules.push(rule);
      }
    }

    return applicableRules;
  }

  /**
   * Проверяет соответствие условиям правила
   */
  private matchesConditions(
    region: IGeographicRegion,
    conditions: IRoutingRule['conditions']
  ): boolean {
    if (
      conditions.countries &&
      !conditions.countries.includes(region.country)
    ) {
      return false;
    }

    if (
      conditions.cities &&
      (region.city == null ||
        region.city === '' ||
        !conditions.cities.includes(region.city))
    ) {
      return false;
    }

    if (
      conditions.timezones &&
      !conditions.timezones.includes(region.timezone)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Вычисляет латентность между регионами
   */
  private calculateLatency(
    fromRegion: IGeographicRegion,
    toRegion: string
  ): number {
    // Простая модель латентности на основе расстояния
    const targetRegion = this.regions.get(toRegion);
    if (!targetRegion) return 100;

    const distance = this.calculateDistance(
      fromRegion.coordinates,
      targetRegion.coordinates
    );

    // Примерная латентность: 1ms на 100km + базовая латентность
    return Math.round(distance / 100 + 20);
  }

  /**
   * Вычисляет расстояние между координатами
   */
  private calculateDistance(
    coord1: { lat: number; lng: number },
    coord2: { lat: number; lng: number }
  ): number {
    const R = 6371; // Радиус Земли в км
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLng = this.toRadians(coord2.lng - coord1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.lat)) *
        Math.cos(this.toRadians(coord2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Добавляет новое правило роутинга
   */
  addRoutingRule(rule: IRoutingRule): void {
    this.routingRules.set(rule.id, rule);
    this.logger.log(
      `Added routing rule: ${rule.id}`,
      'GeographicRoutingService'
    );
  }

  /**
   * Обновляет существующее правило
   */
  updateRoutingRule(ruleId: string, updates: Partial<IRoutingRule>): void {
    const rule = this.routingRules.get(ruleId);
    if (!rule) {
      throw new Error(`Routing rule not found: ${ruleId}`);
    }

    const updatedRule = { ...rule, ...updates };
    this.routingRules.set(ruleId, updatedRule);

    this.logger.log(
      `Updated routing rule: ${ruleId}`,
      'GeographicRoutingService'
    );
  }

  /**
   * Удаляет правило роутинга
   */
  removeRoutingRule(ruleId: string): void {
    const rule = this.routingRules.get(ruleId);
    if (!rule) {
      throw new Error(`Routing rule not found: ${ruleId}`);
    }

    this.routingRules.delete(ruleId);
    this.logger.log(
      `Removed routing rule: ${ruleId}`,
      'GeographicRoutingService'
    );
  }

  /**
   * Получает регион по ID
   */
  getRegion(regionId: string): IGeographicRegion | undefined {
    return this.regions.get(regionId);
  }

  /**
   * Получает все регионы
   */
  getAllRegions(): IGeographicRegion[] {
    return Array.from(this.regions.values());
  }

  /**
   * Получает правило роутинга по ID
   */
  getRoutingRule(ruleId: string): IRoutingRule | undefined {
    return this.routingRules.get(ruleId);
  }

  /**
   * Получает все правила роутинга
   */
  getAllRoutingRules(): IRoutingRule[] {
    return Array.from(this.routingRules.values());
  }

  /**
   * Получает статистику региона
   */
  getRegionStats(regionId: string): IGeographicStats | undefined {
    return this.stats.get(regionId);
  }

  /**
   * Получает всю статистику
   */
  getAllStats(): IGeographicStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Обновляет статистику региона
   */
  private updateStats(
    regionId: string,
    data: { latency: number; success: boolean }
  ): void {
    const existingStats = this.stats.get(regionId);

    if (existingStats) {
      existingStats.requestCount++;
      existingStats.averageLatency =
        (existingStats.averageLatency * (existingStats.requestCount - 1) +
          data.latency) /
        existingStats.requestCount;

      if (!data.success) {
        existingStats.errorRate =
          (existingStats.errorRate * (existingStats.requestCount - 1) + 1) /
          existingStats.requestCount;
      }

      existingStats.lastUpdated = new Date();
    } else {
      this.stats.set(regionId, {
        regionId,
        requestCount: 1,
        averageLatency: data.latency,
        errorRate: data.success ? 0 : 1,
        lastUpdated: new Date(),
      });
    }
  }

  private mockGeoIPLookup(ipAddress: string): IGeographicRegion | null {
    // Простая логика определения региона по IP
    if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
      return this.regions.get('moscow') ?? null;
    }

    if (ipAddress.startsWith('172.')) {
      return this.regions.get('minsk') ?? null;
    }

    // Случайный выбор для демонстрации
    const regionIds = Array.from(this.regions.keys());
    const randomRegionId =
      regionIds[Math.floor(Math.random() * regionIds.length)] ?? '';

    return this.regions.get(randomRegionId) ?? null;
  }
}
