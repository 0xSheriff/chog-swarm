/**
 * GET /api/chogs/owned-by?address=0x...
 *
 * Returns the list of Chog token IDs owned by the given wallet address,
 * sourced from the server-side multicall snapshot (5-min TTL).
 *
 * Query params:
 *   address (required) — EVM wallet address
 *   refresh  (optional) — "true" to force a cache refresh
 */
import { NextRequest, NextResponse } from 'next/server';
import { getOwnerSnapshot, getChogsByOwner, snapshotAge } from '@/lib/chog-snapshot';
import chogs from '@/fixtures/manifest.json';

// Fixture manifest keyed by tokenId for enriching results
const MANIFEST: Record<string, { name: string; image: string; attributes?: { trait_type: string; value: string }[] }> =
  Object.fromEntries(
    (chogs as { tokenId: number; name: string; image: string; attributes?: { trait_type: string; value: string }[] }[]).map((c) => [
      String(c.tokenId),
      c,
    ])
  );

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const address = searchParams.get('address');
  const forceRefresh = searchParams.get('refresh') === 'true';

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json(
      { error: 'address query param must be a valid EVM address (0x + 40 hex chars)' },
      { status: 400 }
    );
  }

  try {
    const snapshot = await getOwnerSnapshot(forceRefresh);
    const tokenIds = getChogsByOwner(snapshot, address);
    const ttlSeconds = snapshotAge();

    // Enrich with local metadata
    const chogList = tokenIds.map((tokenId) => {
      const meta = MANIFEST[String(tokenId)];
      return {
        tokenId,
        name: meta?.name ?? `Chog #${tokenId}`,
        image: `/chogs/${tokenId}.webp`,
        attributes: meta?.attributes ?? [],
      };
    });

    return NextResponse.json(
      {
        address,
        chogs: chogList,
        count: chogList.length,
        snapshotTtlSeconds: ttlSeconds,
        snapshotSize: snapshot.size,
      },
      {
        headers: {
          'Cache-Control': `public, max-age=${Math.max(0, ttlSeconds)}, stale-while-revalidate=60`,
        },
      }
    );
  } catch (err: any) {
    console.error('[/api/chogs/owned-by] Error:', err.message);
    return NextResponse.json({ error: 'Snapshot unavailable. Try again.' }, { status: 503 });
  }
}
