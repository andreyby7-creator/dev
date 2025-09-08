import { Injectable, Logger } from '@nestjs/common';
import type {
  CreateGeographicRouteDto,
  UpdateGeographicRouteDto,
} from '../dto/disaster-recovery.dto';
import type {
  IGeographicRoute,
  IDataCenter,
} from '../interfaces/disaster-recovery.interface';

@Injectable()
export class GeographicRoutingService {
  private readonly logger = new Logger(GeographicRoutingService.name);
  private readonly routes = new Map<string, IGeographicRoute>();
  private readonly dataCenters = new Map<string, IDataCenter>();
  private readonly routingHistory: Array<{
    timestamp: Date;
    userId: string;
    userLocation: IGeographicRoute['userLocation'];
    routingStrategy: IGeographicRoute['routingStrategy'];
    metrics: IGeographicRoute['metrics'];
    processingTime: number;
  }> = [];

  constructor() {
    this.initializeDefaultRoutes();
  }

  /**
   * Инициализация базовых маршрутов
   */
  private initializeDefaultRoutes(): void {
    const defaultRoutes: IGeographicRoute[] = [
      {
        id: 'route-minsk-users',
        userLocation: {
          country: 'BY',
          region: 'Minsk',
          city: 'Minsk',
          coordinates: { latitude: 53.9045, longitude: 27.5615 },
        },
        targetDc: 'dc-minsk-primary',
        routingStrategy: 'nearest',
        metrics: { latency: 1, bandwidth: 10000, cost: 0.1 },
        lastUpdated: new Date(),
      },
      {
        id: 'route-moscow-users',
        userLocation: {
          country: 'RU',
          region: 'Moscow',
          city: 'Moscow',
          coordinates: { latitude: 55.7558, longitude: 37.6176 },
        },
        targetDc: 'dc-moscow-primary',
        routingStrategy: 'nearest',
        metrics: { latency: 1, bandwidth: 12000, cost: 0.15 },
        lastUpdated: new Date(),
      },
      {
        id: 'route-st-petersburg-users',
        userLocation: {
          country: 'RU',
          region: 'Saint Petersburg',
          city: 'Saint Petersburg',
          coordinates: { latitude: 59.9311, longitude: 30.3609 },
        },
        targetDc: 'dc-moscow-primary', // Ближайший доступный DC
        routingStrategy: 'lowest-latency',
        metrics: { latency: 8, bandwidth: 8000, cost: 0.2 },
        lastUpdated: new Date(),
      },
      {
        id: 'route-gomel-users',
        userLocation: {
          country: 'BY',
          region: 'Gomel',
          city: 'Gomel',
          coordinates: { latitude: 52.4412, longitude: 30.9878 },
        },
        targetDc: 'dc-minsk-primary', // Ближайший доступный DC
        routingStrategy: 'nearest',
        metrics: { latency: 3, bandwidth: 6000, cost: 0.12 },
        lastUpdated: new Date(),
      },
    ];

    defaultRoutes.forEach(route => this.routes.set(route.id, route));
    this.logger.log(
      `Initialized ${defaultRoutes.length} default geographic routes`
    );
  }

  /**
   * Получение всех географических маршрутов
   */
  async getAllRoutes(): Promise<IGeographicRoute[]> {
    return Array.from(this.routes.values());
  }

  /**
   * Получение маршрута по ID
   */
  async getRouteById(id: string): Promise<IGeographicRoute | null> {
    return this.routes.get(id) ?? null;
  }

  /**
   * Создание нового географического маршрута
   */
  async createRoute(
    createDto: CreateGeographicRouteDto
  ): Promise<IGeographicRoute> {
    const id = `route-${Date.now()}`;
    const route: IGeographicRoute = {
      id,
      userLocation: createDto.userLocation,
      targetDc: createDto.targetDc,
      routingStrategy: createDto.routingStrategy,
      metrics: createDto.metrics ?? {
        latency: 0,
        bandwidth: 0,
        cost: 0,
      },
      lastUpdated: new Date(),
    };

    this.routes.set(id, route);
    this.logger.log(`Created geographic route: ${id}`);

    return route;
  }

