import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface IPipelineStage {
  id: string;
  name: string;
  type: 'build' | 'test' | 'deploy' | 'security' | 'quality';
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  logs: string[];
  artifacts: string[];
  metrics: Record<string, unknown>;
  dependencies: string[];
}

export interface IPipeline {
  id: string;
  name: string;
  version: string;
  branch: string;
  commit: string;
  trigger: 'manual' | 'push' | 'pull_request' | 'schedule' | 'webhook';
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  stages: IPipelineStage[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
  environment: string;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
}

export interface IDeployment {
  id: string;
  pipelineId: string;
  environment: string;
  version: string;
  strategy: 'rolling' | 'blue-green' | 'canary';
  status: 'pending' | 'running' | 'success' | 'failed' | 'rolled_back';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  replicas: number;
  healthChecks: {
    liveness: boolean;
    readiness: boolean;
    startup: boolean;
  };
  metrics: Record<string, unknown>;
  rollbackInfo?: {
    previousVersion: string;
    rollbackTime?: Date;
    reason?: string;
  };
}

export interface IEnvironment {
  name: string;
  displayName: string;
  type: 'development' | 'staging' | 'production';
  status: 'active' | 'inactive' | 'maintenance';
  url?: string;
  replicas: number;
  resources: {
    cpu: string;
    memory: string;
    storage: string;
  };
  config: Record<string, unknown>;
  lastDeployment?: string;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
}

@Injectable()
export class UnifiedCICDPipelineService {
  private readonly logger = new Logger(UnifiedCICDPipelineService.name);
  private pipelines = new Map<string, IPipeline>();
  private deployments = new Map<string, IDeployment>();
  private environments = new Map<string, IEnvironment>();
  private pipelineTemplates = new Map<string, unknown>();

  constructor(
    private _configService: ConfigService,
    private eventEmitter: EventEmitter2
  ) {
    this._configService.get('CICD_ENABLED');
    this.initializeEnvironments();
    this.initializePipelineTemplates();
  }

  private initializeEnvironments(): void {
    const defaultEnvironments: IEnvironment[] = [
      {
        name: 'development',
        displayName: 'Development',
        type: 'development',
        status: 'active',
        url: 'https://dev.example.com',
        replicas: 1,
        resources: {
          cpu: '500m',
          memory: '1Gi',
          storage: '10Gi',
        },
        config: {
          database: 'dev-db',
          redis: 'dev-redis',
          monitoring: false,
        },
        healthStatus: 'healthy',
      },
      {
        name: 'staging',
        displayName: 'Staging',
        type: 'staging',
        status: 'active',
        url: 'https://staging.example.com',
        replicas: 2,
        resources: {
          cpu: '1000m',
          memory: '2Gi',
          storage: '20Gi',
        },
        config: {
          database: 'staging-db',
          redis: 'staging-redis',
          monitoring: true,
        },
        healthStatus: 'healthy',
      },
      {
        name: 'production',
        displayName: 'Production',
        type: 'production',
        status: 'active',
        url: 'https://example.com',
        replicas: 5,
        resources: {
          cpu: '2000m',
          memory: '4Gi',
          storage: '50Gi',
        },
        config: {
          database: 'prod-db',
          redis: 'prod-redis',
          monitoring: true,
        },
        healthStatus: 'healthy',
      },
    ];

    defaultEnvironments.forEach(env => {
      this.environments.set(env.name, env);
    });

    this.logger.log(`Initialized ${defaultEnvironments.length} environments`);
  }

