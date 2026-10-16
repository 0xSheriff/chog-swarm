'use client';

import React, { useRef, useEffect } from 'react';
import { ArenaState, Position, ResourceNode, HazardCell, AgentState, RaceTrackData } from '@engine/types';
import { buildRaceTrack } from '@engine/race-engine';

interface ArenaCanvasProps {
  state: ArenaState;
  selectedAgentId?: string;
  playbackProgress?: number; // 0.0 to 1.0 for interpolation between turns
  onCellClick?: (pos: Position) => void;
  className?: string;
}

const RACER_COLORS = [
  { primary: '#836EF9', secondary: '#A78BFA', glow: 'rgba(131, 110, 249, 0.6)', name: 'Purple' },
  { primary: '#EC4899', secondary: '#F472B6', glow: 'rgba(236, 72, 153, 0.6)', name: 'Pink' },
  { primary: '#06B6D4', secondary: '#22D3EE', glow: 'rgba(6, 182, 212, 0.6)', name: 'Cyan' },
  { primary: '#F59E0B', secondary: '#FBBF24', glow: 'rgba(245, 158, 11, 0.6)', name: 'Gold' }
];

export function ArenaCanvas({
  state,
  selectedAgentId,
  playbackProgress = 1.0,
  onCellClick,
  className = '',
}: ArenaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : (canvas.clientWidth > 0 ? canvas.clientWidth : 640);
    const height = rect.height > 0 ? rect.height : (canvas.clientHeight > 0 ? canvas.clientHeight : 640);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const cols = state.gridSize.width;
    const rows = state.gridSize.height;
    const cellWidth = width / cols;
    const cellHeight = height / rows;

    const isRaceMode = state.rulesVersion === 'race-v1';

    if (isRaceMode) {
      renderRaceMode(ctx, state, width, height, cols, rows, cellWidth, cellHeight, selectedAgentId);
    } else {
      renderClassicGrid(ctx, state, width, height, cols, rows, cellWidth, cellHeight, selectedAgentId);
    }
  }, [state, selectedAgentId, playbackProgress]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onCellClick || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cellWidth = rect.width / state.gridSize.width;
    const cellHeight = rect.height / state.gridSize.height;
    const cellX = Math.floor(x / cellWidth);
    const cellY = Math.floor(y / cellHeight);
    onCellClick({ x: cellX, y: cellY });
  };

  return (
    <div className={`relative aspect-square w-full rounded-2xl overflow-hidden border border-chog-lineBright shadow-2xl bg-chog-base ${className}`}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="w-full h-full block cursor-crosshair"
      />
    </div>
  );
}

/**
 * High-fidelity Race Track rendering for race-v1
 */
