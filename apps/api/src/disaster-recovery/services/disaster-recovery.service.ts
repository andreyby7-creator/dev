import { Injectable, Logger } from '@nestjs/common';
import type {
  CreateDataCenterDto,
  UpdateDataCenterDto,
} from '../dto/disaster-recovery.dto';
import type { IDataCenter } from '../interfaces/disaster-recovery.interface';

@Injectable()
export class DisasterRecoveryService {
  private readonly logger = new Logger(DisasterRecoveryService.name);
  private readonly dataCenters = new Map<string, IDataCenter>();

  constructor() {
    this.initializeDefaultDataCenters();
  }

  /**
   * Инициализация базовых дата-центров
   */
  private initializeDefaultDataCenters(): void {
    const defaultDcs: IDataCenter[] = [
      {
        id: 'dc-minsk-primary',
        name: 'Minsk Primary DC',
        region: 'Minsk',
        country: 'BY',
        city: 'Minsk',
        coordinates: { latitude: 53.9045, longitude: 27.5615 },
        status: 'active',
        capacity: { cpu: 1000, memory: 8192, storage: 100000, network: 10000 },
      },
      {
        id: 'dc-minsk-secondary',
        name: 'Minsk Secondary DC',
        region: 'Minsk',
        country: 'BY',
        city: 'Minsk',
        coordinates: { latitude: 53.9045, longitude: 27.5615 },
        status: 'maintenance',
        capacity: { cpu: 800, memory: 6144, storage: 80000, network: 8000 },
      },
      {
        id: 'dc-moscow-primary',
        name: 'Moscow Primary DC',
        region: 'Moscow',
        country: 'RU',
        city: 'Moscow',
        coordinates: { latitude: 55.7558, longitude: 37.6176 },
        status: 'active',
        capacity: { cpu: 1200, memory: 10240, storage: 120000, network: 12000 },
      },
      {
        id: 'dc-moscow-secondary',
        name: 'Moscow Secondary DC',
        region: 'Moscow',
        country: 'RU',
        city: 'Moscow',
        coordinates: { latitude: 55.7558, longitude: 37.6176 },
        status: 'maintenance',
        capacity: { cpu: 1000, memory: 8192, storage: 100000, network: 10000 },
      },
    ];

    defaultDcs.forEach(dc => this.dataCenters.set(dc.id, dc));
    this.logger.log(`Initialized ${defaultDcs.length} default data centers`);
  }

  /**
   * Получение всех дата-центров
   */
  async getAllDataCenters(): Promise<IDataCenter[]> {
    return Array.from(this.dataCenters.values());
  }

  /**
   * Получение дата-центра по ID
   */
  async getDataCenterById(id: string): Promise<IDataCenter | null> {
    return this.dataCenters.get(id) ?? null;
  }

  /**
   * Создание нового дата-центра
   */
  async createDataCenter(createDto: CreateDataCenterDto): Promise<IDataCenter> {
    const id = `dc-${Date.now()}`;
    const dataCenter: IDataCenter = {
      id,
      name: createDto.name,
      region: createDto.region,
      country: createDto.country,
      city: createDto.city,
      coordinates: createDto.coordinates,
      status: 'active',
      capacity: createDto.capacity,
    };

    this.dataCenters.set(id, dataCenter);
    this.logger.log(`Created data center: ${id}`);

    return dataCenter;
  }

  /**
   * Обновление дата-центра
   */
  async updateDataCenter(
    id: string,
    updateDto: UpdateDataCenterDto
  ): Promise<IDataCenter | null> {
    const dataCenter = this.dataCenters.get(id);
    if (!dataCenter) {
      return null;
    }

    const updatedDataCenter: IDataCenter = {
      ...dataCenter,
      name: updateDto.name ?? dataCenter.name,
      region: updateDto.region ?? dataCenter.region,
      country: updateDto.country ?? dataCenter.country,
      city: updateDto.city ?? dataCenter.city,
      coordinates: updateDto.coordinates ?? dataCenter.coordinates,
      capacity: updateDto.capacity ?? dataCenter.capacity,
      status: updateDto.status ?? dataCenter.status,
    };

    this.dataCenters.set(id, updatedDataCenter);
    this.logger.log(`Updated data center: ${id}`);

    return updatedDataCenter;
  }

  /**
   * Удаление дата-центра
   */
  async deleteDataCenter(id: string): Promise<boolean> {
    const deleted = this.dataCenters.delete(id);
    if (deleted) {
      this.logger.log(`Deleted data center: ${id}`);
    }
    return deleted;
  }