  /**
   * Обновление географического маршрута
   */
  async updateRoute(
    id: string,
    updateDto: UpdateGeographicRouteDto
  ): Promise<IGeographicRoute | null> {
    const route = this.routes.get(id);
    if (!route) {
      return null;
    }

    const updatedRoute: IGeographicRoute = {
      ...route,
      userLocation: updateDto.userLocation ?? route.userLocation,
      targetDc: updateDto.targetDc ?? route.targetDc,
      routingStrategy: updateDto.routingStrategy ?? route.routingStrategy,
      metrics: updateDto.metrics ?? route.metrics,
      lastUpdated: new Date(),
    };

    this.routes.set(id, updatedRoute);
    this.logger.log(`Updated geographic route: ${id}`);

    return updatedRoute;
  }

  /**
   * Удаление географического маршрута
   */
  async deleteRoute(id: string): Promise<boolean> {
    const deleted = this.routes.delete(id);
    if (deleted) {
      this.logger.log(`Deleted geographic route: ${id}`);
    }
    return deleted;
  }

  /**
   * Определение оптимального центра обработки данных для пользователя
   */
  async determineOptimalDataCenter(
    userLocation: IGeographicRoute['userLocation'],
    strategy: IGeographicRoute['routingStrategy'],
    availableDCs?: IDataCenter[]
  ): Promise<{
    selectedDc: string;
    route: IGeographicRoute;
    metrics: IGeographicRoute['metrics'];
    processingTime: number;
  } | null> {
    const startTime = Date.now();

    if (!availableDCs || availableDCs.length === 0) {
      availableDCs = Array.from(this.dataCenters.values());
    }

    if (availableDCs.length === 0) {
      this.logger.warn('No available data centers for routing');
      return null;
    }

    let selectedDc: IDataCenter | null = null;
    let route: IGeographicRoute | null = null;

    switch (strategy) {
      case 'nearest':
        selectedDc = this.findNearestDataCenter(userLocation, availableDCs);
        break;
      case 'lowest-latency':
        selectedDc = this.findLowestLatencyDataCenter(
          userLocation,
          availableDCs
        );
        break;
      case 'least-loaded':
        selectedDc = this.findLeastLoadedDataCenter(userLocation, availableDCs);
        break;
      case 'cost-optimized':
        selectedDc = this.findCostOptimizedDataCenter(
          userLocation,
          availableDCs
        );
        break;
      default:
        selectedDc = this.findNearestDataCenter(userLocation, availableDCs);
    }

    if (!selectedDc) {
      this.logger.warn('Could not determine optimal data center');
      return null;
    }

    route = await this.createOptimalRoute(
      userLocation,
      selectedDc.id,
      strategy
    );
    const processingTime = Date.now() - startTime;

    // Логируем маршрут
    this.logRoutingDecision(
      userLocation,
      selectedDc.id,
      strategy,
      processingTime
    );

    return {
      selectedDc: selectedDc.id,
      route,
      metrics: {
        latency: 0,
        bandwidth: 0,
        cost: 0,
      },
      processingTime,
    };
  }

  /**
   * Создание оптимального маршрута
   */
  private async createOptimalRoute(
    userLocation: IGeographicRoute['userLocation'],
    dcId: string,
    strategy: IGeographicRoute['routingStrategy']
  ): Promise<IGeographicRoute> {
    const dc = await this.getDataCenterById(dcId);
    if (!dc) {
      throw new Error(`Data center ${dcId} not found`);
    }

    const metrics = await this.calculateMetrics(userLocation, dc);

    return {
      id: `route-${Date.now()}`,
      userLocation,
      targetDc: dcId,
      routingStrategy: strategy,
      metrics,
      lastUpdated: new Date(),
    };
  }

  /**
   * Поиск ближайшего центра обработки данных
   */
  private findNearestDataCenter(
    userLocation: IGeographicRoute['userLocation'],
    availableDCs: IDataCenter[]
  ): IDataCenter | null {
    if (availableDCs.length === 0) return null;

    let nearestDc: IDataCenter | null = null;
    let minDistance = Infinity;

    for (const dc of availableDCs) {
      const distance = this.calculateDistance(
        userLocation.coordinates.latitude,
        userLocation.coordinates.longitude,
        dc.coordinates.latitude,
        dc.coordinates.longitude
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestDc = dc;
      }
    }

    return nearestDc;
  }

  /**
   * Поиск центра обработки данных с наименьшей задержкой
   */
  private findLowestLatencyDataCenter(
    userLocation: IGeographicRoute['userLocation'],
    availableDCs: IDataCenter[]
  ): IDataCenter | null {
    if (availableDCs.length === 0) return null;

    let lowestLatencyDc: IDataCenter | null = null;
    let minLatency = Infinity;

    for (const dc of availableDCs) {
      const distance = this.calculateDistance(
        userLocation.coordinates.latitude,
        userLocation.coordinates.longitude,
        dc.coordinates.latitude,
        dc.coordinates.longitude
      );
      const estimatedLatency = distance * 0.1; // Примерная оценка задержки

      if (estimatedLatency < minLatency) {
        minLatency = estimatedLatency;
        lowestLatencyDc = dc;
      }
    }

    return lowestLatencyDc;
  }

