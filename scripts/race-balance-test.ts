import {
  compilePolicy,
  runFullMatch,
  ArenaConfig
} from '../packages/engine/src';

const archetypes = [
  {
    name: 'Sprinter (Top Speed)',
    nft: {
      tokenId: 101,
      name: 'Sprinter',
      attributes: [
        { trait_type: 'Tier', value: 'Epic' },
        { trait_type: 'Skin', value: 'Red' }, // Speed 2
        { trait_type: 'Eyes', value: 'Laser Eyes' },
        { trait_type: 'Aura', value: 'Royal Blue' }, // Moderate risk (0.50) - stays on wide track
        { trait_type: 'Body', value: 'Tuxedo' },
        { trait_type: 'Side', value: 'Right' }
      ]
    }
  },
  {
    name: 'Safe Cruiser (Clean Line)',
    nft: {
      tokenId: 102,
      name: 'Safe Cruiser',
      attributes: [
        { trait_type: 'Tier', value: 'Common' },
        { trait_type: 'Skin', value: 'Pink' }, // Speed 1, steady fuel
        { trait_type: 'Eyes', value: 'Happy' },
        { trait_type: 'Aura', value: 'Aqua Aura' }, // Safe risk (0.10)
        { trait_type: 'Body', value: 'Farmer Shirt' },
        { trait_type: 'Side', value: 'Left' }
      ]
    }
  },
  {
    name: 'Shortcut Daredevil (Hazard Risk)',
    nft: {
      tokenId: 103,
      name: 'Shortcut Daredevil',
      attributes: [
        { trait_type: 'Tier', value: 'Rare' },
        { trait_type: 'Skin', value: 'Black' }, // 40% Hazard Resistance
        { trait_type: 'Eyes', value: 'Angry' },
        { trait_type: 'Aura', value: 'Fiery Aura' }, // High risk (0.85 - Shortcut taker)
        { trait_type: 'Body', value: 'Tuxedo' },
        { trait_type: 'Side', value: 'Right' }
      ]
    }
  },
  {
    name: 'Drafting Tactician (Cooperation)',
    nft: {
      tokenId: 104,
      name: 'Drafting Tactician',
      attributes: [
        { trait_type: 'Tier', value: 'Rare' },
        { trait_type: 'Skin', value: 'Origin' },
        { trait_type: 'Eyes', value: 'BTC Glass' },
        { trait_type: 'Aura', value: 'Royal Blue' },
        { trait_type: 'Body', value: '143 Jersey' }, // High Coop Bias (0.85 - Slipstream drafting)
        { trait_type: 'Side', value: 'Left' }
      ]
    }
  }
];

async function runRaceBalanceSimulation(totalRaces = 1000) {
  console.log(`\n==================================================`);
  console.log(`🏎️ CHOG SWARM RACE-V1 BALANCE BENCHMARK`);
  console.log(`Simulating ${totalRaces} 4-car seeded championship races...`);
  console.log(`==================================================\n`);

  const stats: Record<string, { wins: number; podiums: number; totalRaces: number; avgFinishTurn: number }> = {};
  for (const a of archetypes) {
    stats[a.name] = { wins: 0, podiums: 0, totalRaces: 0, avgFinishTurn: 0 };
  }

  const compiled = archetypes.map(a => ({
    id: a.name,
    tokenId: a.nft.tokenId,
    name: a.name,
    policy: compilePolicy(a.nft)
  }));

  for (let r = 0; r < totalRaces; r++) {
    const seed = 500000 + r * 17;
    const config: ArenaConfig = {
      seed,
      rulesVersion: 'race-v1',
      gridWidth: 14,
      gridHeight: 14,
      maxTurns: 40,
      agents: compiled
    };

    const replay = runFullMatch(config);
    const finalState = replay.stateHistory[replay.stateHistory.length - 1];

    if (replay.winnerId && stats[replay.winnerId]) {
      stats[replay.winnerId].wins++;
    }

    // Tally podiums and finish turns
    const standings = finalState.raceStandings || [];
    for (let rank = 0; rank < standings.length; rank++) {
      const entry = standings[rank];
      if (stats[entry.agentId]) {
        stats[entry.agentId].totalRaces++;
        if (rank < 3) stats[entry.agentId].podiums++;
        stats[entry.agentId].avgFinishTurn += (entry.finishTurn || 35);
      }
    }
  }

  console.log('Archetype                         | Win Rate | Podium % | Avg Turn');
  console.log('----------------------------------+----------+----------+---------');

  let maxWinRate = 0;
  let minWinRate = 100;

  for (const a of archetypes) {
    const s = stats[a.name];
    const winPct = ((s.wins / totalRaces) * 100).toFixed(1);
    const podPct = ((s.podiums / totalRaces) * 100).toFixed(1);
    const avgTurn = (s.avgFinishTurn / totalRaces).toFixed(1);
    console.log(`${a.name.padEnd(34)}| ${winPct.padStart(6)}%  | ${podPct.padStart(6)}%  | ${avgTurn.padStart(7)}`);

    const wNum = parseFloat(winPct);
    if (wNum > maxWinRate) maxWinRate = wNum;
    if (wNum < minWinRate) minWinRate = wNum;
  }

  console.log(`\nSpread: Min ${minWinRate}% vs Max ${maxWinRate}%. Ideal range in 4-car race: 15% - 40%`);
  if (maxWinRate < 45 && minWinRate > 10) {
    console.log(`✅ BALANCE VERIFIED: Healthy asymmetric balance achieved. No single trait dominates.`);
  } else {
    console.log(`⚠️ Balance tuning needed.`);
  }
}

runRaceBalanceSimulation(1000);
