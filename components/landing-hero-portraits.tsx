'use client';

import React, { useRef, useState, useEffect } from 'react';

interface PortraitConfig {
  id: number;
  src: string;
  name: string;
  title: string;
  rotation: number;
  idleClass: string;
  borderColor: string;
  glowColor: string;
}

const PORTRAITS: PortraitConfig[] = [
  {
    id: 1,
    src: '/frame1.jpg',
    name: 'FLAME CHOG',
    title: 'Cape of Embers',
    rotation: -3,
    idleClass: 'idle-flicker',
    borderColor: 'border-pumpkin/50',
    glowColor: 'shadow-[0_0_25px_rgba(255,122,26,0.4)]',
  },
  {
    id: 2,
    src: '/frame2-eth-cap-skeleton.JPG',
    name: 'SKULLY ETH',
    title: 'Purple Mist Specimen',
    rotation: 2,
    idleClass: 'idle-sway-1',
    borderColor: 'border-purple-500/50',
    glowColor: 'shadow-[0_0_25px_rgba(131,110,249,0.35)]',
  },
  {
    id: 3,
    src: '/frame3-top-hat-skeleton.JPG',
    name: 'BARON SKULL',
    title: 'Gilded Top Hat',
    rotation: -2,
    idleClass: 'idle-sway-2',
    borderColor: 'border-pink-500/50',
    glowColor: 'shadow-[0_0_25px_rgba(255,98,137,0.35)]',
  },
  {
    id: 4,
    src: '/frame4-flaming-skull.JPG',
    name: 'BLAZING SKULL',
    title: 'Infernal Core',
    rotation: 3,
    idleClass: 'idle-pulse',
    borderColor: 'border-ember/60',
    glowColor: 'shadow-[0_0_30px_rgba(255,59,31,0.5)]',
  },
];

export function LandingHeroPortraits() {
  const [eyeFlash, setEyeFlash] = useState(false);

  // Eye flash interval: every 45-90 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const scheduleFlash = () => {
      const delay = (45 + Math.random() * 45) * 1000;
      timer = setTimeout(() => {
        setEyeFlash(true);
        setTimeout(() => setEyeFlash(false), 220);
        scheduleFlash();
      }, delay);
    };
    scheduleFlash();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto my-8 px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 items-center justify-center">
        {PORTRAITS.map((p) => (
          <TiltPortrait key={p.id} portrait={p} eyeFlash={eyeFlash} />
        ))}
      </div>
    </div>
  );
}

function TiltPortrait({ portrait, eyeFlash }: { portrait: PortraitConfig; eyeFlash: boolean }) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, glareX: 50, glareY: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Range -1 to 1
    const nx = (x / rect.width) * 2 - 1;
    const ny = (y / rect.height) * 2 - 1;

    // Max 8 degrees on each axis
    const rx = -ny * 8;
    const ry = nx * 8;

    setTilt({
      rx,
      ry,
      glareX: (x / rect.width) * 100,
      glareY: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ rx: 0, ry: 0, glareX: 50, glareY: 50 });
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative cursor-pointer group select-none"
      style={{
        perspective: '900px',
      }}
    >
      <div
        className={`relative rounded-2xl p-2.5 bg-[#0a0712]/80 backdrop-blur-md border ${portrait.borderColor} ${portrait.glowColor} transition-transform duration-150 ease-out ${portrait.idleClass}`}
        style={{
          transform: `rotate(${portrait.rotation}deg) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Tombstone Frame Image Container */}
        <div className="relative w-full aspect-square overflow-hidden rounded-xl border border-bone/20 bg-black/60 tombstone-frame">
          <img
            src={portrait.src}
            alt={portrait.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />

          {/* Glare Layer */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-200"
            style={{
              opacity: isHovered ? 0.35 : 0.08,
              background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.7) 0%, transparent 60%)`,
            }}
          />

          {/* Eye Flash overlay */}
          {eyeFlash && (
            <div className="absolute inset-0 pointer-events-none bg-amber-300/40 mix-blend-color-dodge animate-pulse" />
          )}

          {/* Outer stone bevel inner shadow */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(10,7,18,0.8)]" />
        </div>

        {/* Nameplate */}
        <div className="mt-2.5 text-center px-1">
          <div className="font-pirata text-lg tracking-wide text-bone group-hover:text-pumpkin transition-colors leading-tight">
            {portrait.name}
          </div>
          <div className="text-[10px] font-mono tracking-widest text-chog-muted uppercase">
            {portrait.title}
          </div>
        </div>
      </div>
    </div>
  );
}
