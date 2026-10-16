/**
 * packages/physics/src/renderer.ts
 *
 * Canvas renderer for the Chog Haunted pinball table.
 * Uses the physics world's body positions to draw each frame.
 * Entirely imperative/stateless — call render(ctx, table) each frame.
 */

import type * as pl from 'planck';
import { TABLE_W, TABLE_H, PX_PER_M, TW, TH } from './table';

// Convert physics world coords → screen pixels
const toScreen = (v: pl.Vec2) => ({
  x: v.x * PX_PER_M,
  y: v.y * PX_PER_M,
});

const px = (m: number) => m * PX_PER_M;

// ── Colours ───────────────────────────────────────────────────────────────────
const COLORS = {
  background: '#0d0d14',
  felt:       '#121220',
  wall:       '#2a1a40',
  wallEdge:   '#6b21a8',
  bumper:     '#7c3aed',
  bumperGlow: '#a855f7',
  slingshot:  '#4c1d95',
  flipper:    '#7c3aed',
  flipperTip: '#a855f7',
  ball:       '#f5f3ff',
  ballSheen:  '#e9d5ff',
  plunger:    '#d97706',
  plungerRod: '#92400e',
  score:      '#c4b5fd',
  ui:         '#9c8dc0',
};

export interface RendererState {
  score: number;
  balls: number;
  bumperFlash: Map<pl.Body, number>; // body → flash-until timestamp
  plungerCharge: number;             // 0..1
  ballArtSrc?: string;               // data URL or path for Soul Ball art
}

export function render(
  ctx: CanvasRenderingContext2D,
  table: {
    world: pl.World;
    ball: pl.Body;
    leftFlipper: pl.Body;
    rightFlipper: pl.Body;
    plungerBody: pl.Body;
    bumpers: pl.Body[];
    slingshots: pl.Body[];
  },
  state: RendererState,
  ballImg?: HTMLImageElement | null
) {
  const W = TABLE_W;
  const H = TABLE_H;

  // Background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, W, H);

  // Felt overlay
  ctx.fillStyle = COLORS.felt;
  ctx.fillRect(8, 8, W - 16, H - 16);

  // Grid lines (subtle)
  ctx.strokeStyle = 'rgba(124, 58, 237, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Wall outlines
  ctx.strokeStyle = COLORS.wallEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, W - 16, H - 16);

  // ── Slingshots ───────────────────────────────────────────────────────────
  for (const ss of table.slingshots) {
    const pos = toScreen(ss.getPosition());
    const angle = ss.getAngle();
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);
    ctx.fillStyle = COLORS.slingshot;
    ctx.strokeStyle = '#6b21a8';
    ctx.lineWidth = 2;
    ctx.fillRect(-8, -px(TH * 0.042), 16, px(TH * 0.083));
    ctx.strokeRect(-8, -px(TH * 0.042), 16, px(TH * 0.083));
    ctx.restore();
  }

  // ── Bumpers ───────────────────────────────────────────────────────────────
  const now = Date.now();
  for (const bumper of table.bumpers) {
    const pos = toScreen(bumper.getPosition());
    const isFlashing = (state.bumperFlash.get(bumper) ?? 0) > now;
    const r = px(0.022 * 60); // ≈ 22px radius

    // Glow
    if (isFlashing) {
      const grd = ctx.createRadialGradient(pos.x, pos.y, r * 0.3, pos.x, pos.y, r * 2);
      grd.addColorStop(0, 'rgba(168, 85, 247, 0.5)');
      grd.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fillStyle = isFlashing ? COLORS.bumperGlow : COLORS.bumper;
    ctx.fill();
    ctx.strokeStyle = isFlashing ? '#d8b4fe' : '#9333ea';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tombstone engraving
    ctx.fillStyle = isFlashing ? '#fff' : '#c4b5fd';
    ctx.font = `bold ${Math.round(r * 0.7)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RIP', pos.x, pos.y);
  }

  // ── Flippers ──────────────────────────────────────────────────────────────
  function drawFlipper(flipper: pl.Body, side: 'left' | 'right') {
    const pos = toScreen(flipper.getPosition());
    const angle = flipper.getAngle();
    const len = px(55 / 60); // half-width in pixels
    const hh = px(8 / 60);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);

    const x0 = side === 'left' ? 0 : -len * 2;
    const grad = ctx.createLinearGradient(x0, -hh, x0 + len * 2, hh);
    grad.addColorStop(0, COLORS.flipper);
    grad.addColorStop(1, COLORS.flipperTip);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x0, -hh, len * 2, hh * 2, hh * 0.8);
    ctx.fill();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  drawFlipper(table.leftFlipper, 'left');
  drawFlipper(table.rightFlipper, 'right');

  // ── Plunger ───────────────────────────────────────────────────────────────
  {
    const pos = toScreen(table.plungerBody.getPosition());
    const chargeH = state.plungerCharge * px(60 / 60);

    // Rod
    ctx.strokeStyle = COLORS.plungerRod;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y + px(8 / 60));
    ctx.lineTo(pos.x, pos.y + chargeH + px(40 / 60));
    ctx.stroke();

    // Head
    ctx.fillStyle = COLORS.plunger;
    ctx.beginPath();
    ctx.roundRect(pos.x - 12, pos.y - 6, 24, 16, 4);
    ctx.fill();
  }

  // ── Ball ──────────────────────────────────────────────────────────────────
  {
    const bpos = toScreen(table.ball.getPosition());
    const r = table.ball.getFixtureList()!.getShape().getRadius() * PX_PER_M;

    // Glow
    const grd = ctx.createRadialGradient(bpos.x, bpos.y, r * 0.2, bpos.x, bpos.y, r * 1.8);
    grd.addColorStop(0, 'rgba(245, 243, 255, 0.3)');
    grd.addColorStop(1, 'rgba(245, 243, 255, 0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(bpos.x, bpos.y, r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Ball body
    if (ballImg && ballImg.complete) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(bpos.x, bpos.y, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(ballImg, bpos.x - r, bpos.y - r, r * 2, r * 2);
      ctx.restore();
    } else {
      const bgrad = ctx.createRadialGradient(bpos.x - r * 0.3, bpos.y - r * 0.3, 0, bpos.x, bpos.y, r);
      bgrad.addColorStop(0, COLORS.ballSheen);
      bgrad.addColorStop(1, COLORS.ball);
      ctx.fillStyle = bgrad;
      ctx.beginPath();
      ctx.arc(bpos.x, bpos.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sheen
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(bpos.x - r * 0.25, bpos.y - r * 0.3, r * 0.3, r * 0.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── HUD ───────────────────────────────────────────────────────────────────
  // Score
  ctx.fillStyle = COLORS.score;
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(state.score.toLocaleString(), W / 2, 18);

  // Balls remaining (dots)
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(20 + i * 22, 22, 6, 0, Math.PI * 2);
    ctx.fillStyle = i < state.balls ? '#a855f7' : '#2d1a4a';
    ctx.fill();
    ctx.strokeStyle = '#6b21a8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Plunger charge bar (right edge)
  if (state.plungerCharge > 0) {
    const barH = state.plungerCharge * 80;
    ctx.fillStyle = '#451a03';
    ctx.fillRect(W - 14, H - 140, 8, 80);
    ctx.fillStyle = `hsl(${30 + state.plungerCharge * -20}, 100%, ${40 + state.plungerCharge * 20}%)`;
    ctx.fillRect(W - 14, H - 140 + (80 - barH), 8, barH);
  }
}
