import { vi } from 'vitest';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { KmsIntegrationService } from './kms-integration.service';

describe('KmsIntegrationService', () => {
  let service: KmsIntegrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KmsIntegrationService],
    }).compile();

    service = module.get<KmsIntegrationService>(KmsIntegrationService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with available providers', () => {
      const providers = service.getAvailableProviders();
      expect(Array.isArray(providers)).toBe(true);
    });
  });

  describe('key management', () => {
    it('should create a new key', async () => {
      const keyData = {
        name: 'test-key',
        provider: 'aws',
        algorithm: 'AES256',
        keySize: 256,
      };

      const key = await service.createKey(keyData);
      expect(key).toBeDefined();
      expect(key.name).toBe(keyData.name);
      expect(key.provider).toBe(keyData.provider);
      expect(key.enabled).toBe(true);
    });

    it('should list all keys', async () => {
      const keys = await service.listKeys();
      expect(Array.isArray(keys)).toBe(true);
    });

    it('should get key by ID', async () => {
      const keyData = {
        name: 'test-key-get',
        provider: 'aws',
        algorithm: 'AES256',
        keySize: 256,
      };

      const createdKey = await service.createKey(keyData);
      const retrievedKey = await service.getKey(createdKey.id);

      expect(retrievedKey).toBeDefined();
      expect(retrievedKey?.id).toBe(createdKey.id);
    });

    it('should update key', async () => {
      const keyData = {
        name: 'test-key-update',
        provider: 'aws',
        algorithm: 'AES256',
        keySize: 256,
      };

      const key = await service.createKey(keyData);
      const updatedKey = await service.updateKey(key.id, {
        name: 'updated-key',
      });

      expect(updatedKey.name).toBe('updated-key');
    });

    it('should delete key', async () => {
      const keyData = {
        name: 'test-key-delete',
        provider: 'aws',
        algorithm: 'AES256',
        keySize: 256,
      };

      const key = await service.createKey(keyData);
      await service.deleteKey(key.id);

      const deletedKey = await service.getKey(key.id);
      expect(deletedKey).toBeNull();
    });
  });

  describe('encryption operations', () => {
    it('should encrypt data', async () => {
      const keyData = {
        name: 'test-encrypt-key',
        provider: 'aws',
        algorithm: 'AES256',
        keySize: 256,
      };

      const key = await service.createKey(keyData);
      const plaintext = 'sensitive data';

      const encrypted = await service.encrypt(key.id, plaintext);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
    });

    it('should decrypt data', async () => {
      const keyData = {
        name: 'test-decrypt-key',
        provider: 'aws',
        algorithm: 'AES256',
        keySize: 256,
      };

      const key = await service.createKey(keyData);
      const plaintext = 'sensitive data';

      const encrypted = await service.encrypt(key.id, plaintext);
      const decrypted = await service.decrypt(key.id, encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('signing operations', () => {
    it('should sign data', async () => {
      const keyData = {
        name: 'test-sign-key',
        provider: 'aws',
        algorithm: 'RSA',
        keySize: 2048,
      };

      const key = await service.createKey(keyData);
      const data = 'data to sign';

      const signature = await service.sign(key.id, data);
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
    });

    it('should verify signature', async () => {
      const keyData = {
        name: 'test-verify-key',
        provider: 'aws',
        algorithm: 'RSA',
        keySize: 2048,
      };

      const key = await service.createKey(keyData);
      const data = 'data to verify';

      const signature = await service.sign(key.id, data);
      const isValid = await service.verify(key.id, data, signature);

      expect(isValid).toBe(true);
    });
  });

  describe('key rotation', () => {
    it('should rotate key', async () => {
      const keyData = {
        name: 'test-rotate-key',
        provider: 'aws',
        algorithm: 'AES256',
        keySize: 256,
      };

      const key = await service.createKey(keyData);
      const rotatedKey = await service.rotateKey(key.id);

      expect(rotatedKey).toBeDefined();
      expect(rotatedKey.id).not.toBe(key.id);
      expect(rotatedKey.name).toBe(key.name);
    });
  });

  describe('operations history', () => {
    it('should track operations', async () => {
      const keyData = {
        name: 'test-operations-key',
        provider: 'aws',
        algorithm: 'AES256',
        keySize: 256,
      };

      const key = await service.createKey(keyData);
      await service.encrypt(key.id, 'test data');

      const operations = await service.getOperationsHistory();
      expect(Array.isArray(operations)).toBe(true);
      expect(operations.length).toBeGreaterThan(0);
    });

    it('should get operations by key', async () => {
      const keyData = {
        name: 'test-key-operations',
        provider: 'aws',
        algorithm: 'AES256',
        keySize: 256,
      };

      const key = await service.createKey(keyData);
      await service.encrypt(key.id, 'test data');

      const operations = await service.getOperationsByKey(key.id);
      expect(Array.isArray(operations)).toBe(true);
      expect(operations.length).toBeGreaterThan(0);
    });
  });

  describe('health check', () => {
    it('should check KMS health', async () => {
      const health = await service.checkHealth();
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(health.providers).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle invalid key ID', async () => {
      const result = await service.getKey('invalid-id');
      expect(result).toBeNull();
    });

    it('should handle encryption with invalid key', async () => {
      await expect(service.encrypt('invalid-id', 'data')).rejects.toThrow();
    });

    it('should handle decryption with invalid key', async () => {
      await expect(
        service.decrypt('invalid-id', 'encrypted-data')
      ).rejects.toThrow();
    });
  });
});
