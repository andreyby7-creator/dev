import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ConfigurationConfig {
  templateId: string;
  environment: string;
  variables: Record<string, unknown>;
  overwrite?: boolean;
}

export interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  type: 'infrastructure' | 'application' | 'environment' | 'security';
  version: string;
  content: Record<string, unknown>;
  variables: Array<{
    name: string;
    type: string;
    defaultValue?: unknown;
    required: boolean;
    description?: string;
  }>;
  tags?: string[];
}

export interface ConfigurationStatus {
  templateId: string;
  environment: string;
  status: 'applied' | 'pending' | 'failed' | 'outdated';
  lastApplied: Date;
  appliedBy: string;
  version: string;
  changes?: Array<{
    path: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
}

export interface ConfigurationValidation {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  warnings: Array<{
    path: string;
    message: string;
  }>;
}

@Injectable()
export class ConfigurationService {
  private readonly logger = new Logger(ConfigurationService.name);
  private configurations: Map<string, ConfigurationStatus> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.configService.get('CONFIG_ENABLED');
  }

  async getTemplates(): Promise<{
    success: boolean;
    templates?: ConfigurationTemplate[];
    error?: string;
  }> {
    try {
      this.logger.log('Getting configuration templates');

      const templates: ConfigurationTemplate[] = [
        {
          id: 'vpc-config',
          name: 'VPC Configuration',
          description: 'Standard VPC configuration for production environments',
          type: 'infrastructure',
          version: '1.2.0',
          content: {
            vpc: {
              cidr: '10.0.0.0/16',
              enableDnsHostnames: true,
              enableDnsSupport: true,
            },
            subnets: {
              public: {
                count: 2,
                cidr: '10.0.1.0/24',
                availabilityZones: ['us-east-1a', 'us-east-1b'],
              },
              private: {
                count: 2,
                cidr: '10.0.2.0/24',
                availabilityZones: ['us-east-1a', 'us-east-1b'],
              },
            },
            securityGroups: {
              web: {
                ingress: [
                  { port: 80, protocol: 'tcp', source: '0.0.0.0/0' },
                  { port: 443, protocol: 'tcp', source: '0.0.0.0/0' },
                ],
              },
              database: {
                ingress: [
                  { port: 5432, protocol: 'tcp', source: '10.0.0.0/16' },
                ],
              },
            },
          },
          variables: [
            {
              name: 'environment',
              type: 'string',
              defaultValue: 'production',
              required: true,
              description: 'Environment name',
            },
            {
              name: 'region',
              type: 'string',
              defaultValue: 'us-east-1',
              required: true,
              description: 'AWS region',
            },
          ],
          tags: ['vpc', 'networking', 'aws'],
        },
        {
          id: 'database-config',
          name: 'Database Configuration',
          description: 'PostgreSQL database configuration',
          type: 'application',
          version: '2.1.0',
          content: {
            database: {
              engine: 'postgres',
              version: '14.7',
              instanceClass: 'db.t3.medium',
              allocatedStorage: 100,
              backupRetentionPeriod: 7,
              multiAZ: true,
            },
            security: {
              encryption: true,
              sslRequired: true,
              parameterGroup: 'default.postgres14',
            },
            monitoring: {
              performanceInsights: true,
              enhancedMonitoring: true,
            },
          },
          variables: [
            {
              name: 'dbName',
              type: 'string',
              required: true,
              description: 'Database name',
            },
            {
              name: 'dbUsername',
              type: 'string',
              required: true,
              description: 'Database username',
            },
            {
              name: 'dbPassword',
              type: 'string',
              required: true,
              description: 'Database password',
            },
          ],
          tags: ['database', 'postgres', 'rds'],
        },
        {
          id: 'security-config',
          name: 'Security Configuration',
          description: 'Security policies and configurations',
          type: 'security',
          version: '1.0.0',
          content: {
            iam: {
              policies: [
                {
                  name: 'S3ReadOnlyAccess',
                  effect: 'Allow',
                  actions: ['s3:GetObject', 's3:ListBucket'],
                  resources: ['arn:aws:s3:::salespot-assets/*'],
                },
              ],
            },
            encryption: {
              kms: {
                enabled: true,
                keyRotation: true,
              },
              s3: {
                defaultEncryption: 'AES256',
              },
            },
            compliance: {
              gdpr: true,
              sox: true,
              pci: false,
            },
          },
          variables: [
            {
              name: 'complianceLevel',
              type: 'string',
              defaultValue: 'standard',
              required: false,
              description: 'Compliance level',
            },
          ],
          tags: ['security', 'iam', 'encryption', 'compliance'],
        },
      ];

      return { success: true, templates };
    } catch (error) {
      this.logger.error('Failed to get configuration templates', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async applyConfiguration(config: {
    templateId: string;
    environment: string;
    variables: Record<string, unknown>;
    dryRun?: boolean;
  }): Promise<{ success: boolean; statusId?: string; error?: string }> {
    try {
      this.logger.log('Applying configuration', {
        templateId: config.templateId,
        environment: config.environment,
        dryRun: config.dryRun,
      });

      const statusId = `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const configurationStatus: ConfigurationStatus = {
        templateId: config.templateId,
        environment: config.environment,
        status: config.dryRun === true ? 'pending' : 'applied',
        lastApplied: new Date(),
        appliedBy: 'system',
        version: '1.0.0',
      };

      this.configurations.set(statusId, configurationStatus);

      if (config.dryRun !== true) {
        // Simulate configuration application
        setTimeout(() => {
          const status = this.configurations.get(statusId);
          if (status) {
            status.status = 'applied';
            this.configurations.set(statusId, status);
          }
        }, 2000);
      }

      return { success: true, statusId };
    } catch (error) {
      this.logger.error('Failed to apply configuration', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getStatus(): Promise<{
    success: boolean;
    statuses?: ConfigurationStatus[];
    error?: string;
  }> {
    try {
      this.logger.log('Getting configuration status');

      const statuses = Array.from(this.configurations.values());

      return { success: true, statuses };
    } catch (error) {
      this.logger.error('Failed to get configuration status', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async validateConfiguration(
    template: ConfigurationTemplate,
    variables: Record<string, unknown>
  ): Promise<{
    success: boolean;
    validation?: ConfigurationValidation;
    error?: string;
  }> {
    try {
      this.logger.log('Validating configuration', { templateId: template.id });

      const errors: Array<{
        path: string;
        message: string;
        severity: 'error' | 'warning' | 'info';
      }> = [];
      const warnings: Array<{ path: string; message: string }> = [];

      // Validate required variables
      for (const variable of template.variables) {
        if (variable.required && !(variable.name in variables)) {
          errors.push({
            path: `variables.${variable.name}`,
            message: `Required variable '${variable.name}' is missing`,
            severity: 'error',
          });
        }
      }

      // Validate variable types
      for (const [name, value] of Object.entries(variables)) {
        const variableDef = template.variables.find(v => v.name === name);
        if (variableDef) {
          if (variableDef.type === 'number' && typeof value !== 'number') {
            errors.push({
              path: `variables.${name}`,
              message: `Variable '${name}' must be a number`,
              severity: 'error',
            });
          } else if (
            variableDef.type === 'string' &&
            typeof value !== 'string'
          ) {
            errors.push({
              path: `variables.${name}`,
              message: `Variable '${name}' must be a string`,
              severity: 'error',
            });
          } else if (
            variableDef.type === 'boolean' &&
            typeof value !== 'boolean'
          ) {
            errors.push({
              path: `variables.${name}`,
              message: `Variable '${name}' must be a boolean`,
              severity: 'error',
            });
          }
        }
      }

      // Add some warnings for common issues
      if (template.type === 'infrastructure' && variables.region == null) {
        warnings.push({
          path: 'variables.region',
          message: 'Region not specified, using default',
        });
      }

      const validation: ConfigurationValidation = {
        valid: errors.length === 0,
        errors,
        warnings,
      };

      return { success: true, validation };
    } catch (error) {
      this.logger.error('Failed to validate configuration', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getConfigurationHistory(templateId: string): Promise<{
    success: boolean;
    history?: Array<{
      version: string;
      appliedAt: Date;
      appliedBy: string;
      environment: string;
      changes: string[];
    }>;
    error?: string;
  }> {
    try {
      this.logger.log('Getting configuration history', { templateId });

      const history = [
        {
          version: '1.2.0',
          appliedAt: new Date('2024-01-15T10:30:00Z'),
          appliedBy: 'admin',
          environment: 'production',
          changes: ['Updated VPC CIDR', 'Added new security group'],
        },
        {
          version: '1.1.0',
          appliedAt: new Date('2024-01-10T14:20:00Z'),
          appliedBy: 'devops',
          environment: 'production',
          changes: ['Updated subnet configuration'],
        },
        {
          version: '1.0.0',
          appliedAt: new Date('2024-01-05T09:00:00Z'),
          appliedBy: 'admin',
          environment: 'production',
          changes: ['Initial configuration'],
        },
      ];

      return { success: true, history };
    } catch (error) {
      this.logger.error('Failed to get configuration history', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async rollbackConfiguration(
    templateId: string,
    version: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.log('Rolling back configuration', { templateId, version });

      // Simulate rollback
      await new Promise(resolve => setTimeout(resolve, 1500));

      this.logger.log('Configuration rolled back successfully');
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to rollback configuration', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
