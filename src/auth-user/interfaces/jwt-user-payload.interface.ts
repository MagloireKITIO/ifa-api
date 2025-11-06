import { Language } from '../../common/enums';

export interface JwtUserPayload {
  sub: string; // User ID
  email?: string;
  phoneNumber?: string;
  preferredLanguage: Language;
  type: 'access' | 'refresh';
}
