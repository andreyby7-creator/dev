import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAuthUser } from './unified-auth.service';
import { UnifiedAuthService } from './unified-auth.service';

export interface IPermission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
}

export interface IRole {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IResource {
  id: string;
  name: string;
  type: string;
  owner?: string;
  metadata: Record<string, unknown>;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IAccessControlEntry {
  id: string;
  principal: string; // user ID или role ID
  principalType: 'user' | 'role';
  resource: string;
  permissions: string[];
  granted: boolean;
  conditions?: Record<string, unknown>;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthorizationResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: string[];
  userPermissions?: string[];
  conditions?: Record<string, unknown>;
}

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);
  private permissions = new Map<string, IPermission>();
  private roles = new Map<string, IRole>();
  private resources = new Map<string, IResource>();
  private accessControlEntries = new Map<string, IAccessControlEntry>();

  constructor(
    private readonly _configService: ConfigService,
    private readonly _unifiedAuthService: UnifiedAuthService
  ) {
    this.initializeDefaultPermissions();
    this.initializeDefaultRoles();
    // Используем сервисы
    this._configService.get('AUTHORIZATION_ENABLED');
    void this._unifiedAuthService.getUserById('system');
  }

  private initializeDefaultPermissions(): void {
    const defaultPermissions: IPermission[] = [
      // Profile permissions
      {
        id: 'read:profile',
        name: 'Read Profile',
        description: 'Read user profile',
        resource: 'profile',
        action: 'read',
      },
      {
        id: 'update:profile',
        name: 'Update Profile',
        description: 'Update user profile',
        resource: 'profile',
        action: 'update',
      },
      {
        id: 'delete:profile',
        name: 'Delete Profile',
        description: 'Delete user profile',
        resource: 'profile',
        action: 'delete',
      },

      // User management permissions
      {
        id: 'read:users',
        name: 'Read Users',
        description: 'Read user information',
        resource: 'users',
        action: 'read',
      },
      {
        id: 'create:users',
        name: 'Create Users',
        description: 'Create new users',
        resource: 'users',
        action: 'create',
      },
      {
        id: 'update:users',
        name: 'Update Users',
        description: 'Update user information',
        resource: 'users',
        action: 'update',
      },
      {
        id: 'delete:users',
        name: 'Delete Users',
        description: 'Delete users',
        resource: 'users',
        action: 'delete',
      },

      // Cards permissions
      {
        id: 'read:cards',
        name: 'Read Cards',
        description: 'Read cards',
        resource: 'cards',
        action: 'read',
      },
      {
        id: 'create:cards',
        name: 'Create Cards',
        description: 'Create new cards',
        resource: 'cards',
        action: 'create',
      },
      {
        id: 'update:cards',
        name: 'Update Cards',
        description: 'Update cards',
        resource: 'cards',
        action: 'update',
      },
      {
        id: 'delete:cards',
        name: 'Delete Cards',
        description: 'Delete cards',
        resource: 'cards',
        action: 'delete',
      },

      // Monitoring permissions
      {
        id: 'read:monitoring',
        name: 'Read Monitoring',
        description: 'Read monitoring data',
        resource: 'monitoring',
        action: 'read',
      },
      {
        id: 'update:monitoring',
        name: 'Update Monitoring',
        description: 'Update monitoring settings',
        resource: 'monitoring',
        action: 'update',
      },

      // Security permissions
      {
        id: 'read:security',
        name: 'Read Security',
        description: 'Read security information',
        resource: 'security',
        action: 'read',
      },
      {
        id: 'update:security',
        name: 'Update Security',
        description: 'Update security settings',
        resource: 'security',
        action: 'update',
      },

      // Configuration permissions
      {
        id: 'read:config',
        name: 'Read Config',
        description: 'Read configuration',
        resource: 'config',
        action: 'read',
      },
      {
        id: 'update:config',
        name: 'Update Config',
        description: 'Update configuration',
        resource: 'config',
        action: 'update',
      },

      // Admin permissions
      {
        id: 'admin:all',
        name: 'Admin All',
        description: 'Full administrative access',
        resource: '*',
        action: '*',
      },
    ];

    defaultPermissions.forEach(permission => {
      this.permissions.set(permission.id, permission);
    });

    this.logger.log(
      `Initialized ${defaultPermissions.length} default permissions`
    );
  }

