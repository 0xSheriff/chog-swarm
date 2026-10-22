'use client';

import React, { useEffect, useState, useRef } from 'react';
import { halloweenAudio } from '@/lib/halloween-audio';

export function AudioControls() {
  const [mounted, setMounted] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [masterVol, setMasterVol] = useState(0.8);
  const [musicVol, setMusicVol] = useState(0.35);
  const [sfxVol, setSfxVol] = useState(0.6);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    halloweenAudio.initListeners();
    setIsMuted(halloweenAudio.isMuted);
    setMasterVol(halloweenAudio.masterVolume);
    setMusicVol(halloweenAudio.musicVolume);
    setSfxVol(halloweenAudio.sfxVolume);

    // First visit prompt: check if user already engaged before
    let seenPrompt = false;
    try {
      seenPrompt = localStorage.getItem('chog_audio_prompt_seen') === 'true';
    } catch {
      // ignore
    }

    if (!seenPrompt) {
      setShowPrompt(true);
      const timer = setTimeout(() => {
        setShowPrompt(false);
        try {
          localStorage.setItem('chog_audio_prompt_seen', 'true');
        } catch {
          // ignore
        }
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, []);

  // First user interaction anywhere on window starts audio softly
  useEffect(() => {
    const handleFirstGesture = () => {
      if (!initialized) {
        halloweenAudio.start().then(() => {
          setInitialized(true);
          setShowPrompt(false);
          try {
            localStorage.setItem('chog_audio_prompt_seen', 'true');
          } catch {
            // ignore
          }
        });
      }
    };

    window.addEventListener('click', handleFirstGesture, { once: true, passive: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true, passive: true });

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, [initialized]);

  // Sync state when 'M' key or external mute toggle happens
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === 'm' || e.key === 'M') {
        setTimeout(() => setIsMuted(halloweenAudio.isMuted), 10);
      }
    };
    window.addEventListener('keydown', handleKey);

    const checkState = () => {
      setIsMuted(halloweenAudio.isMuted);
      const stats = halloweenAudio.getStats();
      setInitialized(stats.initialized && stats.state === 'running');
    };
    const interval = setInterval(checkState, 400);
    return () => {
      window.removeEventListener('keydown', handleKey);
      clearInterval(interval);
    };
  }, []);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    if (panelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [panelOpen]);

  const handleSpeakerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!initialized) {
      halloweenAudio.start().then(() => {
        setInitialized(true);
        setShowPrompt(false);
        setIsMuted(halloweenAudio.isMuted);
      });
    } else {
      const muted = halloweenAudio.toggleMute();
      setIsMuted(muted);
    }
  };

  const handleMasterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMasterVol(val);
    halloweenAudio.setMasterVolume(val);
  };

  const handleMusicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMusicVol(val);
    halloweenAudio.setMusicVolume(val);
  };

  const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSfxVol(val);
    halloweenAudio.setSfxVolume(val);
  };

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-lg bg-void/60 border border-chog-line flex items-center justify-center opacity-40">
        <span className="text-xs">🔊</span>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center" ref={panelRef}>
      {/* First-visit non-blocking prompt pill */}
      {showPrompt && !initialized && (
        <div className="absolute right-0 top-12 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-void/90 border border-pumpkin/60 text-amber-200 text-xs shadow-[0_0_15px_rgba(255,122,24,0.35)] backdrop-blur-md animate-fade-in whitespace-nowrap">
          <span className="text-sm">🎃</span>
          <span>Tap anywhere for Halloween soundtrack</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPrompt(false);
              try {
                localStorage.setItem('chog_audio_prompt_seen', 'true');
              } catch {
                // ignore
              }
            }}
            className="text-chog-muted hover:text-bone text-xs font-bold px-1"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Button cluster: Speaker toggle + volume dropdown chevron */}
      <div className="flex items-center bg-void/70 border border-chog-line hover:border-pumpkin/50 rounded-lg transition-colors p-0.5">
        <button
          type="button"
          onClick={handleSpeakerClick}
          className="relative p-1.5 rounded-md hover:bg-pumpkin/15 transition-colors cursor-pointer flex items-center justify-center text-bone"
          title={
            !initialized
              ? 'Tap to start Halloween sound (M to mute)'
              : isMuted
              ? 'Unmute Halloween sound (M)'
              : 'Mute Halloween sound (M)'
          }
          data-testid="audio-toggle-button"
        >
          {/* Audio Speaker Icon */}
          {isMuted ? (
            <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg
              className={`w-4 h-4 ${initialized ? 'text-pumpkin drop-shadow-[0_0_6px_#ff7a18]' : 'text-chog-muted'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}

          {/* Tiny Pumpkin Badge */}
          <span className="absolute -top-1 -right-1 text-[10px] leading-none select-none">
            🎃
          </span>
        </button>

        {/* Chevron for Volume Panel */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPanelOpen(!panelOpen);
          }}
          className="px-1 py-1.5 hover:text-pumpkin text-chog-muted cursor-pointer transition-colors text-[10px]"
          title="Audio Settings"
          data-testid="audio-settings-chevron"
        >
          ▾
        </button>
      </div>

      {/* Volume Slider Panel */}
      {panelOpen && (
        <div className="absolute right-0 top-11 z-50 w-64 p-4 rounded-xl bg-[#0e0919]/95 border border-pumpkin/40 shadow-[0_10px_25px_rgba(0,0,0,0.8),0_0_20px_rgba(255,122,24,0.2)] backdrop-blur-md animate-fade-in flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-chog-line pb-2">
            <span className="text-xs font-mono font-bold text-amber-200 flex items-center gap-1.5">
              <span>🎃</span>
              <span>Halloween Sound</span>
            </span>
            <span className="text-[10px] font-mono text-chog-muted">[M] mute</span>
          </div>

          {/* Master Volume */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-chog-muted">Master</span>
              <span className="font-mono text-bone text-[11px]">{Math.round(masterVol * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVol}
              onChange={handleMasterChange}
              className="accent-pumpkin h-1.5 bg-void/90 rounded-lg cursor-pointer"
            />
          </div>

          {/* Music Volume */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-chog-muted">Music (D Harmonic)</span>
              <span className="font-mono text-bone text-[11px]">{Math.round(musicVol * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={musicVol}
              onChange={handleMusicChange}
              className="accent-pumpkin h-1.5 bg-void/90 rounded-lg cursor-pointer"
            />
          </div>

          {/* SFX Volume */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-chog-muted">SFX & Ambience</span>
              <span className="font-mono text-bone text-[11px]">{Math.round(sfxVol * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={sfxVol}
              onChange={handleSfxChange}
              className="accent-pumpkin h-1.5 bg-void/90 rounded-lg cursor-pointer"
            />
          </div>

          {/* Status Indicator */}
          <div className="pt-2 border-t border-chog-line/60 flex items-center justify-between text-[11px] text-chog-muted">
            <span>Status:</span>
            <span className={initialized ? (isMuted ? 'text-amber-400' : 'text-emerald-400') : 'text-chog-muted'}>
              {!initialized ? 'Awaiting Gesture' : isMuted ? 'Muted' : 'Playing 92 BPM'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
