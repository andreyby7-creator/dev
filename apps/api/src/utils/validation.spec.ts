import { vi } from 'vitest';
import { z } from 'zod';
import { validateData, validateWithLogging } from './validation';

describe('Validation Utils', () => {
  describe('validateData', () => {
    const userSchema = z.object({
      id: z.string(),
      email: z.string().email(),
      name: z.string().min(1),
      age: z.number().min(0).max(150),
    });

    it('should return success with valid data', () => {
      const validData = {
        id: '123',
        email: 'test@example.com',
        name: 'John Doe',
        age: 30,
      };

      const result = validateData(userSchema, validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should return failure with invalid data', () => {
      const invalidData = {
        id: '123',
        email: 'invalid-email',
        name: '',
        age: -5,
      };

      const result = validateData(userSchema, invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeInstanceOf(z.ZodError);
        expect(result.errors.issues).toHaveLength(3); // email, name, age errors
      }
    });

    it('should handle missing required fields', () => {
      const incompleteData = {
        id: '123',
        // missing email, name, age
      };

      const result = validateData(userSchema, incompleteData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.issues).toHaveLength(3); // email, name, age missing
      }
    });

    it('should handle null and undefined data', () => {
      const result1 = validateData(userSchema, null);
      const result2 = validateData(userSchema, undefined);

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });

    it('should handle complex nested schemas', () => {
      const nestedSchema = z.object({
        user: z.object({
          id: z.string(),
          profile: z.object({
            name: z.string(),
            settings: z.object({
              theme: z.enum(['light', 'dark']),
              notifications: z.boolean(),
            }),
          }),
        }),
        metadata: z.array(z.string()),
      });

      const validNestedData = {
        user: {
          id: '123',
          profile: {
            name: 'John Doe',
            settings: {
              theme: 'dark' as const,
              notifications: true,
            },
          },
        },
        metadata: ['tag1', 'tag2'],
      };

      const result = validateData(nestedSchema, validNestedData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validNestedData);
      }
    });

    it('should handle array validation', () => {
      const arraySchema = z.array(
        z.object({
          id: z.string(),
          value: z.number(),
        })
      );

      const validArray = [
        { id: '1', value: 10 },
        { id: '2', value: 20 },
      ];

      const result = validateData(arraySchema, validArray);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validArray);
      }
    });

    it('should handle empty array', () => {
      const arraySchema = z.array(z.string());

      const result = validateData(arraySchema, []);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe('validateWithLogging', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    afterEach(() => {
      consoleSpy.mockClear();
    });

    afterAll(() => {
      consoleSpy.mockRestore();
    });

    const userSchema = z.object({
      id: z.string(),
      email: z.string().email(),
      name: z.string().min(1),
    });

    it('should return success with valid data and not log errors', () => {
      const validData = {
        id: '123',
        email: 'test@example.com',
        name: 'John Doe',
      };

      const result = validateWithLogging(userSchema, validData, 'TestContext');

      expect(result).toEqual(validData);
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should throw error with invalid data and log errors', () => {
      const invalidData = {
        id: '123',
        email: 'invalid-email',
        name: '',
      };

      expect(() => {
        validateWithLogging(userSchema, invalidData, 'TestContext');
      }).toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Validation error in TestContext:',
        expect.any(Object)
      );
    });

    it('should use default context when not provided', () => {
      const invalidData = {
        id: '123',
        email: 'invalid-email',
        name: '',
      };

      expect(() => {
        validateWithLogging(userSchema, invalidData, 'ValidationUtils');
      }).toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Validation error in ValidationUtils:',
        expect.any(Object)
      );
    });

    it('should log detailed error information', () => {
      const invalidData = {
        id: '123',
        email: 'invalid-email',
        name: '',
      };

      expect(() => {
        validateWithLogging(userSchema, invalidData, 'TestContext');
      }).toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Validation error in TestContext:',
        expect.any(Object)
      );
    });

    it('should handle multiple validation errors', () => {
      const invalidData = {
        id: '',
        email: 'not-an-email',
        name: '',
      };

      expect(() => {
        validateWithLogging(userSchema, invalidData, 'TestContext');
      }).toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Validation error in TestContext:',
        expect.any(Object)
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty object validation', () => {
      const emptySchema = z.object({});
      const result = validateData(emptySchema, {});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
    });

    it('should handle optional fields', () => {
      const optionalSchema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });

      const dataWithOptional = {
        required: 'value',
        optional: 'optional-value',
      };

      const dataWithoutOptional = {
        required: 'value',
      };

      const result1 = validateData(optionalSchema, dataWithOptional);
      const result2 = validateData(optionalSchema, dataWithoutOptional);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should handle union types', () => {
      const unionSchema = z.union([
        z.object({ type: z.literal('user'), name: z.string() }),
        z.object({ type: z.literal('admin'), id: z.string() }),
      ]);

      const userData = { type: 'user' as const, name: 'John' };
      const adminData = { type: 'admin' as const, id: '123' };

      const result1 = validateData(unionSchema, userData);
      const result2 = validateData(unionSchema, adminData);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should handle discriminated unions', () => {
      const discriminatedSchema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('success'), data: z.string() }),
        z.object({ type: z.literal('error'), message: z.string() }),
      ]);

      const successData = { type: 'success' as const, data: 'result' };
      const errorData = { type: 'error' as const, message: 'error message' };

      const result1 = validateData(discriminatedSchema, successData);
      const result2 = validateData(discriminatedSchema, errorData);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });
});
