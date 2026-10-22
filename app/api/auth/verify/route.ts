import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage, type Address } from 'viem';
import {
  parseSiweMessage,
  consumeNonce,
  checkChogHolding,
  signSessionPayload,
  SESSION_COOKIE_NAME,
  STANDARD_SESSION_TTL_MS,
  SessionData,
} from '@/lib/auth-session';
import { isAllowlisted } from '@/lib/access-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, signature } = body;

    if (!message || !signature) {
      return NextResponse.json({ error: 'Missing message or signature' }, { status: 400 });
    }

    const siwe = parseSiweMessage(message);
    if (!siwe || !siwe.address || !siwe.nonce) {
      return NextResponse.json({ error: 'Malformed EIP-4361 message' }, { status: 400 });
    }

    // Verify chain ID is 143 (Monad Mainnet)
    if (siwe.chainId && siwe.chainId !== 143) {
      return NextResponse.json({ error: `Invalid chain ID. Expected 143 (Monad), got ${siwe.chainId}` }, { status: 400 });
    }

    // Check expiration if present
    if (siwe.expirationTime && Date.now() > new Date(siwe.expirationTime).getTime()) {
      return NextResponse.json({ error: 'Signature message has expired. Please sign again.' }, { status: 400 });
    }

    // Single-use nonce check
    const validNonce = consumeNonce(siwe.nonce);
    if (!validNonce) {
      return NextResponse.json({ error: 'Invalid or already consumed nonce. Please request a new nonce.' }, { status: 400 });
    }

    // Verify cryptographic signature with viem
    let isValidSignature = false;
    try {
      isValidSignature = await verifyMessage({
        address: siwe.address as Address,
        message,
        signature,
      });
    } catch (err: any) {
      return NextResponse.json({ error: `Signature verification failed: ${err.message}` }, { status: 400 });
    }

    if (!isValidSignature) {
      return NextResponse.json({ error: 'Cryptographic signature is invalid.' }, { status: 401 });
    }

    const walletAddress = siwe.address.toLowerCase();

    // Check Access Rules:
    // (a) holds at least one Chog on Monad (chain 143)
    // (b) address is in OWNER_ALLOWLIST
    const allowlisted = isAllowlisted(walletAddress);
    let isHolder = false;

    // Check holding
    const holdingResult = await checkChogHolding(walletAddress);

    if (!holdingResult.ok) {
      // If allowlisted, creator pass can still proceed even if RPC has issues
      if (allowlisted) {
        isHolder = false;
      } else {
        // FAIL CLOSED: Never fail open on RPC error
        return NextResponse.json(
          { error: holdingResult.error || 'Monad RPC unavailable to verify Chog holding. Please try again.' },
          { status: 503 }
        );
      }
    } else {
      isHolder = holdingResult.isHolder;
    }

    if (!isHolder && !allowlisted) {
      return NextResponse.json(
        {
          error: 'This wallet holds no Chog Genesis NFT and is not on the creator allowlist.',
          blocked: true,
          address: siwe.address,
        },
        { status: 403 }
      );
    }

    const creatorPass = !isHolder && allowlisted;
    const now = Date.now();
    const session: SessionData = {
      address: siwe.address,
      isHolder,
      creatorPass,
      judgePass: false,
      issuedAt: now,
      expiresAt: now + STANDARD_SESSION_TTL_MS,
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
      maxAge: Math.floor(STANDARD_SESSION_TTL_MS / 1000),
    });

    return response;
  } catch (err: any) {
    console.error('[auth/verify] error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
