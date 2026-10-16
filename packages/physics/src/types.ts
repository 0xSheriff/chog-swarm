/**
 * packages/physics/src/types.ts
 *
 * Types for /docs/pinball/table-layout.json — the single source of truth.
 * All coordinates are in table units: [0.0, 1.0] x, [0.0, 2.0] y.
 */

export interface TableLayout {
  _readme?: string;
  physicsScale: number;
  physicsScaleNote?: string;
  table: {
    width: number;
    height: number;
    playfieldRight: number;
    plungerLane: {
      x0: number;
      x1: number;
    };
  };
  gravity: number;
  gravityNote?: string;
  maxBallSpeed: number;
  ball: {
    radius: number;
    restitution: number;
    friction: number;
    bullet: boolean;
    start: {
      x: number;
      y: number;
    };
  };
  walls: {
    topArch: {
      type: 'arc';
      center: [number, number];
      radius: number;
      fromAngle: number;
      toAngle: number;
      note?: string;
    };
    leftWall: {
      type: 'line';
      from: [number, number];
      to: [number, number];
    };
    outerRightWall: {
      type: 'line';
      from: [number, number];
      to: [number, number];
    };
    laneInnerWall: {
      type: 'line';
      from: [number, number];
      to: [number, number];
    };
    leftApron: {
      type: 'line';
      from: [number, number];
      to: [number, number];
    };
    rightApron: {
      type: 'line';
      from: [number, number];
      to: [number, number];
    };
    oneWayGate: {
      type: 'gate';
      from: [number, number];
      to: [number, number];
      passes: 'up' | 'down';
      note?: string;
    };
  };
  plunger: {
    x: number;
    restY: number;
    travel: number;
    launchSpeedMin: number;
    launchSpeedMax: number;
    note?: string;
  };
  flippers: {
    left: {
      pivot: [number, number];
      length: number;
      baseRadius: number;
      tipRadius: number;
      restAngle: number;
      upAngle: number;
    };
    right: {
      pivot: [number, number];
      length: number;
      baseRadius: number;
      tipRadius: number;
      restAngle: number;
      upAngle: number;
    };
    swingUpRadPerSec: number;
    swingDownRadPerSec: number;
    note?: string;
  };
  slingshots: Array<{
    id: string;
    verts: [number, number][];
    kickFace: [number, number];
    kickExitSpeed: number;
  }>;
  popBumpers: Array<{
    id: string;
    x: number;
    y: number;
    radius: number;
    kickExitSpeed: number;
  }>;
  ghostTargets: Array<{
    id: string;
    x: number;
    y: number;
    radius: number;
  }>;
  ghostNote?: string;
  rolloverLanes: {
    letters: string[];
    y0: number;
    y1: number;
    dividerX: number[];
    dividerThickness: number;
    laneWidth: number;
  };
  cryptPortal: {
    x: number;
    y: number;
    radius: number;
    type: 'sensor';
    holdSeconds: number;
    note?: string;
  };
  drainSensor: {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
  };
  feel: {
    stuckBallSeconds: number;
    stuckSpeed: number;
    stuckAction: string;
  };
  validation: string[];
}
