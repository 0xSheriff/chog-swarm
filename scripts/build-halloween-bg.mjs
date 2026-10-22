import sharp from 'sharp';
import fs from 'fs';

const ROOT = '/Users/mac/Chog-Swarm';
const OUT = ROOT + '/public/halloween/bg';
fs.mkdirSync(OUT, { recursive: true });

const FRAMES = [
  ROOT + '/public/frame1-flame-cape..JPG',
  ROOT + '/public/frame2-eth-cap-skeleton.JPG',
  ROOT + '/public/frame3-top-hat-skeleton.JPG',
  ROOT + '/public/frame4-flaming-skull.JPG',
];

// Process a source into a dark violet-tinted tile buffer (PNG for compositing)
async function tile(src, w, h) {
  return sharp(src)
    .resize(w, h, { fit: 'cover', position: 'center' })
    .modulate({ brightness: 0.38, saturation: 0.85 })
    .tint({ r: 20, g: 8, b: 40 })   // violet-black tint
    .png()
    .toBuffer();
}

// Process a single image for standalone variant (directly to WebP)
async function singleWebp(src, w, h) {
  return sharp(src)
    .resize(w, h, { fit: 'cover', position: 'center' })
    .modulate({ brightness: 0.38, saturation: 0.85 })
    .tint({ r: 20, g: 8, b: 40 })
    .webp({ quality: 80 })
    .toBuffer();
}

async function mosaic(tW, tH, W, H, stagger) {
  const tiles = [];
  for (const f of FRAMES) {
    tiles.push(await tile(f, tW, tH));
  }
  return sharp({
    create: { width: W, height: H, channels: 3, background: { r: 10, g: 7, b: 18 } }
  })
    .composite([
      { input: tiles[0], left: 0,  top: 0 },
      { input: tiles[1], left: tW, top: stagger },
      { input: tiles[2], left: 0,  top: tH },
      { input: tiles[3], left: tW, top: tH + stagger },
    ])
    .webp({ quality: 80 })
    .toBuffer();
}

function save(name, buf) {
  fs.writeFileSync(OUT + '/' + name, buf);
  const kb = (buf.length / 1024).toFixed(0);
  const warn = buf.length > 256000 ? ' ⚠️  OVER 250KB' : '';
  console.log('✓', name.padEnd(20), kb.padStart(5), 'KB' + warn);
}

console.log('🎃 Building Halloween background assets...\n');

save('desktop-bg.webp', await mosaic(960, 560, 1920, 1080, 20));
save('tablet-bg.webp',  await mosaic(640, 376, 1280, 720,  14));
save('mobile-bg.webp',  await mosaic(360, 650, 720,  1280,  0));

for (let i = 0; i < 4; i++) {
  save('bg-frame' + (i+1) + '.webp', await singleWebp(FRAMES[i], 1920, 1080));
}

// clean up debug files
['debug-tile0.png','test-overlay.webp','test-tint.webp'].forEach(f => {
  try { fs.unlinkSync(OUT + '/' + f); } catch {}
});

console.log('\n🎃 Done!');
