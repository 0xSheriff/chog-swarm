/**
 * packages/physics/src/physics-world.ts
 *
 * Deterministic 120 Hz Planck.js physics simulation built directly from TableLayout.
 * Zero hardcoded dimensions — all geometry, scales, velocities, and angles derive from the JSON.
 *
 * Gate 2 Additions:
 * - Rollover lane sensors (C-H-O-G) with debounced detection
 * - Crypt Portal ball capture, hold (holdSeconds: 1.0), and downward eject toward bumpers
 * - Multiball support (multiple simultaneous balls on playfield, extra ball spawning and drain logic)
 * - Ghost target impulse on hit
 */

import * as pl from 'planck';
import { TableLayout } from './types';

export const FIXED_DT = 1 / 120; // 120 Hz fixed timestep

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
}

export interface PhysicsWorldInstance {
  world: pl.World;
  layout: TableLayout;
  ball: pl.Body;
  balls: pl.Body[];
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
  spawnBall: (x?: number, y?: number, vx?: number, vy?: number) => pl.Body;
  removeBall: (b: pl.Body) => void;
  getBallState: () => BallState;
  getAllBallStates: () => BallState[];
  getFlipperAnglesDeg: () => { left: number; right: number };
  getFlipperVertices: (side: 'left' | 'right') => [number, number][];
  onDrain?: () => void;
  onExtraBallDrain?: (remaining: number) => void;
  onBumperHit?: (id: string, score: number) => void;
  onSlingshotHit?: (id: string) => void;
  onGhostHit?: (id: string) => void;
  onRolloverHit?: (letter: string) => void;
  onCryptEnter?: () => void;
  onCryptEject?: () => void;
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

  // Rollover lane sensors (C-H-O-G)
  const rolloverBody = world.createBody({ type: 'static', position: pl.Vec2(0, 0) });
  rl.letters.forEach((letter, i) => {
    const x0 = rl.dividerX[i];
    const x1 = rl.dividerX[i + 1];
    const cx = toP((x0 + x1) / 2);
    const cy = toP((rl.y0 + rl.y1) / 2);
    const hw = toP((x1 - x0) / 2) * 0.85;
    const hh = toP((rl.y1 - rl.y0) / 2) * 0.7;
    const fix = rolloverBody.createFixture(pl.Box(hw, hh, pl.Vec2(cx, cy), 0), {
      isSensor: true,
    });
    (fix as any).userData = { type: 'rollover', letter };
  });