  private initializePipelineTemplates(): void {
    const templates = [
      {
        id: 'standard-pipeline',
        name: 'Standard Pipeline',
        description:
          'Standard CI/CD pipeline with build, test, and deploy stages',
        stages: [
          {
            name: 'Checkout',
            type: 'build',
            script: 'git checkout $CI_COMMIT_SHA',
          },
          {
            name: 'Install Dependencies',
            type: 'build',
            script: 'pnpm install --frozen-lockfile',
          },
          {
            name: 'Type Check',
            type: 'test',
            script: 'pnpm type-check',
          },
          {
            name: 'Lint',
            type: 'quality',
            script: 'pnpm lint',
          },
          {
            name: 'Unit Tests',
            type: 'test',
            script: 'pnpm test',
          },
          {
            name: 'Build',
            type: 'build',
            script: 'pnpm build',
          },
          {
            name: 'Security Scan',
            type: 'security',
            script: 'pnpm audit',
          },
          {
            name: 'Deploy',
            type: 'deploy',
            script: 'kubectl apply -f k8s/',
          },
        ],
      },
      {
        id: 'fast-pipeline',
        name: 'Fast Pipeline',
        description: 'Fast pipeline for development with minimal checks',
        stages: [
          {
            name: 'Checkout',
            type: 'build',
            script: 'git checkout $CI_COMMIT_SHA',
          },
          {
            name: 'Install Dependencies',
            type: 'build',
            script: 'pnpm install --frozen-lockfile',
          },
          {
            name: 'Quick Tests',
            type: 'test',
            script: 'pnpm test --passWithNoTests',
          },
          {
            name: 'Build',
            type: 'build',
            script: 'pnpm build',
          },
          {
            name: 'Deploy to Dev',
            type: 'deploy',
            script: 'kubectl apply -f k8s/dev/',
          },
        ],
      },
    ];

    templates.forEach(template => {
      this.pipelineTemplates.set(template.id, template);
    });

    this.logger.log(`Initialized ${templates.length} pipeline templates`);
  }

  async createPipeline(
    templateId: string,
    branch: string,
    commit: string,
    environment: string,
    createdBy: string,
    metadata: Record<string, unknown> = {}
  ): Promise<IPipeline> {
    const template = this.pipelineTemplates.get(templateId);
    if (template == null) {
      throw new Error(`Pipeline template ${templateId} not found`);
    }

    const pipelineId = `pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const stages: IPipelineStage[] = (
      template as { stages: unknown[] }
    ).stages.map((stageTemplate: unknown, index: number) => ({
      id: `stage-${index}`,
      name: (stageTemplate as { name: string }).name,
      type: (stageTemplate as { type: string }).type as
        | 'security'
        | 'test'
        | 'build'
        | 'quality'
        | 'deploy',
      status: 'pending',
      logs: [],
      artifacts: [],
      metrics: {},
      dependencies: index > 0 ? [`stage-${index - 1}`] : [],
    }));

    const pipeline: IPipeline = {
      id: pipelineId,
      name: (template as { name: string }).name,
      version: '1.0.0',
      branch,
      commit,
      trigger: 'manual',
      status: 'pending',
      stages,
      startTime: new Date(),
      environment,
      metadata: {
        templateId,
        ...metadata,
      },
      createdBy,
      createdAt: new Date(),
    };

    this.pipelines.set(pipelineId, pipeline);

    // Эмитим событие
    this.eventEmitter.emit('pipeline.created', pipeline);

    this.logger.log(`Created pipeline: ${pipelineId} for branch ${branch}`);

    return pipeline;
  }

  async startPipeline(pipelineId: string): Promise<IPipeline> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    if (pipeline.status !== 'pending') {
      throw new Error(`Pipeline ${pipelineId} is not in pending status`);
    }

    pipeline.status = 'running';
    pipeline.startTime = new Date();

    // Запускаем первую стадию
    if (pipeline.stages[0]) {
      await this.startStage(pipelineId, pipeline.stages[0].id);
    }

    this.logger.log(`Started pipeline: ${pipelineId}`);

    return pipeline;
  }

  async startStage(
    pipelineId: string,
    stageId: string
  ): Promise<IPipelineStage> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    const stage = pipeline.stages.find(s => s.id === stageId);
    if (!stage) {
      throw new Error(`Stage ${stageId} not found in pipeline ${pipelineId}`);
    }

    // Проверяем зависимости
    for (const depId of stage.dependencies) {
      const depStage = pipeline.stages.find(s => s.id === depId);
      if (!depStage || depStage.status !== 'success') {
        throw new Error(
          `Dependency ${depId} not completed for stage ${stageId}`
        );
      }
    }

    stage.status = 'running';
    stage.startTime = new Date();

    // Симуляция выполнения стадии
    setTimeout(
      () => {
        void this.completeStage(pipelineId, stageId, 'success');
      },
      Math.random() * 10000 + 5000
    ); // 5-15 секунд

    this.logger.log(`Started stage: ${stageId} in pipeline ${pipelineId}`);

    return stage;
  }

  async completeStage(
    pipelineId: string,
    stageId: string,
    status: 'success' | 'failed' | 'skipped',
    logs: string[] = [],
    artifacts: string[] = [],
    metrics: Record<string, unknown> = {}
  ): Promise<IPipelineStage> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    const stage = pipeline.stages.find(s => s.id === stageId);
    if (!stage) {
      throw new Error(`Stage ${stageId} not found in pipeline ${pipelineId}`);
    }

    stage.status = status;
    stage.endTime = new Date();
    stage.duration = stage.startTime
      ? stage.endTime.getTime() - stage.startTime.getTime()
      : 0;
    stage.logs = logs;
    stage.artifacts = artifacts;
    stage.metrics = metrics;

    // Эмитим событие
    this.eventEmitter.emit('pipeline.stage.completed', { pipeline, stage });

    if (status === 'failed') {
      pipeline.status = 'failed';
      pipeline.endTime = new Date();
      pipeline.duration =
        pipeline.endTime.getTime() - pipeline.startTime.getTime();

      this.eventEmitter.emit('pipeline.failed', pipeline);
      this.logger.error(`Pipeline ${pipelineId} failed at stage ${stageId}`);
    } else {
      // Запускаем следующую стадию
      const nextStage = pipeline.stages.find(
        s =>
          s.status === 'pending' &&
          s.dependencies.every(
            depId =>
              pipeline.stages.find(dep => dep.id === depId)?.status ===
              'success'
          )
      );

      if (nextStage != null) {
        await this.startStage(pipelineId, nextStage.id);
      } else {
        // Все стадии завершены
        pipeline.status = 'success';
        pipeline.endTime = new Date();
        pipeline.duration =
          pipeline.endTime.getTime() - pipeline.startTime.getTime();

        this.eventEmitter.emit('pipeline.success', pipeline);
        this.logger.log(`Pipeline ${pipelineId} completed successfully`);
      }
    }

    return stage;
  }

  async deployToEnvironment(
    pipelineId: string,
    environment: string,
    strategy: 'rolling' | 'blue-green' | 'canary' = 'rolling'
  ): Promise<IDeployment> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    if (pipeline.status !== 'success') {
      throw new Error(`Pipeline ${pipelineId} is not successful`);
    }

    const env = this.environments.get(environment);
    if (env == null) {
      throw new Error(`Environment ${environment} not found`);
    }

    const deploymentId = `deployment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const deployment: IDeployment = {
      id: deploymentId,
      pipelineId,
      environment,
      version: pipeline.version,
      strategy,
      status: 'pending',
      startTime: new Date(),
      replicas: env.replicas,
      healthChecks: {
        liveness: false,
        readiness: false,
        startup: false,
      },
      metrics: {},
    };

    this.deployments.set(deploymentId, deployment);

    // Запускаем развертывание
    await this.startDeployment(deploymentId);

    this.logger.log(`Started deployment ${deploymentId} to ${environment}`);

    return deployment;
  }

