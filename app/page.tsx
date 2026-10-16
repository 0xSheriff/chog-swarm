'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Shield, Zap, Sparkles, Play, Award, Compass, Cpu, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import fixturesManifest from '@/fixtures/manifest.json';
import { ChogSelectModal } from '@/components/chog-select-modal';
import { ChogNFT, CompiledPolicy } from '@engine/types';
import { useRouter } from 'next/navigation';
import { ChogImage } from '@/components/chog-image';

export default function LandingPage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectChog = (chog: ChogNFT, policy: CompiledPolicy, isVerified: boolean) => {
    localStorage.setItem('selected_chog', JSON.stringify(chog));
    setIsModalOpen(false);
    router.push(`/arena?tokenId=${chog.tokenId}`);
  };

  return (
    <div className="flex flex-col gap-14 py-6">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center text-center py-12 px-4">
        {/* Hackathon Eyebrow */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-chog-purple/15 border border-chog-purpleSoft/30 text-xs font-mono text-chog-purpleSoft mb-6">
          <Sparkles className="w-3.5 h-3.5 text-chog-purple" />
          <span>CHOGATHON 2026 • BUILT FOR MONAD (CHAIN ID 143)</span>
        </div>

        <h1 className="font-koulen text-5xl sm:text-7xl lg:text-8xl tracking-tight text-white leading-[0.95] max-w-4xl">
          PINBALL HAUNTED BY <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-chog-purple via-chog-purpleSoft to-chog-cheek">
            REAL RARE CHOGS
          </span>
        </h1>

        <p className="text-base sm:text-lg text-chog-text/90 max-w-2xl mt-6 leading-relaxed">
          Launch your own Chog as the Soul Ball — its real on-chain traits shape mass, bumper impact, and Haunt Powers. Or play instantly as a Guest Spirit.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <Link
            href="/play"
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-chog-purple to-chog-purpleSoft hover:from-chog-purple hover:to-chog-purple text-white font-koulen text-xl tracking-wider shadow-lg shadow-chog-purple/30 flex items-center gap-2.5 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Zap className="w-5 h-5 fill-white" />
            PLAY CHOG HAUNTED
          </Link>

          <Link
            href="/how-it-works"
            className="px-6 py-3.5 rounded-xl bg-chog-surface1 border border-chog-line hover:border-chog-lineBright text-white font-koulen text-xl tracking-wider flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4 text-chog-purple" />
            HOW IT WORKS
          </Link>
        </div>

        {/* Essentiality Guarantee Pill */}
        <div className="mt-8 flex items-center gap-2 text-xs text-chog-muted">
          <Shield className="w-4 h-4 text-chog-energy" />
          <span>Hard NFT Gate: Removes the NFT? The agent cannot spawn.</span>
        </div>
      </section>

      {/* 3-Step "How It Works" Strip */}
      <section className="bg-gradient-to-r from-chog-card via-chog-surface1 to-chog-card border border-chog-lineBright/50 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="text-center mb-6">
          <span className="text-xs uppercase tracking-widest text-chog-purpleSoft font-bold">
            Autonomous Mechanics
          </span>
          <h2 className="font-koulen text-3xl sm:text-4xl text-white tracking-wide mt-1">
            HOW IT WORKS IN 3 STEPS
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Step 1 */}
          <div className="p-5 rounded-2xl bg-chog-surface2/60 border border-chog-line flex flex-col gap-3 relative">
            <div className="w-10 h-10 rounded-xl bg-chog-purple/20 text-chog-purple flex items-center justify-center font-bold text-sm">
              <span className="font-mono text-chog-purpleSoft font-bold">01</span>
            </div>
            <div>
              <h3 className="font-koulen text-xl text-white tracking-wide">CONNECT & VERIFY</h3>
              <p className="text-sm text-chog-muted mt-1 leading-relaxed">
                Connect your Monad wallet. Live on-chain verification confirms token ownership against the official Genesis contract.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-2xl bg-chog-surface2/60 border border-chog-line flex flex-col gap-3 relative">
            <div className="w-10 h-10 rounded-xl bg-chog-energy/20 text-chog-energy flex items-center justify-center font-bold text-sm">
              <span className="font-mono text-chog-energy font-bold">02</span>
            </div>
            <div>
              <h3 className="font-koulen text-xl text-white tracking-wide">COMPILE POLICY</h3>
              <p className="text-sm text-chog-muted mt-1 leading-relaxed">
                Authentic traits compile into mathematical parameters: speed, energy pool, target priority, and hazard risk appetite.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-2xl bg-chog-surface2/60 border border-chog-line flex flex-col gap-3 relative">
            <div className="w-10 h-10 rounded-xl bg-chog-gold/20 text-chog-gold flex items-center justify-center font-bold text-sm">
              <span className="font-mono text-chog-gold font-bold">03</span>
            </div>
            <div>
              <h3 className="font-koulen text-xl text-white tracking-wide">COMPETE & INSPECT</h3>
              <p className="text-sm text-chog-muted mt-1 leading-relaxed">
                Watch deterministic execution in real time. Scrub turn-by-turn to read the exact policy reasoning behind every move.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Game Modes Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Mode 1: Arena */}
        <div className="bg-chog-card border border-chog-line hover:border-chog-lineBright rounded-2xl p-6 flex flex-col justify-between transition-all group shadow-md">
          <div>
            <div className="w-12 h-12 rounded-xl bg-chog-purple/20 text-chog-purple flex items-center justify-center mb-4">
              <Compass className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-chog-purpleSoft uppercase tracking-wider block">
              Core Loop
            </span>
            <h3 className="font-koulen text-2xl text-white mt-1">Autonomous Arena</h3>
            <p className="text-sm text-chog-muted mt-2 leading-relaxed">
              Spawn your verified Chog against preset opponents or saved player ghosts in an energy-limited grid arena with dynamic hazards and resource nodes.
            </p>
          </div>
          <Link
            href="/arena"
            className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-chog-purpleSoft group-hover:text-white transition-colors"
          >
            Enter Arena <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mode 2: Trait Lab */}
        <div className="bg-chog-card border border-chog-line hover:border-chog-lineBright rounded-2xl p-6 flex flex-col justify-between transition-all group relative overflow-hidden shadow-md">
          <div className="absolute top-3.5 right-3.5 px-2.5 py-0.5 rounded bg-chog-diverge/20 border border-chog-diverge/40 text-xs font-bold text-chog-diverge">
            NOVELTY 30%
          </div>
          <div>
            <div className="w-12 h-12 rounded-xl bg-chog-diverge/20 text-chog-diverge flex items-center justify-center mb-4">
              <Cpu className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-chog-diverge uppercase tracking-wider block">
              Counterfactual Engine
            </span>
            <h3 className="font-koulen text-2xl text-white mt-1">Trait Lab</h3>
            <p className="text-sm text-chog-muted mt-2 leading-relaxed">
              Mutate a single trait parameter on any replay. Run both seeds side by side and watch the exact turn where the agent’s pathfinding diverges!
            </p>
          </div>
          <Link
            href="/lab"
            className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-chog-diverge group-hover:text-white transition-colors"
          >
            Open Trait Lab <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mode 3: Daily Gauntlet */}
        <div className="bg-chog-card border border-chog-line hover:border-chog-lineBright rounded-2xl p-6 flex flex-col justify-between transition-all group relative overflow-hidden shadow-md">
          <div className="absolute top-3.5 right-3.5 px-2.5 py-0.5 rounded bg-chog-gold/20 border border-chog-gold/40 text-xs font-bold text-chog-gold">
            RETENTION 20%
          </div>
          <div>
            <div className="w-12 h-12 rounded-xl bg-chog-gold/20 text-chog-gold flex items-center justify-center mb-4">
              <Award className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-chog-gold uppercase tracking-wider block">
              Global UTC Seed
            </span>
            <h3 className="font-koulen text-2xl text-white mt-1">Daily Gauntlet</h3>
            <p className="text-sm text-chog-muted mt-2 leading-relaxed">
              One shared arena seed per UTC day for all players. Scores are re-simulated and cryptographically verified on the server before entering the leaderboard.
            </p>
          </div>
          <Link
            href="/gauntlet"
            className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-chog-gold group-hover:text-white transition-colors"
          >
            Play Daily Gauntlet <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Verified Collection Showcase */}
      <section className="bg-chog-surface1/50 border border-chog-line rounded-3xl p-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-chog-energy" />
              <h2 className="font-koulen text-3xl text-white tracking-wide">
                AUTHENTIC CHOG GENESIS COLLECTION
              </h2>
            </div>
            <p className="text-sm text-chog-muted mt-1">
              Source contract <code className="font-mono text-chog-text">0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763</code> on Monad Mainnet (1,969 tokens).
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-chog-surface2 border border-chog-line hover:border-chog-lineBright text-xs text-white cursor-pointer font-medium"
          >
            Browse All Fixtures
          </button>
        </div>

        {/* Sample Chog Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {fixturesManifest.slice(0, 4).map((f: any) => (
            <div
              key={f.tokenId}
              onClick={() => {
                const chog: ChogNFT = {
                  tokenId: f.tokenId,
                  name: f.name,
                  image: f.image,
                  attributes: f.traits
                };
                handleSelectChog(chog, {} as any, false);
              }}
              className="bg-chog-card border border-chog-line hover:border-chog-lineBright rounded-xl p-3.5 flex flex-col gap-3 cursor-pointer group transition-all"
            >
              <div className="aspect-square w-full rounded-lg overflow-hidden bg-black/40 relative">
                <ChogImage
                  tokenId={f.tokenId}
                  alt={f.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded bg-black/80 text-xs font-mono text-chog-gold font-bold">
                  #{f.tokenId}
                </div>
              </div>
              <div>
                <h4 className="font-koulen text-lg text-white truncate">{f.name}</h4>
                <span className="text-xs text-chog-muted block truncate mt-0.5">
                  {f.traits?.find((t: any) => t.trait_type === 'Skin')?.value || 'Origin'} Skin
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Chog Select Modal */}
      <ChogSelectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleSelectChog}
        userAddress={address}
      />
    </div>
  );
}
