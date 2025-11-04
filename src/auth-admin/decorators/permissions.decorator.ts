import { SetMetadata } from '@nestjs/common';
import { AdminPermission } from '../../common/enums';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Custom decorator to specify required permissions for a route
 * The admin must have ALL the specified permissions to access the route
 * Super-admin always has access to all routes
 *
 * Usage: @RequirePermissions(AdminPermission.EVENTS_READ, AdminPermission.EVENTS_UPDATE)
 */
export const RequirePermissions = (...permissions: AdminPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
