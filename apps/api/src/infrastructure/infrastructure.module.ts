import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { InfrastructureController } from './controllers/infrastructure.controller';
import { TerraformService } from './services/terraform.service';
import { AnsibleService } from './services/ansible.service';
import { KubernetesService } from './services/kubernetes.service';
import { DockerService } from './services/docker.service';
import { CloudFormationService } from './services/cloudformation.service';
import { CloudResourceService } from './services/cloud-resource.service';
import { ConfigurationService } from './services/configuration.service';
import { DeploymentService } from './services/deployment.service';
import { GitOpsService } from './services/gitops.service';
import { LocalCloudService } from './services/local-cloud.service';
import { BackupService } from './services/backup.service';

@Module({
  imports: [ConfigModule, JwtModule],
  controllers: [InfrastructureController],
  providers: [
    TerraformService,
    AnsibleService,
    KubernetesService,
    DockerService,
    CloudFormationService,
    CloudResourceService,
    ConfigurationService,
    DeploymentService,
    GitOpsService,
    LocalCloudService,
    BackupService,
  ],
  exports: [
    TerraformService,
    AnsibleService,
    KubernetesService,
    DockerService,
    CloudFormationService,
    CloudResourceService,
    ConfigurationService,
    DeploymentService,
    GitOpsService,
    LocalCloudService,
    BackupService,
  ],
})
export class InfrastructureModule {}
