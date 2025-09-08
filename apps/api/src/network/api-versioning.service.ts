import { Injectable } from '@nestjs/common';
import { redactedLogger } from '../utils/redacted-logger';

interface ApiVersion {
  version: string;
  status: 'active' | 'deprecated' | 'sunset';
  releaseDate: Date;
  sunsetDate?: Date;
  features: string[];
  breakingChanges: string[];
  migrationGuide?: string;
}

interface VersionedEndpoint {
  path: string;
  method: string;
  versions: string[];
  deprecatedVersions: string[];
  sunsetVersions: string[];
  alternatives: Record<string, string>;
}

interface VersionConfig {
  defaultVersion: string;
  supportedVersions: string[];
  deprecatedVersions: string[];
  sunsetVersions: string[];
  versionHeader: string;
  versionParam: string;
  fallbackToLatest: boolean;
}

@Injectable()
export class ApiVersioningService {
  private readonly config: VersionConfig;
  private readonly versions: Map<string, ApiVersion> = new Map();
  private readonly endpoints: Map<string, VersionedEndpoint> = new Map();
  private readonly versionUsage: Map<string, number> = new Map();

  constructor() {
    this.config = {
      defaultVersion: process.env.API_DEFAULT_VERSION ?? 'v1',
      supportedVersions: process.env.API_SUPPORTED_VERSIONS?.split(',') ?? [
        'v1',
        'v2',
      ],
      deprecatedVersions: process.env.API_DEPRECATED_VERSIONS?.split(',') ?? [],
      sunsetVersions: process.env.API_SUNSET_VERSIONS?.split(',') ?? [],
      versionHeader: process.env.API_VERSION_HEADER ?? 'X-API-Version',
      versionParam: process.env.API_VERSION_PARAM ?? 'version',
      fallbackToLatest: process.env.API_FALLBACK_TO_LATEST === 'true',
    };

    this.initializeVersions();
    this.initializeEndpoints();

    redactedLogger.log(
      'API Versioning Service initialized',
      'ApiVersioningService',
      {
        defaultVersion: this.config.defaultVersion,
        supportedVersions: this.config.supportedVersions,
      }
    );
  }

  /**
   * Инициализация версий API
   */
  private initializeVersions(): void {
    const v1: ApiVersion = {
      version: 'v1',
      status: 'active',
      releaseDate: new Date('2024-01-01'),
      features: ['basic-crud', 'authentication', 'pagination'],
      breakingChanges: [],
    };

    const v2: ApiVersion = {
      version: 'v2',
      status: 'active',
      releaseDate: new Date('2024-06-01'),
      features: ['advanced-filtering', 'bulk-operations', 'real-time-updates'],
      breakingChanges: ['changed-pagination-format', 'updated-error-responses'],
      migrationGuide: '/docs/migration/v1-to-v2',
    };

    this.versions.set('v1', v1);
    this.versions.set('v2', v2);
  }

  /**
   * Инициализация эндпоинтов
   */
  private initializeEndpoints(): void {
    const endpoints: VersionedEndpoint[] = [
      {
        path: '/users',
        method: 'GET',
        versions: ['v1', 'v2'],
        deprecatedVersions: [],
        sunsetVersions: [],
        alternatives: {},
      },
      {
        path: '/users/:id',
        method: 'GET',
        versions: ['v1', 'v2'],
        deprecatedVersions: [],
        sunsetVersions: [],
        alternatives: {},
      },
      {
        path: '/users',
        method: 'POST',
        versions: ['v1', 'v2'],
        deprecatedVersions: [],
        sunsetVersions: [],
        alternatives: {},
      },
      {
        path: '/products',
        method: 'GET',
        versions: ['v2'],
        deprecatedVersions: [],
        sunsetVersions: [],
        alternatives: { v1: '/items' },
      },
    ];

    endpoints.forEach(endpoint => {
      const key = `${endpoint.method}:${endpoint.path}`;
      this.endpoints.set(key, endpoint);
    });
  }

  /**
   * Определение версии API из запроса
   */
  resolveVersion(request: {
    headers: Record<string, string>;
    query: Record<string, string>;
    path: string;
  }): { version: string; source: 'header' | 'query' | 'path' | 'default' } {
    const { headers, query, path } = request;

    // Проверка заголовка версии
    const headerVersion = headers[this.config.versionHeader.toLowerCase()];
    if (
      headerVersion != null &&
      headerVersion !== '' &&
      this.isValidVersion(headerVersion)
    ) {
      this.updateVersionUsage(headerVersion);
      return { version: headerVersion, source: 'header' };
    }

    // Проверка параметра запроса
    const queryVersion = query[this.config.versionParam];
    if (
      queryVersion != null &&
      queryVersion !== '' &&
      this.isValidVersion(queryVersion)
    ) {
      this.updateVersionUsage(queryVersion);
      return { version: queryVersion, source: 'query' };
    }

    // Проверка версии в пути
    const pathVersion = this.extractVersionFromPath(path);
    if (
      pathVersion != null &&
      pathVersion !== '' &&
      this.isValidVersion(pathVersion)
    ) {
      this.updateVersionUsage(pathVersion);
      return { version: pathVersion, source: 'path' };
    }

    // Использование версии по умолчанию
    this.updateVersionUsage(this.config.defaultVersion);
    return { version: this.config.defaultVersion, source: 'default' };
  }

  /**
   * Извлечение версии из пути
   */
  private extractVersionFromPath(path: string): string | null {
    const versionMatch = path.match(/\/v(\d+)/);
    return versionMatch ? `v${versionMatch[1]}` : null;
  }

