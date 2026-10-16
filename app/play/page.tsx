'use client';

/**
 * /play — Gate 1 Pinball prototype.
 *
 * Phase 1 checklist (Gate 1):
 * ✓ Soul Ball selection: pick owned Chog before game (or Guest Spirit)
 * ✓ Ball drops, physics runs at 120 Hz fixed timestep
 * ✓ Left / right flippers respond (Z / / keys; touch left/right halves)
 * ✓ Plunger charges on Space / drag, releases on release
 * ✓ 3 tombstone bumpers fire on contact with glow flash
 * ✓ Score HUD with 3-ball dots
 * ✓ Ball drain → next ball → game over
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// Physics is imported dynamically on the client only
let physicsModule: typeof import('@/packages/physics/src/table') | null = null;
let rendererModule: typeof import('@/packages/physics/src/renderer') | null = null;

const TOTAL_BALLS = 3;

interface OwnedChog {
  tokenId: number;
  name: string;
  image: string;
  attributes: { trait_type: string; value: string }[];
}

// ── helpers ───────────────────────────────────────────────────────────────────

function getTraitValue(attrs: OwnedChog['attributes'], traitType: string): string {
  return attrs.find((a) => a.trait_type.toLowerCase() === traitType.toLowerCase())?.value ?? '';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlayPage() {
  const { address, isConnected } = useAccount();

  // Soul-ball selection
  const [ownedChogs, setOwnedChogs] = useState<OwnedChog[]>([]);
  const [selectedChog, setSelectedChog] = useState<OwnedChog | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loadingChogs, setLoadingChogs] = useState(false);

  // Game state
  const [gamePhase, setGamePhase] = useState<'select' | 'playing' | 'gameover'>('select');
  const [score, setScore] = useState(0);
  const [ballsLeft, setBallsLeft] = useState(TOTAL_BALLS);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    table: Awaited<ReturnType<typeof import('@/packages/physics/src/table').createPinballTable>> | null;
    animFrame: number;
    score: number;
    balls: number;
    bumperFlash: Map<object, number>;
    plungerCharge: number;
    plungerDown: boolean;
    leftActive: boolean;
    rightActive: boolean;
    ballImg: HTMLImageElement | null;
    physicsStepAccum: number;
    lastTime: number;
  }>({
    table: null,
    animFrame: 0,
    score: 0,
    balls: TOTAL_BALLS,
    bumperFlash: new Map(),
    plungerCharge: 0,
    plungerDown: false,
    leftActive: false,
    rightActive: false,
    ballImg: null,
    physicsStepAccum: 0,
    lastTime: 0,
  });

  // ── Load owned Chogs from server snapshot ──────────────────────────────────
  useEffect(() => {
    if (!address || !isConnected) return;
    setLoadingChogs(true);
    fetch(`/api/chogs/owned-by?address=${address}`)
      .then((r) => r.json())
      .then((data) => {
        setOwnedChogs(data.chogs ?? []);
      })
      .catch(() => setOwnedChogs([]))
      .finally(() => setLoadingChogs(false));
  }, [address, isConnected]);

  // ── Start game ─────────────────────────────────────────────────────────────
  const startGame = useCallback(async (chog: OwnedChog | null, guest: boolean) => {
    setSelectedChog(chog);
    setIsGuest(guest);
    setScore(0);
    setBallsLeft(TOTAL_BALLS);
    setGamePhase('playing');

    // Dynamically import physics (client only)
    if (!physicsModule) {
      physicsModule = await import('@/packages/physics/src/table');
      rendererModule = await import('@/packages/physics/src/renderer');
    }

    const { createPinballTable, GUEST_BALL, traitsToBallPreset, activateFlipper, stepWorld, isBallDrained, releasePlunger, chargePlunger } = physicsModule;

    // Build ball preset from traits
    let preset = GUEST_BALL;
    if (chog) {
      preset = traitsToBallPreset({
        body: getTraitValue(chog.attributes, 'Body'),
        eyes: getTraitValue(chog.attributes, 'Eyes'),
        mouth: getTraitValue(chog.attributes, 'Mouth'),
        aura: getTraitValue(chog.attributes, 'Aura'),
        head: getTraitValue(chog.attributes, 'Head'),
        tier: getTraitValue(chog.attributes, 'Tier'),
      });
    }

    const table = createPinballTable(preset);
    const g = gameRef.current;
    g.table = table;
    g.score = 0;
    g.balls = TOTAL_BALLS;
    g.bumperFlash = new Map();
    g.plungerCharge = 0;
    g.plungerDown = false;
    g.leftActive = false;
    g.rightActive = false;
    g.physicsStepAccum = 0;
    g.lastTime = performance.now();

    // Preload Chog art as ball image
    if (chog) {
      const img = new Image();
      img.src = chog.image;
      img.onload = () => { g.ballImg = img; };
    } else {
      g.ballImg = null;
    }

    // Collision: score on bumper hit
    table.world.on('begin-contact', (contact) => {
      const fA = contact.getFixtureA();
      const fB = contact.getFixtureB();
      const bA = fA.getBody();
      const bB = fB.getBody();

      const isBumperContact = (b: any) =>
        b.userData?.type === 'bumper' || b.userData?.type === 'slingshot';

      const hitBumper = isBumperContact(bA) ? bA : isBumperContact(bB) ? bB : null;
      if (hitBumper) {
        const pts = (hitBumper as any).userData?.type === 'bumper' ? 100 : 50;
        g.score += pts;
        setScore(g.score);
        g.bumperFlash.set(hitBumper, Date.now() + 120);
      }
    });

    // ── Render loop ───────────────────────────────────────────────────────────
    const FIXED_DT = physicsModule.FIXED_DT;

    function loop(time: number) {
      if (!canvasRef.current || !rendererModule) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      const dt = Math.min((time - g.lastTime) / 1000, 0.05);
      g.lastTime = time;

      // Fixed-step physics
      g.physicsStepAccum += dt;
      while (g.physicsStepAccum >= FIXED_DT) {
        // Apply flipper motor speeds
        activateFlipper(table.leftFlipperJoint, 'left', g.leftActive);
        activateFlipper(table.rightFlipperJoint, 'right', g.rightActive);

        // Plunger charge/release
        if (g.plungerDown) {
          g.plungerCharge = Math.min(1, g.plungerCharge + FIXED_DT * 1.5);
          chargePlunger(table.plungerJoint, g.plungerCharge);
        }

        stepWorld(table.world);
        g.physicsStepAccum -= FIXED_DT;
      }

      // Drain check
      if (isBallDrained(table.ball)) {
        g.balls -= 1;
        setBallsLeft(g.balls);
        if (g.balls <= 0) {
          setGamePhase('gameover');
          cancelAnimationFrame(g.animFrame);
          return;
        }
        // Reset ball to plunger lane
        const { TABLE_W, TABLE_H, PX_PER_M } = physicsModule!;
        const laneX = (TABLE_W - 40) / PX_PER_M;
        const laneY = (TABLE_H - 130) / PX_PER_M;
        table.ball.setPosition({ x: laneX, y: laneY });
        table.ball.setLinearVelocity({ x: 0, y: 0 });
        table.ball.setAngularVelocity(0);
        g.plungerCharge = 0;
      }

      rendererModule.render(
        ctx,
        table,
        {
          score: g.score,
          balls: g.balls,
          bumperFlash: g.bumperFlash as Map<any, number>,
          plungerCharge: g.plungerCharge,
        },
        g.ballImg
      );

      g.animFrame = requestAnimationFrame(loop);
    }

    g.animFrame = requestAnimationFrame(loop);
  }, []);

  // ── Keyboard controls ──────────────────────────────────────────────────────
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const g = gameRef.current;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyZ') g.leftActive = true;
      if (e.code === 'Slash' || e.code === 'ArrowRight') g.rightActive = true;
      if (e.code === 'Space') { e.preventDefault(); g.plungerDown = true; }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyZ') g.leftActive = false;
      if (e.code === 'Slash' || e.code === 'ArrowRight') g.rightActive = false;
      if (e.code === 'Space') {
        e.preventDefault();
        g.plungerDown = false;
        if (g.table && physicsModule) {
          physicsModule.releasePlunger(g.table.plungerJoint);
        }
        g.plungerCharge = 0;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [gamePhase]);

  // ── Touch controls ─────────────────────────────────────────────────────────
  const handleTouch = useCallback(
    (side: 'left' | 'right' | 'plunger', isDown: boolean) => {
      const g = gameRef.current;
      if (side === 'left') g.leftActive = isDown;
      if (side === 'right') g.rightActive = isDown;
      if (side === 'plunger') {
        g.plungerDown = isDown;
        if (!isDown && g.table && physicsModule) {
          physicsModule.releasePlunger(g.table.plungerJoint);
          g.plungerCharge = 0;
        }
      }
    },
    []
  );

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(gameRef.current.animFrame);
    };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (gamePhase === 'select') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
        {/* Goal */}
        <div className="text-center space-y-3">
          <h1 className="font-koulen text-5xl text-white tracking-wide">Chog Haunted</h1>
          <p className="text-chog-text text-lg leading-relaxed">
            Pinball haunted by real rare Chogs.{' '}
            <span className="text-chog-purple">Launch your Chog as the ball — its traits change how it plays.</span>
          </p>
        </div>

        {/* Soul Ball selector */}
        <div className="bg-chog-card border border-chog-line rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold text-lg">Choose your Soul Ball</h2>

          {!isConnected ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <p className="text-chog-muted text-sm text-center">
                Connect your wallet to play as your Chog NFT, or play as Guest Spirit.
              </p>
              <ConnectButton />
              <button
                onClick={() => { setIsGuest(true); startGame(null, true); }}
                className="text-chog-muted text-sm underline hover:text-white transition-colors"
              >
                Play as Guest Spirit (no wallet needed)
              </button>
            </div>
          ) : loadingChogs ? (
            <div className="flex items-center justify-center gap-3 py-8 text-chog-muted">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Reading your Chogs from the chain…
            </div>
          ) : ownedChogs.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <p className="text-chog-muted text-sm text-center">
                No Chog Genesis NFTs found in this wallet.{' '}
                <a href="https://chog.xyz" target="_blank" rel="noopener noreferrer" className="text-chog-purple hover:underline">
                  Get a Chog
                </a>
              </p>
              <button
                onClick={() => { setIsGuest(true); startGame(null, true); }}
                className="px-6 py-2.5 rounded-xl border border-chog-line text-chog-muted hover:text-white hover:border-chog-purple/40 transition-colors text-sm"
              >
                Play as Guest Spirit instead
              </button>
            </div>
          ) : (
            <>
              {/* Chog grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
                {ownedChogs.map((chog) => (
                  <button
                    key={chog.tokenId}
                    onClick={() => setSelectedChog(chog)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all ${
                      selectedChog?.tokenId === chog.tokenId
                        ? 'border-chog-purple bg-chog-purple/10 shadow-lg shadow-chog-purple/20'
                        : 'border-chog-line hover:border-chog-purple/40'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={chog.image}
                      alt={chog.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <span className="text-[11px] font-mono text-chog-muted truncate w-full text-center">
                      #{chog.tokenId}
                    </span>
                  </button>
                ))}
              </div>

              {/* Selected chog detail */}
              {selectedChog && (
                <div className="bg-chog-surface1 border border-chog-line rounded-xl p-4 flex gap-4 items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedChog.image}
                    alt={selectedChog.name}
                    className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="space-y-1 min-w-0">
                    <p className="text-white font-semibold">{selectedChog.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedChog.attributes.slice(0, 5).map((a) => (
                        <span
                          key={a.trait_type}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-chog-purple/15 border border-chog-purple/30 text-chog-purple font-mono"
                        >
                          {a.trait_type}: {a.value}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { if (selectedChog) startGame(selectedChog, false); }}
                  disabled={!selectedChog}
                  className="flex-1 py-3 rounded-xl bg-chog-purple hover:bg-chog-purpleSoft disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition-colors shadow-lg shadow-chog-purple/20"
                >
                  Launch as Soul Ball
                </button>
                <button
                  onClick={() => startGame(null, true)}
                  className="px-4 py-3 rounded-xl border border-chog-line text-chog-muted hover:text-white hover:border-chog-purple/40 transition-colors text-sm"
                >
                  Guest Spirit
                </button>
              </div>
            </>
          )}
        </div>

        {/* Controls legend */}
        <div className="bg-chog-surface1 border border-chog-line rounded-xl p-4 text-sm text-chog-muted space-y-2">
          <p className="text-white font-semibold text-sm mb-3">Controls</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Z key / Left touch', 'Left flipper'],
              ['/ key or → / Right touch', 'Right flipper'],
              ['Space / drag-up', 'Charge plunger'],
              ['Release Space/drag', 'Launch ball'],
            ].map(([key, action]) => (
              <React.Fragment key={key}>
                <span className="font-mono text-chog-purple text-xs">{key}</span>
                <span className="text-xs">{action}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (gamePhase === 'gameover') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 text-center px-4">
        <div className="text-7xl select-none" aria-hidden>💀</div>
        <h2 className="font-koulen text-5xl text-white">Game Over</h2>
        <p className="text-chog-muted text-lg">Final score</p>
        <p className="font-mono text-5xl text-chog-purple font-bold">{score.toLocaleString()}</p>
        {isGuest && (
          <p className="text-chog-muted text-sm max-w-sm">
            Guest Spirit scores don't appear on the leaderboard.{' '}
            {isConnected ? 'Pick a Chog NFT to compete.' : 'Connect a wallet with a Chog NFT to compete.'}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => setGamePhase('select')}
            className="px-6 py-3 rounded-xl bg-chog-purple hover:bg-chog-purpleSoft text-white font-bold transition-colors"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // Playing
  return (
    <div className="flex flex-col items-center py-4 gap-4 px-2">
      {/* Score header */}
      <div className="flex items-center gap-4 text-sm font-mono text-chog-muted">
        {selectedChog ? (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedChog.image} alt={selectedChog.name} className="w-8 h-8 rounded-lg" />
            <span className="text-white">{selectedChog.name}</span>
          </div>
        ) : (
          <span className="text-chog-muted italic">Guest Spirit</span>
        )}
        <span className="text-chog-purple font-bold text-2xl font-mono">{score.toLocaleString()}</span>
        <span>
          {Array.from({ length: TOTAL_BALLS }, (_, i) => (
            <span key={i} className={i < ballsLeft ? 'text-chog-purple' : 'text-chog-muted/30'}>●</span>
          ))}
        </span>
      </div>

      {/* Canvas */}
      <div className="relative" style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          width={400}
          height={720}
          className="rounded-2xl border border-chog-purple/30 shadow-2xl shadow-chog-purple/20"
          style={{ maxHeight: '80vh', width: 'auto' }}
        />

        {/* Touch zones */}
        <div className="absolute inset-0 flex" style={{ pointerEvents: 'auto' }}>
          {/* Left half → left flipper */}
          <div
            className="flex-1 h-full cursor-pointer"
            onPointerDown={() => handleTouch('left', true)}
            onPointerUp={() => handleTouch('left', false)}
            onPointerLeave={() => handleTouch('left', false)}
          />
          {/* Right half → right flipper */}
          <div
            className="flex-1 h-full cursor-pointer"
            onPointerDown={() => handleTouch('right', true)}
            onPointerUp={() => handleTouch('right', false)}
            onPointerLeave={() => handleTouch('right', false)}
          />
        </div>
      </div>

      {/* Plunger touch */}
      <button
        className="px-10 py-4 rounded-xl bg-chog-surface2 border border-chog-line text-chog-muted text-sm font-mono active:bg-chog-purple/20 active:border-chog-purple select-none"
        onPointerDown={() => handleTouch('plunger', true)}
        onPointerUp={() => handleTouch('plunger', false)}
        onPointerLeave={() => handleTouch('plunger', false)}
      >
        Hold to charge plunger · Release to launch
      </button>

      <p className="text-chog-muted text-xs font-mono">Z · / · Space — keyboard controls</p>
    </div>
  );
}
