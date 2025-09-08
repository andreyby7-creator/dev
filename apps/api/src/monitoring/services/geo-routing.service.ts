import { Injectable } from '@nestjs/common';
import { redactedLogger } from '../../utils/redacted-logger';

interface GeoLocation {
  country: 'RU' | 'BY';
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface DataCenter {
  id: string;
  name: string;
  location: GeoLocation;
  status: 'active' | 'maintenance' | 'down';
  load: number; // 0-100
  latency: number; // ms
  capacity: number;
  currentConnections: number;
}

interface RoutingRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: RoutingCondition[];
  actions: RoutingAction[];
}

interface RoutingCondition {
  type: 'country' | 'region' | 'city' | 'latency' | 'load' | 'time';
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
  value: unknown;
}

interface RoutingAction {
  type: 'route_to_dc' | 'redirect' | 'cache' | 'throttle';
  target: string;
  parameters?: Record<string, unknown>;
}

interface RoutingResult {
  dataCenter: DataCenter;
  reason: string;
  latency: number;
  load: number;
}

@Injectable()
export class GeoRoutingService {
  private readonly dataCenters: Map<string, DataCenter> = new Map();
  private readonly routingRules: RoutingRule[] = [];
  private readonly userSessions: Map<string, GeoLocation> = new Map();

  constructor() {
    this.initializeDataCenters();
    this.initializeRoutingRules();
    redactedLogger.log('Geo Routing service initialized', 'GeoRoutingService');
  }

  // Определение геолокации пользователя
  async detectUserLocation(ip: string): Promise<GeoLocation> {
    try {
      // В реальном приложении здесь будет интеграция с GeoIP сервисами
      // MaxMind, IP2Location, или собственные базы данных

      const location = await this.getLocationFromIP(ip);
      redactedLogger.debug(
        `Detected location for IP ${ip}: ${location.city}, ${location.region}`,
        'GeoRoutingService'
      );

      return location;
    } catch (error) {
      redactedLogger.error('Failed to detect user location', error as string);

      // Fallback на дефолтную локацию
      return {
        country: 'RU',
        region: 'Moscow',
        city: 'Moscow',
        latitude: 55.7558,
        longitude: 37.6176,
        timezone: 'Europe/Moscow',
      };
    }
  }

  // Выбор оптимального дата-центра
  async selectOptimalDataCenter(
    userLocation: GeoLocation,
    userId?: string
  ): Promise<RoutingResult> {
    try {
      // Сохраняем сессию пользователя
      if (userId != null && userId !== '') {
        this.userSessions.set(userId, userLocation);
      }

      // Получаем доступные дата-центры
      const availableDCs = Array.from(this.dataCenters.values()).filter(
        dc => dc.status === 'active' && dc.load < 90
      );

      if (availableDCs.length === 0) {
        throw new Error('No available data centers');
      }

      // Применяем правила роутинга
      const routingResult = this.applyRoutingRules(userLocation, availableDCs);

      if (routingResult) {
        return routingResult;
      }

      // Если правила не сработали, выбираем по минимальной латентности
      const optimalDC = this.selectByLatency(userLocation, availableDCs);

      return {
        dataCenter: optimalDC,
        reason: 'Lowest latency',
        latency: optimalDC.latency,
        load: optimalDC.load,
      };
    } catch (error) {
      redactedLogger.error(
        'Failed to select optimal data center',
        error as string
      );
      throw error;
    }
  }

