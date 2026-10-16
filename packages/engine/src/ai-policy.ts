import { AgentState, ArenaState, ArenaAction, ResourceNode, Position } from './types';
import { findDeterministicPath } from './pathfinding';

function manhattan(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function posKey(p: Position): string {
  return `${p.x},${p.y}`;
}

export function evaluateAgentTurn(agent: AgentState, state: ArenaState): ArenaAction {
  const { policy, position, energy } = agent;
  const currentPos = { ...position };

  // 1. Check exhaustion
  if (energy <= 0) {
    return {
      type: 'exhausted',
      from: currentPos,
      to: currentPos,
      energyDelta: 0,
      scoreDelta: 0,
      reason: '[Exhausted] Energy pool depleted. Agent idle.'
    };
  }

  // 2. Check if standing on an active resource node
  const standingNode = state.nodes.find(n => n.active && n.x === currentPos.x && n.y === currentPos.y);
  if (standingNode) {
    let scoreGain = standingNode.value;
    if (standingNode.type === 'nexus') {
      // Shared nexus: full value if partner also on nexus, else partial
      const partner = state.agents.find(a => a.id !== agent.id);
      const partnerOnNexus = partner && partner.position.x === standingNode.x && partner.position.y === standingNode.y;
      scoreGain = partnerOnNexus ? 50 : 25;
    }

    return {
      type: 'collect',
      from: currentPos,
      to: currentPos,
      targetNodeId: standingNode.id,
      energyDelta: 0,
      scoreDelta: scoreGain,
      reason: `[Harvest] Harvested ${standingNode.type.toUpperCase()} node (+${scoreGain} pts) at (${standingNode.x},${standingNode.y}).`
    };
  }

  // 3. Special Perk: Fwog Diagonal Reach
  if (policy.specialPerks.fwogDiagonalReach) {
    const diagNode = state.nodes.find(n =>
      n.active &&
      Math.abs(n.x - currentPos.x) === 1 &&
      Math.abs(n.y - currentPos.y) === 1
    );
    if (diagNode) {
      return {
        type: 'collect',
        from: currentPos,
        to: currentPos,
        targetNodeId: diagNode.id,
        energyDelta: 0,
        scoreDelta: diagNode.value,
        reason: `[Accessory: Fwog] Diagonal Reach harvested adjacent ${diagNode.type.toUpperCase()} node (+${diagNode.value} pts) at (${diagNode.x},${diagNode.y}).`
      };
    }
  }

  // 4. Special Perk: Katana Hazard Cleave
  if (policy.specialPerks.katanaHazardCleave && energy > 25) {
    const adjacentHazard = state.hazards.find(h =>
      manhattan(h, currentPos) === 1
    );
    if (adjacentHazard && agent.hazardsHit === 0) {
      return {
        type: 'cleave',
        from: currentPos,
        to: currentPos,
        energyDelta: -10,
        scoreDelta: 5,
        reason: `[Accessory: Katana] Hazard Cleave: Neutralized adjacent fissure at (${adjacentHazard.x},${adjacentHazard.y}) (-10 Energy, +5 Score).`
      };
    }
  }

  // 5. Special Perk: Wizard Hat Warp on Turn 10
  if (policy.specialPerks.wizardHatWarp && state.turn === 10 && energy > 50) {
    const purpleNode = state.nodes.find(n => n.active && n.type === 'high_value');
    if (purpleNode) {
      const warpX = Math.round((currentPos.x * 2 + purpleNode.x) / 3);
      const warpY = Math.round((currentPos.y * 2 + purpleNode.y) / 3);
      const targetPos: Position = {
        x: Math.max(0, Math.min(state.gridSize.width - 1, warpX)),
        y: Math.max(0, Math.min(state.gridSize.height - 1, warpY))
      };
      return {
        type: 'warp',
        from: currentPos,
        to: targetPos,
        energyDelta: -5,
        scoreDelta: 0,
        reason: `[Head: Wizard Hat] Turn 10 Warp Stride: Blinks 3 tiles toward Amethyst target at (${purpleNode.x},${purpleNode.y}).`
      };
    }
  }

  // 6. Objective Selection: Scan active nodes
  const activeNodes = state.nodes.filter(n => n.active);
  if (activeNodes.length === 0) {
    return {
      type: 'wait',
      from: currentPos,
      to: currentPos,
      energyDelta: -1,
      scoreDelta: 0,
      reason: '[Idle] No active resource nodes available in arena. Conserving power.'
    };
  }

  // Score candidate nodes
  let bestNode: ResourceNode | null = null;
  let bestScore = -Infinity;
  let bestReasonPrefix = '';

  const otherAgent = state.agents.find(a => a.id !== agent.id);

  for (const node of activeNodes) {
    const dist = manhattan(currentPos, node);

    // Filter by perception horizon
    if (dist > policy.perceptionRadius + 2) continue;

    let utility = node.value;
    let reasonTrait = 'Local Harvester';

    if (node.type === 'high_value') {
      utility *= policy.highValueTargetWeight;
      reasonTrait = policy.highValueTargetWeight > 1.5 ? 'Laser Eyes' : 'Target Priority';
    } else if (node.type === 'nexus') {
      // Nexus valuation driven by coopBias
      utility = node.value * (policy.coopBias * 1.8);
      reasonTrait = policy.coopBias > 0.6 ? '143 Jersey Co-op' : 'Nexus Seek';
      if (otherAgent && manhattan(otherAgent.position, node) <= 4) {
        utility += 20 * policy.coopBias;
      }
    }

    // Energy travel cost
    const travelCost = dist * policy.moveEnergyCost;

    // Check proximity of node to hazards
    const isNearHazard = state.hazards.some(h => manhattan(h, node) <= 1);
    let hazardPenalty = 0;
    if (isNearHazard) {
      if (policy.riskTolerance < 0.3) {
        hazardPenalty = 30 * (0.35 - policy.riskTolerance);
        reasonTrait = 'Aqua Aura Safe Buffer';
      } else if (policy.riskTolerance > 0.7) {
        // High risk appetite enjoys bonus on hazard adjacent nodes
        utility *= 1.15;
        reasonTrait = 'Burning Aura Daredevil';
      }
    }

    const netScore = utility - travelCost - hazardPenalty;

    if (netScore > bestScore) {
      bestScore = netScore;
      bestNode = node;
      bestReasonPrefix = `[${reasonTrait}]`;
    }
  }

  if (!bestNode) {
    // Default to absolute closest node
    bestNode = activeNodes.reduce((closest, curr) => {
      const dCurr = manhattan(currentPos, curr);
      const dClosest = manhattan(currentPos, closest);
      return dCurr < dClosest ? curr : closest;
    }, activeNodes[0]);
    bestReasonPrefix = '[Nearest-Neighbor Fallback]';
  }

  // 7. Calculate deterministic path to target
  const otherPositions = state.agents
    .filter(a => a.id !== agent.id && !a.isExhausted)
    .map(a => a.position);

  const path = findDeterministicPath({
    start: currentPos,
    goal: { x: bestNode.x, y: bestNode.y },
    gridWidth: state.gridSize.width,
    gridHeight: state.gridSize.height,
    hazards: state.hazards,
    occupiedPositions: otherPositions,
    riskTolerance: policy.riskTolerance,
    tiebreaker: policy.tiebreaker
  });

  // Next step
  let targetStep = path.length > 1 ? path[1] : currentPos;

  // Check 2-step sprint for Red skin if energy > 20
  if (policy.speed === 2 && path.length > 2 && energy > 20) {
    targetStep = path[2];
  }

  // Check surge bonus on opening turns
  if (policy.surgeBonusActive && state.turn <= 8 && path.length > 2 && energy > 25) {
    targetStep = path[2];
  }

  const stepDistance = manhattan(currentPos, targetStep);
  let stepEnergyCost = stepDistance * policy.moveEnergyCost;

  // Check if stepping on a hazard tile
  const hitHazard = state.hazards.find(h => h.x === targetStep.x && h.y === targetStep.y);
  let hazardDamage = 0;
  let shieldAbsorbed = false;

  if (hitHazard) {
    if (agent.shieldRemaining > 0) {
      shieldAbsorbed = true;
    } else {
      hazardDamage = Math.round(25 * policy.hazardVuln * (1.0 - policy.hazardResist));
    }
  }

  const totalEnergyDrain = Math.min(energy, stepEnergyCost + hazardDamage);

  const routeDescription = policy.tiebreaker === 'clockwise' ? 'Clockwise' : 'Counter-Clockwise';
  const nodeTypeName = bestNode.type.toUpperCase();

  let actionReason = `${bestReasonPrefix} Targeted ${nodeTypeName} (+${bestNode.value}) at (${bestNode.x},${bestNode.y}) via ${routeDescription} path.`;

  if (hitHazard) {
    if (shieldAbsorbed) {
      actionReason += ` Shield absorbed hazard contact at (${targetStep.x},${targetStep.y})!`;
    } else {
      actionReason += ` Warning: stepped into Hazard (-${hazardDamage} Energy)!`;
    }
  }

  return {
    type: 'move',
    from: currentPos,
    to: targetStep,
    targetNodeId: bestNode.id,
    energyDelta: -totalEnergyDrain,
    scoreDelta: 0,
    reason: actionReason
  };
}
