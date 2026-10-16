import {
  ArenaConfig,
  ArenaState,
  AgentState,
  ResourceNode,
  HazardCell,
  TurnEvent,
  ReplaySnapshot,
  CompiledPolicy
} from './types';
import { DeterministicPRNG } from './prng';
import { evaluateAgentTurn } from './ai-policy';
import { createRaceMatch, stepRaceMatch, runFullRaceMatch } from './race-engine';

export function createMatch(config: ArenaConfig): ArenaState {
  if (config.rulesVersion === 'race-v1') {
    return createRaceMatch(config);
  }

  const prng = new DeterministicPRNG(config.seed);
  const width = config.gridWidth || 10;
  const height = config.gridHeight || 10;

  // Initialize agents at opposing quadrants
  const spawnPositions = [
    { x: 1, y: 1 },
    { x: width - 2, y: height - 2 },
    { x: width - 2, y: 1 },
    { x: 1, y: height - 2 }
  ];

  const agents: AgentState[] = config.agents.map((cfg, idx) => {
    const spawn = spawnPositions[idx % spawnPositions.length];
    return {
      id: cfg.id,
      tokenId: cfg.tokenId,
      name: cfg.name,
      position: { ...spawn },
      energy: cfg.policy.energyCapacity,
      maxEnergy: cfg.policy.energyCapacity,
      score: 0,
      shieldRemaining: cfg.policy.shieldCharges,
      nodesCollected: 0,
      hazardsHit: 0,
      isExhausted: false,
      policy: cfg.policy,
      statusMessage: 'Ready'
    };
  });

  // Seeded placement of Resource Nodes
  const nodes: ResourceNode[] = [];
  const occupied = new Set<string>();
  agents.forEach(a => occupied.add(`${a.position.x},${a.position.y}`));

  // 1 Central / Strategic Nexus node (+50 pts)
  const nexusX = Math.floor(width / 2);
  const nexusY = Math.floor(height / 2);
  nodes.push({
    id: 'nexus-0',
    x: nexusX,
    y: nexusY,
    type: 'nexus',
    value: 50,
    active: true,
    respawnTurnsLeft: 0
  });
  occupied.add(`${nexusX},${nexusY}`);

  // 2 High-Value Purple Amethyst nodes (+30 pts)
  for (let i = 0; i < 2; i++) {
    let px = prng.nextInt(1, width - 2);
    let py = prng.nextInt(1, height - 2);
    let attempts = 0;
    while (occupied.has(`${px},${py}`) && attempts < 20) {
      px = prng.nextInt(1, width - 2);
      py = prng.nextInt(1, height - 2);
      attempts++;
    }
    nodes.push({
      id: `purple-${i}`,
      x: px,
      y: py,
      type: 'high_value',
      value: 30,
      active: true,
      respawnTurnsLeft: 0
    });
    occupied.add(`${px},${py}`);
  }

  // 6 Standard Green Emerald nodes (+10 pts)
  for (let i = 0; i < 6; i++) {
    let sx = prng.nextInt(0, width - 1);
    let sy = prng.nextInt(0, height - 1);
    let attempts = 0;
    while (occupied.has(`${sx},${sy}`) && attempts < 30) {
      sx = prng.nextInt(0, width - 1);
      sy = prng.nextInt(0, height - 1);
      attempts++;
    }
    nodes.push({
      id: `std-${i}`,
      x: sx,
      y: sy,
      type: 'standard',
      value: 10,
      active: true,
      respawnTurnsLeft: 0
    });
    occupied.add(`${sx},${sy}`);
  }

  // Seeded Hazard Fissures (4 cells in strategic corridors)
  const hazards: HazardCell[] = [];
  const hazardSpots = [
    { x: nexusX - 1, y: nexusY },
    { x: nexusX + 1, y: nexusY },
    { x: nexusX, y: nexusY - 1 },
    { x: nexusX, y: nexusY + 1 }
  ];
  const chosenHazards = prng.shuffle(hazardSpots).slice(0, 3);
  for (const h of chosenHazards) {
    hazards.push({ x: h.x, y: h.y, intensity: 1 });
  }

  return {
    seed: config.seed,
    rulesVersion: config.rulesVersion || 'v1.0',
    turn: 0,
    maxTurns: config.maxTurns || 30,
    gridSize: { width, height },
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
      matchChecksum: 'init'
    }
  };
}

