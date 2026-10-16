import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { verifyChogOwnershipOnChain, type Address } from '@/lib/monad-chain';

interface ChogMetadata {
  tokenId: number;
  name: string;
  description: string;
  image: string;
  attributes: Array<{ trait_type: string; value: string }>;
}

let cachedMetadata: ChogMetadata[] | null = null;
function getMetadataList(): ChogMetadata[] {
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
  return cachedMetadata || [];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address')?.toLowerCase();

    if (!address) {
      return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
    }

    const ownersFilePath = path.resolve('data/token-owners.json');
    let ownersMap: Record<string, string> = {};
    if (fs.existsSync(ownersFilePath)) {
      try {
        ownersMap = JSON.parse(fs.readFileSync(ownersFilePath, 'utf-8'));
      } catch (_) {}
    }

    const candidateTokenIds: number[] = [];
    for (const [tokenIdStr, owner] of Object.entries(ownersMap)) {
      if (owner.toLowerCase() === address) {
        candidateTokenIds.push(parseInt(tokenIdStr, 10));
      }
    }

    const allMetadata = getMetadataList();

    // Confirm candidate tokens on-chain concurrently
    const verificationResults = await Promise.all(
      candidateTokenIds.map(async (tokenId) => {
        const verification = await verifyChogOwnershipOnChain(address as Address, tokenId);
        if (verification.verified) {
          const meta = allMetadata.find((m) => m.tokenId === tokenId);
          return {
            tokenId,
            name: meta ? meta.name : `CHOG #${tokenId}`,
            image: `/chogs/${tokenId}.webp`,
            attributes: meta ? meta.attributes : [],
            isVerifiedOwner: true,
          };
        }
        return null;
      })
    );

    const verifiedOwnedChogs = verificationResults.filter(Boolean);

    return NextResponse.json({
      address,
      ownedChogs: verifiedOwnedChogs,
      totalOwned: verifiedOwnedChogs.length,
      network: 'Monad Mainnet (143)',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
