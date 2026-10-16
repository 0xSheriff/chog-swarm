'use client';

/**
 * /play — Chog Swarm: Haunted Pinball (Gate 1 Redo)
 *
 * Built strictly from /docs/pinball/table-layout.json.
 * Zero hardcoded dimensions.
 *
 * Features:
 * - Debug View toggled with 'D' key (renders all colliders on dark unit grid)
 * - 3D Three.js WebGL2 renderer (pitch ~55°, moonlit rim light, teal fog, torches)
 * - 2D Flat Canvas renderer available via ?renderer=2d or UI toggle
 * - Fixed 120 Hz Planck.js physics with speed cap, bumper/slingshot kicks, gate, stuck rescue
 * - Real Ghost Chog portraits for g1 to g4 (Blaze, Burning Skully, Chog Scream, Chogbomination)
 * - Large Top-Center HUD with Haunt power meter and event callout banner
 * - Soul Ball vs Guest Spirit side-by-side selection
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Sparkles, Shield, Zap, RefreshCw, Eye } from 'lucide-react';

import { TableLayout } from '@/packages/physics/src/types';
import { loadTableLayout } from '@/packages/physics/src/layout-loader';
import { createPhysicsWorld, PhysicsWorldInstance, FIXED_DT } from '@/packages/physics/src/physics-world';
import { renderDebugView } from '@/packages/physics/src/debug-renderer';
import { Flat2DRenderer, GameVisualState, GHOST_CHOGS } from '@/packages/physics/src/flat-2d-renderer';
import { Three3DRenderer } from '@/packages/physics/src/three-3d-renderer';

interface OwnedChog {
  tokenId: number;
  name: string;
  image: string;
  attributes: { trait_type: string; value: string }[];
}

function PlayPageContent() {
  const searchParams = useSearchParams();
  const force2D = searchParams.get('renderer') === '2d';
  const { address, isConnected } = useAccount();

  // Layout & Config
  const [layout, setLayout] = useState<TableLayout | null>(null);
  const [rendererMode, setRendererMode] = useState<'3d' | '2d'>(force2D ? '2d' : '3d');
  const [debugView, setDebugView] = useState(false);

  // Pre-game selection
  const [gamePhase, setGamePhase] = useState<'select' | 'playing' | 'gameover'>('select');
  const [ownedChogs, setOwnedChogs] = useState<OwnedChog[]>([]);
  const [selectedChog, setSelectedChog] = useState<OwnedChog | null>(null);
  const [loadingChogs, setLoadingChogs] = useState(false);

  // Gameplay State
  const [score, setScore] = useState(0);
  const [ballsRemaining, setBallsRemaining] = useState(3);
  const [hauntPower, setHauntPower] = useState(0); // 0..100
  const [bannerMsg, setBannerMsg] = useState('PRESS SPACE OR HOLD PLUNGER TO LAUNCH');
  const [fpsDisplay, setFpsDisplay] = useState(60);

  // DOM Refs
  const canvas2DRef = useRef<HTMLCanvasElement>(null);
  const container3DRef = useRef<HTMLDivElement>(null);

  // Engine Refs
  const physicsRef = useRef<PhysicsWorldInstance | null>(null);
  const renderer2DRef = useRef<Flat2DRenderer | null>(null);
  const renderer3DRef = useRef<Three3DRenderer | null>(null);
  const animFrameRef = useRef<number>(0);

  const visualStateRef = useRef<GameVisualState>({
    score: 0,
    ballsRemaining: 3,
    hauntPower01: 0,
    soulBallName: 'Guest Spirit',
    bumperFlash: new Map(),
    slingshotFlash: new Map(),
    ghostDamage: new Map(),
    rolloversLit: new Set(),
    plungerCharge: 0,
  });

  const controlsRef = useRef({
    leftDown: false,
    rightDown: false,
    plungerDown: false,
    plungerCharge: 0,
    physicsAccum: 0,
    lastTime: 0,
  });

  // ── Load Table Layout at Runtime ──
  useEffect(() => {
    loadTableLayout().then((loaded) => {
      setLayout(loaded);
    });
  }, []);

  // ── Load Owned Chogs ──
  useEffect(() => {
    if (!address || !isConnected) return;
    setLoadingChogs(true);
    fetch(`/api/chogs/owned-by?address=${address}`)
      .then((r) => r.json())
      .then((data) => {
        setOwnedChogs(data.chogs || []);
        if (data.chogs && data.chogs.length > 0) {
          setSelectedChog(data.chogs[0]);
        }
      })
      .catch(() => setOwnedChogs([]))
      .finally(() => setLoadingChogs(false));
  }, [address, isConnected]);

  // ── Start Game Session ──
  const startGame = useCallback((chog: OwnedChog | null) => {
    if (!layout) return;
    setSelectedChog(chog);
    setScore(0);
    setBallsRemaining(3);
    setHauntPower(0);
    setBannerMsg('PRESS SPACE OR HOLD PLUNGER TO LAUNCH');
    setGamePhase('playing');

    // Create fresh physics world from JSON
    const pWorld = createPhysicsWorld(layout);
    physicsRef.current = pWorld;

    const vs = visualStateRef.current;
    vs.score = 0;
    vs.ballsRemaining = 3;
    vs.hauntPower01 = 0;
    vs.soulBallName = chog ? chog.name : 'Guest Spirit';
    vs.soulBallImage = chog ? chog.image : undefined;
    vs.bumperFlash.clear();
    vs.slingshotFlash.clear();
    vs.ghostDamage.clear();
    vs.rolloversLit.clear();
    vs.plungerCharge = 0;

    // Contact hooks
    pWorld.onBumperHit = (id, pts) => {
      vs.score += pts;
      setScore(vs.score);
      vs.bumperFlash.set(id, Date.now() + 150);
      setHauntPower((prev) => Math.min(100, prev + 5));
      setBannerMsg(`TOMBSTONE RIP HIT! +${pts}`);
    };

    pWorld.onSlingshotHit = (id) => {
      vs.score += 50;
      setScore(vs.score);
      vs.slingshotFlash.set(id, Date.now() + 120);
      setBannerMsg('COFFIN SLINGSHOT KICK! +50');
    };

    pWorld.onGhostHit = (id) => {
      const current = vs.ghostDamage.get(id) || 0;
      vs.ghostDamage.set(id, current + 1);
      const ghostInfo = GHOST_CHOGS[id];
      const pts = 250 * (current + 1);
      vs.score += pts;
      setScore(vs.score);
      setHauntPower((prev) => Math.min(100, prev + 15));
      setBannerMsg(`GHOST CHOG HIT (${ghostInfo?.name || id})! +${pts}`);
    };

    pWorld.onDrain = () => {
      vs.ballsRemaining -= 1;
      setBallsRemaining(vs.ballsRemaining);
      if (vs.ballsRemaining <= 0) {
        setGamePhase('gameover');
        setBannerMsg('GAME OVER — ALL BALLS DRAINED');
      } else {
        setBannerMsg(`BALL LOST! ${vs.ballsRemaining} BALLS REMAIN`);
        pWorld.resetBall();
        controlsRef.current.plungerCharge = 0;
      }
    };

    pWorld.onStuckRescue = () => {
      setBannerMsg('BALL RESCUED FROM CRYPT!');
    };

    // Instantiate Renderers
    if (!renderer2DRef.current) {
      renderer2DRef.current = new Flat2DRenderer(layout);
    }
    renderer2DRef.current.setSoulBallImage(chog?.image);

    controlsRef.current.lastTime = performance.now();
    controlsRef.current.physicsAccum = 0;
  }, [layout]);

  // ── Keyboard Controls & Debug Toggle ('D') ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyD') {
        setDebugView((prev) => !prev);
        return;
      }
      if (gamePhase !== 'playing') return;

      if (e.code === 'KeyZ') controlsRef.current.leftDown = true;
      if (e.code === 'Slash' || e.code === 'ArrowRight') controlsRef.current.rightDown = true;
      if (e.code === 'Space') {
        e.preventDefault();
        controlsRef.current.plungerDown = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyZ') controlsRef.current.leftDown = false;
      if (e.code === 'Slash' || e.code === 'ArrowRight') controlsRef.current.rightDown = false;
      if (e.code === 'Space') {
        e.preventDefault();
        controlsRef.current.plungerDown = false;
        if (physicsRef.current) {
          physicsRef.current.launchPlunger(controlsRef.current.plungerCharge);
        }
        controlsRef.current.plungerCharge = 0;
        visualStateRef.current.plungerCharge = 0;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [gamePhase]);

  // ── Main Render & Physics Loop ──
  useEffect(() => {
    if (!layout || gamePhase !== 'playing') return;

    // Initialize 3D renderer if needed and mode is 3D
    if (rendererMode === '3d' && container3DRef.current && !renderer3DRef.current) {
      renderer3DRef.current = new Three3DRenderer(container3DRef.current, layout);
    }

    let running = true;

    const frameLoop = (time: number) => {
      if (!running) return;
      const ctrl = controlsRef.current;
      const physics = physicsRef.current;
      const vs = visualStateRef.current;

      const dt = Math.min((time - ctrl.lastTime) / 1000, 0.05);
      ctrl.lastTime = time;

      // Fixed 120 Hz Physics Step
      if (physics) {
        ctrl.physicsAccum += dt;
        while (ctrl.physicsAccum >= FIXED_DT) {
          // Plunger Charging
          if (ctrl.plungerDown) {
            ctrl.plungerCharge = Math.min(1.0, ctrl.plungerCharge + FIXED_DT * 1.8);
            vs.plungerCharge = ctrl.plungerCharge;
          }

          physics.setLeftFlipper(ctrl.leftDown);
          physics.setRightFlipper(ctrl.rightDown);
          physics.step();
          ctrl.physicsAccum -= FIXED_DT;
        }
      }

      // Render Stage
      if (debugView && canvas2DRef.current) {
        const ctx = canvas2DRef.current.getContext('2d');
        if (ctx && physics) {
          const ballState = physics.getBallState();
          const flipperAngles = physics.getFlipperAnglesDeg();
          renderDebugView(ctx, layout, {
            width: canvas2DRef.current.width,
            height: canvas2DRef.current.height,
            currentBall: ballState,
            leftFlipperAngleDeg: flipperAngles.left,
            rightFlipperAngleDeg: flipperAngles.right,
          });
        }
      } else if (rendererMode === '2d' && canvas2DRef.current && renderer2DRef.current && physics) {
        const ctx = canvas2DRef.current.getContext('2d');
        if (ctx) {
          renderer2DRef.current.render(ctx, physics, vs, canvas2DRef.current.width);
        }
      } else if (rendererMode === '3d' && renderer3DRef.current && physics) {
        renderer3DRef.current.render(physics, vs);
        setFpsDisplay(Math.round(renderer3DRef.current.currentFps));
      }

      animFrameRef.current = requestAnimationFrame(frameLoop);
    };

    animFrameRef.current = requestAnimationFrame(frameLoop);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
      if (renderer3DRef.current) {
        renderer3DRef.current.destroy();
        renderer3DRef.current = null;
      }
    };
  }, [layout, gamePhase, rendererMode, debugView]);

  // ── Touch Handlers ──
  const handleTouch = (action: 'left' | 'right' | 'plunger', down: boolean) => {
    if (action === 'left') controlsRef.current.leftDown = down;
    if (action === 'right') controlsRef.current.rightDown = down;
    if (action === 'plunger') {
      controlsRef.current.plungerDown = down;
      if (!down && physicsRef.current) {
        physicsRef.current.launchPlunger(controlsRef.current.plungerCharge);
        controlsRef.current.plungerCharge = 0;
        visualStateRef.current.plungerCharge = 0;
      }
    }
  };

  // ── Pre-Game Selection Screen ──
  if (gamePhase === 'select') {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-chog-purple/20 border border-chog-purple/40 text-xs font-mono text-chog-purpleSoft">
            <Sparkles className="w-3.5 h-3.5" />
            <span>CHOG SWARM • HAUNTED PINBALL</span>
          </div>
          <h1 className="font-koulen text-5xl sm:text-6xl text-white tracking-wide">
            CHOOSE YOUR SPIRIT
          </h1>
          <p className="text-chog-text text-base sm:text-lg max-w-xl mx-auto">
            Pinball haunted by real rare Chogs. Launch your own Chog as the Soul Ball or step up as a Guest Spirit.
          </p>
        </div>

        {/* Side-by-Side: Soul Ball vs Guest Spirit */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Option 1: Soul Ball */}
          <div className="bg-chog-card border-2 border-chog-purple/60 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl shadow-chog-purple/10">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-chog-purpleSoft font-bold">
                  NFT Essentiality Mode
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-chog-purple/30 text-white font-mono text-[11px]">
                  Leaderboard Eligible
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white">Soul Ball</h2>
              <p className="text-chog-text text-sm leading-relaxed">
                Your Chog’s on-chain traits shape the ball’s mass, restitution, ghost sensing, and unlocks its unique Haunt Power.
              </p>

              {!isConnected ? (
                <div className="py-4 flex flex-col items-center gap-3">
                  <p className="text-xs text-chog-muted text-center">Connect wallet on Monad to verify ownership</p>
                  <ConnectButton />
                </div>
              ) : loadingChogs ? (
                <div className="py-6 flex items-center justify-center gap-2 text-chog-muted text-sm font-mono">
                  <RefreshCw className="w-4 h-4 animate-spin text-chog-purple" />
                  <span>Loading owned Chogs from Monad...</span>
                </div>
              ) : ownedChogs.length === 0 ? (
                <div className="py-4 text-center space-y-2">
                  <p className="text-xs text-amber-300">No Chogs found in connected wallet.</p>
                  <a
                    href="https://chog.xyz"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-chog-purple underline"
                  >
                    Acquire a Chog Genesis NFT
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                    {ownedChogs.map((chog) => (
                      <button
                        key={chog.tokenId}
                        onClick={() => setSelectedChog(chog)}
                        className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                          selectedChog?.tokenId === chog.tokenId
                            ? 'border-chog-purple bg-chog-purple/20'
                            : 'border-chog-line hover:border-chog-lineBright'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={chog.image} alt={chog.name} className="w-12 h-12 rounded-lg object-cover" />
                        <span className="text-[10px] font-mono text-white truncate w-full text-center">
                          #{chog.tokenId}
                        </span>
                      </button>
                    ))}
                  </div>

                  {selectedChog && (
                    <div className="p-3 rounded-xl bg-chog-surface1 border border-chog-line flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selectedChog.image} alt={selectedChog.name} className="w-12 h-12 rounded-lg object-cover" />
                      <div>
                        <div className="text-sm font-bold text-white">{selectedChog.name}</div>
                        <div className="text-xs text-chog-purpleSoft font-mono">Soul Ball ready</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => startGame(selectedChog)}
              disabled={!selectedChog}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-chog-purple to-chog-purpleSoft hover:from-chog-purple hover:to-chog-purple text-white font-koulen text-xl tracking-wider shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              LAUNCH SOUL BALL
            </button>
          </div>

          {/* Option 2: Guest Spirit */}
          <div className="bg-chog-card border border-chog-line rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-chog-muted">
                  Baseline Mode
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-chog-muted font-mono text-[11px]">
                  Unranked
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white">Guest Spirit</h2>
              <p className="text-chog-text text-sm leading-relaxed">
                A standardized baseline spirit ball with default weight and zero traits. Play freely without connecting a wallet.
              </p>
              <div className="p-4 rounded-xl bg-chog-surface1 border border-chog-line space-y-2 text-xs text-chog-muted">
                <div className="flex justify-between">
                  <span>Traits:</span>
                  <span className="text-white font-mono">None (Baseline)</span>
                </div>
                <div className="flex justify-between">
                  <span>Haunt Power:</span>
                  <span className="text-white font-mono">Disabled</span>
                </div>
                <div className="flex justify-between">
                  <span>Leaderboard:</span>
                  <span className="text-amber-300 font-mono">Unranked</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => startGame(null)}
              className="w-full py-3.5 rounded-xl bg-chog-surface1 border border-chog-line hover:border-chog-lineBright text-white font-koulen text-xl tracking-wider transition-all"
            >
              PLAY AS GUEST SPIRIT
            </button>
          </div>
        </div>

        {/* Controls Guide */}
        <div className="bg-chog-surface1 border border-chog-line rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-chog-muted">
          <div><strong className="text-white">Z</strong> Left Flipper</div>
          <div><strong className="text-white">/ or →</strong> Right Flipper</div>
          <div><strong className="text-white">Space</strong> Hold & Release Plunger</div>
          <div><strong className="text-chog-purple">D</strong> Toggle Debug Colliders View</div>
        </div>
      </div>
    );
  }

  // ── Game Over Screen ──
  if (gamePhase === 'gameover') {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-6">
        <div className="text-6xl">👻</div>
        <h2 className="font-koulen text-5xl text-white">THE SPIRIT DRAINS</h2>
        <div className="p-6 rounded-2xl bg-chog-card border border-chog-line space-y-2">
          <div className="text-xs uppercase font-mono text-chog-muted">Final Score</div>
          <div className="font-mono text-5xl font-bold text-chog-purple">{score.toLocaleString()}</div>
        </div>
        <button
          onClick={() => setGamePhase('select')}
          className="w-full py-3.5 rounded-xl bg-chog-purple hover:bg-chog-purpleSoft text-white font-koulen text-xl tracking-wider transition-all"
        >
          PLAY AGAIN
        </button>
      </div>
    );
  }

  // ── Active Gameplay ──
  return (
    <div className="flex flex-col items-center py-2 px-2 max-w-[900px] mx-auto select-none">
      {/* HUD Header */}
      <div className="w-full bg-chog-card border border-chog-line rounded-2xl p-4 mb-3 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        {/* Active Spirit */}
        <div className="flex items-center gap-3">
          {selectedChog ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={selectedChog.image} alt={selectedChog.name} className="w-10 h-10 rounded-xl object-cover border border-chog-purple" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-chog-purple/20 border border-chog-purple/40 flex items-center justify-center text-chog-purple">
              <Zap className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="text-sm font-bold text-white">{selectedChog ? selectedChog.name : 'Guest Spirit'}</div>
            {/* Haunt Power Meter */}
            <div className="flex items-center gap-2 mt-1">
              <div className="w-24 h-2 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700">
                <div
                  className="h-full bg-gradient-to-r from-chog-purple to-pink-500 transition-all duration-200"
                  style={{ width: `${hauntPower}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-chog-purpleSoft">{hauntPower}% HAUNT</span>
            </div>
          </div>
        </div>

        {/* Large Score at Top Center */}
        <div className="text-center">
          <div className="text-[10px] uppercase font-mono text-chog-muted tracking-widest">Score</div>
          <div className="font-mono text-3xl sm:text-4xl font-extrabold text-white tracking-wider">
            {score.toLocaleString()}
          </div>
        </div>

        {/* Balls & Renderer Toggles */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono text-chog-muted">Balls</div>
            <div className="flex gap-1.5 mt-1 justify-end">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full border ${
                    i < ballsRemaining ? 'bg-chog-purple border-chog-purpleSoft shadow-sm shadow-chog-purple' : 'bg-zinc-800 border-zinc-700'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <button
              onClick={() => setRendererMode((prev) => (prev === '3d' ? '2d' : '3d'))}
              className="px-2.5 py-1 rounded-lg bg-chog-surface1 border border-chog-line text-[11px] font-mono text-chog-muted hover:text-white"
            >
              Mode: {rendererMode.toUpperCase()}
            </button>
            <button
              onClick={() => setDebugView((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1 ${
                debugView ? 'bg-chog-purple border-chog-purple text-white' : 'bg-chog-surface1 border-chog-line text-chog-muted'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Debug (D)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Banner Area for Event Callouts */}
      <div className="w-full bg-gradient-to-r from-chog-purple/20 via-chog-surface1 to-chog-purple/20 border border-chog-purple/40 rounded-xl px-4 py-2 text-center text-xs font-mono text-chog-purpleSoft tracking-wide mb-3 animate-pulse">
        {bannerMsg}
      </div>

      {/* Canvas Viewport (Portrait 400x720 / 600x1080) */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-chog-purple/40 shadow-2xl shadow-chog-purple/20 bg-black">
        {/* 3D WebGL2 Canvas Container */}
        <div
          ref={container3DRef}
          className={`w-[400px] sm:w-[480px] md:w-[540px] h-[720px] sm:h-[860px] md:h-[970px] ${
            rendererMode === '3d' && !debugView ? 'block' : 'hidden'
          }`}
        />

        {/* 2D Flat / Debug Canvas */}
        <canvas
          ref={canvas2DRef}
          width={540}
          height={970}
          className={`w-[400px] sm:w-[480px] md:w-[540px] h-[720px] sm:h-[860px] md:h-[970px] ${
            rendererMode === '2d' || debugView ? 'block' : 'hidden'
          }`}
        />

        {/* Full-Screen Touch Zones for Flippers */}
        <div className="absolute inset-0 flex pointer-events-auto" style={{ bottom: '80px' }}>
          <div
            className="flex-1 h-full cursor-pointer active:bg-white/5 transition-colors"
            onPointerDown={() => handleTouch('left', true)}
            onPointerUp={() => handleTouch('left', false)}
            onPointerLeave={() => handleTouch('left', false)}
          />
          <div
            className="flex-1 h-full cursor-pointer active:bg-white/5 transition-colors"
            onPointerDown={() => handleTouch('right', true)}
            onPointerUp={() => handleTouch('right', false)}
            onPointerLeave={() => handleTouch('right', false)}
          />
        </div>

        {/* Touch Plunger Bar */}
        <div className="absolute bottom-3 right-3 left-3 flex gap-3">
          <button
            onPointerDown={() => handleTouch('plunger', true)}
            onPointerUp={() => handleTouch('plunger', false)}
            onPointerLeave={() => handleTouch('plunger', false)}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 active:from-amber-500 active:to-amber-600 text-white font-koulen text-lg tracking-wider shadow-lg shadow-amber-900/40 cursor-pointer select-none"
          >
            HOLD TO CHARGE PLUNGER · RELEASE TO LAUNCH
          </button>
        </div>
      </div>

      <div className="flex justify-between w-full max-w-[540px] text-[11px] font-mono text-chog-muted mt-2">
        <span>Controls: Z (Left) · / (Right) · Space (Plunger) · D (Debug Colliders)</span>
        {rendererMode === '3d' && !debugView && <span>FPS: {fpsDisplay}</span>}
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-chog-purple font-mono">
          Loading Chog Swarm: Haunted Pinball...
        </div>
      }
    >
      <PlayPageContent />
    </React.Suspense>
  );
}
