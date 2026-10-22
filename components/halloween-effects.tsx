'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { themeFx } from '@/lib/theme-fx';

export function HalloweenEffects() {
  const pathname = usePathname();
  const [transitionActive, setTransitionActive] = useState(false);

  // ─── 1. Glass Panel Specular Sheen (Mouse Relative Pos) ───────────────────
  useEffect(() => {
    if (!themeFx.cardSheen) return;

    let activePanel: HTMLElement | null = null;

    const handlePointerMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const panel = target?.closest('.glass-sheen, .glass-panel') as HTMLElement | null;

      if (panel) {
        activePanel = panel;
        const rect = panel.getBoundingClientRect();
        const px = (((e.clientX - rect.left) / rect.width) * 100).toFixed(1);
        const py = (((e.clientY - rect.top) / rect.height) * 100).toFixed(1);
        panel.style.setProperty('--panel-x', `${px}%`);
        panel.style.setProperty('--panel-y', `${py}%`);
      }
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('mousemove', handlePointerMove);
  }, []);

  // ─── 2. Route Transition Smoke Wipe ───────────────────────────────────────
  useEffect(() => {
    if (!themeFx.pageTransitions) return;

    setTransitionActive(true);
    const timer = setTimeout(() => {
      setTransitionActive(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      {/* Smoke Wipe Screen Transition (450ms) */}
      {transitionActive && (
        <div
          className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
          aria-hidden="true"
        >
          <div className="smoke-wipe w-full h-full bg-[#0a0712]/90 backdrop-blur-md" />
          <style jsx>{`
            .smoke-wipe {
              animation: smokeSweep 450ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
            @keyframes smokeSweep {
              0% {
                opacity: 0;
                transform: scale(1.02);
                filter: blur(12px);
              }
              40% {
                opacity: 0.95;
                filter: blur(4px);
              }
              100% {
                opacity: 0;
                transform: scale(1);
                filter: blur(0px);
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
