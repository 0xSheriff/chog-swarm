import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ROOT = '/Users/mac/Chog-Swarm';
const SRC = path.join(ROOT, 'public/frame1-flame-cape..JPG');

async function createIco(src, sizes, outPath) {
  const pngBuffers = [];
  for (const size of sizes) {
    const buf = await sharp(src)
      .resize(size, size)
      .ensureAlpha()
      .png({ colorType: 6 })
      .toBuffer();
    pngBuffers.push({ size, buf });
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngBuffers.length, 4);

  let offset = 6 + (16 * pngBuffers.length);
  const dirEntries = [];
  for (const { size, buf } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    offset += buf.length;
  }

  const finalIco = Buffer.concat([header, ...dirEntries, ...pngBuffers.map(p => p.buf)]);
  fs.writeFileSync(outPath, finalIco);
  console.log('✓ Favicon ICO generated:', outPath);
}

export async function buildFavicons() {
  await createIco(SRC, [16, 32, 48], path.join(ROOT, 'app/favicon.ico'));
  await sharp(SRC).resize(180, 180).ensureAlpha().png().toFile(path.join(ROOT, 'app/apple-icon.png'));
  console.log('✓ Apple icon generated: app/apple-icon.png (180x180)');
  await sharp(SRC).resize(512, 512).ensureAlpha().png().toFile(path.join(ROOT, 'app/icon.png'));
  console.log('✓ Icon generated: app/icon.png (512x512)');
  await sharp(SRC).resize(1200, 630, { fit: 'cover' }).ensureAlpha().png().toFile(path.join(ROOT, 'public/og-image.png'));
  console.log('✓ OG image generated: public/og-image.png (1200x630)');
}

if (process.argv[1]?.endsWith('build-favicons.mjs')) {
  buildFavicons().catch(console.error);
}
