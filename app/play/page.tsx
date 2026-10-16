'use client';

/**
 * /play — Chog Swarm: Haunted Pinball (Gate 2)
 *
 * Built strictly from /docs/pinball/table-layout.json. Zero hardcoded dimensions.
 *
 * Gate 2 Features:
 * - Rollover lanes spelling C-H-O-G (completing them raises the multiplier 1x -> 2x -> 3x -> 5x)
 * - 4 Ghost targets: 3 hits banishes a ghost for big points, added to Haunted Hall codex.
 *   Live ownerOf verification triggers REUNION (friendly ghost, 10s power, 2x points).
 * - Crypt portal into short bonus lane (hold & eject toward pop bumpers).
 * - Multiball lock: 3 souls locked in crypt portal activates 3-ball Multiball chaos!
 * - 3 balls per game cycle with Game Over screen and Haunted Hall codex links.
 * - Dot-Matrix Display (DMD): Amber phosphor LED arcade screen with scanlines, live multiplier & score.
 * - Zero-latency Web Audio sound effects for all pinball components with mute control.
 */

import React, { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Sparkles, Shield, Zap, RefreshCw, Eye, Ghost, Award, Play, Flame, Trophy } from 'lucide-react';

import { TableLayout } from '@/packages/physics/src/types';
import { loadTableLayout } from '@/packages/physics/src/layout-loader';
import { createPhysicsWorld, PhysicsWorldInstance, FIXED_DT } from '@/packages/physics/src/physics-world';
import { renderDebugView } from '@/packages/physics/src/debug-renderer';
import { Flat2DRenderer, GameVisualState, GHOST_CHOGS } from '@/packages/physics/src/flat-2d-renderer';
import { Three3DRenderer } from '@/packages/physics/src/three-3d-renderer';
import { DMDDisplay } from '@/components/dmd-display';
import { sound } from '@/lib/audio';
import { verifyChogOwnershipOnChain } from '@/lib/monad-chain';

interface OwnedChog {
  tokenId: number;
  name: string;
  image: string;
  attributes: { trait_type: string; value: string }[];
}

