import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '../../common/enums';

export const ROLES_KEY = 'roles';

/**
 * Custom decorator to specify required roles for a route
 * Usage: @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
 */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);
