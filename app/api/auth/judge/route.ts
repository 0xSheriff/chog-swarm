import { NextRequest, NextResponse } from 'next/server';
import {
  signSessionPayload,
  SESSION_COOKIE_NAME,
  JUDGE_SESSION_TTL_MS,
  SessionData,
} from '@/lib/auth-session';
import { isJudgeCodeValid, getJudgeCode } from '@/lib/access-config';

export async function POST(request: NextRequest) {
  try {
    const configuredCode = getJudgeCode();
    if (!configuredCode) {
      return NextResponse.json(
        { error: 'Judge pass is not enabled on this deployment.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { code, address, selectedChogId } = body;

    if (!code || !isJudgeCodeValid(code)) {
      return NextResponse.json({ error: 'Invalid Judge Code' }, { status: 401 });
    }

    const judgeAddress = address || '0x000000000000000000000000000000000000Judge';
    const now = Date.now();
    const session: SessionData = {
      address: judgeAddress,
      isHolder: false,
      creatorPass: false,
      judgePass: true,
      selectedChogId: selectedChogId || 143,
      issuedAt: now,
      expiresAt: now + JUDGE_SESSION_TTL_MS,
      lastHoldingCheck: now,
    };

    const cookieValue = signSessionPayload(session);
    const response = NextResponse.json({
      ok: true,
      session: {
        address: session.address,
        isHolder: session.isHolder,
        creatorPass: session.creatorPass,
        judgePass: session.judgePass,
        selectedChogId: session.selectedChogId,
        expiresAt: session.expiresAt,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: cookieValue,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(JUDGE_SESSION_TTL_MS / 1000),
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
