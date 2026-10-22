'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ArenaCanvas } from '@/components/arena-canvas';
import { PolicyInspector } from '@/components/policy-inspector';
import { ReplayScrubber } from '@/components/replay-scrubber';
import { ChogSelectModal } from '@/components/chog-select-modal';
import { ChogNFT, CompiledPolicy, ArenaState, ReplaySnapshot, ArenaConfig } from '@engine/types';
import { compilePolicy } from '@engine/compiler';
import { runFullMatch } from '@engine/engine';
import { buildRaceTrack } from '@engine/race-engine';
import { verifyChogOwnershipOnChain } from '@/lib/monad-chain';
import fixturesManifest from '@/fixtures/manifest.json';
import { Zap, Shield, Share2, Play, RefreshCw, Trophy, Users, Target, Info, Flame, Gauge } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ChogImage } from '@/components/chog-image';
import { ArenaLegend } from '@/components/arena-legend';
import { ArenaIntroModal } from '@/components/arena-intro-modal';
import { GateGuard } from '@/components/gate-guard';
import { useAccessSession } from '@/components/access-context';

const RACER_THEMES = [
  { border: 'border-chog-purple', bg: 'bg-chog-purple/20', text: 'text-chog-purpleSoft', dot: '#836EF9' },
  { border: 'border-pink-500', bg: 'bg-pink-500/20', text: 'text-pink-400', dot: '#EC4899' },
  { border: 'border-cyan-500', bg: 'bg-cyan-500/20', text: 'text-cyan-400', dot: '#06B6D4' },
  { border: 'border-amber-500', bg: 'bg-amber-500/20', text: 'text-amber-400', dot: '#F59E0B' }
];

export default function ArenaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-mono text-sm text-chog-muted">Loading Arena...</div>}>
      <ArenaContent />
    </Suspense>
  );
}

