'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { themeFx } from '@/lib/theme-fx';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  maxAlpha: number;
  decay: number;
  isTrail?: boolean;
}

export function HalloweenBackground() {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Depth layer refs for parallax transforms
  const layer1Ref = useRef<HTMLDivElement | null>(null); // Collage (deepest: 8px)
  const layer2Ref = useRef<HTMLDivElement | null>(null); // Focus image (14px)
  const layer3Ref = useRef<HTMLDivElement | null>(null); // Fog + Embers (20px)
  const layer4Ref = useRef<HTMLDivElement | null>(null); // Vignette + Moon (nearest: 28px)

  // Game-reactive state
  const [drainActive, setDrainActive] = useState(false);
  const [multiballActive, setMultiballActive] = useState(false);
  const [shockwaveKey, setShockwaveKey] = useState<number | null>(null);
  const [jackpotActive, setJackpotActive] = useState(false);

  // Adaptive quality tier: 0 = full, 1 = reduced bats/trail, 2 = half embers/no sheen, 3 = static
  const qualityTierRef = useRef(0);

  // Focus image determination
  const getFocusConfig = (path: string): { image: string | null; opacity: number } => {
    if (!themeFx.focusCrossFade) return { image: null, opacity: 0 };
    if (!path || path === '/') {
      return { image: null, opacity: 0 };
    }
    if (path.startsWith('/arena') || path.startsWith('/race')) {
      return { image: '/halloween/bg/bg-frame4.webp', opacity: 0.55 };
    }
    if (path.startsWith('/lab')) {
      return { image: '/halloween/bg/bg-frame2.webp', opacity: 0.55 };
    }
    if (path.startsWith('/gauntlet') || path.startsWith('/leaderboard')) {
      return { image: '/halloween/bg/bg-frame3.webp', opacity: 0.55 };
    }
    if (path.startsWith('/play')) {
      return { image: '/halloween/bg/bg-frame4.webp', opacity: 0.35 };
    }
    if (path.startsWith('/demo')) {
      return { image: '/halloween/bg/bg-frame1.webp', opacity: 0.55 };
    }
    return { image: '/halloween/bg/bg-frame1.webp', opacity: 0.55 };
  };

  const focusConfig = getFocusConfig(pathname);

  // ─── 1. Parallax & Motion Engine (Single rAF loop) ───────────────────────
  useEffect(() => {
    if (!themeFx.parallax) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let scrollY = 0;
    let rafId: number;
    let lastActiveTime = performance.now();
    let isHidden = false;

    // Performance & Adaptive Quality Tracker
    let frameTimes: number[] = [];
    let lastFrameTime = performance.now();

    const handlePointerMove = (e: MouseEvent) => {
      // Normalize to -1 .. 1
      targetX = (e.clientX / window.innerWidth) * 2 - 1;
      targetY = (e.clientY / window.innerHeight) * 2 - 1;
      lastActiveTime = performance.now();

      // Specular sheen tracking for panels
      document.documentElement.style.setProperty('--mx', targetX.toFixed(3));
      document.documentElement.style.setProperty('--my', targetY.toFixed(3));
    };

    const handleScroll = () => {
      scrollY = window.scrollY;
      lastActiveTime = performance.now();
    };

    const handleVisibility = () => {
      isHidden = document.hidden;
      if (!isHidden) {
        lastActiveTime = performance.now();
      }
    };

    // Gyroscope orientation fallback
    let gyroActive = false;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        gyroActive = true;
        // Clamp gamma (-30 to 30) and beta (-30 to 30)
        targetX = Math.max(-1, Math.min(1, e.gamma / 25));
        targetY = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
        lastActiveTime = performance.now();
      }
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    }

    // Single rAF Animation Loop
    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);

      if (isHidden) return;

      // Adaptive quality FPS monitoring
      if (themeFx.adaptiveQuality) {
        const delta = now - lastFrameTime;
        lastFrameTime = now;
        frameTimes.push(1000 / Math.max(delta, 1));
        if (frameTimes.length > 120) {
          frameTimes.shift();
          const avgFps = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
          if (avgFps < 52 && qualityTierRef.current < 3) {
            qualityTierRef.current += 1;
            frameTimes = []; // reset measurement window
          }
        }
      }

      // Check idle (3 seconds without pointer) -> run slow Lissajous auto-drift if no gyro
      const idle = (now - lastActiveTime) > 3000;
      if (idle && !gyroActive && qualityTierRef.current < 3) {
        const t = now * 0.00015; // 40s loop
        targetX = Math.sin(t * 2) * 0.35;
        targetY = Math.cos(t * 3) * 0.35;
      }

      if (qualityTierRef.current >= 3) {
        // Quality tier 3: freeze parallax
        return;
      }

      // Smooth lerp (0.08)
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      const scrollOffset = scrollY * 0.15;

      // Apply depth translations
      if (layer1Ref.current) {
        // Deepest: 8px
        layer1Ref.current.style.transform = `translate3d(${(currentX * 8).toFixed(2)}px, ${(currentY * 8 + scrollOffset * 0.3).toFixed(2)}px, 0)`;
      }
      if (layer2Ref.current) {
        // Focus layer: 14px
        layer2Ref.current.style.transform = `translate3d(${(currentX * 14).toFixed(2)}px, ${(currentY * 14 + scrollOffset * 0.5).toFixed(2)}px, 0)`;
      }
      if (layer3Ref.current) {
        // Fog & embers: 20px
        layer3Ref.current.style.transform = `translate3d(${(currentX * 20).toFixed(2)}px, ${(currentY * 20 + scrollOffset * 0.7).toFixed(2)}px, 0)`;
      }
      if (layer4Ref.current) {
        // Vignette & moon: 28px
        layer4Ref.current.style.transform = `translate3d(${(currentX * 28).toFixed(2)}px, ${(currentY * 28 + scrollOffset).toFixed(2)}px, 0)`;
      }
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  // ─── 2. Embers Canvas Simulation ──────────────────────────────────────────
  useEffect(() => {
    if (!themeFx.embers) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: Particle[] = [];
    const trailParticles: Particle[] = [];
    let mousePos = { x: -999, y: -999 };

    const handleMouseMove = (e: MouseEvent) => {
      mousePos = { x: e.clientX, y: e.clientY };

      // Cursor trail (max 12 particles, tier < 1)
      if (themeFx.emberTrail && qualityTierRef.current < 1) {
        if (trailParticles.length < 12) {
          trailParticles.push({
            x: e.clientX + (Math.random() * 8 - 4),
            y: e.clientY + (Math.random() * 8 - 4),
            vx: (Math.random() - 0.5) * 0.8,
            vy: -Math.random() * 1.5 - 0.5,
            size: Math.random() * 2 + 1,
            color: Math.random() > 0.4 ? '#ff7a1a' : '#ff3b1f',
            alpha: 0.9,
            maxAlpha: 0.9,
            decay: 0.025, // Fades in ~600ms at 60fps
            isTrail: true,
          });
        }
      }
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Spawn regular ambient particles (up to 40, or 20 in tier 2)
    const maxParticles = () => (qualityTierRef.current >= 2 ? 20 : (multiballActive ? 80 : 40));

    const spawnParticle = (): Particle => ({
      x: Math.random() * width,
      y: height + Math.random() * 40,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -Math.random() * 1.2 - 0.4,
      size: Math.random() * 2.5 + 1,
      color: Math.random() > 0.35 ? '#ff7a1a' : '#ff3b1f',
      alpha: 0,
      maxAlpha: Math.random() * 0.7 + 0.2,
      decay: 0.003 + Math.random() * 0.003,
    });

    for (let i = 0; i < 25; i++) {
      const p = spawnParticle();
      p.y = Math.random() * height; // initial spread
      p.alpha = Math.random() * p.maxAlpha;
      particles.push(p);
    }

    let emberRafId: number;

    const render = () => {
      emberRafId = requestAnimationFrame(render);
      ctx.clearRect(0, 0, width, height);

      // Spawn if below limit
      if (particles.length < maxParticles() && Math.random() < 0.25) {
        particles.push(spawnParticle());
      }

      // Render & update ambient particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Repulsion from pointer (radius 120px)
        const dx = p.x - mousePos.x;
        const dy = p.y - mousePos.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 120 && dist > 0) {
          const force = (120 - dist) / 120;
          p.x += (dx / dist) * force * 1.8;
          p.y += (dy / dist) * force * 1.8;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Fade in then out
        if (p.alpha < p.maxAlpha && p.vy < 0) {
          p.alpha += 0.015;
        } else {
          p.alpha -= p.decay;
        }

        if (p.alpha <= 0 || p.y < -20) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render & update cursor trail particles
      for (let i = trailParticles.length - 1; i >= 0; i--) {
        const p = trailParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          trailParticles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    emberRafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(emberRafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [multiballActive]);

  // ─── 3. Game-Reactive CustomEvent Listener ("chog:fx") ─────────────────────
  useEffect(() => {
    if (!themeFx.gameReactions) return;

    const handleFx = (e: Event) => {
      const custom = e as CustomEvent<{ type: string; x?: number; y?: number }>;
      const { type } = custom.detail || {};

      switch (type) {
        case 'bumper':
        case 'slingshot': {
          // 150ms border ember burst
          const burst = document.createElement('div');
          burst.className = 'fixed pointer-events-none inset-0 z-0 transition-opacity duration-150';
          burst.style.boxShadow = 'inset 0 0 80px rgba(255, 122, 26, 0.4)';
          burst.style.opacity = '1';
          document.body.appendChild(burst);
          setTimeout(() => {
            burst.style.opacity = '0';
            setTimeout(() => burst.remove(), 160);
          }, 150);
          break;
        }
        case 'ghostBanish': {
          setShockwaveKey(Date.now());
          setTimeout(() => setShockwaveKey(null), 800);
          break;
        }
        case 'multiballStart': {
          setMultiballActive(true);
          break;
        }
        case 'multiballEnd': {
          setMultiballActive(false);
          break;
        }
        case 'drain': {
          setDrainActive(true);
          setTimeout(() => setDrainActive(false), 600);
          break;
        }
        case 'jackpot': {
          setJackpotActive(true);
          setTimeout(() => setJackpotActive(false), 1500);
          break;
        }
      }
    };

    window.addEventListener('chog:fx', handleFx);
    return () => window.removeEventListener('chog:fx', handleFx);
  }, []);

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden select-none z-[-1] transition-opacity duration-500 ${
        drainActive ? 'opacity-60' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
      {/* ── Layer 1: Base Collage (Deepest: 8px translation) ── */}
      <div
        ref={layer1Ref}
        className="absolute -inset-[30px] w-[calc(100%+60px)] h-[calc(100%+60px)] will-change-transform"
      >
        <picture>
          <source media="(max-width: 767px)" srcSet="/halloween/bg/mobile-bg.webp" />
          <source media="(max-width: 1279px)" srcSet="/halloween/bg/tablet-bg.webp" />
          <img
            src="/halloween/bg/desktop-bg.webp"
            alt=""
            className="w-full h-full object-cover object-center"
            loading="eager"
            fetchPriority="high"
          />
        </picture>

        {/* Diagonal Holographic Sheen Sweep (18s loop) */}
        {themeFx.cardSheen && (
          <div className="holo-sheen absolute -inset-[100%] w-[300%] h-[300%] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
        )}
      </div>

      {/* ── Layer 2: Per-Route Focus Cross-Fade (14px translation) ── */}
      <div
        ref={layer2Ref}
        className="absolute -inset-[30px] w-[calc(100%+60px)] h-[calc(100%+60px)] will-change-transform"
      >
        {focusConfig.image && (
          <img
            src={focusConfig.image}
            alt=""
            className="w-full h-full object-cover object-center transition-opacity duration-600 ease-in-out"
            style={{ opacity: focusConfig.opacity }}
          />
        )}
      </div>

      {/* ── Layer 3: Fog Bands & Embers (20px translation) ── */}
      <div
        ref={layer3Ref}
        className="absolute -inset-[30px] w-[calc(100%+60px)] h-[calc(100%+60px)] will-change-transform"
      >
        {/* Fog Band 1 (60s loop) */}
        {themeFx.fog && (
          <div
            className={`fog-band-1 absolute inset-0 bg-gradient-to-t from-purple-950/20 via-transparent to-transparent mix-blend-screen pointer-events-none ${
              multiballActive ? 'opacity-90' : 'opacity-40'
            }`}
          />
        )}

        {/* Fog Band 2 (90s loop) */}
        {themeFx.fog && (
          <div
            className={`fog-band-2 absolute inset-0 bg-gradient-to-b from-indigo-950/25 via-transparent to-transparent mix-blend-screen pointer-events-none ${
              multiballActive ? 'opacity-95' : 'opacity-35'
            }`}
          />
        )}

        {/* Embers Canvas */}
        {themeFx.embers && (
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        )}

        {/* Shockwave Ring from Ghost Banish */}
        {shockwaveKey && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[100px] h-[100px] rounded-full border-4 border-pumpkin/80 animate-ping" />
          </div>
        )}

        {/* Jackpot Gold-Ember Flood */}
        {jackpotActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-pumpkin/30 to-ember/20 animate-pulse pointer-events-none" />
        )}
      </div>

      {/* ── Layer 4: Vignette, Moon, Cobwebs & Bats (Nearest: 28px translation) ── */}
      <div
        ref={layer4Ref}
        className="absolute -inset-[30px] w-[calc(100%+60px)] h-[calc(100%+60px)] will-change-transform"
      >
        {/* Radial Vignette: transparent center to #0a0712 at edges */}
        {themeFx.vignette && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, transparent 45%, rgba(10, 7, 18, 0.65) 80%, rgba(10, 7, 18, 0.95) 100%)',
            }}
          />
        )}

        {/* Moon top-right with soft violet/white halo */}
        {themeFx.moon && (
          <div className="absolute top-10 right-14 w-28 h-28 rounded-full pointer-events-none">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#fff7e6] to-[#f0dfc4] shadow-[0_0_50px_rgba(240,223,196,0.4),0_0_100px_rgba(131,110,249,0.3)] opacity-85" />
          </div>
        )}

        {/* Top-Left Cobweb SVG */}
        {themeFx.cobwebs && (
          <svg
            className="absolute top-0 left-0 w-44 h-44 text-bone/15 pointer-events-none"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
          >
            <path d="M0,0 L100,0 M0,0 L85,25 M0,0 L70,50 M0,0 L50,70 M0,0 L25,85 M0,0 L0,100" />
            <path d="M20,0 Q18,18 0,20 M40,0 Q36,36 0,40 M60,0 Q54,54 0,60 M80,0 Q72,72 0,80 M100,0 Q90,90 0,100" />
          </svg>
        )}

        {/* Top-Right Cobweb SVG */}
        {themeFx.cobwebs && (
          <svg
            className="absolute top-0 right-0 w-44 h-44 text-bone/15 pointer-events-none rotate-90"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
          >
            <path d="M0,0 L100,0 M0,0 L85,25 M0,0 L70,50 M0,0 L50,70 M0,0 L25,85 M0,0 L0,100" />
            <path d="M20,0 Q18,18 0,20 M40,0 Q36,36 0,40 M60,0 Q54,54 0,60 M80,0 Q72,72 0,80 M100,0 Q90,90 0,100" />
          </svg>
        )}

        {/* 5 Flying Bats across the screen */}
        {themeFx.bats && qualityTierRef.current < 1 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <Bat delay="0s" duration="28s" top="18%" scale={0.7} />
            <Bat delay="7s" duration="34s" top="32%" scale={0.5} />
            <Bat delay="14s" duration="26s" top="12%" scale={0.8} />
            <Bat delay="21s" duration="40s" top="45%" scale={0.4} />
            <Bat delay="28s" duration="30s" top="24%" scale={0.6} />
          </div>
        )}
      </div>
    </div>
  );
}

// Bat Silhouette SVG component with CSS flying animation
function Bat({ delay, duration, top, scale }: { delay: string; duration: string; top: string; scale: number }) {
  return (
    <div
      className="absolute left-[-80px] pointer-events-none opacity-45"
      style={{
        top,
        transform: `scale(${scale})`,
        animation: `flyAcross ${duration} infinite linear`,
        animationDelay: delay,
      }}
    >
      <svg width="48" height="24" viewBox="0 0 24 12" fill="#0a0712">
        <path d="M12 4C10 1 8 0 5 0C2 0 0 3 0 5C0 8 3 10 5 10C8 10 10 8 12 12C14 8 16 10 19 10C21 10 24 8 24 5C24 3 22 0 19 0C16 0 14 1 12 4Z" />
      </svg>
      <style jsx>{`
        @keyframes flyAcross {
          0% {
            transform: translate3d(-100px, 0, 0) scale(${scale});
          }
          50% {
            transform: translate3d(calc(50vw), 25px, 0) scale(${scale});
          }
          100% {
            transform: translate3d(calc(100vw + 100px), -15px, 0) scale(${scale});
          }
        }
      `}</style>
    </div>
  );
}
