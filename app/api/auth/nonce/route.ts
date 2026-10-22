import { NextRequest, NextResponse } from 'next/server';
import { createNonce, checkRateLimit } from '@/lib/auth-session';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many nonce requests. Please slow down.' },
      { status: 429 }
    );
  }

  const nonce = createNonce(ip);
  return NextResponse.json({ nonce });
}
