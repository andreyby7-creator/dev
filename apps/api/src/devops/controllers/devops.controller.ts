import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Buffer } from 'buffer';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../types/roles';
import { ArtifactService } from '../services/artifact.service';
import { PipelineMonitoringService } from '../services/pipeline-monitoring.service';
import { PipelineService } from '../services/pipeline.service';
import type { PipelineConfig } from '../services/pipeline.service';

@ApiTags('DevOps')
@Controller('devops')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DevOpsController {
  constructor(
    private readonly pipelineService: PipelineService,
    private readonly artifactService: ArtifactService,
    private readonly monitoringService: PipelineMonitoringService
  ) {}

  @Post('pipeline/execute')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute CI/CD pipeline' })
  @ApiResponse({ status: 200, description: 'Pipeline executed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid pipeline configuration' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async executePipeline(@Body() config: PipelineConfig) {
    return this.pipelineService.executePipeline(config);
  }

  @Post('pipeline/rollback')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rollback deployment' })
  @ApiResponse({ status: 200, description: 'Rollback completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid rollback parameters' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async rollbackDeployment(
    @Body() body: { environment: string; targetVersion: string }
  ) {
    return this.pipelineService.rollbackDeployment(
      body.environment,
      body.targetVersion
    );
  }

  @Get('pipeline/metrics')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS, UserRole.USER)
  @ApiOperation({ summary: 'Get pipeline metrics' })
  @ApiResponse({
    status: 200,
    description: 'Pipeline metrics retrieved successfully',
  })
  async getPipelineMetrics() {
    return this.pipelineService.getPipelineMetrics();
  }

  @Get('pipeline/artifacts')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS, UserRole.USER)
  @ApiOperation({ summary: 'Get build artifacts' })
  @ApiResponse({
    status: 200,
    description: 'Build artifacts retrieved successfully',
  })
  async getBuildArtifacts() {
    return this.pipelineService.getBuildArtifacts();
  }

  @Post('artifacts/push')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Push artifact to registry' })
  @ApiResponse({ status: 200, description: 'Artifact pushed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid artifact data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async pushArtifact(
    @Body()
    body: {
      artifact: string; // base64 encoded
      metadata: {
        name: string;
        version: string;
        size: number;
        checksum: string;
        tags: string[];
        metadata: Record<string, unknown>;
      };
      registryName?: string;
    }
  ) {
    const artifactBuffer = Buffer.from(body.artifact, 'base64');
    return this.artifactService.pushArtifact(
      artifactBuffer,
      {
        ...body.metadata,
        createdAt: new Date(),
      },
      body.registryName
    );
  }

  @Post('artifacts/pull')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS, UserRole.USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pull artifact from registry' })
  @ApiResponse({ status: 200, description: 'Artifact pulled successfully' })
  @ApiResponse({ status: 404, description: 'Artifact not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async pullArtifact(
    @Body() body: { name: string; version: string; registryName?: string }
  ) {
    return this.artifactService.pullArtifact(
      body.name,
      body.version,
      body.registryName
    );
  }

  @Get('artifacts/list')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS, UserRole.USER)
  @ApiOperation({ summary: 'List artifacts in registry' })
  @ApiResponse({ status: 200, description: 'Artifacts listed successfully' })
  async listArtifacts(
    @Query('registryName') registryName?: string,
    @Query('name') name?: string,
    @Query('version') version?: string,
    @Query('tags') tags?: string
  ) {
    const filter: { name?: string; version?: string; tags?: string[] } = {};
    if (name != null && name !== '') filter.name = name;
    if (version != null && version !== '') filter.version = version;
    if (tags != null && tags !== '') filter.tags = tags.split(',');

    return this.artifactService.listArtifacts(registryName);
  }

  @Post('artifacts/delete')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete artifact from registry' })
  @ApiResponse({ status: 200, description: 'Artifact deleted successfully' })
  @ApiResponse({ status: 404, description: 'Artifact not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async deleteArtifact(
    @Body() body: { name: string; version: string; registryName?: string }
  ) {
    return this.artifactService.deleteArtifact(
      body.name,
      body.version,
      body.registryName
    );
  }

  @Post('artifacts/tag')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tag artifact' })
  @ApiResponse({ status: 200, description: 'Artifact tagged successfully' })
  @ApiResponse({ status: 404, description: 'Artifact not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async tagArtifact(
    @Body()
    body: {
      name: string;
      version: string;
      tags: string[];
      registryName?: string;
    }
  ) {
    return this.artifactService.tagArtifact(body.name, body.version, body.tags);
  }

  @Post('artifacts/cleanup')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clean up old artifacts' })
  @ApiResponse({ status: 200, description: 'Cleanup completed successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async cleanupOldArtifacts(
    @Body() body: { retentionDays?: number; registryName?: string }
  ) {
    return this.artifactService.cleanupOldArtifacts(
      body.retentionDays,
      body.registryName
    );
  }

  @Get('artifacts/registry/health')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS, UserRole.USER)
  @ApiOperation({ summary: 'Get registry health status' })
  @ApiResponse({
    status: 200,
    description: 'Registry health retrieved successfully',
  })
  async getRegistryHealth() {
    return this.artifactService.getRegistryHealth();
  }

  @Get('monitoring/metrics')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS, UserRole.USER)
  @ApiOperation({ summary: 'Get pipeline monitoring metrics' })
  @ApiResponse({
    status: 200,
    description: 'Monitoring metrics retrieved successfully',
  })
  async getMonitoringMetrics(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('environment') _environment?: string
  ) {
    const timeRange =
      from != null && to != null
        ? {
            from: new Date(from),
            to: new Date(to),
          }
        : undefined;

    return this.monitoringService.getPipelineMetrics(timeRange);
  }

  @Get('monitoring/alerts')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS, UserRole.USER)
  @ApiOperation({ summary: 'Get pipeline alerts' })
  @ApiResponse({
    status: 200,
    description: 'Pipeline alerts retrieved successfully',
  })
  async getPipelineAlerts(
    @Query('resolved') resolved?: boolean,
    @Query('severity') severity?: string,
    @Query('type') type?: string
  ) {
    return this.monitoringService.getPipelineAlerts(resolved, severity, type);
  }

  @Post('monitoring/alerts/:alertId/resolve')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve pipeline alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved successfully' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async resolveAlert(@Param('alertId') alertId: string) {
    return this.monitoringService.resolveAlert(alertId);
  }

  @Get('monitoring/events')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS, UserRole.USER)
  @ApiOperation({ summary: 'Get pipeline events' })
  @ApiResponse({
    status: 200,
    description: 'Pipeline events retrieved successfully',
  })
  async getPipelineEvents(
    @Query('buildId') buildId?: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const timeRange =
      from != null && to != null
        ? { from: new Date(from), to: new Date(to) }
        : undefined;
    return this.monitoringService.getPipelineEvents(buildId, type, timeRange);
  }

  @Get('monitoring/timeline/:buildId')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS, UserRole.USER)
  @ApiOperation({ summary: 'Get build timeline' })
  @ApiResponse({
    status: 200,
    description: 'Build timeline retrieved successfully',
  })
  async getBuildTimeline(@Param('buildId') buildId: string) {
    return this.monitoringService.getBuildTimeline(buildId);
  }

  @Get('monitoring/insights')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS, UserRole.USER)
  @ApiOperation({ summary: 'Get performance insights' })
  @ApiResponse({
    status: 200,
    description: 'Performance insights retrieved successfully',
  })
  async getPerformanceInsights(
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const timeRange =
      from != null && to != null
        ? { from: new Date(from), to: new Date(to) }
        : undefined;
    return this.monitoringService.getPerformanceInsights(timeRange);
  }
}
