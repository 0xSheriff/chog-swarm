'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { getChogTokenBalance } from '@/lib/monad-chain';
import { Shield, Sparkles, Wallet, Flame, AlertCircle, Zap } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [chogBal, setChogBal] = useState<string>('0');
  const [disconnectTestActive, setDisconnectTestActive] = useState<boolean>(false);

  const isWrongNetwork = isConnected && chainId !== 143;

  useEffect(() => {
    if (address && isConnected) {
      getChogTokenBalance(address).then(res => setChogBal(res.formatted));
    } else {
      setChogBal('0');
    }
  }, [address, isConnected]);

  // Sync disconnect test state via localStorage for consistency
  useEffect(() => {
    const isMockDisconnected = localStorage.getItem('chog_disconnect_test') === 'true';
    setDisconnectTestActive(isMockDisconnected);
  }, []);

  const toggleDisconnectTest = () => {
    const nextVal = !disconnectTestActive;
    setDisconnectTestActive(nextVal);
    localStorage.setItem('chog_disconnect_test', String(nextVal));
    window.dispatchEvent(new Event('chog_disconnect_test_changed'));
  };

  const navLinks = [
    { href: '/', label: 'Overview' },
    { href: '/arena', label: 'Arena' },
    { href: '/lab', label: 'Trait Lab' },
    { href: '/gauntlet', label: 'Daily Gauntlet' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/demo', label: 'Recorded Fallback' },
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

      <header className="sticky top-0 z-40 w-full border-b border-chog-line bg-chog-base/85 backdrop-blur-md">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4 py-3">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-chog-purple to-chog-purpleSoft p-0.5 shadow-lg shadow-chog-purple/20">
              <div className="w-full h-full bg-chog-card rounded-[10px] flex items-center justify-center text-chog-purple group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 text-chog-purple fill-chog-purple" />
              </div>
            </div>
            <div>
              <span className="font-koulen text-2xl tracking-wide text-white flex items-center gap-1.5">
                CHOG <span className="text-chog-purple">SWARM</span>
              </span>
              <span className="block text-[10px] font-mono tracking-widest text-chog-muted uppercase -mt-1">
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
            {/* Disconnect Test Switch */}
            <button
              onClick={toggleDisconnectTest}
              title="Toggle Disconnect Test to simulate missing NFT ownership"
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border flex items-center gap-1.5 transition-colors ${
                disconnectTestActive
                  ? 'bg-red-950/60 border-red-500/50 text-red-300 animate-pulse'
                  : 'bg-chog-surface1 border-chog-line text-chog-muted hover:text-white hover:border-chog-lineBright'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Disconnect Test:</span>
              <span className={disconnectTestActive ? 'font-bold text-red-400' : 'text-green-400 font-medium'}>
                {disconnectTestActive ? 'NFT DISCONNECTED' : 'NORMAL'}
              </span>
            </button>

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
          </div>
        </div>
      </header>
    </>
  );
}
