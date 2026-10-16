import {
  compilePolicy,
  runFullMatch,
  ArenaConfig
} from '../packages/engine/src';

const archetypes = [
  {
    name: 'Balanced Scout',
    nft: {
      tokenId: 101,
      name: 'Balanced Scout',
      attributes: [
        { trait_type: 'Tier', value: 'Common' },
        { trait_type: 'Skin', value: 'Pink' },
        { trait_type: 'Eyes', value: 'Happy' },
        { trait_type: 'Aura', value: 'Royal Blue' },
        { trait_type: 'Body', value: 'Farmer Shirt' },
        { trait_type: 'Side', value: 'Right' }
      ]
    }
  },
  {
    name: 'Aggressive Sprinter',
    nft: {
      tokenId: 102,
      name: 'Aggressive Sprinter',
      attributes: [
        { trait_type: 'Tier', value: 'Epic' },
        { trait_type: 'Skin', value: 'Red' },
        { trait_type: 'Eyes', value: 'Laser Eyes' },
        { trait_type: 'Aura', value: 'Burning Aura' },
        { trait_type: 'Body', value: 'Tuxedo' },
        { trait_type: 'Side', value: 'Left' }
      ]
    }
  },
  {
    name: 'Armored Guardian',
    nft: {
      tokenId: 103,
      name: 'Armored Guardian',
      attributes: [
        { trait_type: 'Tier', value: 'Rare' },
        { trait_type: 'Skin', value: 'Metal' },
        { trait_type: 'Eyes', value: 'Angry' },
        { trait_type: 'Aura', value: 'Aqua Aura' },
        { trait_type: 'Body', value: 'Farmer Shirt' },
        { trait_type: 'Side', value: 'Right' }
      ]
    }
  },
  {
    name: 'Co-op Strategist',
    nft: {
      tokenId: 104,
      name: 'Co-op Strategist',
      attributes: [
        { trait_type: 'Tier', value: 'Rare' },
        { trait_type: 'Skin', value: 'Origin' },
        { trait_type: 'Eyes', value: 'BTC Glass' },
        { trait_type: 'Aura', value: 'Royal Aura' },
        { trait_type: 'Body', value: 'Yellow 143 Jersey' },
        { trait_type: 'Side', value: 'Left' }
      ]
    }
  },
  {
    name: 'Surge Dasher',
    nft: {
      tokenId: 105,
      name: 'Surge Dasher',
      attributes: [
        { trait_type: 'Tier', value: 'Common' },
        { trait_type: 'Skin', value: 'Yellow' },
        { trait_type: 'Eyes', value: 'Wink' },
        { trait_type: 'Aura', value: 'Fiery Aura' },
        { trait_type: 'Body', value: 'Black Trackset' },
        { trait_type: 'Side', value: 'Right' }
      ]
    }
  }
];

async function runBalanceSimulation(totalMatches = 1000) {
  console.log(`Running balance simulation across ${totalMatches} seeded matches...`);

  const stats: Record<string, { wins: number; matches: number; totalScore: number }> = {};
  for (const arch of archetypes) {
    stats[arch.name] = { wins: 0, matches: 0, totalScore: 0 };
  }

  const compiled = archetypes.map(a => ({
    name: a.name,
    policy: compilePolicy(a.nft)
  }));

  let matchIndex = 0;
  for (let i = 0; i < compiled.length; i++) {
    for (let j = i + 1; j < compiled.length; j++) {
      const a1 = compiled[i];
      const a2 = compiled[j];

      const matchesPerPair = Math.floor(totalMatches / 10);

      for (let m = 0; m < matchesPerPair; m++) {
        matchIndex++;
        const seed = 100000 + matchIndex * 17;

        const config: ArenaConfig = {
          seed,
          rulesVersion: 'v1.0',
          gridWidth: 10,
          gridHeight: 10,
          maxTurns: 30,
          agents: [
            { id: a1.name, tokenId: 1, name: a1.name, policy: a1.policy },
            { id: a2.name, tokenId: 2, name: a2.name, policy: a2.policy }
          ]
        };

        const res = runFullMatch(config);

        stats[a1.name].matches++;
        stats[a2.name].matches++;

        const s1 = res.finalScores[a1.name] || 0;
        const s2 = res.finalScores[a2.name] || 0;

        stats[a1.name].totalScore += s1;
        stats[a2.name].totalScore += s2;

        if (res.winnerId === a1.name) {
          stats[a1.name].wins++;
        } else if (res.winnerId === a2.name) {
          stats[a2.name].wins++;
        }
      }
    }
  }

  console.log('\n================ BALANCE SIMULATION RESULTS ================');
  console.log('| Archetype | Matches | Wins | Win Rate % | Avg Score | Balance Status |');
  console.log('| :--- | :--- | :--- | :--- | :--- | :--- |');

  let anyDominant = false;

  for (const [name, data] of Object.entries(stats)) {
    const winRate = ((data.wins / data.matches) * 100).toFixed(1);
    const avgScore = (data.totalScore / data.matches).toFixed(1);
    const wrNum = parseFloat(winRate);

    // Balance check: Win rate between 35% and 65% is healthy in asymmetric competitive gameplay
    const isBalanced = wrNum >= 35 && wrNum <= 65;
    if (!isBalanced) anyDominant = true;

    const status = isBalanced
      ? '✅ Balanced'
      : (wrNum > 65 ? '⚠️ Overpowered (>65%)' : '⚠️ Underpowered (<35%)');

    console.log(`| ${name.padEnd(20)} | ${String(data.matches).padStart(7)} | ${String(data.wins).padStart(4)} | ${winRate.padStart(9)}% | ${avgScore.padStart(9)} | ${status} |`);
  }
  console.log('============================================================\n');

  if (!anyDominant) {
    console.log('SUCCESS: All trait archetypes fall within healthy competitive win rates (35% - 65%). No archetype dominates.');
  } else {
    console.warn('NOTICE: Some archetypes require parameter tuning.');
  }

  return { stats, balanced: !anyDominant };
}

runBalanceSimulation(1000).catch(console.error);
