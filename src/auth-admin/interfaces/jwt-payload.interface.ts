import { AdminRole } from '../../common/enums';

export interface JwtPayload {
  sub: string; // Admin ID
  email: string;
  role: AdminRole;
  permissions: string[];
  type: 'access' | 'refresh';
  iat?: number; // Issued at
  exp?: number; // Expiration
}
