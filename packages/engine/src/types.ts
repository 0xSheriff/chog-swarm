export interface TraitAttribute {
  trait_type: string;
  value: string;
}

export interface ChogNFT {
  tokenId: number;
  name: string;
  image?: string;
  attributes: TraitAttribute[];
}

export interface DerivedTraitExplanation {
  traitType: string;
  nativeValue: string;
  derivedParam: string;
  gameEffect: string;
  tradeoff: string;
}

export interface CompiledPolicy {
  // Baseline stats
  energyCapacity: number;
  moveEnergyCost: number;
  speed: number; // 1 or 2 steps per turn

  // Defenses & hazards
  hazardResist: number; // 0.0 to 0.40 damage reduction
  hazardVuln: number;   // 1.0 to 1.25 damage multiplier
  shieldCharges: number;// 0 or 1 absorption charge

  // Decision & Pathing weights
  riskTolerance: number;          // 0.0 (strictly safe) to 1.0 (daredevil)
  highValueTargetWeight: number;  // 1.0 (nearest) to 3.0 (greedy purple sniper)
  coopBias: number;               // 0.0 (solo hoarder) to 1.0 (nexus cooperator)
  tiebreaker: 'clockwise' | 'counter-clockwise'; // Side: Right vs Left
  perceptionRadius: number;       // Grid scan horizon (5 to 7)

  // Energy dynamics
  tempoDecayEvery5Turns: number; // Maintenance energy drain
  surgeBonusActive: boolean;     // Yellow skin surge

  // Special Perk triggers
  specialPerks: {
    fwogDiagonalReach?: boolean;
    katanaHazardCleave?: boolean;
    monCapSurge?: boolean;
    wizardHatWarp?: boolean;
  };

  // Trait breakdown for UI display
  derivedBreakdown: DerivedTraitExplanation[];
}

export type NodeType = 'standard' | 'high_value' | 'nexus';

export interface ResourceNode {
  id: string;
  x: number;
  y: number;
  type: NodeType;
  value: number; // 10, 30, or 50 (shared 25/25)
  active: boolean;
  respawnTurnsLeft: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface AgentState {
  id: string;
  tokenId: number;
  name: string;
  position: Position;
  energy: number;
  maxEnergy: number;
  score: number;
  shieldRemaining: number;
  nodesCollected: number;
  hazardsHit: number;
  isExhausted: boolean;
  policy: CompiledPolicy;
  statusMessage?: string;
}

export type ActionType =
  | 'move'
  | 'collect'
  | 'wait'
  | 'cleave'
  | 'warp'
  | 'exhausted'
  | 'boost'
  | 'shortcut'
  | 'draft'
  | 'turbo_burst'
  | 'finish';

export interface ArenaAction {
  type: ActionType;
  from: Position;
  to: Position;
  targetNodeId?: string;
  energyDelta: number;
  scoreDelta: number;
  reason: string;
}

export interface TurnEvent {
  turn: number;
  stepIndex: number;
  agentId: string;
  action: ArenaAction;
  agentEnergyAfter: number;
  agentScoreAfter: number;
}

export interface HazardCell {
  x: number;
  y: number;
  intensity: number; // 1 = regular hazard
}

export interface CheckpointGate {
  index: number; // 1, 2, 3
  name: string;
  positions: Position[];
}

export interface RaceTrackData {
  circuitWidth: number;
  circuitHeight: number;
  trackTiles: Position[];
  walls: Position[];
  startPositions: Position[];
  checkpoints: CheckpointGate[];
  finishLine: Position[];
  shortcutTiles: Position[];
  boostPads: Position[];
  oilSlicks: Position[];
}

export interface AgentState {
  id: string;
  tokenId: number;
  name: string;
  position: Position;
  energy: number;
  maxEnergy: number;
  score: number;
  shieldRemaining: number;
  nodesCollected: number;
  hazardsHit: number;
  isExhausted: boolean;
  policy: CompiledPolicy;
  statusMessage?: string;
  // Race-specific state
  checkpointsCleared?: number;
  hasFinished?: boolean;
  finishTurn?: number;
  usedTurboBurst?: boolean;
  draftingCount?: number;
  distanceToNextGate?: number;
}

export interface ArenaConfig {
  seed: number;
  rulesVersion: string;
  gridWidth: number;
  gridHeight: number;
  maxTurns: number;
  agents: {
    id: string;
    tokenId: number;
    name: string;
    policy: CompiledPolicy;
  }[];
}

export interface RaceStanding {
  agentId: string;
  name: string;
  rank: number;
  checkpointsCleared: number;
  hasFinished: boolean;
  finishTurn?: number;
  turboFuel: number;
}

export interface ArenaState {
  seed: number;
  rulesVersion: string;
  turn: number;
  maxTurns: number;
  gridSize: { width: number; height: number };
  agents: AgentState[];
  nodes: ResourceNode[];
  hazards: HazardCell[];
  events: TurnEvent[];
  completed: boolean;
  winnerId: string | null;
  summary: {
    totalTurnsPlayed: number;
    highestScore: number;
    coopPointsUnlocked: number;
    matchChecksum: string;
  };
  trackData?: RaceTrackData;
  raceStandings?: RaceStanding[];
}

export interface ReplaySnapshot {
  seed: number;
  rulesVersion: string;
  agentPolicies: Record<string, CompiledPolicy>;
  stateHistory: ArenaState[];
  events: TurnEvent[];
  finalScores: Record<string, number>;
  winnerId: string | null;
  matchChecksum: string;
}