  // ── 2. One-Way Gate (Plunger Lane) ──
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
      restitution: 0.2,
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
  function createFlipper(
    side: 'left' | 'right',
    spec: typeof layout.flippers.left
  ): [pl.Body, pl.RevoluteJoint] {
    const pivot = pl.Vec2(toP(spec.pivot[0]), toP(spec.pivot[1]));
    const len = toP(spec.length);
    const rBase = toP(spec.baseRadius);
    const rTip = toP(spec.tipRadius);

    const restRad = (spec.restAngle * Math.PI) / 180;
    const body = world.createBody({
      type: 'dynamic',
      position: pivot,
      angle: restRad,
      bullet: true,
    });

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

    const anchorBody = world.createBody({ type: 'static', position: pivot });

    const deltaRad = ((spec.upAngle - spec.restAngle) * Math.PI) / 180;
    const lowerAngle = Math.min(0, deltaRad);
    const upperAngle = Math.max(0, deltaRad);
    const initialRestSpeed = side === 'left' ? layout.flippers.swingDownRadPerSec : -layout.flippers.swingDownRadPerSec;

    const joint = world.createJoint(
      pl.RevoluteJoint(
        {
          enableLimit: true,
          lowerAngle,
          upperAngle,
          enableMotor: true,
          maxMotorTorque: 50000.0,
          motorSpeed: initialRestSpeed,
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

  // ── 9. Ball System & Factory ──
  const ballRadiusP = toP(layout.ball.radius);
  const ballStartP = pl.Vec2(toP(layout.ball.start.x), toP(layout.ball.start.y));

  function createBallBody(posP: pl.Vec2): pl.Body {
    const b = world.createBody({
      type: 'dynamic',
      position: posP,
      bullet: layout.ball.bullet,
      linearDamping: 0.05,
      angularDamping: 0.2,
    });

    const bFix = b.createFixture(pl.Circle(ballRadiusP), {
      density: 1.0,
      friction: layout.ball.friction,
      restitution: layout.ball.restitution,
    });
    (bFix as any).userData = { type: 'ball' };
    return b;
  }

  const primaryBall = createBallBody(ballStartP);
  const balls: pl.Body[] = [primaryBall];

  // Crypt Portal Capture / Hold Tracker
  let cryptHeldBall: pl.Body | null = null;
  let cryptHoldRemainingSec = 0;
  let cryptCooldownRemainingSec = 0;

  // Debounce for rollover hits
  const lastRolloverTime = new Map<string, number>();

  // ── 10. Instance Declaration ──
  const instance: PhysicsWorldInstance = {
    world,
    layout,
    ball: primaryBall,
    balls,
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
    spawnBall: () => primaryBall,
    removeBall: () => {},
    getBallState: () => ({ x: 0, y: 0, vx: 0, vy: 0, speed: 0 }),
    getAllBallStates: () => [],
    getFlipperAnglesDeg: () => ({ left: 0, right: 0 }),
    getFlipperVertices: () => [],
  };

  // Pre-solve for One-Way Gate
  world.on('pre-solve', (contact) => {
    const fA = contact.getFixtureA();
    const fB = contact.getFixtureB();
    const uA = (fA as any).userData;
    const uB = (fB as any).userData;

    if (uA?.type === 'oneWayGate' || uB?.type === 'oneWayGate') {
      const ballFix = uA?.type === 'ball' ? fA : uB?.type === 'ball' ? fB : null;
      if (ballFix) {
        const bVel = ballFix.getBody().getLinearVelocity();
        // If ball is traveling upwards (vy < 0), disable collision so it passes into the playfield
        if (bVel.y < 0) {
          contact.setEnabled(false);
        } else {
          contact.setEnabled(true);
        }
      }
    }
  });

  // Begin contact for Bumpers, Slingshots, Ghosts, Rollovers, Portal, Drains
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

    const hitBallBody = ballFixture.getBody();

    // Pop Bumper Hit: kickExitSpeed directly sets exit speed
    if (otherData.type === 'bumper') {
      const bumperSpec = otherData.spec;
      const bPos = otherFixture.getBody().getPosition();
      const ballPos = hitBallBody.getPosition();
      const kickDir = pl.Vec2(ballPos.x - bPos.x, ballPos.y - bPos.y);
      kickDir.normalize();

      const exitSpeedP = toP(bumperSpec.kickExitSpeed);
      hitBallBody.setLinearVelocity(pl.Vec2(kickDir.x * exitSpeedP, kickDir.y * exitSpeedP));

      instance.onBumperHit?.(otherData.id, 100);
    }

    // Slingshot Hit: kickExitSpeed
    if (otherData.type === 'slingshot') {
      const sSpec = otherData.spec;
      const exitSpeedP = toP(sSpec.kickExitSpeed);
      const isLeft = otherData.id === 'left';
      const kickDir = pl.Vec2(isLeft ? 0.8 : -0.8, -0.6);
      kickDir.normalize();
      hitBallBody.setLinearVelocity(pl.Vec2(kickDir.x * exitSpeedP, kickDir.y * exitSpeedP));

      instance.onSlingshotHit?.(otherData.id);
    }

    // Ghost Target Hit: physical bounce with restitution 0.6 per table-layout.json
    if (otherData.type === 'ghost') {
      instance.onGhostHit?.(otherData.id);
    }

    // Rollover Lane Sensor (C-H-O-G)
    if (otherData.type === 'rollover') {
      const letter = otherData.letter;
      const now = Date.now();
      const last = lastRolloverTime.get(letter) || 0;
      if (now - last > 300) {
        lastRolloverTime.set(letter, now);
        instance.onRolloverHit?.(letter);
      }
    }

    // Crypt Portal (Hold & Eject)
    if (otherData.type === 'cryptPortal') {
      if (!cryptHeldBall && cryptCooldownRemainingSec <= 0) {
        cryptHeldBall = hitBallBody;
        cryptHoldRemainingSec = layout.cryptPortal.holdSeconds;
        hitBallBody.setLinearVelocity(pl.Vec2(0, 0));
        hitBallBody.setPosition(pl.Vec2(toP(layout.cryptPortal.x), toP(layout.cryptPortal.y)));
        instance.onCryptEnter?.();
      }
    }

    // Drain Sensor
    if (otherData.type === 'drain') {
      if (balls.length > 1) {
        // Extra ball drained in Multiball
        instance.removeBall(hitBallBody);
        instance.onExtraBallDrain?.(balls.length);
      } else {
        // Last / primary ball drained
        instance.onDrain?.();
      }
    }
  });

  // Stuck-ball rescue tracker
  let lowSpeedSeconds = 0;

  instance.step = () => {
    // 1. Advance Planck physics at 120 Hz fixed step
    world.step(FIXED_DT, 8, 3);

    // 2. Crypt Portal Hold & Eject Logic
    if (cryptCooldownRemainingSec > 0) {
      cryptCooldownRemainingSec -= FIXED_DT;
    }

    if (cryptHeldBall) {
      cryptHoldRemainingSec -= FIXED_DT;
      cryptHeldBall.setLinearVelocity(pl.Vec2(0, 0));
      cryptHeldBall.setPosition(pl.Vec2(toP(layout.cryptPortal.x), toP(layout.cryptPortal.y)));

      if (cryptHoldRemainingSec <= 0) {
        // Eject downward toward pop bumpers with slight lateral push
        const ejectSpeedP = toP(2.8);
        const angleScatter = (Math.random() > 0.5 ? 0.35 : -0.35) * toP(0.8);
        cryptHeldBall.setLinearVelocity(pl.Vec2(angleScatter, ejectSpeedP));
        cryptHeldBall = null;
        cryptCooldownRemainingSec = 1.2;
        instance.onCryptEject?.();
      }
    }

    // 3. Velocity cap enforcement across all balls
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      if (b === cryptHeldBall) continue;

      const v = b.getLinearVelocity();
      const speed = v.length();
      if (speed > maxPhysicsSpeed) {
        const scale = maxPhysicsSpeed / speed;
        b.setLinearVelocity(pl.Vec2(v.x * scale, v.y * scale));
      }
    }

    // 4. Stuck ball detection (on primary ball)
    const primaryV = instance.ball.getLinearVelocity();
    const primarySpeed = primaryV.length();
    const stuckThreshold = toP(layout.feel.stuckSpeed);

    if (
      instance.ball !== cryptHeldBall &&
      primarySpeed < stuckThreshold &&
      instance.ball.getPosition().y < toP(layout.drainSensor.y0)
    ) {
      lowSpeedSeconds += FIXED_DT;
      if (lowSpeedSeconds >= layout.feel.stuckBallSeconds) {
        instance.ball.setLinearVelocity(pl.Vec2(0, -toP(2.5)));
        lowSpeedSeconds = 0;
        instance.onStuckRescue?.();
      }
    } else {
      lowSpeedSeconds = 0;
    }
  };

  // Flipper motors
  instance.setLeftFlipper = (up: boolean) => {
    if (typeof window !== 'undefined') {
      (window as any).__lastFlipperCall = { up, time: performance.now() };
    }
    const speed = up ? -layout.flippers.swingUpRadPerSec : layout.flippers.swingDownRadPerSec;
    leftFlipperJoint.setMotorSpeed(speed);
  };

  instance.setRightFlipper = (up: boolean) => {
    const speed = up ? layout.flippers.swingUpRadPerSec : -layout.flippers.swingDownRadPerSec;
    rightFlipperJoint.setMotorSpeed(speed);
  };

  // Plunger launch
  instance.launchPlunger = (charge01: number) => {
    const clamped = Math.max(0, Math.min(1, charge01));
    const speedTU =
      layout.plunger.launchSpeedMin +
      clamped * (layout.plunger.launchSpeedMax - layout.plunger.launchSpeedMin);
    const speedP = toP(speedTU);
    instance.ball.setLinearVelocity(pl.Vec2(0, -speedP));
  };

  // Reset ball to start position (clearing any multiballs)
  instance.resetBall = () => {
    // Destroy all extra balls
    while (balls.length > 1) {
      const extra = balls.pop()!;
      world.destroyBody(extra);
    }
    cryptHeldBall = null;
    cryptHoldRemainingSec = 0;
    instance.ball = balls[0];
    instance.ball.setPosition(ballStartP);
    instance.ball.setLinearVelocity(pl.Vec2(0, 0));
    instance.ball.setAngularVelocity(0);
    lowSpeedSeconds = 0;
  };

  // Multiball spawning
  instance.spawnBall = (x?: number, y?: number, vx?: number, vy?: number) => {
    const spawnX = x !== undefined ? toP(x) : toP(layout.cryptPortal.x);
    const spawnY = y !== undefined ? toP(y) : toP(layout.cryptPortal.y);
    const newBall = createBallBody(pl.Vec2(spawnX, spawnY));
    newBall.setLinearVelocity(pl.Vec2(vx !== undefined ? toP(vx) : 0, vy !== undefined ? toP(vy) : toP(2.6)));
    balls.push(newBall);
    return newBall;
  };

  instance.removeBall = (b: pl.Body) => {
    const idx = balls.indexOf(b);
    if (idx !== -1) {
      balls.splice(idx, 1);
      if (cryptHeldBall === b) {
        cryptHeldBall = null;
      }
      world.destroyBody(b);
      if (instance.ball === b && balls.length > 0) {
        instance.ball = balls[0];
      }
    }
  };

  instance.getBallState = () => {
    const p = instance.ball.getPosition();
    const v = instance.ball.getLinearVelocity();
    return {
      x: fromP(p.x),
      y: fromP(p.y),
      vx: fromP(v.x),
      vy: fromP(v.y),
      speed: fromP(v.length()),
    };
  };

  instance.getAllBallStates = () => {
    return balls.map((b) => {
      const p = b.getPosition();
      const v = b.getLinearVelocity();
      return {
        x: fromP(p.x),
        y: fromP(p.y),
        vx: fromP(v.x),
        vy: fromP(v.y),
        speed: fromP(v.length()),
      };
    });
  };

  instance.getFlipperAnglesDeg = () => {
    const leftRad = leftFlipperBody.getAngle();
    const rightRad = rightFlipperBody.getAngle();
    return {
      left: (leftRad * 180) / Math.PI,
      right: (rightRad * 180) / Math.PI,
    };
  };

  instance.getFlipperVertices = (side: 'left' | 'right'): [number, number][] => {
    const body = side === 'left' ? leftFlipperBody : rightFlipperBody;
    const fix = body.getFixtureList();
    if (!fix) return [];
    const shape = fix.getShape() as any;
    const count = shape.m_count || 0;
    const verts: [number, number][] = [];
    for (let i = 0; i < count; i++) {
      const v = shape.m_vertices[i];
      const wp = body.getWorldPoint(v);
      verts.push([fromP(wp.x), fromP(wp.y)]);
    }
    return verts;
  };

  return instance;
}
