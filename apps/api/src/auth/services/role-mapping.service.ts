import { Injectable } from '@nestjs/common';
import { UserRole } from '../../types/roles';

export interface IRoleMapping {
  systemRole: string;
  internalRole: UserRole;
  permissions: string[];
  description: string;
}

@Injectable()
export class RoleMappingService {
  private readonly roleMappings: IRoleMapping[] = [
    {
      systemRole: 'admin_role',
      internalRole: UserRole.SUPER_ADMIN,
      permissions: ['*'],
      description: 'Полный доступ ко всем функциям системы',
    },
    {
      systemRole: 'manager_role',
      internalRole: UserRole.NETWORK_MANAGER,
      permissions: [
        'network_management',
        'store_management',
        'brand_management',
        'analytics',
      ],
      description: 'Управление сетями, магазинами и брендами',
    },
    {
      systemRole: 'retailer_role',
      internalRole: UserRole.STORE_MANAGER,
      permissions: ['store_management', 'loyalty_cards', 'analytics'],
      description: 'Управление магазинами и картами лояльности',
    },
    {
      systemRole: 'brand_role',
      internalRole: UserRole.BRAND_MANAGER,
      permissions: ['brand_management', 'marketing_campaigns', 'analytics'],
      description: 'Управление брендами и маркетинговыми кампаниями',
    },
    {
      systemRole: 'user_role',
      internalRole: UserRole.USER,
      permissions: ['view_cards', 'use_loyalty', 'personal_data'],
      description: 'Базовый пользователь с доступом к картам лояльности',
    },
  ];

  /**
   * Получить внутреннюю роль по системной роли
   */
  getInternalRole(systemRole: string): UserRole | null {
    const mapping = this.roleMappings.find(m => m.systemRole === systemRole);
    return mapping ? mapping.internalRole : null;
  }

  /**
   * Получить системную роль по внутренней роли
   */
  getSystemRole(internalRole: UserRole): string | null {
    const mapping = this.roleMappings.find(
      m => m.internalRole === internalRole
    );
    return mapping ? mapping.systemRole : null;
  }

  /**
   * Получить разрешения для роли
   */
  getPermissions(role: UserRole | string): string[] {
    const mapping = this.roleMappings.find(
      m => m.systemRole === role || m.internalRole === role
    );
    return mapping ? mapping.permissions : [];
  }

  /**
   * Проверить, имеет ли роль определенное разрешение
   */
  hasPermission(role: UserRole | string, permission: string): boolean {
    const permissions = this.getPermissions(role);
    return permissions.includes('*') || permissions.includes(permission);
  }

  /**
   * Получить все маппинги ролей
   */
  getAllMappings(): IRoleMapping[] {
    return [...this.roleMappings];
  }

  /**
   * Получить описание роли
   */
  getRoleDescription(role: UserRole | string): string {
    const mapping = this.roleMappings.find(
      m => m.systemRole === role || m.internalRole === role
    );
    return mapping?.description ?? 'Роль не найдена';
  }

  /**
   * Проверить валидность системной роли
   */
  isValidSystemRole(systemRole: string): boolean {
    return this.roleMappings.some(m => m.systemRole === systemRole);
  }

  /**
   * Проверить валидность внутренней роли
   */
  isValidInternalRole(internalRole: UserRole): boolean {
    return this.roleMappings.some(m => m.internalRole === internalRole);
  }

  /**
   * Получить иерархию ролей
   */
  getRoleHierarchy(): Record<string, string[]> {
    return {
      [UserRole.SUPER_ADMIN]: [
        UserRole.NETWORK_MANAGER,
        UserRole.STORE_MANAGER,
        UserRole.BRAND_MANAGER,
        UserRole.USER,
      ],
      [UserRole.NETWORK_MANAGER]: [
        UserRole.STORE_MANAGER,
        UserRole.BRAND_MANAGER,
        UserRole.USER,
      ],
      [UserRole.STORE_MANAGER]: [UserRole.USER],
      [UserRole.BRAND_MANAGER]: [UserRole.USER],
      [UserRole.USER]: [],
    };
  }

  /**
   * Проверить, может ли роль управлять другой ролью
   */
  canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
    if (managerRole === UserRole.SUPER_ADMIN) return true;

    const hierarchy = this.getRoleHierarchy();
    const manageableRoles = hierarchy[managerRole] ?? [];

    return manageableRoles.includes(targetRole);
  }
}
