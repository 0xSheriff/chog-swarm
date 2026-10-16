'use client';

/**
 * /haunted-hall — Haunted Hall Codex
 *
 * Your personal museum of banished Ghost Chogs. Each rare Chog you knock
 * off the table 3 times is sealed here with its real art, lore, and traits.
 * If you own the token on-chain, triggering Reunion marks it as Reunited!
 */

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Ghost, Sparkles, Shield, Skull, Flame, Award, Play } from 'lucide-react';

interface CodexItem {
  ghostId: string;
  tokenId: number;
  name: string;
  tier: string;
  power: string;
  lore: string;
  image: string;
  banished: boolean;
  banishCount: number;
  reunionTriggered: boolean;
  highScore: number;
  lastBanishedAt: string | null;
}

export default function HauntedHallPage() {
  const { address, isConnected } = useAccount();
  const [codex, setCodex] = useState<CodexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGhost, setSelectedGhost] = useState<CodexItem | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/haunted-hall?address=${address || 'guest'}`)
      .then((r) => r.json())
      .then((data) => {
        setCodex(data.codex || []);
        if (data.codex && data.codex.length > 0) {
          setSelectedGhost(data.codex[0]);
        }
      })
      .catch(() => setCodex([]))
      .finally(() => setLoading(false));
  }, [address]);

  const totalBanished = codex.filter((c) => c.banished).length;
  const totalReunions = codex.filter((c) => c.reunionTriggered).length;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-chog-purple/30 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-chog-purple/20 border border-chog-purple/40 text-xs font-mono text-chog-purpleSoft mb-2">
            <Ghost className="w-3.5 h-3.5" />
            <span>SPECTRAL CODEX • GATE 2</span>
          </div>
          <h1 className="font-koulen text-4xl sm:text-5xl text-white tracking-wide">
            HAUNTED HALL
          </h1>
          <p className="text-chog-muted text-sm sm:text-base max-w-xl">
            Tombstones sealed in spectral chains. Banish each rare Ghost Chog 3 times during play to bind them to your wallet codex.
          </p>
        </div>

        {/* Stats Pills */}
        <div className="flex items-center gap-3">
          <div className="bg-chog-card border border-chog-purple/40 rounded-xl px-4 py-2 text-center shadow-lg">
            <span className="text-[10px] font-mono uppercase tracking-wider text-chog-muted block">
              BANISHED
            </span>
            <span className="font-mono text-2xl font-bold text-amber-400">
              {totalBanished} / 4
            </span>
          </div>
          <div className="bg-chog-card border border-chog-purple/40 rounded-xl px-4 py-2 text-center shadow-lg">
            <span className="text-[10px] font-mono uppercase tracking-wider text-chog-muted block">
              REUNIONS
            </span>
            <span className="font-mono text-2xl font-bold text-emerald-400">
              {totalReunions}
            </span>
          </div>
          <Link
            href="/play"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-chog-purple hover:bg-chog-purple/80 text-white font-mono font-bold text-sm shadow-xl shadow-chog-purple/20 transition-all hover:scale-105"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>PLAY NOW</span>
          </Link>
        </div>
      </div>

      {/* Grid of Ghost Chogs */}
      <div className="grid md:grid-cols-4 gap-6">
        {codex.map((item) => (
          <div
            key={item.ghostId}
            onClick={() => setSelectedGhost(item)}
            className={`cursor-pointer rounded-2xl bg-chog-card border-2 p-4 flex flex-col justify-between transition-all hover:scale-[1.02] ${
              selectedGhost?.ghostId === item.ghostId
                ? 'border-chog-purple shadow-xl shadow-chog-purple/20'
                : 'border-white/10 hover:border-chog-purple/50'
            }`}
          >
            <div className="space-y-3">
              {/* Art with Status Overlay */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/60 border border-white/10">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className={`object-cover transition-opacity ${
                    item.banished ? 'opacity-100' : 'opacity-60 grayscale'
                  }`}
                />

                {/* Badge Overlay */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <span className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-sm border border-amber-500/50 text-[10px] font-mono font-bold text-amber-400">
                    #{item.tokenId}
                  </span>
                </div>

                <div className="absolute top-2 right-2">
                  {item.reunionTriggered ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-[10px] font-mono text-emerald-400">
                      <Sparkles className="w-3 h-3" />
                      REUNITED
                    </span>
                  ) : item.banished ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/60 text-[10px] font-mono text-purple-300">
                      <Skull className="w-3 h-3" />
                      SEALED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-black/70 border border-zinc-700 text-[10px] font-mono text-zinc-400">
                      HAUNTING
                    </span>
                  )}
                </div>

                {/* Banish Count Tag */}
                {item.banishCount > 0 && (
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 border border-white/20 text-[10px] font-mono text-zinc-300">
                    {item.banishCount}x BANISHED
                  </div>
                )}
              </div>

              {/* Title & Tier */}
              <div>
                <h3 className="font-koulen text-xl text-white tracking-wide">
                  {item.name}
                </h3>
                <span className="text-xs font-mono text-chog-purpleSoft uppercase">
                  {item.tier} • TARGET {item.ghostId.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-chog-muted line-clamp-2">
                {item.lore}
              </p>
            </div>

            {/* Bottom Indicator */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">
                {item.banished ? 'Sealed in Codex' : '3 Hits to Banish'}
              </span>
              <span className="text-amber-400 font-bold">
                {item.banished ? '★ COMPLETE' : 'IN PLAY'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Ghost Detail Card */}
      {selectedGhost && (
        <div className="rounded-2xl bg-chog-card border-2 border-chog-purple/40 p-6 md:p-8 grid md:grid-cols-3 gap-6 shadow-2xl">
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black/80 border border-white/20">
            <Image
              src={selectedGhost.image}
              alt={selectedGhost.name}
              fill
              className="object-cover"
            />
          </div>

          <div className="md:col-span-2 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-xs font-mono text-amber-300 font-bold">
                  TOKEN #{selectedGhost.tokenId}
                </span>
                <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-xs font-mono text-purple-300">
                  {selectedGhost.tier}
                </span>
                {selectedGhost.reunionTriggered && (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-xs font-mono text-emerald-300">
                    MASTER REUNION VERIFIED
                  </span>
                )}
              </div>

              <h2 className="font-koulen text-3xl sm:text-4xl text-white tracking-wide">
                {selectedGhost.name}
              </h2>

              <p className="text-chog-text text-sm sm:text-base leading-relaxed">
                {selectedGhost.lore}
              </p>

              {/* Haunt Power Box */}
              <div className="bg-[#120a22] border border-chog-purple/40 rounded-xl p-4 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-chog-purpleSoft font-bold block">
                  HAUNT POWER (REUNION & SOUL BALL)
                </span>
                <p className="text-sm font-mono text-emerald-300">
                  {selectedGhost.power}
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/10">
              <Link
                href="/play"
                className="px-6 py-2.5 rounded-xl bg-chog-purple hover:bg-chog-purple/80 text-white font-mono font-bold text-sm transition-all"
              >
                CHALLENGE ON PLAYFIELD
              </Link>
              <a
                href={`https://monadscan.com/token/0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763?a=${selectedGhost.tokenId}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-chog-muted hover:text-white underline transition-colors"
              >
                View on MonadScan ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