  // Применение правил роутинга
  private applyRoutingRules(
    userLocation: GeoLocation,
    availableDCs: DataCenter[]
  ): RoutingResult | null {
    // Сортируем правила по приоритету
    const sortedRules = this.routingRules
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.evaluateRoutingConditions(rule.conditions, userLocation)) {
        const action = rule.actions[0]; // Берем первое действие

        if (action?.type === 'route_to_dc') {
          const targetDC = availableDCs.find(dc => dc.id === action.target);
          if (targetDC) {
            return {
              dataCenter: targetDC,
              reason: rule.name,
              latency: targetDC.latency,
              load: targetDC.load,
            };
          }
        }
      }
    }

    return null;
  }

  // Выбор по минимальной латентности
  private selectByLatency(
    userLocation: GeoLocation,
    availableDCs: DataCenter[]
  ): DataCenter {
    // Рассчитываем латентность для каждого DC
    const dcsWithLatency = availableDCs.map(dc => ({
      ...dc,
      calculatedLatency: this.calculateLatency(userLocation, dc.location),
    }));

    // Сортируем по латентности и нагрузке
    dcsWithLatency.sort((a, b) => {
      const latencyDiff = a.calculatedLatency - b.calculatedLatency;
      if (Math.abs(latencyDiff) < 10) {
        // Если разница в латентности небольшая, учитываем нагрузку
        return a.load - b.load;
      }
      return latencyDiff;
    });

    const defaultDC = this.dataCenters.get('default');
    const result = dcsWithLatency[0] ?? availableDCs[0] ?? defaultDC;
    if (result == null) {
      throw new Error('No data center available');
    }
    return result;
  }

  // Расчет латентности между двумя точками
  private calculateLatency(from: GeoLocation, to: GeoLocation): number {
    // Простая формула расчета расстояния (в реальности будет более сложная)
    const distance = this.calculateDistance(from, to);

    // Примерная латентность: 1ms на каждые 100km + базовая латентность
    const baseLatency = 5; // базовая латентность
    const distanceLatency = distance / 100; // 1ms на 100km

    return Math.round(baseLatency + distanceLatency);
  }

  // Расчет расстояния между двумя точками (формула гаверсинуса)
  private calculateDistance(from: GeoLocation, to: GeoLocation): number {
    const R = 6371; // радиус Земли в км
    const dLat = this.toRadians(to.latitude - from.latitude);
    const dLon = this.toRadians(to.longitude - from.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(from.latitude)) *
        Math.cos(this.toRadians(to.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Проверка условий роутинга
  private evaluateRoutingConditions(
    conditions: RoutingCondition[],
    userLocation: GeoLocation
  ): boolean {
    return conditions.every(condition => {
      switch (condition.type) {
        case 'country':
          return this.evaluateCondition(
            userLocation.country,
            condition.operator,
            condition.value
          );
        case 'region':
          return this.evaluateCondition(
            userLocation.region,
            condition.operator,
            condition.value
          );
        case 'city':
          return this.evaluateCondition(
            userLocation.city,
            condition.operator,
            condition.value
          );
        case 'time':
          return this.evaluateTimeCondition(condition, userLocation.timezone);
        default:
          return true;
      }
    });
  }

  private evaluateCondition(
    actual: unknown,
    operator: string,
    expected: unknown
  ): boolean {
    switch (operator) {
      case 'eq':
        return actual === expected;
      case 'ne':
        return actual !== expected;
      case 'gt':
        return (
          typeof actual === 'number' &&
          typeof expected === 'number' &&
          actual > expected
        );
      case 'lt':
        return (
          typeof actual === 'number' &&
          typeof expected === 'number' &&
          actual < expected
        );
      case 'gte':
        return (
          typeof actual === 'number' &&
          typeof expected === 'number' &&
          actual >= expected
        );
      case 'lte':
        return (
          typeof actual === 'number' &&
          typeof expected === 'number' &&
          actual <= expected
        );
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual);
      default:
        return false;
    }
  }

  private evaluateTimeCondition(
    condition: RoutingCondition,
    timezone: string
  ): boolean {
    const now = new Date();
    const localTime = new Date(
      now.toLocaleString('en-US', { timeZone: timezone })
    );
    const hour = localTime.getHours();

    return this.evaluateCondition(hour, condition.operator, condition.value);
  }

  // Получение геолокации по IP
  private async getLocationFromIP(ip: string): Promise<GeoLocation> {
    // В реальном приложении здесь будет запрос к GeoIP сервису
    // Пока возвращаем тестовые данные

    // Симуляция запроса к GeoIP
    await new Promise(resolve => setTimeout(resolve, 50));

    // Простая логика для демонстрации
    if (ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return {
        country: 'RU',
        region: 'Moscow',
        city: 'Moscow',
        latitude: 55.7558,
        longitude: 37.6176,
        timezone: 'Europe/Moscow',
      };
    }

    if (ip.startsWith('172.16.')) {
      return {
        country: 'BY',
        region: 'Minsk',
        city: 'Minsk',
        latitude: 53.9045,
        longitude: 27.5615,
        timezone: 'Europe/Minsk',
      };
    }

    // Дефолтная локация
    return {
      country: 'RU',
      region: 'Moscow',
      city: 'Moscow',
      latitude: 55.7558,
      longitude: 37.6176,
      timezone: 'Europe/Moscow',
    };
  }

  // Инициализация дата-центров
  private initializeDataCenters(): void {
    const dcs: DataCenter[] = [
      {
        id: 'dc-moscow-primary',
        name: 'Moscow Primary DC',
        location: {
          country: 'RU',
          region: 'Moscow',
          city: 'Moscow',
          latitude: 55.7558,
          longitude: 37.6176,
          timezone: 'Europe/Moscow',
        },
        status: 'active',
        load: 45,
        latency: 5,
        capacity: 1000,
        currentConnections: 450,
      },
      {
        id: 'dc-moscow-secondary',
        name: 'Moscow Secondary DC',
        location: {
          country: 'RU',
          region: 'Moscow',
          city: 'Moscow',
          latitude: 55.7558,
          longitude: 37.6176,
          timezone: 'Europe/Moscow',
        },
        status: 'active',
        load: 30,
        latency: 8,
        capacity: 800,
        currentConnections: 240,
      },
      {
        id: 'dc-spb-primary',
        name: 'St. Petersburg Primary DC',
        location: {
          country: 'RU',
          region: 'St. Petersburg',
          city: 'St. Petersburg',
          latitude: 59.9311,
          longitude: 30.3609,
          timezone: 'Europe/Moscow',
        },
        status: 'active',
        load: 60,
        latency: 15,
        capacity: 600,
        currentConnections: 360,
      },
      {
        id: 'dc-minsk-primary',
        name: 'Minsk Primary DC',
        location: {
          country: 'BY',
          region: 'Minsk',
          city: 'Minsk',
          latitude: 53.9045,
          longitude: 27.5615,
          timezone: 'Europe/Minsk',
        },
        status: 'active',
        load: 25,
        latency: 12,
        capacity: 500,
        currentConnections: 125,
      },
      {
        id: 'dc-ekb-primary',
        name: 'Yekaterinburg Primary DC',
        location: {
          country: 'RU',
          region: 'Sverdlovsk',
          city: 'Yekaterinburg',
          latitude: 56.8519,
          longitude: 60.6122,
          timezone: 'Asia/Yekaterinburg',
        },
        status: 'active',
        load: 35,
        latency: 25,
        capacity: 400,
        currentConnections: 140,
      },
    ];

    dcs.forEach(dc => this.dataCenters.set(dc.id, dc));
  }

  // Инициализация правил роутинга
  private initializeRoutingRules(): void {
    const rules: RoutingRule[] = [
      {
        id: 'moscow-users',
        name: 'Moscow users to Moscow DC',
        enabled: true,
        priority: 100,
        conditions: [{ type: 'city', operator: 'eq', value: 'Moscow' }],
        actions: [{ type: 'route_to_dc', target: 'dc-moscow-primary' }],
      },
      {
        id: 'spb-users',
        name: 'St. Petersburg users to SPb DC',
        enabled: true,
        priority: 90,
        conditions: [{ type: 'city', operator: 'eq', value: 'St. Petersburg' }],
        actions: [{ type: 'route_to_dc', target: 'dc-spb-primary' }],
      },
      {
        id: 'minsk-users',
        name: 'Minsk users to Minsk DC',
        enabled: true,
        priority: 95,
        conditions: [{ type: 'country', operator: 'eq', value: 'BY' }],
        actions: [{ type: 'route_to_dc', target: 'dc-minsk-primary' }],
      },
      {
        id: 'night-traffic',
        name: 'Night traffic to secondary DCs',
        enabled: true,
        priority: 50,
        conditions: [{ type: 'time', operator: 'gte', value: 22 }],
        actions: [{ type: 'route_to_dc', target: 'dc-moscow-secondary' }],
      },
      {
        id: 'high-load-balance',
        name: 'Load balancing for high load',
        enabled: true,
        priority: 30,
        conditions: [{ type: 'load', operator: 'gt', value: 80 }],
        actions: [{ type: 'route_to_dc', target: 'dc-moscow-secondary' }],
      },
    ];

    this.routingRules.push(...rules);
  }

  // Методы управления
  addDataCenter(dc: DataCenter): void {
    this.dataCenters.set(dc.id, dc);
    redactedLogger.log(`Data center added: ${dc.name}`, 'GeoRoutingService');
  }

  updateDataCenterStatus(dcId: string, status: DataCenter['status']): void {
    const dc = this.dataCenters.get(dcId);
    if (dc) {
      dc.status = status;
      redactedLogger.log(
        `Data center status updated: ${dcId} -> ${status}`,
        'GeoRoutingService'
      );
    }
  }

  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.push(rule);
    redactedLogger.log(`Routing rule added: ${rule.name}`, 'GeoRoutingService');
  }

  // Методы для получения информации
  getDataCenters(): DataCenter[] {
    return Array.from(this.dataCenters.values());
  }

  getRoutingRules(): RoutingRule[] {
    return [...this.routingRules];
  }

  getUserSessions(): Map<string, GeoLocation> {
    return new Map(this.userSessions);
  }

  getRoutingStats() {
    const totalDCs = this.dataCenters.size;
    const activeDCs = Array.from(this.dataCenters.values()).filter(
      dc => dc.status === 'active'
    ).length;
    const totalConnections = Array.from(this.dataCenters.values()).reduce(
      (sum, dc) => sum + dc.currentConnections,
      0
    );
    const avgLoad =
      Array.from(this.dataCenters.values()).reduce(
        (sum, dc) => sum + dc.load,
        0
      ) / totalDCs;

    return {
      totalDataCenters: totalDCs,
      activeDataCenters: activeDCs,
      totalConnections,
      averageLoad: Math.round(avgLoad),
      routingRules: this.routingRules.length,
      activeRules: this.routingRules.filter(rule => rule.enabled).length,
      userSessions: this.userSessions.size,
    };
  }
}
