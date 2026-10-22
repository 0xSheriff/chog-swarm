'use client';

import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'chog_force_motion';

export function MotionToggle() {
  const [systemReduced, setSystemReduced] = useState(false);
  const [motionForced, setMotionForced] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let prefersReduced = false;
    try {
      prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      // ignore
    }
    setSystemReduced(prefersReduced);

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') {
        setMotionForced(true);
        document.documentElement.classList.add('motion-forced');
      } else if (stored === 'false') {
        setMotionForced(false);
        document.documentElement.classList.remove('motion-forced');
      } else {
        // default: if not stored, follow system
        setMotionForced(false);
        document.documentElement.classList.remove('motion-forced');
      }
    } catch {
      // localStorage restricted
    }

    const mql = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => {
      setSystemReduced(e.matches);
    };
    mql?.addEventListener?.('change', onChange);
    return () => mql?.removeEventListener?.('change', onChange);
  }, []);

  const toggleMotion = (force?: boolean) => {
    const nextVal = force !== undefined ? force : !motionForced;
    setMotionForced(nextVal);
    try {
      localStorage.setItem(STORAGE_KEY, String(nextVal));
    } catch {
      // ignore
    }
    if (nextVal) {
      document.documentElement.classList.add('motion-forced');
    } else {
      document.documentElement.classList.remove('motion-forced');
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 text-xs text-chog-muted">
        <span>Motion: Auto</span>
      </div>
    );
  }

  // Active state: motion is active if system does not reduce motion OR user forced it on
  const isMotionActive = !systemReduced || motionForced;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 text-xs" data-testid="motion-toggle-container">
      {systemReduced && !motionForced && (
        <span className="text-amber-300/80 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded text-[11px] flex items-center gap-1.5">
          <span>Motion is reduced by your system setting</span>
          <button
            type="button"
            onClick={() => toggleMotion(true)}
            className="text-pumpkin hover:text-amber-200 underline font-semibold cursor-pointer transition-colors"
          >
            Turn on motion anyway
          </button>
        </span>
      )}

      <button
        type="button"
        onClick={() => toggleMotion()}
        className={`px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-mono ${
          isMotionActive
            ? 'bg-pumpkin/15 border-pumpkin/40 text-pumpkin hover:bg-pumpkin/25'
            : 'bg-void/60 border-chog-line text-chog-muted hover:text-bone'
        }`}
        title={
          systemReduced
            ? motionForced
              ? 'Motion forced ON (system reduced motion overridden)'
              : 'Motion OFF (reduced by system setting)'
            : motionForced
            ? 'Motion ON'
            : 'Motion ON (system default)'
        }
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isMotionActive ? 'bg-pumpkin shadow-[0_0_6px_#ff7a18]' : 'bg-chog-muted'
          }`}
        />
        <span>Motion: {isMotionActive ? 'ON' : 'OFF'}</span>
      </button>
    </div>
  );
}
