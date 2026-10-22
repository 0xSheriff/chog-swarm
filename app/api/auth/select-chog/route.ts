import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
  signSessionPayload,
} from '@/lib/auth-session';

export async function POST(request: NextRequest) {
  try {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = verifySessionCookie(cookie);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const body = await request.json();
    const { tokenId } = body;

    if (!tokenId || typeof tokenId !== 'number') {
      return NextResponse.json({ error: 'Valid tokenId required' }, { status: 400 });
    }

    session.selectedChogId = tokenId;
    const updatedCookie = signSessionPayload(session);

    const response = NextResponse.json({ ok: true, selectedChogId: tokenId });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: updatedCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor((session.expiresAt - Date.now()) / 1000),
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
