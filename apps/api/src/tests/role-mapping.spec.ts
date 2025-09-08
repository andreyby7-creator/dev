import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RoleMappingService } from '../auth/services/role-mapping.service';
import { UserRole } from '../types/roles';

describe('RoleMappingService', () => {
  let service: RoleMappingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleMappingService],
    }).compile();

    service = module.get<RoleMappingService>(RoleMappingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getInternalRole', () => {
    it('should return correct internal role for admin_role', () => {
      const result = service.getInternalRole('admin_role');
      expect(result).toBe(UserRole.SUPER_ADMIN);
    });

    it('should return correct internal role for manager_role', () => {
      const result = service.getInternalRole('manager_role');
      expect(result).toBe(UserRole.NETWORK_MANAGER);
    });

    it('should return correct internal role for retailer_role', () => {
      const result = service.getInternalRole('retailer_role');
      expect(result).toBe(UserRole.STORE_MANAGER);
    });

    it('should return correct internal role for brand_role', () => {
      const result = service.getInternalRole('brand_role');
      expect(result).toBe(UserRole.BRAND_MANAGER);
    });

    it('should return correct internal role for user_role', () => {
      const result = service.getInternalRole('user_role');
      expect(result).toBe(UserRole.USER);
    });

    it('should return null for invalid system role', () => {
      const result = service.getInternalRole('invalid_role');
      expect(result).toBeNull();
    });
  });

  describe('getSystemRole', () => {
    it('should return correct system role for SUPER_ADMIN', () => {
      const result = service.getSystemRole(UserRole.SUPER_ADMIN);
      expect(result).toBe('admin_role');
    });

    it('should return correct system role for NETWORK_MANAGER', () => {
      const result = service.getSystemRole(UserRole.NETWORK_MANAGER);
      expect(result).toBe('manager_role');
    });

    it('should return correct system role for STORE_MANAGER', () => {
      const result = service.getSystemRole(UserRole.STORE_MANAGER);
      expect(result).toBe('retailer_role');
    });

    it('should return correct system role for BRAND_MANAGER', () => {
      const result = service.getSystemRole(UserRole.BRAND_MANAGER);
      expect(result).toBe('brand_role');
    });

    it('should return correct system role for USER', () => {
      const result = service.getSystemRole(UserRole.USER);
      expect(result).toBe('user_role');
    });
  });

  describe('getPermissions', () => {
    it('should return all permissions for SUPER_ADMIN', () => {
      const result = service.getPermissions(UserRole.SUPER_ADMIN);
      expect(result).toContain('*');
    });

    it('should return correct permissions for NETWORK_MANAGER', () => {
      const result = service.getPermissions(UserRole.NETWORK_MANAGER);
      expect(result).toContain('network_management');
      expect(result).toContain('store_management');
      expect(result).toContain('brand_management');
      expect(result).toContain('analytics');
    });

    it('should return correct permissions for STORE_MANAGER', () => {
      const result = service.getPermissions(UserRole.STORE_MANAGER);
      expect(result).toContain('store_management');
      expect(result).toContain('loyalty_cards');
      expect(result).toContain('analytics');
    });

    it('should return correct permissions for BRAND_MANAGER', () => {
      const result = service.getPermissions(UserRole.BRAND_MANAGER);
      expect(result).toContain('brand_management');
      expect(result).toContain('marketing_campaigns');
      expect(result).toContain('analytics');
    });

    it('should return correct permissions for USER', () => {
      const result = service.getPermissions(UserRole.USER);
      expect(result).toContain('view_cards');
      expect(result).toContain('use_loyalty');
      expect(result).toContain('personal_data');
    });
  });

  describe('hasPermission', () => {
    it('should return true for SUPER_ADMIN with any permission', () => {
      const result = service.hasPermission(
        UserRole.SUPER_ADMIN,
        'any_permission'
      );
      expect(result).toBe(true);
    });

    it('should return true for NETWORK_MANAGER with network_management', () => {
      const result = service.hasPermission(
        UserRole.NETWORK_MANAGER,
        'network_management'
      );
      expect(result).toBe(true);
    });

    it('should return false for NETWORK_MANAGER with invalid permission', () => {
      const result = service.hasPermission(
        UserRole.NETWORK_MANAGER,
        'invalid_permission'
      );
      expect(result).toBe(false);
    });

    it('should return true for STORE_MANAGER with store_management', () => {
      const result = service.hasPermission(
        UserRole.STORE_MANAGER,
        'store_management'
      );
      expect(result).toBe(true);
    });

    it('should return true for BRAND_MANAGER with brand_management', () => {
      const result = service.hasPermission(
        UserRole.BRAND_MANAGER,
        'brand_management'
      );
      expect(result).toBe(true);
    });

    it('should return true for USER with view_cards', () => {
      const result = service.hasPermission(UserRole.USER, 'view_cards');
      expect(result).toBe(true);
    });
  });

  describe('getAllMappings', () => {
    it('should return all role mappings', () => {
      const result = service.getAllMappings();
      expect(result).toHaveLength(5);
      expect(result[0]?.systemRole).toBe('admin_role');
      expect(result[1]?.systemRole).toBe('manager_role');
      expect(result[2]?.systemRole).toBe('retailer_role');
      expect(result[3]?.systemRole).toBe('brand_role');
      expect(result[4]?.systemRole).toBe('user_role');
    });
  });

  describe('getRoleDescription', () => {
    it('should return correct description for SUPER_ADMIN', () => {
      const result = service.getRoleDescription(UserRole.SUPER_ADMIN);
      expect(result).toBe('Полный доступ ко всем функциям системы');
    });

    it('should return correct description for NETWORK_MANAGER', () => {
      const result = service.getRoleDescription(UserRole.NETWORK_MANAGER);
      expect(result).toBe('Управление сетями, магазинами и брендами');
    });

    it('should return correct description for STORE_MANAGER', () => {
      const result = service.getRoleDescription(UserRole.STORE_MANAGER);
      expect(result).toBe('Управление магазинами и картами лояльности');
    });

    it('should return correct description for BRAND_MANAGER', () => {
      const result = service.getRoleDescription(UserRole.BRAND_MANAGER);
      expect(result).toBe('Управление брендами и маркетинговыми кампаниями');
    });

    it('should return correct description for USER', () => {
      const result = service.getRoleDescription(UserRole.USER);
      expect(result).toBe(
        'Базовый пользователь с доступом к картам лояльности'
      );
    });
  });

  describe('isValidSystemRole', () => {
    it('should return true for valid system roles', () => {
      expect(service.isValidSystemRole('admin_role')).toBe(true);
      expect(service.isValidSystemRole('manager_role')).toBe(true);
      expect(service.isValidSystemRole('retailer_role')).toBe(true);
      expect(service.isValidSystemRole('brand_role')).toBe(true);
      expect(service.isValidSystemRole('user_role')).toBe(true);
    });

    it('should return false for invalid system role', () => {
      expect(service.isValidSystemRole('invalid_role')).toBe(false);
    });
  });

  describe('isValidInternalRole', () => {
    it('should return true for valid internal roles', () => {
      expect(service.isValidInternalRole(UserRole.SUPER_ADMIN)).toBe(true);
      expect(service.isValidInternalRole(UserRole.NETWORK_MANAGER)).toBe(true);
      expect(service.isValidInternalRole(UserRole.STORE_MANAGER)).toBe(true);
      expect(service.isValidInternalRole(UserRole.BRAND_MANAGER)).toBe(true);
      expect(service.isValidInternalRole(UserRole.USER)).toBe(true);
    });
  });

  describe('getRoleHierarchy', () => {
    it('should return correct hierarchy for SUPER_ADMIN', () => {
      const hierarchy = service.getRoleHierarchy();
      expect(hierarchy[UserRole.SUPER_ADMIN]).toContain(
        UserRole.NETWORK_MANAGER
      );
      expect(hierarchy[UserRole.SUPER_ADMIN]).toContain(UserRole.STORE_MANAGER);
      expect(hierarchy[UserRole.SUPER_ADMIN]).toContain(UserRole.BRAND_MANAGER);
      expect(hierarchy[UserRole.SUPER_ADMIN]).toContain(UserRole.USER);
    });

    it('should return correct hierarchy for NETWORK_MANAGER', () => {
      const hierarchy = service.getRoleHierarchy();
      expect(hierarchy[UserRole.NETWORK_MANAGER]).toContain(
        UserRole.STORE_MANAGER
      );
      expect(hierarchy[UserRole.NETWORK_MANAGER]).toContain(
        UserRole.BRAND_MANAGER
      );
      expect(hierarchy[UserRole.NETWORK_MANAGER]).toContain(UserRole.USER);
    });

    it('should return correct hierarchy for STORE_MANAGER', () => {
      const hierarchy = service.getRoleHierarchy();
      expect(hierarchy[UserRole.STORE_MANAGER]).toContain(UserRole.USER);
    });

    it('should return correct hierarchy for BRAND_MANAGER', () => {
      const hierarchy = service.getRoleHierarchy();
      expect(hierarchy[UserRole.BRAND_MANAGER]).toContain(UserRole.USER);
    });

    it('should return empty array for USER', () => {
      const hierarchy = service.getRoleHierarchy();
      expect(hierarchy[UserRole.USER]).toEqual([]);
    });
  });

  describe('canManageRole', () => {
    it('should return true for SUPER_ADMIN managing any role', () => {
      expect(
        service.canManageRole(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
      ).toBe(true);
      expect(
        service.canManageRole(UserRole.SUPER_ADMIN, UserRole.STORE_MANAGER)
      ).toBe(true);
      expect(
        service.canManageRole(UserRole.SUPER_ADMIN, UserRole.BRAND_MANAGER)
      ).toBe(true);
      expect(service.canManageRole(UserRole.SUPER_ADMIN, UserRole.USER)).toBe(
        true
      );
    });

    it('should return true for NETWORK_MANAGER managing lower roles', () => {
      expect(
        service.canManageRole(UserRole.NETWORK_MANAGER, UserRole.STORE_MANAGER)
      ).toBe(true);
      expect(
        service.canManageRole(UserRole.NETWORK_MANAGER, UserRole.BRAND_MANAGER)
      ).toBe(true);
      expect(
        service.canManageRole(UserRole.NETWORK_MANAGER, UserRole.USER)
      ).toBe(true);
    });

    it('should return false for NETWORK_MANAGER managing SUPER_ADMIN', () => {
      expect(
        service.canManageRole(UserRole.NETWORK_MANAGER, UserRole.SUPER_ADMIN)
      ).toBe(false);
    });

    it('should return true for STORE_MANAGER managing USER', () => {
      expect(service.canManageRole(UserRole.STORE_MANAGER, UserRole.USER)).toBe(
        true
      );
    });

    it('should return false for STORE_MANAGER managing higher roles', () => {
      expect(
        service.canManageRole(UserRole.STORE_MANAGER, UserRole.SUPER_ADMIN)
      ).toBe(false);
      expect(
        service.canManageRole(UserRole.STORE_MANAGER, UserRole.NETWORK_MANAGER)
      ).toBe(false);
      expect(
        service.canManageRole(UserRole.STORE_MANAGER, UserRole.BRAND_MANAGER)
      ).toBe(false);
    });

    it('should return true for BRAND_MANAGER managing USER', () => {
      expect(service.canManageRole(UserRole.BRAND_MANAGER, UserRole.USER)).toBe(
        true
      );
    });

    it('should return false for USER managing any role', () => {
      expect(service.canManageRole(UserRole.USER, UserRole.SUPER_ADMIN)).toBe(
        false
      );
      expect(
        service.canManageRole(UserRole.USER, UserRole.NETWORK_MANAGER)
      ).toBe(false);
      expect(service.canManageRole(UserRole.USER, UserRole.STORE_MANAGER)).toBe(
        false
      );
      expect(service.canManageRole(UserRole.USER, UserRole.BRAND_MANAGER)).toBe(
        false
      );
    });
  });
});