function renderRaceMode(
  ctx: CanvasRenderingContext2D,
  state: ArenaState,
  width: number,
  height: number,
  cols: number,
  rows: number,
  cellW: number,
  cellH: number,
  selectedAgentId?: string
) {
  const track = state.trackData || buildRaceTrack(state.seed);
  const now = Date.now() / 1000;

  // 1. Draw Infield / Outfield Base (Dark tech ground)
  ctx.fillStyle = '#090714';
  ctx.fillRect(0, 0, width, height);

  // Subtle background grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cellW, 0);
    ctx.lineTo(x * cellW, height);
    ctx.stroke();
  }
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * cellH);
    ctx.lineTo(width, y * cellH);
    ctx.stroke();
  }

  // 2. Draw Walls & Infield Courtyard Island
  for (const w of track.walls) {
    const px = w.x * cellW;
    const py = w.y * cellH;
    ctx.fillStyle = '#0E0B1C';
    ctx.fillRect(px, py, cellW, cellH);

    // Subtle barrier pattern
    ctx.strokeStyle = 'rgba(131, 110, 249, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 1, py + 1, cellW - 2, cellH - 2);
  }

  // 3. Draw Track Asphalt Roadway
  for (const t of track.trackTiles) {
    const px = t.x * cellW;
    const py = t.y * cellH;

    const isShortcut = track.shortcutTiles.some(s => s.x === t.x && s.y === t.y);

    if (isShortcut) {
      // Risky Shortcut Corridor: Distinct crimson-tinted asphalt with hazard border
      ctx.fillStyle = '#1F1020';
      ctx.fillRect(px, py, cellW, cellH);

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, cellW - 1, cellH - 1);
    } else {
      // Main Circuit Asphalt: Clean dark pavement
      ctx.fillStyle = '#151126';
      ctx.fillRect(px, py, cellW, cellH);

      // Outer track border
      ctx.strokeStyle = 'rgba(131, 110, 249, 0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, cellW - 1, cellH - 1);
    }
  }

  // 4. White Centerline dashes along straightaways
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.setLineDash([4, 6]);
  ctx.lineWidth = 1.5;

  // Top straight dash
  ctx.beginPath();
  ctx.moveTo(3 * cellW, 3 * cellH);
  ctx.lineTo(10 * cellW, 3 * cellH);
  ctx.stroke();

  // Bottom straight dash
  ctx.beginPath();
  ctx.moveTo(3 * cellW, 11 * cellH);
  ctx.lineTo(10 * cellW, 11 * cellH);
  ctx.stroke();

  // Left straight dash
  ctx.beginPath();
  ctx.moveTo(3 * cellW, 3 * cellH);
  ctx.lineTo(3 * cellW, 11 * cellH);
  ctx.stroke();

  // Right straight dash
  ctx.beginPath();
  ctx.moveTo(11 * cellW, 3 * cellH);
  ctx.lineTo(11 * cellW, 11 * cellH);
  ctx.stroke();
  ctx.setLineDash([]);

  // 5. Draw Checkpoint Gates (CP1, CP2, CP3)
  const cpGlowColors = [
    { beam: 'rgba(34, 211, 238, 0.35)', border: '#22D3EE', label: 'CP1', text: '#22D3EE' },
    { beam: 'rgba(245, 158, 11, 0.35)', border: '#F59E0B', label: 'CP2', text: '#F59E0B' },
    { beam: 'rgba(168, 85, 247, 0.35)', border: '#A855F7', label: 'CP3', text: '#A855F7' }
  ];

  for (let i = 0; i < track.checkpoints.length; i++) {
    const cp = track.checkpoints[i];
    const theme = cpGlowColors[i % cpGlowColors.length];

    for (const pos of cp.positions) {
      const gx = pos.x * cellW;
      const gy = pos.y * cellH;

      ctx.fillStyle = theme.beam;
      ctx.fillRect(gx + 1, gy + 1, cellW - 2, cellH - 2);

      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(gx + 2, gy + 2, cellW - 4, cellH - 4);
    }

    // Gate tag at midpoint of checkpoint gate
    const midX = (cp.positions[0].x + cp.positions[cp.positions.length - 1].x) / 2 * cellW + cellW / 2;
    const midY = (cp.positions[0].y + cp.positions[cp.positions.length - 1].y) / 2 * cellH + cellH / 2;

    ctx.fillStyle = 'rgba(14, 11, 26, 0.85)';
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(midX - 16, midY - 7, 32, 14, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.text;
    ctx.font = 'bold 9px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(theme.label, midX, midY);
  }

  // 6. Draw Checkered Finish Line
  for (const pos of track.finishLine) {
    const fx = pos.x * cellW;
    const fy = pos.y * cellH;
    const halfW = cellW / 2;
    const halfH = cellH / 2;

    // 2x2 Checker pattern
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(fx, fy, halfW, halfH);
    ctx.fillRect(fx + halfW, fy + halfH, halfW, halfH);

    ctx.fillStyle = '#110D20';
    ctx.fillRect(fx + halfW, fy, halfW, halfH);
    ctx.fillRect(fx, fy + halfH, halfW, halfH);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(fx, fy, cellW, cellH);
  }

  // Finish banner badge
  const finishMidX = 2.5 * cellW + cellW / 2;
  const finishMidY = 3.5 * cellH + cellH / 2;
  ctx.fillStyle = 'rgba(14, 11, 26, 0.9)';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(finishMidX - 22, finishMidY - 7, 44, 14, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 8.5px JetBrains Mono';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FINISH', finishMidX, finishMidY);

  // 7. Draw Boost Pads (Neon Green glowing chevrons >>)
  for (const b of track.boostPads) {
    const bx = b.x * cellW + cellW / 2;
    const by = b.y * cellH + cellH / 2;
    const pulse = Math.sin(now * 4) * 2;

    // Glowing pad aura
    const grad = ctx.createRadialGradient(bx, by, 3, bx, by, cellW * 0.45 + pulse);
    grad.addColorStop(0, 'rgba(92, 230, 138, 0.4)');
    grad.addColorStop(1, 'rgba(92, 230, 138, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(b.x * cellW, b.y * cellH, cellW, cellH);

    // Double neon chevrons >>
    ctx.strokeStyle = '#5CE68A';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const sz = cellW * 0.18;
    // Left chevron
    ctx.beginPath();
    ctx.moveTo(bx - sz - 2, by - sz);
    ctx.lineTo(bx - 2, by);
    ctx.lineTo(bx - sz - 2, by + sz);
    ctx.stroke();

    // Right chevron
    ctx.beginPath();
    ctx.moveTo(bx + 2, by - sz);
    ctx.lineTo(bx + sz + 2, by);
    ctx.lineTo(bx + 2, by + sz);
    ctx.stroke();

    ctx.fillStyle = '#5CE68A';
    ctx.font = 'bold 7.5px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('+BOOST', bx, by + cellH * 0.46);
  }

  // 8. Draw Oil Slicks (Glossy dark purple liquid hazards)
  for (const o of track.oilSlicks) {
    const ox = o.x * cellW + cellW / 2;
    const oy = o.y * cellH + cellH / 2;

    // Slick puddle base
    ctx.fillStyle = 'rgba(88, 28, 135, 0.7)';
    ctx.beginPath();
    ctx.ellipse(ox, oy, cellW * 0.36, cellH * 0.28, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    // Inner iridescent shine
    ctx.fillStyle = 'rgba(168, 85, 247, 0.5)';
    ctx.beginPath();
    ctx.ellipse(ox - 3, oy - 2, cellW * 0.22, cellH * 0.15, -Math.PI / 8, 0, Math.PI * 2);
    ctx.fill();

    // Oil warning text
    ctx.fillStyle = '#C084FC';
    ctx.font = 'bold 8px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OIL', ox, oy);
  }

  // 9. Draw Racers (1 to 4 cars with ranks, direction, fuel gauges, and boost trails)
  const standings = state.raceStandings || [];

  for (let i = 0; i < state.agents.length; i++) {
    const agent = state.agents[i];
    const isSelected = !selectedAgentId || agent.id === selectedAgentId;
    const colorScheme = RACER_COLORS[i % RACER_COLORS.length];

    const rx = agent.position.x * cellW + cellW / 2;
    const ry = agent.position.y * cellH + cellH / 2;

    // Rank from live standings
    const rankEntry = standings.find(s => s.agentId === agent.id);
    const rankNum = rankEntry ? rankEntry.rank : i + 1;

    // Turbo burst trail if used this turn or sprinting
    if (agent.statusMessage?.includes('TURBO') || agent.statusMessage?.includes('Sprint')) {
      const flameGrad = ctx.createRadialGradient(rx, ry, 2, rx, ry, cellW * 0.6);
      flameGrad.addColorStop(0, 'rgba(245, 158, 11, 0.7)');
      flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.arc(rx, ry, cellW * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer racer aura glow
    ctx.strokeStyle = colorScheme.primary;
    ctx.shadowColor = colorScheme.glow;
    ctx.shadowBlur = isSelected ? 12 : 6;
    ctx.lineWidth = isSelected ? 3 : 1.5;
    ctx.beginPath();
    ctx.arc(rx, ry, cellW * 0.40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Aerodynamic Racing Pod Body
    ctx.fillStyle = agent.hasFinished ? '#10B981' : colorScheme.primary;
    ctx.beginPath();
    ctx.ellipse(rx, ry, cellW * 0.30, cellH * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Windshield visor
    ctx.fillStyle = '#0E0B1A';
    ctx.beginPath();
    ctx.ellipse(rx, ry - 1, cellW * 0.16, cellH * 0.10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chog Visor Reflection
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(rx - 3, ry - 3, 2, 0, Math.PI * 2);
    ctx.arc(rx + 3, ry - 3, 2, 0, Math.PI * 2);
    ctx.fill();

    // Overhead Rank Badge Pill
    const rankBadgeY = ry - cellH * 0.44;
    const rankBg = agent.hasFinished
      ? '#10B981'
      : (rankNum === 1 ? '#F59E0B' : (rankNum === 2 ? '#94A3B8' : (rankNum === 3 ? '#B45309' : '#374151')));

    ctx.fillStyle = rankBg;
    ctx.beginPath();
    ctx.roundRect(rx - 14, rankBadgeY - 6, 28, 12, 6);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 8px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(agent.hasFinished ? '🏁 FIN' : `${rankNum}${getOrdinal(rankNum)}`, rx, rankBadgeY);

    // Turbo Fuel Battery Meter underneath
    const meterW = cellW * 0.65;
    const meterH = 3.5;
    const meterX = rx - meterW / 2;
    const meterY = ry + cellH * 0.36;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(meterX, meterY, meterW, meterH);

    const fuelRatio = Math.max(0, Math.min(1, agent.energy / agent.maxEnergy));
    ctx.fillStyle = fuelRatio > 0.4 ? '#5CE68A' : (fuelRatio > 0.2 ? '#F59E0B' : '#EF4444');
    ctx.fillRect(meterX, meterY, meterW * fuelRatio, meterH);

    // Small fuel label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '6.5px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${Math.round(agent.energy)} TF`, rx, meterY + meterH + 1);
  }
}

function getOrdinal(n: number): string {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

/**
 * Classic Grid Arena rendering (preserved for v1.0 replays)
 */
function renderClassicGrid(
  ctx: CanvasRenderingContext2D,
  state: ArenaState,
  width: number,
  height: number,
  cols: number,
  rows: number,
  cellW: number,
  cellH: number,
  selectedAgentId?: string
) {
  // 1. Draw Background
  ctx.fillStyle = '#0E0B1A';
  ctx.fillRect(0, 0, width, height);

  // 2. Draw Grid Cells
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const px = x * cellW;
      const py = y * cellH;

      ctx.fillStyle = (x + y) % 2 === 0 ? '#120E22' : '#141026';
      ctx.fillRect(px + 1, py + 1, cellW - 2, cellH - 2);

      ctx.strokeStyle = 'rgba(244, 241, 254, 0.04)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, cellW - 1, cellH - 1);
    }
  }

  // 3. Draw Hazard Zones
  for (const h of state.hazards) {
    const hx = h.x * cellW;
    const hy = h.y * cellH;

    const grad = ctx.createRadialGradient(
      hx + cellW / 2,
      hy + cellH / 2,
      4,
      hx + cellW / 2,
      hy + cellH / 2,
      cellW * 0.7
    );
    grad.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
    grad.addColorStop(1, 'rgba(239, 68, 68, 0.05)');

    ctx.fillStyle = grad;
    ctx.fillRect(hx + 1, hy + 1, cellW - 2, cellH - 2);

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hx + 3, hy + 3, cellW - 6, cellH - 6);

    ctx.fillStyle = '#EF4444';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▲', hx + cellW / 2, hy + cellH / 2);
  }

  // 4. Draw Resource Nodes
  const now = Date.now() / 1000;
  for (const node of state.nodes) {
    if (!node.active) {
      const nx = node.x * cellW + cellW / 2;
      const ny = node.y * cellH + cellH / 2;
      ctx.fillStyle = 'rgba(244, 241, 254, 0.08)';
      ctx.beginPath();
      ctx.arc(nx, ny, 4, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    const nx = node.x * cellW + cellW / 2;
    const ny = node.y * cellH + cellH / 2;

    if (node.type === 'nexus') {
      const pulse = Math.sin(now * 3) * 3;
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(nx, ny, cellW * 0.32 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#22D3EE';
      ctx.beginPath();
      ctx.arc(nx, ny, cellW * 0.16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0E0B1A';
      ctx.font = 'bold 9px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+50', nx, ny);
    } else if (node.type === 'high_value') {
      const size = cellW * 0.28;
      ctx.fillStyle = '#836EF9';
      ctx.shadowColor = 'rgba(131, 110, 249, 0.6)';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(nx, ny - size);
      ctx.lineTo(nx + size, ny);
      ctx.lineTo(nx, ny + size);
      ctx.lineTo(nx - size, ny);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+30', nx, ny);
    } else {
      ctx.fillStyle = '#5CE68A';
      ctx.shadowColor = 'rgba(92, 230, 138, 0.5)';
      ctx.shadowBlur = 6;

      ctx.beginPath();
      ctx.arc(nx, ny, cellW * 0.20, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0E0B1A';
      ctx.font = 'bold 8.5px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+10', nx, ny);
    }
  }

  // 5. Draw Agents
  for (let i = 0; i < state.agents.length; i++) {
    const agent = state.agents[i];
    const isSelected = !selectedAgentId || agent.id === selectedAgentId;

    const ax = agent.position.x * cellW + cellW / 2;
    const ay = agent.position.y * cellH + cellH / 2;

    const auraColor = i === 0 ? '#836EF9' : '#EC4899';
    ctx.strokeStyle = auraColor;
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(ax, ay, cellW * 0.38, 0, Math.PI * 2);
    ctx.stroke();

    if (agent.shieldRemaining > 0) {
      ctx.strokeStyle = '#22D3EE';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(ax, ay, cellW * 0.44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = agent.isExhausted ? '#4B5563' : (i === 0 ? '#836EF9' : '#EC4899');
    ctx.beginPath();
    ctx.arc(ax, ay, cellW * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    const eyeOffset = cellW * 0.08;
    ctx.beginPath();
    ctx.arc(ax - eyeOffset, ay - eyeOffset, 3, 0, Math.PI * 2);
    ctx.arc(ax + eyeOffset, ay - eyeOffset, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(ax - eyeOffset, ay - eyeOffset, 1.5, 0, Math.PI * 2);
    ctx.arc(ax + eyeOffset, ay - eyeOffset, 1.5, 0, Math.PI * 2);
    ctx.fill();

    const barWidth = cellW * 0.7;
    const barHeight = 4;
    const barX = ax - barWidth / 2;
    const barY = ay + cellW * 0.34;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const energyRatio = Math.max(0, Math.min(1, agent.energy / agent.maxEnergy));
    ctx.fillStyle = energyRatio > 0.4 ? '#5CE68A' : (energyRatio > 0.2 ? '#F59E0B' : '#EF4444');
    ctx.fillRect(barX, barY, barWidth * energyRatio, barHeight);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${agent.score} pts`, ax, ay - cellW * 0.32);
  }
}