  private initializeDefaultRoles(): void {
    const defaultRoles: IRole[] = [
      {
        id: 'user',
        name: 'user',
        displayName: 'User',
        description: 'Basic user role',
        permissions: [
          'read:profile',
          'update:profile',
          'read:cards',
          'create:cards',
          'update:cards',
        ],
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'admin',
        name: 'admin',
        displayName: 'Administrator',
        description: 'Administrator role with extended permissions',
        permissions: [
          'read:profile',
          'update:profile',
          'delete:profile',
          'read:users',
          'create:users',
          'update:users',
          'delete:users',
          'read:cards',
          'create:cards',
          'update:cards',
          'delete:cards',
          'read:monitoring',
          'update:monitoring',
          'read:security',
          'update:security',
          'read:config',
          'update:config',
        ],
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'super_admin',
        name: 'super_admin',
        displayName: 'Super Administrator',
        description: 'Super administrator with full system access',
        permissions: ['admin:all'],
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'moderator',
        name: 'moderator',
        displayName: 'Moderator',
        description: 'Moderator role for content management',
        permissions: [
          'read:profile',
          'update:profile',
          'read:users',
          'update:users',
          'read:cards',
          'create:cards',
          'update:cards',
          'delete:cards',
          'read:monitoring',
        ],
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultRoles.forEach(role => {
      this.roles.set(role.id, role);
    });

    this.logger.log(`Initialized ${defaultRoles.length} default roles`);
  }

  async checkPermission(
    user: IAuthUser,
    resource: string,
    action: string,
    resourceId?: string,
    context?: Record<string, unknown>
  ): Promise<IAuthorizationResult> {
    try {
      // 1. Проверяем системные роли (super_admin имеет доступ ко всему)
      if (user.roles.includes('super_admin')) {
        return {
          allowed: true,
          userPermissions: user.permissions,
          conditions: { role: 'super_admin' },
        };
      }

      // 2. Проверяем прямые разрешения пользователя
      const requiredPermission = `${action}:${resource}`;
      const wildcardPermission = `admin:all`;

      if (
        user.permissions.includes(requiredPermission) ||
        user.permissions.includes(wildcardPermission)
      ) {
        return {
          allowed: true,
          userPermissions: user.permissions,
          requiredPermissions: [requiredPermission],
        };
      }

      // 3. Проверяем разрешения через роли
      const rolePermissions = await this.getRolePermissions(user.roles);
      if (
        rolePermissions.includes(requiredPermission) ||
        rolePermissions.includes(wildcardPermission)
      ) {
        return {
          allowed: true,
          userPermissions: user.permissions,
          requiredPermissions: [requiredPermission],
          conditions: { roles: user.roles },
        };
      }

      // 4. Проверяем ACL (Access Control List)
      const aclResult = await this.checkACL(
        user.id,
        resource,
        action,
        resourceId,
        context
      );
      if (aclResult.allowed) {
        return aclResult;
      }

      // 5. Проверяем владение ресурсом
      if (
        resourceId != null &&
        resourceId !== '' &&
        (await this.isResourceOwner(user.id, resource, resourceId))
      ) {
        return {
          allowed: true,
          userPermissions: user.permissions,
          conditions: { ownership: true },
        };
      }

      return {
        allowed: false,
        reason: 'Insufficient permissions',
        requiredPermissions: [requiredPermission],
        userPermissions: user.permissions,
      };
    } catch (error) {
      this.logger.error('Authorization check error:', error);
      return {
        allowed: false,
        reason: 'Authorization check failed',
        userPermissions: user.permissions,
      };
    }
  }

  async checkMultiplePermissions(
    user: IAuthUser,
    permissions: Array<{
      resource: string;
      action: string;
      resourceId?: string;
    }>,
    context?: Record<string, unknown>
  ): Promise<Record<string, IAuthorizationResult>> {
    const results: Record<string, IAuthorizationResult> = {};

    for (const permission of permissions) {
      const key = `${permission.action}:${permission.resource}${permission.resourceId != null && permission.resourceId !== '' ? `:${permission.resourceId}` : ''}`;
      results[key] = await this.checkPermission(
        user,
        permission.resource,
        permission.action,
        permission.resourceId,
        context
      );
    }

    return results;
  }

  async hasPermission(
    user: IAuthUser,
    permission: string,
    context?: Record<string, unknown>
  ): Promise<boolean> {
    const [action, resource] = permission.split(':');
    if (
      action == null ||
      action === '' ||
      resource == null ||
      resource === ''
    ) {
      return false;
    }

    const result = await this.checkPermission(
      user,
      resource,
      action,
      undefined,
      context
    );
    return result.allowed;
  }

  async hasAnyPermission(
    user: IAuthUser,
    permissions: string[],
    context?: Record<string, unknown>
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(user, permission, context)) {
        return true;
      }
    }
    return false;
  }

