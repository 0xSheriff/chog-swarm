'use client';

import React from 'react';
import { useAccessSession } from './access-context';
import { Sparkles, ShieldAlert, Award } from 'lucide-react';

interface CreatorBannerProps {
  currentChogId?: number;
  onChangeChogClick?: () => void;
}

export function CreatorBanner({ currentChogId, onChangeChogClick }: CreatorBannerProps) {
  const { session } = useAccessSession();

  if (!session || (!session.creatorPass && !session.judgePass)) {
    return null;
  }

  const effectiveId = currentChogId || session.selectedChogId || 143;
  const isJudge = session.judgePass;

  return (
    <div
      data-testid="creator-pass-banner"
      className={`w-full mb-4 px-4 py-2.5 rounded-xl border backdrop-blur-md transition-all flex flex-wrap items-center justify-between gap-3 text-sm ${
        isJudge
          ? 'bg-amber-950/40 border-amber-500/40 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
          : 'bg-purple-950/40 border-chog-violet/40 text-purple-200 shadow-[0_0_20px_rgba(131,110,249,0.15)]'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isJudge ? 'bg-amber-500/20 text-amber-300' : 'bg-chog-violet/20 text-chog-violet'
          }`}
        >
          {isJudge ? <Award className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
        </div>
        <div className="font-medium tracking-wide">
          {isJudge ? (
            <span>
              Judge pass: playing Chog <strong className="text-amber-300 font-mono font-bold">#{effectiveId}</strong> (not owned)
            </span>
          ) : (
            <span>
              Creator pass: playing Chog <strong className="text-purple-300 font-mono font-bold">#{effectiveId}</strong> (not owned)
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-stone-400 hidden sm:inline-flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-stone-400" />
          Rankings excluded from public leaderboard
        </span>
        {onChangeChogClick && (
          <button
            onClick={onChangeChogClick}
            className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all hover:scale-105 active:scale-95 ${
              isJudge
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                : 'bg-chog-violet/20 border-chog-violet/40 text-purple-200 hover:bg-chog-violet/30'
            }`}
          >
            Switch Chog
          </button>
        )}
      </div>
    </div>
  );
}
