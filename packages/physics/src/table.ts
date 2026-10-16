/**
 * packages/physics/src/table.ts
 *
 * Pure Planck.js 2D physics world for the Chog Haunted pinball table.
 * Framework-free: works in Node.js (server replay) and browser (client play).
 *
 * Table coordinate system:
 *   Origin (0, 0) = top-left
 *   X → right, Y → down
 *   Scale: 1 unit = 1/60 metres in Planck  (Planck uses MKS, ~1 unit = 1 m)
 *
 * Portrait table: 400 × 720 logical pixels → 400/60 × 720/60 = 6.67 × 12 m
 *
 * All lengths in this file are in WORLD UNITS (meters).
 */

import * as pl from 'planck';

// ── Table constants ───────────────────────────────────────────────────────────

export const TABLE_W = 400;     // pixels
export const TABLE_H = 720;     // pixels
export const PX_PER_M = 60;    // pixels per physics metre

/** Convert pixel coords to physics world coords */
export const px = (v: number) => v / PX_PER_M;

export const TW = px(TABLE_W); // 6.667 m
export const TH = px(TABLE_H); // 12.0  m

// ── Ball physics presets ──────────────────────────────────────────────────────

export interface BallPreset {
  radiusM: number;
  density: number;
  friction: number;
  restitution: number;
}

export const GUEST_BALL: BallPreset = {
  radiusM: px(14),
  density: 1.0,
  friction: 0.3,
  restitution: 0.6,
};

/** Derive ball physics from compiled Chog traits. */
export function traitsToBallPreset(traits: ChogTraits): BallPreset {
  // Body → mass/radius tradeoff
  // "Fluffy" body = bigger radius (floaty), "Bony" = smaller (precise)
  const bodyMod = traitMod(traits.body, ['Fluffy', 'Chonky', 'Normal', 'Slim', 'Bony']);
  const radiusScale = 1 + bodyMod * 0.2; // ±20%

  return {
    radiusM: px(14) * radiusScale,
    density: 0.8 + (1 - bodyMod) * 0.4, // Heavier = denser
    friction: 0.3,
    restitution: 0.55 + bodyMod * 0.1,  // Lighter = bouncier
  };
}

export interface ChogTraits {
  body: string;
  eyes: string;
  mouth: string;
  aura: string;
  head: string;
  tier: string;
}

/** Returns −1..+1 for a trait value against an ordered scale */
function traitMod(value: string, scale: string[]): number {
  const idx = scale.findIndex((s) => s.toLowerCase() === value.toLowerCase());
  if (idx < 0) return 0;
  return (idx / (scale.length - 1)) * 2 - 1; // normalise to −1..+1
}

// ── Table factory ─────────────────────────────────────────────────────────────

export interface PinballTable {
  world: pl.World;
  ball: pl.Body;
  leftFlipper: pl.Body;
  rightFlipper: pl.Body;
  leftFlipperJoint: pl.RevoluteJoint;
  rightFlipperJoint: pl.RevoluteJoint;
  plungerBody: pl.Body;
  plungerJoint: pl.PrismaticJoint;
  bumpers: pl.Body[];
  slingshots: pl.Body[];
}

/**
 * Build the full pinball world.
 * Call once; re-use across frames.
 */
