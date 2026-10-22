import { NextRequest, NextResponse } from 'next/server';
import {
  compilePolicy,
  runFullMatch,
  ArenaConfig,
  ChogNFT,
} from '@/packages/engine/src';
import { SESSION_COOKIE_NAME, validateAndRefreshSession } from '@/lib/auth-session';

export async function POST(request: NextRequest) {
  try {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const { session, error } = await validateAndRefreshSession(cookie);

    if (!session) {
      return NextResponse.json(
        {
          error: error || 'Unauthorized: Active Chog holder session required to run mutation experiments.',
          blocked: true,
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { seed = 133742, baselineChog, mutatedChog, mutatedPolicy } = body;

    if (!baselineChog || !mutatedChog) {
      return NextResponse.json({ error: 'Missing baselineChog or mutatedChog' }, { status: 400 });
    }

    const baselinePolicy = compilePolicy(baselineChog as ChogNFT);
    const finalMutatedPolicy = mutatedPolicy || compilePolicy(mutatedChog as ChogNFT);

    const configBaseline: ArenaConfig = {
      seed: Number(seed),
      rulesVersion: 'race-v1',
      gridWidth: 14,
      gridHeight: 14,
      maxTurns: 40,
      agents: [
        {
          id: 'Baseline',
          tokenId: baselineChog.tokenId,
          name: 'Baseline',
          policy: baselinePolicy,
        },
      ],
    };
    const runBaseline = runFullMatch(configBaseline);

    const configMutated: ArenaConfig = {
      seed: Number(seed),
      rulesVersion: 'race-v1',
      gridWidth: 14,
      gridHeight: 14,
      maxTurns: 40,
      agents: [
        {
          id: 'Mutated',
          tokenId: mutatedChog.tokenId,
          name: 'Mutated Policy',
          policy: finalMutatedPolicy,
        },
      ],
    };
    const runMutated = runFullMatch(configMutated);

    // Compute divergence info
    const minEvents = Math.min(runBaseline.events.length, runMutated.events.length);
    let divergenceInfo = {
      diverged: false,
      turn: runBaseline.events.length > 0 ? runBaseline.events[0].turn : 1,
      stepIndex: 0,
      baselinePos: { x: 2, y: 2 },
      mutatedPos: { x: 2, y: 2 },
      baselineAction: 'move',
      mutatedAction: 'move',
      reasonB: 'Identical trajectories across race track.',
      reasonM: 'Identical trajectories across race track.',
    };

    for (let i = 0; i < minEvents; i++) {
      const eB = runBaseline.events[i];
      const eM = runMutated.events[i];
      if (
        eB.action.to.x !== eM.action.to.x ||
        eB.action.to.y !== eM.action.to.y ||
        eB.action.type !== eM.action.type
      ) {
        divergenceInfo = {
          diverged: true,
          turn: eB.turn,
          stepIndex: i,
          baselinePos: eB.action.to,
          mutatedPos: eM.action.to,
          baselineAction: eB.action.type,
          mutatedAction: eM.action.type,
          reasonB: eB.action.reason,
          reasonM: eM.action.reason,
        };
        break;
      }
    }

    return NextResponse.json({
      runBaseline,
      runMutated,
      divergenceInfo,
      seed,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
