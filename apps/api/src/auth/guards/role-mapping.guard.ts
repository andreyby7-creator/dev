import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '../../types/roles';
import { RoleMappingService } from '../services/role-mapping.service';

export interface IRequiredPermission {
  _resource: string;
  operation: string;
  roles?: UserRole[];
}

@Injectable()
export class RoleMappingGuard implements CanActivate {
  private readonly logger = new Logger(RoleMappingGuard.name);

  constructor(
    private reflector: Reflector,
    private roleMappingService: RoleMappingService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Получаем метаданные из декораторов
    const roles = this.reflector.get<UserRole[]>(
      'roles',
      context.getHandler()
    ) as UserRole[] | undefined;
    const resource = this.reflector.get<string>(
      'resource',
      context.getHandler()
    ) as string | undefined;
    const operation = this.reflector.get<string>(
      'operation',
      context.getHandler()
    ) as string | undefined;
    const crud = this.reflector.get<string>('crud', context.getHandler()) as
      | string
      | undefined;

    // Если нет декораторов, разрешаем доступ
    if (
      roles === undefined &&
      resource === undefined &&
      operation === undefined &&
      crud === undefined
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.id === undefined || user.id === '') {
      throw new ForbiddenException('Пользователь не аутентифицирован');
    }

    const userRole = user.role as UserRole;

    // Проверяем роли
    if (roles !== undefined && roles.length > 0) {
      if (!roles.includes(userRole)) {
        this.logger.warn(
          `Доступ запрещен: роль ${userRole} не имеет доступа к эндпоинту`
        );
        throw new ForbiddenException(`Доступ запрещен для роли ${userRole}`);
      }
    }

    // Проверяем ресурс и операцию
    if (resource !== undefined && operation !== undefined) {
      const permission = `${resource}_${operation}`;
      if (!this.hasPermission(userRole, { _resource: resource, operation })) {
        this.logger.warn(
          `Доступ запрещен: роль ${userRole} не имеет разрешения ${permission}`
        );
        throw new ForbiddenException(
          `Недостаточно прав для ${operation} на ресурсе ${resource}`
        );
      }
    }

    // Проверяем CRUD операции
    if (crud !== undefined && resource !== undefined) {
      const crudPermission = `${resource}_${crud}`;
      if (
        !this.hasPermission(userRole, { _resource: resource, operation: crud })
      ) {
        this.logger.warn(
          `Доступ запрещен: роль ${userRole} не имеет CRUD разрешения ${crudPermission}`
        );
        throw new ForbiddenException(
          `Недостаточно прав для ${crud} на ресурсе ${resource}`
        );
      }
    }

    this.logger.log(
      `Доступ разрешен для роли ${userRole} к ресурсу ${resource ?? 'N/A'}`
    );
    return true;
  }

  private hasPermission(
    userRole: UserRole,
    permission: IRequiredPermission
  ): boolean {
    // Проверяем, есть ли ограничения по ролям
    if (permission.roles && permission.roles.length > 0) {
      if (!permission.roles.includes(userRole)) {
        return false;
      }
    }

    // Проверяем разрешения через RoleMappingService
    const requiredPermission = `${permission._resource}_${permission.operation}`;

    return (
      this.roleMappingService.hasPermission(userRole, requiredPermission) ||
      this.roleMappingService.hasPermission(userRole, '*')
    );
  }

  /**
   * Проверить доступ к ресурсу
   */
  canAccessResource(userRole: UserRole, _resource: string): boolean {
    return (
      this.roleMappingService.hasPermission(userRole, `${_resource}_read`) ||
      this.roleMappingService.hasPermission(userRole, '*')
    );
  }

  /**
   * Проверить возможность выполнения операции
   */
  canPerformOperation(
    userRole: UserRole,
    _resource: string,
    operation: string
  ): boolean {
    const permission = `${_resource}_${operation}`;
    return (
      this.roleMappingService.hasPermission(userRole, permission) ||
      this.roleMappingService.hasPermission(userRole, '*')
    );
  }

  /**
   * Проверить CRUD права
   */
  canCreate(userRole: UserRole, _resource: string): boolean {
    return this.canPerformOperation(userRole, _resource, 'create');
  }

  canRead(userRole: UserRole, _resource: string): boolean {
    return this.canPerformOperation(userRole, _resource, 'read');
  }

  canUpdate(userRole: UserRole, _resource: string): boolean {
    return this.canPerformOperation(userRole, _resource, 'update');
  }

  canDelete(userRole: UserRole, _resource: string): boolean {
    return this.canPerformOperation(userRole, _resource, 'delete');
  }

  /**
   * Проверить специальные права
   */
  canManageUsers(userRole: UserRole): boolean {
    return (
      this.roleMappingService.hasPermission(userRole, 'user_management') ||
      this.roleMappingService.hasPermission(userRole, '*')
    );
  }

  canViewAnalytics(userRole: UserRole): boolean {
    return (
      this.roleMappingService.hasPermission(userRole, 'analytics') ||
      this.roleMappingService.hasPermission(userRole, '*')
    );
  }

  canManageBilling(userRole: UserRole): boolean {
    return (
      this.roleMappingService.hasPermission(userRole, 'billing_management') ||
      this.roleMappingService.hasPermission(userRole, '*')
    );
  }
}