  /**
   * Проверка валидности версии
   */
  private isValidVersion(version: string): boolean {
    return (
      this.config.supportedVersions.includes(version) ||
      this.config.deprecatedVersions.includes(version)
    );
  }

  /**
   * Обновление статистики использования версий
   */
  private updateVersionUsage(version: string): void {
    const currentCount = this.versionUsage.get(version) ?? 0;
    this.versionUsage.set(version, currentCount + 1);
  }

  /**
   * Проверка доступности эндпоинта для версии
   */
  isEndpointAvailable(path: string, method: string, version: string): boolean {
    const key = `${method}:${path}`;
    const endpoint = this.endpoints.get(key);

    if (!endpoint) {
      return false;
    }

    return (
      endpoint.versions.includes(version) &&
      !endpoint.sunsetVersions.includes(version)
    );
  }

  /**
   * Получение альтернативного эндпоинта для устаревшей версии
   */
  getAlternativeEndpoint(
    path: string,
    method: string,
    version: string
  ): string | null {
    const key = `${method}:${path}`;
    const endpoint = this.endpoints.get(key);

    if (!endpoint) {
      return null;
    }

    return endpoint.alternatives[version] ?? null;
  }

  /**
   * Проверка статуса версии
   */
  getVersionStatus(version: string): {
    status: ApiVersion['status'];
    warning?: string;
  } {
    const versionInfo = this.versions.get(version);
    if (!versionInfo) {
      return { status: 'sunset', warning: 'Version not found' };
    }

    const now = new Date();
    let warning: string | undefined;

    if (versionInfo.status === 'deprecated') {
      warning =
        'This API version is deprecated and will be removed in a future release';
    } else if (
      versionInfo.status === 'sunset' &&
      versionInfo.sunsetDate &&
      now > versionInfo.sunsetDate
    ) {
      warning = 'This API version has been sunset and is no longer supported';
    }

    const result: {
      status: 'active' | 'deprecated' | 'sunset';
      warning?: string;
    } = { status: versionInfo.status };
    if (warning != null) {
      result.warning = warning;
    }
    return result;
  }

  /**
   * Генерация заголовков для обратной совместимости
   */
  generateCompatibilityHeaders(
    version: string,
    originalPath: string
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    const versionInfo = this.versions.get(version);
    if (!versionInfo) {
      return headers;
    }

    // Заголовок с текущей версией
    headers[this.config.versionHeader] = version;

    // Заголовок с предупреждением для устаревших версий
    if (versionInfo.status === 'deprecated') {
      headers['X-API-Deprecation-Warning'] = 'This API version is deprecated';
      headers['X-API-Sunset-Date'] =
        versionInfo.sunsetDate?.toISOString() ?? '';
    }

    // Заголовок с альтернативными эндпоинтами
    const alternative = this.getAlternativeEndpoint(
      originalPath,
      'GET',
      version
    );
    headers['X-API-Alternative-Endpoint'] = alternative ?? '';

    return headers;
  }

  /**
   * Миграция данных между версиями
   */
  migrateData(data: unknown, fromVersion: string, toVersion: string): unknown {
    if (fromVersion === toVersion) {
      return data;
    }

    // Простая логика миграции (в реальной реализации будет более сложная)
    if (fromVersion === 'v1' && toVersion === 'v2') {
      return this.migrateV1ToV2(data);
    }

    return data;
  }

  /**
   * Миграция с v1 на v2
   */
  private migrateV1ToV2(data: unknown): unknown {
    // Пример миграции пагинации
    if (
      typeof data === 'object' &&
      data != null &&
      'page' in data &&
      'limit' in data
    ) {
      const v1Data = data as { page: number; limit: number; items: unknown[] };
      return {
        pagination: {
          page: v1Data.page,
          limit: v1Data.limit,
          total: v1Data.items.length,
        },
        data: v1Data.items,
      };
    }

    return data;
  }

  /**
   * Получение статистики версионирования
   */
  getVersioningStats() {
    const totalRequests = Array.from(this.versionUsage.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    const versionUsagePercentages: Record<string, number> = {};

    for (const [version, count] of this.versionUsage.entries()) {
      versionUsagePercentages[version] =
        totalRequests > 0 ? (count / totalRequests) * 100 : 0;
    }

    return {
      totalRequests,
      versionUsage: Object.fromEntries(this.versionUsage),
      versionUsagePercentages,
      supportedVersions: this.config.supportedVersions,
      deprecatedVersions: this.config.deprecatedVersions,
      sunsetVersions: this.config.sunsetVersions,
      endpointsCount: this.endpoints.size,
    };
  }

  /**
   * Добавление новой версии API
   */
  addVersion(version: ApiVersion): void {
    this.versions.set(version.version, version);
    this.config.supportedVersions.push(version.version);

    redactedLogger.log(
      `New API version added: ${version.version}`,
      'ApiVersioningService'
    );
  }

  /**
   * Помечение версии как устаревшей
   */
  deprecateVersion(version: string, sunsetDate: Date): void {
    const versionInfo = this.versions.get(version);
    if (versionInfo) {
      versionInfo.status = 'deprecated';
      versionInfo.sunsetDate = sunsetDate;

      this.config.supportedVersions = this.config.supportedVersions.filter(
        v => v !== version
      );
      this.config.deprecatedVersions.push(version);

      redactedLogger.log(
        `API version deprecated: ${version}`,
        'ApiVersioningService'
      );
    }
  }
}
