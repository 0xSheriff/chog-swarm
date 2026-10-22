import { NextRequest, NextResponse } from 'next/server';
import {
  compilePolicy,
  runFullMatch,
  ArenaConfig,
  ChogNFT,
  CompiledPolicy,
} from '@/packages/engine/src';
import { SESSION_COOKIE_NAME, validateAndRefreshSession } from '@/lib/auth-session';

export async function POST(request: NextRequest) {
  try {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const { session, error } = await validateAndRefreshSession(cookie);

    if (!session) {
      return NextResponse.json(
        {
          error: error || 'Unauthorized: Active Chog holder session required to run arena matches.',
          blocked: true,
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { seed, rulesVersion = 'race-v1', chog, rivals = [] } = body;

    if (!chog || seed === undefined) {
      return NextResponse.json({ error: 'Missing required parameters (chog, seed)' }, { status: 400 });
    }

    const isRaceV1 = rulesVersion === 'race-v1';
    const playerPolicy = compilePolicy(chog as ChogNFT);

    // Build agent list server-side
    const agentList = isRaceV1
      ? [
          {
            id: chog.name || `CHOG #${chog.tokenId}`,
            tokenId: chog.tokenId,
            name: chog.name || `CHOG #${chog.tokenId}`,
            policy: playerPolicy,
          },
          ...rivals.map((r: any) => ({
            id: r.chog.name || `CHOG #${r.chog.tokenId}`,
            tokenId: r.chog.tokenId,
            name: r.chog.name || `CHOG #${r.chog.tokenId}`,
            policy: r.policy || compilePolicy(r.chog),
          })),
        ]
      : [
          {
            id: chog.name || `CHOG #${chog.tokenId}`,
            tokenId: chog.tokenId,
            name: chog.name || `CHOG #${chog.tokenId}`,
            policy: playerPolicy,
          },
          ...(rivals.length > 0
            ? [
                {
                  id: rivals[0].chog.name || `CHOG #${rivals[0].chog.tokenId}`,
                  tokenId: rivals[0].chog.tokenId,
                  name: rivals[0].chog.name || `CHOG #${rivals[0].chog.tokenId}`,
                  policy: rivals[0].policy || compilePolicy(rivals[0].chog),
                },
              ]
            : []),
        ];

    const config: ArenaConfig = {
      seed: Number(seed),
      rulesVersion: isRaceV1 ? 'race-v1' : 'v1.0',
      gridWidth: isRaceV1 ? 14 : 10,
      gridHeight: isRaceV1 ? 14 : 10,
      maxTurns: isRaceV1 ? 40 : 30,
      agents: agentList,
    };

    const replay = runFullMatch(config);

    return NextResponse.json({
      replay,
      seed,
      rulesVersion,
      creatorPass: session.creatorPass,
      judgePass: session.judgePass,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
