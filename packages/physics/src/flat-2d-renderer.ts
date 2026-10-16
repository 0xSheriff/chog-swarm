/**
 * packages/physics/src/flat-2d-renderer.ts
 *
 * Crisp Flat 2D Renderer for Chog Swarm: Haunted Pinball.
 * Built strictly from /docs/pinball/table-layout.json.
 *
 * HARD RULES:
 * A. NEVER alter a Chog NFT image. Draw the local WebP exactly as stored:
 *    full image, original aspect ratio (1:1 square), no tint, no color grading,
 *    no blur, no blend mode, no overlay, no mask that crops content, no filter,
 *    no haze/fog drawn over it. Frames, glows, and damage rings go strictly OUTSIDE.
 * B. One source of truth. Flippers, walls, bumpers, plunger, and targets are drawn
 *    directly from the physics body vertices and coordinates every frame.
 * C. Premium & Errorless: crisp 60 FPS, high-contrast arcade visibility, 0 overlaps.
 */

import { TableLayout } from './types';
import { PhysicsWorldInstance, BallState } from './physics-world';

export interface GameVisualState {
  score: number;
  multiplier: number;
  ballsRemaining: number;
  activeBallCount: number;
  hauntPower01: number;
  soulBallName: string;
  soulBallImage?: string;
  bannerText?: string;
  bumperFlash: Map<string, number>;
  slingshotFlash: Map<string, number>;
  ghostDamage: Map<string, number>; // ghost id -> hit count (0..3)
  banishedGhosts: Set<string>;
  reunionActive: boolean;
  reunionGhostId?: string;
  multiballActive: boolean;
  cryptHeld: boolean;
  rolloversLit: Set<string>;
  plungerCharge: number;
}

export const GHOST_CHOGS: Record<string, { id: number; name: string; image: string }> = {
  g1: { id: 53, name: 'Blaze', image: '/chogs/53.webp' },
  g2: { id: 392, name: 'Burning Skully', image: '/chogs/392.webp' },
  g3: { id: 434, name: 'Chog Scream', image: '/chogs/434.webp' },
  g4: { id: 494, name: 'Chogbomination', image: '/chogs/494.webp' },
};

export class Flat2DRenderer {
  private layout: TableLayout;
  private ghostImages: Map<string, HTMLImageElement> = new Map();
  private soulBallImg: HTMLImageElement | null = null;
  private timeSec = 0;
  private gateFlapAngle = 0; // Hinged gate rotation

  constructor(layout: TableLayout) {
    this.layout = layout;
    if (typeof window !== 'undefined') {
      Object.entries(GHOST_CHOGS).forEach(([gid, data]) => {
        const img = new Image();
        img.src = data.image;
        this.ghostImages.set(gid, img);
      });
    }
  }

  setSoulBallImage(src?: string) {
    if (!src || typeof window === 'undefined') {
      this.soulBallImg = null;
      return;
    }
    const img = new Image();
    img.src = src;
    this.soulBallImg = img;
  }

  render(
    ctx: CanvasRenderingContext2D,
    physics: PhysicsWorldInstance,
    state: GameVisualState,
    targetW = 600,
    targetHParam?: number
  ) {
    this.timeSec += 1 / 60;
    const now = Date.now();
    const L = this.layout;

    // Coordinate mapping: Table is 1.0 wide and 2.0 tall (1:2 aspect ratio).
    // Fill the available canvas maintaining exact 1:2 geometry.
    const marginX = targetW * 0.04;
    const marginY = marginX;
    const innerW = targetW - marginX * 2;
    const innerH = innerW * (L.table.height / L.table.width); // innerW * 2.0
    const targetH = targetHParam || innerH + marginY * 2;

    const toX = (tuX: number) => marginX + tuX * innerW;
    const toY = (tuY: number) => marginY + tuY * (innerH / L.table.height);
    const toDist = (tuD: number) => tuD * innerW;

    // ── 1. Background Playfield Surface ──
    ctx.fillStyle = '#09070f';
    ctx.fillRect(0, 0, targetW, targetH);

    // Playfield slate felt (High contrast, clean slate texture)
    const slateGrad = ctx.createLinearGradient(0, toY(0), 0, toY(2.0));
    slateGrad.addColorStop(0, '#151026');
    slateGrad.addColorStop(0.5, '#120d20');
    slateGrad.addColorStop(1, '#0d0918');
    ctx.fillStyle = slateGrad;
    ctx.fillRect(toX(0), toY(0), toDist(1.0), toDist(2.0));

    // Crisp grid & ambient guidelines (subtle, non-distracting)
    ctx.strokeStyle = 'rgba(147, 51, 234, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0.1; x < 0.9; x += 0.1) {
      ctx.beginPath();
      ctx.moveTo(toX(x), toY(0.4));
      ctx.lineTo(toX(x), toY(1.8));
      ctx.stroke();
    }

