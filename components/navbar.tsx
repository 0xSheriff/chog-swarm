'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { getChogTokenBalance } from '@/lib/monad-chain';
import { Shield, Sparkles, Wallet, Flame, AlertCircle, Zap } from 'lucide-react';
import { AudioControls } from '@/components/audio-controls';

export function Navbar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [chogBal, setChogBal] = useState<string>('0');

  const isWrongNetwork = isConnected && chainId !== 143;

  useEffect(() => {
    if (address && isConnected) {
      getChogTokenBalance(address).then(res => setChogBal(res.formatted));
    } else {
      setChogBal('0');
    }
  }, [address, isConnected]);

  const navLinks = [
    { href: '/', label: 'Overview' },
    { href: '/arena', label: 'Arena' },
    { href: '/lab', label: 'Trait Lab' },
    { href: '/gauntlet', label: 'Daily Gauntlet' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/demo', label: 'Exhibition Replay' },
  ];

  return (
    <>
      {/* Wrong Network Banner */}
      {isWrongNetwork && (
        <div className="w-full bg-gradient-to-r from-red-950 via-amber-950 to-red-950 border-b border-red-500/60 px-4 py-2.5 text-xs font-mono text-white flex flex-col sm:flex-row items-center justify-between gap-2 shadow-lg sticky top-0 z-50 animate-in fade-in">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
            <span>
              Wrong Network: Connected to Chain ID {chainId}. Chog Swarm requires Monad Mainnet (Chain ID 143).
            </span>
          </div>
          <button
            onClick={() => switchChain({ chainId: 143 })}
            className="px-3.5 py-1 rounded-lg bg-chog-purple hover:bg-chog-purpleSoft text-white font-bold transition-all shadow-md text-xs cursor-pointer flex-shrink-0"
          >
            Switch to Monad (143)
          </button>
        </div>
      )}

      <header className="sticky top-0 z-40 w-full border-b border-chog-line bg-[#0a0712]/80 backdrop-blur-md">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4 py-3">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl p-0.5 bg-gradient-to-br from-pumpkin to-ember shadow-lg shadow-pumpkin/25 overflow-hidden transition-transform group-hover:scale-105">
              <img
                src="/frame1.jpg"
                alt="Chog Swarm Flame Logo"
                className="w-full h-full object-cover rounded-[10px]"
              />
            </div>
            <div>
              <span className="font-pirata text-3xl tracking-wide text-bone flex items-center gap-1.5 leading-none">
                CHOG <span className="text-pumpkin">SWARM</span>
              </span>
              <span className="block text-[10px] font-mono tracking-widest text-chog-muted uppercase mt-0.5">
                Autonomous Agent Arena
              </span>
            </div>
          </Link>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-1 bg-chog-surface1/60 p-1 rounded-xl border border-chog-line">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-chog-purple text-white shadow-sm font-semibold'
                      : 'text-chog-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Wallet & Controls */}
          <div className="flex items-center gap-2.5">
            {/* $CHOG token balance pill */}
            {isConnected && Number(chogBal.replace(/,/g, '')) > 0 && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-chog-surface2 border border-chog-gold/40 rounded-full text-xs font-mono text-chog-gold">
                <Flame className="w-3.5 h-3.5 text-chog-gold" />
                <span>{chogBal} $CHOG</span>
              </div>
            )}

            {/* RainbowKit Connect Button */}
            <ConnectButton
              showBalance={false}
              chainStatus={{ smallScreen: 'none', largeScreen: 'full' }}
              accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
            />

            {/* Halloween Synthesized Web Audio Controls */}
            <AudioControls />
          </div>
        </div>
      </header>
    </>
  );
}
