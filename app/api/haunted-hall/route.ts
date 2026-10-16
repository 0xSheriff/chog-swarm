import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/haunted-hall
 *
 * GET ?address=0x...
 * Returns the player's Haunted Hall codex progress:
 * - Banished ghosts and hit statistics
 * - Reunited ghost tokens
 *
 * POST { address, ghostId, tokenId, action: 'banish' | 'reunion', score }
 * Records banishment or reunion in the Haunted Hall codex.
 */

interface CodexEntry {
  ghostId: string;
  tokenId: number;
  name: string;
  banishCount: number;
  reunionTriggered: boolean;
  lastBanishedAt?: string;
  highScore: number;
}

// In-memory persistent player codex (can bridge with Firestore)
const codexDB = new Map<string, Map<string, CodexEntry>>();

const GHOST_METADATA: Record<string, { id: number; name: string; tier: string; power: string; lore: string }> = {
  g1: {
    id: 53,
    name: 'Blaze',
    tier: 'Legendary',
    power: 'Infernal Rush (+25% ball speed & double bumper kicks)',
    lore: 'Born from the primordial volcanic rifts of Monad. Scorches every bumper it touches.',
  },
  g2: {
    id: 392,
    name: 'Burning Skully',
    tier: 'Legendary',
    power: 'Spirit Magnet (gently curves balls toward rollover lanes)',
    lore: 'An ancient pyromancer skull that hovers above the graveyard, warding off tomb raiders.',
  },
  g3: {
    id: 434,
    name: 'Chog Scream',
    tier: 'Legendary',
    power: 'Time Dilation (slows ball by 30% near flippers for pinpoint aim)',
    lore: 'Its echo reverberates through the crypts, freezing time when mortal panic strikes.',
  },
  g4: {
    id: 494,
    name: 'Chogbomination',
    tier: 'Legendary',
    power: 'Spectral Shield (temporary ball-save barrier across the drain)',
    lore: 'Stitched together from dark necrotic energy. Banishing it restores purity to the hall.',
  },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = (searchParams.get('address') || 'guest').toLowerCase();

  const playerEntries = codexDB.get(address) || new Map<string, CodexEntry>();

  const codex = Object.entries(GHOST_METADATA).map(([gid, meta]) => {
    const recorded = playerEntries.get(gid);
    return {
      ghostId: gid,
      tokenId: meta.id,
      name: meta.name,
      tier: meta.tier,
      power: meta.power,
      lore: meta.lore,
      image: `/chogs/${meta.id}.webp`,
      banished: (recorded?.banishCount || 0) > 0,
      banishCount: recorded?.banishCount || 0,
      reunionTriggered: recorded?.reunionTriggered || false,
      highScore: recorded?.highScore || 0,
      lastBanishedAt: recorded?.lastBanishedAt || null,
    };
  });

  return NextResponse.json({
    address,
    totalBanished: codex.filter((c) => c.banished).length,
    totalReunions: codex.filter((c) => c.reunionTriggered).length,
    codex,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, ghostId, action, score } = body;

    if (!ghostId || !GHOST_METADATA[ghostId]) {
      return NextResponse.json({ error: 'Invalid ghostId' }, { status: 400 });
    }

    const addrKey = (address || 'guest').toLowerCase();
    if (!codexDB.has(addrKey)) {
      codexDB.set(addrKey, new Map());
    }

    const playerMap = codexDB.get(addrKey)!;
    const existing: CodexEntry = playerMap.get(ghostId) || {
      ghostId,
      tokenId: GHOST_METADATA[ghostId].id,
      name: GHOST_METADATA[ghostId].name,
      banishCount: 0,
      reunionTriggered: false,
      highScore: 0,
      lastBanishedAt: undefined,
    };

    if (action === 'banish') {
      existing.banishCount += 1;
      existing.lastBanishedAt = new Date().toISOString();
      if (score && score > existing.highScore) {
        existing.highScore = score;
      }
    } else if (action === 'reunion') {
      existing.reunionTriggered = true;
    }

    playerMap.set(ghostId, existing);

    return NextResponse.json({
      success: true,
      entry: existing,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
