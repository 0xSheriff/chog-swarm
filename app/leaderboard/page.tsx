'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Shield, CheckCircle2, Calendar, Hash, ArrowUpRight, Target } from 'lucide-react';
import Link from 'next/link';
import { LeaderboardEmptyState } from '@/components/leaderboard-empty-state';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [dateKey, setDateKey] = useState<string>('');
  const [seed, setSeed] = useState<number>(0);

  useEffect(() => {
    fetch('/api/gauntlet/leaderboard')
      .then(res => res.json())
      .then(data => {
        setEntries(data.entries || []);
        setDateKey(data.dateKey || '');
        setSeed(data.seed || 0);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* 1-Sentence Goal Banner */}
      <div className="px-5 py-3.5 rounded-2xl glass-panel flex items-center justify-between gap-4 shadow-lg border-pumpkin/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pumpkin/20 border border-pumpkin/40 flex items-center justify-center text-pumpkin flex-shrink-0">
            <Target className="w-5 h-5 text-pumpkin" />
          </div>
          <div>
            <span className="text-xs font-bold text-pumpkin uppercase tracking-wider block">Mode Goal</span>
            <p className="text-sm font-medium text-bone">
              Review cryptographically verified daily scores reproduced deterministically on the server to prevent cheating.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-7 h-7 text-pumpkin" />
            <h1 className="font-pirata text-5xl text-bone tracking-wide">
              GLOBAL <span className="text-pumpkin">HALL OF FAME</span>
            </h1>
          </div>
          <p className="text-xs text-bone/65 mt-1 font-mono">
            Server-verified cryptographic leaderboards. Zero client trust • Anti-cheat re-simulation engine v1.0.
          </p>
        </div>

        <Link
          href="/gauntlet"
          className="btn-gloss px-6 py-2.5 rounded-xl bg-gradient-to-r from-pumpkin to-ember hover:from-pumpkin hover:to-pumpkin text-void font-bold text-lg tracking-wider flex items-center gap-2 shadow-lg shadow-pumpkin/20 transition-all cursor-pointer"
        >
          Compete in Today's Gauntlet <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Info Callout */}
      <div className="p-4 rounded-2xl glass-panel flex items-start gap-3 text-sm text-bone">
        <Shield className="w-5 h-5 text-pumpkin flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-bone block">How Scores are Verified:</span>
          When a player completes a Daily Gauntlet run, the backend server fetches the player’s NFT metadata, recompiles the policy, and executes the deterministic engine against today's seed ({seed}). Only if the server-reproduced score matches the submitted score exactly is the entry stamped with a cryptographic hash and entered into this registry.
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="glass-panel overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-bone/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-bone/65" />
            <span className="font-mono text-xs text-bone font-bold">UTC Active Period: {dateKey}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-bone/65">
            <Hash className="w-4 h-4" />
            <span>Seed: #{seed}</span>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="p-6">
            <LeaderboardEmptyState seed={seed} dateKey={dateKey} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-chog-surface1/80 border-b border-chog-line text-chog-muted uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Agent Identity</th>
                  <th className="py-3 px-4">Player Address</th>
                  <th className="py-3 px-4 text-right">Score</th>
                  <th className="py-3 px-4">Cryptographic Checksum</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-chog-line/50">
                {entries.map((entry, idx) => (
                  <tr key={entry.id || idx} className="hover:bg-chog-surface1/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className={`w-7 h-7 rounded-lg inline-flex items-center justify-center font-bold text-xs ${
                        idx === 0
                          ? 'bg-chog-gold/20 text-chog-gold border border-chog-gold/40'
                          : (idx === 1 ? 'bg-slate-300/20 text-slate-200' : (idx === 2 ? 'bg-amber-700/20 text-amber-500' : 'text-chog-muted'))
                      }`}>
                        #{entry.rank || idx + 1}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      {entry.chogName}
                    </td>
                    <td className="py-3.5 px-4 text-chog-muted">
                      {entry.playerAddress}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-sm text-chog-energy">
                      {entry.score} pts
                    </td>
                    <td className="py-3.5 px-4 text-chog-purpleSoft font-mono">
                      <code>{entry.matchChecksum}</code>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/15 text-green-300 border border-green-500/30 text-[10px]">
                        <CheckCircle2 className="w-3 h-3" /> VERIFIED RUN
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
