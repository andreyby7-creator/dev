import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CentralizedConfigService } from './centralized-config.service';
import { EnvironmentConfigService } from './environment-config.service';
import { SecretsManagerService } from './secrets-manager.service';

@ApiTags('Configuration Management')
@Controller('config')
export class ConfigurationController {
  constructor(
    private readonly centralizedConfigService: CentralizedConfigService,
    private readonly environmentConfigService: EnvironmentConfigService,
    private readonly secretsManagerService: SecretsManagerService
  ) {}

  @Get('all')
  @ApiOperation({ summary: 'Get all configurations' })
  @ApiQuery({
    name: 'service',
    required: false,
    description: 'Filter by service',
  })
  @ApiQuery({
    name: 'environment',
    required: false,
    description: 'Filter by environment',
  })
  @ApiResponse({
    status: 200,
    description: 'Configurations retrieved successfully',
  })
  async getAllConfigs(
    @Query('service') service?: string,
    @Query('environment') environment?: string
  ) {
    const configs = await this.centralizedConfigService.getAllConfigs(
      service,
      environment
    );
    return {
      success: true,
      data: configs,
      count: configs.length,
    };
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Get configuration by key' })
  @ApiParam({ name: 'key', description: 'Configuration key' })
  @ApiQuery({
    name: 'environment',
    required: false,
    description: 'Environment filter',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async getConfig(
    @Param('key') key: string,
    @Query('environment') environment?: string
  ) {
    const value = await this.centralizedConfigService.getConfig(
      key,
      environment
    );

    if (value === undefined) {
      return {
        success: false,
        error: 'Configuration not found',
        statusCode: HttpStatus.NOT_FOUND,
      };
    }

    return {
      success: true,
      data: { key, value },
    };
  }

  @Post('key/:key')
  @ApiOperation({ summary: 'Set configuration value' })
  @ApiParam({ name: 'key', description: 'Configuration key' })
  @ApiResponse({ status: 200, description: 'Configuration set successfully' })
  async setConfig(
    @Param('key') key: string,
    @Body()
    body: {
      value: unknown;
      environment: string;
      _service: string;
      changedBy: string;
    }
  ) {
    await this.centralizedConfigService.setConfig(
      key,
      body.value,
      body.environment,
      body._service,
      body.changedBy
    );

    return {
      success: true,
      message: 'Configuration set successfully',
    };
  }

  @Get('environments')
  @ApiOperation({ summary: 'Get all environments' })
  @ApiResponse({
    status: 200,
    description: 'Environments retrieved successfully',
  })
  async getEnvironments() {
    const environments =
      await this.environmentConfigService.getAllEnvironments();
    return {
      success: true,
      data: environments,
    };
  }

  @Get('environments/:name')
  @ApiOperation({ summary: 'Get environment configuration' })
  @ApiParam({ name: 'name', description: 'Environment name' })
  @ApiResponse({
    status: 200,
    description: 'Environment retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Environment not found' })
  async getEnvironment(@Param('name') name: string) {
    const environment =
      await this.environmentConfigService.getEnvironment(name);

    if (environment == null) {
      return {
        success: false,
        error: 'Environment not found',
        statusCode: HttpStatus.NOT_FOUND,
      };
    }

    return {
      success: true,
      data: environment,
    };
  }

  @Post('environments/:name/switch')
  @ApiOperation({ summary: 'Switch to environment' })
  @ApiParam({ name: 'name', description: 'Environment name' })
  @ApiResponse({
    status: 200,
    description: 'Environment switched successfully',
  })
  async switchEnvironment(@Param('name') name: string) {
    await this.environmentConfigService.switchEnvironment(name);
    return {
      success: true,
      message: `Switched to environment: ${name}`,
    };
  }

  @Get('secrets')
  @ApiOperation({ summary: 'Get all secrets' })
  @ApiQuery({
    name: 'service',
    required: false,
    description: 'Filter by service',
  })
  @ApiQuery({
    name: 'environment',
    required: false,
    description: 'Filter by environment',
  })
  @ApiResponse({ status: 200, description: 'Secrets retrieved successfully' })
  async getSecrets(
    @Query('service') service?: string,
    @Query('environment') environment?: string
  ) {
    const secrets = await this.secretsManagerService.getAllSecrets(
      service,
      environment
    );

    // Не возвращаем значения секретов в списке
    const safeSecrets = secrets.map(secret => ({
      key: secret.key,
      _service: secret._service,
      environment: secret.environment,
      encrypted: secret.encrypted,
      lastRotated: secret.lastRotated,
      expiresAt: secret.expiresAt,
      tags: secret.tags,
    }));

    return {
      success: true,
      data: safeSecrets,
      count: safeSecrets.length,
    };
  }

  @Get('secrets/:key')
  @ApiOperation({ summary: 'Get secret value' })
  @ApiParam({ name: 'key', description: 'Secret key' })
  @ApiQuery({
    name: 'environment',
    required: false,
    description: 'Environment filter',
  })
  @ApiResponse({ status: 200, description: 'Secret retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Secret not found' })
  async getSecret(
    @Param('key') key: string,
    @Query('environment') environment?: string
  ) {
    const value = await this.secretsManagerService.getSecret(key, environment);

    if (value == null) {
      return {
        success: false,
        error: 'Secret not found',
        statusCode: HttpStatus.NOT_FOUND,
      };
    }

    return {
      success: true,
      data: { key, value: '***' }, // Маскируем значение
    };
  }

  @Post('secrets/:key')
  @ApiOperation({ summary: 'Set secret value' })
  @ApiParam({ name: 'key', description: 'Secret key' })
  @ApiResponse({ status: 200, description: 'Secret set successfully' })
  async setSecret(
    @Param('key') key: string,
    @Body()
    body: {
      value: string;
      _service: string;
      environment: string;
      tags?: Record<string, string>;
      expiresAt?: string;
    }
  ) {
    const expiresAt =
      body.expiresAt != null && body.expiresAt !== ''
        ? new Date(body.expiresAt)
        : undefined;

    await this.secretsManagerService.setSecret(
      key,
      body.value,
      body._service,
      body.environment,
      body.tags ?? {},
      expiresAt
    );

    return {
      success: true,
      message: 'Secret set successfully',
    };
  }

  @Post('secrets/:key/rotate')
  @ApiOperation({ summary: 'Rotate secret' })
  @ApiParam({ name: 'key', description: 'Secret key' })
  @ApiResponse({ status: 200, description: 'Secret rotated successfully' })
  async rotateSecret(
    @Param('key') key: string,
    @Body()
    body: {
      newValue: string;
      _service: string;
      environment: string;
      reason: string;
      rotatedBy: string;
    }
  ) {
    await this.secretsManagerService.rotateSecret(
      key,
      body.newValue,
      body._service,
      body.environment,
      body.reason,
      body.rotatedBy
    );

    return {
      success: true,
      message: 'Secret rotated successfully',
    };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get configuration change history' })
  @ApiQuery({
    name: 'service',
    required: false,
    description: 'Filter by service',
  })
  @ApiQuery({ name: 'key', required: false, description: 'Filter by key' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  async getChangeHistory(
    @Query('service') service?: string,
    @Query('key') key?: string
  ) {
    const history = await this.centralizedConfigService.getChangeHistory(
      service,
      key
    );
    return {
      success: true,
      data: history,
      count: history.length,
    };
  }

  @Get('backups')
  @ApiOperation({ summary: 'Get configuration backups' })
  @ApiQuery({
    name: 'service',
    required: false,
    description: 'Filter by service',
  })
  @ApiQuery({
    name: 'environment',
    required: false,
    description: 'Filter by environment',
  })
  @ApiResponse({ status: 200, description: 'Backups retrieved successfully' })
  async getBackups(
    @Query('service') service?: string,
    @Query('environment') environment?: string
  ) {
    const backups = await this.centralizedConfigService.getBackups(
      service,
      environment
    );
    return {
      success: true,
      data: backups,
      count: backups.length,
    };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export configurations' })
  @ApiQuery({
    name: 'service',
    required: false,
    description: 'Filter by service',
  })
  @ApiQuery({
    name: 'environment',
    required: false,
    description: 'Filter by environment',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Export format (json, env, yaml)',
    enum: ['json', 'env', 'yaml'],
  })
  @ApiResponse({
    status: 200,
    description: 'Configurations exported successfully',
  })
  async exportConfigs(
    @Query('service') service?: string,
    @Query('environment') environment?: string,
    @Query('format') format: 'json' | 'env' | 'yaml' = 'json'
  ) {
    const exported = await this.centralizedConfigService.exportConfig(
      service ?? 'all',
      environment ?? 'all',
      format
    );

    return {
      success: true,
      data: exported,
      format,
      service: service ?? 'all',
      environment: environment ?? 'all',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get configuration service health' })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
  })
  async getHealth() {
    const activeEnvironment =
      await this.environmentConfigService.getActiveEnvironment();
    const expiringSecrets =
      await this.secretsManagerService.getExpiringSecrets(30);

    return {
      success: true,
      data: {
        status: 'healthy',
        activeEnvironment: activeEnvironment?.name ?? 'unknown',
        totalConfigs: (await this.centralizedConfigService.getAllConfigs())
          .length,
        totalSecrets: (await this.secretsManagerService.getAllSecrets()).length,
        expiringSecrets: expiringSecrets.length,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
