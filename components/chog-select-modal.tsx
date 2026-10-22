'use client';

import React, { useState, useEffect } from 'react';
import { ChogNFT, CompiledPolicy } from '@engine/types';
import { compilePolicy } from '@engine/compiler';
import { verifyChogOwnershipOnChain } from '@/lib/monad-chain';
import fixturesManifest from '@/fixtures/manifest.json';
import { ChogImage } from '@/components/chog-image';
import { Search, Shield, AlertTriangle, CheckCircle, X, Sparkles, Wallet, RefreshCw } from 'lucide-react';
import { useAccessSession } from '@/components/access-context';

interface ChogSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (chog: ChogNFT, policy: CompiledPolicy, isVerified: boolean) => void;
  userAddress?: string;
}

export function ChogSelectModal({
  isOpen,
  onClose,
  onSelect,
  userAddress,
}: ChogSelectModalProps) {
  const { session } = useAccessSession();
  const [search, setSearch] = useState<string>('');
  const [selectedTokenId, setSelectedTokenId] = useState<number>(143);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'owned' | 'all'>('all');
  const [isLoadingOwned, setIsLoadingOwned] = useState<boolean>(false);
  const [ownedChogs, setOwnedChogs] = useState<ChogNFT[]>([]);
  const [availableChogs, setAvailableChogs] = useState<ChogNFT[]>([]);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    owner: string | null;
    error?: string;
  } | null>(null);

  // Load curated fixtures as base candidates
  useEffect(() => {
    const loaded: ChogNFT[] = fixturesManifest.map((f: any) => ({
      tokenId: f.tokenId,
      name: f.name,
      image: f.image,
      attributes: f.traits,
    }));
    setAvailableChogs(loaded);
  }, []);

  // Fetch owned Chogs from wallet endpoint
  useEffect(() => {
    if (!isOpen || !userAddress) {
      setOwnedChogs([]);
      return;
    }

    let isMounted = true;
    setIsLoadingOwned(true);

    fetch(`/api/wallet/chogs?address=${userAddress}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.ownedChogs && Array.isArray(data.ownedChogs)) {
          setOwnedChogs(data.ownedChogs);
          if (data.ownedChogs.length > 0) {
            setActiveTab('owned');
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load owned chogs:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingOwned(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, userAddress]);

  if (!isOpen) return null;

  const currentList = activeTab === 'owned' ? ownedChogs : availableChogs;

  const filteredChogs = currentList.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      String(c.tokenId).includes(search)
  );

  const handleChooseChog = async (chog: ChogNFT) => {
    setIsVerifying(true);
    setSelectedTokenId(chog.tokenId);

    // Pass verification if user holds creator or judge session pass
    if (session?.creatorPass || session?.judgePass) {
      const verifiedResult = {
        verified: true,
        owner: userAddress || 'Access Pass Holder',
      };
      setVerificationResult(verifiedResult);
      setIsVerifying(false);
      const policy = compilePolicy(chog);
      onSelect(chog, policy, true);
      return;
    }

    // On-Chain verification against Monad Mainnet
    const result = await verifyChogOwnershipOnChain(userAddress, chog.tokenId);
    setVerificationResult(result);
    setIsVerifying(false);

    const policy = compilePolicy(chog);
    onSelect(chog, policy, result.verified);
  };

  const handleManualIdLookup = async (id: number) => {
    if (id < 1 || id > 1969) return;
    try {
      setIsVerifying(true);
      const res = await fetch(`/api/chogs/${id}`);
      if (!res.ok) throw new Error('Failed to load metadata');
      const data = await res.json();
      await handleChooseChog(data);
    } catch (e: any) {
      setVerificationResult({ verified: false, owner: null, error: e.message });
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0712]/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl glass-panel p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-chog-line pb-4">
          <div>
            <h2 className="font-koulen text-3xl text-white tracking-wide flex items-center gap-2">
              SELECT YOUR <span className="text-chog-purple">CHOG NFT</span>
            </h2>
            <p className="text-xs font-mono text-chog-muted">
              Choose an owned Chog from your wallet or select from the collection
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-chog-line hover:border-chog-lineBright text-chog-muted hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector: My Owned Chogs vs All Collection */}
        <div className="flex items-center gap-2 border-b border-chog-line pb-2">
          {userAddress && (
            <button
              onClick={() => setActiveTab('owned')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'owned'
                  ? 'bg-chog-purple text-white shadow-md'
                  : 'bg-chog-surface1 text-chog-muted hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>My Owned Chogs</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
                {isLoadingOwned ? '...' : ownedChogs.length}
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-chog-purple text-white shadow-md'
                : 'bg-chog-surface1 text-chog-muted hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Curated Roster</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
              1,969
            </span>
          </button>
        </div>

        {/* Search & Manual Token ID Input */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-chog-muted" />
            <input
              type="text"
              placeholder="Search by ID or trait (e.g. 143, Pink, MCGA)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-chog-surface1 border border-chog-line rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-chog-muted focus:outline-none focus:border-chog-purple"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={1969}
              placeholder="ID #"
              className="w-24 bg-chog-surface1 border border-chog-line rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-chog-purple"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = parseInt((e.target as HTMLInputElement).value, 10);
                  if (val) handleManualIdLookup(val);
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = e.currentTarget.previousSibling as HTMLInputElement;
                const val = parseInt(input.value, 10);
                if (val) handleManualIdLookup(val);
              }}
              className="px-3 py-2 rounded-xl bg-chog-surface1 border border-chog-line hover:border-chog-lineBright text-xs font-mono text-chog-text font-bold cursor-pointer"
            >
              Lookup
            </button>
          </div>
        </div>

        {/* Verification Alert Callout */}
        {verificationResult && (
          <div
            className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2.5 ${
              verificationResult.verified
                ? 'bg-green-950/40 border-green-500/50 text-green-300'
                : 'bg-red-950/40 border-red-500/50 text-red-200'
            }`}
          >
            {verificationResult.verified ? (
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold">
                {verificationResult.verified
                  ? 'On-Chain Ownership Verified!'
                  : 'Ownership Verification Failed'}
              </div>
              <p className="text-[11px] opacity-90 mt-0.5">
                {verificationResult.error ||
                  `Verified on Monad Mainnet for ${verificationResult.owner}. Essentiality passed.`}
              </p>
            </div>
          </div>
        )}

        {/* Chogs Grid */}
        <div className="flex-1 overflow-y-auto min-h-[260px] max-h-[380px] pr-1">
          {isLoadingOwned && activeTab === 'owned' ? (
            <div className="flex flex-col items-center justify-center h-48 text-chog-muted text-xs font-mono gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-chog-purple" />
              <span>Scanning Monad Mainnet for wallet NFTs...</span>
            </div>
          ) : activeTab === 'owned' && filteredChogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center p-6 rounded-xl bg-chog-surface1/40 border border-chog-line text-xs font-mono text-chog-muted gap-2">
              <Wallet className="w-8 h-8 text-chog-muted mb-1" />
              <span className="text-white font-bold">No Chog NFTs Found in Connected Wallet</span>
              <p className="max-w-xs text-[11px]">
                Wallet {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)} does not hold Chog Genesis tokens. You can browse the curated roster or enter a Token ID to inspect policies.
              </p>
              <button
                onClick={() => setActiveTab('all')}
                className="mt-2 px-3 py-1.5 rounded-lg bg-chog-purple hover:bg-chog-purpleSoft text-white text-xs font-bold"
              >
                Browse Curated Roster
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredChogs.map((chog) => {
                const isSelected = selectedTokenId === chog.tokenId;
                return (
                  <div
                    key={chog.tokenId}
                    onClick={() => handleChooseChog(chog)}
                    className={`p-2 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 group ${
                      isSelected
                        ? 'border-chog-primary bg-chog-primary/10'
                        : 'border-chog-line bg-chog-card hover:border-chog-lineBright'
                    }`}
                  >
                    <div className="aspect-square w-full rounded-lg overflow-hidden bg-black/40 relative">
                      <ChogImage
                        tokenId={chog.tokenId}
                        alt={chog.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-chog-gold font-bold">
                        #{chog.tokenId}
                      </div>
                      {activeTab === 'owned' && (
                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-green-500/80 text-[8px] font-mono text-white font-bold uppercase tracking-wider">
                          Verified Owner
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-koulen text-base text-white tracking-wide truncate">
                        {chog.name}
                      </h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {chog.attributes?.slice(0, 2).map((a, i) => (
                          <span
                            key={i}
                            className="text-[9px] font-mono px-1 py-0.5 rounded bg-white/5 text-chog-muted truncate max-w-[80px]"
                          >
                            {a.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-chog-line pt-3 flex items-center justify-between text-xs font-mono text-chog-muted">
          <span>Chog Genesis Collection: 1,969 tokens</span>
          <span className="text-chog-purpleSoft font-bold">Monad Mainnet (143)</span>
        </div>
      </div>
    </div>
  );
}
