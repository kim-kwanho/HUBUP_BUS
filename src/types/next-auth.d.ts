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
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    isAdmin?: boolean;
    roles?: string[];
    profileStatus?: string | null;
  }
}

