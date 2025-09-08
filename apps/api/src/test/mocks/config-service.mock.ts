import { ConfigService } from '@nestjs/config';

const mockConfigs: Record<string, unknown> = {
  // Pipeline
  PIPELINE_ENABLED: true,
  PIPELINE_MONITORING_ENABLED: true,
  PIPELINE_MONITORING_INTERVAL: 5000,
  PIPELINE_TIMEOUT: 30000,
  PIPELINE_RETRY_COUNT: 3,

  // Infrastructure
  ANSIBLE_ENABLED: true,
  ANSIBLE_PATH: '/usr/bin/ansible',
  ANSIBLE_TIMEOUT: 300,
  ANSIBLE_RETRY_COUNT: 3,
  BACKUP_ENABLED: true,
  BACKUP_PATH: '/backups',
  BACKUP_RETENTION: '30',
  BACKUP_COMPRESSION: 'gzip',
  DOCKER_ENABLED: true,
  DOCKER_HOST: 'unix:///var/run/docker.sock',
  DOCKER_REGISTRY: 'docker.io',
  DOCKER_BUILD_TIMEOUT: '300',
  DEPLOYMENT_ENABLED: true,
  DEPLOYMENT_STRATEGY: 'rolling',
  DEPLOYMENT_TIMEOUT: '600',
  DEPLOYMENT_RETRY_COUNT: '3',
  CONFIG_ENABLED: true,
  CONFIG_MANAGEMENT_ENABLED: 'true',
  CONFIG_BACKUP_ENABLED: 'true',
  CONFIG_VERSIONING_ENABLED: 'true',
  GITOPS_ENABLED: true,
  GITOPS_REPO_URL: 'https://github.com/example/repo',
  GITOPS_BRANCH: 'main',
  GITOPS_SYNC_INTERVAL: '60',
  KUBERNETES_ENABLED: true,
  KUBERNETES_CONFIG_PATH: '/home/user/.kube/config',
  KUBERNETES_NAMESPACE: 'default',
  KUBERNETES_CONTEXT: 'minikube',
  LOCAL_CLOUD_ENABLED: true,
  LOCAL_CLOUD_STORAGE_PATH: '/tmp/cloud-storage',
  LOCAL_CLOUD_NETWORK_NAME: 'local-cloud-network',
  TERRAFORM_ENABLED: true,
  TERRAFORM_WORKSPACE: 'default',
  TERRAFORM_STATE_BACKEND: 'local',
  TERRAFORM_PLAN_TIMEOUT: '300',

  // Cloud
  CLOUD_PROVIDER: 'aws',
  CLOUD_REGION: 'us-east-1',
  CLOUD_ACCESS_KEY: 'test-key',
  CLOUD_SECRET_KEY: 'test-secret',
  CLOUDFORMATION_ENABLED: true,
  CLOUDFORMATION_STACK_NAME: 'test-stack',
  CLOUDFORMATION_REGION: 'us-east-1',
  CLOUDFORMATION_TEMPLATE_URL: 'https://s3.amazonaws.com/template.json',

  // CDN
  CDN_PROVIDER: 'local',
  CDN_BASE_URL: 'http://localhost:3001/static',

  // Redis
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  REDIS_DB: 0,

  // Features
  HOT_RELOAD_ENABLED: true,
  HOT_RELOAD_INTERVAL: 5000,
  UNIFIED_API_GATEWAY_ENABLED: true,
  CENTRALIZED_CONFIG_ENABLED: true,
};

export const ConfigServiceProvider = {
  provide: ConfigService,
  useFactory: () => {
    return {
      get: (key: string, defaultValue?: unknown) => {
        if (key in mockConfigs) return mockConfigs[key];
        return defaultValue;
      },
      getOrThrow: (key: string) => {
        if (key in mockConfigs) return mockConfigs[key];
        throw new Error(`Configuration key "${key}" not found`);
      },
      // Добавляем все методы ConfigService
      getInternal: (key: string) => {
        if (key in mockConfigs) return mockConfigs[key];
        return undefined;
      },
    };
  },
};
