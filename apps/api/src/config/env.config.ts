import { z } from 'zod';

/**
 * Схема для валидации всех environment variables проекта
 */
const envSchema = z.object({
  // Основные настройки приложения
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().transform(Number).default(3001),

  // База данных
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.string().transform(Number).optional(),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),

  // Supabase
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('1d'),

  // Monitoring & Observability
  SENTRY_DSN: z.string().optional(),
  JAEGER_ENDPOINT: z.string().optional(),
  ELASTICSEARCH_NODE: z.string().optional(),
  PROMETHEUS_GATEWAY: z.string().optional(),

  // Security
  ENCRYPTION_KEY: z.string().optional(),
  API_KEY_SECRET: z.string().optional(),

  // Feature Flags
  FEATURE_NEW_DASHBOARD: z
    .string()
    .transform(val => val === 'true')
    .default(false),
  FEATURE_AI_ANALYTICS: z
    .string()
    .transform(val => val === 'true')
    .default(false),
  FEATURE_AUTO_SCALING: z
    .string()
    .transform(val => val === 'true')
    .default(false),

  // External Services
  OPENAI_API_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().optional(),

  // Performance
  RATE_LIMIT_TTL: z.string().transform(Number).default(60),
  RATE_LIMIT_LIMIT: z.string().transform(Number).default(10),

  // Gateway & Kong
  KONG_ADMIN_URL: z.string().default('http://localhost:8001'),
  KONG_PROXY_URL: z.string().default('http://localhost:8000'),
  KONG_ADMIN_PORT: z.string().transform(Number).default(8001),
  KONG_PROXY_PORT: z.string().transform(Number).default(8000),

  // Circuit Breaker
  CIRCUIT_BREAKER_TIMEOUT: z.string().transform(Number).default(3000),
  CIRCUIT_BREAKER_ERROR_THRESHOLD: z.string().transform(Number).default(5),
  CIRCUIT_BREAKER_RESET_TIMEOUT: z.string().transform(Number).default(60000),
  CIRCUIT_BREAKER_VOLUME_THRESHOLD: z.string().transform(Number).default(10),

  // Rate Limiting
  RATE_LIMIT_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default(100),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default(60000),

  // Load Balancer
  LOAD_BALANCER_ALGORITHM: z
    .enum(['round-robin', 'least-connections', 'weighted', 'ip-hash'])
    .default('round-robin'),
  LOAD_BALANCER_HEALTH_CHECK_INTERVAL: z
    .string()
    .transform(Number)
    .default(30000),

  // Service Discovery
  SERVICE_DISCOVERY_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  SERVICE_DISCOVERY_REFRESH_INTERVAL: z
    .string()
    .transform(Number)
    .default(30000),

  // Disaster Recovery
  DISASTER_RECOVERY_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  DISASTER_RECOVERY_RTO_TARGET: z.string().transform(Number).default(300000), // 5 minutes
  DISASTER_RECOVERY_RPO_TARGET: z.string().transform(Number).default(60000), // 1 minute
  DISASTER_RECOVERY_MAX_FAILOVER_TIME: z
    .string()
    .transform(Number)
    .default(600000), // 10 minutes
  DISASTER_RECOVERY_HEALTH_CHECK_INTERVAL: z
    .string()
    .transform(Number)
    .default(30000), // 30 seconds

  // Regional Failover
  REGIONAL_FAILOVER_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  REGIONAL_FAILOVER_AUTO_SWITCH: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  REGIONAL_FAILOVER_MANUAL_OVERRIDE: z
    .string()
    .transform(val => val === 'true')
    .default(false),
  REGIONAL_FAILOVER_NOTIFICATION_CHANNELS: z
    .string()
    .default('email,telegram,slack'),

  // Network Resilience
  NETWORK_RESILIENCE_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  NETWORK_RESILIENCE_BACKUP_CHANNELS: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  NETWORK_RESILIENCE_PEERING_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  NETWORK_RESILIENCE_LATENCY_THRESHOLD: z
    .string()
    .transform(Number)
    .default(100), // 100ms

  // Geographic Routing
  GEOGRAPHIC_ROUTING_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  GEOGRAPHIC_ROUTING_DEFAULT_REGION: z.string().default('RU'),
  GEOGRAPHIC_ROUTING_FALLBACK_REGION: z.string().default('BY'),
  GEOGRAPHIC_ROUTING_LATENCY_WEIGHT: z.string().transform(Number).default(0.6),

  // Incident Response
  INCIDENT_RESPONSE_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  INCIDENT_RESPONSE_AUTO_ESCALATION: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  INCIDENT_RESPONSE_ESCALATION_TIMEOUT: z
    .string()
    .transform(Number)
    .default(300000), // 5 minutes
  INCIDENT_RESPONSE_NOTIFICATION_CHANNELS: z
    .string()
    .default('email,telegram,slack,sms'),

  // Capacity Planning
  CAPACITY_PLANNING_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  CAPACITY_PLANNING_STRESS_TEST_INTERVAL: z
    .string()
    .transform(Number)
    .default(86400000), // 24 hours
  CAPACITY_PLANNING_PERFORMANCE_BASELINE: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  CAPACITY_PLANNING_GROWTH_FORECAST: z
    .string()
    .transform(Number)
    .default(2592000000), // 30 days

  // A1 ICT Services
  A1_ICT_SERVICES_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  A1_ICT_DRaaS_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  A1_ICT_BaaS_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  A1_ICT_TIER_III_DC_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  A1_ICT_API_ENDPOINT: z.string().default('https://api.a1.by'),
  A1_ICT_API_KEY: z.string().optional(),

  // Regional Architecture - Local Datacenters
  SELECTEL_ACCESS_KEY: z.string().optional(),
  SELECTEL_SECRET_KEY: z.string().optional(),
  VK_CLOUD_ACCESS_KEY: z.string().optional(),
  VK_CLOUD_SECRET_KEY: z.string().optional(),
  BECLOUD_ACCESS_KEY: z.string().optional(),
  BECLOUD_SECRET_KEY: z.string().optional(),
  ACTIVECLOUD_ACCESS_KEY: z.string().optional(),
  ACTIVECLOUD_SECRET_KEY: z.string().optional(),
  DATAHATA_ACCESS_KEY: z.string().optional(),
  DATAHATA_SECRET_KEY: z.string().optional(),
  A1_DIGITAL_ACCESS_KEY: z.string().optional(),
  A1_DIGITAL_SECRET_KEY: z.string().optional(),

  // Regional Architecture - Cloud Hosting
  HOSTER_BY_API_KEY: z.string().optional(),
  HOSTER_BY_API_SECRET: z.string().optional(),
  A1_FLEX_API_KEY: z.string().optional(),
  A1_FLEX_API_SECRET: z.string().optional(),
  DOMAIN_BY_API_KEY: z.string().optional(),
  DOMAIN_BY_API_SECRET: z.string().optional(),

  // Regional Architecture - CDN Providers
  YANDEX_CLOUD_CDN_API_KEY: z.string().optional(),
  VK_CLOUD_CDN_API_KEY: z.string().optional(),
  NGENIX_API_KEY: z.string().optional(),
  CLOUDMTS_CDN_API_KEY: z.string().optional(),
  BECLOUD_CDN_API_KEY: z.string().optional(),

  // Regional Architecture - Payment Systems
  ERIP_API_KEY: z.string().optional(),
  BEPAID_API_KEY: z.string().optional(),
  WEBPAY_API_KEY: z.string().optional(),
  OPLATI_API_KEY: z.string().optional(),
  CLOUDPAYMENTS_API_KEY: z.string().optional(),
  YUKASSA_API_KEY: z.string().optional(),
  YUMANI_API_KEY: z.string().optional(),
  TINKOFF_API_KEY: z.string().optional(),
  SBERPAY_API_KEY: z.string().optional(),
  SPB_API_KEY: z.string().optional(),

  // Automation - Self Healing
  SELF_HEALING_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  SELF_HEALING_MAX_RETRIES: z.string().transform(Number).default(3),
  SELF_HEALING_RETRY_DELAY: z.string().transform(Number).default(5000),
  SELF_HEALING_HEALTH_CHECK_INTERVAL: z
    .string()
    .transform(Number)
    .default(30000),

  // Automation - Automated Scaling
  AUTO_SCALING_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  AUTO_SCALING_CPU_THRESHOLD: z.string().transform(Number).default(80),
  AUTO_SCALING_MEMORY_THRESHOLD: z.string().transform(Number).default(85),
  AUTO_SCALING_NETWORK_THRESHOLD: z.string().transform(Number).default(75),
  AUTO_SCALING_COOLDOWN_PERIOD: z.string().transform(Number).default(300000),

  // Automation - Resource Optimization
  RESOURCE_OPTIMIZATION_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  RESOURCE_OPTIMIZATION_INTERVAL: z.string().transform(Number).default(300000),
  RESOURCE_OPTIMIZATION_CPU_TARGET: z.string().transform(Number).default(70),
  RESOURCE_OPTIMIZATION_MEMORY_TARGET: z.string().transform(Number).default(75),

  // Automation - Cost Management
  COST_MANAGEMENT_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  COST_MANAGEMENT_BUDGET_ALERT_THRESHOLD: z
    .string()
    .transform(Number)
    .default(90),
  COST_MANAGEMENT_CURRENCY_UPDATE_INTERVAL: z
    .string()
    .transform(Number)
    .default(3600000),

  // Automation - Automated Monitoring
  AUTOMATED_MONITORING_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  AUTOMATED_MONITORING_CHECK_INTERVAL: z
    .string()
    .transform(Number)
    .default(60000),
  AUTOMATED_MONITORING_ALERT_COOLDOWN: z
    .string()
    .transform(Number)
    .default(300000),

  // Automation - Operational Runbooks
  OPERATIONAL_RUNBOOKS_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  OPERATIONAL_RUNBOOKS_AUTO_EXECUTION: z
    .string()
    .transform(val => val === 'true')
    .default(false),

  // Automation - DevOps Integration
  DEVOPS_INTEGRATION_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  DEVOPS_TERRAFORM_PATH: z.string().default('/usr/local/bin/terraform'),
  DEVOPS_ANSIBLE_PATH: z.string().default('/usr/local/bin/ansible'),

  // Automation - Cost Optimization AI
  COST_OPTIMIZATION_AI_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  COST_OPTIMIZATION_AI_MODEL_PATH: z
    .string()
    .default('./models/cost-optimization'),
  COST_OPTIMIZATION_AI_CONFIDENCE_THRESHOLD: z
    .string()
    .transform(Number)
    .default(0.8),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('pretty'),

  // Development
  ENABLE_SWAGGER: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  ENABLE_CORS: z
    .string()
    .transform(val => val === 'true')
    .default(true),
});

