/**
 * lib/chog-snapshot.ts — Server-side multicall ownerOf snapshot.
 *
 * Fetches ownerOf for all 1,969 Chog Genesis tokens in parallel batches,
 * caches the result in memory (tokenId → lc-owner), refreshes every 5 minutes.
 *
 * Usage:
 *   const snap = await getOwnerSnapshot();
 *   const myChogs = getChogsByOwner(snap, walletAddress);
 */

import { monadPublicClient, ERC721_ABI } from '@/lib/monad-chain';
import { CHOG_GENESIS_ADDRESS, CHOG_TOTAL_SUPPLY } from '@/lib/constants';
import type { Address } from 'viem';

/** tokenId → lowercase owner address */
export type OwnerSnapshot = Map<number, string>;

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 200; // multicall per batch
const MAX_CONCURRENT_BATCHES = 5;

interface CacheEntry {
  snapshot: OwnerSnapshot;
  builtAt: number;
}

let cache: CacheEntry | null = null;
let refreshing = false;

/**
 * Returns a fresh or cached snapshot.
 * Thread-safe: concurrent callers wait for the single in-flight refresh.
 */
export async function getOwnerSnapshot(forceRefresh = false): Promise<OwnerSnapshot> {
  const now = Date.now();
  if (
    !forceRefresh &&
    cache &&
    now - cache.builtAt < REFRESH_INTERVAL_MS
  ) {
    return cache.snapshot;
  }

  // Only one concurrent refresh
  if (refreshing) {
    // Return stale cache if available while refresh in progress
    if (cache) return cache.snapshot;
    // Otherwise wait briefly by polling
    await new Promise<void>((res) => {
      const poll = setInterval(() => {
        if (!refreshing) { clearInterval(poll); res(); }
      }, 100);
    });
    return cache!.snapshot;
  }

  refreshing = true;
  try {
    const snapshot = await buildSnapshot();
    cache = { snapshot, builtAt: Date.now() };
    console.log(`[chog-snapshot] Built snapshot: ${snapshot.size} tokens resolved`);
    return snapshot;
  } catch (err: any) {
    console.error('[chog-snapshot] Snapshot build failed:', err.message);
    if (cache) return cache.snapshot; // serve stale
    throw err;
  } finally {
    refreshing = false;
  }
}

/**
 * Given a snapshot, returns sorted tokenIds owned by the given address.
 */
export function getChogsByOwner(snapshot: OwnerSnapshot, walletAddress: string): number[] {
  const lc = walletAddress.toLowerCase();
  const owned: number[] = [];
  for (const [tokenId, owner] of snapshot) {
    if (owner === lc) owned.push(tokenId);
  }
  return owned.sort((a, b) => a - b);
}

/** How many seconds until the next scheduled refresh (0 = stale). */
export function snapshotAge(): number {
  if (!cache) return 0;
  return Math.max(0, Math.round((REFRESH_INTERVAL_MS - (Date.now() - cache.builtAt)) / 1000));
}

// ── internals ────────────────────────────────────────────────────────────────

async function buildSnapshot(): Promise<OwnerSnapshot> {
  const tokenIds = Array.from({ length: CHOG_TOTAL_SUPPLY }, (_, i) => i + 1);
  const snapshot: OwnerSnapshot = new Map();

  // Split into batches
  const batches: number[][] = [];
  for (let i = 0; i < tokenIds.length; i += BATCH_SIZE) {
    batches.push(tokenIds.slice(i, i + BATCH_SIZE));
  }

  // Process batches with limited concurrency
  for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
    const chunk = batches.slice(i, i + MAX_CONCURRENT_BATCHES);
    await Promise.all(chunk.map((batch) => processBatch(batch, snapshot)));
  }

  return snapshot;
}

async function processBatch(tokenIds: number[], snapshot: OwnerSnapshot): Promise<void> {
  const contracts = tokenIds.map((tokenId) => ({
    address: CHOG_GENESIS_ADDRESS as Address,
    abi: ERC721_ABI,
    functionName: 'ownerOf' as const,
    args: [BigInt(tokenId)] as const,
  }));

  try {
    const results = await monadPublicClient.multicall({
      contracts,
      allowFailure: true,
    });

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'success' && result.result) {
        snapshot.set(tokenIds[i], (result.result as string).toLowerCase());
      }
      // On failure (e.g., token burned / unminted), skip silently
    }
  } catch (err: any) {
    // Batch-level failure — log and skip rather than killing the full snapshot
    console.warn(`[chog-snapshot] Batch ${tokenIds[0]}-${tokenIds[tokenIds.length - 1]} failed:`, err.message);
  }
}
