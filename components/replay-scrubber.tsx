'use client';

import React, { useState, useEffect } from 'react';
import { TurnEvent, ArenaState } from '@engine/types';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, AlertCircle, Compass } from 'lucide-react';

interface ReplayScrubberProps {
  stateHistory: ArenaState[];
  currentTurnIndex: number;
  onTurnChange: (turnIndex: number) => void;
  divergentTurnIndex?: number;
  isLabCompare?: boolean;
  autoPlay?: boolean;
}

export function ReplayScrubber({
  stateHistory,
  currentTurnIndex,
  onTurnChange,
  divergentTurnIndex,
  isLabCompare = false,
  autoPlay = false,
}: ReplayScrubberProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 4x

  const totalTurns = stateHistory.length - 1;
  const currentState = stateHistory[currentTurnIndex] || stateHistory[0];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      const intervalMs = Math.round(700 / playbackSpeed);
      timer = setTimeout(() => {
        if (currentTurnIndex < totalTurns) {
          onTurnChange(currentTurnIndex + 1);
        } else {
          setIsPlaying(false);
        }
      }, intervalMs);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentTurnIndex, totalTurns, playbackSpeed, onTurnChange]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextIdx = parseInt(e.target.value, 10);
    onTurnChange(nextIdx);
  };

  // Extract recent events up to current turn
  const visibleEvents = currentState?.events || [];
  const latestEvents = visibleEvents.slice(-6).reverse();

  return (
    <div className="bg-chog-card border border-chog-line rounded-2xl p-4 shadow-xl flex flex-col gap-4">
      {/* Playback Controls & Speed */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setIsPlaying(false);
              onTurnChange(0);
            }}
            className="p-2 rounded-xl bg-chog-surface1 border border-chog-line hover:border-chog-lineBright text-chog-muted hover:text-white transition-colors"
            title="Reset to Turn 0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              onTurnChange(Math.max(0, currentTurnIndex - 1));
            }}
            disabled={currentTurnIndex === 0}
            className="p-2 rounded-xl bg-chog-surface1 border border-chog-line hover:border-chog-lineBright disabled:opacity-30 text-chog-muted hover:text-white transition-colors"
            title="Previous Turn"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (currentTurnIndex >= totalTurns) {
                onTurnChange(0);
              }
              setIsPlaying(!isPlaying);
            }}
            className="px-4 py-2 rounded-xl bg-chog-purple hover:bg-chog-purpleSoft text-white font-koulen text-base tracking-wider flex items-center gap-2 shadow-lg shadow-chog-purple/20 transition-all"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" /> PAUSE
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" /> PLAY
              </>
            )}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              onTurnChange(Math.min(totalTurns, currentTurnIndex + 1));
            }}
            disabled={currentTurnIndex === totalTurns}
            className="p-2 rounded-xl bg-chog-surface1 border border-chog-line hover:border-chog-lineBright disabled:opacity-30 text-chog-muted hover:text-white transition-colors"
            title="Next Turn"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Turn Counter & Divergence Flag */}
        <div className="flex items-center gap-3">
          {divergentTurnIndex !== undefined && divergentTurnIndex > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-chog-diverge/15 border border-chog-diverge/40 text-xs font-mono text-chog-diverge font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>Diverged at Turn {divergentTurnIndex}</span>
            </div>
          )}

          <div className="font-mono text-sm">
            <span className="text-white font-bold">Turn {currentState?.turn || 0}</span>
            <span className="text-chog-muted"> / {totalTurns}</span>
          </div>

          {/* Speed selector */}
          <div className="flex items-center gap-1 bg-chog-surface1 p-1 rounded-lg border border-chog-line text-xs font-mono">
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2.5 py-0.5 rounded ${
                  playbackSpeed === spd
                    ? 'bg-chog-purple text-white font-bold'
                    : 'text-chog-muted hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrubber Timeline Bar */}
      <div className="relative pt-1 pb-1">
        <input
          type="range"
          min={0}
          max={totalTurns}
          value={currentTurnIndex}
          onChange={handleSeek}
          className="w-full h-2.5 bg-chog-surface2 rounded-lg appearance-none cursor-pointer accent-chog-purple"
        />

        {/* Marker on Divergent Turn if in Trait Lab */}
        {divergentTurnIndex !== undefined && divergentTurnIndex > 0 && totalTurns > 0 && (
          <div
            className="absolute top-0 w-2.5 h-4 bg-chog-diverge rounded-sm pointer-events-none transform -translate-x-1 shadow-md shadow-chog-diverge/80"
            style={{ left: `${(divergentTurnIndex / totalTurns) * 100}%` }}
            title={`Branch Split at Turn ${divergentTurnIndex}`}
          />
        )}
      </div>

      {/* Live Event Log with Explicit Policy Reasons */}
      <div className="space-y-2 pt-1">
        <div className="text-xs font-mono text-chog-muted uppercase tracking-wider flex items-center justify-between">
          <span>Action Log & Policy Reasons</span>
          <span>(Deterministic v1.0)</span>
        </div>

        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
          {latestEvents.length === 0 ? (
            <div className="p-3 rounded-xl bg-chog-surface1/40 text-xs font-mono text-chog-muted text-center">
              Match initialized. Press Play to begin replay.
            </div>
          ) : (
            latestEvents.map((ev, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl text-xs font-mono border transition-all ${
                  divergentTurnIndex && ev.turn === divergentTurnIndex
                    ? 'bg-chog-diverge/15 border-chog-diverge/40 text-chog-text'
                    : 'bg-chog-surface1/60 border-chog-line text-chog-text'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-chog-muted mb-1">
                  <span className="font-bold text-chog-purpleSoft">
                    T{ev.turn} • {ev.agentId}
                  </span>
                  <span className="text-chog-energy font-bold">
                    Score: {ev.agentScoreAfter} | Energy: {ev.agentEnergyAfter}
                  </span>
                </div>
                <p className="text-xs text-white/95 leading-relaxed">
                  {ev.action.reason}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
