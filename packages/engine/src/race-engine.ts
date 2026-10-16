import {
  ArenaConfig,
  ArenaState,
  AgentState,
  TurnEvent,
  ReplaySnapshot,
  CompiledPolicy,
  Position,
  HazardCell,
  ResourceNode,
  RaceTrackData,
  CheckpointGate,
  RaceStanding,
  ArenaAction
} from './types';
import { DeterministicPRNG } from './prng';
import { compilePolicy } from './compiler';

export const RACE_GRID_WIDTH = 14;
export const RACE_GRID_HEIGHT = 14;
export const RACE_MAX_TURNS = 40;

export const STANDARD_RACE_RIVALS: { tokenId: number; name: string; traits: { trait_type: string; value: string }[] }[] = [
  {
    tokenId: 24,
    name: 'Sprinter #24',
    traits: [
      { trait_type: 'Tier', value: 'Epic' },
      { trait_type: 'Skin', value: 'Red' }, // Speed 2
      { trait_type: 'Eyes', value: 'Laser Eyes' },
      { trait_type: 'Aura', value: 'Royal Blue' },
      { trait_type: 'Body', value: 'Tuxedo' },
      { trait_type: 'Side', value: 'Right' }
    ]
  },
  {
    tokenId: 58,
    name: 'Safe Cruiser #58',
    traits: [
      { trait_type: 'Tier', value: 'Common' },
      { trait_type: 'Skin', value: 'Pink' }, // Speed 1, cautious
      { trait_type: 'Eyes', value: 'Happy' },
      { trait_type: 'Aura', value: 'Aqua Aura' },
      { trait_type: 'Body', value: 'Farmer Shirt' },
      { trait_type: 'Side', value: 'Left' }
    ]
  },
  {
    tokenId: 1,
    name: 'Shortcut Daredevil #1',
    traits: [
      { trait_type: 'Tier', value: 'Rare' },
      { trait_type: 'Skin', value: 'Black' }, // 40% Hazard Resistance
      { trait_type: 'Eyes', value: 'Angry' },
      { trait_type: 'Aura', value: 'Fiery Aura' }, // High risk (0.85 shortcut)
      { trait_type: 'Body', value: 'Tuxedo' },
      { trait_type: 'Side', value: 'Right' }
    ]
  }
];

export function getStandardRaceOpponents(): { id: string; tokenId: number; name: string; policy: CompiledPolicy }[] {
  return STANDARD_RACE_RIVALS.map(r => ({
    id: r.name,
    tokenId: r.tokenId,
    name: r.name,
    policy: compilePolicy({
      tokenId: r.tokenId,
      name: r.name,
      attributes: r.traits
    })
  }));
}

/**
 * Builds a deterministic 14x14 closed circuit race track
 */
