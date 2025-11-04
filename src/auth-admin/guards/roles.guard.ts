import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '../../common/enums';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Admin } from '../../entities/admin.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get admin from request (set by JwtAdminAuthGuard)
    const request = context.switchToHttp().getRequest();
    const admin: Admin = request.user;

    if (!admin) {
      throw new ForbiddenException('Admin not found in request');
    }

    // Super admin has access to everything
    if (admin.role === AdminRole.SUPER_ADMIN) {
      return true;
    }

    // Check if admin has one of the required roles
    const hasRole = requiredRoles.some((role) => admin.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Admin role ${admin.role} does not have access to this resource. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
