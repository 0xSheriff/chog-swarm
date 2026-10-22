'use client';

import React from 'react';
import { useAccessSession } from './access-context';
import { AccessBlocked } from './access-blocked';
import { CreatorBanner } from './creator-banner';
import { Skull } from 'lucide-react';

interface GateGuardProps {
  children: React.ReactNode;
  currentChogId?: number;
  onChangeChogClick?: () => void;
}

export function GateGuard({ children, currentChogId, onChangeChogClick }: GateGuardProps) {
  const { session, isLoading } = useAccessSession();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-chog-violet/20 border border-chog-violet/40 flex items-center justify-center animate-pulse">
          <Skull className="w-6 h-6 text-chog-violet" />
        </div>
        <span className="text-sm text-stone-400 font-mono tracking-wider">Verifying Chog holder credentials...</span>
      </div>
    );
  }

  if (!session) {
    return <AccessBlocked />;
  }

  return (
    <>
      <CreatorBanner currentChogId={currentChogId} onChangeChogClick={onChangeChogClick} />
      {children}
    </>
  );
}