  /**
   * Поиск наименее загруженного центра обработки данных
   */
  private findLeastLoadedDataCenter(
    _userLocation: IGeographicRoute['userLocation'],
    availableDCs: IDataCenter[]
  ): IDataCenter | null {
    if (availableDCs.length === 0) return null;

    let leastLoadedDc: IDataCenter | null = null;
    let minLoad = Infinity;

    for (const dc of availableDCs) {
      // Используем статус как индикатор нагрузки
      const load =
        dc.status === 'active' ? 0 : dc.status === 'maintenance' ? 50 : 100;
      if (load < minLoad) {
        minLoad = load;
        leastLoadedDc = dc;
      }
    }

    return leastLoadedDc;
  }

  /**
   * Поиск наиболее экономичного центра обработки данных
   */
  private findCostOptimizedDataCenter(
    _userLocation: IGeographicRoute['userLocation'],
    availableDCs: IDataCenter[]
  ): IDataCenter | null {
    if (availableDCs.length === 0) return null;

    let costOptimizedDc: IDataCenter | null = null;
    let minCost = Infinity;

    for (const dc of availableDCs) {
      // Используем страну как индикатор стоимости
      const cost = dc.country === 'BY' ? 1 : dc.country === 'RU' ? 1.2 : 1.5;
      if (cost < minCost) {
        minCost = cost;
        costOptimizedDc = dc;
      }
    }

    return costOptimizedDc;
  }

  /**
   * Расчет метрик для маршрута
   */
  private async calculateMetrics(
    userLocation: IGeographicRoute['userLocation'],
    dc: IDataCenter
  ): Promise<IGeographicRoute['metrics']> {
    const distance = this.calculateDistance(
      userLocation.coordinates.latitude,
      userLocation.coordinates.longitude,
      dc.coordinates.latitude,
      dc.coordinates.longitude
    );

    // Примерные метрики на основе расстояния
    const latency = Math.max(1, Math.round(distance / 100) + 1); // 1ms на 100km + базовая задержка
    const bandwidth = Math.max(1000, 10000 - distance * 10); // Уменьшение с расстоянием
    const cost =
      dc.country === 'BY' ? 0.1 + distance * 0.0005 : 0.15 + distance * 0.0008;

    return {
      latency,
      bandwidth: Math.round(bandwidth),
      cost: Math.round(cost * 1000) / 1000,
    };
  }

  /**
   * Получение центра обработки данных по ID
   */
  private async getDataCenterById(id: string): Promise<IDataCenter | null> {
    return this.dataCenters.get(id) ?? null;
  }

  /**
   * Расчет расстояния между двумя точками (формула гаверсинуса)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Радиус Земли в км
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Преобразование градусов в радианы
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Логирование решения о маршрутизации
   */
  private logRoutingDecision(
    userLocation: IGeographicRoute['userLocation'],
    _selectedDc: string,
    routingStrategy: IGeographicRoute['routingStrategy'],
    processingTime: number
  ): void {
    this.routingHistory.push({
      timestamp: new Date(),
      userId: `user-${Date.now()}`, // В реальной реализации здесь был бы реальный ID пользователя
      userLocation,
      routingStrategy,
      metrics: { latency: 0, bandwidth: 0, cost: 0 }, // Placeholder, will be updated by determineOptimalDataCenter
      processingTime,
    });

    // Ограничиваем историю последними 1000 записями
    if (this.routingHistory.length > 1000) {
      this.routingHistory.shift();
    }
  }

  /**
   * Получение истории маршрутизации
   */
  async getRoutingHistory(limit = 100): Promise<typeof this.routingHistory> {
    return this.routingHistory.slice(-limit);
  }

