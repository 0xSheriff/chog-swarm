'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X, Play, Shield, Target, Cpu, ArrowRight } from 'lucide-react';

interface ArenaIntroModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function ArenaIntroModal({ forceOpen = false, onClose }: ArenaIntroModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }
    if (typeof window !== 'undefined' && window.location.search.includes('no_intro')) {
      return;
    }
    const hasSeen = localStorage.getItem('chog_seen_arena_intro');
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const handleDismiss = () => {
    localStorage.setItem('chog_seen_arena_intro', 'true');
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  const steps = [
    {
      icon: Cpu,
      title: '1. Traits Compile into Policy',
      desc: 'Your Chog Genesis NFT traits define your agent\'s movement speed, energy pool, target value priority, and hazard risk appetite.',
    },
    {
      icon: Target,
      title: '2. Deterministic Action Loop',
      desc: 'Each turn, both agents autonomously evaluate visible grid tiles, pathfind using A*, and commit decisions simultaneously without LLM lag.',
    },
    {
      icon: Play,
      title: '3. Full Replay & Decision Logs',
      desc: 'Watch the match auto-play or scrub through turn-by-turn to read the exact mathematical reason behind every movement and collection.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0712]/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl glass-panel p-6 sm:p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-chog-purple/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-chog-purple/20 text-chog-purpleSoft text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>WELCOME TO THE ARENA</span>
            </div>
            <h2 className="font-koulen text-3xl sm:text-4xl text-white tracking-wide">
              HOW THE <span className="text-chog-purple">ARENA WORKS</span>
            </h2>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-xl border border-chog-line hover:border-chog-lineBright text-chog-muted hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-4 relative z-10">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-chog-surface1/80 border border-chog-line flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-chog-surface2 border border-chog-lineBright flex items-center justify-center text-chog-purple flex-shrink-0">
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">{s.title}</h4>
                <p className="text-xs text-chog-muted mt-1 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-chog-line relative z-10">
          <span className="text-xs text-chog-muted text-center sm:text-left">
            Match will auto-play on start. Scrub anytime.
          </span>
          <button
            onClick={handleDismiss}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-chog-purple to-chog-purpleSoft text-white font-koulen text-lg tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-chog-purple/25 hover:opacity-95 transition-all cursor-pointer"
          >
            <span>Got It, Let's Play</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
