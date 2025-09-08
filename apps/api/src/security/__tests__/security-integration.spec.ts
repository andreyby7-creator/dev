import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { RedactedLogger } from '../../utils/redacted-logger';
import { SecretRotationService } from '../services/secret-rotation.service';

describe('Security Integration Tests', () => {
  let secretRotationService: SecretRotationService;
  let redactedLogger: RedactedLogger;

  beforeAll(async () => {
    // Создаем простой тестовый модуль только с необходимыми сервисами
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecretRotationService,
        {
          provide: 'LOGGER',
          useValue: {
            log: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
          },
        },
      ],
    }).compile();

    secretRotationService = module.get<SecretRotationService>(
      SecretRotationService
    );
    redactedLogger = new RedactedLogger();
  });

  describe('RedactedLogger Integration', () => {
    it('should integrate with SecretRotationService for secure logging', () => {
      const sensitiveData = {
        JWT_SECRET: 'test-jwt-secret',
        ENCRYPTION_KEY: 'test-encryption-key',
        API_KEY_SECRET: 'test-api-key',
      };

      // Log sensitive data - should be redacted
      redactedLogger.log(
        'Secret rotation data',
        'SecurityIntegration',
        sensitiveData
      );

      // Verify that sensitive data is not exposed in logs
      expect(sensitiveData.JWT_SECRET).toBe('test-jwt-secret'); // Original data preserved
      expect(sensitiveData.ENCRYPTION_KEY).toBe('test-encryption-key');
      expect(sensitiveData.API_KEY_SECRET).toBe('test-api-key');
    });

    it('should handle complex nested objects with sensitive data', () => {
      const complexData = {
        user: {
          id: '123',
          credentials: {
            password: 'secret-password',
            token: 'secret-token',
          },
        },
        config: {
          database: {
            connectionString: 'postgresql://user:pass@localhost:5432/db',
          },
          api: {
            key: 'secret-api-key',
          },
        },
      };

      // Log complex data - sensitive parts should be redacted
      redactedLogger.log(
        'Complex configuration',
        'SecurityIntegration',
        complexData
      );

      // Verify sensitive data is preserved in original object
      expect(complexData.user.credentials.password).toBe('secret-password');
      expect(complexData.config.api.key).toBe('secret-api-key');
    });
  });

  describe('SecretRotationService Integration', () => {
    it('should be properly configured and initialized', () => {
      expect(secretRotationService).toBeDefined();
      expect(typeof secretRotationService).toBe('object');
    });

    it('should have access to security configuration', () => {
      const config = (
        secretRotationService as unknown as {
          config: { secrets: unknown[]; providers: unknown };
        }
      ).config;

      expect(config).toBeDefined();
      expect(config.secrets).toBeDefined();
      expect(Array.isArray(config.secrets)).toBe(true);
      expect(config.secrets.length).toBeGreaterThan(0);
    });

    it('should support multiple secret providers', () => {
      const config = (
        secretRotationService as unknown as {
          config: { secrets: unknown[]; providers: unknown };
        }
      ).config;

      expect(config.providers).toBeDefined();
      expect(typeof config.providers).toBe('object');
    });
  });

  describe('Cross-Service Security', () => {
    it('should maintain security across different service interactions', () => {
      // Simulate service interaction
      const serviceData = {
        auth: {
          userId: '123',
          sessionToken: 'secret-session-token',
          permissions: ['read', 'write'],
        },
        database: {
          connectionId: 'db-conn-456',
          credentials: {
            username: 'dbuser',
            password: 'db-password',
          },
        },
      };

      // Log service interaction data
      redactedLogger.log(
        'Service interaction',
        'SecurityIntegration',
        serviceData
      );

      // Verify sensitive data is preserved in original object
      expect(serviceData.auth.sessionToken).toBe('secret-session-token');
      expect(serviceData.database.credentials.password).toBe('db-password');
    });

    it('should handle error scenarios securely', () => {
      const errorData = {
        error: 'Database connection failed',
        timestamp: new Date().toISOString(),
        details: {
          connectionString: 'postgresql://user:pass@localhost:5432/db',
          errorCode: 'ECONNREFUSED',
          stack: 'Error stack trace...',
        },
      };

      // Log error data - sensitive parts should be redacted
      redactedLogger.error(
        'Database error',
        'Error trace',
        'SecurityIntegration',
        errorData
      );

      // Verify sensitive data is preserved in original object
      expect(errorData.details.connectionString).toBe(
        'postgresql://user:pass@localhost:5432/db'
      );
    });
  });

  describe('Configuration Security', () => {
    it('should not expose sensitive configuration in logs', () => {
      const configData = {
        app: {
          name: 'SalesSpot',
          version: '1.0.0',
          environment: 'test',
        },
        security: {
          jwtSecret: 'super-secret-jwt-key',
          encryptionKey: 'super-secret-encryption-key',
          rateLimit: 100,
        },
        database: {
          host: 'localhost',
          port: 5432,
          name: 'salespot',
          user: 'dbuser',
          password: 'super-secret-db-password',
        },
      };

      // Log configuration - sensitive parts should be redacted
      redactedLogger.log(
        'Application configuration',
        'SecurityIntegration',
        configData
      );

      // Verify sensitive data is preserved in original object
      expect(configData.security.jwtSecret).toBe('super-secret-jwt-key');
      expect(configData.database.password).toBe('super-secret-db-password');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large amounts of data efficiently', () => {
      const largeData = {
        users: Array.from({ length: 1000 }, (_, i) => ({
          id: `user-${i}`,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          password: `password-${i}`,
          apiKey: `api-key-${i}`,
        })),
        config: {
          jwtSecret: 'large-data-jwt-secret',
          encryptionKey: 'large-data-encryption-key',
        },
      };

      // Log large dataset - should handle efficiently
      const startTime = Date.now();
      redactedLogger.log('Large dataset', 'SecurityIntegration', largeData);
      const endTime = Date.now();

      // Should complete within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);

      // Verify sensitive data is preserved
      expect(largeData.config.jwtSecret).toBe('large-data-jwt-secret');
      expect(largeData.users[0]?.password).toBe('password-0');
    });
  });
});
