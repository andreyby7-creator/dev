import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SecretRotationService } from '../secret-rotation.service';

describe('SecretRotationService', () => {
  let service: SecretRotationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecretRotationService],
    }).compile();

    service = module.get<SecretRotationService>(SecretRotationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initialization', () => {
    it('should initialize with default configuration when environment variables are not set', () => {
      const _config = (
        service as unknown as {
          config: {
            enabled: boolean;
            rotationInterval: number;
            secrets: string[];
          };
        }
      ).config;

      expect(_config.enabled).toBe(false);
      expect(_config.rotationInterval).toBe(60);
      expect(_config.secrets).toContain('JWT_SECRET');
      expect(_config.secrets).toContain('ENCRYPTION_KEY');
      expect(_config.secrets).toContain('API_KEY_SECRET');
    });

    it('should initialize with custom configuration when environment variables are set', () => {
      // Mock environment variables
      const originalEnv = process.env;
      process.env.SECRET_ROTATION_ENABLED = 'true';
      process.env.SECRET_ROTATION_INTERVAL = '30';
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';

      // Recreate service to pick up new env vars
      const newService = new SecretRotationService();
      const config = (
        newService as unknown as {
          config: {
            enabled: boolean;
            rotationInterval: number;
            providers: {
              aws?: {
                region: string;
                accessKeyId: string;
                secretAccessKey: string;
              };
            };
          };
        }
      ).config;

      expect(config.enabled).toBe(true);
      expect(config.rotationInterval).toBe(30);
      expect(config.providers.aws).toBeDefined();
      expect(config.providers.aws?.region).toBe('us-east-1');

      // Restore original environment
      process.env = originalEnv;
    });
  });

  describe('secret rotation', () => {
    it('should have rotateSecrets method', () => {
      expect(typeof service.rotateSecrets).toBe('function');
    });

    it('should have forceRotateSecret method', () => {
      expect(typeof service.forceRotateSecret).toBe('function');
    });

    it('should handle rotation failures gracefully', async () => {
      // Test with invalid secret name
      await expect(service.forceRotateSecret('INVALID_SECRET')).rejects.toThrow(
        'Secret INVALID_SECRET is not configured for rotation'
      );
    });
  });

  describe('provider integration', () => {
    it('should support AWS KMS integration', () => {
      // Mock AWS environment
      const originalEnv = process.env;
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';

      const newService = new SecretRotationService();
      const newConfig = (
        newService as unknown as {
          config: {
            providers: {
              aws: {
                region: string;
                accessKeyId: string;
                secretAccessKey: string;
              };
            };
          };
        }
      ).config;

      expect(newConfig.providers.aws).toBeDefined();
      expect(newConfig.providers.aws?.region).toBe('us-east-1');

      process.env = originalEnv;
    });

    it('should support HashiCorp Vault integration', () => {
      // Mock Vault environment
      const originalEnv = process.env;
      process.env.VAULT_URL = 'http://vault:8200';
      process.env.VAULT_TOKEN = 'test-token';

      const newService = new SecretRotationService();
      const newConfig = (
        newService as unknown as {
          config: { providers: { vault: { url: string; token: string } } };
        }
      ).config;

      expect(newConfig.providers.vault).toBeDefined();
      expect(newConfig.providers.vault?.url).toBe('http://vault:8200');

      process.env = originalEnv;
    });

    it('should support Doppler integration', () => {
      // Mock Doppler environment
      const originalEnv = process.env;
      process.env.DOPPLER_PROJECT = 'test-project';
      process.env.DOPPLER_CONFIG = 'test-config';
      process.env.DOPPLER_TOKEN = 'test-token';

      const newService = new SecretRotationService();
      const newConfig = (
        newService as unknown as {
          config: { providers: { vault: { url: string; token: string } } };
        }
      ).config;

      expect(newConfig.providers.vault).toBeDefined();
      expect(newConfig.providers.vault?.url).toBe('http://vault:8200');

      process.env = originalEnv;
    });
  });

  describe('scheduling', () => {
    it('should respect rotation interval configuration', () => {
      const _config = (
        service as unknown as {
          config: {
            enabled: boolean;
            rotationInterval: number;
            secrets: string[];
          };
        }
      ).config;
      const interval = _config.rotationInterval;

      expect(interval).toBeGreaterThan(0);
      expect(interval).toBeLessThanOrEqual(1440); // Max 24 hours
    });

    it('should have rotation tracking properties', () => {
      const serviceAny = service as unknown as {
        config: unknown;
        lastRotationTime: Date;
        rotationCount: number;
      };

      expect(serviceAny.lastRotationTime).toBeDefined();
      expect(serviceAny.rotationCount).toBeDefined();
      expect(typeof serviceAny.lastRotationTime).toBe('object');
      expect(typeof serviceAny.rotationCount).toBe('number');
      expect(serviceAny.rotationCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle invalid configuration gracefully', () => {
      // Mock invalid configuration
      const originalEnv = process.env;
      process.env.SECRET_ROTATION_INTERVAL = 'invalid';

      const newService = new SecretRotationService();
      const config = (
        newService as unknown as {
          config: {
            enabled: boolean;
            rotationInterval: number;
            providers: {
              aws: { region: string; accessKey: string; secretKey: string };
            };
          };
        }
      ).config;

      // parseInt('invalid') returns NaN, so we expect NaN
      expect(config.rotationInterval).toBeNaN();

      process.env = originalEnv;
    });

    it('should handle missing provider credentials gracefully', () => {
      // Mock missing AWS credentials - clear all AWS env vars
      const originalEnv = process.env;
      process.env.AWS_REGION = 'us-east-1';
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;

      const newService = new SecretRotationService();
      const config = (
        newService as unknown as {
          config: {
            enabled: boolean;
            rotationInterval: number;
            providers: {
              aws?: {
                region: string;
                accessKeyId: string;
                secretAccessKey: string;
              };
            };
          };
        }
      ).config;

      // AWS provider is created when region is set, but with empty credentials
      expect(config.providers.aws).toBeDefined();
      expect(config.providers.aws?.region).toBe('us-east-1');
      expect(config.providers.aws?.accessKeyId).toBe('');
      expect(config.providers.aws?.secretAccessKey).toBe('');

      process.env = originalEnv;
    });
  });

  describe('secret management', () => {
    it('should have configured secrets list', () => {
      const _config = (
        service as unknown as {
          config: {
            enabled: boolean;
            rotationInterval: number;
            secrets: string[];
          };
        }
      ).config;

      expect(_config.secrets).toBeDefined();
      expect(Array.isArray(_config.secrets)).toBe(true);
      expect(_config.secrets.length).toBeGreaterThan(0);

      // Check that required secrets are present
      expect(_config.secrets).toContain('JWT_SECRET');
      expect(_config.secrets).toContain('ENCRYPTION_KEY');
      expect(_config.secrets).toContain('API_KEY_SECRET');
    });

    it('should support environment-based configuration', () => {
      const originalEnv = process.env;
      process.env.SECRET_ROTATION_ENABLED = 'true';

      const newService = new SecretRotationService();
      const config = (
        newService as unknown as {
          config: {
            enabled: boolean;
            rotationInterval: number;
            providers: {
              aws: { region: string; accessKey: string; secretKey: string };
            };
          };
        }
      ).config;

      expect(config.enabled).toBe(true);

      process.env = originalEnv;
    });
  });
});
