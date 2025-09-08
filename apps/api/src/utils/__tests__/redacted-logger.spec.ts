import { vi } from 'vitest';
import { RedactedLogger } from '../redacted-logger';

describe('RedactedLogger', () => {
  let logger: RedactedLogger;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logger = new RedactedLogger('TestContext');
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('log', () => {
    it('should log message without data', () => {
      logger.log('Test message', 'TestContext');

      expect(consoleSpy).toHaveBeenCalledWith('[TestContext] Test message');
    });

    it('should redact sensitive keys in data', () => {
      const data = {
        userId: '123',
        password: 'secret123',
        apiKey: 'key123',
        normalField: 'value',
      };

      logger.log('User data', 'TestContext', data);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('***REDACTED***')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.not.stringContaining('secret123')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.not.stringContaining('key123')
      );
    });

    it('should redact nested sensitive keys', () => {
      const data = {
        user: {
          name: 'John',
          credentials: {
            password: 'secret123',
            token: 'token123',
          },
        },
        config: {
          apiKey: 'key123',
        },
      };

      logger.log('Nested data', 'TestContext', data);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('***REDACTED***')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.not.stringContaining('secret123')
      );
    });

    it('should handle arrays with sensitive data', () => {
      const data = [
        { name: 'User1', password: 'pass1' },
        { name: 'User2', apiKey: 'key2' },
      ];

      logger.log('Array data', 'TestContext', data);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('***REDACTED***')
      );
    });

    it('should handle null and undefined data', () => {
      logger.log('Null data', 'TestContext', null);
      logger.log('Undefined data', 'TestContext', undefined);

      expect(consoleSpy).toHaveBeenCalledWith('[TestContext] Null data');
      expect(consoleSpy).toHaveBeenCalledWith('[TestContext] Undefined data');
    });

    it('should prevent infinite recursion with circular references', () => {
      const data: { name: string; self?: unknown } = { name: 'Test' };
      data.self = data;

      logger.log('Circular data', 'TestContext', data);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MAX_DEPTH]')
      );
    });
  });

  describe('error', () => {
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      errorSpy.mockRestore();
    });

    it('should log error message without data', () => {
      logger.error('Error message', 'Error trace', 'TestContext');

      expect(errorSpy).toHaveBeenCalledWith(
        '[TestContext] ERROR: Error message'
      );
      expect(errorSpy).toHaveBeenCalledWith('[TestContext] TRACE: Error trace');
    });

    it('should redact sensitive data in error logs', () => {
      const data = {
        userId: '123',
        password: 'secret123',
        errorDetails: 'Some error',
      };

      logger.error('Error occurred', 'Error trace', 'TestContext', data);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('***REDACTED***')
      );
    });
  });

  describe('sensitive key detection', () => {
    it('should detect various sensitive key patterns', () => {
      const sensitiveData = {
        JWT_SECRET: 'secret123',
        ENCRYPTION_KEY: 'key123',
        API_KEY_SECRET: 'secret456',
        SUPABASE_KEY: 'supabase123',
        password: 'pass123',
        secret: 'secret789',
        token: 'token123',
        key: 'key456',
        auth: 'auth123',
        credential: 'cred123',
      };

      logger.log('Sensitive data', 'TestContext', sensitiveData);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('***REDACTED***')
      );
    });

    it('should preserve non-sensitive data', () => {
      const normalData = {
        userId: '123',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        isActive: true,
      };

      logger.log('Normal data', 'TestContext', normalData);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('John Doe')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('john@example.com')
      );
    });
  });

  describe('additional methods', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;
    let debugSpy: ReturnType<typeof vi.spyOn>;
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
      debugSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('should handle warn method with sensitive data', () => {
      const data = {
        config: {
          apiKey: 'secret-key',
          database: {
            password: 'db-pass',
          },
        },
      };

      logger.warn('Warning message', 'TestContext', data);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('***REDACTED***')
      );
    });

    it('should handle debug method with sensitive data', () => {
      const data = {
        credentials: {
          username: 'user',
          password: 'secret-pass',
        },
      };

      logger.debug('Debug message', 'TestContext', data);

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('***REDACTED***')
      );
    });

    it('should handle errorWithData method', () => {
      const data = {
        user: {
          id: '123',
          token: 'secret-token',
        },
      };

      logger.errorWithData('Error with data', data, 'TestContext');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('***REDACTED***')
      );
    });

    it('should handle logConfig method', () => {
      const config = {
        database: {
          host: 'localhost',
          password: 'db-secret',
        },
        api: {
          key: 'api-secret',
        },
      };

      logger.logConfig(config, 'TestContext');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('***REDACTED***')
      );
    });

    it('should handle logEnvironment method', () => {
      const env = {
        NODE_ENV: 'test',
        DATABASE_PASSWORD: 'secret-pass',
        API_KEY: 'secret-key',
        NORMAL_VAR: 'normal-value',
      };

      logger.logEnvironment(env as NodeJS.ProcessEnv, 'TestContext');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('***REDACTED***')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('normal-value')
      );
    });
  });

  describe('constructor and context', () => {
    it('should use default context when none provided', () => {
      const defaultLogger = new RedactedLogger();
      defaultLogger.log('Test message');

      expect(consoleSpy).toHaveBeenCalledWith('[RedactedLogger] Test message');
    });

    it('should use provided context in constructor', () => {
      const customLogger = new RedactedLogger('CustomContext');
      customLogger.log('Test message');

      expect(consoleSpy).toHaveBeenCalledWith('[CustomContext] Test message');
    });

    it('should override context in method calls', () => {
      logger.log('Test message', 'OverrideContext');

      expect(consoleSpy).toHaveBeenCalledWith('[OverrideContext] Test message');
    });
  });
});
