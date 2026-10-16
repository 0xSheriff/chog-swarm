'use client';

import React from 'react';
import { CompiledPolicy, ChogNFT } from '@engine/types';
import { ChogImage } from '@/components/chog-image';
import { Shield, Zap, Target, Users, Flame, Award, AlertTriangle, Compass } from 'lucide-react';

interface PolicyInspectorProps {
  chog: ChogNFT;
  policy: CompiledPolicy;
  isOwnerVerified?: boolean;
  isDisconnectedTest?: boolean;
}

export function PolicyInspector({
  chog,
  policy,
  isOwnerVerified = false,
  isDisconnectedTest = false,
}: PolicyInspectorProps) {
  return (
    <div className="bg-chog-card border border-chog-line rounded-2xl p-6 shadow-xl flex flex-col gap-6">
      {/* Header Info with Hero Chog Art */}
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <div className="w-full sm:w-48 h-48 rounded-2xl overflow-hidden border border-chog-lineBright bg-chog-surface1 flex-shrink-0 relative group shadow-lg shadow-chog-purple/15">
          <ChogImage
            tokenId={chog.tokenId}
            alt={chog.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          <div className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-black/85 backdrop-blur-sm text-xs font-mono text-chog-gold font-bold">
            #{chog.tokenId}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="font-koulen text-3xl text-white tracking-wide truncate">
                {chog.name}
              </h3>
              {isDisconnectedTest ? (
                <span className="px-2.5 py-1 rounded text-xs font-sans font-semibold bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                  SPAWN REJECTED
                </span>
              ) : isOwnerVerified ? (
                <span className="px-2.5 py-1 rounded text-xs font-sans font-semibold bg-green-500/20 text-green-300 border border-green-500/40 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> VERIFIED OWNER
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded text-xs font-sans font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  VIEW-ONLY (NOT OWNER)
                </span>
              )}
            </div>

            <p className="text-sm text-chog-muted mt-1">
              Compiled Policy • Deterministic Engine v1.0
            </p>
          </div>

          {/* Core Stat Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-chog-surface1 border border-chog-line text-sm text-chog-energy">
              <Zap className="w-4 h-4 text-chog-energy flex-shrink-0" />
              <div>
                <span className="text-xs text-chog-muted block leading-none">Energy</span>
                <span className="font-mono font-bold text-sm">{policy.energyCapacity} EP</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-chog-surface1 border border-chog-line text-sm text-chog-purpleSoft">
              <Compass className="w-4 h-4 flex-shrink-0" />
              <div>
                <span className="text-xs text-chog-muted block leading-none">Speed</span>
                <span className="font-mono font-bold text-sm">{policy.speed === 2 ? 'Sprint (2)' : 'Walk (1)'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-chog-surface1 border border-chog-line text-sm text-chog-coop">
              <Users className="w-4 h-4 flex-shrink-0" />
              <div>
                <span className="text-xs text-chog-muted block leading-none">Coop Bias</span>
                <span className="font-mono font-bold text-sm">{Math.round(policy.coopBias * 100)}%</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-chog-surface1 border border-chog-line text-sm text-amber-400">
              <Flame className="w-4 h-4 flex-shrink-0" />
              <div>
                <span className="text-xs text-chog-muted block leading-none">Risk Tolerance</span>
                <span className="font-mono font-bold text-sm">{Math.round(policy.riskTolerance * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disconnect Test Warning Callout */}
      {isDisconnectedTest && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 flex items-start gap-3 text-sm text-red-200">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-red-300 block">NFT Essentiality Disconnect Test Active</span>
            The NFT ownership verification was manually detached. In accordance with Chogathon rules, this agent cannot spawn in arena matches without verified on-chain ownership.
          </div>
        </div>
      )}

      {/* Trait Breakdown Cards with Explicit Tradeoffs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-chog-muted border-b border-chog-line pb-2">
          <span className="font-semibold uppercase tracking-wider">NFT TRAIT ➔ COMPILED POLICY</span>
          <span className="font-semibold uppercase tracking-wider">STRATEGIC TRADEOFF</span>
        </div>

        <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
          {policy.derivedBreakdown.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-chog-surface1/70 border border-chog-line hover:border-chog-lineBright transition-colors text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-chog-purple/20 text-chog-purpleSoft text-xs uppercase font-bold">
                    {item.traitType}
                  </span>
                  <span className="font-semibold text-white">
                    {item.nativeValue}
                  </span>
                  <span className="text-chog-muted text-xs">➔</span>
                  <span className="text-chog-energy font-mono text-xs font-bold">
                    {item.derivedParam}
                  </span>
                </div>
                <p className="text-xs text-chog-muted mt-1.5 leading-relaxed">
                  {item.gameEffect}
                </p>
              </div>

              <div className="sm:text-right max-w-[220px] flex-shrink-0">
                <span className="inline-block text-xs px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {item.tradeoff}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
