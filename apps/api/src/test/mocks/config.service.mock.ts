// Универсальная фабрика моков ConfigService для всех тестов
export function createMockConfig(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    // CDN
    CDN_PROVIDER: 'local',
    CDN_BASE_URL: 'http://localhost:3001/static',

    // Redis
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_DB: 0,

    // Pipeline
    PIPELINE_ENABLED: true,
    PIPELINE_MONITORING_ENABLED: true,
    PIPELINE_MONITORING_INTERVAL: 5000,
    PIPELINE_TIMEOUT: 30000,
    PIPELINE_RETRY_COUNT: 3,

    // Infrastructure
    ARTIFACT_REGISTRY_URL: 'https://registry.local',
    ANSIBLE_ENABLED: true,
    ANSIBLE_PATH: '/usr/bin/ansible',
    ANSIBLE_TIMEOUT: 300,
    ANSIBLE_RETRY_COUNT: 3,
    BACKUP_ENABLED: true,
    CLOUD_PROVIDER: 'aws',
    CLOUDFORMATION_ENABLED: true,
    CONFIG_ENABLED: true,
    DEPLOYMENT_ENABLED: true,
    DOCKER_ENABLED: true,
    GITOPS_ENABLED: true,
    KUBERNETES_ENABLED: true,
    LOCAL_CLOUD_ENABLED: true,
    TERRAFORM_ENABLED: true,

    // Features
    HOT_RELOAD_ENABLED: true,
    HOT_RELOAD_INTERVAL: 5000,
    UNIFIED_API_GATEWAY_ENABLED: true,
    CENTRALIZED_CONFIG_ENABLED: true,
  };

  const config = { ...defaults, ...overrides };

  return {
    get: (key: string, defaultValue?: unknown) => {
      if (key in config) return config[key];
      return defaultValue;
    },
  };
}

// Для обратной совместимости
export const createMockConfigService = createMockConfig;