function PlayPageContent() {
  const searchParams = useSearchParams();
  const force3D = searchParams.get('renderer') === '3d';
  const { address, isConnected } = useAccount();

  // Layout & Config
  const [layout, setLayout] = useState<TableLayout | null>(null);
  const [rendererMode, setRendererMode] = useState<'3d' | '2d'>(force3D ? '3d' : '2d');
  const [debugView, setDebugView] = useState(false);

  // Pre-game selection
  const [gamePhase, setGamePhase] = useState<'select' | 'playing' | 'gameover'>('select');
  const [ownedChogs, setOwnedChogs] = useState<OwnedChog[]>([]);
  const [selectedChog, setSelectedChog] = useState<OwnedChog | null>(null);
  const [loadingChogs, setLoadingChogs] = useState(false);

  // Gameplay State
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [ballsRemaining, setBallsRemaining] = useState(3);
  const [activeBallCount, setActiveBallCount] = useState(1);
  const [hauntPower, setHauntPower] = useState(0); // 0..100
  const [dmdMsg, setDmdMsg] = useState('PULL PLUNGER TO LAUNCH (SPACE OR DRAG)');
  const [rolloversLit, setRolloversLit] = useState<Set<string>>(new Set());
  const [lockCount, setLockCount] = useState(0);
  const [multiballActive, setMultiballActive] = useState(false);
  const [reunionActive, setReunionActive] = useState(false);
  const [reunionGhostId, setReunionGhostId] = useState<string | undefined>(undefined);
  const [banishedGhosts, setBanishedGhosts] = useState<Set<string>>(new Set());
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
    multiplier: 1,
    ballsRemaining: 3,
    activeBallCount: 1,
    hauntPower01: 0,
    soulBallName: 'Guest Spirit',
    bumperFlash: new Map(),
    slingshotFlash: new Map(),
    ghostDamage: new Map(),
    banishedGhosts: new Set(),
    reunionActive: false,
    multiballActive: false,
    cryptHeld: false,
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

  // ── Start Game Session ──
  const startGame = useCallback((chog: OwnedChog | null, customLayout?: TableLayout) => {
    const activeLayout = customLayout || layout;
    if (!activeLayout) return;
    setSelectedChog(chog);
    setScore(0);
    setMultiplier(1);
    setBallsRemaining(3);
    setActiveBallCount(1);
    setHauntPower(0);
    setLockCount(0);
    setMultiballActive(false);
    setReunionActive(false);
    setReunionGhostId(undefined);
    setBanishedGhosts(new Set());
    setRolloversLit(new Set());
    setDmdMsg('PULL PLUNGER TO LAUNCH (SPACE OR DRAG)');
    setGamePhase('playing');

    sound.startAmbient();

    // Create fresh physics world from JSON
    const pWorld = createPhysicsWorld(activeLayout);
    physicsRef.current = pWorld;

    if (typeof window !== 'undefined') {
      (window as any).__pinballPhysics = pWorld;
      (window as any).__pinballLayout = activeLayout;
      (window as any).__pinballCanvas = canvas2DRef.current;
      (window as any).__pinballControls = controlsRef.current;
    }

    const vs = visualStateRef.current;
    vs.score = 0;
    vs.multiplier = 1;
    vs.ballsRemaining = 3;
    vs.activeBallCount = 1;
    vs.hauntPower01 = 0;
    vs.soulBallName = chog ? chog.name : 'Guest Spirit';
    vs.soulBallImage = chog ? chog.image : undefined;
    vs.bumperFlash.clear();
    vs.slingshotFlash.clear();
    vs.ghostDamage.clear();
    vs.banishedGhosts.clear();
    vs.rolloversLit.clear();
    vs.reunionActive = false;
    vs.reunionGhostId = undefined;
    vs.multiballActive = false;
    vs.cryptHeld = false;
    vs.plungerCharge = 0;

    // ── 1. Pop Bumper Hit ──
    pWorld.onBumperHit = (id, pts) => {
      sound.playBumper();
      const mult = vs.multiplier * (vs.reunionActive ? 2 : 1) * (vs.multiballActive ? 3 : 1);
      const earned = pts * mult;
      vs.score += earned;
      setScore(vs.score);
      vs.bumperFlash.set(id, Date.now() + 150);
      setHauntPower((prev) => Math.min(100, prev + 5));
      setDmdMsg(`TOMBSTONE RIP HIT! +${earned}`);
    };

    // ── 2. Slingshot Hit ──
    pWorld.onSlingshotHit = (id) => {
      sound.playSlingshot();
      const mult = vs.multiplier * (vs.reunionActive ? 2 : 1);
      const earned = 50 * mult;
      vs.score += earned;
      setScore(vs.score);
      vs.slingshotFlash.set(id, Date.now() + 120);
      setDmdMsg(`COFFIN SLINGSHOT KICK! +${earned}`);
    };

    // ── 3. Rollover Lane Hit (C-H-O-G) ──
    pWorld.onRolloverHit = (letter) => {
      if (!vs.rolloversLit.has(letter)) {
        sound.playRollover(letter);
        vs.rolloversLit.add(letter);
        setRolloversLit(new Set(vs.rolloversLit));

        const earned = 200 * vs.multiplier;
        vs.score += earned;
        setScore(vs.score);

        // Check if all 4 letters are lit
        if (vs.rolloversLit.size === 4) {
          sound.playChogCompleted();
          const nextMult = vs.multiplier === 1 ? 2 : vs.multiplier === 2 ? 3 : 5;
          vs.multiplier = nextMult;
          setMultiplier(nextMult);

          const bonus = 3000 * nextMult;
          vs.score += bonus;
          setScore(vs.score);
          vs.rolloversLit.clear();
          setRolloversLit(new Set());

          setDmdMsg(`★ C-H-O-G COMPLETE! MULTIPLIER NOW ${nextMult}X (+${bonus}) ★`);
        } else {
          setDmdMsg(`LANE [${letter}] LIT! +${earned}`);
        }
      }
    };

    // ── 4. Crypt Portal (Hold & Eject) ──
    pWorld.onCryptEnter = () => {
      sound.playCryptPortal();
      vs.cryptHeld = true;

      const earned = 500 * vs.multiplier * (vs.reunionActive ? 2 : 1);
      vs.score += earned;
      setScore(vs.score);

      setLockCount((prevLock) => {
        const nextLock = prevLock + 1;
        if (nextLock >= 3) {
          // Multiball Trigger!
          sound.playMultiballAlarm();
          vs.multiballActive = true;
          setMultiballActive(true);

          // Spawn 2 extra balls
          pWorld.spawnBall(layout.cryptPortal.x - 0.05, layout.cryptPortal.y + 0.05, -0.3, 2.6);
          pWorld.spawnBall(layout.cryptPortal.x + 0.05, layout.cryptPortal.y + 0.05, 0.3, 2.6);
          setActiveBallCount(3);
          vs.activeBallCount = 3;

          setDmdMsg(`🔥🔥 MULTIBALL ACTIVATED! 3-BALL CHAOS TRIPLES JACKPOT 🔥🔥`);
          return 0;
        } else {
          setDmdMsg(`★ SOUL CAPTURED! LOCK ${nextLock}/3 (+${earned}) ★`);
          return nextLock;
        }
      });
    };

    pWorld.onCryptEject = () => {
      vs.cryptHeld = false;
    };

    // ── 5. Ghost Target Hit & Reunion Check ──
    pWorld.onGhostHit = async (gid) => {
      const ghostInfo = GHOST_CHOGS[gid];
      if (!ghostInfo) return;

      // Check on-chain Reunion if wallet connected
      let isOwner = false;
      if (address) {
        try {
          const res = await verifyChogOwnershipOnChain(address, ghostInfo.id);
          isOwner = res.verified;
        } catch (_) {
          isOwner = false;
        }
      }

      if (isOwner && !vs.reunionActive) {
        // Trigger Reunion!
        sound.playReunion();
        vs.reunionActive = true;
        vs.reunionGhostId = gid;
        setReunionActive(true);
        setReunionGhostId(gid);
        setDmdMsg(`❤️ REUNION! ${ghostInfo.name} RECOGNIZED MASTER! 2X SCORE FOR 10S ❤️`);

        // Record in codex
        fetch('/api/haunted-hall', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, ghostId: gid, action: 'reunion' }),
        }).catch(() => {});

        setTimeout(() => {
          vs.reunionActive = false;
          vs.reunionGhostId = undefined;
          setReunionActive(false);
          setReunionGhostId(undefined);
          setDmdMsg('REUNION EXPIRED — MULTIPLIER NORMALIZED');
        }, 10000);
      } else {
        // Standard Ghost Hit
        const currentHits = vs.ghostDamage.get(gid) || 0;
        const newHits = currentHits + 1;
        vs.ghostDamage.set(gid, newHits);
        sound.playGhostHit(newHits);

        const mult = vs.multiplier * (vs.reunionActive ? 2 : 1) * (vs.multiballActive ? 3 : 1);
        const earned = 350 * newHits * mult;
        vs.score += earned;
        setScore(vs.score);
        setHauntPower((prev) => Math.min(100, prev + 15));

        if (newHits >= 3 && !vs.banishedGhosts.has(gid)) {
          // Banish Ghost!
          sound.playGhostBanished();
          vs.banishedGhosts.add(gid);
          setBanishedGhosts(new Set(vs.banishedGhosts));

          const banishBonus = 5000 * mult;
          vs.score += banishBonus;
          setScore(vs.score);
          setDmdMsg(`👻 GHOST BANISHED! SEALED IN HAUNTED HALL (+${banishBonus}) 👻`);

          // Record in codex
          fetch('/api/haunted-hall', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, ghostId: gid, action: 'banish', score: vs.score }),
          }).catch(() => {});
        } else {
          setDmdMsg(`GHOST HIT (${ghostInfo.name}) ${newHits}/3! +${earned}`);
        }
      }
    };

    // ── 6. Multiball Extra Ball Drain ──
    pWorld.onExtraBallDrain = (remaining) => {
      setActiveBallCount(remaining);
      vs.activeBallCount = remaining;
      if (remaining === 1) {
        vs.multiballActive = false;
        setMultiballActive(false);
        setDmdMsg('MULTIBALL ENDED — 1 BALL IN PLAY');
      } else {
        setDmdMsg(`MULTIBALL: ${remaining} BALLS IN PLAY`);
      }
    };

    // ── 7. Primary Ball Drain ──
    pWorld.onDrain = () => {
      sound.playDrain();
      vs.ballsRemaining -= 1;
      setBallsRemaining(vs.ballsRemaining);
      if (vs.ballsRemaining <= 0) {
        setGamePhase('gameover');
        sound.stopAmbient();
        setDmdMsg('GAME OVER — ALL BALLS DRAINED');
      } else {
        setDmdMsg(`BALL LOST! BALL ${4 - vs.ballsRemaining} OF 3 — PULL PLUNGER`);
        pWorld.resetBall();
        controlsRef.current.plungerCharge = 0;
      }
    };

    pWorld.onStuckRescue = () => {
      setDmdMsg('BALL RESCUED FROM CRYPT!');
    };

    // Instantiate Renderers
    if (!renderer2DRef.current) {
      renderer2DRef.current = new Flat2DRenderer(activeLayout);
    }
    renderer2DRef.current.setSoulBallImage(chog?.image);
    (window as any).__pinballRenderer2D = renderer2DRef.current;
    (window as any).__pinballVisualState = vs;

    controlsRef.current.lastTime = performance.now();
    controlsRef.current.physicsAccum = 0;
  }, [layout, address]);

  const autoplayTriggeredRef = useRef(false);

  // ── Load Table Layout at Runtime ──
  useEffect(() => {
    loadTableLayout().then((loaded) => {
      setLayout(loaded);
      if (searchParams.get('autoplay') === '1' && !autoplayTriggeredRef.current) {
        autoplayTriggeredRef.current = true;
        startGame(null, loaded);
      }
    });
  }, []); // Run ONCE on mount

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

  // ── Keyboard Controls & Debug Toggle ('D') ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyD') {
        setDebugView((prev) => !prev);
        return;
      }
      if (gamePhase !== 'playing') return;

      if (e.code === 'KeyZ') {
        controlsRef.current.leftDown = true;
        sound.playFlipper(true);
      }
      if (e.code === 'Slash' || e.code === 'ArrowRight') {
        controlsRef.current.rightDown = true;
        sound.playFlipper(true);
      }
      if (e.code === 'Space') {
        e.preventDefault();
        controlsRef.current.plungerDown = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyZ') {
        controlsRef.current.leftDown = false;
        sound.playFlipper(false);
      }
      if (e.code === 'Slash' || e.code === 'ArrowRight') {
        controlsRef.current.rightDown = false;
        sound.playFlipper(false);
      }
      if (e.code === 'Space') {
        e.preventDefault();
        controlsRef.current.plungerDown = false;
        if (physicsRef.current) {
          physicsRef.current.launchPlunger(controlsRef.current.plungerCharge);
          sound.playPlungerLaunch(controlsRef.current.plungerCharge);
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

    if (rendererMode === '3d' && container3DRef.current && !renderer3DRef.current) {
      renderer3DRef.current = new Three3DRenderer(container3DRef.current, layout);
    }

    let running = true;

    const frameLoop = (time: number) => {
      if (!running) return;
      const ctrl = controlsRef.current;
      const physics = physicsRef.current;
      const vs = visualStateRef.current;

      const dt = ctrl.lastTime === 0 ? FIXED_DT : Math.max(0, Math.min((time - ctrl.lastTime) / 1000, 0.05));
      ctrl.lastTime = time;

      // Fixed 120 Hz Physics Step
      if (physics) {
        physics.setLeftFlipper(ctrl.leftDown);
        physics.setRightFlipper(ctrl.rightDown);

        ctrl.physicsAccum += dt;
        while (ctrl.physicsAccum >= FIXED_DT) {
          if (ctrl.plungerDown) {
            ctrl.plungerCharge = Math.min(1.0, ctrl.plungerCharge + FIXED_DT * 1.8);
            vs.plungerCharge = ctrl.plungerCharge;
          }

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
    if (action === 'left') {
      controlsRef.current.leftDown = down;
      sound.playFlipper(down);
    }
    if (action === 'right') {
      controlsRef.current.rightDown = down;
      sound.playFlipper(down);
    }
    if (action === 'plunger') {
      controlsRef.current.plungerDown = down;
      if (!down && physicsRef.current) {
        physicsRef.current.launchPlunger(controlsRef.current.plungerCharge);
        sound.playPlungerLaunch(controlsRef.current.plungerCharge);
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
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                  Leaderboard Eligible
                </span>
              </div>
              <h2 className="font-koulen text-3xl text-white tracking-wide">
                SOUL BALL (OWNED CHOG)
              </h2>
              <p className="text-sm text-chog-muted">
                Your Chog's real on-chain traits govern ball mass, bounce restitution, ghost sense attraction, and Haunt Powers. Unlocks Reunion with your owned ghosts!
              </p>

              {/* Wallet Chog Picker */}
              <div className="pt-2">
                {!isConnected ? (
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-center space-y-3">
                    <p className="text-xs font-mono text-zinc-400">
                      Connect your Monad wallet to load your owned Chogs:
                    </p>
                    <div className="flex justify-center">
                      <ConnectButton />
                    </div>
                  </div>
                ) : loadingChogs ? (
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-center flex items-center justify-center gap-2 text-xs font-mono text-zinc-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Querying verified owner snapshot...</span>
                  </div>
                ) : ownedChogs.length === 0 ? (
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-center space-y-2">
                    <p className="text-xs font-mono text-amber-400">
                      No Chogs detected in this wallet.
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Play with Guest Spirit below, or acquire a Chog on Monad to unlock Soul Ball physics.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-zinc-400">
                      Select Soul Ball ({ownedChogs.length} Owned):
                    </label>
                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                      {ownedChogs.map((c) => (
                        <button
                          key={c.tokenId}
                          onClick={() => setSelectedChog(c)}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            selectedChog?.tokenId === c.tokenId
                              ? 'border-chog-purple bg-chog-purple/20'
                              : 'border-white/10 bg-black/30 hover:border-white/30'
                          }`}
                        >
                          <img
                            src={c.image}
                            alt={c.name}
                            className="w-12 h-12 mx-auto rounded-lg object-cover mb-1"
                          />
                          <span className="text-[10px] font-mono block text-white truncate">
                            #{c.tokenId}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => startGame(selectedChog)}
              disabled={!selectedChog}
              className="w-full py-3.5 rounded-xl bg-chog-purple hover:bg-chog-purple/80 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono font-bold text-sm tracking-wider uppercase transition-all shadow-lg shadow-chog-purple/20 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Launch with {selectedChog ? selectedChog.name : 'Soul Ball'}</span>
            </button>
          </div>

          {/* Option 2: Guest Spirit */}
          <div className="bg-chog-card border border-white/10 rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
                  Practice / Demo Mode
                </span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-mono">
                  Unranked Baseline
                </span>
              </div>
              <h2 className="font-koulen text-3xl text-zinc-300 tracking-wide">
                GUEST SPIRIT (NO NFT)
              </h2>
              <p className="text-sm text-chog-muted">
                The baseline calibration ball. Standard neutral mass, standard bounce, no Haunt Power, and unranked gameplay. Compare side-by-side with Soul Ball physics.
              </p>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1 text-xs font-mono text-zinc-400">
                <p>• Ball Mass: 1.0 (neutral baseline)</p>
                <p>• Restitution: 0.35 (standard steel)</p>
                <p>• Ghost Sense: Off</p>
                <p>• Leaderboard: Practice only</p>
              </div>
            </div>

            <button
              onClick={() => startGame(null)}
              className="w-full py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-mono font-bold text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play as Guest Spirit</span>
            </button>
          </div>
        </div>

        {/* Instructions banner */}
        <div className="bg-black/30 border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between text-xs font-mono text-zinc-400 gap-4">
          <div className="flex items-center gap-4">
            <span><strong className="text-white">Z</strong> Left Flipper</span>
            <span><strong className="text-white">/ or →</strong> Right Flipper</span>
            <span><strong className="text-white">SPACE</strong> Hold & Release Plunger</span>
            <span><strong className="text-white">D</strong> Toggle Blueprint Debug</span>
          </div>
          <Link
            href="/haunted-hall"
            className="text-chog-purpleSoft hover:text-white underline transition-colors"
          >
            View Haunted Hall Codex ↗
          </Link>
        </div>
      </div>
    );
  }

  // ── Game Over Screen ──
  if (gamePhase === 'gameover') {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 space-y-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-xs font-mono text-red-400">
          <Ghost className="w-4 h-4" />
          <span>ALL BALLS DRAINED</span>
        </div>
        <h1 className="font-koulen text-6xl text-white tracking-wide">
          GAME OVER
        </h1>

        <div className="bg-chog-card border-2 border-chog-purple/40 rounded-2xl p-6 space-y-6 shadow-2xl">
          <div className="space-y-1">
            <span className="text-xs font-mono text-chog-muted uppercase tracking-wider block">
              FINAL SCORE
            </span>
            <span className="font-mono text-5xl font-black text-[#ff9900] drop-shadow-[0_0_12px_rgba(255,153,0,0.8)]">
              {score.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 border-y border-white/10 py-4 text-center">
            <div>
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">
                MAX MULTIPLIER
              </span>
              <span className="font-mono text-xl font-bold text-amber-400">
                {multiplier}X
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">
                GHOSTS BANISHED
              </span>
              <span className="font-mono text-xl font-bold text-purple-400">
                {banishedGhosts.size} / 4
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">
                SOUL BALL
              </span>
              <span className="font-mono text-sm font-bold text-zinc-200 truncate block">
                {selectedChog ? `#${selectedChog.tokenId}` : 'Guest'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => startGame(selectedChog)}
              className="w-full py-3.5 rounded-xl bg-chog-purple hover:bg-chog-purple/80 text-white font-mono font-bold text-sm tracking-wider uppercase transition-all shadow-xl shadow-chog-purple/20 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>PLAY AGAIN</span>
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setGamePhase('select')}
                className="py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs transition-colors"
              >
                Change Soul Ball
              </button>
              <Link
                href="/haunted-hall"
                className="py-2.5 rounded-xl bg-black/60 border border-white/10 hover:border-chog-purple text-zinc-300 font-mono text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Award className="w-3.5 h-3.5 text-chog-purpleSoft" />
                <span>Haunted Hall</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Active Gameplay Screen ──
  return (
    <div id="play-container" className="fixed inset-x-0 bottom-0 top-[65px] z-30 bg-[#0a0714] overflow-hidden flex flex-col lg:flex-row items-center justify-center p-1 sm:p-2 lg:p-3 gap-2 sm:gap-4">
      {/* ── Left Side Panel (Desktop only) ── */}
      <div className="hidden lg:flex flex-col justify-between w-[360px] xl:w-[400px] h-full max-h-[820px] shrink-0 gap-3">
        {/* DMD Arcade Display */}
        <DMDDisplay
          score={score}
          multiplier={multiplier}
          ballsRemaining={ballsRemaining}
          activeBallCount={activeBallCount}
          message={dmdMsg}
          reunionActive={reunionActive}
          multiballActive={multiballActive}
          rolloversLit={rolloversLit}
        />

        {/* Soul Ball Status Card */}
        <div className="bg-chog-card rounded-xl border border-white/10 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">ACTIVE SOUL BALL</span>
            <span className="px-2 py-0.5 rounded bg-chog-purple/20 text-chog-purpleSoft text-[10px]">
              {selectedChog ? 'VERIFIED NFT' : 'GUEST SPIRIT'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-black/50 border border-chog-purple/40 overflow-hidden relative shrink-0">
              {selectedChog?.image ? (
                <img
                  src={selectedChog.image}
                  alt={selectedChog.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 font-mono text-xs">
                  GUEST
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-koulen text-lg text-white truncate">
                {selectedChog ? selectedChog.name : 'Guest Spirit'}
              </h3>
              <p className="text-[11px] font-mono text-zinc-400 truncate">
                {selectedChog ? `Token #${selectedChog.tokenId}` : 'Practice Baseline Mode'}
              </p>
            </div>
          </div>
          {/* Haunt Power Bar */}
          <div className="space-y-1 pt-1 border-t border-white/5">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-zinc-500">HAUNT POWER</span>
              <span className="text-amber-400 font-bold">{hauntPower}%</span>
            </div>
            <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${hauntPower}%` }}
              />
            </div>
          </div>
        </div>

        {/* Desktop Controls Cheat Sheet */}
        <div className="bg-black/40 rounded-xl border border-white/10 p-3 space-y-1.5 text-xs font-mono text-zinc-400">
          <div className="flex justify-between items-center py-0.5">
            <span>Left Flipper</span>
            <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-white font-bold text-[11px]">Z</kbd>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span>Right Flipper</span>
            <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-white font-bold text-[11px]">/ or →</kbd>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span>Plunger Launch</span>
            <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-white font-bold text-[11px]">SPACE (Hold)</kbd>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span>Blueprint Debug</span>
            <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-white font-bold text-[11px]">D</kbd>
          </div>
        </div>

        {/* Renderer Mode & FPS & Codex Shortcut */}
        <div className="flex items-center justify-between text-xs font-mono bg-chog-card px-3 py-2 rounded-xl border border-white/10">
          <span className="text-zinc-500">{fpsDisplay} FPS</span>
          <button
            onClick={() => setRendererMode((prev) => (prev === '3d' ? '2d' : '3d'))}
            className="px-2.5 py-1 rounded bg-[#1e1330] border border-chog-purple/40 text-chog-purpleSoft hover:text-white transition-colors"
          >
            {rendererMode === '3d' ? '3D WebGL2' : '2D Canvas'}
          </button>
          <Link
            href="/haunted-hall"
            className="text-chog-purpleSoft hover:text-white underline text-[11px]"
          >
            Haunted Hall ↗
          </Link>
        </div>
      </div>

      {/* ── Mobile Top Strip (Mobile only) ── */}
      <div className="lg:hidden w-full shrink-0 max-w-[420px]">
        <DMDDisplay
          score={score}
          multiplier={multiplier}
          ballsRemaining={ballsRemaining}
          activeBallCount={activeBallCount}
          message={dmdMsg}
          reunionActive={reunionActive}
          multiballActive={multiballActive}
          rolloversLit={rolloversLit}
        />
      </div>

      {/* ── Main Table Playfield Container ── */}
      <div className="relative h-full max-h-[820px] aspect-[1/2] rounded-2xl overflow-hidden bg-black border-2 border-chog-purple/50 shadow-2xl shadow-purple-950/40 shrink-0 flex items-center justify-center">
        {/* 3D WebGL2 Container */}
        {rendererMode === '3d' && !debugView && (
          <div ref={container3DRef} className="w-full h-full" />
        )}

        {/* 2D Canvas Container (or Debug View) */}
        {(rendererMode === '2d' || debugView) && (
          <canvas
            ref={canvas2DRef}
            width={700}
            height={1400}
            className="w-full h-full object-contain"
          />
        )}

        {/* Mobile / Pointer Touch Overlay Controls */}
        <div className="absolute inset-0 flex pointer-events-auto">
          {/* Left Flipper Half */}
          <div
            className="w-5/12 h-full opacity-0 active:opacity-15 bg-purple-500/20 transition-opacity cursor-pointer"
            onPointerDown={() => handleTouch('left', true)}
            onPointerUp={() => handleTouch('left', false)}
            onPointerLeave={() => handleTouch('left', false)}
          />
          {/* Plunger Strip */}
          <div
            className="w-2/12 h-full opacity-0 active:opacity-25 bg-amber-500/30 transition-opacity cursor-pointer"
            onPointerDown={() => handleTouch('plunger', true)}
            onPointerUp={() => handleTouch('plunger', false)}
            onPointerLeave={() => handleTouch('plunger', false)}
          />
          {/* Right Flipper Half */}
          <div
            className="w-5/12 h-full opacity-0 active:opacity-15 bg-purple-500/20 transition-opacity cursor-pointer"
            onPointerDown={() => handleTouch('right', true)}
            onPointerUp={() => handleTouch('right', false)}
            onPointerLeave={() => handleTouch('right', false)}
          />
        </div>
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 font-mono text-zinc-500">Loading Pinball...</div>}>
      <PlayPageContent />
    </Suspense>
  );
}