// Типы для TypeScript
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Валидированная конфигурация приложения
 */
let validatedConfig: EnvConfig | null = null;

/**
 * Получить валидированную конфигурацию
 */
export function getConfig(): EnvConfig {
  if (!validatedConfig) {
    throw new Error(
      'Configuration not initialized. Call validateAndLoadConfig() first.'
    );
  }
  return validatedConfig;
}

/**
 * Валидировать и загрузить конфигурацию при старте приложения
 */
export function validateAndLoadConfig(): EnvConfig {
  try {
    const parsed = envSchema.parse(process.env);
    validatedConfig = parsed;
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');

      throw new Error(
        `Environment variables validation failed:\n${errorMessages}`
      );
    }
    throw error;
  }
}

/**
 * Проверить обязательные переменные для production
 */
export function validateProductionEnv(): void {
  const config = getConfig();

  if (config.NODE_ENV === 'production') {
    const requiredForProduction = [
      'JWT_SECRET',
      'ENCRYPTION_KEY',
      'SENTRY_DSN',
    ];

    const missing = requiredForProduction.filter(key => {
      const value = process.env[key];
      return value == null || value === '';
    });

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables for production: ${missing.join(', ')}`
      );
    }
  }
}

/**
 * Получить конфигурацию базы данных
 */
export function getDatabaseConfig() {
  const config = getConfig();

  if (config.DATABASE_URL != null && config.DATABASE_URL !== '') {
    return { url: config.DATABASE_URL };
  }

  return {
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME,
    username: config.DB_USER,
    password: config.DB_PASSWORD,
  };
}

/**
 * Получить конфигурацию Redis
 */
export function getRedisConfig() {
  const config = getConfig();

  return {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD,
  };
}

/**
 * Получить конфигурацию Feature Flags
 */
export function getFeatureFlagsConfig() {
  const config = getConfig();

  return {
    newDashboard: config.FEATURE_NEW_DASHBOARD,
    aiAnalytics: config.FEATURE_AI_ANALYTICS,
    autoScaling: config.FEATURE_AUTO_SCALING,
  };
}

/**
 * Проверить включена ли feature flag
 */
export function isFeatureEnabled(
  feature: keyof ReturnType<typeof getFeatureFlagsConfig>
): boolean {
  const features = getFeatureFlagsConfig();
  return features[feature];
}

/**
 * Получить конфигурацию безопасности
 */
export function getSecurityConfig() {
  const config = getConfig();

  return {
    jwtSecret: config.JWT_SECRET,
    jwtExpiresIn: config.JWT_EXPIRES_IN,
    encryptionKey: config.ENCRYPTION_KEY,
    apiKeySecret: config.API_KEY_SECRET,
  };
}

/**
 * Получить конфигурацию мониторинга
 */
export function getMonitoringConfig() {
  const config = getConfig();

  return {
    sentryDsn: config.SENTRY_DSN,
    jaegerEndpoint: config.JAEGER_ENDPOINT,
    elasticsearchNode: config.ELASTICSEARCH_NODE,
    prometheusGateway: config.PROMETHEUS_GATEWAY,
  };
}
