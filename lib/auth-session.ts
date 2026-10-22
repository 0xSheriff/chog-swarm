/**
 * lib/auth-session.ts — Server-side Proof-of-Wallet & Session Management.
 *
 * Implements:
 * - Single-use cryptographic nonces with 10-minute expiry & rate limiting.
 * - EIP-4361 SIWE message formatting & viem verification on Chain ID 143.
 * - Live on-chain Chog Genesis balanceOf checks with 15-minute holding cache.
 * - Safe fail-closed semantics on RPC failure.
 * - Cryptographically signed session cookies (HMAC-SHA256, 12-hr standard, 24-hr judge).
 * - Automatic re-check on session validation when cache window expires.
 */

import crypto from 'crypto';
import { verifyMessage, type Address } from 'viem';
import { monadPublicClient, ERC721_ABI, CHOG_GENESIS_ADDRESS } from './monad-chain';
import { isAllowlisted, isJudgeCodeValid } from './access-config';

export const SESSION_COOKIE_NAME = 'chog_session';
export const STANDARD_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
export const JUDGE_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const HOLDING_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const NONCE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface SessionData {
  address: string;
  isHolder: boolean;
  creatorPass: boolean;
  judgePass: boolean;
  selectedChogId?: number;
  issuedAt: number;
  expiresAt: number;
  lastHoldingCheck: number;
}

// ── In-Memory Store for Single-Use Nonces & Rate Limiting ────────────────────

interface NonceRecord {
  nonce: string;
  expiresAt: number;
  ip: string;
}

const nonceStore = new Map<string, NonceRecord>();
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit for an IP (max 30 requests per minute).
 */
export function checkRateLimit(ip: string, maxRequests = 30, windowMs = 60 * 1000): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) {
    return false;
  }
  record.count++;
  return true;
}

/**
 * Generates a random cryptographic single-use nonce.
 */
export function createNonce(ip = 'unknown'): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const now = Date.now();

  // Purge expired nonces periodically
  if (nonceStore.size > 2000) {
    for (const [k, v] of nonceStore.entries()) {
      if (now > v.expiresAt) nonceStore.delete(k);
    }
  }

  nonceStore.set(nonce, {
    nonce,
    expiresAt: now + NONCE_TTL_MS,
    ip,
  });

  return nonce;
}

/**
 * Validates and immediately consumes a single-use nonce.
 */
export function consumeNonce(nonce: string): boolean {
  if (!nonce) return false;
  const record = nonceStore.get(nonce);
  if (!record) return false;

  // Consume immediately
  nonceStore.delete(nonce);

  if (Date.now() > record.expiresAt) {
    return false;
  }
  return true;
}

// ── On-Chain Holding Cache & Check (Fail-Closed) ─────────────────────────────

interface HoldingCacheRecord {
  isHolder: boolean;
  balance: number;
  checkedAt: number;
}

const holdingCache = new Map<string, HoldingCacheRecord>();

const ERC721_BALANCE_OF_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export interface HoldingCheckResult {
  ok: boolean;
  isHolder: boolean;
  balance: number;
  error?: string;
}

/**
 * Checks whether the wallet holds at least one Chog Genesis NFT on Monad (Chain 143).
 * Uses a 15-minute memory cache.
 * FAILS CLOSED on RPC error (returns ok: false).
 */
export async function checkChogHolding(
  address: string,
  forceRefresh = false
): Promise<HoldingCheckResult> {
  const normalized = address.toLowerCase();
  const now = Date.now();

  const cached = holdingCache.get(normalized);
  if (!forceRefresh && cached && now - cached.checkedAt < HOLDING_CACHE_TTL_MS) {
    return { ok: true, isHolder: cached.isHolder, balance: cached.balance };
  }

  try {
    const rawBalance = await monadPublicClient.readContract({
      address: CHOG_GENESIS_ADDRESS,
      abi: ERC721_BALANCE_OF_ABI,
      functionName: 'balanceOf',
      args: [normalized as Address],
    });

    const balance = Number(rawBalance);
    const isHolder = balance > 0;

    holdingCache.set(normalized, {
      isHolder,
      balance,
      checkedAt: now,
    });

    return { ok: true, isHolder, balance };
  } catch (err: any) {
    console.error(`[auth-session] balanceOf check failed for ${normalized}:`, err.message);
    // FAIL CLOSED: Never fail open!
    return {
      ok: false,
      isHolder: false,
      balance: 0,
      error: `Monad RPC check unavailable: ${err.message || 'Network error'}. Please try again.`,
    };
  }
}

/**
 * Manually evict cache (e.g. for testing simulated sale).
 */
