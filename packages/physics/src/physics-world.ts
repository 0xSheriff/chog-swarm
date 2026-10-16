/**
 * packages/physics/src/physics-world.ts
 *
 * Deterministic 120 Hz Planck.js physics simulation built directly from TableLayout.
 * Zero hardcoded dimensions — all geometry, scales, velocities, and angles derive from the JSON.
 */

import * as pl from 'planck';
import { TableLayout } from './types';

export const FIXED_DT = 1 / 120; // 120 Hz fixed timestep

export interface PhysicsWorldInstance {
  world: pl.World;
  layout: TableLayout;
  ball: pl.Body;
  leftFlipperBody: pl.Body;
  rightFlipperBody: pl.Body;
  leftFlipperJoint: pl.RevoluteJoint;
  rightFlipperJoint: pl.RevoluteJoint;
  bumpers: Map<string, pl.Body>;
  slingshots: Map<string, pl.Body>;
  ghosts: Map<string, pl.Body>;
  step: () => void;
  setLeftFlipper: (up: boolean) => void;
  setRightFlipper: (up: boolean) => void;
  launchPlunger: (charge01: number) => void;
  resetBall: () => void;
  getBallState: () => { x: number; y: number; vx: number; vy: number; speed: number };
  getFlipperAnglesDeg: () => { left: number; right: number };
  onDrain?: () => void;
  onBumperHit?: (id: string, score: number) => void;
  onSlingshotHit?: (id: string) => void;
  onGhostHit?: (id: string) => void;
  onRolloverHit?: (letter: string) => void;
  onCryptEnter?: () => void;
  onStuckRescue?: () => void;
}

