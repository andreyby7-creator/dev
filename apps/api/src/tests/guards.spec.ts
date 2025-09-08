import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../types/roles';

describe('Guards and Decorators Tests', () => {
  let jwtAuthGuard: JwtAuthGuard;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;
  let mockExecutionContext: ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: vi.fn().mockReturnValue([UserRole.ADMIN]),
            get: vi.fn().mockReturnValue([UserRole.ADMIN]),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verify: vi.fn(),
            sign: vi.fn(),
          },
        },
      ],
    }).compile();

    jwtAuthGuard = module.get<JwtAuthGuard>(JwtAuthGuard);
    rolesGuard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);

    // Убеждаемся что Reflector правильно инжектирован в RolesGuard
    (rolesGuard as unknown as { reflector: Reflector }).reflector = reflector;

    mockExecutionContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            role: UserRole.SUPER_ADMIN,
          },
        }),
      }),
      getHandler: vi.fn(),
      getClass: vi.fn(),
    } as unknown as ExecutionContext;
  });

  describe('Roles Decorator', () => {
    it('should set roles metadata correctly', () => {
      class TestController {
        @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
        testMethod() {}
      }

      const roles = Reflect.getMetadata(
        'roles',
        TestController.prototype.testMethod
      );
      expect(roles).toEqual([UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER]);
    });

    it('should work with single role', () => {
      class TestController {
        @Roles(UserRole.USER)
        testMethod() {}
      }

      const roles = Reflect.getMetadata(
        'roles',
        TestController.prototype.testMethod
      );
      expect(roles).toEqual([UserRole.USER]);
    });
  });

  describe('JwtAuthGuard', () => {
    it('should be defined', () => {
      expect(jwtAuthGuard).toBeDefined();
    });

    it('should have canActivate method', () => {
      expect(typeof jwtAuthGuard.canActivate).toBe('function');
    });
  });

  describe('RolesGuard', () => {
    it('should be defined', () => {
      expect(rolesGuard).toBeDefined();
    });

    it('should have canActivate method', () => {
      expect(typeof rolesGuard.canActivate).toBe('function');
    });

    it('should allow access when user has required role', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        UserRole.SUPER_ADMIN,
        UserRole.NETWORK_MANAGER,
      ]);

      const result = rolesGuard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should deny access when user does not have required role', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        UserRole.NETWORK_MANAGER,
      ]);

      // Change user role to USER
      mockExecutionContext.switchToHttp().getRequest().user.role =
        UserRole.USER;

      expect(() => rolesGuard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException
      );
    });

    it('should allow access when no roles are required', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = rolesGuard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        UserRole.SUPER_ADMIN,
      ]);

      // Remove user from request
      mockExecutionContext.switchToHttp().getRequest().user = null;

      expect(() => rolesGuard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException
      );
    });

    it('should handle multiple required roles correctly', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        UserRole.NETWORK_MANAGER,
        UserRole.STORE_MANAGER,
      ]);

      // User has NETWORK_MANAGER role
      mockExecutionContext.switchToHttp().getRequest().user.role =
        UserRole.NETWORK_MANAGER;

      const result = rolesGuard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should deny access when user has none of the required roles', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        UserRole.NETWORK_MANAGER,
        UserRole.STORE_MANAGER,
      ]);

      // User has USER role (not in required roles)
      mockExecutionContext.switchToHttp().getRequest().user.role =
        UserRole.USER;

      expect(() => rolesGuard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException
      );
    });
  });

  describe('Integration Tests', () => {
    it('should work with all role combinations', () => {
      const roleCombinations = [
        [UserRole.SUPER_ADMIN],
        [UserRole.NETWORK_MANAGER],
        [UserRole.STORE_MANAGER],
        [UserRole.BRAND_MANAGER],
        [UserRole.USER],
        [UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER],
        [UserRole.NETWORK_MANAGER, UserRole.STORE_MANAGER],
        [UserRole.STORE_MANAGER, UserRole.USER],
      ];

      roleCombinations.forEach(roles => {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

        // Test with SUPER_ADMIN (should have access to SUPER_ADMIN role)
        if (roles.includes(UserRole.SUPER_ADMIN)) {
          mockExecutionContext.switchToHttp().getRequest().user.role =
            UserRole.SUPER_ADMIN;
          expect(() =>
            rolesGuard.canActivate(mockExecutionContext)
          ).not.toThrow();
        }

        // Test with NETWORK_MANAGER (should have access to NETWORK_MANAGER role)
        if (roles.includes(UserRole.NETWORK_MANAGER)) {
          mockExecutionContext.switchToHttp().getRequest().user.role =
            UserRole.NETWORK_MANAGER;
          expect(() =>
            rolesGuard.canActivate(mockExecutionContext)
          ).not.toThrow();
        }
      });
    });

    it('should handle edge cases correctly', () => {
      // Test with empty roles array
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
      const result = rolesGuard.canActivate(mockExecutionContext);
      expect(result).toBe(true);

      // Test with null roles
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      const result2 = rolesGuard.canActivate(mockExecutionContext);
      expect(result2).toBe(true);

      // Test with undefined roles
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const result3 = rolesGuard.canActivate(mockExecutionContext);
      expect(result3).toBe(true);
    });

    it('should validate role hierarchy correctly', () => {
      // SUPER_ADMIN should have access to SUPER_ADMIN role
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        UserRole.SUPER_ADMIN,
      ]);
      mockExecutionContext.switchToHttp().getRequest().user.role =
        UserRole.SUPER_ADMIN;
      expect(() => rolesGuard.canActivate(mockExecutionContext)).not.toThrow();

      // SUPER_ADMIN should not have access to other roles (strict role matching)
      [
        UserRole.NETWORK_MANAGER,
        UserRole.STORE_MANAGER,
        UserRole.BRAND_MANAGER,
        UserRole.USER,
      ].forEach(role => {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([role]);
        mockExecutionContext.switchToHttp().getRequest().user.role =
          UserRole.SUPER_ADMIN;

        expect(() => rolesGuard.canActivate(mockExecutionContext)).toThrow(
          ForbiddenException
        );
      });

      // USER should only have access to USER role
      vi.spyOn(reflector, 'get').mockReturnValue([UserRole.USER]);
      mockExecutionContext.switchToHttp().getRequest().user.role =
        UserRole.USER;
      expect(() => rolesGuard.canActivate(mockExecutionContext)).not.toThrow();

      // USER should not have access to other roles
      [
        UserRole.SUPER_ADMIN,
        UserRole.NETWORK_MANAGER,
        UserRole.STORE_MANAGER,
        UserRole.BRAND_MANAGER,
      ].forEach(role => {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([role]);
        mockExecutionContext.switchToHttp().getRequest().user.role =
          UserRole.USER;

        expect(() => rolesGuard.canActivate(mockExecutionContext)).toThrow(
          ForbiddenException
        );
      });
    });
  });
});