    // ── 2. Walls & Rails (Drawn directly from layout specification) ──
    const arch = L.walls.topArch;
    ctx.save();
    // Outer wooden/metal border
    ctx.strokeStyle = '#4c1d95';
    ctx.lineWidth = toDist(0.024);
    ctx.beginPath();
    ctx.arc(toX(arch.center[0]), toY(arch.center[1]), toDist(arch.radius), Math.PI, 2 * Math.PI);
    ctx.stroke();

    // Inner neon guide rail
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = toDist(0.008);
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();

    const drawRail = (from: [number, number], to: [number, number], outerColor = '#4c1d95', innerColor = '#a855f7') => {
      ctx.save();
      ctx.strokeStyle = outerColor;
      ctx.lineWidth = toDist(0.016);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(toX(from[0]), toY(from[1]));
      ctx.lineTo(toX(to[0]), toY(to[1]));
      ctx.stroke();

      ctx.strokeStyle = innerColor;
      ctx.lineWidth = toDist(0.006);
      ctx.stroke();
      ctx.restore();
    };

    drawRail(L.walls.leftWall.from, L.walls.leftWall.to);
    drawRail(L.walls.outerRightWall.from, L.walls.outerRightWall.to);
    drawRail(L.walls.laneInnerWall.from, L.walls.laneInnerWall.to, '#3b0764', '#7e22ce');
    drawRail(L.walls.leftApron.from, L.walls.leftApron.to, '#3b0764', '#9333ea');
    drawRail(L.walls.rightApron.from, L.walls.rightApron.to, '#3b0764', '#9333ea');

    // ── 3. One-Way Gate (Hinged Flap at Plunger Lane Exit) ──
    const gate = L.walls.oneWayGate;
    const gateHingeX = toX(gate.to[0]); // [0.925, 0.40]
    const gateHingeY = toY(gate.to[1]);
    const gateTipX = toX(gate.from[0]);  // [0.925, 0.30]
    const gateTipY = toY(gate.from[1]);
    const gateLength = Math.hypot(gateTipX - gateHingeX, gateTipY - gateHingeY);

    // Check if any ball is currently exiting through the gate
    const primaryBall = physics.getBallState();
    const ballInGateZone = primaryBall.x > 0.88 && primaryBall.x < 0.98 && primaryBall.y < 0.45 && primaryBall.vy < -0.2;
    const targetGateAngle = ballInGateZone ? -Math.PI / 4 : 0;
    this.gateFlapAngle += (targetGateAngle - this.gateFlapAngle) * 0.25;

    ctx.save();
    ctx.translate(gateHingeX, gateHingeY);
    ctx.rotate(this.gateFlapAngle);
    // Metallic flap
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = ballInGateZone ? 12 : 4;
    ctx.fillRect(-2, -gateLength, 4, gateLength);
    ctx.strokeRect(-2, -gateLength, 4, gateLength);
    // Hinge bolt
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── 4. Plunger Mechanism (Spring, Rod, Knob, Ball Seat & Vertical Charge Meter) ──
    const pl = L.plunger;
    const charge = Math.max(0, Math.min(1, state.plungerCharge));
    const laneX = toX(pl.x);
    const laneBottomY = toY(2.0);
    const seatRestY = toY(pl.restY); // Rest position
    const travelPx = toDist(pl.travel) * charge;
    const seatCurrentY = seatRestY + travelPx;

    // A. Vertical Charge LED Meter (along inner lane wall at x = 0.925)
    ctx.save();
    const meterX = toX(0.932);
    const meterTopY = toY(1.40);
    const meterBottomY = toY(1.92);
    const meterH = meterBottomY - meterTopY;
    const totalSegments = 12;
    const segH = meterH / totalSegments;
    const litSegments = Math.round(charge * totalSegments);