  private async startDeployment(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      return;
    }

    deployment.status = 'running';

    // Симуляция развертывания
    setTimeout(
      () => {
        void this.completeDeployment(deploymentId, 'success');
      },
      Math.random() * 30000 + 10000
    ); // 10-40 секунд

    this.logger.log(`Deployment ${deploymentId} started`);
  }

  async completeDeployment(
    deploymentId: string,
    status: 'success' | 'failed',
    metrics: Record<string, unknown> = {}
  ): Promise<IDeployment> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    deployment.status = status;
    deployment.endTime = new Date();
    deployment.duration =
      deployment.endTime.getTime() - deployment.startTime.getTime();
    deployment.metrics = metrics;

    if (status === 'success') {
      deployment.healthChecks = {
        liveness: true,
        readiness: true,
        startup: true,
      };

      // Обновляем информацию об окружении
      const env = this.environments.get(deployment.environment);
      if (env != null) {
        env.lastDeployment = deploymentId;
        env.healthStatus = 'healthy';
      }
    }

    // Эмитим событие
    this.eventEmitter.emit('deployment.completed', deployment);

    this.logger.log(
      `Deployment ${deploymentId} completed with status: ${status}`
    );

    return deployment;
  }

  async rollbackDeployment(
    deploymentId: string,
    reason: string,
    rolledBackBy: string
  ): Promise<IDeployment> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    deployment.status = 'rolled_back';
    deployment.endTime = new Date();
    deployment.duration =
      deployment.endTime.getTime() - deployment.startTime.getTime();
    deployment.rollbackInfo = {
      previousVersion: deployment.version,
      rollbackTime: new Date(),
      reason,
    };

    // Эмитим событие
    this.eventEmitter.emit('deployment.rolled_back', {
      deployment,
      rolledBackBy,
    });

    this.logger.log(
      `Deployment ${deploymentId} rolled back by ${rolledBackBy}: ${reason}`
    );

    return deployment;
  }

  async getPipeline(pipelineId: string): Promise<IPipeline | null> {
    return this.pipelines.get(pipelineId) ?? null;
  }

  async getAllPipelines(filters?: {
    status?: string;
    environment?: string;
    branch?: string;
    limit?: number;
  }): Promise<IPipeline[]> {
    let pipelines = Array.from(this.pipelines.values());

    if (filters != null) {
      if (filters.status != null && filters.status !== '') {
        pipelines = pipelines.filter(p => p.status === filters.status);
      }
      if (filters.environment != null && filters.environment !== '') {
        pipelines = pipelines.filter(
          p => p.environment === filters.environment
        );
      }
      if (filters.branch != null && filters.branch !== '') {
        pipelines = pipelines.filter(p => p.branch === filters.branch);
      }
    }

    pipelines = pipelines.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    if (filters?.limit != null && filters.limit > 0) {
      pipelines = pipelines.slice(0, filters.limit);
    }

    return pipelines;
  }

  async getDeployment(deploymentId: string): Promise<IDeployment | null> {
    return this.deployments.get(deploymentId) ?? null;
  }

  async getAllDeployments(filters?: {
    environment?: string;
    status?: string;
    limit?: number;
  }): Promise<IDeployment[]> {
    let deployments = Array.from(this.deployments.values());

    if (filters != null) {
      if (filters.environment != null && filters.environment !== '') {
        deployments = deployments.filter(
          d => d.environment === filters.environment
        );
      }
      if (filters.status != null && filters.status !== '') {
        deployments = deployments.filter(d => d.status === filters.status);
      }
    }

    deployments = deployments.sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    );

    if (filters?.limit != null && filters.limit > 0) {
      deployments = deployments.slice(0, filters.limit);
    }

    return deployments;
  }

  async getEnvironment(name: string): Promise<IEnvironment | null> {
    return this.environments.get(name) ?? null;
  }

  async getAllEnvironments(): Promise<IEnvironment[]> {
    return Array.from(this.environments.values());
  }

  async updateEnvironmentStatus(
    name: string,
    status: IEnvironment['status'],
    healthStatus: IEnvironment['healthStatus']
  ): Promise<IEnvironment | null> {
    const env = this.environments.get(name);
    if (!env) {
      return null;
    }

    env.status = status;
    env.healthStatus = healthStatus;

    this.logger.log(
      `Environment ${name} status updated: ${status}, health: ${healthStatus}`
    );

    return env;
  }

  async getPipelineMetrics(timeRange: { from: Date; to: Date }): Promise<{
    totalPipelines: number;
    successfulPipelines: number;
    failedPipelines: number;
    averageDuration: number;
    pipelinesByStatus: Record<string, number>;
    deploymentsByEnvironment: Record<string, number>;
  }> {
    const pipelines = Array.from(this.pipelines.values()).filter(
      p => p.createdAt >= timeRange.from && p.createdAt <= timeRange.to
    );

    const deployments = Array.from(this.deployments.values()).filter(
      d => d.startTime >= timeRange.from && d.startTime <= timeRange.to
    );

    const totalPipelines = pipelines.length;
    const successfulPipelines = pipelines.filter(
      p => p.status === 'success'
    ).length;
    const failedPipelines = pipelines.filter(p => p.status === 'failed').length;

    const completedPipelines = pipelines.filter(p => p.duration != null);
    const averageDuration =
      completedPipelines.length > 0
        ? completedPipelines.reduce((sum, p) => sum + (p.duration ?? 0), 0) /
          completedPipelines.length
        : 0;

    const pipelinesByStatus = pipelines.reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const deploymentsByEnvironment = deployments.reduce(
      (acc, d) => {
        acc[d.environment] = (acc[d.environment] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalPipelines,
      successfulPipelines,
      failedPipelines,
      averageDuration,
      pipelinesByStatus,
      deploymentsByEnvironment,
    };
  }
}