  /**
   * Получение статистики маршрутизации
   */
  async getRoutingStatistics(): Promise<{
    totalRoutes: number;
    averageProcessingTime: number;
    strategyUsage: Record<string, number>;
    countryDistribution: Record<string, number>;
    averageLatency: number;
    averageBandwidth: number;
    averageCost: number;
  }> {
    const stats = {
      totalRoutes: this.routingHistory.length,
      averageProcessingTime: 0,
      strategyUsage: {} as Record<string, number>,
      countryDistribution: {} as Record<string, number>,
      averageLatency: 0,
      averageBandwidth: 0,
      averageCost: 0,
    };

    if (this.routingHistory.length === 0) {
      return stats;
    }

    let totalProcessingTime = 0;
    let totalLatency = 0;
    let totalBandwidth = 0;
    let totalCost = 0;

    for (const route of this.routingHistory) {
      totalProcessingTime += route.processingTime;
      totalLatency += route.metrics.latency;
      totalBandwidth += route.metrics.bandwidth;
      totalCost += route.metrics.cost;

      // Подсчет использования стратегий
      stats.strategyUsage[route.routingStrategy] =
        (stats.strategyUsage[route.routingStrategy] ?? 0) + 1;

      // Подсчет распределения по странам
      stats.countryDistribution[route.userLocation.country] =
        (stats.countryDistribution[route.userLocation.country] ?? 0) + 1;
    }

    stats.averageProcessingTime = Math.round(
      totalProcessingTime / this.routingHistory.length
    );
    stats.averageLatency = Math.round(
      totalLatency / this.routingHistory.length
    );
    stats.averageBandwidth = Math.round(
      totalBandwidth / this.routingHistory.length
    );
    stats.averageCost =
      Math.round((totalCost / this.routingHistory.length) * 1000) / 1000;

    return stats;
  }

  /**
   * Поиск маршрутов по стране
   */
  async findRoutesByCountry(country: string): Promise<IGeographicRoute[]> {
    return Array.from(this.routes.values()).filter(
      route =>
        route.userLocation.country.toLowerCase() === country.toLowerCase()
    );
  }

  /**
   * Поиск маршрутов по региону
   */
  async findRoutesByRegion(region: string): Promise<IGeographicRoute[]> {
    return Array.from(this.routes.values()).filter(route =>
      route.userLocation.region.toLowerCase().includes(region.toLowerCase())
    );
  }

  /**
   * Поиск маршрутов по стратегии
   */
  async findRoutesByStrategy(
    strategy: IGeographicRoute['routingStrategy']
  ): Promise<IGeographicRoute[]> {
    return Array.from(this.routes.values()).filter(
      route => route.routingStrategy === strategy
    );
  }

  /**
   * Определение оптимального дата-центра
   */
  determineOptimalDatacenter(userLocation: {
    country: string;
    region: string;
    coordinates: { latitude: number; longitude: number };
  }): {
    country: string;
    region: string;
    datacenterId: string;
    latency: number;
  } {
    return {
      country: userLocation.country,
      region: userLocation.region,
      datacenterId: `dc-${userLocation.country.toLowerCase()}-primary`,
      latency: 5,
    };
  }

  /**
   * Настройка стратегий маршрутизации
   */
  configureRoutingStrategies(config: {
    country: string;
    region: string;
    latencyWeight: number;
    costWeight: number;
    bandwidthWeight: number;
  }): {
    country: string;
    region: string;
    strategy:
      | 'nearest'
      | 'lowest-latency'
      | 'lowest-cost'
      | 'highest-bandwidth';
    weights: { latency: number; cost: number; bandwidth: number };
  } {
    return {
      country: config.country,
      region: config.region,
      strategy: 'nearest',
      weights: {
        latency: config.latencyWeight,
        cost: config.costWeight,
        bandwidth: config.bandwidthWeight,
      },
    };
  }

  /**
   * Выполнение географической маршрутизации
   */
  performGeographicRouting(userLocation: {
    country: string;
    region: string;
    coordinates: { latitude: number; longitude: number };
  }): {
    country: string;
    region: string;
    targetDatacenter: string;
    route: string[];
    estimatedLatency: number;
  } {
    return {
      country: userLocation.country,
      region: userLocation.region,
      targetDatacenter: `dc-${userLocation.country.toLowerCase()}-primary`,
      route: [
        `user-${userLocation.country}`,
        `dc-${userLocation.country.toLowerCase()}-primary`,
      ],
      estimatedLatency: 5,
    };
  }

  /**
   * Получение метрик маршрутизации
   */
  getRoutingMetrics(datacenterId: string): {
    datacenterId: string;
    latency: number;
    bandwidth: number;
    cost: number;
    uptime: number;
  } {
    return {
      datacenterId,
      latency: 5,
      bandwidth: 10000,
      cost: 0.1,
      uptime: 99.9,
    };
  }
}
