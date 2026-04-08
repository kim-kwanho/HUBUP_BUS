import type { AuthOptions } from 'next-auth/core/types';
import GoogleProvider from 'next-auth/providers/google';
import { supabaseAdmin } from '@src/lib/supabase';
import { fetchHubUpAreaFlags } from '@src/lib/hubup-area-access';

function rolesFromProfile(profile: {
  admin_roles?: unknown;
}): string[] {
  const ar = profile.admin_roles;
  if (!Array.isArray(ar) || ar.length === 0) return [];
  return ar
    .map((r: { roles?: { name?: string } }) => r.roles?.name)
    .filter((n): n is string => Boolean(n));
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-key-for-development',
  useSecureCookies: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development',
  cookies: {
    state: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.state' : 'next-auth.state',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 900
      }
    }
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = (user as { id?: string }).id ?? token.sub;
        token.email = user.email;
        token.name = user.name;
      }

      if (token.sub) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('status, admin_roles(roles(name))')
          .eq('user_id', token.sub)
          .maybeSingle();

        if (profile) {
          const hasAdminRoles = profile.admin_roles && (profile.admin_roles as unknown[]).length > 0;
          const isAdminByStatus = profile.status === '관리자';
          (token as { isAdmin?: boolean }).isAdmin = Boolean(hasAdminRoles || isAdminByStatus);
          (token as { roles?: string[] }).roles = rolesFromProfile(profile);
          (token as { profileStatus?: string | null }).profileStatus =
            typeof profile.status === 'string' ? profile.status : null;
        } else {
          (token as { isAdmin?: boolean }).isAdmin = false;
          (token as { roles?: string[] }).roles = [];
          (token as { profileStatus?: string | null }).profileStatus = null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        const sUser = session.user as {
          id?: string;
          isNewUser?: boolean;
          isAdmin?: boolean;
          roles?: string[];
          name?: string | null;
          profileStatus?: string | null;
          hubupArea?: { bus: boolean; inquiries: boolean };
        };
        sUser.id = token.sub;
        sUser.profileStatus = (token as { profileStatus?: string | null }).profileStatus ?? null;

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*, admin_roles(roles(name))')
          .eq('user_id', token.sub)
          .maybeSingle();

        if (!profile) {
          await supabaseAdmin.from('profiles').insert({
            user_id: token.sub,
            email: (token as { email?: string | null }).email,
            name: (token as { name?: string | null }).name
          });
          sUser.isNewUser = true;
          sUser.isAdmin = false;
          sUser.roles = [];
          sUser.profileStatus = null;
        } else {
          sUser.isNewUser = !profile.birth_date;
          sUser.name = profile.name;
          const hasAdminRoles = profile.admin_roles && (profile.admin_roles as unknown[]).length > 0;
          const isAdminByStatus = profile.status === '관리자';
          sUser.isAdmin = Boolean(hasAdminRoles || isAdminByStatus);
          sUser.roles = hasAdminRoles ? rolesFromProfile(profile) : [];
          sUser.profileStatus = typeof profile.status === 'string' ? profile.status : null;
        }

        try {
          sUser.hubupArea = await fetchHubUpAreaFlags(sUser.roles ?? []);
        } catch {
          sUser.hubupArea = { bus: false, inquiries: false };
        }
      }
      return session;
    }
  }
};
