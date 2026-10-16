/**
 * packages/physics/src/flat-2d-renderer.ts
 *
 * Full flat 2D renderer for Chog Swarm: Haunted Pinball.
 * Built directly from /docs/pinball/table-layout.json.
 * Accessible with ?renderer=2d or as the lightweight fallback.
 *
 * Gate 2 Updates:
 * - Multiball rendering (all active balls on playfield)
 * - Rollover lane illumination (bright amber for lit, dim purple for unlit)
 * - Crypt Portal rotating vortex animation
 * - Ghost targets: Reunion radiant golden/emerald glow and banished seal badges
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

    const marginX = targetW * 0.05;
    const marginY = marginX * 1.2;
    const innerW = targetW - marginX * 2;
    const innerH = innerW * (L.table.height / L.table.width);
    const targetH = targetHParam || (innerH + marginY * 1.5);

    const toX = (tuX: number) => marginX + tuX * innerW;
    const toY = (tuY: number) => marginY + tuY * (innerH / L.table.height);
    const toDist = (tuD: number) => tuD * innerW;

    // Background: Dark violet-black
    ctx.fillStyle = '#0b0813';
    ctx.fillRect(0, 0, targetW, targetH);

    // Playfield felt
    const playfieldGrad = ctx.createLinearGradient(0, toY(0), 0, toY(2.0));
    playfieldGrad.addColorStop(0, '#151024');
    playfieldGrad.addColorStop(0.5, '#100c1c');
    playfieldGrad.addColorStop(1, '#0a0812');
    ctx.fillStyle = playfieldGrad;
    ctx.fillRect(toX(0), toY(0), toDist(1.0), toDist(2.0));

    // Subtle moonlit grid lines
    ctx.strokeStyle = 'rgba(147, 51, 234, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 1.0; x += 0.1) {
      ctx.beginPath();
      ctx.moveTo(toX(x), toY(0));
      ctx.lineTo(toX(x), toY(2.0));
      ctx.stroke();
    }

    // ── Walls & Rails ──
    const arch = L.walls.topArch;
    ctx.save();
    ctx.strokeStyle = '#6b21a8';
    ctx.lineWidth = toDist(0.016);
    ctx.beginPath();
    ctx.arc(toX(arch.center[0]), toY(arch.center[1]), toDist(arch.radius), Math.PI, 2 * Math.PI);
    ctx.stroke();
    // Inner glowing rim
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const drawWall = (from: [number, number], to: [number, number], color = '#6b21a8') => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = toDist(0.014);
      ctx.beginPath();
      ctx.moveTo(toX(from[0]), toY(from[1]));
      ctx.lineTo(toX(to[0]), toY(to[1]));
      ctx.stroke();
      ctx.restore();
    };

    drawWall(L.walls.leftWall.from, L.walls.leftWall.to);
    drawWall(L.walls.outerRightWall.from, L.walls.outerRightWall.to);
    drawWall(L.walls.laneInnerWall.from, L.walls.laneInnerWall.to);
    drawWall(L.walls.leftApron.from, L.walls.leftApron.to, '#4c1d95');
    drawWall(L.walls.rightApron.from, L.walls.rightApron.to, '#4c1d95');

    // One-Way Gate
    const gate = L.walls.oneWayGate;
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(toX(gate.from[0]), toY(gate.from[1]));
    ctx.lineTo(toX(gate.to[0]), toY(gate.to[1]));
    ctx.stroke();
    ctx.restore();

    // ── Rollover Lanes (C-H-O-G) ──
    const rl = L.rolloverLanes;
    ctx.strokeStyle = '#581c87';
    ctx.lineWidth = 3;
    rl.dividerX.forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(toX(dx), toY(rl.y0));
      ctx.lineTo(toX(dx), toY(rl.y1));
      ctx.stroke();
    });

    rl.letters.forEach((letter, i) => {
      const lx = (rl.dividerX[i] + rl.dividerX[i + 1]) / 2;
      const isLit = state.rolloversLit.has(letter);
      const slotW = toDist(rl.dividerX[i + 1] - rl.dividerX[i]);
      const slotH = toDist(rl.y1 - rl.y0);

      // Lit background highlight
      if (isLit) {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
        ctx.fillRect(toX(rl.dividerX[i]), toY(rl.y0), slotW, slotH);
      }

      ctx.fillStyle = isLit ? '#fbbf24' : '#4b5563';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (isLit) {
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;
      }
      ctx.fillText(letter, toX(lx), toY((rl.y0 + rl.y1) / 2));
      ctx.shadowBlur = 0;
    });

    // ── Crypt Portal (Vortex Animation) ──
    const cp = L.cryptPortal;
    ctx.save();
    const portalPulse = state.cryptHeld ? 1.25 : 1 + 0.08 * Math.sin(this.timeSec * 4);
    const pGrad = ctx.createRadialGradient(
      toX(cp.x), toY(cp.y), 0,
      toX(cp.x), toY(cp.y), toDist(cp.radius * portalPulse)
    );
    pGrad.addColorStop(0, state.cryptHeld ? 'rgba(250, 204, 21, 0.9)' : 'rgba(52, 211, 153, 0.8)');
    pGrad.addColorStop(0.7, state.cryptHeld ? 'rgba(234, 88, 12, 0.5)' : 'rgba(16, 185, 129, 0.4)');
    pGrad.addColorStop(1, 'rgba(6, 78, 59, 0)');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(toX(cp.x), toY(cp.y), toDist(cp.radius * portalPulse), 0, Math.PI * 2);
    ctx.fill();

    // Spiral Vortex Arms
    ctx.strokeStyle = state.cryptHeld ? '#facc15' : '#34d399';
    ctx.lineWidth = 2;
    for (let arm = 0; arm < 3; arm++) {
      ctx.beginPath();
      const armAngle = this.timeSec * 6 + (arm * Math.PI * 2) / 3;
      ctx.arc(toX(cp.x), toY(cp.y), toDist(cp.radius * 0.75), armAngle, armAngle + Math.PI / 2);
      ctx.stroke();
    }

    ctx.fillStyle = state.cryptHeld ? '#fef08a' : '#a7f3d0';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(state.cryptHeld ? 'LOCK!' : 'CRYPT', toX(cp.x), toY(cp.y) + 3);
    ctx.restore();

    // ── Pop Bumpers (Slate Tombstones) ──
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

      // Tombstone text
      ctx.fillStyle = isHit ? '#ffffff' : '#e4e4e7';
      ctx.font = 'bold 11px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('R.I.P.', bx, by);
      ctx.restore();
    });

    // ── Slingshots (Coffin Wedges) ──
    L.slingshots.forEach((s) => {
      const isHit = (state.slingshotFlash.get(s.id) ?? 0) > now;
      ctx.save();
      ctx.fillStyle = isHit ? 'rgba(234, 88, 12, 0.6)' : 'rgba(76, 29, 149, 0.4)';
      ctx.strokeStyle = isHit ? '#fdba74' : '#a855f7';
      ctx.lineWidth = 2.5;
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

    // ── Ghost Targets (Floating Portraits) ──
    L.ghostTargets.forEach((gt) => {
      ctx.save();
      const bobY = 0.008 * Math.sin(this.timeSec * 3 + gt.x * 10);
      const gx = toX(gt.x);
      const gy = toY(gt.y + bobY);
      const gr = toDist(gt.radius);
      const ghostInfo = GHOST_CHOGS[gt.id];
      const hits = state.ghostDamage.get(gt.id) ?? 0;
      const isBanished = state.banishedGhosts.has(gt.id) || hits >= 3;
      const isReunion = state.reunionActive && state.reunionGhostId === gt.id;

      // Outer glowing frame (Gold/Emerald for Reunion, Purple for Banished, Cyan normal)
      ctx.save();
      const frameColor = isReunion ? '#10b981' : isBanished ? '#a855f7' : '#06b6d4';
      ctx.strokeStyle = frameColor;
      ctx.lineWidth = isReunion ? 4 : 3;
      ctx.shadowColor = frameColor;
      ctx.shadowBlur = isReunion ? 20 : 12;
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Portrait art clip
      const img = this.ghostImages.get(gt.id);
      if (img && img.complete) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(gx, gy, gr - 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, gx - gr, gy - gr, gr * 2, gr * 2);

        // Banished dark overlay
        if (isBanished) {
          ctx.fillStyle = 'rgba(126, 34, 206, 0.4)';
          ctx.fill();
        }
        ctx.restore();
      }

      // Damage Rings (if not banished)
      if (!isBanished) {
        for (let r = 1; r <= hits; r++) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(gx, gy, gr + r * 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Status Badge Tag
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      if (isReunion) {
        ctx.fillStyle = '#34d399';
        ctx.fillText('❤️ REUNION', gx, gy + gr + 14);
      } else if (isBanished) {
        ctx.fillStyle = '#c084fc';
        ctx.fillText('★ SEALED', gx, gy + gr + 14);
      } else {
        ctx.fillStyle = '#cffafe';
        ctx.fillText(`${ghostInfo?.name || gt.id} (${hits}/3)`, gx, gy + gr + 14);
      }
      ctx.restore();
    });

    // ── Flippers ──
    const angles = physics.getFlipperAnglesDeg();
    const drawFlipper = (pivot: [number, number], len: number, baseR: number, tipR: number, angleDeg: number) => {
      ctx.save();
      ctx.translate(toX(pivot[0]), toY(pivot[1]));
      ctx.rotate((angleDeg * Math.PI) / 180);

      const fLen = toDist(len);
      const fBase = toDist(baseR);
      const fTip = toDist(tipR);

      const fGrad = ctx.createLinearGradient(0, -fBase, fLen, fTip);
      fGrad.addColorStop(0, '#7c3aed');
      fGrad.addColorStop(1, '#a855f7');
      ctx.fillStyle = fGrad;
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(0, 0, fBase, Math.PI / 2, -Math.PI / 2, false);
      ctx.lineTo(fLen, -fTip);
      ctx.arc(fLen, 0, fTip, -Math.PI / 2, Math.PI / 2, false);
      ctx.lineTo(0, fBase);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pivot cap
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    drawFlipper(L.flippers.left.pivot, L.flippers.left.length, L.flippers.left.baseRadius, L.flippers.left.tipRadius, angles.left);
    drawFlipper(L.flippers.right.pivot, L.flippers.right.length, L.flippers.right.baseRadius, L.flippers.right.tipRadius, angles.right);

    // ── Plunger ──
    const pl = L.plunger;
    const plungerTravelPx = toDist(pl.travel * state.plungerCharge);
    ctx.save();
    ctx.fillStyle = '#d97706';
    ctx.fillRect(toX(pl.x) - toDist(0.025), toY(pl.restY) + plungerTravelPx, toDist(0.05), toDist(0.015));
    ctx.restore();

    // ── Active Balls (Multiball Support) ──
    const allBalls = physics.getAllBallStates ? physics.getAllBallStates() : [physics.getBallState()];
    const bRad = toDist(L.ball.radius);

    allBalls.forEach((bPos, idx) => {
      const bx = toX(bPos.x);
      const by = toY(bPos.y);

      ctx.save();
      // Ball radiant glow (Gold if Reunion, Purple default)
      const glowColor = state.reunionActive ? 'rgba(52, 211, 153, 0.7)' : 'rgba(192, 132, 252, 0.6)';
      const bGlow = ctx.createRadialGradient(bx, by, bRad * 0.2, bx, by, bRad * 2.2);
      bGlow.addColorStop(0, glowColor);
      bGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bGlow;
      ctx.beginPath();
      ctx.arc(bx, by, bRad * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Primary ball draws Soul Ball art if present, extra balls draw spectral glowing spheres
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
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    });
  }
}
