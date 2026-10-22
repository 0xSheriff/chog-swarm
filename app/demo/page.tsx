'use client';

import React, { useState, useMemo } from 'react';
import { ArenaCanvas } from '@/components/arena-canvas';
import { ReplayScrubber } from '@/components/replay-scrubber';
import { PolicyInspector } from '@/components/policy-inspector';
import { ChogNFT, CompiledPolicy, ReplaySnapshot, ArenaConfig } from '@engine/types';
import { compilePolicy } from '@engine/compiler';
import { runFullMatch } from '@engine/engine';
import fixturesManifest from '@/fixtures/manifest.json';
import { Play, ShieldAlert, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';

export default function DemoPage() {
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);

  // Load curated fixtures
  const chogA: ChogNFT = useMemo(() => {
    const f = fixturesManifest.find((x: any) => x.tokenId === 143) || fixturesManifest[3];
    return {
      tokenId: f.tokenId,
      name: f.name,
      image: f.image,
      attributes: f.traits
    };
  }, []);

  const chogB: ChogNFT = useMemo(() => {
    const f = fixturesManifest.find((x: any) => x.tokenId === 24) || fixturesManifest[1];
    return {
      tokenId: f.tokenId,
      name: f.name,
      image: f.image,
      attributes: f.traits
    };
  }, []);

  const policyA = useMemo(() => compilePolicy(chogA), [chogA]);
  const policyB = useMemo(() => compilePolicy(chogB), [chogB]);

  // Pre-compiled deterministic replay
  const recordedReplay: ReplaySnapshot = useMemo(() => {
    const config: ArenaConfig = {
      seed: 888143,
      rulesVersion: 'v1.0',
      gridWidth: 10,
      gridHeight: 10,
      maxTurns: 30,
      agents: [
        { id: chogA.name, tokenId: chogA.tokenId, name: chogA.name, policy: policyA },
        { id: chogB.name, tokenId: chogB.tokenId, name: chogB.name, policy: policyB }
      ]
    };
    return runFullMatch(config);
  }, [chogA, chogB, policyA, policyB]);

  const currentState = recordedReplay.stateHistory[currentTurnIndex] || recordedReplay.stateHistory[0];

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Exhibition Showcase Banner */}
      <div className="p-4 rounded-2xl bg-pumpkin/10 border border-pumpkin/30 flex items-start gap-3 text-bone">
        <Play className="w-5 h-5 text-pumpkin fill-pumpkin flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold font-mono block text-sm text-pumpkin">
            EXHIBITION MATCH • ARCHIVED SIMULATION
          </span>
          <p className="text-xs font-mono text-bone/80 mt-0.5 leading-relaxed">
            Public demonstration mode: Watch a complete 30-turn tactical race between Chog #143 and Chog #24 with full turn-by-turn AI policy reasoning. No wallet or token required.
          </p>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="font-pirata text-3xl text-bone tracking-wide">
              RECORDED MATCH REPLAY • SEED #888143
            </h2>
            <span className="text-xs font-mono text-chog-energy font-bold">
              Turn {currentState.turn} / {recordedReplay.stateHistory.length - 1}
            </span>
          </div>

          <ArenaCanvas
            state={currentState}
            selectedAgentId={chogA.name}
          />

          <ReplayScrubber
            stateHistory={recordedReplay.stateHistory}
            currentTurnIndex={currentTurnIndex}
            onTurnChange={(idx) => setCurrentTurnIndex(idx)}
          />
        </div>

        <div className="lg:col-span-5 flex flex-col gap-5">
          <PolicyInspector
            chog={chogA}
            policy={policyA}
            isOwnerVerified={false}
          />

          <div className="bg-chog-surface1/60 border border-chog-line rounded-2xl p-4 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-[10px] text-chog-muted uppercase">Opponent</span>
              <h4 className="font-koulen text-lg text-white">{chogB.name}</h4>
              <span className="text-chog-muted">Dash Sprinter (Red Skin)</span>
            </div>
            <div className="text-right">
              <span className="text-chog-energy font-bold text-sm block">
                {recordedReplay.finalScores[chogB.name]} pts
              </span>
              <span className="text-[10px] text-chog-muted">Final Score</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
