/**
 * packages/physics/src/debug-renderer.ts
 *
 * Renders all colliders directly from /docs/pinball/table-layout.json on a dark grid with units.
 * Exactly matches the coordinate system and visual representation of table-blueprint.png.
 */

import { TableLayout } from './types';

export interface DebugRenderOptions {
  width?: number;
  height?: number;
  currentBall?: { x: number; y: number; vx?: number; vy?: number };
  leftFlipperAngleDeg?: number;
  rightFlipperAngleDeg?: number;
  plungerY?: number;
}

export function renderDebugView(
  ctx: CanvasRenderingContext2D,
  layout: TableLayout,
  opts: DebugRenderOptions = {}
) {
  const targetW = opts.width || 600;
  // Layout table units: 1.0 wide by 2.0 tall. Add margins for axis labels
  const marginX = targetW * 0.08;
  const marginY = marginX * 1.5;
  const innerW = targetW - marginX * 2;
  const innerH = innerW * (layout.table.height / layout.table.width);
  const targetH = opts.height || (innerH + marginY * 1.6);

  // Coordinate mapping from table units [0..1, 0..2] to canvas pixels
  const toX = (tuX: number) => marginX + tuX * innerW;
  const toY = (tuY: number) => marginY + tuY * (innerH / layout.table.height);
  const toDist = (tuD: number) => tuD * innerW;

  // Clear background
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, targetW, targetH);

  // Title
  ctx.fillStyle = '#9c8dc0';
  ctx.font = '14px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Chog Swarm pinball blueprint (table units, top-left origin)', targetW / 2, marginY * 0.45);

  // Draw Grid Lines (every 0.1 on X, every 0.1 on Y)
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(124, 58, 237, 0.12)';
  for (let x = 0; x <= 1.01; x += 0.05) {
    const isMajor = Math.round(x * 10) === x * 10;
    ctx.strokeStyle = isMajor ? 'rgba(124, 58, 237, 0.22)' : 'rgba(124, 58, 237, 0.07)';
    ctx.beginPath();
    ctx.moveTo(toX(x), toY(0));
    ctx.lineTo(toX(x), toY(2.0));
    ctx.stroke();
  }

  for (let y = 0; y <= 2.01; y += 0.05) {
    const isMajor = Math.round(y * 10) === y * 10;
    ctx.strokeStyle = isMajor ? 'rgba(124, 58, 237, 0.22)' : 'rgba(124, 58, 237, 0.07)';
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(y));
    ctx.lineTo(toX(1.0), toY(y));
    ctx.stroke();
  }

  // Draw Axis Labels
  ctx.fillStyle = '#6b7280';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  for (let x = 0; x <= 1.01; x += 0.1) {
    ctx.fillText(x.toFixed(1), toX(x), toY(2.0) + 16);
  }

  ctx.textAlign = 'right';
  for (let y = 0; y <= 2.01; y += 0.2) {
    ctx.fillText(y.toFixed(1), toX(0) - 8, toY(y) + 3);
  }

  // ── 1. Top Arch ──
  const arch = layout.walls.topArch;
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#8b5cf6'; // Violet purple wall
  ctx.beginPath();
  // Angles in degrees from +x towards +y: 180° = left, 270° = top, 360° = right
  const fromRad = (arch.fromAngle * Math.PI) / 180;
  const toRad = (arch.toAngle * Math.PI) / 180;
  ctx.arc(toX(arch.center[0]), toY(arch.center[1]), toDist(arch.radius), fromRad, toRad, false);
  ctx.stroke();

  // ── 2. Walls ──
  const drawLine = (from: [number, number], to: [number, number], color = '#8b5cf6', width = 3, dashed = false) => {
    ctx.save();
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    if (dashed) ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(toX(from[0]), toY(from[1]));
    ctx.lineTo(toX(to[0]), toY(to[1]));
    ctx.stroke();
    ctx.restore();
  };

  drawLine(layout.walls.leftWall.from, layout.walls.leftWall.to);
  drawLine(layout.walls.outerRightWall.from, layout.walls.outerRightWall.to);
  drawLine(layout.walls.laneInnerWall.from, layout.walls.laneInnerWall.to);
  drawLine(layout.walls.leftApron.from, layout.walls.leftApron.to);
  drawLine(layout.walls.rightApron.from, layout.walls.rightApron.to);

  // One-way gate
  const gate = layout.walls.oneWayGate;
  drawLine(gate.from, gate.to, '#f59e0b', 3, true);
  ctx.fillStyle = '#f59e0b';
  ctx.font = '9px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('one-way', toX(gate.from[0]) - 6, toY(gate.from[1]) - 2);
  ctx.fillText('gate', toX(gate.from[0]) - 6, toY(gate.from[1]) + 8);

  // Drain Sensor
  const ds = layout.drainSensor;
  ctx.save();
  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(toX(ds.x0), toY(ds.y0), toDist(ds.x1 - ds.x0), toDist(ds.y1 - ds.y0));
  ctx.fillStyle = '#f43f5e';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('drain sensor', toX((ds.x0 + ds.x1) / 2), toY(ds.y0) + 14);
  ctx.restore();

  // ── 3. Rollover Lanes (C-H-O-G) ──
  const rl = layout.rolloverLanes;
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#7c3aed';
  rl.dividerX.forEach((dx) => {
    ctx.beginPath();
    ctx.moveTo(toX(dx), toY(rl.y0));
    ctx.lineTo(toX(dx), toY(rl.y1));
    ctx.stroke();
  });

  ctx.fillStyle = '#fbbf24'; // Amber gold letters
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const midY = toY((rl.y0 + rl.y1) / 2);
  rl.letters.forEach((letter, i) => {
    const lx = (rl.dividerX[i] + rl.dividerX[i + 1]) / 2;
    ctx.fillText(letter, toX(lx), midY);
  });

  // ── 4. Crypt Portal ──
  const cp = layout.cryptPortal;
  ctx.save();
  ctx.fillStyle = 'rgba(52, 211, 153, 0.2)';
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(toX(cp.x), toY(cp.y), toDist(cp.radius), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#34d399';
  ctx.font = '9px monospace';
  ctx.fillText('crypt', toX(cp.x), toY(cp.y));
  ctx.restore();

  // ── 5. Pop Bumpers ──
  layout.popBumpers.forEach((bumper) => {
    ctx.save();
    ctx.fillStyle = '#ea580c'; // Warm orange
    ctx.strokeStyle = '#fdba74';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(toX(bumper.x), toY(bumper.y), toDist(bumper.radius), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bumper.id, toX(bumper.x), toY(bumper.y));
    ctx.restore();
  });

  // ── 6. Ghost Targets ──
  layout.ghostTargets.forEach((gt) => {
    ctx.save();
    ctx.strokeStyle = '#22d3ee'; // Cyan dashed
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(toX(gt.x), toY(gt.y), toDist(gt.radius), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(gt.id, toX(gt.x), toY(gt.y));
    ctx.restore();
  });

  // ── 7. Slingshots ──
  layout.slingshots.forEach((ss) => {
    ctx.save();
    ctx.fillStyle = 'rgba(124, 58, 237, 0.25)';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toX(ss.verts[0][0]), toY(ss.verts[0][1]));
    for (let i = 1; i < ss.verts.length; i++) {
      ctx.lineTo(toX(ss.verts[i][0]), toY(ss.verts[i][1]));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  // ── 8. Flippers (Rest & Up Angles) ──
  const drawFlipperPoly = (
    pivot: [number, number],
    length: number,
    baseR: number,
    tipR: number,
    angleDeg: number,
    color: string,
    isGhost = false
  ) => {
    const angleRad = (angleDeg * Math.PI) / 180;
    const px0 = toX(pivot[0]);
    const py0 = toY(pivot[1]);
    const rBase = toDist(baseR);
    const rTip = toDist(tipR);
    const len = toDist(length);

    ctx.save();
    ctx.translate(px0, py0);
    ctx.rotate(angleRad);
    ctx.fillStyle = color;
    ctx.strokeStyle = isGhost ? 'rgba(52, 211, 153, 0.4)' : '#4ade80';
    ctx.lineWidth = 2;
    if (isGhost) ctx.setLineDash([4, 4]);

    // Draw flipper trapezoid with rounded ends
    // Pivot circle at origin (0, 0), tip circle at (len, 0)
    ctx.beginPath();
    ctx.arc(0, 0, rBase, Math.PI / 2, -Math.PI / 2, false);
    ctx.lineTo(len, -rTip);
    ctx.arc(len, 0, rTip, -Math.PI / 2, Math.PI / 2, false);
    ctx.lineTo(0, rBase);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Center pivot dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Up angle ghosts
  drawFlipperPoly(
    layout.flippers.left.pivot,
    layout.flippers.left.length,
    layout.flippers.left.baseRadius,
    layout.flippers.left.tipRadius,
    layout.flippers.left.upAngle,
    'rgba(34, 197, 94, 0.15)',
    true
  );
  drawFlipperPoly(
    layout.flippers.right.pivot,
    layout.flippers.right.length,
    layout.flippers.right.baseRadius,
    layout.flippers.right.tipRadius,
    layout.flippers.right.upAngle,
    'rgba(34, 197, 94, 0.15)',
    true
  );

  // Active or resting flippers
  const leftAngle = opts.leftFlipperAngleDeg ?? layout.flippers.left.restAngle;
  const rightAngle = opts.rightFlipperAngleDeg ?? layout.flippers.right.restAngle;

  drawFlipperPoly(
    layout.flippers.left.pivot,
    layout.flippers.left.length,
    layout.flippers.left.baseRadius,
    layout.flippers.left.tipRadius,
    leftAngle,
    '#22c55e'
  );
  drawFlipperPoly(
    layout.flippers.right.pivot,
    layout.flippers.right.length,
    layout.flippers.right.baseRadius,
    layout.flippers.right.tipRadius,
    rightAngle,
    '#22c55e'
  );

  // ── 9. Plunger ──
  const pl = layout.plunger;
  const currentPlungerY = opts.plungerY ?? pl.restY;
  ctx.save();
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(toX(pl.x) - toDist(0.025), toY(currentPlungerY), toDist(0.05), toDist(0.015));
  ctx.strokeStyle = '#d97706';
  ctx.strokeRect(toX(pl.x) - toDist(0.025), toY(currentPlungerY), toDist(0.05), toDist(0.015));
  ctx.fillStyle = '#f59e0b';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('plunger lane', toX(pl.x), toY(1.78));
  ctx.restore();

  // ── 10. Ball ──
  const ballPos = opts.currentBall || layout.ball.start;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(toX(ballPos.x), toY(ballPos.y), toDist(layout.ball.radius), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Top-left Ball reference indicator
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(toX(0.08), toY(0.08), toDist(layout.ball.radius), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9c8dc0';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`= ball (r ${layout.ball.radius})`, toX(0.08) + toDist(layout.ball.radius) + 8, toY(0.08));
  ctx.restore();
}