  async hasAllPermissions(
    user: IAuthUser,
    permissions: string[],
    context?: Record<string, unknown>
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (!(await this.hasPermission(user, permission, context))) {
        return false;
      }
    }
    return true;
  }

  async getRolePermissions(roleNames: string[]): Promise<string[]> {
    const permissions = new Set<string>();

    for (const roleName of roleNames) {
      const role = this.roles.get(roleName);
      if (role) {
        role.permissions.forEach(permission => permissions.add(permission));
      }
    }

    return Array.from(permissions);
  }

  async createRole(
    role: Omit<IRole, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<IRole> {
    const id = `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRole: IRole = {
      ...role,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.roles.set(id, newRole);
    this.logger.log(`Created role: ${id}`);

    return newRole;
  }

  async updateRole(id: string, updates: Partial<IRole>): Promise<IRole | null> {
    const role = this.roles.get(id);
    if (!role) {
      return null;
    }

    if (role.isSystem) {
      throw new Error('Cannot modify system roles');
    }

    const updatedRole = {
      ...role,
      ...updates,
      id, // Не позволяем изменять ID
      updatedAt: new Date(),
    };

    this.roles.set(id, updatedRole);
    this.logger.log(`Updated role: ${id}`);

    return updatedRole;
  }

  async deleteRole(id: string): Promise<boolean> {
    const role = this.roles.get(id);
    if (!role) {
      return false;
    }

    if (role.isSystem) {
      throw new Error('Cannot delete system roles');
    }

    this.roles.delete(id);
    this.logger.log(`Deleted role: ${id}`);
    return true;
  }

  async getRole(id: string): Promise<IRole | null> {
    return this.roles.get(id) ?? null;
  }

  async getAllRoles(): Promise<IRole[]> {
    return Array.from(this.roles.values());
  }

  async createPermission(
    permission: Omit<IPermission, 'id'>
  ): Promise<IPermission> {
    const id = `perm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newPermission: IPermission = {
      ...permission,
      id,
    };

    this.permissions.set(id, newPermission);
    this.logger.log(`Created permission: ${id}`);

    return newPermission;
  }

  async getPermission(id: string): Promise<IPermission | null> {
    return this.permissions.get(id) ?? null;
  }

  async getAllPermissions(): Promise<IPermission[]> {
    return Array.from(this.permissions.values());
  }

  async createACLEntry(
    entry: Omit<IAccessControlEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<IAccessControlEntry> {
    const id = `acl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newEntry: IAccessControlEntry = {
      ...entry,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.accessControlEntries.set(id, newEntry);
    this.logger.log(`Created ACL entry: ${id}`);

    return newEntry;
  }

  async getACLEntries(
    principal?: string,
    resource?: string
  ): Promise<IAccessControlEntry[]> {
    let entries = Array.from(this.accessControlEntries.values());

    if (principal != null) {
      entries = entries.filter(entry => entry.principal === principal);
    }

    if (resource != null) {
      entries = entries.filter(entry => entry.resource === resource);
    }

    return entries;
  }

  private async checkACL(
    userId: string,
    resource: string,
    action: string,
    _resourceId?: string,
    context?: Record<string, unknown>
  ): Promise<IAuthorizationResult> {
    const entries = Array.from(this.accessControlEntries.values()).filter(
      entry =>
        entry.principal === userId &&
        entry.resource === resource &&
        entry.granted &&
        (!entry.expiresAt || entry.expiresAt > new Date())
    );

    for (const entry of entries) {
      if (
        entry.permissions.includes(action) ||
        entry.permissions.includes('*')
      ) {
        // Проверяем условия если есть
        if (entry.conditions && context) {
          const conditionsMet = this.evaluateConditions(
            entry.conditions,
            context
          );
          if (!conditionsMet) {
            continue;
          }
        }

        return {
          allowed: true,
          userPermissions: [action],
          conditions: entry.conditions ?? {},
        };
      }
    }

    return {
      allowed: false,
      reason: 'No matching ACL entry found',
    };
  }

  private async isResourceOwner(
    userId: string,
    _resource: string,
    resourceId: string
  ): Promise<boolean> {
    const resourceEntry = this.resources.get(resourceId);
    return resourceEntry?.owner === userId;
  }

  private evaluateConditions(
    conditions: Record<string, unknown>,
    context: Record<string, unknown>
  ): boolean {
    for (const [key, expectedValue] of Object.entries(conditions)) {
      const actualValue = context[key];
      if (actualValue !== expectedValue) {
        return false;
      }
    }
    return true;
  }
}
