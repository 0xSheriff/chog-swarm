import { NextRequest, NextResponse } from 'next/server';
import { verifyChogOwnershipOnChain, type Address } from '@/lib/monad-chain';
import { compilePolicy } from '@/packages/engine/src';
import fixturesManifest from '@/fixtures/manifest.json';
import fs from 'fs';
import path from 'path';

interface ChogMetadata {
  tokenId: number;
  name: string;
  description: string;
  image: string;
  attributes: Array<{ trait_type: string; value: string }>;
}

let cachedMetadata: ChogMetadata[] | null = null;
function getMetadata(tokenId: number): ChogMetadata | null {
  if (!cachedMetadata) {
    try {
      const p = path.resolve('data/chogs.json');
      if (fs.existsSync(p)) {
        cachedMetadata = JSON.parse(fs.readFileSync(p, 'utf-8'));
      }
    } catch (_) {
      cachedMetadata = [];
    }
  }
  return cachedMetadata?.find(m => m.tokenId === tokenId) || null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerAddress, tokenId } = body;

    if (!playerAddress || !tokenId) {
      return NextResponse.json({
        verified: false,
        error: 'Missing playerAddress or tokenId'
      }, { status: 400 });
    }

    // 1. Live on-chain ownerOf query against Monad Mainnet
    const ownership = await verifyChogOwnershipOnChain(playerAddress as Address, tokenId);

    if (!ownership.verified) {
      return NextResponse.json({
        verified: false,
        owner: ownership.owner,
        error: ownership.error || 'On-chain ownership verification failed. Spawn rejected by Monad NFT essentiality gate.',
      }, { status: 403 });
    }

    // 2. Fetch authentic traits
    const meta = getMetadata(tokenId);
    const attributes = meta ? meta.attributes : [];
    const name = meta ? meta.name : `CHOG #${tokenId}`;

    const chogData = {
      tokenId,
      name,
      image: `/chogs/${tokenId}.webp`,
      attributes,
    };

    // 3. Compile policy server-side
    const compiledPolicy = compilePolicy(chogData);

    return NextResponse.json({
      verified: true,
      owner: ownership.owner,
      chog: chogData,
      policy: compiledPolicy,
      message: `Verified on-chain owner of Chog #${tokenId}. Spawn authorized for Monad Mainnet.`,
    });
  } catch (err: any) {
    return NextResponse.json({
      verified: false,
      error: err.message,
    }, { status: 500 });
  }
}