export function buildRaceTrack(seed: number): RaceTrackData {
  const prng = new DeterministicPRNG(seed);
  const trackTiles: Position[] = [];
  const walls: Position[] = [];
  const trackSet = new Set<string>();

  // Outer circuit coordinates:
  // Top straight: y = 2, 3; x from 2 to 11
  // Right straight: x = 10, 11; y from 2 to 11
  // Bottom straight: y = 10, 11; x from 2 to 11
  // Left straight: x = 2, 3; y from 2 to 11
  for (let x = 2; x <= 11; x++) {
    for (let y = 2; y <= 3; y++) trackSet.add(`${x},${y}`);
    for (let y = 10; y <= 11; y++) trackSet.add(`${x},${y}`);
  }
  for (let y = 2; y <= 11; y++) {
    for (let x = 2; x <= 3; x++) trackSet.add(`${x},${y}`);
    for (let x = 10; x <= 11; x++) trackSet.add(`${x},${y}`);
  }

  // Risky Shortcut:
  // Branches after Checkpoint 2 (from x=9, y=7) cutting across inner courtyard to Checkpoint 3 (x=6, y=10)
  const shortcutTiles: Position[] = [
    { x: 9, y: 7 },
    { x: 8, y: 7 },
    { x: 7, y: 7 },
    { x: 7, y: 8 },
    { x: 7, y: 9 },
    { x: 6, y: 9 },
    { x: 6, y: 10 }
  ];
  for (const s of shortcutTiles) {
    trackSet.add(`${s.x},${s.y}`);
  }

  for (const key of Array.from(trackSet)) {
    const [x, y] = key.split(',').map(Number);
    trackTiles.push({ x, y });
  }

  // Walls: Boundary perimeter and inner non-track island
  for (let x = 0; x < RACE_GRID_WIDTH; x++) {
    for (let y = 0; y < RACE_GRID_HEIGHT; y++) {
      if (!trackSet.has(`${x},${y}`)) {
        walls.push({ x, y });
      }
    }
  }

  // Start Line: on the left straight at y=5
  const startPositions: Position[] = [
    { x: 2, y: 5 },
    { x: 3, y: 5 },
    { x: 2, y: 6 },
    { x: 3, y: 6 }
  ];

  // 3 Checkpoint Gates (in race direction: clockwise around track)
  // Checkpoint 1: Top Right corner (x=10,11; y=2,3)
  // Checkpoint 2: Mid-Right straight (x=10,11; y=6,7) - before shortcut fork
  // Checkpoint 3: Mid-Bottom straight (x=5,6; y=10,11) - where shortcut reconnects
  const checkpoints: CheckpointGate[] = [
    {
      index: 1,
      name: 'Sector 1 Gate',
      positions: [
        { x: 10, y: 2 },
        { x: 11, y: 2 },
        { x: 10, y: 3 },
        { x: 11, y: 3 }
      ]
    },
    {
      index: 2,
      name: 'Sector 2 Gate',
      positions: [
        { x: 10, y: 6 },
        { x: 11, y: 6 },
        { x: 10, y: 7 },
        { x: 11, y: 7 }
      ]
    },
    {
      index: 3,
      name: 'Sector 3 Gate',
      positions: [
        { x: 5, y: 10 },
        { x: 6, y: 10 },
        { x: 5, y: 11 },
        { x: 6, y: 11 }
      ]
    }
  ];

  // Finish Line: on the left straight right before start (y=3, 4)
  const finishLine: Position[] = [
    { x: 2, y: 3 },
    { x: 3, y: 3 },
    { x: 2, y: 4 },
    { x: 3, y: 4 }
  ];

  // Boost Pads: 3 pads chosen deterministically from diverse track sectors
  const boostCandidates = [
    { x: 6, y: 2 },   // Top straight
    { x: 8, y: 3 },   // Approaching Sector 1
    { x: 11, y: 10 }, // Outer corner bypass (rewards clean line)
    { x: 7, y: 11 },  // Bottom straight
    { x: 2, y: 8 }    // Left homestretch
  ];
  const boostPads: Position[] = prng.shuffle(boostCandidates).slice(0, 3);

  // Oil Slicks: 3 hazards chosen deterministically from candidate zones
  const oilCandidates = [
    { x: 8, y: 7 },  // shortcut entry hazard
    { x: 7, y: 8 },  // shortcut apex hazard
    { x: 11, y: 9 }, // outer sweep hazard
    { x: 9, y: 11 }, // bottom straight hazard
    { x: 3, y: 7 }   // homestretch hazard
  ];
  const oilSlicks: Position[] = prng.shuffle(oilCandidates).slice(0, 3);

  return {
    circuitWidth: RACE_GRID_WIDTH,
    circuitHeight: RACE_GRID_HEIGHT,
    trackTiles,
    walls,
    startPositions,
    checkpoints,
    finishLine,
    shortcutTiles,
    boostPads,
    oilSlicks
  };
}

/**
 * Creates initial match state for race-v1
 */
