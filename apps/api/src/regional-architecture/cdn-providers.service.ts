import { Injectable } from '@nestjs/common';
import { redactedLogger } from '../utils/redacted-logger';

export interface CdnProvider {
  name: string;
  type: 'local' | 'international';
  region: 'RU' | 'BY' | 'GLOBAL';
  endpoint: string;
  features: {
    ssl: boolean;
    compression: boolean;
    imageOptimization: boolean;
    videoStreaming: boolean;
    edgeComputing: boolean;
  };
  pricing: {
    bandwidth: number; // за GB
    requests: number; // за 10000 запросов
    currency: 'RUB' | 'BYN' | 'USD';
  };
  performance: {
    averageLatency: number;
    uptime: number;
    edgeLocations: number;
  };
}

export interface CdnConfiguration {
  providerId: string;
  domain: string;
  settings: {
    ssl: boolean;
    compression: boolean;
    cacheHeaders: Record<string, string>;
    customHeaders: Record<string, string>;
  };
  status: 'active' | 'inactive' | 'pending';
}

@Injectable()
export class CdnProvidersService {
  private readonly providers: Map<string, CdnProvider> = new Map();
  private readonly configurations: Map<string, CdnConfiguration> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Локальные CDN-провайдеры
    this.providers.set('yandex-cloud-cdn', {
      name: 'Яндекс.Cloud CDN',
      type: 'local',
      region: 'RU',
      endpoint: 'https://cdn.yandexcloud.net',
      features: {
        ssl: true,
        compression: true,
        imageOptimization: true,
        videoStreaming: true,
        edgeComputing: false,
      },
      pricing: {
        bandwidth: 0.5,
        requests: 0.1,
        currency: 'RUB',
      },
      performance: {
        averageLatency: 15,
        uptime: 99.9,
        edgeLocations: 50,
      },
    });

    this.providers.set('vk-cloud-cdn', {
      name: 'VK Cloud CDN',
      type: 'local',
      region: 'RU',
      endpoint: 'https://cdn.vk.cloud',
      features: {
        ssl: true,
        compression: true,
        imageOptimization: true,
        videoStreaming: true,
        edgeComputing: true,
      },
      pricing: {
        bandwidth: 0.6,
        requests: 0.12,
        currency: 'RUB',
      },
      performance: {
        averageLatency: 18,
        uptime: 99.8,
        edgeLocations: 30,
      },
    });

    this.providers.set('ngenix', {
      name: 'Ngenix',
      type: 'local',
      region: 'RU',
      endpoint: 'https://cdn.ngenix.net',
      features: {
        ssl: true,
        compression: true,
        imageOptimization: false,
        videoStreaming: true,
        edgeComputing: false,
      },
      pricing: {
        bandwidth: 0.4,
        requests: 0.08,
        currency: 'RUB',
      },
      performance: {
        averageLatency: 20,
        uptime: 99.7,
        edgeLocations: 25,
      },
    });

    this.providers.set('cloudmts-cdn', {
      name: 'CloudMTS CDN',
      type: 'local',
      region: 'RU',
      endpoint: 'https://cdn.cloudmts.ru',
      features: {
        ssl: true,
        compression: true,
        imageOptimization: true,
        videoStreaming: true,
        edgeComputing: false,
      },
      pricing: {
        bandwidth: 0.55,
        requests: 0.11,
        currency: 'RUB',
      },
      performance: {
        averageLatency: 16,
        uptime: 99.9,
        edgeLocations: 40,
      },
    });

    this.providers.set('becloud-cdn', {
      name: 'BeCloud CDN',
      type: 'local',
      region: 'BY',
      endpoint: 'https://cdn.becloud.by',
      features: {
        ssl: true,
        compression: true,
        imageOptimization: false,
        videoStreaming: false,
        edgeComputing: false,
      },
      pricing: {
        bandwidth: 0.3,
        requests: 0.06,
        currency: 'BYN',
      },
      performance: {
        averageLatency: 25,
        uptime: 99.5,
        edgeLocations: 10,
      },
    });

    // Международные CDN-провайдеры
    this.providers.set('akamai', {
      name: 'Akamai',
      type: 'international',
      region: 'GLOBAL',
      endpoint: 'https://cdn.akamai.net',
      features: {
        ssl: true,
        compression: true,
        imageOptimization: true,
        videoStreaming: true,
        edgeComputing: true,
      },
      pricing: {
        bandwidth: 0.08,
        requests: 0.02,
        currency: 'USD',
      },
      performance: {
        averageLatency: 10,
        uptime: 99.99,
        edgeLocations: 4000,
      },
    });

    this.providers.set('amazon-cloudfront', {
      name: 'Amazon CloudFront',
      type: 'international',
      region: 'GLOBAL',
      endpoint: 'https://d.cloudfront.net',
      features: {
        ssl: true,
        compression: true,
        imageOptimization: true,
        videoStreaming: true,
        edgeComputing: true,
      },
      pricing: {
        bandwidth: 0.085,
        requests: 0.0075,
        currency: 'USD',
      },
      performance: {
        averageLatency: 12,
        uptime: 99.9,
        edgeLocations: 450,
      },
    });

