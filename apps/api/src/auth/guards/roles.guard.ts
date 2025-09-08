import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '../../types/roles';
import type { IRequestWithUser } from './jwt-auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      UserRole[] | undefined
    >('roles', [context.getHandler(), context.getClass()]);

    if (requiredRoles == null || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<IRequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not found in request');
    }

    const hasRole = requiredRoles.some(role => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `User role ${user.role} is not authorized. Required roles: ${requiredRoles.join(', ')}`
      );
    }

    return true;
  }
}