export function stepMatch(prevState: ArenaState): ArenaState {
  if (prevState.rulesVersion === 'race-v1') {
    return stepRaceMatch(prevState);
  }

  if (prevState.completed) return prevState;

  const currentTurn = prevState.turn + 1;
  const agents: AgentState[] = prevState.agents.map(a => ({
    ...a,
    position: { ...a.position },
    policy: { ...a.policy }
  }));

  const nodes: ResourceNode[] = prevState.nodes.map(n => ({ ...n }));
  const hazards: HazardCell[] = prevState.hazards.map(h => ({ ...h }));
  const newEvents: TurnEvent[] = [];

  let coopPointsUnlocked = prevState.summary.coopPointsUnlocked;

  // Process agent turns
  for (let idx = 0; idx < agents.length; idx++) {
    const agent = agents[idx];
    if (agent.isExhausted) continue;

    // Build temporary state snapshot for AI decision
    const currentSnapshot: ArenaState = {
      ...prevState,
      turn: currentTurn,
      agents,
      nodes,
      hazards
    };

    const action = evaluateAgentTurn(agent, currentSnapshot);

    // Apply movement
    agent.position = { ...action.to };

    // Apply energy change
    agent.energy = Math.max(0, agent.energy + action.energyDelta);
    if (agent.energy <= 0) {
      agent.isExhausted = true;
      agent.statusMessage = 'Exhausted';
    }

    // Apply score change
    agent.score += action.scoreDelta;

    // Check if node was collected
    if (action.targetNodeId && (action.type === 'collect' || action.scoreDelta > 0)) {
      const node = nodes.find(n => n.id === action.targetNodeId);
      if (node && node.active) {
        node.active = false;
        node.respawnTurnsLeft = node.type === 'nexus' ? 8 : 4;
        agent.nodesCollected++;
        if (node.type === 'nexus') coopPointsUnlocked += action.scoreDelta;
      }
    }

    // Check if katana cleaved hazard
    if (action.type === 'cleave') {
      const hIdx = hazards.findIndex(h => Math.abs(h.x - action.to.x) <= 1 && Math.abs(h.y - action.to.y) <= 1);
      if (hIdx >= 0) hazards.splice(hIdx, 1);
    }

    // Monad Turn 14 surge perk
    if (currentTurn === 14 && agent.policy.specialPerks.monCapSurge) {
      agent.score += 5;
      action.reason += ' [Perk: Mon Cap] +5 Monad Surge bonus!';
    }

    // Periodic maintenance decay (Tier: Legendary/Mythic)
    if (agent.policy.tempoDecayEvery5Turns > 0 && currentTurn % 5 === 0) {
      agent.energy = Math.max(0, agent.energy - agent.policy.tempoDecayEvery5Turns);
      if (agent.energy <= 0) agent.isExhausted = true;
    }

    newEvents.push({
      turn: currentTurn,
      stepIndex: newEvents.length,
      agentId: agent.id,
      action,
      agentEnergyAfter: agent.energy,
      agentScoreAfter: agent.score
    });
  }

  // Update node respawns
  for (const node of nodes) {
    if (!node.active && node.respawnTurnsLeft > 0) {
      node.respawnTurnsLeft--;
      if (node.respawnTurnsLeft === 0) {
        node.active = true;
      }
    }
  }

  // Check completion conditions
  const allExhausted = agents.every(a => a.isExhausted);
  const turnsFinished = currentTurn >= prevState.maxTurns;
  const isCompleted = allExhausted || turnsFinished;

  let winnerId: string | null = null;
  let highestScore = 0;

  if (isCompleted) {
    const sorted = [...agents].sort((a, b) => b.score - a.score || b.energy - a.energy);
    winnerId = sorted[0].id;
    highestScore = sorted[0].score;
  }

  // Deterministic checksum calculation
  const checksum = generateChecksum(prevState.seed, currentTurn, agents, nodes);

  return {
    ...prevState,
    turn: currentTurn,
    agents,
    nodes,
    hazards,
    events: [...prevState.events, ...newEvents],
    completed: isCompleted,
    winnerId,
    summary: {
      totalTurnsPlayed: currentTurn,
      highestScore: isCompleted ? highestScore : Math.max(...agents.map(a => a.score)),
      coopPointsUnlocked,
      matchChecksum: checksum
    }
  };
}

export function runFullMatch(config: ArenaConfig): ReplaySnapshot {
  if (config.rulesVersion === 'race-v1') {
    return runFullRaceMatch(config);
  }

  let state = createMatch(config);
  const stateHistory: ArenaState[] = [state];

  while (!state.completed) {
    state = stepMatch(state);
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
    rulesVersion: config.rulesVersion || 'v1.0',
    agentPolicies,
    stateHistory,
    events: state.events,
    finalScores,
    winnerId: state.winnerId,
    matchChecksum: state.summary.matchChecksum
  };
}

function generateChecksum(seed: number, turn: number, agents: AgentState[], nodes: ResourceNode[]): string {
  let acc = seed * 31 + turn;
  for (const a of agents) {
    acc = (acc * 33 + a.position.x * 17 + a.position.y * 19 + a.score * 7 + a.energy) >>> 0;
  }
  for (const n of nodes) {
    acc = (acc * 23 + (n.active ? 1 : 0) * 11 + n.x + n.y) >>> 0;
  }
  return acc.toString(16).padStart(8, '0');
}