    redactedLogger.log('CDN providers initialized', 'CdnProvidersService', {
      count: this.providers.size,
      local: Array.from(this.providers.values()).filter(p => p.type === 'local')
        .length,
      international: Array.from(this.providers.values()).filter(
        p => p.type === 'international'
      ).length,
    });
  }

  getAllProviders(): CdnProvider[] {
    return Array.from(this.providers.values());
  }

  getProvider(id: string): CdnProvider | null {
    return this.providers.get(id) ?? null;
  }

  getProvidersByRegion(region: 'RU' | 'BY' | 'GLOBAL'): CdnProvider[] {
    return Array.from(this.providers.values()).filter(p => p.region === region);
  }

  getLocalProviders(): CdnProvider[] {
    return Array.from(this.providers.values()).filter(p => p.type === 'local');
  }

  getInternationalProviders(): CdnProvider[] {
    return Array.from(this.providers.values()).filter(
      p => p.type === 'international'
    );
  }

  async createCdnConfiguration(
    providerId: string,
    domain: string,
    settings: CdnConfiguration['settings']
  ): Promise<string | null> {
    const provider = this.getProvider(providerId);
    if (provider == null) {
      redactedLogger.error(
        `CDN provider not found: ${providerId}`,
        'CdnProvidersService'
      );
      return null;
    }

    const configId = `cdn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const configuration: CdnConfiguration = {
      providerId,
      domain,
      settings,
      status: 'pending',
    };

    this.configurations.set(configId, configuration);

    try {
      redactedLogger.log(
        `CDN configuration created: ${configId}`,
        'CdnProvidersService',
        {
          provider: provider.name,
          domain,
          settings,
        }
      );

      // Имитация активации
      setTimeout(() => {
        const config = this.configurations.get(configId);
        if (config != null) {
          config.status = 'active';
          redactedLogger.log(
            `CDN configuration activated: ${configId}`,
            'CdnProvidersService'
          );
        }
      }, 3000);

      return configId;
    } catch (error) {
      redactedLogger.error(
        `CDN configuration creation failed: ${configId}`,
        error as string
      );
      this.configurations.delete(configId);
      return null;
    }
  }

  getCdnConfiguration(configId: string): CdnConfiguration | null {
    return this.configurations.get(configId) ?? null;
  }

  getAllConfigurations(): CdnConfiguration[] {
    return Array.from(this.configurations.values());
  }

  updateCdnConfiguration(
    configId: string,
    settings: Partial<CdnConfiguration['settings']>
  ): boolean {
    const config = this.configurations.get(configId);
    if (config == null) {
      return false;
    }

    config.settings = { ...config.settings, ...settings };

    redactedLogger.log(
      `CDN configuration updated: ${configId}`,
      'CdnProvidersService',
      {
        domain: config.domain,
        settings: config.settings,
      }
    );

    return true;
  }

  async deleteCdnConfiguration(configId: string): Promise<boolean> {
    const config = this.configurations.get(configId);
    if (config == null) {
      return false;
    }

    try {
      redactedLogger.log(
        `CDN configuration deleted: ${configId}`,
        'CdnProvidersService',
        {
          domain: config.domain,
        }
      );

      this.configurations.delete(configId);
      return true;
    } catch (error) {
      redactedLogger.error(
        `CDN configuration deletion failed: ${configId}`,
        error as string
      );
      return false;
    }
  }

  getOptimalProvider(requirements: {
    region: 'RU' | 'BY' | 'GLOBAL';
    budget: number;
    features: string[];
  }): CdnProvider | null {
    const availableProviders = this.getProvidersByRegion(requirements.region);

    const suitableProviders = availableProviders.filter(provider => {
      const hasRequiredFeatures = requirements.features.every(feature => {
        switch (feature) {
          case 'ssl':
            return provider.features.ssl;
          case 'compression':
            return provider.features.compression;
          case 'imageOptimization':
            return provider.features.imageOptimization;
          case 'videoStreaming':
            return provider.features.videoStreaming;
          case 'edgeComputing':
            return provider.features.edgeComputing;
          default:
            return true;
        }
      });

      return hasRequiredFeatures;
    });

    if (suitableProviders.length === 0) {
      return null;
    }

    // Выбираем провайдера с лучшей производительностью в рамках бюджета
    const sorted = suitableProviders.sort((a, b) => {
      const aScore =
        (a.performance.uptime * a.performance.edgeLocations) /
        a.pricing.bandwidth;
      const bScore =
        (b.performance.uptime * b.performance.edgeLocations) /
        b.pricing.bandwidth;
      return bScore - aScore;
    });
    return sorted[0] ?? null;
  }

  /**
   * Получение провайдеров по типу
   */
  getProvidersByType(type: 'local' | 'international'): CdnProvider[] {
    return Array.from(this.providers.values()).filter(
      provider => provider.type === type
    );
  }

  /**
   * Создание конфигурации CDN
   */
  createConfiguration(
    config: Omit<CdnConfiguration, 'status'>
  ): CdnConfiguration {
    const configuration: CdnConfiguration = {
      ...config,
      status: 'pending',
    };

    const configId = `cdn-config-${Date.now()}`;
    this.configurations.set(configId, configuration);

    redactedLogger.log(`CDN configuration created`, 'CdnProvidersService', {
      providerId: config.providerId,
      domain: config.domain,
    });

    return configuration;
  }

  /**
   * Получение метрик производительности CDN
   */
  getPerformanceMetrics(providerId: string): {
    averageLatency: number;
    uptime: number;
    edgeLocations: number;
  } | null {
    const provider = this.providers.get(providerId);
    if (provider == null) {
      return null;
    }

    return {
      averageLatency: provider.performance.averageLatency,
      uptime: provider.performance.uptime,
      edgeLocations: provider.performance.edgeLocations,
    };
  }
}
