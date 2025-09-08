import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { RoleMappingService } from '../src/auth/services/role-mapping.service';
import { UserRole } from '../src/types/roles';

describe('RoleMapping E2E Tests', () => {
  let app: INestApplication;
  let roleMappingService: RoleMappingService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    roleMappingService =
      moduleFixture.get<RoleMappingService>(RoleMappingService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/roles (GET)', () => {
    it('should return all role mappings', () => {
      return request(app.getHttpServer())
        .get('/auth/roles')
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('should return role hierarchy', () => {
      return request(app.getHttpServer())
        .get('/auth/roles/hierarchy')
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('data');
          expect(typeof res.body.data).toBe('object');
        });
    });
  });

  describe('/auth/permissions (GET)', () => {
    it('should return permissions for SUPER_ADMIN role', () => {
      return request(app.getHttpServer())
        .get('/auth/permissions')
        .query({ role: UserRole.SUPER_ADMIN })
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data).toContain('*');
        });
    });

    it('should return permissions for NETWORK_MANAGER role', () => {
      return request(app.getHttpServer())
        .get('/auth/permissions')
        .query({ role: UserRole.NETWORK_MANAGER })
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data).toContain('network_management');
        });
    });
  });

  describe('Role Mapping Service', () => {
    it('should map admin_role to SUPER_ADMIN', () => {
      const internalRole = roleMappingService.getInternalRole('admin_role');
      expect(internalRole).toBe(UserRole.SUPER_ADMIN);
    });

    it('should map manager_role to NETWORK_MANAGER', () => {
      const internalRole = roleMappingService.getInternalRole('manager_role');
      expect(internalRole).toBe(UserRole.NETWORK_MANAGER);
    });

    it('should check SUPER_ADMIN has all permissions', () => {
      const hasPermission = roleMappingService.hasPermission(
        UserRole.SUPER_ADMIN,
        'any_permission'
      );
      expect(hasPermission).toBe(true);
    });

    it('should check NETWORK_MANAGER has network_management permission', () => {
      const hasPermission = roleMappingService.hasPermission(
        UserRole.NETWORK_MANAGER,
        'network_management'
      );
      expect(hasPermission).toBe(true);
    });

    it('should check STORE_MANAGER cannot manage networks', () => {
      const hasPermission = roleMappingService.hasPermission(
        UserRole.STORE_MANAGER,
        'network_management'
      );
      expect(hasPermission).toBe(false);
    });
  });

  describe('Role Hierarchy', () => {
    it('should allow SUPER_ADMIN to manage all roles', () => {
      const canManage = roleMappingService.canManageRole(
        UserRole.SUPER_ADMIN,
        UserRole.NETWORK_MANAGER
      );
      expect(canManage).toBe(true);
    });

    it('should allow NETWORK_MANAGER to manage STORE_MANAGER', () => {
      const canManage = roleMappingService.canManageRole(
        UserRole.NETWORK_MANAGER,
        UserRole.STORE_MANAGER
      );
      expect(canManage).toBe(true);
    });

    it('should not allow STORE_MANAGER to manage NETWORK_MANAGER', () => {
      const canManage = roleMappingService.canManageRole(
        UserRole.STORE_MANAGER,
        UserRole.NETWORK_MANAGER
      );
      expect(canManage).toBe(false);
    });
  });
});
