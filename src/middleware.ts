import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  if (pathname === '/admin') {
    return NextResponse.redirect(new URL('/admin/bus-requests', request.url));
  }

  if (!pathname.startsWith('/admin/bus-requests')) {
    return NextResponse.redirect(new URL('/admin/bus-requests', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};
