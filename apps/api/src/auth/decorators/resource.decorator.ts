import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../types/roles';
import type { IRequiredPermission } from '../guards/role-mapping.guard';

/**
 * Ключ метаданных для ресурса
 */
export const RESOURCE_KEY = 'resource';

/**
 * Декоратор для указания ресурса
 */
export const Resource = (__resource: string) =>
  SetMetadata(RESOURCE_KEY, __resource);

/**
 * Декоратор для указания операции
 */
export const Operation = (operation: string) =>
  SetMetadata('operation', operation);

/**
 * Декоратор для CRUD операций
 */
export const CRUD = (
  __resource: string,
  operations: ('create' | 'read' | 'update' | 'delete')[] = ['read']
) => {
  const permissions: IRequiredPermission[] = operations.map(operation => ({
    _resource: __resource,
    operation,
  }));
  return SetMetadata('requiredPermissions', permissions);
};

/**
 * Декоратор для создания
 */
export const Create = (__resource: string) => CRUD(__resource, ['create']);

/**
 * Декоратор для чтения
 */
export const Read = (__resource: string) => CRUD(__resource, ['read']);

/**
 * Декоратор для обновления
 */
export const Update = (__resource: string) => CRUD(__resource, ['update']);

/**
 * Декоратор для удаления
 */
export const Delete = (__resource: string) => CRUD(__resource, ['delete']);

/**
 * Декоратор для полного CRUD доступа
 */
export const FullAccess = (__resource: string) =>
  CRUD(__resource, ['create', 'read', 'update', 'delete']);

/**
 * Декоратор для модуля ресурса
 */
export const ModuleResource = (module: string) => SetMetadata('module', module);

/**
 * Декоратор для специальных разрешений
 */
export const Permission = (permission: string, roles?: UserRole[]) => {
  const [_resource, operation] = permission.split('_');
  const requiredPermission: IRequiredPermission = {
    _resource: _resource ?? '',
    operation: operation ?? '',
    ...(roles && { roles }),
  };
  return SetMetadata('requiredPermissions', [requiredPermission]);
};

/**
 * Декоратор для множественных разрешений
 */
export const Permissions = (permissions: IRequiredPermission[]) => {
  return SetMetadata('requiredPermissions', permissions);
};