export function createPinballTable(preset: BallPreset = GUEST_BALL): PinballTable {
  const world = pl.World({ gravity: pl.Vec2(0, 20) }); // gravity: 20 m/s² down

  // ── Walls ──────────────────────────────────────────────────────────────────
  const wallFd: pl.FixtureOpt = { friction: 0.1, restitution: 0.4 };

  function staticBox(x: number, y: number, hw: number, hh: number, angle = 0): pl.Body {
    const b = world.createBody({ type: 'static', position: pl.Vec2(x, y), angle });
    b.createFixture(pl.Box(hw, hh), wallFd);
    return b;
  }

  // Left wall
  staticBox(0, TH / 2, px(8), TH / 2);
  // Right wall
  staticBox(TW, TH / 2, px(8), TH / 2);
  // Top wall
  staticBox(TW / 2, 0, TW / 2, px(8));
  // Bottom (drain — very thin; ball passes through when lost)
  staticBox(TW / 2, TH + px(10), TW / 2, px(10));

  // Angled gutters at bottom-left and bottom-right
  const gutterAngle = 0.52; // ~30°
  staticBox(px(60), TH - px(80), px(50), px(8), gutterAngle);
  staticBox(TW - px(60), TH - px(80), px(50), px(8), -gutterAngle);

  // ── Bumpers (3 tombstones) ─────────────────────────────────────────────────
  const bumperPositions = [
    pl.Vec2(TW * 0.35, TH * 0.28),
    pl.Vec2(TW * 0.65, TH * 0.28),
    pl.Vec2(TW * 0.5,  TH * 0.2),
  ];

  const bumpers = bumperPositions.map((pos) => {
    const b = world.createBody({ type: 'static', position: pos });
    b.createFixture(pl.Circle(px(22)), {
      friction: 0.0,
      restitution: 1.4,  // energetic bounce
      density: 0,
    });
    (b as any).userData = { type: 'bumper' };
    return b;
  });

  // ── Slingshots (2 coffin shapes → triangular wedge static bodies) ──────────
  const slingshots: pl.Body[] = [];

  function addSlingshot(x: number, angle: number) {
    const b = world.createBody({ type: 'static', position: pl.Vec2(x, TH * 0.55), angle });
    b.createFixture(pl.Box(px(10), px(50)), {
      friction: 0.0,
      restitution: 1.2,
      density: 0,
    });
    (b as any).userData = { type: 'slingshot' };
    slingshots.push(b);
  }

  addSlingshot(px(55), 0.18);   // left slingshot
  addSlingshot(TW - px(55), -0.18); // right slingshot

  // ── Flippers ──────────────────────────────────────────────────────────────
  const flipperHW = px(55);
  const flipperHH = px(8);

  // Anchor positions
  const leftAnchor  = pl.Vec2(px(110), TH - px(80));
  const rightAnchor = pl.Vec2(TW - px(110), TH - px(80));

  function makeFlipper(anchor: pl.Vec2, side: 'left' | 'right'): [pl.Body, pl.RevoluteJoint] {
    const isLeft = side === 'left';
    const body = world.createBody({
      type: 'dynamic',
      position: anchor,
      bullet: true,
    });
    body.createFixture(pl.Box(flipperHW, flipperHH, pl.Vec2(isLeft ? flipperHW : -flipperHW, 0)), {
      density: 10,
      friction: 0.4,
      restitution: 0.1,
    });
    (body as any).userData = { type: 'flipper', side };

    const joint = world.createJoint(
      pl.RevoluteJoint(
        {
          enableLimit: true,
          lowerAngle: isLeft ? -0.5 : -1.0,
          upperAngle: isLeft ?  1.0 :  0.5,
          enableMotor: true,
          motorSpeed: 0,
          maxMotorTorque: 1000,
        },
        world.createBody({ type: 'static', position: anchor }),
        body,
        anchor
      )
    ) as pl.RevoluteJoint;

    return [body, joint];
  }

  const [leftFlipper, leftFlipperJoint]   = makeFlipper(leftAnchor, 'left');
  const [rightFlipper, rightFlipperJoint] = makeFlipper(rightAnchor, 'right');

  // ── Plunger ───────────────────────────────────────────────────────────────
  const plungerLane = TW - px(40); // right lane
  const plungerBody = world.createBody({
    type: 'dynamic',
    position: pl.Vec2(plungerLane, TH - px(100)),
  });
  plungerBody.createFixture(pl.Box(px(15), px(8)), {
    density: 5,
    friction: 0.5,
    restitution: 0.1,
  });
  (plungerBody as any).userData = { type: 'plunger' };

  const plungerGround = world.createBody({
    type: 'static',
    position: pl.Vec2(plungerLane, TH - px(40)),
  });

  const plungerJoint = world.createJoint(
    pl.PrismaticJoint(
      {
        enableLimit: true,
        lowerTranslation: -px(60),
        upperTranslation: 0,
        enableMotor: true,
        motorSpeed: 0,
        maxMotorForce: 5000,
      },
      plungerGround,
      plungerBody,
      pl.Vec2(plungerLane, TH - px(100)),
      pl.Vec2(0, 1)
    )
  ) as pl.PrismaticJoint;

  // ── Ball ──────────────────────────────────────────────────────────────────
  const ball = world.createBody({
    type: 'dynamic',
    position: pl.Vec2(plungerLane, TH - px(130)),
    bullet: true,
    linearDamping: 0.05,
    angularDamping: 0.3,
  });
  ball.createFixture(pl.Circle(preset.radiusM), {
    density: preset.density,
    friction: preset.friction,
    restitution: preset.restitution,
  });
  (ball as any).userData = { type: 'ball' };

  return {
    world,
    ball,
    leftFlipper,
    rightFlipper,
    leftFlipperJoint,
    rightFlipperJoint,
    plungerBody,
    plungerJoint,
    bumpers,
    slingshots,
  };
}

// ── Flipper control ───────────────────────────────────────────────────────────

const FLIPPER_SPEED = 25; // rad/s

export function activateFlipper(joint: pl.RevoluteJoint, side: 'left' | 'right', active: boolean) {
  if (side === 'left') {
    joint.setMotorSpeed(active ? FLIPPER_SPEED : -FLIPPER_SPEED);
  } else {
    joint.setMotorSpeed(active ? -FLIPPER_SPEED : FLIPPER_SPEED);
  }
}

// ── Plunger control ───────────────────────────────────────────────────────────

export function chargePlunger(joint: pl.PrismaticJoint, charge: number) {
  // charge: 0..1
  joint.setMotorSpeed(-20 * charge); // pull back
}

export function releasePlunger(joint: pl.PrismaticJoint) {
  joint.setMotorSpeed(30); // snap forward
}

// ── Step ──────────────────────────────────────────────────────────────────────

export const FIXED_DT = 1 / 120; // 120 Hz deterministic physics

export function stepWorld(world: pl.World) {
  world.step(FIXED_DT, 8, 3);
}

// ── Ball drain detection ──────────────────────────────────────────────────────

export function isBallDrained(ball: pl.Body): boolean {
  const pos = ball.getPosition();
  return pos.y > TH + px(20);
}
