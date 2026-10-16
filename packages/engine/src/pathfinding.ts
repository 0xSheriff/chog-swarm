import { Position, HazardCell } from './types';

export interface PathfindingOptions {
  start: Position;
  goal: Position;
  gridWidth: number;
  gridHeight: number;
  hazards: HazardCell[];
  occupiedPositions?: Position[];
  riskTolerance: number; // 0.0 to 1.0
  tiebreaker: 'clockwise' | 'counter-clockwise';
  allowThroughHazard?: boolean;
}

interface Node {
  pos: Position;
  gCost: number;
  hCost: number;
  fCost: number;
  parent?: Node;
  dirIndex: number;
}

function manhattan(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function posKey(p: Position): string {
  return `${p.x},${p.y}`;
}

export function findDeterministicPath(opts: PathfindingOptions): Position[] {
  const {
    start,
    goal,
    gridWidth,
    gridHeight,
    hazards,
    occupiedPositions = [],
    riskTolerance,
    tiebreaker,
    allowThroughHazard = true
  } = opts;

  if (start.x === goal.x && start.y === goal.y) return [start];

  const hazardMap = new Map<string, number>();
  const hazardAdjacentSet = new Set<string>();

  for (const h of hazards) {
    hazardMap.set(posKey(h), h.intensity);
    // Neighbors
    const adj = [
      { x: h.x + 1, y: h.y },
      { x: h.x - 1, y: h.y },
      { x: h.x, y: h.y + 1 },
      { x: h.x, y: h.y - 1 }
    ];
    for (const p of adj) {
      if (p.x >= 0 && p.x < gridWidth && p.y >= 0 && p.y < gridHeight) {
        hazardAdjacentSet.add(posKey(p));
      }
    }
  }

  const occupiedSet = new Set<string>();
  for (const occ of occupiedPositions) {
    if (occ.x !== goal.x || occ.y !== goal.y) {
      occupiedSet.add(posKey(occ));
    }
  }

  // Directions based on tiebreaker
  // Clockwise: Up, Right, Down, Left
  // Counter-Clockwise: Up, Left, Down, Right
  const directions = tiebreaker === 'clockwise'
    ? [
        { dx: 0, dy: -1, name: 'up' },
        { dx: 1, dy: 0, name: 'right' },
        { dx: 0, dy: 1, name: 'down' },
        { dx: -1, dy: 0, name: 'left' }
      ]
    : [
        { dx: 0, dy: -1, name: 'up' },
        { dx: -1, dy: 0, name: 'left' },
        { dx: 0, dy: 1, name: 'down' },
        { dx: 1, dy: 0, name: 'right' }
      ];

  const openList: Node[] = [];
  const closedSet = new Set<string>();

  const startNode: Node = {
    pos: start,
    gCost: 0,
    hCost: manhattan(start, goal),
    fCost: manhattan(start, goal),
    dirIndex: 0
  };
  openList.push(startNode);

  while (openList.length > 0) {
    // Sort open list deterministically: lowest fCost, then lowest hCost, then lowest dirIndex
    openList.sort((a, b) => {
      if (a.fCost !== b.fCost) return a.fCost - b.fCost;
      if (a.hCost !== b.hCost) return a.hCost - b.hCost;
      return a.dirIndex - b.dirIndex;
    });

    const current = openList.shift()!;
    const currentKey = posKey(current.pos);

    if (current.pos.x === goal.x && current.pos.y === goal.y) {
      // Reconstruct path
      const path: Position[] = [];
      let curr: Node | undefined = current;
      while (curr) {
        path.unshift(curr.pos);
        curr = curr.parent;
      }
      return path;
    }

    closedSet.add(currentKey);

    for (let i = 0; i < directions.length; i++) {
      const dir = directions[i];
      const nextPos: Position = { x: current.pos.x + dir.dx, y: current.pos.y + dir.dy };

      if (
        nextPos.x < 0 ||
        nextPos.x >= gridWidth ||
        nextPos.y < 0 ||
        nextPos.y >= gridHeight
      ) {
        continue;
      }

      const nextKey = posKey(nextPos);
      if (closedSet.has(nextKey)) continue;
      if (occupiedSet.has(nextKey)) continue;

      const isHazard = hazardMap.has(nextKey);
      if (isHazard && !allowThroughHazard) continue;

      // Base step cost = 1.0
      let stepCost = 1.0;

      // Hazard penalty calculation based on riskTolerance
      if (isHazard) {
        // High risk (0.85): penalty = ~15
        // Low risk (0.10): penalty = ~85
        stepCost += (1.05 - riskTolerance) * 60;
      } else if (hazardAdjacentSet.has(nextKey) && riskTolerance < 0.35) {
        // Cautious buffer for low risk agents
        stepCost += (0.35 - riskTolerance) * 20;
      }

      const gCost = current.gCost + stepCost;
      const hCost = manhattan(nextPos, goal);
      const fCost = gCost + hCost;

      const existingOpen = openList.find(n => n.pos.x === nextPos.x && n.pos.y === nextPos.y);
      if (existingOpen) {
        if (gCost < existingOpen.gCost) {
          existingOpen.gCost = gCost;
          existingOpen.fCost = fCost;
          existingOpen.parent = current;
          existingOpen.dirIndex = i;
        }
      } else {
        openList.push({
          pos: nextPos,
          gCost,
          hCost,
          fCost,
          parent: current,
          dirIndex: i
        });
      }
    }
  }

  // Fallback: direct line if blocked
  return [start];
}
