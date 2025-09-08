import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CentralizedConfigService } from './centralized-config.service';
import { EnvironmentConfigService } from './environment-config.service';
import { SecretsManagerService } from './secrets-manager.service';
import { ConfigurationController } from './configuration.controller';

@Global()
@Module({
  imports: [EventEmitterModule],
  providers: [
    CentralizedConfigService,
    EnvironmentConfigService,
    SecretsManagerService,
  ],
  controllers: [ConfigurationController],
  exports: [
    CentralizedConfigService,
    EnvironmentConfigService,
    SecretsManagerService,
  ],
})
export class ConfigurationModule {}