export function createRaceMatch(config: ArenaConfig): ArenaState {
  const track = buildRaceTrack(config.seed);

  const agents: AgentState[] = config.agents.slice(0, 4).map((cfg, idx) => {
    const start = track.startPositions[idx % track.startPositions.length];
    return {
      id: cfg.id,
      tokenId: cfg.tokenId,
      name: cfg.name,
      position: { ...start },
      energy: cfg.policy.energyCapacity,
      maxEnergy: cfg.policy.energyCapacity,
      score: 0,
      shieldRemaining: cfg.policy.shieldCharges,
      nodesCollected: 0,
      hazardsHit: 0,
      isExhausted: false,
      policy: cfg.policy,
      statusMessage: 'Ready on Grid',
      checkpointsCleared: 0,
      hasFinished: false,
      finishTurn: undefined,
      usedTurboBurst: false,
      draftingCount: 0,
      distanceToNextGate: 20
    };
  });

  // Resource nodes correspond to Boost Pads (+10 turbo fuel, +15 score)
  const nodes: ResourceNode[] = track.boostPads.map((b, i) => ({
    id: `boost-${i}`,
    x: b.x,
    y: b.y,
    type: 'high_value',
    value: 15,
    active: true,
    respawnTurnsLeft: 0
  }));

  // Hazards correspond to Oil Slicks
  const hazards: HazardCell[] = track.oilSlicks.map(o => ({
    x: o.x,
    y: o.y,
    intensity: 1
  }));

  const standings: RaceStanding[] = agents.map((a, i) => ({
    agentId: a.id,
    name: a.name,
    rank: i + 1,
    checkpointsCleared: 0,
    hasFinished: false,
    turboFuel: a.energy
  }));

  return {
    seed: config.seed,
    rulesVersion: 'race-v1',
    turn: 0,
    maxTurns: config.maxTurns || RACE_MAX_TURNS,
    gridSize: { width: RACE_GRID_WIDTH, height: RACE_GRID_HEIGHT },
    agents,
    nodes,
    hazards,
    events: [],
    completed: false,
    winnerId: null,
    summary: {
      totalTurnsPlayed: 0,
      highestScore: 0,
      coopPointsUnlocked: 0,
      matchChecksum: 'race-init'
    },
    trackData: track,
    raceStandings: standings
  };
}

/**
 * Executes a single turn step in race-v1
 */
