import { DefaultSession } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      isNewUser?: boolean;
      isAdmin?: boolean;
      roles?: string[];
      /** `profiles.status` — HUBUP 권한 분리에 사용 */
      profileStatus?: string | null;
      /** `admin_menus`(HUBUP 고정 2개) + `admin_menu_roles` 기준 접근 플래그 */
      hubupArea?: { bus: boolean; inquiries: boolean };
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    isAdmin?: boolean;
    roles?: string[];
    profileStatus?: string | null;
    hubupArea?: { bus: boolean; inquiries: boolean };
  }
}

