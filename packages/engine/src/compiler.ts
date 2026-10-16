import { ChogNFT, CompiledPolicy, DerivedTraitExplanation } from './types';

export function compilePolicy(chog: ChogNFT): CompiledPolicy {
  const attrs = new Map<string, string>();
  for (const a of chog.attributes || []) {
    attrs.set(a.trait_type.toLowerCase(), String(a.value));
  }

  const breakdown: DerivedTraitExplanation[] = [];

  // 1. Tier: Energy Capacity & Maintenance
  let energyCapacity = 100;
  let perceptionRadius = 5;
  let hazardVuln = 1.0;
  let tempoDecayEvery5Turns = 0;

  const rawTier = (attrs.get('tier') || 'Common').toLowerCase();
  if (rawTier.includes('mythic') || rawTier.includes('legendary')) {
    energyCapacity = 120;
    perceptionRadius = 6;
    tempoDecayEvery5Turns = 2;
    breakdown.push({
      traitType: 'Tier',
      nativeValue: attrs.get('tier') || 'Legendary',
      derivedParam: 'Capacity 120, Decay -2/5t',
      gameEffect: 'High-Output Reactor: 120 Energy capacity with +1 Vision.',
      tradeoff: 'Passive Cooling: Loses 2 energy every 5 turns.'
    });
  } else if (rawTier.includes('epic')) {
    energyCapacity = 110;
    hazardVuln = 1.25;
    breakdown.push({
      traitType: 'Tier',
      nativeValue: attrs.get('tier') || 'Epic',
      derivedParam: 'Capacity 110, HazardVuln 1.25x',
      gameEffect: 'Overclocked: +10 extra starting energy buffer.',
      tradeoff: 'High Voltage: Takes 25% extra damage on hazard steps.'
    });
  } else if (rawTier.includes('rare') || rawTier.includes('uncommon')) {
    energyCapacity = 95;
    perceptionRadius = 6;
    breakdown.push({
      traitType: 'Tier',
      nativeValue: attrs.get('tier') || 'Rare',
      derivedParam: 'Capacity 95, Vision 6',
      gameEffect: 'Recon Tuned: +1 Perception radius to detect nodes early.',
      tradeoff: 'Light Battery: -5 lower total starting energy.'
    });
  } else {
    // Common
    breakdown.push({
      traitType: 'Tier',
      nativeValue: attrs.get('tier') || 'Common',
      derivedParam: 'Capacity 100, Balanced',
      gameEffect: 'Standard Battery: Reliable 100 energy baseline.',
      tradeoff: 'Balanced: No perks, but zero maintenance penalties.'
    });
  }

  // 2. Skin: Movement Speed vs Energy Cost
  let moveEnergyCost = 2.0;
  let speed = 1;
  let hazardResist = 0.0;
  let shieldCharges = 0;
  let surgeBonusActive = false;

  const rawSkin = (attrs.get('skin') || 'Origin').toLowerCase();
  if (rawSkin.includes('red')) {
    speed = 2;
    moveEnergyCost = 3.5;
    breakdown.push({
      traitType: 'Skin',
      nativeValue: attrs.get('skin') || 'Red',
      derivedParam: 'Speed 2, MoveCost 3.5',
      gameEffect: 'Dash Sprinter: Moves twice per turn to snatch distant gems.',
      tradeoff: 'High Friction: Consumes 75% more energy per tile moved.'
    });
  } else if (rawSkin.includes('black')) {
    hazardResist = 0.40;
    moveEnergyCost = 2.0;
    breakdown.push({
      traitType: 'Skin',
      nativeValue: attrs.get('skin') || 'Black',
      derivedParam: 'HazardResist 40%',
      gameEffect: 'Void Prowler: 40% damage resistance against hazard tiles.',
      tradeoff: 'Deliberate Pace: Locked to standard 1 step per turn.'
    });
  } else if (rawSkin.includes('yellow')) {
    surgeBonusActive = true;
    moveEnergyCost = 2.2;
    breakdown.push({
      traitType: 'Skin',
      nativeValue: attrs.get('skin') || 'Yellow',
      derivedParam: 'Surge AP (Turns 1-8)',
      gameEffect: 'Overcharger: Bonus sprint turn during opening 8 turns.',
      tradeoff: 'Battery Drain: Slumps to lower mobility after turn 16.'
    });
  } else if (rawSkin.includes('metal') || rawSkin.includes('jade') || rawSkin.includes('blue')) {
    shieldCharges = 1;
    moveEnergyCost = 2.5;
    breakdown.push({
      traitType: 'Skin',
      nativeValue: attrs.get('skin') || 'Metal',
      derivedParam: 'ShieldCharge 1, MoveCost 2.5',
      gameEffect: 'Plated Armor: Completely absorbs 1st hazard contact.',
      tradeoff: 'Heavy Armor: Step cost increased by +0.5 energy.'
    });
  } else {
    // Pink / Origin / Default
    breakdown.push({
      traitType: 'Skin',
      nativeValue: attrs.get('skin') || 'Origin',
      derivedParam: 'Speed 1, MoveCost 2.0',
      gameEffect: 'Agile Scout: Standard 2.0 energy per tile step.',
      tradeoff: 'Standard: Consistent stamina without burst speed.'
    });
  }

  // 3. Eyes: Node Targeting & Valuation
  let highValueTargetWeight = 1.0;
  const rawEyes = (attrs.get('eyes') || 'Happy').toLowerCase();
  if (rawEyes.includes('laser') || rawEyes.includes('btc') || rawEyes.includes('glasses') || rawEyes.includes('vr')) {
    highValueTargetWeight = 3.0;
    perceptionRadius = Math.max(perceptionRadius, 6);
    breakdown.push({
      traitType: 'Eyes',
      nativeValue: attrs.get('eyes') || 'Laser Eyes',
      derivedParam: 'Amethyst Bias 3.0x, Vision 6',
      gameEffect: 'High-Value Sniper: Prioritizes distant purple crystal nodes (+30 pts).',
      tradeoff: 'Greedy Routing: Bypasses nearby green nodes, committing to longer journeys.'
    });
  } else if (rawEyes.includes('angry') || rawEyes.includes('stare') || rawEyes.includes('glare')) {
    highValueTargetWeight = 2.0;
    breakdown.push({
      traitType: 'Eyes',
      nativeValue: attrs.get('eyes') || 'Angry',
      derivedParam: 'Aggressive Prioritization 2.0x',
      gameEffect: 'Bold Hunter: Targets contested nodes aggressively.',
      tradeoff: 'Inflexible: Willing to path closely alongside hazard fringes.'
    });
  } else {
    // Happy, Wink, Sleepy, Normal
    highValueTargetWeight = 1.0;
    breakdown.push({
      traitType: 'Eyes',
      nativeValue: attrs.get('eyes') || 'Happy',
      derivedParam: 'Nearest-Neighbor 1.0x',
      gameEffect: 'Local Harvester: Routes toward the nearest available resource node.',
      tradeoff: 'Short Horizon: May ignore lucrative distant nodes.'
    });
  }

  // 4. Aura: Hazard Risk Tolerance & Adjacency Bias
  let riskTolerance = 0.50;
  const rawAura = (attrs.get('aura') || 'Clean').toLowerCase();
  if (rawAura.includes('burning') || rawAura.includes('fire') || rawAura.includes('fiery')) {
    riskTolerance = 0.85;
    breakdown.push({
      traitType: 'Aura',
      nativeValue: attrs.get('aura') || 'Burning Aura',
      derivedParam: 'RiskTolerance 0.85',
      gameEffect: 'Hazard Bravery: Takes direct shortcuts through hazard adjacencies.',
      tradeoff: 'High Risk: 85% probability of hazard proximity pathing.'
    });
  } else if (rawAura.includes('aqua') || rawAura.includes('mint') || rawAura.includes('clean')) {
    riskTolerance = 0.10;
    breakdown.push({
      traitType: 'Aura',
      nativeValue: attrs.get('aura') || 'Aqua Aura',
      derivedParam: 'RiskTolerance 0.10',
      gameEffect: 'Cautious Guardian: Maintains strict 1-tile safety buffer from hazards.',
      tradeoff: 'Detour Cost: Travels longer distances to navigate around hazards.'
    });
  } else {
    riskTolerance = 0.50;
    breakdown.push({
      traitType: 'Aura',
      nativeValue: attrs.get('aura') || 'Royal Blue',
      derivedParam: 'RiskTolerance 0.50',
      gameEffect: 'Dynamic Balance: Dynamically balances path length against hazard proximity.',
      tradeoff: 'Moderate: Standard risk tradeoff.'
    });
  }

  // 5. Body: Solo vs Cooperation Nexus Bias
  let coopBias = 0.50;
  const rawBody = (attrs.get('body') || 'Tuxedo').toLowerCase();
  if (rawBody.includes('143') || rawBody.includes('jersey') || rawBody.includes('trackset') || rawBody.includes('team')) {
    coopBias = 0.85;
    breakdown.push({
      traitType: 'Body',
      nativeValue: attrs.get('body') || '143 Jersey',
      derivedParam: 'CoopBias 0.85',
      gameEffect: 'Nexus Synchronizer: High priority on cooperative Cyan Nexus nodes (+50 pts).',
      tradeoff: 'Coop Dependent: Yields solo points if partner fails to coordinate.'
    });
  } else if (rawBody.includes('tuxedo') || rawBody.includes('kings') || rawBody.includes('gangster')) {
    coopBias = 0.10;
    breakdown.push({
      traitType: 'Body',
      nativeValue: attrs.get('body') || 'Tuxedo',
      derivedParam: 'CoopBias 0.10',
      gameEffect: 'Sovereign Soloist: Ruthlessly hoards individual resource nodes.',
      tradeoff: 'Nexus Averse: Forfeits 50-point dual cooperation bonuses.'
    });
  } else {
    coopBias = 0.40;
    breakdown.push({
      traitType: 'Body',
      nativeValue: attrs.get('body') || 'Farmer Shirt',
      derivedParam: 'CoopBias 0.40',
      gameEffect: 'Pragmatic Harvester: Cooperates only if opponent is already en-route.',
      tradeoff: 'Opportunistic: Never commits to early nexus positioning.'
    });
  }

  // 6. Side: Deterministic Pathfinding Tie-Breaker (Crucial for Trait Lab Divergence!)
  const rawSide = (attrs.get('side') || 'Right').toLowerCase();
  const tiebreaker: 'clockwise' | 'counter-clockwise' = rawSide.includes('left') ? 'counter-clockwise' : 'clockwise';
  breakdown.push({
    traitType: 'Side',
    nativeValue: attrs.get('side') || 'Right',
    derivedParam: tiebreaker === 'clockwise' ? 'Clockwise Routing' : 'Counter-Clockwise Routing',
    gameEffect: `Symmetry Breaker: Routes ${tiebreaker === 'clockwise' ? 'Right / Clockwise' : 'Left / Counter-Clockwise'} around obstacles.`,
    tradeoff: 'Deterministic Vector: Fixed routing preference across equidistant paths.'
  });

  // 7. Special Perks: Head & Accessory
  const specialPerks: CompiledPolicy['specialPerks'] = {};
  const rawAccessory = (attrs.get('accessory') || '').toLowerCase();
  if (rawAccessory.includes('fwog')) {
    specialPerks.fwogDiagonalReach = true;
    breakdown.push({
      traitType: 'Accessory',
      nativeValue: attrs.get('accessory') || 'Fwog',
      derivedParam: 'Diagonal Reach (Fwog Assist)',
      gameEffect: 'Companion Harvest: Can pick up adjacent diagonal nodes without stepping on the tile.',
      tradeoff: 'Passive Utility: No direct combat or speed bonus.'
    });
  } else if (rawAccessory.includes('katana')) {
    specialPerks.katanaHazardCleave = true;
    breakdown.push({
      traitType: 'Accessory',
      nativeValue: attrs.get('accessory') || 'Katana',
      derivedParam: 'Hazard Cleave (1x)',
      gameEffect: 'Cleave Strike: Neutralizes 1 adjacent hazard tile at 10 energy cost.',
      tradeoff: 'Energy Cost: Consumes 10 energy to perform.'
    });
  }

  const rawHead = (attrs.get('head') || '').toLowerCase();
  if (rawHead.includes('mon cap') || rawHead.includes('mcga')) {
    specialPerks.monCapSurge = true;
    breakdown.push({
      traitType: 'Head',
      nativeValue: attrs.get('head') || 'Mon Cap',
      derivedParam: 'Turn 14 Monad Surge (+5 Score)',
      gameEffect: 'Monad Culture: Gains +5 bonus points automatically on Turn 14.',
      tradeoff: 'One-time bonus on Turn 14 only.'
    });
  } else if (rawHead.includes('wizard')) {
    specialPerks.wizardHatWarp = true;
    breakdown.push({
      traitType: 'Head',
      nativeValue: attrs.get('head') || 'Wizard Hat',
      derivedParam: 'Warp Stride (Turn 10)',
      gameEffect: 'Blink Teleport: Teleports up to 3 tiles toward closest purple node on Turn 10.',
      tradeoff: 'Requires > 50 energy on Turn 10 to activate.'
    });
  }

  return {
    energyCapacity,
    moveEnergyCost,
    speed,
    hazardResist,
    hazardVuln,
    shieldCharges,
    riskTolerance,
    highValueTargetWeight,
    coopBias,
    tiebreaker,
    perceptionRadius,
    tempoDecayEvery5Turns,
    surgeBonusActive,
    specialPerks,
    derivedBreakdown: breakdown
  };
}