function ArenaContent() {
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const { session, selectChog } = useAccessSession();

  const rulesVersion = searchParams.get('rules') || 'race-v1';
  const isRaceV1 = rulesVersion === 'race-v1';

  const defaultFixture = fixturesManifest.find((f: any) => f.tokenId === 143) || fixturesManifest[3];
  const defaultChogData: ChogNFT = {
    tokenId: defaultFixture.tokenId,
    name: defaultFixture.name,
    image: defaultFixture.image,
    attributes: defaultFixture.traits
  };

  const defaultRivalFixtures = [
    fixturesManifest.find((f: any) => f.tokenId === 24) || fixturesManifest[1],
    fixturesManifest.find((f: any) => f.tokenId === 58) || fixturesManifest[2],
    fixturesManifest.find((f: any) => f.tokenId === 1) || fixturesManifest[0],
  ];

  const defaultRivalsData = defaultRivalFixtures.map(rf => {
    const c: ChogNFT = {
      tokenId: rf.tokenId,
      name: rf.name,
      image: rf.image,
      attributes: rf.traits
    };
    return { chog: c, policy: compilePolicy(c) };
  });

  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [selectedChog, setSelectedChog] = useState<ChogNFT | null>(defaultChogData);
  const [compiledPolicy, setCompiledPolicy] = useState<CompiledPolicy | null>(compilePolicy(defaultChogData));

  // Field of AI rivals for 4-car championship races
  const [rivals, setRivals] = useState<{ chog: ChogNFT; policy: CompiledPolicy }[]>(defaultRivalsData);

  const [isOwnerVerified, setIsOwnerVerified] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const [replay, setReplay] = useState<ReplaySnapshot | null>(null);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [matchSeed, setMatchSeed] = useState<number>(133742);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [hasAutoRun, setHasAutoRun] = useState<boolean>(false);

  // Initialize player Chog and benchmark rival field from query params
  useEffect(() => {
    const rawId = searchParams.get('tokenId');
    if (!rawId) return;
    const targetId = parseInt(rawId, 10);
    const fixture = fixturesManifest.find((f: any) => f.tokenId === targetId);
    if (!fixture) return;

    const chogData: ChogNFT = {
      tokenId: fixture.tokenId,
      name: fixture.name,
      image: fixture.image,
      attributes: fixture.traits
    };

    setSelectedChog(chogData);
    setCompiledPolicy(compilePolicy(chogData));
  }, [searchParams]);

  // Check ownership
  useEffect(() => {
    const checkState = async () => {
      if (session?.creatorPass || session?.judgePass) {
        setIsOwnerVerified(true);
        setVerificationError(null);
        return;
      }

      if (selectedChog) {
        const res = await verifyChogOwnershipOnChain(address, selectedChog.tokenId);
        setIsOwnerVerified(res.verified);
        setVerificationError(res.error || null);
      }
    };

    checkState();
  }, [address, selectedChog, session]);

  // Auto-run match on initial load so the first impression is motion
  useEffect(() => {
    if (!hasAutoRun && selectedChog && compiledPolicy && rivals.length >= 3) {
      setHasAutoRun(true);
      const seed = Math.floor(Math.random() * 900000) + 100000;
      setMatchSeed(seed);

      const agentList = isRaceV1
        ? [
            { id: selectedChog.name, tokenId: selectedChog.tokenId, name: selectedChog.name, policy: compiledPolicy },
            ...rivals.map(r => ({ id: r.chog.name, tokenId: r.chog.tokenId, name: r.chog.name, policy: r.policy }))
          ]
        : [
            { id: selectedChog.name, tokenId: selectedChog.tokenId, name: selectedChog.name, policy: compiledPolicy },
            { id: rivals[0].chog.name, tokenId: rivals[0].chog.tokenId, name: rivals[0].chog.name, policy: rivals[0].policy }
          ];

      const config: ArenaConfig = {
        seed,
        rulesVersion: isRaceV1 ? 'race-v1' : 'v1.0',
        gridWidth: isRaceV1 ? 14 : 10,
        gridHeight: isRaceV1 ? 14 : 10,
        maxTurns: isRaceV1 ? 40 : 30,
        agents: agentList
      };

      const res = runFullMatch(config);
      setReplay(res);
      setCurrentTurnIndex(0);
    }
  }, [hasAutoRun, selectedChog, compiledPolicy, rivals, isRaceV1]);

  const handleSpawnAndRunMatch = async () => {
    if (!selectedChog || !compiledPolicy || rivals.length < 1) return;

    const seed = Math.floor(Math.random() * 900000) + 100000;
    setMatchSeed(seed);

    // Call server-side gated resolution endpoint
    try {
      const response = await fetch('/api/arena/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed,
          rulesVersion: isRaceV1 ? 'race-v1' : 'v1.0',
          chog: selectedChog,
          rivals,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReplay(data.replay);
        setCurrentTurnIndex(0);

        if (data.replay.winnerId === selectedChog.name) {
          setTimeout(() => {
            confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
          }, 500);
        }
        return;
      }
    } catch (err) {
      console.warn('Gated server run failed, falling back to local simulation:', err);
    }

    const agentList = isRaceV1
      ? [
          { id: selectedChog.name, tokenId: selectedChog.tokenId, name: selectedChog.name, policy: compiledPolicy },
          ...rivals.map(r => ({ id: r.chog.name, tokenId: r.chog.tokenId, name: r.chog.name, policy: r.policy }))
        ]
      : [
          { id: selectedChog.name, tokenId: selectedChog.tokenId, name: selectedChog.name, policy: compiledPolicy },
          { id: rivals[0].chog.name, tokenId: rivals[0].chog.tokenId, name: rivals[0].chog.name, policy: rivals[0].policy }
        ];

    const config: ArenaConfig = {
      seed,
      rulesVersion: isRaceV1 ? 'race-v1' : 'v1.0',
      gridWidth: isRaceV1 ? 14 : 10,
      gridHeight: isRaceV1 ? 14 : 10,
      maxTurns: isRaceV1 ? 40 : 30,
      agents: agentList
    };

    const res = runFullMatch(config);
    setReplay(res);
    setCurrentTurnIndex(0);

    // Trigger celebration if player won
    if (res.winnerId === selectedChog.name) {
      setTimeout(() => {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      }, 500);
    }
  };

  const handleShareReplay = () => {
    if (!selectedChog) return;
    const url = `${window.location.origin}/arena?tokenId=${selectedChog.tokenId}&seed=${matchSeed}&rules=${rulesVersion}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Turn 0 state before replay has run shows ALL cars on the grid
  const activeState: ArenaState = useMemo(() => {
    if (replay) return replay.stateHistory[currentTurnIndex];

    if (isRaceV1) {
      const track = buildRaceTrack(matchSeed);
      const allRacers = [
        ...(selectedChog && compiledPolicy ? [{ chog: selectedChog, policy: compiledPolicy }] : []),
        ...rivals
      ].slice(0, 4);

      const agents = allRacers.map((r, i) => {
        const start = track.startPositions[i % track.startPositions.length];
        return {
          id: r.chog.name,
          tokenId: r.chog.tokenId,
          name: r.chog.name,
          position: { ...start },
          energy: r.policy.energyCapacity,
          maxEnergy: r.policy.energyCapacity,
          score: 0,
          shieldRemaining: r.policy.shieldCharges,
          nodesCollected: 0,
          hazardsHit: 0,
          isExhausted: false,
          policy: r.policy,
          statusMessage: 'Ready on Grid',
          checkpointsCleared: 0,
          hasFinished: false,
          usedTurboBurst: false,
          distanceToNextGate: 20
        };
      });

      return {
        seed: matchSeed,
        rulesVersion: 'race-v1',
        turn: 0,
        maxTurns: 40,
        gridSize: { width: 14, height: 14 },
        agents,
        nodes: track.boostPads.map((b, idx) => ({
          id: `boost-${idx}`,
          x: b.x,
          y: b.y,
          type: 'high_value',
          value: 15,
          active: true,
          respawnTurnsLeft: 0
        })),
        hazards: track.oilSlicks.map(o => ({ x: o.x, y: o.y, intensity: 1 })),
        events: [],
        completed: false,
        winnerId: null,
        summary: { totalTurnsPlayed: 0, highestScore: 0, coopPointsUnlocked: 0, matchChecksum: 'grid-init' },
        trackData: track,
        raceStandings: agents.map((a, i) => ({
          agentId: a.id,
          name: a.name,
          rank: i + 1,
          checkpointsCleared: 0,
          hasFinished: false,
          turboFuel: a.energy
        }))
      };
    } else {
      return {
        seed: matchSeed,
        rulesVersion: 'v1.0',
        turn: 0,
        maxTurns: 30,
        gridSize: { width: 10, height: 10 },
        agents: [
          ...(selectedChog && compiledPolicy ? [{
            id: selectedChog.name,
            tokenId: selectedChog.tokenId,
            name: selectedChog.name,
            position: { x: 1, y: 1 },
            energy: compiledPolicy.energyCapacity,
            maxEnergy: compiledPolicy.energyCapacity,
            score: 0,
            shieldRemaining: compiledPolicy.shieldCharges,
            nodesCollected: 0,
            hazardsHit: 0,
            isExhausted: false,
            policy: compiledPolicy,
          }] : []),
          ...(rivals[0] ? [{
            id: rivals[0].chog.name,
            tokenId: rivals[0].chog.tokenId,
            name: rivals[0].chog.name,
            position: { x: 8, y: 8 },
            energy: rivals[0].policy.energyCapacity,
            maxEnergy: rivals[0].policy.energyCapacity,
            score: 0,
            shieldRemaining: rivals[0].policy.shieldCharges,
            nodesCollected: 0,
            hazardsHit: 0,
            isExhausted: false,
            policy: rivals[0].policy,
          }] : []),
        ],
        nodes: [
          { id: 'nexus-0', x: 5, y: 5, type: 'nexus', value: 50, active: true, respawnTurnsLeft: 0 },
          { id: 'p-0', x: 2, y: 7, type: 'high_value', value: 30, active: true, respawnTurnsLeft: 0 },
          { id: 's-0', x: 4, y: 2, type: 'standard', value: 10, active: true, respawnTurnsLeft: 0 },
        ],
        hazards: [
          { x: 5, y: 4, intensity: 1 },
          { x: 6, y: 5, intensity: 1 }
        ],
        events: [],
        completed: false,
        winnerId: null,
        summary: { totalTurnsPlayed: 0, highestScore: 0, coopPointsUnlocked: 0, matchChecksum: 'preview' }
      };
    }
  }, [replay, currentTurnIndex, isRaceV1, matchSeed, selectedChog, compiledPolicy, rivals]);

  return (
    <GateGuard currentChogId={selectedChog?.tokenId} onChangeChogClick={() => setIsSelectModalOpen(true)}>
      <div className="flex flex-col gap-6 py-2">
      {/* 1-Sentence Goal Banner */}
      <div className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-chog-purple/20 via-chog-card to-chog-purple/10 border border-chog-purple/30 flex items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-chog-purple/20 border border-chog-purple/40 flex items-center justify-center text-chog-purpleSoft flex-shrink-0">
            <Target className="w-5 h-5 text-chog-purple" />
          </div>
          <div>
            <span className="text-xs font-bold text-chog-purpleSoft uppercase tracking-wider block">Mode Goal</span>
            <p className="text-sm font-medium text-white">
              {isRaceV1
                ? 'Race 3 rival Chogs on a closed circuit with 3 checkpoint gates, boost pads, oil slicks, slipstream drafting, and a high-risk shortcut. First to cross the finish line wins!'
                : 'Outscore your rival in a 30-turn deterministic tactical arena by harvesting power nodes while balancing energy costs and hazard avoidance.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowIntroModal(true)}
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-chog-surface1 border border-chog-line hover:border-chog-lineBright text-xs font-medium text-chog-muted hover:text-white transition-colors flex-shrink-0 cursor-pointer"
        >
          <Info className="w-3.5 h-3.5 text-chog-purple" />
          How it Works
        </button>
      </div>

      {/* Top Banner & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-chog-card border border-chog-line rounded-2xl p-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-pirata text-4xl text-bone tracking-wide">
              {isRaceV1 ? 'CIRCUIT' : 'TACTICAL'} <span className="text-pumpkin">{isRaceV1 ? 'RACE ARENA' : 'ARENA'}</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-pumpkin/20 border border-pumpkin/40 text-pumpkin">
              {isRaceV1 ? 'Ruleset race-v1' : 'Deterministic v1.0'}
            </span>
          </div>
          <p className="text-xs text-chog-muted mt-0.5">
            Seed: <code className="font-mono text-white">#{matchSeed}</code> • {isRaceV1 ? '14x14 Circuit Track • 3 Checkpoints • 4 Racers' : '10x10 Tactical Grid • 2 Agents'} • Turn Limit: {isRaceV1 ? 40 : 30}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSelectModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-chog-surface1 border border-chog-line hover:border-chog-lineBright text-xs text-white flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <Users className="w-3.5 h-3.5 text-chog-purpleSoft" />
            Switch Chog
          </button>

          <button
            onClick={handleShareReplay}
            className="px-4 py-2 rounded-xl bg-chog-surface1 border border-chog-line hover:border-chog-lineBright text-xs text-chog-text flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <Share2 className="w-3.5 h-3.5 text-chog-purple" />
            {isCopied ? 'Link Copied!' : 'Share Replay'}
          </button>

          <button
            onClick={handleSpawnAndRunMatch}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-chog-purple to-chog-purpleSoft hover:from-chog-purple text-white font-koulen text-lg tracking-wider flex items-center gap-2 shadow-lg shadow-chog-purple/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white" />
            START RACE
          </button>
        </div>
      </div>

      {/* Match Result Banner when completed */}
      {replay && replay.stateHistory[currentTurnIndex]?.completed && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-chog-purple/20 via-chog-card to-chog-purple/20 border border-chog-purpleSoft/40 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-chog-gold animate-bounce" />
            <div>
              <span className="text-[10px] font-mono text-chog-muted uppercase tracking-widest">
                Race Finished • Turn {replay.stateHistory[currentTurnIndex].turn}
              </span>
              <h3 className="font-koulen text-2xl text-white tracking-wide">
                WINNER: {replay.winnerId}
              </h3>
            </div>
          </div>
          <div className="text-right font-mono text-xs">
            <span className="text-chog-muted block">Checksum: <code>{replay.matchChecksum}</code></span>
            <span className="text-chog-energy font-bold">
              Winner Score: {replay.stateHistory[currentTurnIndex].agents.find(a => a.id === replay.winnerId)?.score || 0} pts
            </span>
          </div>
        </div>
      )}

      {/* Main Arena Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Canvas Arena, Replay Scrubber, Live Standings & Legend */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <ArenaCanvas
            state={activeState}
            selectedAgentId={selectedChog?.name}
          />

          <ReplayScrubber
            stateHistory={replay ? replay.stateHistory : [activeState]}
            currentTurnIndex={currentTurnIndex}
            onTurnChange={(idx) => setCurrentTurnIndex(idx)}
            autoPlay={true}
          />

          {/* Live Race Standings Board (When race-v1 is active) */}
          {isRaceV1 && (
            <div className="bg-chog-card border border-chog-line rounded-2xl p-4 shadow-xl flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-chog-line pb-2">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-chog-purple" />
                  <span className="font-koulen text-lg text-white tracking-wide">LIVE CIRCUIT STANDINGS</span>
                </div>
                <span className="text-[11px] font-mono text-chog-muted">
                  Turn {activeState.turn} / {activeState.maxTurns}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {(activeState.raceStandings || []).map((standing, sIdx) => {
                  const agentObj = activeState.agents.find(a => a.id === standing.agentId);
                  const theme = RACER_THEMES[sIdx % RACER_THEMES.length];
                  const isPlayer = selectedChog && standing.name.includes(selectedChog.name);

                  return (
                    <div
                      key={standing.agentId}
                      className={`flex items-center justify-between p-2.5 rounded-xl border ${
                        isPlayer
                          ? 'bg-chog-purple/15 border-chog-purple/50'
                          : 'bg-chog-surface1/60 border-chog-line'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank Badge */}
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                            standing.hasFinished
                              ? 'bg-emerald-500 text-white'
                              : (standing.rank === 1
                                ? 'bg-amber-500 text-black'
                                : (standing.rank === 2
                                  ? 'bg-slate-400 text-black'
                                  : (standing.rank === 3
                                    ? 'bg-amber-700 text-white'
                                    : 'bg-chog-surface2 text-chog-muted')))
                          }`}
                        >
                          {standing.hasFinished ? '🏁' : `#${standing.rank}`}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white">{standing.name}</span>
                            {isPlayer && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-chog-purple text-white uppercase tracking-wider">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-chog-muted font-mono block">
                            {standing.hasFinished
                              ? `Finished on Turn ${standing.finishTurn}`
                              : `Checkpoints: ${standing.checkpointsCleared}/3 cleared`}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-4">
                        {/* Turbo Fuel Gauge */}
                        <div className="flex flex-col items-end">
                          <span className="text-[11px] font-mono font-bold text-chog-energy">
                            {Math.round(standing.turboFuel)} TF
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-black/40 overflow-hidden mt-1">
                            <div
                              className="h-full bg-emerald-400"
                              style={{ width: `${Math.min(100, (standing.turboFuel / (agentObj?.maxEnergy || 100)) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Match Score */}
                        <span className="font-mono text-sm font-bold text-white min-w-[50px] text-right">
                          {agentObj?.score || 0} pts
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Collapsible/Expandable Tile and Icon Legend */}
          <ArenaLegend />
        </div>

        {/* Right Col: Policy Inspector & Rivals Field */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {selectedChog && compiledPolicy && (
            <PolicyInspector
              chog={selectedChog}
              policy={compiledPolicy}
              isOwnerVerified={isOwnerVerified}
            />
          )}

          {/* Field of AI Rivals on the Track */}
          <div className="bg-chog-card border border-chog-line rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-chog-line pb-2">
              <Users className="w-4 h-4 text-chog-purple" />
              <span className="font-koulen text-lg text-white tracking-wide">
                {isRaceV1 ? 'RIVAL CARS ON CIRCUIT' : 'OPPONENT ARCHETYPE'}
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {rivals.map((rival, rIdx) => {
                const isSprinter = rival.policy.speed === 2;
                const isDaredevil = rival.policy.riskTolerance > 0.6;
                const isCruiser = rival.policy.riskTolerance <= 0.35;
                const archetypeTag = isSprinter
                  ? '⚡ Sprinter (Top Speed)'
                  : (isDaredevil
                    ? '🔥 Daredevil (Hazard Risk)'
                    : (isCruiser ? '🛡️ Safe Cruiser (Clean Line)' : '🤝 Drafting Tactician'));

                return (
                  <div
                    key={rival.chog.tokenId}
                    className="bg-chog-surface1/60 border border-chog-line rounded-xl p-3 flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <ChogImage
                        tokenId={rival.chog.tokenId}
                        alt={rival.chog.name}
                        className="w-12 h-12 rounded-xl object-cover border border-chog-line flex-shrink-0"
                      />
                      <div>
                        <h4 className="font-koulen text-lg text-white">{rival.chog.name}</h4>
                        <span className="text-[11px] font-medium text-chog-purpleSoft block">
                          {archetypeTag}
                        </span>
                      </div>
                    </div>

                    <div className="text-right text-xs">
                      <span className="text-chog-energy font-mono font-bold block">{rival.policy.energyCapacity} TF</span>
                      <span className="text-chog-muted text-[11px]">
                        Risk {Math.round(rival.policy.riskTolerance * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* First-Visit Introduction Modal */}
      <ArenaIntroModal
        forceOpen={showIntroModal}
        onClose={() => setShowIntroModal(false)}
      />

      {/* Chog Selection Modal */}
      <ChogSelectModal
        isOpen={isSelectModalOpen}
        onClose={() => setIsSelectModalOpen(false)}
        onSelect={(chog, policy, verified) => {
          setSelectedChog(chog);
          setCompiledPolicy(policy);
          setIsOwnerVerified(verified);
          setIsSelectModalOpen(false);
        }}
        userAddress={address}
      />
    </div>
    </GateGuard>
  );
}