    for (let s = 0; s < totalSegments; s++) {
      const segY = meterBottomY - (s + 1) * segH;
      const isLit = s < litSegments;
      const segColor = s > 9 ? '#ef4444' : s > 5 ? '#eab308' : '#22c55e';
      ctx.fillStyle = isLit ? segColor : 'rgba(255, 255, 255, 0.08)';
      if (isLit) {
        ctx.shadowColor = segColor;
        ctx.shadowBlur = 8;
      }
      ctx.fillRect(meterX, segY + 2, toDist(0.012), segH - 4);
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // B. Plunger Spring (Squashes as charge increases)
    ctx.save();
    ctx.strokeStyle = '#a1a1aa';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const springStartY = laneBottomY - 10;
    const springEndY = seatCurrentY + 8;
    const coils = 9;
    const coilStep = (springEndY - springStartY) / coils;
    const coilW = toDist(0.018);

    ctx.moveTo(laneX, springStartY);
    for (let c = 1; c <= coils; c++) {
      const cy = springStartY + c * coilStep;
      const offset = (c % 2 === 0 ? 1 : -1) * coilW;
      ctx.lineTo(laneX + offset, cy - coilStep * 0.5);
      ctx.lineTo(laneX, cy);
    }
    ctx.stroke();

    // C. Steel Plunger Shaft & Pull Knob
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(laneX, springStartY);
    ctx.lineTo(laneX, laneBottomY + 18 + travelPx * 0.5);
    ctx.stroke();

    // Plunger Knob (Bottom pull handle)
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(laneX, laneBottomY + 22 + travelPx * 0.5, toDist(0.022), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // D. Curved Rubber Ball Seat (Cradling the ball)
    ctx.fillStyle = '#18181b';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(laneX, seatCurrentY, toDist(L.ball.radius * 1.1), 0.2 * Math.PI, 0.8 * Math.PI, false);
    ctx.stroke();
    ctx.restore();

    // ── 5. Rollover Lanes (C-H-O-G) ──
    const rl = L.rolloverLanes;
    ctx.save();
    // Divider steel rails
    ctx.strokeStyle = '#7e22ce';
    ctx.lineWidth = toDist(rl.dividerThickness);
    ctx.lineCap = 'round';
    rl.dividerX.forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(toX(dx), toY(rl.y0));
      ctx.lineTo(toX(dx), toY(rl.y1));
      ctx.stroke();
    });