export function evictHoldingCache(address: string): void {
  holdingCache.delete(address.toLowerCase());
}

// ── EIP-4361 SIWE Helpers ───────────────────────────────────────────────────

export interface SiweFields {
  domain: string;
  address: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
}

export function buildSiweMessage(fields: SiweFields): string {
  const lines = [
    `${fields.domain} wants you to sign in with your Ethereum account:`,
    fields.address,
    '',
    'Sign in to verify Chog NFT ownership.',
    '',
    `URI: ${fields.uri}`,
    `Version: ${fields.version || '1'}`,
    `Chain ID: ${fields.chainId || 143}`,
    `Nonce: ${fields.nonce}`,
    `Issued At: ${fields.issuedAt}`,
  ];
  if (fields.expirationTime) {
    lines.push(`Expiration Time: ${fields.expirationTime}`);
  }
  return lines.join('\n');
}

export function parseSiweMessage(message: string): Partial<SiweFields> | null {
  try {
    const lines = message.split('\n');
    if (lines.length < 8) return null;

    const domainMatch = lines[0].match(/^(.*) wants you to sign in with your Ethereum account:$/);
    const address = lines[1].trim();

    const fields: Partial<SiweFields> = {
      domain: domainMatch ? domainMatch[1] : undefined,
      address,
    };

    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('URI: ')) fields.uri = line.slice(5).trim();
      else if (line.startsWith('Version: ')) fields.version = line.slice(9).trim();
      else if (line.startsWith('Chain ID: ')) fields.chainId = parseInt(line.slice(10).trim(), 10);
      else if (line.startsWith('Nonce: ')) fields.nonce = line.slice(7).trim();
      else if (line.startsWith('Issued At: ')) fields.issuedAt = line.slice(11).trim();
      else if (line.startsWith('Expiration Time: ')) fields.expirationTime = line.slice(17).trim();
    }

    return fields;
  } catch (_) {
    return null;
  }
}

// ── Cookie Cryptographic Signing (HMAC-SHA256) ──────────────────────────────

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || 'chog_default_dev_session_secret_change_in_production_32b';
}

export function signSessionPayload(data: SessionData): string {
  const json = JSON.stringify(data);
  const payloadB64 = Buffer.from(json, 'utf8').toString('base64url');
  const hmac = crypto.createHmac('sha256', getSessionSecret()).update(payloadB64).digest('hex');
  return `${payloadB64}.${hmac}`;
}

export function verifySessionCookie(cookieValue: string | null | undefined): SessionData | null {
  if (!cookieValue) return null;
  const parts = cookieValue.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, hmacHex] = parts;
  const expectedHmac = crypto.createHmac('sha256', getSessionSecret()).update(payloadB64).digest('hex');

  // Constant-time comparison
  const hmacBuf = Buffer.from(hmacHex, 'hex');
  const expectedBuf = Buffer.from(expectedHmac, 'hex');
  if (hmacBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(hmacBuf, expectedBuf)) {
    return null;
  }

  try {
    const json = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const data: SessionData = JSON.parse(json);

    // Verify expiry
    if (Date.now() > data.expiresAt) {
      return null;
    }

    return data;
  } catch (_) {
    return null;
  }
}

/**
 * Validates session and checks if 15-minute holding re-check is required.
 * Returns updated session or null if revoked/invalid.
 */
export async function validateAndRefreshSession(
  cookieValue: string | null | undefined
): Promise<{ session: SessionData | null; needsCookieUpdate: boolean; error?: string }> {
  const session = verifySessionCookie(cookieValue);
  if (!session) {
    return { session: null, needsCookieUpdate: false };
  }

  // Creator pass and Judge pass do not need on-chain holding re-checks
  if (session.creatorPass || session.judgePass) {
    return { session, needsCookieUpdate: false };
  }

  // Check if 15-minute holding re-check is due
  const now = Date.now();
  if (now - session.lastHoldingCheck > HOLDING_CACHE_TTL_MS) {
    const check = await checkChogHolding(session.address, true);

    if (!check.ok) {
      // RPC failed -> FAIL CLOSED
      return {
        session: null,
        needsCookieUpdate: false,
        error: check.error || 'Monad RPC error during holding re-verification. Access temporarily closed.',
      };
    }

    if (!check.isHolder) {
      // Wallet no longer holds a Chog (sold Chog) -> revoke session immediately!
      return {
        session: null,
        needsCookieUpdate: true,
        error: 'Wallet no longer holds a Chog Genesis NFT. Access revoked.',
      };
    }

    // Refresh lastHoldingCheck timestamp
    session.lastHoldingCheck = now;
    return { session, needsCookieUpdate: true };
  }

  return { session, needsCookieUpdate: false };
}
