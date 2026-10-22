'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccessSession } from './access-context';
import { ShieldX, ExternalLink, Play, KeyRound, Skull, Lock, ArrowRight, RefreshCw } from 'lucide-react';
import { CHOG_GENESIS_ADDRESS } from '@/lib/constants';

interface AccessBlockedProps {
  customTitle?: string;
  customMessage?: string;
}

export function AccessBlocked({ customTitle, customMessage }: AccessBlockedProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const {
    session,
    isLoading,
    isBlocked,
    blockReason,
    needsSignature,
    signAndVerify,
    enterJudgeCode,
  } = useAccessSession();

  const [judgeCodeInput, setJudgeCodeInput] = useState('');
  const [judgeError, setJudgeError] = useState<string | null>(null);
  const [isSubmittingJudge, setIsSubmittingJudge] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const shortenedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const handleSign = async () => {
    setIsSigning(true);
    try {
      await signAndVerify();
    } finally {
      setIsSigning(false);
    }
  };

  const handleJudgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judgeCodeInput.trim()) return;
    setIsSubmittingJudge(true);
    setJudgeError(null);
    try {
      const res = await enterJudgeCode(judgeCodeInput.trim());
      if (!res.ok) {
        setJudgeError(res.error || 'Invalid Judge Code');
      }
    } finally {
      setIsSubmittingJudge(false);
    }
  };

  return (
    <div
      data-testid="access-blocked-screen"
      className="min-h-[75vh] flex items-center justify-center px-4 py-8 relative z-10"
    >
      <div className="w-full max-w-xl mx-auto rounded-3xl bg-black/80 backdrop-blur-2xl border border-chog-violet/30 p-6 sm:p-8 shadow-[0_0_60px_rgba(131,110,249,0.18)] text-center relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-40 bg-chog-violet/20 rounded-full blur-3xl pointer-events-none" />

        {/* Badge Icon */}
        <div className="relative mx-auto mb-5 w-16 h-16 rounded-2xl bg-gradient-to-b from-purple-900/60 to-black border border-chog-violet/40 flex items-center justify-center shadow-[0_0_25px_rgba(131,110,249,0.3)]">
          <Skull className="w-8 h-8 text-chog-violet" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-950 border border-red-500/60 flex items-center justify-center">
            <Lock className="w-3 h-3 text-red-400" />
          </div>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 font-display">
          {customTitle || 'Chog holders only'}
        </h1>

        {/* Subtitle / Status Message */}
        <div className="text-stone-300 text-sm sm:text-base mb-6 max-w-md mx-auto">
          {isConnected ? (
            <div className="flex flex-col gap-1.5 items-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900/80 border border-stone-700/60 text-xs font-mono text-stone-300">
                Connected: <strong className="text-chog-violet">{shortenedAddress}</strong>
              </span>
              <p className="text-red-400 font-medium">
                {customMessage || blockReason || 'This wallet holds no Chog'}
              </p>
            </div>
          ) : (
            <p className="text-stone-400">
              {customMessage || 'Connect a verified wallet holding a Chog Genesis NFT on Monad to enter the swarm.'}
            </p>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col gap-3 mb-8">
          {/* Sign to Verify Button (if connected but needs signature) */}
          {isConnected && needsSignature && !isBlocked && (
            <button
              onClick={handleSign}
              disabled={isSigning || isLoading}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-chog-violet to-purple-600 hover:from-purple-500 hover:to-chog-violet text-white font-bold text-base shadow-[0_0_25px_rgba(131,110,249,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSigning ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Signing proof in wallet...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-5 h-5" />
                  <span>Sign Proof of Wallet (EIP-4361)</span>
                </>
              )}
            </button>
          )}

          {/* Connect / Switch Wallet Button */}
          <div className="flex items-center justify-center">
            <ConnectButton.Custom>
              {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                return (
                  <div className="w-full">
                    {!connected ? (
                      <button
                        onClick={openConnectModal}
                        type="button"
                        className="w-full py-3 px-5 rounded-xl bg-chog-violet hover:bg-purple-600 text-white font-bold transition-all shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        Connect Monad Wallet
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={openAccountModal}
                          type="button"
                          className="flex-1 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          Switch Wallet
                        </button>
                        <button
                          onClick={() => disconnect()}
                          type="button"
                          className="py-2.5 px-4 rounded-xl bg-stone-900/60 hover:bg-red-950/40 border border-stone-800 hover:border-red-500/50 text-stone-400 hover:text-red-300 text-sm transition-all cursor-pointer"
                        >
                          Disconnect
                        </button>
                      </div>
                    )}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>

          {/* Buy Collection Link */}
          <a
            href={`https://monadscan.com/token/${CHOG_GENESIS_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-stone-900/70 hover:bg-stone-800/80 border border-stone-700/60 hover:border-stone-500 text-stone-200 font-medium text-sm transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-2.5">
              <ExternalLink className="w-4 h-4 text-chog-violet group-hover:scale-110 transition-transform" />
              <span>Get a Chog on Monad</span>
            </div>
            <span className="text-xs text-stone-400 font-mono">1,969 Total Supply</span>
          </a>

          {/* Watch Recorded Demo Replay Link */}
          <Link
            href="/demo"
            className="w-full py-3 px-4 rounded-xl bg-purple-950/30 hover:bg-purple-900/40 border border-chog-violet/30 hover:border-chog-violet/60 text-purple-200 font-medium text-sm transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-2.5">
              <Play className="w-4 h-4 text-amber-400 fill-amber-400 group-hover:scale-110 transition-transform" />
              <span>Watch Recorded Demo Replay</span>
            </div>
            <span className="text-xs text-amber-300 flex items-center gap-1">
              Public Replay <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        {/* Judge Pass Input Section */}
        <div className="pt-5 border-t border-stone-800/80">
          <form onSubmit={handleJudgeSubmit} className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-stone-400 mb-1 px-1">
              <span className="flex items-center gap-1.5 font-medium text-stone-300">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Hackathon Judge Pass
              </span>
              <span className="text-[11px] text-stone-500">24-hour evaluation access</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={judgeCodeInput}
                onChange={(e) => setJudgeCodeInput(e.target.value)}
                placeholder="Enter JUDGE_CODE"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-stone-900/90 border border-stone-700/80 focus:border-amber-400 focus:outline-none text-white text-sm font-mono placeholder:text-stone-600 transition-colors"
              />
              <button
                type="submit"
                disabled={isSubmittingJudge || !judgeCodeInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 hover:border-amber-400 text-amber-300 font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              >
                {isSubmittingJudge ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Enter'}
              </button>
            </div>
            {judgeError && (
              <p className="text-xs text-red-400 mt-1 text-left px-1">{judgeError}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
