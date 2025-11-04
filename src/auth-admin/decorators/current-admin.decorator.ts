import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Admin } from '../../entities/admin.entity';

/**
 * Custom decorator to extract the current authenticated admin from the request
 * Usage: @CurrentAdmin() admin: Admin
 */
export const CurrentAdmin = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Admin => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // The user is set by JwtAdminAuthGuard
  },
);
