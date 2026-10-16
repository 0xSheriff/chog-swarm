'use client';

import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp, Zap, Shield, AlertTriangle, Sparkles, Gem } from 'lucide-react';

export function ArenaLegend() {
  const [isOpen, setIsOpen] = useState(false);

  const legendItems = [
    {
      color: 'bg-cyan-400 border-cyan-300 shadow-cyan-500/50',
      icon: Gem,
      name: 'Cyan Nexus Node',
      value: '+50 pts',
      description: 'High-value strategic objective. High reward, contested by cooperation policies.',
    },
    {
      color: 'bg-chog-gold border-amber-300 shadow-amber-500/50',
      icon: Zap,
      name: 'Solar Energy Shard',
      value: '+25 pts & +10 EP',
      description: 'Restores vital energy. Critical for high-speed sprinters to avoid exhaustion.',
    },
    {
      color: 'bg-chog-purple border-purple-400 shadow-purple-500/50',
      icon: Sparkles,
      name: 'Standard Essence',
      value: '+10 pts',
      description: 'Reliable baseline points distributed evenly across the grid.',
    },
    {
      color: 'bg-red-500 border-red-400 shadow-red-500/50',
      icon: AlertTriangle,
      name: 'Hazard Zone (Spikes)',
      value: '-15 EP Penalty',
      description: 'Dangerous terrain. Fiery/Risk policies cross boldly; cautious policies detour around.',
    },
    {
      color: 'bg-chog-purpleSoft border-white',
      name: 'Your Agent',
      value: 'Player 1',
      description: 'Autonomous agent executing your verified Chog NFT trait policy.',
    },
    {
      color: 'bg-chog-cheek border-white',
      name: 'Rival Agent',
      value: 'Opponent / Ghost',
      description: 'Rival policy competing asynchronously for the same grid resources.',
    },
  ];

  return (
    <div className="bg-chog-card/90 border border-chog-line rounded-2xl overflow-hidden shadow-lg transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-chog-purple" />
          <span className="text-xs uppercase tracking-wider text-white font-bold">
            Arena Tile & Icon Legend
          </span>
          <span className="text-xs text-chog-muted">
            (Nodes, Hazards & Objectives)
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-chog-muted">
          <span>{isOpen ? 'Hide' : 'Show Legend'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 pt-1 border-t border-chog-line grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in duration-150">
          {legendItems.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-chog-surface1/70 border border-chog-line/80 flex items-start gap-3 text-xs"
            >
              <div
                className={`w-5 h-5 rounded-md flex-shrink-0 mt-0.5 border shadow-sm ${item.color} flex items-center justify-center text-black font-bold text-[10px]`}
              >
                {item.icon ? <item.icon className="w-3 h-3 text-black" /> : '●'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-white text-xs">{item.name}</span>
                  <span className="font-mono text-[11px] font-bold text-chog-gold flex-shrink-0">
                    {item.value}
                  </span>
                </div>
                <p className="text-[12px] text-chog-muted mt-1 leading-normal">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
