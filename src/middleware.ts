import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { fetchHubUpAreaFlags } from '@src/lib/hubup-area-access';
import {
  hubUpHasAdminAreaAccess,
  hubUpHasBusAccess,
  hubUpHasInquiriesAccess,
  hubUpHasOrgWideAdmin
} from '@src/lib/hubup-permissions';
import { HUBUP_INQUIRIES_ENABLED } from '@src/lib/hubup-inquiries-feature';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  if (!token) {
    const url = new URL('/api/auth/signin', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  const roles = (token.roles as string[] | undefined) ?? [];
  const profileStatus = (token as { profileStatus?: string | null }).profileStatus ?? undefined;

  let hubupArea: { bus: boolean; inquiries: boolean } = { bus: false, inquiries: false };
  try {
    hubupArea = await fetchHubUpAreaFlags(roles);
  } catch {
    /* 테이블 미적용 시 레거시 역할명만으로 판별 */
  }

  if (pathname.startsWith('/admin/inquiries') && !HUBUP_INQUIRIES_ENABLED) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (!hubUpHasAdminAreaAccess(roles, profileStatus, hubupArea)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (pathname.startsWith('/admin/users') && !hubUpHasOrgWideAdmin(profileStatus)) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (pathname.startsWith('/admin/access') && !hubUpHasOrgWideAdmin(profileStatus)) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (pathname.startsWith('/admin/inquiries') && !hubUpHasInquiriesAccess(roles, profileStatus, hubupArea)) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (pathname.startsWith('/admin/bus-requests') && !hubUpHasBusAccess(roles, profileStatus, hubupArea)) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};
