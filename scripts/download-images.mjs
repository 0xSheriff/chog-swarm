import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const TOTAL_SUPPLY = 1969;
const IPFS_IMG_CID = 'bafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e';
const TARGET_DIR = path.resolve('public/chogs');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

const GATEWAYS = [
  'https://ipfs.filebase.io/ipfs',
  'https://ipfs.orbitor.dev/ipfs',
  'https://gateway.pinata.cloud/ipfs',
  'https://4everland.io/ipfs',
  'https://storry.tv/ipfs',
  'https://w3s.link/ipfs',
  'https://nftstorage.link/ipfs',
  'https://flk-ipfs.xyz/ipfs'
];

async function downloadAndResize(tokenId, attempt = 0) {
  const destPath = path.join(TARGET_DIR, `${tokenId}.webp`);

  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 2000) {
    return true;
  }

  // Check if we have it in fixtures
  const fixturePath = path.resolve(`fixtures/chog-${tokenId}.webp`);
  if (fs.existsSync(fixturePath) && fs.statSync(fixturePath).size > 2000) {
    try {
      const buf = fs.readFileSync(fixturePath);
      await sharp(buf)
        .resize(512, 512, { fit: 'cover' })
        .webp({ quality: 85 })
        .toFile(destPath);
      return true;
    } catch (_) {}
  }

  const gw = GATEWAYS[attempt % GATEWAYS.length];
  const url = `${gw}/${IPFS_IMG_CID}/${tokenId}.webp`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(7000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    if (buffer.length < 1000) throw new Error('File payload too small');

    await sharp(buffer)
      .resize(512, 512, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(destPath);

    return true;
  } catch (err) {
    if (attempt < 15) {
      const delay = Math.min(500 * Math.pow(1.2, attempt % 5), 3000);
      await new Promise(r => setTimeout(r, delay));
      return downloadAndResize(tokenId, attempt + 1);
    }
    console.error(`Failed to process #${tokenId} after 15 attempts: ${err.message}`);
    return false;
  }
}

async function run() {
  console.log(`Starting download and 512px WebP conversion for ${TOTAL_SUPPLY} Chog images...`);
  const queue = Array.from({ length: TOTAL_SUPPLY }, (_, i) => i + 1);

  let completed = 0;
  for (let i = 1; i <= TOTAL_SUPPLY; i++) {
    const p = path.join(TARGET_DIR, `${i}.webp`);
    if (fs.existsSync(p) && fs.statSync(p).size > 2000) {
      completed++;
    }
  }

  console.log(`Found ${completed} already cached and resized 512px WebP images.`);
  const remaining = queue.filter(id => {
    const p = path.join(TARGET_DIR, `${id}.webp`);
    return !fs.existsSync(p) || fs.statSync(p).size <= 2000;
  });

  const CONCURRENCY = 16;
  async function worker() {
    while (remaining.length > 0) {
      const id = remaining.shift();
      if (!id) break;
      const success = await downloadAndResize(id);
      if (success) completed++;
      if (completed % 50 === 0 || completed === TOTAL_SUPPLY) {
        console.log(`Progress: ${completed}/${TOTAL_SUPPLY} (${Math.round((completed / TOTAL_SUPPLY) * 100)}%)`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  console.log(`Finished processing. Total available in ${TARGET_DIR}: ${completed}/${TOTAL_SUPPLY}`);
}

run().catch(console.error);