  /**
   * Получение статуса всех дата-центров
   */
  async getDataCentersStatus(): Promise<Record<string, string>> {
    const status: Record<string, string> = {};

    for (const [id, dc] of this.dataCenters) {
      status[id] = dc.status;
    }

    return status;
  }

  /**
   * Проверка здоровья дата-центра
   */
  async checkDataCenterHealth(
    id: string
  ): Promise<{ status: string; uptime: number; lastCheck: Date } | null> {
    const dataCenter = this.dataCenters.get(id);
    if (!dataCenter) {
      return null;
    }

    // Симуляция проверки здоровья
    const health = {
      uptime: 99.99, // Example uptime
      lastCheck: new Date(),
      status: 'healthy' as 'healthy' | 'warning' | 'critical',
    };

    return health;
  }

  /**
   * Получение статистики по дата-центрам
   */
  async getDataCentersStatistics(): Promise<{
    total: number;
    active: number;
    standby: number;
    maintenance: number;
    offline: number;
  }> {
    const stats = {
      total: this.dataCenters.size,
      active: 0,
      standby: 0,
      maintenance: 0,
      offline: 0,
    };

    for (const dc of this.dataCenters.values()) {
      stats[dc.status]++;
    }

    return stats;
  }

  /**
   * Поиск дата-центров по региону
   */
  async findDataCentersByRegion(region: string): Promise<IDataCenter[]> {
    return Array.from(this.dataCenters.values()).filter(
      dc => dc.region.toLowerCase() === region.toLowerCase()
    );
  }

  /**
   * Поиск дата-центров по стране
   */
  async findDataCentersByCountry(country: 'BY' | 'RU'): Promise<IDataCenter[]> {
    return Array.from(this.dataCenters.values()).filter(
      dc => dc.country === country
    );
  }

  /**
   * Получение ближайшего дата-центра по координатам
   */
  async findNearestDataCenter(
    latitude: number,
    longitude: number
  ): Promise<IDataCenter | null> {
    let nearestDc: IDataCenter | null = null;
    let minDistance = Infinity;

    for (const dc of this.dataCenters.values()) {
      if (dc.status !== 'active') continue;

      const distance = this.calculateDistance(
        latitude,
        longitude,
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
   * Управление операциями дата-центра
   */
  manageDatacenter(datacenterId: string): {
    id: string;
    status: 'active' | 'standby' | 'maintenance';
  } {
    const dc = this.dataCenters.get(datacenterId);
    if (!dc) {
      return {
        id: datacenterId,
        status: 'maintenance',
      };
    }
    return {
      id: dc.id,
      status: dc.status === 'offline' ? 'standby' : dc.status,
    };
  }

  /**
   * Проверка здоровья дата-центра
   */
  checkDatacenterHealth(datacenterId: string): {
    datacenterId: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
  } {
    const dc = this.dataCenters.get(datacenterId);
    if (!dc) {
      return {
        datacenterId,
        status: 'unhealthy',
      };
    }

    // Простая логика проверки здоровья
    const healthScore = Math.random();
    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (healthScore > 0.7) {
      status = 'healthy';
    } else if (healthScore > 0.3) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      datacenterId,
      status,
    };
  }

  /**
   * Получение статистики дата-центра
   */
  getDatacenterStatistics(datacenterId: string): {
    datacenterId: string;
    uptime: number;
    availability: number;
  } {
    const dc = this.dataCenters.get(datacenterId);
    if (!dc) {
      return {
        datacenterId,
        uptime: 0,
        availability: 0,
      };
    }

    return {
      datacenterId,
      uptime: Math.floor(Math.random() * 100) + 80, // 80-99%
      availability: Math.floor(Math.random() * 100) + 90, // 90-99%
    };
  }

  /**
   * Выполнение теста аварийного восстановления
   */
  performDisasterRecoveryTest(datacenterId: string): {
    datacenterId: string;
    status: 'passed' | 'failed' | 'in_progress';
  } {
    const dc = this.dataCenters.get(datacenterId);
    if (!dc) {
      return {
        datacenterId,
        status: 'failed',
      };
    }

    // Симуляция теста
    const testResult = Math.random();
    let status: 'passed' | 'failed' | 'in_progress';

    if (testResult > 0.8) {
      status = 'passed';
    } else if (testResult > 0.4) {
      status = 'in_progress';
    } else {
      status = 'failed';
    }

    return {
      datacenterId,
      status,
    };
  }
}
