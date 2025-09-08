import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../types/roles';
import { AnsibleService } from '../services/ansible.service';
import { BackupService } from '../services/backup.service';
import type { BackupConfig, RestoreConfig } from '../services/backup.service';
import { CloudResourceService } from '../services/cloud-resource.service';
import { CloudFormationService } from '../services/cloudformation.service';
import { ConfigurationService } from '../services/configuration.service';
import { DeploymentService } from '../services/deployment.service';
import { DockerService } from '../services/docker.service';
import { GitOpsService } from '../services/gitops.service';
import { KubernetesService } from '../services/kubernetes.service';
import { LocalCloudService } from '../services/local-cloud.service';
import { TerraformService } from '../services/terraform.service';

// Импортируем типы для использования в декораторах
import type { TerraformConfig } from '../services/terraform.service';
import type { AnsiblePlaybook } from '../services/ansible.service';
import type { KubernetesDeployment } from '../services/kubernetes.service';
import type {
  DockerBuildConfig,
  DockerPushConfig,
} from '../services/docker.service';
import type { CloudFormationStack } from '../services/cloudformation.service';
import type { CloudResourceConfig } from '../services/cloud-resource.service';
import type { ConfigurationConfig } from '../services/configuration.service';
import type { DeploymentConfig } from '../services/deployment.service';
import type { GitOpsSyncConfig } from '../services/gitops.service';
import type { LocalCloudResourceConfig } from '../services/local-cloud.service';

@Controller('infrastructure')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InfrastructureController {
  constructor(
    private readonly terraformService: TerraformService,
    private readonly ansibleService: AnsibleService,
    private readonly kubernetesService: KubernetesService,
    private readonly dockerService: DockerService,
    private readonly cloudFormationService: CloudFormationService,
    private readonly cloudResourceService: CloudResourceService,
    private readonly configurationService: ConfigurationService,
    private readonly deploymentService: DeploymentService,
    private readonly gitOpsService: GitOpsService,
    private readonly localCloudService: LocalCloudService,
    private readonly backupService: BackupService
  ) {}

  // Terraform endpoints
  @Get('terraform/state')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getTerraformState() {
    return this.terraformService.getState();
  }

  @Post('terraform/plan')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async planTerraform(@Body() config: TerraformConfig) {
    return this.terraformService.plan(config);
  }

  @Post('terraform/apply')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async applyTerraform(@Body() config: TerraformConfig) {
    return this.terraformService.apply(config);
  }

  @Post('terraform/destroy')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async destroyTerraform(@Body() config: TerraformConfig) {
    return this.terraformService.destroy(config);
  }

  // Ansible endpoints
  @Get('ansible/playbooks')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getPlaybooks() {
    return this.ansibleService.getPlaybooks();
  }

  @Post('ansible/execute')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async executePlaybook(@Body() playbook: AnsiblePlaybook) {
    return this.ansibleService.executePlaybook(playbook);
  }

  @Get('ansible/inventory')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getInventory() {
    return this.ansibleService.getInventory();
  }

  // Kubernetes endpoints
  @Get('kubernetes/clusters')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getClusters() {
    return this.kubernetesService.getClusters();
  }

  @Post('kubernetes/deploy')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async deployToKubernetes(@Body() deployment: KubernetesDeployment) {
    return this.kubernetesService.deploy(deployment);
  }

  @Get('kubernetes/pods')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getPods(@Query('namespace') namespace?: string) {
    return this.kubernetesService.getPods(namespace);
  }

  @Get('kubernetes/services')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getServices(@Query('namespace') namespace?: string) {
    return this.kubernetesService.getServices(namespace);
  }

  // Docker endpoints
  @Get('docker/images')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getImages() {
    return this.dockerService.getImages();
  }

  @Post('docker/build')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async buildImage(@Body() buildConfig: DockerBuildConfig) {
    return this.dockerService.buildImage(buildConfig);
  }

  @Post('docker/push')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async pushImage(@Body() pushConfig: DockerPushConfig) {
    return this.dockerService.pushImage(pushConfig);
  }

  @Get('docker/containers')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getContainers() {
    return this.dockerService.getContainers();
  }

  // CloudFormation endpoints
  @Get('cloudformation/stacks')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getStacks() {
    return this.cloudFormationService.getStacks();
  }

  @Post('cloudformation/create')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async createStack(@Body() stackConfig: CloudFormationStack) {
    return this.cloudFormationService.createStack(stackConfig);
  }

  @Put('cloudformation/update/:stackName')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async updateStack(
    @Param('stackName') stackName: string,
    @Body() stackConfig: CloudFormationStack
  ) {
    return this.cloudFormationService.updateStack(stackName, stackConfig);
  }

  @Delete('cloudformation/delete/:stackName')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async deleteStack(@Param('stackName') stackName: string) {
    return this.cloudFormationService.deleteStack(stackName);
  }

  // Cloud Resources endpoints
  @Get('cloud/resources')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getCloudResources(@Query('provider') provider?: string) {
    return this.cloudResourceService.getResources(provider);
  }

  @Post('cloud/provision')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async provisionResource(@Body() resourceConfig: CloudResourceConfig) {
    return this.cloudResourceService.provisionResource(resourceConfig);
  }

  @Delete('cloud/deprovision/:resourceId')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async deprovisionResource(@Param('resourceId') resourceId: string) {
    return this.cloudResourceService.deprovisionResource(resourceId);
  }

  // Configuration Management endpoints
  @Get('configuration/templates')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getTemplates() {
    return this.configurationService.getTemplates();
  }

  @Post('configuration/apply')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async applyConfiguration(@Body() config: ConfigurationConfig) {
    return this.configurationService.applyConfiguration(config);
  }

  @Get('configuration/status')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getConfigurationStatus() {
    return this.configurationService.getStatus();
  }

  // Deployment endpoints
  @Get('deployment/strategies')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getDeploymentStrategies() {
    return this.deploymentService.getStrategies();
  }

  @Post('deployment/execute')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async executeDeployment(@Body() deployment: DeploymentConfig) {
    return this.deploymentService.executeDeployment(deployment);
  }

  @Get('deployment/history')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getDeploymentHistory() {
    return this.deploymentService.getHistory();
  }

  // GitOps endpoints
  @Get('gitops/repositories')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getRepositories() {
    return this.gitOpsService.getRepositories();
  }

  @Post('gitops/sync')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async syncRepository(@Body() syncConfig: GitOpsSyncConfig) {
    return this.gitOpsService.syncRepository(syncConfig);
  }

  @Get('gitops/status')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getGitOpsStatus() {
    return this.gitOpsService.getStatus();
  }

  // Local Cloud endpoints
  @Get('local-cloud/providers')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getLocalProviders() {
    return this.localCloudService.getProviders();
  }

  @Post('local-cloud/provision')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async provisionLocalResource(
    @Body() resourceConfig: LocalCloudResourceConfig
  ) {
    return this.localCloudService.provisionResource(resourceConfig);
  }

  @Get('local-cloud/compliance')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getComplianceStatus() {
    return this.localCloudService.getComplianceStatus();
  }

  // Backup endpoints
  @Get('backup/strategies')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getBackupStrategies() {
    return this.backupService.getStrategies();
  }

  @Post('backup/execute')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async executeBackup(@Body() backupConfig: BackupConfig) {
    return this.backupService.executeBackup(backupConfig);
  }

  @Get('backup/status')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getBackupStatus() {
    return this.backupService.getStatus();
  }

  @Post('backup/restore')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async restoreBackup(@Body() restoreConfig: RestoreConfig) {
    return this.backupService.restoreBackup(restoreConfig);
  }
}