export function stepRaceMatch(prevState: ArenaState): ArenaState {
  if (prevState.completed) return prevState;

  const currentTurn = prevState.turn + 1;
  const track = prevState.trackData || buildRaceTrack(prevState.seed);
  const newEvents: TurnEvent[] = [];

  const agents: AgentState[] = prevState.agents.map(a => ({
    ...a,
    position: { ...a.position },
    policy: { ...a.policy }
  }));

  const nodes: ResourceNode[] = prevState.nodes.map(n => ({ ...n }));

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    if (agent.hasFinished) continue;

    const fromPos = { ...agent.position };
    const currentCP = agent.checkpointsCleared || 0;

    // Target checkpoint gate or finish line
    let targetPositions: Position[];
    let targetName: string;

    if (currentCP === 0) {
      targetPositions = track.checkpoints[0].positions;
      targetName = 'Checkpoint 1';
    } else if (currentCP === 1) {
      targetPositions = track.checkpoints[1].positions;
      targetName = 'Checkpoint 2';
    } else if (currentCP === 2) {
      targetPositions = track.checkpoints[2].positions;
      targetName = 'Checkpoint 3';
    } else {
      targetPositions = track.finishLine;
      targetName = 'Finish Line';
    }

    // Determine target coordinate (closest gate tile)
    let bestTarget = targetPositions[0];
    let minDist = 999;
    for (const t of targetPositions) {
      const d = Math.abs(agent.position.x - t.x) + Math.abs(agent.position.y - t.y);
      if (d < minDist) {
        minDist = d;
        bestTarget = t;
      }
    }

    // Decide whether to take the Risky Shortcut:
    // After clearing Checkpoint 2 (currentCP === 2), if agent riskTolerance > 0.55, take shortcut!
    const shortcutEntrance = track.shortcutTiles[0];
    const shortcutExit = track.shortcutTiles[track.shortcutTiles.length - 1];
    const inShortcut = track.shortcutTiles.slice(0, -1).some(
      s => s.x === agent.position.x && s.y === agent.position.y
    );
    const wantsShortcut = currentCP === 2 && agent.policy.riskTolerance > 0.55;
    const takesShortcut = inShortcut || (wantsShortcut && agent.position.y >= 6 && agent.position.y <= 8);

    if (takesShortcut) {
      bestTarget = inShortcut ? shortcutExit : shortcutEntrance;
      targetName = 'Risky Shortcut Corridor';
    }

    // Compute step speed:
    // Base speed = 1 step per turn
    // Sprinters (speed === 2) sprint at 2 steps per turn when energy >= 32, burning high turbo fuel
    // Daredevils (riskTolerance > 0.6) push to 2 steps/turn when attacking the shortcut corridor
    // Safe Cruisers maintain steady 1.5 pace on straightaways with clean battery
    // Out-of-fuel cars sputter (moving 1 step only on alternate even turns)
    let isSprinting = false;
    let baseSteps = 1;

    if (agent.energy <= 0) {
      baseSteps = currentTurn % 2 === 0 ? 1 : 0;
    } else if (agent.policy.speed === 2 && currentTurn <= 8 && currentTurn % 2 === 0 && agent.energy >= 25) {
      // Sprinter strategic opening sprints (turns 2, 4, 6, 8)
      baseSteps = 2;
      isSprinting = true;
    } else if (takesShortcut && agent.policy.riskTolerance > 0.60 && agent.energy >= 10) {
      // Aggressive shortcut attack & corridor sprint
      baseSteps = 2;
      isSprinting = true;
    } else if (agent.policy.speed === 2 && currentCP >= 3 && agent.energy >= 20) {
      // Sprinter homestretch full throttle
      baseSteps = 2;
      isSprinting = true;
    } else if (agent.policy.riskTolerance > 0.60 && currentCP >= 3 && agent.energy >= 8) {
      // Daredevil homestretch flat-out sprint
      baseSteps = 2;
      isSprinting = true;
    } else if (agent.policy.coopBias > 0.60 && currentCP >= 3 && agent.energy >= 20) {
      // Tactician homestretch slipstream push
      baseSteps = 2;
      isSprinting = true;
    } else if (agent.policy.riskTolerance <= 0.35 && (((currentTurn === 8 || currentTurn === 16) && agent.energy >= 60) || (currentCP >= 3 && agent.energy >= 30))) {
      // Safe Cruiser steady cruising rhythm + homestretch overdrive powered by battery reserve
      baseSteps = 2;
    } else {
      baseSteps = 1;
    }

    // Check drafting opportunity behind any opponent in direct slipstream (same lane/column/row) within 1-3 tiles ahead
    let isDrafting = false;
    let draftBonus = 0;
    const opponentAhead = agents.find(
      other =>
        other.id !== agent.id &&
        !other.hasFinished &&
        (other.position.x === agent.position.x || other.position.y === agent.position.y) &&
        Math.abs(other.position.x - agent.position.x) + Math.abs(other.position.y - agent.position.y) >= 1 &&
        Math.abs(other.position.x - agent.position.x) + Math.abs(other.position.y - agent.position.y) <= 3 &&
        ((other.checkpointsCleared || 0) > (agent.checkpointsCleared || 0) ||
          ((other.checkpointsCleared || 0) === (agent.checkpointsCleared || 0) &&
            (other.distanceToNextGate ?? 99) <= (agent.distanceToNextGate ?? 99)))
    );

    if (opponentAhead && agent.policy.coopBias > 0.55 && currentTurn % 2 === 0 && (agent.draftingCount || 0) < 10) {
      isDrafting = true;
      draftBonus = 1;
      agent.draftingCount = (agent.draftingCount || 0) + 1;
    }

    // One-time Turbo Burst special action:
    // Mapped strategically per archetype personality
    let usedBurstThisTurn = false;
    if (!agent.usedTurboBurst && agent.energy >= 15) {
      const isSprinterHoleshot = agent.policy.speed === 2 && currentTurn <= 3;
      const isDaredevilShortcutBurst = agent.policy.riskTolerance > 0.6 && takesShortcut;
      const isDraftingSlingshot = agent.policy.coopBias > 0.6 && currentCP >= 3 && (isDrafting || (agent.distanceToNextGate ?? 99) <= 6);
      const isCruiserFinishSprint = agent.policy.riskTolerance <= 0.35 && currentCP >= 3;

      if (isSprinterHoleshot || isDaredevilShortcutBurst || isDraftingSlingshot || isCruiserFinishSprint) {
        agent.usedTurboBurst = true;
        usedBurstThisTurn = true;
        draftBonus += (isCruiserFinishSprint || isDraftingSlingshot) ? 3 : 2;
      }
    }

    let totalSteps = baseSteps + draftBonus;

    // Advance agent toward target along allowed track tiles
    let nextPos = { ...agent.position };
    let stepsTaken = 0;
    let hitOilSlick = false;
    let hitBoostPad = false;
    let prevStepPos: Position | null = null;

    for (let s = 0; s < totalSteps; s++) {
      // Dynamic target re-evaluation within multi-step movement
      if (takesShortcut) {
        if (nextPos.x === shortcutExit.x && nextPos.y === shortcutExit.y) {
          bestTarget = track.finishLine[0];
          targetName = 'Finish Line';
        } else if (track.shortcutTiles.some(st => st.x === nextPos.x && st.y === nextPos.y)) {
          bestTarget = shortcutExit;
          targetName = 'Risky Shortcut Corridor';
        } else {
          bestTarget = shortcutEntrance;
          targetName = 'Risky Shortcut Corridor';
        }
      }

      const candidates = [
        { x: nextPos.x + 1, y: nextPos.y },
        { x: nextPos.x - 1, y: nextPos.y },
        { x: nextPos.x, y: nextPos.y + 1 },
        { x: nextPos.x, y: nextPos.y - 1 }
      ];

      // Filter to valid track tiles and not walls.
      // If agent is not taking the shortcut, prevent entering shortcut corridor tiles.
      let valid = candidates.filter(c => {
        const isTrack = track.trackTiles.some(t => t.x === c.x && t.y === c.y);
        if (!isTrack) return false;
        if (!takesShortcut && track.shortcutTiles.slice(0, -1).some(st => st.x === c.x && st.y === c.y)) {
          return false;
        }
        return true;
      });

      // Avoid immediately stepping backward to the tile we just stepped from during multi-step movement
      if (prevStepPos && valid.length > 1) {
        const nonBackwards = valid.filter(c => c.x !== prevStepPos!.x || c.y !== prevStepPos!.y);
        if (nonBackwards.length > 0) {
          valid = nonBackwards;
        }
      }

      // Sort by Manhattan distance to bestTarget, with hazard avoidance for cautious racers
      valid.sort((a, b) => {
        const isOilA = track.oilSlicks.some(o => o.x === a.x && o.y === a.y);
        const isOilB = track.oilSlicks.some(o => o.x === b.x && o.y === b.y);
        const hazardPenaltyA = (isOilA && agent.policy.riskTolerance <= 0.40) ? 5 : 0;
        const hazardPenaltyB = (isOilB && agent.policy.riskTolerance <= 0.40) ? 5 : 0;
        const dA = Math.abs(a.x - bestTarget.x) + Math.abs(a.y - bestTarget.y) + hazardPenaltyA;
        const dB = Math.abs(b.x - bestTarget.x) + Math.abs(b.y - bestTarget.y) + hazardPenaltyB;
        return dA - dB;
      });

      if (valid.length > 0 && (valid[0].x !== nextPos.x || valid[0].y !== nextPos.y)) {
        prevStepPos = { ...nextPos };
        nextPos = valid[0];
        stepsTaken++;

        // Immediately register checkpoint clearance during multi-step movement
        if ((agent.checkpointsCleared || 0) === 0 && track.checkpoints[0].positions.some(p => p.x === nextPos.x && p.y === nextPos.y)) {
          agent.checkpointsCleared = 1;
        } else if ((agent.checkpointsCleared || 0) === 1 && track.checkpoints[1].positions.some(p => p.x === nextPos.x && p.y === nextPos.y)) {
          agent.checkpointsCleared = 2;
        } else if ((agent.checkpointsCleared || 0) === 2 && (
          track.checkpoints[2].positions.some(p => p.x === nextPos.x && p.y === nextPos.y) ||
          (nextPos.x === shortcutExit.x && nextPos.y === shortcutExit.y)
        )) {
          agent.checkpointsCleared = 3;
          bestTarget = track.finishLine[0];
          targetName = 'Finish Line';
        }

        // When touching shortcut exit, target immediately switches to Finish Line
        if (nextPos.x === shortcutExit.x && nextPos.y === shortcutExit.y) {
          if ((agent.checkpointsCleared || 0) < 3) {
            agent.checkpointsCleared = 3;
            agent.score += 50;
          }
          bestTarget = track.finishLine[0];
          targetName = 'Finish Line';
          agent.score += 170;
        }

        // Check oil slick hazard
        if (track.oilSlicks.some(o => o.x === nextPos.x && o.y === nextPos.y)) {
          hitOilSlick = true;
          if (agent.policy.hazardResist < 0.30) {
            break; // low-traction cars spin out and halt further multi-step movement
          }
        }

        // Check boost pad: gives immediate +1 step surge forward
        if (track.boostPads.some(b => b.x === nextPos.x && b.y === nextPos.y)) {
          hitBoostPad = true;
          if (s === totalSteps - 1 && stepsTaken < 3) {
            totalSteps++; // boost pad launches racer 1 extra tile forward
          }
        }

        // Shortcut exit apex slingshot
        if (takesShortcut && nextPos.x === shortcutExit.x && nextPos.y === shortcutExit.y && stepsTaken <= 2) {
          totalSteps++;
        }
      }
    }

    agent.position = nextPos;

    // Energy / Turbo Fuel calculations
    // Base step = 1.6 fuel; sprint step = 5.5 fuel (3.0 fuel in downhill shortcut); drafting step = 0 fuel
    const chargedSteps = isDrafting ? Math.max(0, stepsTaken - 1) : stepsTaken;
    const stepCost = isSprinting ? (takesShortcut ? 3.0 : 5.5) : (agent.policy.riskTolerance <= 0.35 ? 1.5 : 1.8);
    let fuelDelta = -(chargedSteps * stepCost);
    let scoreDelta = stepsTaken * 2;
    let reason = `Navigated toward ${targetName}`;

    if (isDrafting) {
      reason += ' • [Slipstream Draft] +1 Speed bonus at 0 fuel!';
    }

    if (usedBurstThisTurn) {
      fuelDelta -= 6;
      scoreDelta += 5;
      reason += ' • [Special Action] TURBO BURST ignited!';
    }

    if (hitBoostPad) {
      fuelDelta += 25;
      scoreDelta += 15;
      agent.nodesCollected++;
      reason += ' • Hit BOOST PAD (+25 fuel & +15 pts)!';
    }

    if (hitOilSlick) {
      const slickDmg = Math.round(10 * (1 - agent.policy.hazardResist) * agent.policy.hazardVuln);
      fuelDelta -= slickDmg;
      agent.hazardsHit++;
      reason += ` • Slipped on OIL SLICK (-${slickDmg} turbo fuel)!`;
    }

    if (takesShortcut) {
      scoreDelta += 5;
      reason += ' • High-risk shortcut committed!';
    }

    agent.energy = Math.max(0, agent.energy + fuelDelta);
    agent.score += scoreDelta;

    // Check Checkpoint Gates passage
    if (currentCP === 0 && track.checkpoints[0].positions.some(p => p.x === agent.position.x && p.y === agent.position.y)) {
      agent.checkpointsCleared = 1;
      agent.score += 50;
      reason += ' 🏁 CHECKPOINT 1 CLEARED!';
    } else if (currentCP === 1 && track.checkpoints[1].positions.some(p => p.x === agent.position.x && p.y === agent.position.y)) {
      agent.checkpointsCleared = 2;
      agent.score += 50;
      reason += ' 🏁 CHECKPOINT 2 CLEARED!';
    } else if (currentCP === 2 && track.checkpoints[2].positions.some(p => p.x === agent.position.x && p.y === agent.position.y)) {
      agent.checkpointsCleared = 3;
      agent.score += 50;
      reason += ' 🏁 CHECKPOINT 3 CLEARED!';
    } else if (currentCP === 3 && track.finishLine.some(p => p.x === agent.position.x && p.y === agent.position.y)) {
      agent.hasFinished = true;
      agent.finishTurn = currentTurn;
      // Bonus score for fast finish
      const speedBonus = Math.max(0, (RACE_MAX_TURNS - currentTurn) * 15);
      agent.score += 200 + speedBonus;
      reason += ` 🏆 CROSSED FINISH LINE on Turn ${currentTurn}! (+${200 + speedBonus} pts)`;
    }

    agent.distanceToNextGate = Math.abs(agent.position.x - bestTarget.x) + Math.abs(agent.position.y - bestTarget.y);

    const actionType: ArenaAction['type'] = agent.hasFinished
      ? 'finish'
      : (usedBurstThisTurn ? 'turbo_burst' : (isDrafting ? 'draft' : (hitBoostPad ? 'boost' : (takesShortcut ? 'shortcut' : 'move'))));

    newEvents.push({
      turn: currentTurn,
      stepIndex: newEvents.length,
      agentId: agent.id,
      action: {
        type: actionType,
        from: fromPos,
        to: nextPos,
        energyDelta: fuelDelta,
        scoreDelta,
        reason
      },
      agentEnergyAfter: agent.energy,
      agentScoreAfter: agent.score
    });
  }

  // Calculate live race standings
  const sortedStandings = [...agents].sort((a, b) => {
    // 1. Finished first
    if (a.hasFinished && b.hasFinished) {
      if ((a.finishTurn || 0) !== (b.finishTurn || 0)) {
        return (a.finishTurn || 0) - (b.finishTurn || 0);
      }
      return b.score - a.score;
    }
    if (a.hasFinished) return -1;
    if (b.hasFinished) return 1;

    // 2. Most checkpoints cleared
    const cpA = a.checkpointsCleared || 0;
    const cpB = b.checkpointsCleared || 0;
    if (cpA !== cpB) return cpB - cpA;

    // 3. Closest to next checkpoint gate
    const distA = a.distanceToNextGate || 99;
    const distB = b.distanceToNextGate || 99;
    if (distA !== distB) return distA - distB;

    // 4. Turbo fuel tiebreaker
    return b.energy - a.energy;
  });

  const raceStandings: RaceStanding[] = sortedStandings.map((a, i) => ({
    agentId: a.id,
    name: a.name,
    rank: i + 1,
    checkpointsCleared: a.checkpointsCleared || 0,
    hasFinished: !!a.hasFinished,
    finishTurn: a.finishTurn,
    turboFuel: a.energy
  }));

  // Check race completion
  const anyFinished = agents.some(a => a.hasFinished);
  const allFinishedOrExhausted = agents.every(a => a.hasFinished || (a.energy === 0 && currentTurn > 20));
  const reachedMaxTurns = currentTurn >= (prevState.maxTurns || RACE_MAX_TURNS);

  const isCompleted = anyFinished || allFinishedOrExhausted || reachedMaxTurns;
  let winnerId: string | null = null;
  if (isCompleted) {
    winnerId = sortedStandings[0].id;
  }

  // Checksum calculation for race verification
  const checksum = generateRaceChecksum(prevState.seed, currentTurn, agents);

  return {
    ...prevState,
    turn: currentTurn,
    agents,
    nodes,
    events: [...prevState.events, ...newEvents],
    completed: isCompleted,
    winnerId,
    summary: {
      totalTurnsPlayed: currentTurn,
      highestScore: Math.max(...agents.map(a => a.score)),
      coopPointsUnlocked: 0,
      matchChecksum: checksum
    },
    trackData: track,
    raceStandings
  };
}

/**
 * Executes a full race match from turn 0 to finish
 */
export function runFullRaceMatch(config: ArenaConfig): ReplaySnapshot {
  let state = createRaceMatch(config);
  const stateHistory: ArenaState[] = [state];

  while (!state.completed) {
    state = stepRaceMatch(state);
    stateHistory.push(state);
  }

  const finalScores: Record<string, number> = {};
  const agentPolicies: Record<string, CompiledPolicy> = {};
  for (const a of state.agents) {
    finalScores[a.id] = a.score;
    agentPolicies[a.id] = a.policy;
  }

  return {
    seed: config.seed,
    rulesVersion: 'race-v1',
    agentPolicies,
    stateHistory,
    events: state.events,
    finalScores,
    winnerId: state.winnerId,
    matchChecksum: state.summary.matchChecksum
  };
}

function generateRaceChecksum(seed: number, turn: number, agents: AgentState[]): string {
  let acc = (seed * 41 + turn * 13) >>> 0;
  for (const a of agents) {
    acc = (acc * 37 + a.position.x * 19 + a.position.y * 23 + (a.checkpointsCleared || 0) * 101 + a.score * 7 + a.energy) >>> 0;
  }
  return acc.toString(16).padStart(8, '0');
}
