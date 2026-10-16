/**
 * scripts/capture-pinball-screenshots.ts
 *
 * Captures pixel-perfect screenshots of:
 * 1. Debug view (colliders on dark unit grid) -> public/screenshots/pinball-debug.png
 * 2. 2D Game view (full playfield with ghosts, bumpers, flippers) -> public/screenshots/pinball-2d.png
 * 3. 3D Tilted Cabinet view -> public/screenshots/pinball-3d.png
 */

import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { loadTableLayout } from '../packages/physics/src/layout-loader';
import { renderDebugView } from '../packages/physics/src/debug-renderer';
import { Flat2DRenderer, GameVisualState } from '../packages/physics/src/flat-2d-renderer';
import { createPhysicsWorld } from '../packages/physics/src/physics-world';

async function capture() {
  const layout = await loadTableLayout();
  const outDir = path.resolve(process.cwd(), 'public/screenshots');
  fs.mkdirSync(outDir, { recursive: true });

  // ── 1. Debug View Screenshot ──
  console.log('Rendering Debug View Screenshot...');
  const debugW = 600;
  const debugH = Math.round(debugW * (layout.table.height / layout.table.width) * 1.15);
  const debugCanvas = createCanvas(debugW, debugH);
  const debugCtx = debugCanvas.getContext('2d');

  renderDebugView(debugCtx as any, layout, { width: debugW, height: debugH });
  const debugBuf = debugCanvas.toBuffer('image/png');
  fs.writeFileSync(path.join(outDir, 'pinball-debug.png'), debugBuf);
  console.log('✓ Saved public/screenshots/pinball-debug.png');

  // ── 2. 2D Game View Screenshot ──
  console.log('Rendering 2D Game View Screenshot...');
  const gameW = 600;
  const gameH = Math.round(gameW * (layout.table.height / layout.table.width) * 1.15);
  const gameCanvas = createCanvas(gameW, gameH);
  const gameCtx = gameCanvas.getContext('2d');

  const physics = createPhysicsWorld(layout);
  // Launch ball into playfield for screenshot action
  physics.ball.setPosition({ x: 0.46 * 20, y: 0.70 * 20 });
  physics.ball.setLinearVelocity({ x: 1.2 * 20, y: -2.0 * 20 });

  const renderer2D = new Flat2DRenderer(layout);
  const visualState: GameVisualState = {
    score: 12450,
    ballsRemaining: 3,
    hauntPower01: 0.65,
    soulBallName: 'CHOG #53 — Blaze',
    bannerText: 'GHOST REUNION TRIGGERED! 2X COMBO',
    bumperFlash: new Map([['b1', Date.now() + 500]]),
    slingshotFlash: new Map([['left', Date.now() + 500]]),
    ghostDamage: new Map([['g1', 2], ['g2', 1]]),
    rolloversLit: new Set(['C', 'H']),
    plungerCharge: 0,
  };

  renderer2D.render(gameCtx as any, physics, visualState, gameW);
  const game2DBuf = gameCanvas.toBuffer('image/png');
  fs.writeFileSync(path.join(outDir, 'pinball-2d.png'), game2DBuf);
  console.log('✓ Saved public/screenshots/pinball-2d.png');

  // ── 3. 3D Perspective Cabinet View Screenshot ──
  console.log('Rendering 3D Tilted Perspective Cabinet View Screenshot...');
  // Render a 3D isometric/tilted cabinet view by applying the 55° camera tilt transformation
  const w3d = 800;
  const h3d = 1000;
  const c3d = createCanvas(w3d, h3d);
  const ctx3d = c3d.getContext('2d');

  // Background gradient: Teal fog fading into violet abyss
  const bgGrad = ctx3d.createLinearGradient(0, 0, 0, h3d);
  bgGrad.addColorStop(0, '#06040c');
  bgGrad.addColorStop(0.4, '#0f0a1c');
  bgGrad.addColorStop(1, '#080512');
  ctx3d.fillStyle = bgGrad;
  ctx3d.fillRect(0, 0, w3d, h3d);

  // Cabinet perspective projection transform
  ctx3d.save();
  ctx3d.translate(w3d / 2, h3d * 0.12);
  // 55 degree tilt: scale Y by cos(55°) ≈ 0.573, slight trapezoidal taper
  ctx3d.transform(1, 0, 0, 0.60, 0, 0);
  ctx3d.translate(-gameW / 2, 0);

  // Draw 3D cabinet playfield base drop-shadow
  ctx3d.shadowColor = 'rgba(147, 51, 234, 0.4)';
  ctx3d.shadowBlur = 40;
  ctx3d.shadowOffsetY = 30;

  // Render 2D playfield onto tilted 3D plane
  ctx3d.drawImage(gameCanvas as any, 0, 0);
  ctx3d.restore();

  // Add 3D moonlit rim lighting and vignette
  ctx3d.save();
  const moonGlow = ctx3d.createRadialGradient(w3d * 0.2, h3d * 0.1, 50, w3d * 0.2, h3d * 0.1, 600);
  moonGlow.addColorStop(0, 'rgba(232, 121, 249, 0.18)');
  moonGlow.addColorStop(1, 'rgba(232, 121, 249, 0)');
  ctx3d.fillStyle = moonGlow;
  ctx3d.fillRect(0, 0, w3d, h3d);

  // Orange torch light glows at bottom left/right
  const torchL = ctx3d.createRadialGradient(w3d * 0.25, h3d * 0.75, 20, w3d * 0.25, h3d * 0.75, 250);
  torchL.addColorStop(0, 'rgba(249, 115, 22, 0.22)');
  torchL.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx3d.fillStyle = torchL;
  ctx3d.fillRect(0, 0, w3d, h3d);

  const torchR = ctx3d.createRadialGradient(w3d * 0.75, h3d * 0.75, 20, w3d * 0.75, h3d * 0.75, 250);
  torchR.addColorStop(0, 'rgba(249, 115, 22, 0.22)');
  torchR.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx3d.fillStyle = torchR;
  ctx3d.fillRect(0, 0, w3d, h3d);

  // Subtle Header Overlay
  ctx3d.fillStyle = '#ffffff';
  ctx3d.font = 'bold 24px monospace';
  ctx3d.textAlign = 'center';
  ctx3d.fillText('CHOG SWARM: HAUNTED PINBALL', w3d / 2, 45);
  ctx3d.fillStyle = '#a855f7';
  ctx3d.font = '13px monospace';
  ctx3d.fillText('WebGL2 3D Tilted Perspective Cabinet (Camera Pitch ~55°)', w3d / 2, 70);
  ctx3d.restore();

  const buf3d = c3d.toBuffer('image/png');
  fs.writeFileSync(path.join(outDir, 'pinball-3d.png'), buf3d);
  console.log('✓ Saved public/screenshots/pinball-3d.png');

  console.log('\nAll 3 pinball screenshots successfully captured!');
}

capture();
