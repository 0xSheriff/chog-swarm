import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  validateAndRefreshSession,
  signSessionPayload,
  STANDARD_SESSION_TTL_MS,
} from '@/lib/auth-session';

export async function GET(request: NextRequest) {
  try {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!cookie) {
      return NextResponse.json({ authenticated: false, session: null });
    }

    const { session, needsCookieUpdate, error } = await validateAndRefreshSession(cookie);

    if (!session) {
      const response = NextResponse.json({
        authenticated: false,
        session: null,
        error: error || 'Session expired or invalidated.',
      });
      // Clear cookie
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
      return response;
    }

    const response = NextResponse.json({
      authenticated: true,
      session: {
        address: session.address,
        isHolder: session.isHolder,
        creatorPass: session.creatorPass,
        judgePass: session.judgePass,
        selectedChogId: session.selectedChogId,
        expiresAt: session.expiresAt,
      },
    });

    if (needsCookieUpdate) {
      const updatedCookie = signSessionPayload(session);
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: updatedCookie,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: Math.floor((session.expiresAt - Date.now()) / 1000),
      });
    }

    return response;
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, session: null, error: err.message }, { status: 500 });
  }
}
