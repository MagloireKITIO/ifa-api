import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole, AdminPermission } from '../../common/enums';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Admin } from '../../entities/admin.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<
      AdminPermission[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // If no permissions are required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
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

    // Check if admin has all required permissions
    if (!admin.permissions || admin.permissions.length === 0) {
      throw new ForbiddenException(
        `You do not have any permissions assigned. Required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    // Check if admin has ALL required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      admin.permissions.includes(permission),
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(
        (permission) => !admin.permissions.includes(permission),
      );

      throw new ForbiddenException(
        `You lack the following permissions: ${missingPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
