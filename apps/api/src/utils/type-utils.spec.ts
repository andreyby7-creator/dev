import { z } from 'zod';
import {
  OptionalFields,
  PickFields,
  ReadonlyFields,
  RequiredFields,
  createZodSchema,
  safeGet,
} from './type-utils';

describe('Type Utils', () => {
  // Test interfaces
  interface TestUser {
    id: string;
    name: string;
    email: string;
    age: number;
    isActive: boolean;
  }

  interface TestConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  }

  describe('PickFields', () => {
    it('should pick specific fields from type', () => {
      type UserBasic = PickFields<TestUser, 'id' | 'name'>;

      const userBasic: UserBasic = {
        id: '123',
        name: 'John Doe',
      };

      expect(userBasic).toHaveProperty('id');
      expect(userBasic).toHaveProperty('name');
      expect(userBasic).not.toHaveProperty('email');
    });

    it('should work with single field', () => {
      type UserId = PickFields<TestUser, 'id'>;

      const userId: UserId = {
        id: '123',
      };

      expect(userId).toHaveProperty('id');
      expect(Object.keys(userId)).toHaveLength(1);
    });
  });

  describe('OptionalFields', () => {
    it('should make specific fields optional', () => {
      type UserWithOptionalEmail = OptionalFields<TestUser, 'email' | 'age'>;

      const user: UserWithOptionalEmail = {
        id: '123',
        name: 'John Doe',
        isActive: true,
        // email and age are optional
      };

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('isActive');
    });

    it('should allow optional fields to be provided', () => {
      type UserWithOptionalEmail = OptionalFields<TestUser, 'email'>;

      const user: UserWithOptionalEmail = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        isActive: true,
      };

      expect(user.email).toBe('john@example.com');
    });
  });

  describe('RequiredFields', () => {
    it('should make specific fields required', () => {
      interface PartialUser {
        id?: string;
        name?: string;
        email?: string;
      }

      type UserWithRequiredId = RequiredFields<PartialUser, 'id'>;

      const user: UserWithRequiredId = {
        id: '123',
        // name and email are still optional
      };

      expect(user).toHaveProperty('id');
    });
  });

  describe('ReadonlyFields', () => {
    it('should make specific fields readonly', () => {
      type UserWithReadonlyId = ReadonlyFields<TestUser, 'id'>;

      const user: UserWithReadonlyId = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        isActive: true,
      };

      expect(user.id).toBe('123');
      // user.id = '456'; // This would cause TypeScript error
    });
  });

  describe('createZodSchema', () => {
    it('should create a custom Zod schema', () => {
      const customSchema = createZodSchema<TestUser>();

      expect(customSchema).toBeDefined();
      expect(typeof customSchema.parse).toBe('function');
    });

    it('should work with custom types', () => {
      interface CustomType {
        value: string;
        count: number;
      }

      const customSchema = createZodSchema<CustomType>();

      expect(customSchema).toBeDefined();
    });
  });

  describe('safeGet', () => {
    it('should safely get property from object', () => {
      const user: TestUser = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        isActive: true,
      };

      const id = safeGet(user, 'id');
      const name = safeGet(user, 'name');
      const nonExistent = safeGet(user, 'nonExistent' as keyof TestUser);

      expect(id).toBe('123');
      expect(name).toBe('John Doe');
      expect(nonExistent).toBeUndefined();
    });

    it('should handle null and undefined objects', () => {
      expect(() => {
        safeGet(null as unknown as TestUser, 'id');
      }).toThrow();

      expect(() => {
        safeGet(undefined as unknown as TestUser, 'id');
      }).toThrow();
    });

    it('should work with nested objects', () => {
      interface NestedObject {
        user: TestUser;
        config: TestConfig;
      }

      const nested: NestedObject = {
        user: {
          id: '123',
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
          isActive: true,
        },
        config: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          username: 'user',
          password: 'password',
        },
      };

      const userId = safeGet(nested, 'user');
      const configHost = safeGet(nested, 'config');

      expect(userId).toEqual(nested.user);
      expect(configHost).toEqual(nested.config);
    });

    it('should work with array properties', () => {
      interface ObjectWithArray {
        items: string[];
        count: number;
      }

      const obj: ObjectWithArray = {
        items: ['item1', 'item2'],
        count: 2,
      };

      const items = safeGet(obj, 'items');
      const count = safeGet(obj, 'count');

      expect(items).toEqual(['item1', 'item2']);
      expect(count).toBe(2);
    });

    it('should handle edge cases', () => {
      const emptyObj = {};
      const result = safeGet(emptyObj, 'nonExistent' as keyof typeof emptyObj);

      expect(result).toBeUndefined();
    });
  });

  describe('integration tests', () => {
    it('should work together with Zod schemas', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const userSchema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
        age: z.number().min(0),
        isActive: z.boolean(),
      });

      type UserFromSchema = z.infer<typeof userSchema>;
      type UserBasic = PickFields<UserFromSchema, 'id' | 'name'>;

      const user: UserFromSchema = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        isActive: true,
      };

      const basicUser: UserBasic = {
        id: user.id,
        name: user.name,
      };

      expect(basicUser).toEqual({
        id: '123',
        name: 'John Doe',
      });
    });

    it('should work with complex nested types', () => {
      interface ComplexUser {
        id: string;
        profile: {
          name: string;
          settings: {
            theme: 'light' | 'dark';
            notifications: boolean;
          };
        };
        permissions: string[];
      }

      const user: ComplexUser = {
        id: '123',
        profile: {
          name: 'John Doe',
          settings: {
            theme: 'dark',
            notifications: true,
          },
        },
        permissions: ['read', 'write'],
      };

      const profile = safeGet(user, 'profile');
      const theme = safeGet(user.profile.settings, 'theme');

      expect(profile).toEqual(user.profile);
      expect(theme).toBe('dark');
    });
  });
});
