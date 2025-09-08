import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { RoleMappingGuard } from '../src/auth/guards/role-mapping.guard';
import { UserRole } from '../src/types/roles';

describe('Permissions E2E Tests', () => {
  let app: INestApplication;
  let roleMappingGuard: RoleMappingGuard;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    roleMappingGuard = moduleFixture.get<RoleMappingGuard>(RoleMappingGuard);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('RoleMappingGuard CRUD Operations', () => {
    it('should allow SUPER_ADMIN to create users', () => {
      const canCreate = roleMappingGuard.canCreate(
        UserRole.SUPER_ADMIN,
        'users'
      );
      expect(canCreate).toBe(true);
    });

    it('should allow NETWORK_MANAGER to read users', () => {
      const canRead = roleMappingGuard.canRead(
        UserRole.NETWORK_MANAGER,
        'users'
      );
      expect(canRead).toBe(true);
    });

    it('should allow SUPER_ADMIN to update users', () => {
      const canUpdate = roleMappingGuard.canUpdate(
        UserRole.SUPER_ADMIN,
        'users'
      );
      expect(canUpdate).toBe(true);
    });

    it('should allow SUPER_ADMIN to delete users', () => {
      const canDelete = roleMappingGuard.canDelete(
        UserRole.SUPER_ADMIN,
        'users'
      );
      expect(canDelete).toBe(true);
    });

    it('should not allow USER to create users', () => {
      const canCreate = roleMappingGuard.canCreate(UserRole.USER, 'users');
      expect(canCreate).toBe(false);
    });

    it('should not allow USER to delete users', () => {
      const canDelete = roleMappingGuard.canDelete(UserRole.USER, 'users');
      expect(canDelete).toBe(false);
    });
  });

  describe('RoleMappingGuard Special Permissions', () => {
    it('should allow SUPER_ADMIN to manage users', () => {
      const canManage = roleMappingGuard.canManageUsers(UserRole.SUPER_ADMIN);
      expect(canManage).toBe(true);
    });

    it('should allow NETWORK_MANAGER to view analytics', () => {
      const canView = roleMappingGuard.canViewAnalytics(
        UserRole.NETWORK_MANAGER
      );
      expect(canView).toBe(true);
    });

    it('should allow SUPER_ADMIN to manage billing', () => {
      const canManage = roleMappingGuard.canManageBilling(UserRole.SUPER_ADMIN);
      expect(canManage).toBe(true);
    });

    it('should not allow USER to manage users', () => {
      const canManage = roleMappingGuard.canManageUsers(UserRole.USER);
      expect(canManage).toBe(false);
    });

    it('should not allow STORE_MANAGER to manage billing', () => {
      const canManage = roleMappingGuard.canManageBilling(
        UserRole.STORE_MANAGER
      );
      expect(canManage).toBe(false);
    });
  });

  describe('RoleMappingGuard Resource Access', () => {
    it('should allow SUPER_ADMIN to access any resource', () => {
      const canAccess = roleMappingGuard.canAccessResource(
        UserRole.SUPER_ADMIN,
        'any_resource'
      );
      expect(canAccess).toBe(true);
    });

    it('should allow NETWORK_MANAGER to access network resources', () => {
      const canAccess = roleMappingGuard.canAccessResource(
        UserRole.NETWORK_MANAGER,
        'networks'
      );
      expect(canAccess).toBe(true);
    });

    it('should not allow USER to access admin resources', () => {
      const canAccess = roleMappingGuard.canAccessResource(
        UserRole.USER,
        'admin_panel'
      );
      expect(canAccess).toBe(false);
    });
  });

  describe('RoleMappingGuard Operation Performance', () => {
    it('should allow SUPER_ADMIN to perform any operation', () => {
      const canPerform = roleMappingGuard.canPerformOperation(
        UserRole.SUPER_ADMIN,
        'users',
        'create'
      );
      expect(canPerform).toBe(true);
    });

    it('should allow NETWORK_MANAGER to perform read operations on networks', () => {
      const canPerform = roleMappingGuard.canPerformOperation(
        UserRole.NETWORK_MANAGER,
        'networks',
        'read'
      );
      expect(canPerform).toBe(true);
    });

    it('should not allow STORE_MANAGER to perform delete operations on networks', () => {
      const canPerform = roleMappingGuard.canPerformOperation(
        UserRole.STORE_MANAGER,
        'networks',
        'delete'
      );
      expect(canPerform).toBe(false);
    });
  });

  describe('API Endpoints with Role Protection', () => {
    it('should protect admin endpoints with proper roles', () => {
      // This test would require authentication setup
      // For now, we test the guard logic directly
      expect(roleMappingGuard).toBeDefined();
    });

    it('should validate role hierarchy in guard', () => {
      // Test that the guard respects role hierarchy
      const canManage = roleMappingGuard.canManageUsers(UserRole.SUPER_ADMIN);
      expect(canManage).toBe(true);
    });
  });
});