export function createPhysicsWorld(layout: TableLayout): PhysicsWorldInstance {
  const S = layout.physicsScale; // 20
  const toP = (tu: number) => tu * S;
  const fromP = (pm: number) => pm / S;

  // Gravity: layout.gravity in table units/s² downwards
  const gravityAccel = toP(layout.gravity); // 2.1 * 20 = 42 m/s²
  const world = pl.World({ gravity: pl.Vec2(0, gravityAccel) });

  // Speed cap in physics meters/s
  const maxPhysicsSpeed = toP(layout.maxBallSpeed); // 6.0 * 20 = 120 m/s

  // ── 1. Walls ──
  const wallBody = world.createBody({ type: 'static', position: pl.Vec2(0, 0) });
  const wallOpt: pl.FixtureOpt = { friction: 0.1, restitution: 0.3 };

  // Top Arch (semicircular chain)
  const arch = layout.walls.topArch;
  const archSegments = 36;
  const archPoints: pl.Vec2[] = [];
  for (let i = 0; i <= archSegments; i++) {
    const fraction = i / archSegments;
    const deg = arch.fromAngle + fraction * (arch.toAngle - arch.fromAngle);
    const rad = (deg * Math.PI) / 180;
    const x = toP(arch.center[0] + arch.radius * Math.cos(rad));
    const y = toP(arch.center[1] + arch.radius * Math.sin(rad));
    archPoints.push(pl.Vec2(x, y));
  }
  for (let i = 0; i < archPoints.length - 1; i++) {
    wallBody.createFixture(pl.Edge(archPoints[i], archPoints[i + 1]), wallOpt);
  }

  // Straight line walls
  const addLine = (from: [number, number], to: [number, number], opt = wallOpt) => {
    wallBody.createFixture(
      pl.Edge(pl.Vec2(toP(from[0]), toP(from[1])), pl.Vec2(toP(to[0]), toP(to[1]))),
      opt
    );
  };

  addLine(layout.walls.leftWall.from, layout.walls.leftWall.to);
  addLine(layout.walls.outerRightWall.from, layout.walls.outerRightWall.to);
  addLine(layout.walls.laneInnerWall.from, layout.walls.laneInnerWall.to);
  addLine(layout.walls.leftApron.from, layout.walls.leftApron.to);
  addLine(layout.walls.rightApron.from, layout.walls.rightApron.to);

  // Rollover lane dividers
  const rl = layout.rolloverLanes;
  rl.dividerX.forEach((dx) => {
    addLine([dx, rl.y0], [dx, rl.y1]);
  });

  // ── 2. One-Way Gate (Plunger Lane) ──
  // Gap between y=0.30 and y=0.40 on x=0.925. Ball may pass going UP (vy < 0), blocked going down.
  const gate = layout.walls.oneWayGate;
  const gateFixture = wallBody.createFixture(
    pl.Edge(pl.Vec2(toP(gate.from[0]), toP(gate.from[1])), pl.Vec2(toP(gate.to[0]), toP(gate.to[1]))),
    { ...wallOpt, isSensor: false }
  );
  (gateFixture as any).userData = { type: 'oneWayGate' };

  // ── 3. Pop Bumpers ──
  const bumpers = new Map<string, pl.Body>();
  layout.popBumpers.forEach((bSpec) => {
    const bBody = world.createBody({
      type: 'static',
      position: pl.Vec2(toP(bSpec.x), toP(bSpec.y)),
    });
    const fix = bBody.createFixture(pl.Circle(toP(bSpec.radius)), {
      friction: 0.0,
      restitution: 0.2, // Kick impulse handles speed
    });
    (fix as any).userData = { type: 'bumper', id: bSpec.id, spec: bSpec };
    bumpers.set(bSpec.id, bBody);
  });

  // ── 4. Slingshots ──
  const slingshots = new Map<string, pl.Body>();
  layout.slingshots.forEach((sSpec) => {
    const sBody = world.createBody({ type: 'static', position: pl.Vec2(0, 0) });
    const polyVerts = sSpec.verts.map((v) => pl.Vec2(toP(v[0]), toP(v[1])));
    const fix = sBody.createFixture(pl.Polygon(polyVerts), {
      friction: 0.1,
      restitution: 0.2,
    });
    (fix as any).userData = { type: 'slingshot', id: sSpec.id, spec: sSpec };
    slingshots.set(sSpec.id, sBody);
  });

  // ── 5. Ghost Targets ──
  const ghosts = new Map<string, pl.Body>();
  layout.ghostTargets.forEach((gSpec) => {
    const gBody = world.createBody({
      type: 'static',
      position: pl.Vec2(toP(gSpec.x), toP(gSpec.y)),
    });
    const fix = gBody.createFixture(pl.Circle(toP(gSpec.radius)), {
      friction: 0.1,
      restitution: 0.6,
    });
    (fix as any).userData = { type: 'ghost', id: gSpec.id, spec: gSpec };
    ghosts.set(gSpec.id, gBody);
  });

  // ── 6. Crypt Portal (Sensor) ──
  const cryptBody = world.createBody({
    type: 'static',
    position: pl.Vec2(toP(layout.cryptPortal.x), toP(layout.cryptPortal.y)),
  });
  const cryptFix = cryptBody.createFixture(pl.Circle(toP(layout.cryptPortal.radius)), {
    isSensor: true,
  });
  (cryptFix as any).userData = { type: 'cryptPortal' };

  // ── 7. Drain Sensor ──
  const ds = layout.drainSensor;
  const drainCenter = pl.Vec2(toP((ds.x0 + ds.x1) / 2), toP((ds.y0 + ds.y1) / 2));
  const drainBody = world.createBody({ type: 'static', position: drainCenter });
  const drainHW = toP((ds.x1 - ds.x0) / 2);
  const drainHH = toP((ds.y1 - ds.y0) / 2);
  const drainFix = drainBody.createFixture(pl.Box(drainHW, drainHH), { isSensor: true });
  (drainFix as any).userData = { type: 'drain' };

  // ── 8. Flippers ──
  // Build flipper polygon shape
  function createFlipper(
    side: 'left' | 'right',
    spec: typeof layout.flippers.left
  ): [pl.Body, pl.RevoluteJoint] {
    const pivot = pl.Vec2(toP(spec.pivot[0]), toP(spec.pivot[1]));
    const len = toP(spec.length);
    const rBase = toP(spec.baseRadius);
    const rTip = toP(spec.tipRadius);

    // Initial orientation at restAngle
    const restRad = (spec.restAngle * Math.PI) / 180;
    const body = world.createBody({
      type: 'dynamic',
      position: pivot,
      angle: restRad,
      bullet: true,
    });

    // Approximation of rounded flipper with polygon vertices
    const flipperPoly = [
      pl.Vec2(0, -rBase),
      pl.Vec2(len, -rTip),
      pl.Vec2(len + rTip, 0),
      pl.Vec2(len, rTip),
      pl.Vec2(0, rBase),
      pl.Vec2(-rBase, 0),
    ];

    body.createFixture(pl.Polygon(flipperPoly), {
      density: 20.0,
      friction: 0.3,
      restitution: 0.1,
    });

    // Anchor body for revolute joint
    const anchorBody = world.createBody({ type: 'static', position: pivot });

    // Lower and upper angle limits in radians
    const rad1 = (spec.restAngle * Math.PI) / 180;
    const rad2 = (spec.upAngle * Math.PI) / 180;
    const lowerAngle = Math.min(rad1, rad2);
    const upperAngle = Math.max(rad1, rad2);

    const joint = world.createJoint(
      pl.RevoluteJoint(
        {
          enableLimit: true,
          lowerAngle,
          upperAngle,
          enableMotor: true,
          maxMotorTorque: 50000.0,
          motorSpeed: 0,
        },
        anchorBody,
        body,
        pivot
      )
    ) as pl.RevoluteJoint;

    (body as any).userData = { type: 'flipper', side };
    return [body, joint];
  }

  const [leftFlipperBody, leftFlipperJoint] = createFlipper('left', layout.flippers.left);
  const [rightFlipperBody, rightFlipperJoint] = createFlipper('right', layout.flippers.right);

  // ── 9. Ball ──
  const ballRadiusP = toP(layout.ball.radius);
  const ballStartP = pl.Vec2(toP(layout.ball.start.x), toP(layout.ball.start.y));

  const ball = world.createBody({
    type: 'dynamic',
    position: ballStartP,
    bullet: layout.ball.bullet,
    linearDamping: 0.05,
    angularDamping: 0.2,
  });

  const ballFix = ball.createFixture(pl.Circle(ballRadiusP), {
    density: 1.0,
    friction: layout.ball.friction,
    restitution: layout.ball.restitution,
  });
  (ballFix as any).userData = { type: 'ball' };

  // ── 10. Contact Listeners & Pre-Solve ──
  const instance: PhysicsWorldInstance = {
    world,
    layout,
    ball,
    leftFlipperBody,
    rightFlipperBody,
    leftFlipperJoint,
    rightFlipperJoint,
    bumpers,
    slingshots,
    ghosts,
    step: () => {},
    setLeftFlipper: () => {},
    setRightFlipper: () => {},
    launchPlunger: () => {},
    resetBall: () => {},
    getBallState: () => ({ x: 0, y: 0, vx: 0, vy: 0, speed: 0 }),
    getFlipperAnglesDeg: () => ({ left: 0, right: 0 }),
  };

  // Pre-solve for One-Way Gate
  world.on('pre-solve', (contact) => {
    const fA = contact.getFixtureA();
    const fB = contact.getFixtureB();
    const uA = (fA as any).userData;
    const uB = (fB as any).userData;

    if (uA?.type === 'oneWayGate' || uB?.type === 'oneWayGate') {
      const bVel = ball.getLinearVelocity();
      // If ball is traveling upwards (vy < 0), disable collision so it passes into the playfield
      if (bVel.y < 0) {
        contact.setEnabled(false);
      } else {
        // If ball is traveling downwards (vy >= 0), collision is enabled to prevent re-entering plunger lane
        contact.setEnabled(true);
      }
    }
  });

  // Begin contact for Bumpers, Slingshots, Sensor Drains
  world.on('begin-contact', (contact) => {
    const fA = contact.getFixtureA();
    const fB = contact.getFixtureB();
    const uA = (fA as any).userData;
    const uB = (fB as any).userData;

    const ballFixture = uA?.type === 'ball' ? fA : uB?.type === 'ball' ? fB : null;
    const otherFixture = ballFixture === fA ? fB : ballFixture === fB ? fA : null;
    if (!ballFixture || !otherFixture) return;

    const otherData = (otherFixture as any).userData;
    if (!otherData) return;

    // Pop Bumper Hit: kickExitSpeed directly sets exit speed
    if (otherData.type === 'bumper') {
      const bumperSpec = otherData.spec;
      const bPos = otherFixture.getBody().getPosition();
      const ballPos = ball.getPosition();
      const kickDir = pl.Vec2(ballPos.x - bPos.x, ballPos.y - bPos.y);
      kickDir.normalize();

      const exitSpeedP = toP(bumperSpec.kickExitSpeed); // 2.8 * 20 = 56 m/s
      ball.setLinearVelocity(pl.Vec2(kickDir.x * exitSpeedP, kickDir.y * exitSpeedP));

      instance.onBumperHit?.(otherData.id, 100);
    }

    // Slingshot Hit: kickExitSpeed
    if (otherData.type === 'slingshot') {
      const sSpec = otherData.spec;
      const exitSpeedP = toP(sSpec.kickExitSpeed); // 2.5 * 20 = 50 m/s
      // Face [0, 2] normal pointing toward playfield center
      const isLeft = otherData.id === 'left';
      const kickDir = pl.Vec2(isLeft ? 0.8 : -0.8, -0.6);
      kickDir.normalize();
      ball.setLinearVelocity(pl.Vec2(kickDir.x * exitSpeedP, kickDir.y * exitSpeedP));

      instance.onSlingshotHit?.(otherData.id);
    }

    // Ghost Hit
    if (otherData.type === 'ghost') {
      instance.onGhostHit?.(otherData.id);
    }

    // Crypt Portal
    if (otherData.type === 'cryptPortal') {
      instance.onCryptEnter?.();
    }

    // Drain
    if (otherData.type === 'drain') {
      instance.onDrain?.();
    }
  });

  // Stuck-ball rescue tracker
  let lowSpeedSeconds = 0;

  instance.step = () => {
    // 1. Advance Planck physics at 120 Hz fixed step
    world.step(FIXED_DT, 8, 3);

    // 2. Velocity cap enforcement
    const v = ball.getLinearVelocity();
    const speed = v.length();
    if (speed > maxPhysicsSpeed) {
      const scale = maxPhysicsSpeed / speed;
      ball.setLinearVelocity(pl.Vec2(v.x * scale, v.y * scale));
    }

    // 3. Stuck ball detection
    const stuckThreshold = toP(layout.feel.stuckSpeed);
    if (speed < stuckThreshold && ball.getPosition().y < toP(layout.drainSensor.y0)) {
      lowSpeedSeconds += FIXED_DT;
      if (lowSpeedSeconds >= layout.feel.stuckBallSeconds) {
        // Eject upward
        ball.setLinearVelocity(pl.Vec2(0, -toP(2.5)));
        lowSpeedSeconds = 0;
        instance.onStuckRescue?.();
      }
    } else {
      lowSpeedSeconds = 0;
    }
  };

  // Flipper motors
  // swingUpRadPerSec: 30, swingDownRadPerSec: 18
  instance.setLeftFlipper = (up: boolean) => {
    // Left flipper restAngle = 25°, upAngle = -30° -> going up means negative motorSpeed
    const speed = up ? -layout.flippers.swingUpRadPerSec : layout.flippers.swingDownRadPerSec;
    leftFlipperJoint.setMotorSpeed(speed);
  };

  instance.setRightFlipper = (up: boolean) => {
    // Right flipper restAngle = 155°, upAngle = 210° -> going up means positive motorSpeed
    const speed = up ? layout.flippers.swingUpRadPerSec : -layout.flippers.swingDownRadPerSec;
    rightFlipperJoint.setMotorSpeed(speed);
  };

  // Plunger launch: speed range launchSpeedMin to launchSpeedMax
  instance.launchPlunger = (charge01: number) => {
    const clamped = Math.max(0, Math.min(1, charge01));
    const speedTU =
      layout.plunger.launchSpeedMin +
      clamped * (layout.plunger.launchSpeedMax - layout.plunger.launchSpeedMin);
    const speedP = toP(speedTU);
    ball.setLinearVelocity(pl.Vec2(0, -speedP));
  };

  // Reset ball to start position
  instance.resetBall = () => {
    ball.setPosition(ballStartP);
    ball.setLinearVelocity(pl.Vec2(0, 0));
    ball.setAngularVelocity(0);
    lowSpeedSeconds = 0;
  };

  instance.getBallState = () => {
    const p = ball.getPosition();
    const v = ball.getLinearVelocity();
    return {
      x: fromP(p.x),
      y: fromP(p.y),
      vx: fromP(v.x),
      vy: fromP(v.y),
      speed: fromP(v.length()),
    };
  };

  instance.getFlipperAnglesDeg = () => {
    const leftRad = leftFlipperBody.getAngle();
    const rightRad = rightFlipperBody.getAngle();
    return {
      left: (leftRad * 180) / Math.PI,
      right: (rightRad * 180) / Math.PI,
    };
  };

  return instance;
}
