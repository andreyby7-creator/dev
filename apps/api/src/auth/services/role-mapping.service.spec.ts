import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UserRole } from '../../types/roles';
import { RoleMappingService } from './role-mapping.service';

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
    it('should map admin_role to SUPER_ADMIN', () => {
      const result = service.getInternalRole('admin_role');
      expect(result).toBe(UserRole.SUPER_ADMIN);
    });

    it('should map manager_role to NETWORK_MANAGER', () => {
      const result = service.getInternalRole('manager_role');
      expect(result).toBe(UserRole.NETWORK_MANAGER);
    });

    it('should return null for unknown role', () => {
      const result = service.getInternalRole('unknown_role');
      expect(result).toBe(null);
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

    it('should return true for NETWORK_MANAGER with network_management permission', () => {
      const result = service.hasPermission(
        UserRole.NETWORK_MANAGER,
        'network_management'
      );
      expect(result).toBe(true);
    });

    it('should return false for STORE_MANAGER with network_management permission', () => {
      const result = service.hasPermission(
        UserRole.STORE_MANAGER,
        'network_management'
      );
      expect(result).toBe(false);
    });
  });
});
