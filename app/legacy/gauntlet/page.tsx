'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { ArenaCanvas } from '@/components/arena-canvas';
import { ReplayScrubber } from '@/components/replay-scrubber';
import { ChogSelectModal } from '@/components/chog-select-modal';
import { ChogNFT, CompiledPolicy, ReplaySnapshot, ArenaConfig, ArenaState } from '@engine/types';
import { compilePolicy } from '@engine/compiler';
import { runFullMatch } from '@engine/engine';
import { getStandardRaceOpponents, createRaceMatch } from '@engine/race-engine';
import { verifyChogOwnershipOnChain } from '@/lib/monad-chain';
import fixturesManifest from '@/fixtures/manifest.json';
import { Award, Zap, Shield, CheckCircle2, Trophy, Clock, AlertTriangle, Users, Target, Flag } from 'lucide-react';
import { LeaderboardEmptyState } from '@/components/leaderboard-empty-state';
import { ArenaLegend } from '@/components/arena-legend';

export default function DailyGauntletPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [dateKey, setDateKey] = useState<string>('');
  const [dailySeed, setDailySeed] = useState<number>(20261015);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const [selectedChog, setSelectedChog] = useState<ChogNFT | null>(null);
  const [compiledPolicy, setCompiledPolicy] = useState<CompiledPolicy | null>(null);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);

  const [isOwnerVerified, setIsOwnerVerified] = useState<boolean>(false);
  const [isDisconnectedTest, setIsDisconnectedTest] = useState<boolean>(false);

  const [replay, setReplay] = useState<ReplaySnapshot | null>(null);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionStatus, setSubmissionStatus] = useState<{
    success: boolean;
    message: string;
    checksum?: string;
  } | null>(null);

  // Load daily gauntlet details
  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/gauntlet/leaderboard');
      const data = await res.json();
      setDateKey(data.dateKey);
      setDailySeed(data.seed);
      setLeaderboard(data.entries || []);
    } catch (_) {}
  };

  useEffect(() => {
    fetchLeaderboard();

    // Default to Chog #143
    const fixture = fixturesManifest.find((f: any) => f.tokenId === 143) || fixturesManifest[3];
    const chogData: ChogNFT = {
      tokenId: fixture.tokenId,
      name: fixture.name,
      image: fixture.image,
      attributes: fixture.traits,
    };
    setSelectedChog(chogData);
    setCompiledPolicy(compilePolicy(chogData));
  }, []);

  // Ownership & Disconnect check
  useEffect(() => {
    const isMockDisconnected = localStorage.getItem('chog_disconnect_test') === 'true';
    setIsDisconnectedTest(isMockDisconnected);

    if (isMockDisconnected) {
      setIsOwnerVerified(false);
      return;
    }

    if (selectedChog) {
      verifyChogOwnershipOnChain(address, selectedChog.tokenId).then(res => {
        setIsOwnerVerified(res.verified);
      });
    }
  }, [address, selectedChog]);

  const handleRunGauntlet = () => {
    if (isDisconnectedTest) {
      alert('Spawn Rejected: Disconnect test is active. Chog NFT ownership required.');
      return;
    }

    if (!selectedChog || !compiledPolicy) return;

    const rivals = getStandardRaceOpponents();
    const config: ArenaConfig = {
      seed: dailySeed,
      rulesVersion: 'race-v1',
      gridWidth: 14,
      gridHeight: 14,
      maxTurns: 40,
      agents: [
        { id: address || selectedChog.name, tokenId: selectedChog.tokenId, name: selectedChog.name, policy: compiledPolicy },
        ...rivals
      ]
    };

    const res = runFullMatch(config);
    setReplay(res);
    setCurrentTurnIndex(0);
    setSubmissionStatus(null);
  };

  const handleSubmitScore = async () => {
    if (!replay || !selectedChog) return;
    if (!address || !isConnected) {
      setSubmissionStatus({
        success: false,
        message: 'Wallet connection required: Please connect your Monad wallet to sign and submit your score.'
      });
      return;
    }

    const finalState = replay.stateHistory[replay.stateHistory.length - 1];
    const playerAgent = finalState.agents.find(a => a.id === (address || selectedChog.name) || a.tokenId === selectedChog.tokenId);
    const finalScore = playerAgent?.score || 0;
    const finishTurn = playerAgent?.finishTurn;
    const expectedChecksum = replay.matchChecksum;
    const messageToSign = `Chog Swarm Gauntlet Score Verification\nAddress: ${address.toLowerCase()}\nSeed: ${dailySeed}\nScore: ${finalScore}\nChecksum: ${expectedChecksum}`;

    setIsSubmitting(true);
    setSubmissionStatus(null);

    try {
      // 1. Request wallet signature
      const signature = await signMessageAsync({ message: messageToSign });

      // 2. Submit signed proof to server for re-simulation and verification
      const res = await fetch('/api/gauntlet/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: address,
          chog: selectedChog,
          claimedScore: finalScore,
          finishTurn,
          seed: dailySeed,
          matchChecksum: expectedChecksum,
          signature,
          message: messageToSign,
          rulesVersion: 'race-v1'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmissionStatus({ success: false, message: data.error || 'Server validation failed' });
      } else {
        setSubmissionStatus({
          success: true,
          message: 'Score verified by server re-simulation and cryptographic signature! Added to Daily Gauntlet leaderboard.',
          checksum: data.matchChecksum
        });
        await fetchLeaderboard();
      }
    } catch (e: any) {
      setSubmissionStatus({ success: false, message: e.message || 'Signature or submission failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeState: ArenaState = replay
    ? replay.stateHistory[currentTurnIndex]
    : createRaceMatch({
        seed: dailySeed,
        rulesVersion: 'race-v1',
        gridWidth: 14,
        gridHeight: 14,
        maxTurns: 40,
        agents: [
          {
            id: address || (selectedChog?.name || 'Player'),
            tokenId: selectedChog?.tokenId || 143,
            name: selectedChog?.name || 'Chog #143',
            policy: compiledPolicy || compilePolicy(fixturesManifest[3] as any)
          },
          ...getStandardRaceOpponents()
        ]
      });

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* 1-Sentence Goal Banner */}
      <div className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-chog-gold/20 via-chog-card to-amber-500/10 border border-chog-gold/30 flex items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-chog-gold/20 border border-chog-gold/40 flex items-center justify-center text-chog-gold flex-shrink-0">
            <Target className="w-5 h-5 text-chog-gold" />
          </div>
          <div>
            <span className="text-xs font-bold text-chog-gold uppercase tracking-wider block">Mode Goal</span>
            <p className="text-sm font-medium text-white">
              Compete on today's globally shared track seed scored by fastest finish time and verified on-chain.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-chog-surface1 border border-chog-line text-xs font-mono text-chog-muted flex-shrink-0">
          <Clock className="w-3.5 h-3.5 text-chog-gold" />
          <span>Resets 00:00 UTC</span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-chog-card border border-chog-line rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-chog-gold" />
            <h1 className="font-koulen text-3xl text-white tracking-wide">
              DAILY <span className="text-chog-gold">GAUNTLET</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded text-xs font-sans bg-chog-gold/20 text-chog-gold border border-chog-gold/30 font-bold">
              RETENTION 20%
            </span>
          </div>
          <p className="text-xs text-chog-muted mt-0.5">
            UTC Day: <code className="text-white font-mono font-bold">{dateKey || '2026-10-15'}</code> • Global Arena Seed: <code className="text-chog-purpleSoft font-mono font-bold">#{dailySeed}</code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSelectModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-chog-surface1 border border-chog-line hover:border-chog-lineBright text-xs text-white flex items-center gap-1.5 font-medium cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-chog-purpleSoft" />
            Change Chog
          </button>

          {isDisconnectedTest ? (
            <button
              disabled
              className="px-5 py-2 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 font-koulen text-lg tracking-wider opacity-75 cursor-not-allowed"
            >
              SPAWN BLOCKED
            </button>
          ) : (
            <button
              onClick={handleRunGauntlet}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-chog-gold to-amber-500 hover:from-chog-gold text-chog-base font-koulen text-lg tracking-wider flex items-center gap-2 shadow-lg shadow-chog-gold/25 transition-all transform hover:-translate-y-0.5 font-bold cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-chog-base" />
              RUN DAILY SEED
            </button>
          )}
        </div>
      </div>

      {/* Disconnect Test Hard Banner if active */}
      {isDisconnectedTest && (
        <div className="p-4 rounded-2xl bg-red-950/60 border-2 border-red-500 flex items-start gap-3 shadow-lg shadow-red-950/30">
          <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-koulen text-xl text-red-200 tracking-wide">
              NFT ESSENTIALITY DISCONNECT TEST: SPAWN REJECTED
            </h4>
            <p className="text-xs font-mono text-red-300 mt-1">
              Gauntlet score submissions require verified on-chain ownership. Toggle the "Disconnect Test" in the header to re-enable live submission testing.
            </p>
          </div>
        </div>
      )}

      {/* Gauntlet Submission Banner */}
      {replay && replay.stateHistory[currentTurnIndex]?.completed && (
        <div className="p-5 rounded-2xl bg-chog-surface1 border border-chog-lineBright flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div>
            <span className="text-[10px] font-mono text-chog-muted uppercase">Gauntlet Run Completed</span>
            <h3 className="font-koulen text-2xl text-white">
              FINAL SCORE: {replay.finalScores[selectedChog?.name || ''] || 0} PTS
            </h3>
            <span className="text-xs font-mono text-chog-muted">
              Checksum: <code>{replay.matchChecksum}</code>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={isSubmitting || !!submissionStatus?.success}
              onClick={handleSubmitScore}
              className={`px-6 py-2.5 rounded-xl font-koulen text-lg tracking-wider transition-all flex items-center gap-2 shadow-lg ${
                submissionStatus?.success
                  ? 'bg-green-600 text-white cursor-default'
                  : 'bg-chog-purple hover:bg-chog-purpleSoft text-white shadow-chog-purple/30'
              }`}
            >
              <Shield className="w-4 h-4" />
              {isSubmitting ? 'RE-SIMULATING ON SERVER...' : (submissionStatus?.success ? 'SUBMITTED & VERIFIED' : 'SUBMIT TO LEADERBOARD')}
            </button>
          </div>
        </div>
      )}

      {/* Submission Feedback Alert */}
      {submissionStatus && (
        <div className={`p-4 rounded-xl border text-xs font-mono flex items-start gap-3 ${
          submissionStatus.success
            ? 'bg-green-950/40 border-green-500/50 text-green-300'
            : 'bg-red-950/40 border-red-500/50 text-red-200'
        }`}>
          {submissionStatus.success ? (
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          )}
          <div>
            <div className="font-bold text-sm">
              {submissionStatus.success ? 'Anti-Cheat Server Re-simulation PASSED' : 'Server Validation Error'}
            </div>
            <p className="mt-0.5 opacity-90">{submissionStatus.message}</p>
            {submissionStatus.checksum && (
              <p className="text-[10px] text-chog-muted mt-1">Verified Server Hash: {submissionStatus.checksum}</p>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Arena & Daily Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Canvas Arena & Scrubber */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <ArenaCanvas
            state={activeState}
            selectedAgentId={selectedChog?.name}
          />

          <ReplayScrubber
            stateHistory={replay ? replay.stateHistory : [activeState]}
            currentTurnIndex={currentTurnIndex}
            onTurnChange={(idx) => setCurrentTurnIndex(idx)}
          />

          <ArenaLegend />
        </div>

        {/* Right: Live Verified Leaderboard */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-chog-card border border-chog-line rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-chog-line mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-chog-gold" />
                <h3 className="font-koulen text-xl text-white tracking-wide">
                  TODAY'S VERIFIED LEADERBOARD
                </h3>
              </div>
              <span className="text-[10px] font-mono text-chog-muted">
                Server Re-simulated
              </span>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {leaderboard.length === 0 ? (
                <LeaderboardEmptyState
                  dateKey={dateKey}
                  seed={dailySeed}
                  onAction={handleRunGauntlet}
                  actionText="Run Gauntlet"
                />
              ) : (
                leaderboard.map((entry, idx) => (
                  <div
                    key={entry.id || idx}
                    className="p-3 rounded-xl bg-chog-surface1/70 border border-chog-line hover:border-chog-lineBright flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                        idx === 0
                          ? 'bg-chog-gold/20 text-chog-gold border border-chog-gold/40'
                          : (idx === 1 ? 'bg-slate-300/20 text-slate-200' : (idx === 2 ? 'bg-amber-700/20 text-amber-500' : 'bg-white/5 text-chog-muted'))
                      }`}>
                        #{entry.rank || idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-white block">{entry.chogName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-chog-muted">
                            {entry.playerAddress.slice(0, 6)}...{entry.playerAddress.slice(-4)}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-chog-purple/20 text-chog-purpleSoft border border-chog-purple/30">
                            Verified Owner
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <div className="flex items-center gap-1.5 text-chog-gold font-bold text-xs">
                        <Flag className="w-3.5 h-3.5 text-chog-gold" />
                        <span>{entry.finishTurn ? `Turn ${entry.finishTurn}` : (entry.hasFinished ? 'Finished' : 'DNF')}</span>
                      </div>
                      <span className="text-chog-energy font-bold text-xs block">
                        {entry.score} pts
                      </span>
                      <span className="text-[9px] text-chog-muted">
                        Hash: {entry.matchChecksum?.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <ChogSelectModal
        isOpen={isSelectModalOpen}
        onClose={() => setIsSelectModalOpen(false)}
        onSelect={(chog, policy, verified) => {
          setSelectedChog(chog);
          setCompiledPolicy(policy);
          setIsOwnerVerified(verified);
          setIsSelectModalOpen(false);
        }}
        userAddress={address}
      />
    </div>
  );
}
