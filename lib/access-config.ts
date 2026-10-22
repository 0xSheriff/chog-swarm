/**
 * lib/access-config.ts — Configuration flags and rules for Chog Holder Access Gate.
 *
 * Rules:
 * - A wallet gets access if:
 *   (a) It holds at least one Chog (balanceOf > 0 on Chog Genesis 0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763 on chain 143)
 *   (b) It is in OWNER_ALLOWLIST (case-insensitive env var)
 *   (c) A judge pass is activated via JUDGE_CODE
 * - Public routes by default: Landing (/), Recorded Replay (/demo), Read-only Leaderboard (/leaderboard)
 */

export const PUBLIC_REPLAY = process.env.PUBLIC_REPLAY !== 'false';
export const PUBLIC_LEADERBOARD_READ = process.env.PUBLIC_LEADERBOARD_READ !== 'false';

/**
 * Returns parsed lowercase allowlist from OWNER_ALLOWLIST env var.
 * NEVER hardcodes addresses.
 */
export function getOwnerAllowlist(): string[] {
  const raw = process.env.OWNER_ALLOWLIST || '';
  return raw
    .split(',')
    .map(addr => addr.trim().toLowerCase())
    .filter(addr => addr.length > 0);
}

/**
 * Case-insensitive allowlist check.
 */
export function isAllowlisted(address: string | null | undefined): boolean {
  if (!address) return false;
  const target = address.trim().toLowerCase();
  const allowlist = getOwnerAllowlist();
  return allowlist.includes(target);
}

/**
 * Returns configured JUDGE_CODE or null if not set.
 */
export function getJudgeCode(): string | null {
  const code = process.env.JUDGE_CODE?.trim();
  return code && code.length > 0 ? code : null;
}

/**
 * Validates a judge code safely against the environment configuration.
 */
export function isJudgeCodeValid(code: string | null | undefined): boolean {
  const configured = getJudgeCode();
  if (!configured || !code) return false;
  return code.trim() === configured;
}

/**
 * Determines whether a URL pathname is publicly accessible without gate enforcement.
 */
export function isPublicPath(pathname: string): boolean {
  // Static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/halloween') ||
    pathname.startsWith('/chogs') ||
    pathname.startsWith('/screenshots') ||
    pathname.startsWith('/fixtures') ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.mp4') ||
    pathname.endsWith('.webm')
  ) {
    return true;
  }

  // Auth endpoints are public (needed to obtain sessions)
  if (pathname.startsWith('/api/auth')) {
    return true;
  }

  // Landing page is public
  if (pathname === '/') {
    return true;
  }

  // Demo replay is public if PUBLIC_REPLAY is true
  if (pathname === '/demo' && PUBLIC_REPLAY) {
    return true;
  }

  // Read-only leaderboard is public if PUBLIC_LEADERBOARD_READ is true
  if (pathname === '/leaderboard' && PUBLIC_LEADERBOARD_READ) {
    return true;
  }
  if (pathname === '/api/gauntlet/leaderboard' && PUBLIC_LEADERBOARD_READ) {
    return true;
  }

  // Read-only metadata endpoints for public display
  if (pathname.startsWith('/api/chogs/')) {
    return true;
  }

  return false;
}
