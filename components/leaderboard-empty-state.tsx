'use client';

import React from 'react';
import Link from 'next/link';
import { Trophy, Play, ArrowRight, ShieldCheck } from 'lucide-react';

interface LeaderboardEmptyStateProps {
  seed?: number;
  dateKey?: string;
  onAction?: () => void;
  actionText?: string;
  actionHref?: string;
}

export function LeaderboardEmptyState({
  seed,
  dateKey,
  onAction,
  actionText = "Enter Today's Gauntlet",
  actionHref = "/gauntlet"
}: LeaderboardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-gradient-to-b from-chog-surface1/60 to-chog-card/80 border border-chog-lineBright/40 my-2 shadow-2xl relative overflow-hidden group">
      {/* Ambient background glow */}
      <div className="absolute w-48 h-48 rounded-full bg-chog-purple/10 blur-3xl pointer-events-none group-hover:bg-chog-purple/15 transition-all" />

      {/* Trophy Badge */}
      <div className="w-16 h-16 rounded-2xl bg-chog-surface2 border border-chog-lineBright flex items-center justify-center text-chog-gold shadow-lg shadow-chog-gold/10 mb-4 group-hover:scale-105 transition-transform">
        <Trophy className="w-8 h-8" />
      </div>

      {/* Exact required headline */}
      <h3 className="font-koulen text-2xl sm:text-3xl text-white tracking-wide">
        No runs yet today. Be first.
      </h3>

      <p className="text-xs sm:text-sm font-mono text-chog-muted max-w-md mt-2 leading-relaxed">
        {dateKey ? `Daily Gauntlet is open for UTC date ${dateKey}. ` : ''}
        Deploy your Chog agent into today's seeded arena to set the pace and claim the #1 spot on the verified leaderboard.
      </p>

      {seed ? (
        <div className="mt-3 px-3 py-1 rounded-full bg-black/40 border border-chog-line text-[11px] font-mono text-chog-gold inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-chog-energy animate-pulse" />
          Active Seed: #{seed}
        </div>
      ) : null}

      <div className="mt-6">
        {onAction ? (
          <button
            onClick={onAction}
            className="px-6 py-2.5 rounded-xl bg-chog-purple hover:bg-chog-purpleSoft text-white font-koulen text-base tracking-wider flex items-center gap-2 shadow-lg shadow-chog-purple/20 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            {actionText}
          </button>
        ) : (
          <Link
            href={actionHref}
            className="px-6 py-2.5 rounded-xl bg-chog-purple hover:bg-chog-purpleSoft text-white font-koulen text-base tracking-wider flex items-center gap-2 shadow-lg shadow-chog-purple/20 transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            {actionText}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        )}
      </div>
    </div>
  );
}