    // Rollover Letters & Light Badges
    rl.letters.forEach((letter, i) => {
      const lx = (rl.dividerX[i] + rl.dividerX[i + 1]) / 2;
      const isLit = state.rolloversLit.has(letter);
      const slotW = toDist(rl.dividerX[i + 1] - rl.dividerX[i]);
      const slotH = toDist(rl.y1 - rl.y0);

      // Lit background flood
      if (isLit) {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.28)';
        ctx.fillRect(toX(rl.dividerX[i]), toY(rl.y0), slotW, slotH);
      }

      ctx.fillStyle = isLit ? '#fbbf24' : '#4b5563';
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (isLit) {
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 14;
      }
      ctx.fillText(letter, toX(lx), toY((rl.y0 + rl.y1) / 2));
      ctx.shadowBlur = 0;
    });
    ctx.restore();

    // ── 6. Crypt Portal (Rotating Eerie Vortex) ──
    const cp = L.cryptPortal;
    ctx.save();
    const portalPulse = state.cryptHeld ? 1.25 : 1 + 0.08 * Math.sin(this.timeSec * 4);
    const pGrad = ctx.createRadialGradient(
      toX(cp.x), toY(cp.y), 0,
      toX(cp.x), toY(cp.y), toDist(cp.radius * portalPulse)
    );
    pGrad.addColorStop(0, state.cryptHeld ? 'rgba(250, 204, 21, 0.9)' : 'rgba(52, 211, 153, 0.85)');
    pGrad.addColorStop(0.7, state.cryptHeld ? 'rgba(234, 88, 12, 0.5)' : 'rgba(16, 185, 129, 0.4)');
    pGrad.addColorStop(1, 'rgba(6, 78, 59, 0)');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(toX(cp.x), toY(cp.y), toDist(cp.radius * portalPulse), 0, Math.PI * 2);
    ctx.fill();

    // Spiral Vortex Arms
    ctx.strokeStyle = state.cryptHeld ? '#facc15' : '#34d399';
    ctx.lineWidth = 2.5;
    for (let arm = 0; arm < 3; arm++) {
      ctx.beginPath();
      const armAngle = this.timeSec * 6 + (arm * Math.PI * 2) / 3;
      ctx.arc(toX(cp.x), toY(cp.y), toDist(cp.radius * 0.75), armAngle, armAngle + Math.PI / 2);
      ctx.stroke();
    }

    ctx.fillStyle = state.cryptHeld ? '#fef08a' : '#a7f3d0';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(state.cryptHeld ? 'LOCKED!' : 'CRYPT', toX(cp.x), toY(cp.y) + 3);
    ctx.restore();

    // ── 7. Pop Bumpers (Slate Tombstones) ──
    L.popBumpers.forEach((b) => {
      const isHit = (state.bumperFlash.get(b.id) ?? 0) > now;
      ctx.save();
      const bx = toX(b.x);
      const by = toY(b.y);
      const br = toDist(b.radius);

      if (isHit) {
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 24;
      }

      ctx.fillStyle = isHit ? '#f97316' : '#27272a';
      ctx.strokeStyle = isHit ? '#ffedd5' : '#71717a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Tombstone R.I.P. carving
      ctx.fillStyle = isHit ? '#ffffff' : '#e4e4e7';
      ctx.font = 'bold 12px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('R.I.P.', bx, by);
      ctx.restore();
    });

    // ── 8. Slingshots (Coffin Wedges from Physics Vertices) ──
    L.slingshots.forEach((s) => {
      const isHit = (state.slingshotFlash.get(s.id) ?? 0) > now;
      ctx.save();
      ctx.fillStyle = isHit ? 'rgba(234, 88, 12, 0.65)' : 'rgba(88, 28, 135, 0.45)';
      ctx.strokeStyle = isHit ? '#fed7aa' : '#c084fc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(toX(s.verts[0][0]), toY(s.verts[0][1]));
      for (let i = 1; i < s.verts.length; i++) {
        ctx.lineTo(toX(s.verts[i][0]), toY(s.verts[i][1]));
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // ── 9. Chog Targets (HARD RULE A: Unaltered Square WebP, Frames & Rings Outside) ──
    L.ghostTargets.forEach((gt) => {
      const gx = toX(gt.x);
      const gy = toY(gt.y);
      const gr = toDist(gt.radius);
      const ghostInfo = GHOST_CHOGS[gt.id];
      const hits = state.ghostDamage.get(gt.id) ?? 0;
      const isBanished = state.banishedGhosts.has(gt.id) || hits >= 3;
      const isReunion = state.reunionActive && state.reunionGhostId === gt.id;

      // Image square dimensions (1:1 aspect ratio matching source WebP)
      const imgSize = gr * 2;
      const imgX = gx - gr;
      const imgY = gy - gr;

      // ── Outer Glowing Halo (Drawn strictly behind the image) ──
      ctx.save();
      const haloColor = isReunion ? '#10b981' : isBanished ? '#a855f7' : '#06b6d4';
      ctx.shadowColor = haloColor;
      ctx.shadowBlur = isReunion ? 22 : 14;
      ctx.strokeStyle = haloColor;
      ctx.lineWidth = isReunion ? 4 : 3;
      // Draw outer beveled rectangle frame (OUTSIDE image boundary)
      ctx.strokeRect(imgX - 3, imgY - 3, imgSize + 6, imgSize + 6);
      ctx.restore();

      // ── HARD RULE A: Draw Original Unaltered WebP Image ──
      // Full image, original 1:1 aspect ratio, NO tint, NO color grading,
      // NO blur, NO blend mode, NO overlay, NO circular mask clip, NO filter.
      const img = this.ghostImages.get(gt.id);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
        ctx.restore();
      } else {
        // Fallback placeholder square
        ctx.save();
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(imgX, imgY, imgSize, imgSize);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ghostInfo?.name || gt.id, gx, gy);
        ctx.restore();
      }

      // ── Outer Damage Rings / Pips (Strictly OUTSIDE image edge) ──
      ctx.save();
      if (!isBanished) {
        // 3 damage jewel pips along top edge of frame
        const pipRadius = 4;
        const pipSpacing = 14;
        for (let p = 0; p < 3; p++) {
          const pipX = gx + (p - 1) * pipSpacing;
          const pipY = imgY - 10;
          const isDamaged = p < hits;
          ctx.fillStyle = isDamaged ? '#ef4444' : '#27272a';
          ctx.strokeStyle = isDamaged ? '#fca5a5' : '#71717a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pipX, pipY, pipRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();

      // ── Bold Nameplate (Underneath the image, font >= 14px) ──
      ctx.save();
      const nameplateY = imgY + imgSize + 18;
      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';

      if (isReunion) {
        ctx.fillStyle = '#34d399';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;
        ctx.fillText(`CHOG #${ghostInfo?.id || gt.id} • REUNION!`, gx, nameplateY);
      } else if (isBanished) {
        ctx.fillStyle = '#c084fc';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 10;
        ctx.fillText(`CHOG #${ghostInfo?.id || gt.id} [SEALED]`, gx, nameplateY);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(`CHOG #${ghostInfo?.id || gt.id}`, gx, nameplateY);
        // Subtitle with character name and hits
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillStyle = '#67e8f9';
        ctx.fillText(`${ghostInfo?.name || ''} (${hits}/3)`, gx, nameplateY + 14);
      }
      ctx.restore();
    });

    // ── 10. Flippers (HARD RULE B: Drawn from Physics Body Vertices Every Frame) ──
    const drawPhysicsFlipper = (side: 'left' | 'right', pivot: [number, number]) => {
      const verts = physics.getFlipperVertices(side);
      if (!verts || verts.length === 0) return;

      ctx.save();
      // Flipper paddle body polygon
      ctx.beginPath();
      ctx.moveTo(toX(verts[0][0]), toY(verts[0][1]));
      for (let i = 1; i < verts.length; i++) {
        ctx.lineTo(toX(verts[i][0]), toY(verts[i][1]));
      }
      ctx.closePath();

      // Vibrant Purple Rubber with highlight rim
      const fGrad = ctx.createLinearGradient(
        toX(pivot[0]), toY(pivot[1]),
        toX(verts[0][0]), toY(verts[0][1])
      );
      fGrad.addColorStop(0, '#7e22ce');
      fGrad.addColorStop(1, '#a855f7');
      ctx.fillStyle = fGrad;
      ctx.fill();

      ctx.strokeStyle = '#e9d5ff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Pivot Bolt (Chrome cap with center bolt)
      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(toX(pivot[0]), toY(pivot[1]), toDist(0.016), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(toX(pivot[0]), toY(pivot[1]), toDist(0.006), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    drawPhysicsFlipper('left', L.flippers.left.pivot);
    drawPhysicsFlipper('right', L.flippers.right.pivot);

    // ── 11. Active Balls (Primary & Multiball Support) ──
    const allBalls = physics.getAllBallStates ? physics.getAllBallStates() : [physics.getBallState()];
    const bRad = toDist(L.ball.radius);

    allBalls.forEach((bPos, idx) => {
      const bx = toX(bPos.x);
      const by = toY(bPos.y);

      ctx.save();
      // Radiant ball motion glow
      const glowColor = state.reunionActive ? 'rgba(52, 211, 153, 0.7)' : 'rgba(192, 132, 252, 0.6)';
      const bGlow = ctx.createRadialGradient(bx, by, bRad * 0.2, bx, by, bRad * 2.2);
      bGlow.addColorStop(0, glowColor);
      bGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bGlow;
      ctx.beginPath();
      ctx.arc(bx, by, bRad * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Primary ball draws Soul Ball art if present, extra balls draw golden spheres
      if (idx === 0 && this.soulBallImg && this.soulBallImg.complete) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, bRad, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(this.soulBallImg, bx - bRad, by - bRad, bRad * 2, bRad * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = idx === 0 ? '#f8fafc' : '#fbbf24';
        ctx.beginPath();
        ctx.arc(bx, by, bRad, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = state.reunionActive ? '#34d399' : '#c084fc';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    });
  }
}
