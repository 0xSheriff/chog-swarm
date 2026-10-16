'use client';

/**
 * components/dmd-display.tsx — Arcade Dot-Matrix Display (DMD) for Chog Swarm.
 *
 * Emulates the iconic amber/orange phosphor LED matrix seen on classic 90s Bally/Williams
 * pinball machines with scanlines, subtle bloom, and pixelated dot styling.
 */

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Sparkles, Flame, ShieldAlert, Award } from 'lucide-react';
import { sound } from '@/lib/audio';

interface DMDProps {
  score: number;
  multiplier: number;
  ballsRemaining: number;
  activeBallCount: number;
  message: string;
  reunionActive: boolean;
  multiballActive: boolean;
  rolloversLit: Set<string>;
}

export function DMDDisplay({
  score,
  multiplier,
  ballsRemaining,
  activeBallCount,
  message,
  reunionActive,
  multiballActive,
  rolloversLit,
}: DMDProps) {
  const [muted, setMuted] = useState(sound.getMuted());
  const [flashTick, setFlashTick] = useState(false);

  // Flash ticker for alerts
  useEffect(() => {
    const interval = setInterval(() => {
      setFlashTick((p) => !p);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const toggleSound = () => {
    const next = sound.toggleMute();
    setMuted(next);
  };

  // Formatted Score with arcade commas
  const formattedScore = score.toLocaleString('en-US').padStart(8, '0');

  return (
    <div className="w-full max-w-2xl mx-auto rounded-xl bg-[#090610] border-2 border-[#ff8800]/40 p-2.5 sm:p-3.5 shadow-2xl shadow-orange-950/40 relative overflow-hidden select-none">
      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25 z-10"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.7) 2px, rgba(0, 0, 0, 0.7) 4px)',
        }}
      />

      {/* Subtle honeycomb/dot texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15 z-10"
        style={{
          backgroundImage:
            'radial-gradient(circle, #ff8800 1px, transparent 1px)',
          backgroundSize: '4px 4px',
        }}
      />

      {/* Top Header Row: Score | Multiplier | Ball | Audio */}
      <div className="relative z-20 flex items-center justify-between border-b border-[#ff8800]/25 pb-2 mb-2 gap-2">
        {/* Score Display */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest text-[#ffaa44]/70 uppercase">
            SCORE
          </span>
          <span className="font-mono text-xl sm:text-3xl font-black tracking-wider text-[#ff9900] drop-shadow-[0_0_10px_rgba(255,136,0,0.7)]">
            {formattedScore}
          </span>
        </div>

        {/* Center Indicators: Multiplier & Multiball / Reunion Badges */}
        <div className="flex items-center gap-2">
          {/* C-H-O-G Letters Mini Matrix */}
          <div className="flex items-center gap-1 bg-[#150d22] px-2 py-0.5 rounded border border-[#ff8800]/30">
            {['C', 'H', 'O', 'G'].map((char) => {
              const isLit = rolloversLit.has(char);
              return (
                <span
                  key={char}
                  className={`font-mono text-xs font-black px-1 rounded transition-colors ${
                    isLit
                      ? 'bg-[#ff9900] text-black shadow-[0_0_8px_#ff9900]'
                      : 'text-zinc-600'
                  }`}
                >
                  {char}
                </span>
              );
            })}
          </div>

          {/* Multiplier Badge */}
          <div
            className={`px-2 py-0.5 rounded font-mono text-xs sm:text-sm font-black border transition-all ${
              multiplier > 1
                ? 'bg-[#ff7700] text-black border-[#ffaa00] shadow-[0_0_12px_rgba(255,119,0,0.8)] scale-105'
                : 'bg-[#1e1330] text-[#ff8800] border-[#ff8800]/40'
            }`}
          >
            {multiplier}X
          </div>
        </div>

        {/* Right Info: Ball Tracker & Mute Toggle */}
        <div className="flex items-center gap-3">
          {multiballActive ? (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-black ${
                flashTick
                  ? 'bg-red-600 text-white shadow-[0_0_12px_red]'
                  : 'bg-orange-600 text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 animate-bounce" />
              <span>MULTIBALL ({activeBallCount})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 font-mono text-xs sm:text-sm text-[#ffbb66]">
              <span className="text-[10px] text-[#ffaa44]/60 uppercase font-bold">BALL</span>
              <span className="font-bold text-[#ff9900] bg-[#1e1330] px-2 py-0.5 rounded border border-[#ff8800]/30">
                {4 - ballsRemaining}/3
              </span>
            </div>
          )}

          {/* Audio Mute Button */}
          <button
            onClick={toggleSound}
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-1.5 rounded-lg bg-[#1a1228] border border-[#ff8800]/40 text-[#ffaa44] hover:bg-[#ff8800]/20 hover:text-white transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main DMD Message Marquee / Event Screen */}
      <div className="relative z-20 h-10 sm:h-12 bg-[#0d0718] rounded-md border border-[#ff8800]/30 px-3 flex items-center justify-between overflow-hidden shadow-inner">
        {/* Amber LED Phosphor Text */}
        <div className="w-full flex items-center justify-center gap-2 text-center">
          {reunionActive && (
            <Sparkles className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
          )}
          <span
            className={`font-mono text-xs sm:text-sm md:text-base font-black tracking-wider uppercase truncate ${
              reunionActive
                ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                : multiballActive
                ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)] animate-pulse'
                : 'text-[#ff9900] drop-shadow-[0_0_6px_rgba(255,153,0,0.7)]'
            }`}
          >
            {message}
          </span>
          {reunionActive && (
            <Sparkles className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}
