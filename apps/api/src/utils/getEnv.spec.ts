import { vi } from 'vitest';
import { getEnv } from './getEnv';

describe('getEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('string type', () => {
    it('should return string value when exists', () => {
      process.env.TEST_STRING = 'test-value';

      const result = getEnv('TEST_STRING', 'string');

      expect(result).toBe('test-value');
      expect(typeof result).toBe('string');
    });

    it('should return default value when not exists', () => {
      delete process.env.TEST_STRING;

      const result = getEnv('TEST_STRING', 'string', {
        default: 'default-value',
      });

      expect(result).toBe('default-value');
      expect(typeof result).toBe('string');
    });

    it('should throw error when required and not exists', () => {
      delete process.env.TEST_STRING;

      expect(() => {
        getEnv('TEST_STRING', 'string', { required: true });
      }).toThrow('Environment variable TEST_STRING is required but not set');
    });

    it('should return empty string when not exists and no default', () => {
      delete process.env.TEST_STRING;

      const result = getEnv('TEST_STRING', 'string');

      expect(result).toBe('');
      expect(typeof result).toBe('string');
    });
  });

  describe('number type', () => {
    it('should return number value when exists and valid', () => {
      process.env.TEST_NUMBER = '42';

      const result = getEnv('TEST_NUMBER', 'number');

      expect(result).toBe(42);
      expect(typeof result).toBe('number');
    });

    it('should return default number when not exists', () => {
      delete process.env.TEST_NUMBER;

      const result = getEnv('TEST_NUMBER', 'number', { default: 100 });

      expect(result).toBe(100);
      expect(typeof result).toBe('number');
    });

    it('should throw error when required and not exists', () => {
      delete process.env.TEST_NUMBER;

      expect(() => {
        getEnv('TEST_NUMBER', 'number', { required: true });
      }).toThrow('Environment variable TEST_NUMBER is required but not set');
    });

    it('should throw error when invalid number format', () => {
      process.env.TEST_NUMBER = 'not-a-number';

      expect(() => {
        getEnv('TEST_NUMBER', 'number');
      }).toThrow('Environment variable TEST_NUMBER must be a valid number');
    });

    it('should return 0 when not exists and no default', () => {
      delete process.env.TEST_NUMBER;

      const result = getEnv('TEST_NUMBER', 'number');

      expect(result).toBe(0);
      expect(typeof result).toBe('number');
    });

    it('should handle negative numbers', () => {
      process.env.TEST_NEGATIVE = '-42';

      const result = getEnv('TEST_NEGATIVE', 'number');

      expect(result).toBe(-42);
      expect(typeof result).toBe('number');
    });

    it('should handle decimal numbers', () => {
      process.env.TEST_DECIMAL = '3.14';

      const result = getEnv('TEST_DECIMAL', 'number');

      expect(result).toBe(3.14);
      expect(typeof result).toBe('number');
    });
  });

  describe('boolean type', () => {
    it('should return true for truthy values', () => {
      const truthyValues = ['true', '1', 'yes'];

      truthyValues.forEach(value => {
        process.env.TEST_BOOLEAN = value;
        const result = getEnv('TEST_BOOLEAN', 'boolean');
        expect(result).toBe(true);
        expect(typeof result).toBe('boolean');
      });
    });

    it('should return false for falsy values', () => {
      const falsyValues = ['false', '0', 'no'];

      falsyValues.forEach(value => {
        process.env.TEST_BOOLEAN = value;
        const result = getEnv('TEST_BOOLEAN', 'boolean');
        expect(result).toBe(false);
        expect(typeof result).toBe('boolean');
      });
    });

    it('should return default boolean when not exists', () => {
      delete process.env.TEST_BOOLEAN;

      const result = getEnv('TEST_BOOLEAN', 'boolean', { default: true });

      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });

    it('should throw error when required and not exists', () => {
      delete process.env.TEST_BOOLEAN;

      expect(() => {
        getEnv('TEST_BOOLEAN', 'boolean', { required: true });
      }).toThrow('Environment variable TEST_BOOLEAN is required but not set');
    });

    it('should return false when not exists and no default', () => {
      delete process.env.TEST_BOOLEAN;

      const result = getEnv('TEST_BOOLEAN', 'boolean');

      expect(result).toBe(false);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string values', () => {
      process.env.TEST_EMPTY = '';

      const stringResult = getEnv('TEST_EMPTY', 'string');
      const numberResult = getEnv('TEST_EMPTY', 'number');
      const booleanResult = getEnv('TEST_EMPTY', 'boolean');

      expect(stringResult).toBe('');
      expect(numberResult).toBe(0);
      expect(booleanResult).toBe(false);
    });

    it('should handle whitespace values', () => {
      process.env.TEST_WHITESPACE = '   ';

      const stringResult = getEnv('TEST_WHITESPACE', 'string');

      expect(stringResult).toBe('   ');
    });

    it('should handle special characters in string values', () => {
      process.env.TEST_SPECIAL = 'special-chars!@#$%^&*()';

      const result = getEnv('TEST_SPECIAL', 'string');

      expect(result).toBe('special-chars!@#$%^&*()');
    });

    it('should handle very large numbers', () => {
      process.env.TEST_LARGE = '999999999999999';

      const result = getEnv('TEST_LARGE', 'number');

      expect(result).toBe(999999999999999);
    });

    it('should handle zero values', () => {
      process.env.TEST_ZERO = '0';

      const stringResult = getEnv('TEST_ZERO', 'string');
      const numberResult = getEnv('TEST_ZERO', 'number');
      const booleanResult = getEnv('TEST_ZERO', 'boolean');

      expect(stringResult).toBe('0');
      expect(numberResult).toBe(0);
      expect(booleanResult).toBe(false);
    });
  });

  describe('type safety', () => {
    it('should maintain correct return types', () => {
      process.env.TEST_STRING = 'test';
      process.env.TEST_NUMBER = '42';
      process.env.TEST_BOOLEAN = 'true';

      const stringResult = getEnv('TEST_STRING', 'string');
      const numberResult = getEnv('TEST_NUMBER', 'number');
      const booleanResult = getEnv('TEST_BOOLEAN', 'boolean');

      // Type assertions to ensure correct types
      const stringValue: string = stringResult;
      const numberValue: number = numberResult;
      const booleanValue: boolean = booleanResult;

      expect(stringValue).toBe('test');
      expect(numberValue).toBe(42);
      expect(booleanValue).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should provide clear error messages for invalid numbers', () => {
      process.env.TEST_INVALID_NUMBER = 'abc';

      expect(() => {
        getEnv('TEST_INVALID_NUMBER', 'number');
      }).toThrow(
        'Environment variable TEST_INVALID_NUMBER must be a valid number'
      );
    });

    it('should provide clear error messages for required variables', () => {
      delete process.env.TEST_REQUIRED;

      expect(() => {
        getEnv('TEST_REQUIRED', 'string', { required: true });
      }).toThrow('Environment variable TEST_REQUIRED is required but not set');
    });

    it('should handle multiple error scenarios', () => {
      delete process.env.TEST_MISSING;
      process.env.TEST_INVALID = 'invalid';

      expect(() => {
        getEnv('TEST_MISSING', 'number', { required: true });
      }).toThrow('Environment variable TEST_MISSING is required but not set');

      expect(() => {
        getEnv('TEST_INVALID', 'number');
      }).toThrow('Environment variable TEST_INVALID must be a valid number');
    });
  });
});
