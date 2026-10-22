import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isPublicPath } from '@/lib/access-config';
import { SESSION_COOKIE_NAME } from '@/lib/auth-session';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Static files and public paths pass freely
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  // If calling write or execution APIs without any session cookie, block with 401 immediately
  if (!sessionCookie?.value) {
    if (
      pathname.startsWith('/api/arena/run') ||
      pathname.startsWith('/api/lab/run') ||
      pathname.startsWith('/api/gauntlet/submit')
    ) {
      return NextResponse.json(
        {
          error: 'Unauthorized: Active Chog holder session required.',
          blocked: true,
        },
        { status: 401 }
      );
    }
  }

  // Next.js passes request to page route where GateGuard enforces UI block state
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
