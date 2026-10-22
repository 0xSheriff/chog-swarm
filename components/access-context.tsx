'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { buildSiweMessage } from '@/lib/auth-session';

export interface AccessSession {
  address: string;
  isHolder: boolean;
  creatorPass: boolean;
  judgePass: boolean;
  selectedChogId?: number;
  expiresAt: number;
}

interface AccessContextValue {
  session: AccessSession | null;
  isLoading: boolean;
  isBlocked: boolean;
  blockReason: string | null;
  needsSignature: boolean;
  signAndVerify: () => Promise<boolean>;
  enterJudgeCode: (code: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  selectChog: (tokenId: number) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AccessContext = createContext<AccessContextValue | null>(null);

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, status } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [session, setSession] = useState<AccessSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [needsSignature, setNeedsSignature] = useState<boolean>(false);
  const [lastAccount, setLastAccount] = useState<string | null>(null);

  // Fetch current session from server
  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.authenticated && data.session) {
        setSession(data.session);
        setIsBlocked(false);
        setBlockReason(null);
        setNeedsSignature(false);
      } else {
        setSession(null);
      }
    } catch (_) {
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Handle wallet disconnect or account change
  useEffect(() => {
    if (status === 'connecting' || status === 'reconnecting') return;

    if (!isConnected || !address) {
      if (lastAccount !== null) {
        // Disconnected -> clear session
        fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
          setSession(null);
          setIsBlocked(false);
          setBlockReason(null);
          setNeedsSignature(false);
          setLastAccount(null);
        });
      }
      return;
    }

    const currentLc = address.toLowerCase();

    // Account switched!
    if (lastAccount && lastAccount.toLowerCase() !== currentLc) {
      fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
        setSession(null);
        setLastAccount(currentLc);
        setNeedsSignature(true);
      });
      return;
    }

    setLastAccount(currentLc);

    // If connected and we have a session, verify address matches
    if (session) {
      if (session.judgePass) {
        // Judge pass is allowed to persist regardless of connected address
        return;
      }
      if (session.address.toLowerCase() !== currentLc) {
        // Session mismatch
        fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
          setSession(null);
          setNeedsSignature(true);
        });
      }
    } else {
      setNeedsSignature(true);
    }
  }, [address, isConnected, status, session, lastAccount]);

  // Sign SIWE message & verify on server
  const signAndVerify = async (): Promise<boolean> => {
    if (!address) return false;
    setIsLoading(true);
    setBlockReason(null);

    try {
      // 1. Get single-use nonce
      const nonceRes = await fetch('/api/auth/nonce');
      if (!nonceRes.ok) {
        throw new Error('Failed to obtain authentication nonce from server.');
      }
      const { nonce } = await nonceRes.json();

      // 2. Build EIP-4361 message
      const now = new Date();
      const expires = new Date(now.getTime() + 10 * 60 * 1000);
      const domain = typeof window !== 'undefined' ? window.location.host : 'chog.xyz';
      const uri = typeof window !== 'undefined' ? window.location.origin : 'https://chog.xyz';

      const message = buildSiweMessage({
        domain,
        address,
        uri,
        version: '1',
        chainId: 143,
        nonce,
        issuedAt: now.toISOString(),
        expirationTime: expires.toISOString(),
      });

      // 3. User signs message in wallet
      const signature = await signMessageAsync({ message });

      // 4. Verify on server
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        if (verifyRes.status === 403 || verifyData.blocked) {
          setIsBlocked(true);
          setBlockReason(verifyData.error || 'This wallet holds no Chog Genesis NFT.');
        } else {
          setBlockReason(verifyData.error || 'Verification failed. Please retry.');
        }
        setSession(null);
        return false;
      }

      setSession(verifyData.session);
      setIsBlocked(false);
      setBlockReason(null);
      setNeedsSignature(false);
      return true;
    } catch (err: any) {
      console.error('[access-gate] Sign error:', err);
      setBlockReason(err.message || 'Signature rejected or failed.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Enter judge code
  const enterJudgeCode = async (code: string): Promise<{ ok: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, address }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Invalid Judge Code' };
      }
      setSession(data.session);
      setIsBlocked(false);
      setBlockReason(null);
      setNeedsSignature(false);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Network error' };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setSession(null);
      setIsBlocked(false);
      setBlockReason(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Select Chog for Creator / Judge pass
  const selectChog = async (tokenId: number): Promise<void> => {
    try {
      const res = await fetch('/api/auth/select-chog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId }),
      });
      if (res.ok && session) {
        setSession({ ...session, selectedChogId: tokenId });
      }
    } catch (err) {
      console.error('Failed to update selected chog in session:', err);
    }
  };

  return (
    <AccessContext.Provider
      value={{
        session,
        isLoading,
        isBlocked,
        blockReason,
        needsSignature,
        signAndVerify,
        enterJudgeCode,
        logout,
        selectChog,
        refreshSession,
      }}
    >
      {children}
    </AccessContext.Provider>
  );
}

export function useAccessSession() {
  const ctx = useContext(AccessContext);
  if (!ctx) {
    throw new Error('useAccessSession must be used within an AccessProvider');
  }
  return ctx;
}
