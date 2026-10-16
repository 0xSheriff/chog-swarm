import { NextRequest, NextResponse } from 'next/server';
import { compilePolicy, runFullMatch, ArenaConfig, getStandardRaceOpponents } from '@/packages/engine/src';
import { getDailySeed, getTodayUtcKey, recordVerifiedScore, isForbiddenPlayer } from '@/lib/leaderboard-store';
import { verifyChogOwnershipOnChain } from '@/lib/monad-chain';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerAddress, chog, claimedScore, seed, rulesVersion = 'race-v1' } = body;

    if (!playerAddress || !chog || claimedScore === undefined || !seed) {
      return NextResponse.json({ error: 'Missing required match submission parameters' }, { status: 400 });
    }

    if (isForbiddenPlayer(playerAddress)) {
      return NextResponse.json({
        verified: false,
        error: 'Contract address cannot participate as a player on the leaderboard.'
      }, { status: 400 });
    }

    // Hard check: verify live on-chain ownership against Monad Mainnet
    const ownership = await verifyChogOwnershipOnChain(playerAddress, chog.tokenId);
    if (!ownership.verified) {
      return NextResponse.json({
        verified: false,
        error: `NFT Essentiality Verification Failed: ${ownership.error || 'Address is not the verified owner of this Chog NFT on-chain.'}`
      }, { status: 403 });
    }

    const todayDateKey = getTodayUtcKey();
    const expectedSeed = getDailySeed(todayDateKey);

    if (seed !== expectedSeed) {
      return NextResponse.json({
        error: `Invalid Gauntlet seed for today (${todayDateKey}). Expected: ${expectedSeed}, received: ${seed}`
      }, { status: 400 });
    }

    // 1. Compile policy server-side directly from authentic traits
    const policy = compilePolicy(chog);

    // 2. Server-side Re-simulation (Anti-Cheat Engine Execution)
    const isRace = rulesVersion === 'race-v1';
    const rivals = isRace ? getStandardRaceOpponents() : [];

    const config: ArenaConfig = {
      seed: expectedSeed,
      rulesVersion,
      gridWidth: isRace ? 14 : 10,
      gridHeight: isRace ? 14 : 10,
      maxTurns: isRace ? 40 : 30,
      agents: [
        { id: playerAddress, tokenId: chog.tokenId, name: chog.name, policy },
        ...rivals
      ]
    };

    const simResult = runFullMatch(config);
    const finalState = simResult.stateHistory[simResult.stateHistory.length - 1];
    const playerAgent = finalState.agents.find(a => a.id === playerAddress || a.tokenId === chog.tokenId);
    const actualScore = playerAgent ? playerAgent.score : (simResult.finalScores[playerAddress] || 0);
    const actualFinishTurn = playerAgent?.finishTurn;
    const actualHasFinished = playerAgent?.hasFinished || false;

    // 3. Strict Verification: Client score MUST match Engine score exactly
    if (actualScore !== claimedScore) {
      return NextResponse.json({
        verified: false,
        error: `Anti-Cheat Rejection: Server re-simulation produced score ${actualScore}, but client submitted ${claimedScore}.`,
        actualScore,
        matchChecksum: simResult.matchChecksum
      }, { status: 403 });
    }

    // 4. Verify Cryptographic Signature (seed + score hash + address)
    const { signature, message } = body;
    if (!signature || !message) {
      return NextResponse.json({
        verified: false,
        error: 'Cryptographic signature required: Leaderboard submissions require a wallet-signed score proof (seed + score hash + address).'
      }, { status: 400 });
    }

    // Ensure message accurately binds player address, seed, score and checksum
    const expectedMessage = `Chog Swarm Gauntlet Score Verification\nAddress: ${playerAddress.toLowerCase()}\nSeed: ${expectedSeed}\nScore: ${actualScore}\nChecksum: ${simResult.matchChecksum}`;
    if (message.trim() !== expectedMessage.trim()) {
      return NextResponse.json({
        verified: false,
        error: 'Signature Payload Mismatch: Message content does not match the re-simulated match parameters.'
      }, { status: 400 });
    }

    const { verifyMessage } = await import('viem');
    const isSignatureValid = await verifyMessage({
      address: playerAddress,
      message,
      signature,
    });

    if (!isSignatureValid) {
      return NextResponse.json({
        verified: false,
        error: 'Cryptographic Verification Failed: Signature does not match submitting wallet address.'
      }, { status: 401 });
    }

    // 5. Save to verified leaderboard
    const entry = await recordVerifiedScore({
      playerAddress,
      tokenId: chog.tokenId,
      chogName: chog.name,
      score: actualScore,
      finishTurn: actualFinishTurn,
      hasFinished: actualHasFinished,
      seed: expectedSeed,
      turnsPlayed: simResult.events.length,
      matchChecksum: simResult.matchChecksum,
      timestamp: Date.now(),
      dateKey: todayDateKey
    });

    return NextResponse.json({
      verified: true,
      entry,
      matchChecksum: simResult.matchChecksum,
      message: 'Score successfully re-simulated and verified on server.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
