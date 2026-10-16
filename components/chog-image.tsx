'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface ChogImageProps {
  tokenId: number;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function ChogImage({
  tokenId,
  alt,
  className = '',
  fill = false,
  width,
  height,
  priority = false,
}: ChogImageProps) {
  const [hasError, setHasError] = useState(false);

  // Serve strictly local file
  const localSrc = `/chogs/${tokenId}.webp`;

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-chog-surface2 to-chog-card border border-chog-purpleSoft/30 rounded-xl relative overflow-hidden select-none p-2 ${className}`}
        style={fill ? { width: '100%', height: '100%' } : { width: width || 80, height: height || 80 }}
      >
        <div className="w-8 h-8 rounded-full bg-chog-purple/20 border border-chog-purpleSoft/40 flex items-center justify-center text-chog-purpleSoft">
          <svg className="w-5 h-5 text-chog-purple" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm6 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm-5-5c-2.33 0-4.31 1.46-5.11 3.5h10.22c-.8-2.04-2.78-3.5-5.11-3.5z" />
          </svg>
        </div>
        <span className="font-koulen text-white text-xs tracking-wider mt-1.5">
          CHOG #{tokenId}
        </span>
        <div className="absolute inset-0 bg-chog-purple/5 pointer-events-none" />
      </div>
    );
  }

  return (
    <img
      src={localSrc}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      onError={() => setHasError(true)}
      className={`object-cover ${className}`}
      {...(!fill && width ? { width } : {})}
      {...(!fill && height ? { height } : {})}
    />
  );
}
