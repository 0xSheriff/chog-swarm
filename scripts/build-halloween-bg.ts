#!/usr/bin/env node
/**
 * scripts/build-halloween-bg.ts
 * Builds Halloween background WebP assets from the four source JPGs.
 * Run once: npx tsx scripts/build-halloween-bg.ts
 * Outputs to public/halloween/bg/
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'halloween', 'bg');

const FRAMES = [
  path.join(ROOT, 'public', 'frame1-flame-cape..JPG'),
  path.join(ROOT, 'public', 'frame2-eth-cap-skeleton.JPG'),
  path.join(ROOT, 'public', 'frame3-top-hat-skeleton.JPG'),
  path.join(ROOT, 'public', 'frame4-flaming-skull.JPG'),
];

fs.mkdirSync(OUT, { recursive: true });

async function tile(src: string, w: number, h: number): Promise<Buffer> {
  // Darken to ~40% brightness and retain color distinction
  return sharp(src)
    .resize(w, h, { fit: 'cover', position: 'center' })
    .modulate({ brightness: 0.42, saturation: 0.92 })
    .png()
    .toBuffer();
}

async function singleWebp(src: string, w: number, h: number): Promise<Buffer> {
  return sharp(src)
    .resize(w, h, { fit: 'cover', position: 'center' })
    .modulate({ brightness: 0.42, saturation: 0.92 })
    .webp({ quality: 80 })
    .toBuffer();
}

async function mosaic(tW: number, tH: number, W: number, H: number, stagger: number): Promise<Buffer> {
  const tiles: Buffer[] = [];
  for (const f of FRAMES) {
    tiles.push(await tile(f, tW, tH));
  }
  return sharp({
    create: { width: W, height: H, channels: 3, background: { r: 10, g: 7, b: 18 } },
  })
    .composite([
      { input: tiles[0], left: 0, top: 0 },
      { input: tiles[1], left: tW, top: stagger },
      { input: tiles[2], left: 0, top: tH },
      { input: tiles[3], left: tW, top: tH + stagger },
    ])
    .webp({ quality: 80 })
    .toBuffer();
}

// Mobile: 4 images stacked vertically in portrait 720x1280
async function verticalStack(W: number, H: number): Promise<Buffer> {
  const tH = Math.ceil(H / 4);
  const tiles: Buffer[] = [];
  for (const f of FRAMES) {
    tiles.push(await tile(f, W, tH));
  }
  return sharp({
    create: { width: W, height: H, channels: 3, background: { r: 10, g: 7, b: 18 } },
  })
    .composite([
      { input: tiles[0], left: 0, top: 0 },
      { input: tiles[1], left: 0, top: tH },
      { input: tiles[2], left: 0, top: tH * 2 },
      { input: tiles[3], left: 0, top: tH * 3 },
    ])
    .webp({ quality: 80 })
    .toBuffer();
}

function save(name: string, buf: Buffer) {
  fs.writeFileSync(path.join(OUT, name), buf);
  const kb = (buf.length / 1024).toFixed(0);
  console.log('✓', name.padEnd(20), kb.padStart(5), 'KB', buf.length > 256000 ? '⚠️ OVER' : '');
}

export async function buildHalloweenBg() {
  console.log('🎃 Building Halloween background assets...\n');

  save('desktop-bg.webp', await mosaic(960, 560, 1920, 1080, 20));
  save('tablet-bg.webp', await mosaic(640, 376, 1280, 720, 14));
  save('mobile-bg.webp', await verticalStack(720, 1280));

  for (let i = 0; i < 4; i++) {
    save('bg-frame' + (i + 1) + '.webp', await singleWebp(FRAMES[i], 1920, 1080));
  }

  console.log('\n🎃 Done!');
}

if (process.argv[1]?.endsWith('build-halloween-bg.ts')) {
  buildHalloweenBg().catch(console.error);
}
