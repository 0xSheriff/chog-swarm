'use client';

import React, { useState, useMemo } from 'react';
import { ArenaCanvas } from '@/components/arena-canvas';
import { ReplayScrubber } from '@/components/replay-scrubber';
import { ChogNFT, CompiledPolicy, ReplaySnapshot, ArenaConfig } from '@engine/types';
import { compilePolicy } from '@engine/compiler';
import { runFullMatch } from '@engine/engine';
import fixturesManifest from '@/fixtures/manifest.json';
import { Cpu, Split, ArrowRight, Sparkles, AlertCircle, Compass, Zap, Flame, Eye, Target } from 'lucide-react';
import { ArenaLegend } from '@/components/arena-legend';

export default function TraitLabPage() {
  const [fixedSeed] = useState<number>(555777);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);

  // Active mutation choices
  const [mutatedParam, setMutatedParam] = useState<'side' | 'eyes' | 'aura' | 'skin'>('side');
  const [sideValue, setSideValue] = useState<'Right' | 'Left'>('Left');
  const [eyesValue, setEyesValue] = useState<'Laser Eyes' | 'Happy'>('Happy');
  const [auraValue, setAuraValue] = useState<'Burning Aura' | 'Aqua Aura'>('Aqua Aura');
  const [skinValue, setSkinValue] = useState<'Pink' | 'Red'>('Red');

  // Baseline Chog: Chog #143
  const baselineChog: ChogNFT = useMemo(() => {
    const f = fixturesManifest.find((x: any) => x.tokenId === 143) || fixturesManifest[3];
    return {
      tokenId: f.tokenId,
      name: f.name,
      image: f.image,
      attributes: f.traits
    };
  }, []);

  const baselinePolicy = useMemo(() => compilePolicy(baselineChog), [baselineChog]);

  // Construct Mutated Chog with only ONE modified attribute
  const mutatedChog: ChogNFT = useMemo(() => {
    const copy = JSON.parse(JSON.stringify(baselineChog));
    const attrs = copy.attributes as { trait_type: string; value: string }[];

    if (mutatedParam === 'side') {
      const a = attrs.find(x => x.trait_type === 'Side');
      if (a) a.value = sideValue;
      else attrs.push({ trait_type: 'Side', value: sideValue });
    } else if (mutatedParam === 'eyes') {
      const a = attrs.find(x => x.trait_type === 'Eyes');
      if (a) a.value = eyesValue;
      else attrs.push({ trait_type: 'Eyes', value: eyesValue });
    } else if (mutatedParam === 'aura') {
      const a = attrs.find(x => x.trait_type === 'Aura');
      if (a) a.value = auraValue;
      else attrs.push({ trait_type: 'Aura', value: auraValue });
    } else if (mutatedParam === 'skin') {
      const a = attrs.find(x => x.trait_type === 'Skin');
      if (a) a.value = skinValue;
      else attrs.push({ trait_type: 'Skin', value: skinValue });
    }

    return copy;
  }, [baselineChog, mutatedParam, sideValue, eyesValue, auraValue, skinValue]);

  const mutatedPolicy = useMemo(() => compilePolicy(mutatedChog), [mutatedChog]);

  // Run both simulations on identical seed on race-v1 track
  const runBaseline: ReplaySnapshot = useMemo(() => {
    const config: ArenaConfig = {
      seed: fixedSeed,
      rulesVersion: 'race-v1',
      gridWidth: 14,
      gridHeight: 14,
      maxTurns: 40,
      agents: [{ id: 'Baseline', tokenId: baselineChog.tokenId, name: 'Original Policy', policy: baselinePolicy }]
    };
    return runFullMatch(config);
  }, [fixedSeed, baselineChog, baselinePolicy]);

  const runMutated: ReplaySnapshot = useMemo(() => {
    const config: ArenaConfig = {
      seed: fixedSeed,
      rulesVersion: 'race-v1',
      gridWidth: 14,
      gridHeight: 14,
      maxTurns: 40,
      agents: [{ id: 'Mutated', tokenId: mutatedChog.tokenId, name: 'Mutated Policy', policy: mutatedPolicy }]
    };
    return runFullMatch(config);
  }, [fixedSeed, mutatedChog, mutatedPolicy]);

  // Compute the exact first divergent turn and location
  const divergenceInfo = useMemo(() => {
    const minEvents = Math.min(runBaseline.events.length, runMutated.events.length);
    for (let i = 0; i < minEvents; i++) {
      const eB = runBaseline.events[i];
      const eM = runMutated.events[i];
      if (
        eB.action.to.x !== eM.action.to.x ||
        eB.action.to.y !== eM.action.to.y ||
        eB.action.type !== eM.action.type
      ) {
        return {
          diverged: true,
          turn: eB.turn,
          stepIndex: i,
          baselinePos: eB.action.to,
          mutatedPos: eM.action.to,
          baselineAction: eB.action.type,
          mutatedAction: eM.action.type,
          reasonB: eB.action.reason,
          reasonM: eM.action.reason,
        };
      }
    }
    return {
      diverged: false,
      turn: runBaseline.events.length > 0 ? runBaseline.events[0].turn : 1,
      stepIndex: 0,
      baselinePos: { x: 2, y: 2 },
      mutatedPos: { x: 2, y: 2 },
      baselineAction: 'move',
      mutatedAction: 'move',
      reasonB: 'Identical trajectories across race track.',
      reasonM: 'Identical trajectories across race track.'
    };
  }, [runBaseline, runMutated]);

  const divergentTurn = divergenceInfo.turn;

  const stateBaseline = runBaseline.stateHistory[currentTurnIndex] || runBaseline.stateHistory[0];
  const stateMutated = runMutated.stateHistory[currentTurnIndex] || runMutated.stateHistory[0];

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* 1-Sentence Goal Banner */}
      <div className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-chog-diverge/20 via-chog-card to-chog-purple/10 border border-chog-diverge/30 flex items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-chog-diverge/20 border border-chog-diverge/40 flex items-center justify-center text-chog-diverge flex-shrink-0">
            <Target className="w-5 h-5 text-chog-diverge" />
          </div>
          <div>
            <span className="text-xs font-bold text-chog-diverge uppercase tracking-wider block">Mode Goal</span>
            <p className="text-sm font-medium text-white">
              Mutate a single NFT trait to rerun the exact same race track and highlight where the two cars first diverge.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-chog-surface1 border border-chog-line text-xs font-mono text-chog-muted flex-shrink-0">
          <Split className="w-3.5 h-3.5 text-chog-diverge" />
          <span>Branch Split at Turn {divergentTurn}</span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-chog-card border border-chog-line rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-chog-diverge" />
            <h1 className="font-koulen text-3xl text-white tracking-wide">
              TRAIT <span className="text-chog-diverge">LAB</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded text-xs font-sans bg-chog-diverge/20 text-chog-diverge border border-chog-diverge/30 font-bold">
              NOVELTY 30%
            </span>
          </div>
          <p className="text-xs text-chog-muted mt-0.5">
            Counterfactual Race Simulation: Mutate a single trait parameter on Seed <code className="font-mono text-white font-bold">#{fixedSeed}</code> to witness the exact branching divergence.
          </p>
        </div>

        {/* Divergence Notification Badge */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-chog-diverge/15 border border-chog-diverge/40 text-chog-diverge font-mono text-xs font-bold">
          <Split className="w-4 h-4" />
          <span>Divergence at Turn {divergentTurn}</span>
        </div>
      </div>

      {/* Prominent Divergence Highlight Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-chog-diverge/15 via-chog-card to-purple-900/20 border border-chog-diverge/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-chog-diverge/20 border border-chog-diverge/50 flex items-center justify-center text-chog-diverge flex-shrink-0">
            <Sparkles className="w-5 h-5 text-chog-diverge animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-chog-diverge uppercase font-mono tracking-wider">
                First Divergence Point Highlighted
              </span>
              <span className="px-2 py-0.5 rounded bg-chog-diverge text-white font-mono text-xs font-bold">
                Turn {divergentTurn}
              </span>
            </div>
            <p className="text-sm text-white mt-0.5">
              Original policy navigated to <code className="text-chog-purpleSoft font-bold font-mono">({divergenceInfo.baselinePos.x}, {divergenceInfo.baselinePos.y})</code> while Mutated took <code className="text-chog-diverge font-bold font-mono">({divergenceInfo.mutatedPos.x}, {divergenceInfo.mutatedPos.y})</code>: {divergenceInfo.reasonM}
            </p>
          </div>
        </div>
        <button
          onClick={() => setCurrentTurnIndex(Math.max(0, divergentTurn))}
          className="px-4 py-2 rounded-xl bg-chog-diverge hover:bg-chog-diverge/90 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg shadow-chog-diverge/20 flex-shrink-0 cursor-pointer"
        >
          <Split className="w-3.5 h-3.5" />
          Jump to Turn {divergentTurn}
        </button>
      </div>

      {/* Mutation Selector Bar */}
      <div className="bg-chog-surface1/80 border border-chog-line rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-chog-muted uppercase">Mutate Parameter:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setMutatedParam('side')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                mutatedParam === 'side'
                  ? 'bg-chog-diverge text-white font-bold shadow-md shadow-chog-diverge/30'
                  : 'bg-chog-card text-chog-muted hover:text-white border border-chog-line'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Side (Path Routing)
            </button>

            <button
              onClick={() => setMutatedParam('eyes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                mutatedParam === 'eyes'
                  ? 'bg-chog-diverge text-white font-bold shadow-md shadow-chog-diverge/30'
                  : 'bg-chog-card text-chog-muted hover:text-white border border-chog-line'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Eyes (Valuation)
            </button>

            <button
              onClick={() => setMutatedParam('aura')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                mutatedParam === 'aura'
                  ? 'bg-chog-diverge text-white font-bold shadow-md shadow-chog-diverge/30'
                  : 'bg-chog-card text-chog-muted hover:text-white border border-chog-line'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Aura (Risk Buffer)
            </button>

            <button
              onClick={() => setMutatedParam('skin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                mutatedParam === 'skin'
                  ? 'bg-chog-diverge text-white font-bold shadow-md shadow-chog-diverge/30'
                  : 'bg-chog-card text-chog-muted hover:text-white border border-chog-line'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Skin (Sprint Speed)
            </button>
          </div>
        </div>

        {/* Value Toggle for Selected Param */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-chog-muted">Mutated Value:</span>
          {mutatedParam === 'side' && (
            <div className="flex gap-1 bg-chog-card p-1 rounded-xl border border-chog-line text-xs font-mono">
              <button
                onClick={() => setSideValue('Right')}
                className={`px-2.5 py-1 rounded ${sideValue === 'Right' ? 'bg-chog-purple text-white font-bold' : 'text-chog-muted'}`}
              >
                Right (Clockwise)
              </button>
              <button
                onClick={() => setSideValue('Left')}
                className={`px-2.5 py-1 rounded ${sideValue === 'Left' ? 'bg-chog-diverge text-white font-bold' : 'text-chog-muted'}`}
              >
                Left (Counter-Clockwise)
              </button>
            </div>
          )}

          {mutatedParam === 'eyes' && (
            <div className="flex gap-1 bg-chog-card p-1 rounded-xl border border-chog-line text-xs font-mono">
              <button
                onClick={() => setEyesValue('Laser Eyes')}
                className={`px-2.5 py-1 rounded ${eyesValue === 'Laser Eyes' ? 'bg-chog-purple text-white font-bold' : 'text-chog-muted'}`}
              >
                Laser Eyes (3x Purple)
              </button>
              <button
                onClick={() => setEyesValue('Happy')}
                className={`px-2.5 py-1 rounded ${eyesValue === 'Happy' ? 'bg-chog-diverge text-white font-bold' : 'text-chog-muted'}`}
              >
                Happy (Nearest)
              </button>
            </div>
          )}

          {mutatedParam === 'aura' && (
            <div className="flex gap-1 bg-chog-card p-1 rounded-xl border border-chog-line text-xs font-mono">
              <button
                onClick={() => setAuraValue('Burning Aura')}
                className={`px-2.5 py-1 rounded ${auraValue === 'Burning Aura' ? 'bg-chog-purple text-white font-bold' : 'text-chog-muted'}`}
              >
                Burning (Daredevil)
              </button>
              <button
                onClick={() => setAuraValue('Aqua Aura')}
                className={`px-2.5 py-1 rounded ${auraValue === 'Aqua Aura' ? 'bg-chog-diverge text-white font-bold' : 'text-chog-muted'}`}
              >
                Aqua (Safe Buffer)
              </button>
            </div>
          )}

          {mutatedParam === 'skin' && (
            <div className="flex gap-1 bg-chog-card p-1 rounded-xl border border-chog-line text-xs font-mono">
              <button
                onClick={() => setSkinValue('Pink')}
                className={`px-2.5 py-1 rounded ${skinValue === 'Pink' ? 'bg-chog-purple text-white font-bold' : 'text-chog-muted'}`}
              >
                Pink (1 Step)
              </button>
              <button
                onClick={() => setSkinValue('Red')}
                className={`px-2.5 py-1 rounded ${skinValue === 'Red' ? 'bg-chog-diverge text-white font-bold' : 'text-chog-muted'}`}
              >
                Red (2 Step Sprint)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Side-by-Side Dual Arena View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Arena: Baseline */}
        <div className="bg-chog-card border border-chog-line rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-chog-line">
            <div>
              <span className="text-[10px] font-mono text-chog-muted uppercase">Control Run</span>
              <h3 className="font-koulen text-xl text-white">Original Policy (Chog #{baselineChog.tokenId})</h3>
            </div>
            <div className="text-right text-xs font-mono text-chog-energy font-bold">
              Score: {stateBaseline.agents[0]?.score || 0} pts
            </div>
          </div>

          <ArenaCanvas
            state={stateBaseline}
            selectedAgentId="Baseline"
          />

          <div className="text-xs font-mono text-chog-muted bg-chog-surface1 p-2.5 rounded-xl border border-chog-line">
            <span className="text-white font-bold block mb-1">Latest Decision:</span>
            {stateBaseline.events.slice(-1)[0]?.action.reason || 'Simulation ready.'}
          </div>
        </div>

        {/* Right Arena: Mutated */}
        <div className="bg-chog-card border border-chog-diverge/40 rounded-2xl p-4 flex flex-col gap-3 shadow-xl relative">
          <div className="flex items-center justify-between pb-2 border-b border-chog-line">
            <div>
              <span className="text-[10px] font-mono text-chog-diverge uppercase font-bold">Mutated Variant</span>
              <h3 className="font-koulen text-xl text-chog-diverge">
                Modified: {mutatedParam.toUpperCase()}
              </h3>
            </div>
            <div className="text-right text-xs font-mono text-chog-diverge font-bold">
              Score: {stateMutated.agents[0]?.score || 0} pts
            </div>
          </div>

          <ArenaCanvas
            state={stateMutated}
            selectedAgentId="Mutated"
          />

          <div className="text-xs font-mono text-chog-muted bg-chog-surface1 p-2.5 rounded-xl border border-chog-diverge/30">
            <span className="text-chog-diverge font-bold block mb-1">Latest Decision:</span>
            {stateMutated.events.slice(-1)[0]?.action.reason || 'Simulation ready.'}
          </div>
        </div>
      </div>

      {/* Synchronized Replay Scrubber */}
      <ReplayScrubber
        stateHistory={runBaseline.stateHistory}
        currentTurnIndex={currentTurnIndex}
        onTurnChange={(idx) => setCurrentTurnIndex(idx)}
        divergentTurnIndex={divergentTurn}
        isLabCompare={true}
      />

      {/* Tile and Objective Legend */}
      <ArenaLegend />
    </div>
  );
}
