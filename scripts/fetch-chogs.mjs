import fs from 'fs';
import path from 'path';

const IPFS_METADATA_CID = 'bafybeid4ybujnscdipkno7ps5utqelp5ry5ryreqhay3zhgk3a6x4jruqu';
const TOTAL_SUPPLY = 1969;

const GATEWAYS = [
  'https://ipfs.filebase.io/ipfs',
  'https://gateway.pinata.cloud/ipfs',
  'https://nftstorage.link/ipfs',
  'https://cf-ipfs.com/ipfs',
  'https://4everland.io/ipfs',
  'https://storry.tv/ipfs',
  'https://ipfs.io/ipfs',
  'https://w3s.link/ipfs'
];

const METADATA_DIR = path.resolve('data/metadata');
const DATA_FILE = path.resolve('data/chogs.json');
const FIXTURES_DIR = path.resolve('fixtures');
const DOCS_DIR = path.resolve('docs');

if (!fs.existsSync(METADATA_DIR)) fs.mkdirSync(METADATA_DIR, { recursive: true });
if (!fs.existsSync(FIXTURES_DIR)) fs.mkdirSync(FIXTURES_DIR, { recursive: true });
if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

async function fetchWithRetry(id, attempt = 0) {
  const filePath = path.join(METADATA_DIR, `${id}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (existing && existing.name && existing.attributes) return existing;
    } catch (_) {}
  }

  const gw = GATEWAYS[attempt % GATEWAYS.length];
  const url = `${gw}/${IPFS_METADATA_CID}/${id}.json`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data || !data.attributes) throw new Error('Invalid metadata');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    if (attempt < 16) {
      const delay = Math.min(600 * Math.pow(1.2, attempt % 6), 3000);
      await new Promise(r => setTimeout(r, delay));
      return fetchWithRetry(id, attempt + 1);
    }
    throw new Error(`Failed to fetch #${id} after multiple attempts: ${err.message}`);
  }
}

async function fetchImageWithRetry(ipfsUri, destPath, attempt = 0) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) return true;
  const cleanUri = ipfsUri.replace('ipfs://', '');
  const gw = GATEWAYS[attempt % GATEWAYS.length];
  const url = `${gw}/${cleanUri}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 500) throw new Error('File too small');
    fs.writeFileSync(destPath, buffer);
    console.log(`Saved fixture image: ${destPath} (${buffer.length} bytes)`);
    return true;
  } catch (e) {
    if (attempt < 10) {
      await new Promise(r => setTimeout(r, 1000));
      return fetchImageWithRetry(ipfsUri, destPath, attempt + 1);
    }
    console.error(`Failed to download image ${ipfsUri}:`, e.message);
    return false;
  }
}

async function fetchAllMetadata() {
  console.log(`Starting fetch of ${TOTAL_SUPPLY} Chog metadata files...`);
  const queue = Array.from({ length: TOTAL_SUPPLY }, (_, i) => i + 1);
  const CONCURRENCY = 16;
  let completed = 0;
  const results = new Map();

  for (let i = 1; i <= TOTAL_SUPPLY; i++) {
    const filePath = path.join(METADATA_DIR, `${i}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const item = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (item && item.attributes) {
          results.set(i, item);
          completed++;
        }
      } catch (_) {}
    }
  }

  console.log(`Found ${completed} already cached metadata files. Remaining: ${TOTAL_SUPPLY - completed}`);

  const remaining = queue.filter(id => !results.has(id));

  async function worker() {
    while (remaining.length > 0) {
      const id = remaining.shift();
      if (!id) break;
      try {
        const data = await fetchWithRetry(id);
        results.set(id, data);
        completed++;
        if (completed % 100 === 0 || completed === TOTAL_SUPPLY) {
          console.log(`Progress: ${completed}/${TOTAL_SUPPLY} (${Math.round((completed / TOTAL_SUPPLY) * 100)}%)`);
        }
      } catch (e) {
        console.error(`Error fetching ID ${id}:`, e.message);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const allChogs = [];
  for (let i = 1; i <= TOTAL_SUPPLY; i++) {
    if (results.has(i)) {
      allChogs.push({ tokenId: i, ...results.get(i) });
    }
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(allChogs, null, 2));
  console.log(`Saved ${allChogs.length} Chogs to ${DATA_FILE}`);
  return allChogs;
}

async function analyzeTraits(allChogs) {
  console.log('Analyzing trait distributions...');
  const traitDist = {};

  for (const chog of allChogs) {
    if (!chog.attributes) continue;
    for (const attr of chog.attributes) {
      const type = attr.trait_type || 'Unknown';
      const val = String(attr.value);
      if (!traitDist[type]) traitDist[type] = {};
      traitDist[type][val] = (traitDist[type][val] || 0) + 1;
    }
  }

  let doc = `# Chog Genesis (1,969 Total) Trait Distribution Analysis\n\n`;
  doc += `> Source Contract: \`0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763\` on Monad Mainnet (Chain ID 143)\n`;
  doc += `> Total Supply Analyzed: **${allChogs.length} / 1969**\n\n`;
  doc += `## Summary of Categories & Variance\n\n`;
  doc += `| Trait Category | Distinct Values | Most Common Value | Dominance % | Status |\n`;
  doc += `| :--- | :--- | :--- | :--- | :--- |\n`;

  const lowVariance = [];
  const playableTraits = [];

  for (const [category, values] of Object.entries(traitDist)) {
    const totalEntries = Object.values(values).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(values).sort((a, b) => b[1] - a[1]);
    const topVal = sorted[0];
    const topPct = ((topVal[1] / totalEntries) * 100).toFixed(1);
    const isLowVariance = parseFloat(topPct) >= 90.0;

    if (isLowVariance) {
      lowVariance.push({ category, topVal: topVal[0], topPct });
      doc += `| **${category}** | ${Object.keys(values).length} | "${topVal[0]}" (${topVal[1]}) | ${topPct}% | ⚠️ **LOW VARIANCE (>90%) - EXCLUDE FROM GAMEPLAY** |\n`;
    } else {
      playableTraits.push({ category, count: Object.keys(values).length, topPct });
      doc += `| **${category}** | ${Object.keys(values).length} | "${topVal[0]}" (${topVal[1]}) | ${topPct}% | ✅ **High Variance - Core Gameplay Driver** |\n`;
    }
  }

  doc += `\n> [!WARNING]\n`;
  doc += `> **Low-Variance Categories Flagged**: ${lowVariance.map(l => `\`${l.category}\` (${l.topPct}%)`).join(', ')}.\n`;
  doc += `> Per hackathon specifications, these must NOT drive gameplay policy or arena stats.\n\n`;

  doc += `## Detailed Trait Breakdowns\n\n`;

  for (const [category, values] of Object.entries(traitDist)) {
    const totalEntries = Object.values(values).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(values).sort((a, b) => b[1] - a[1]);
    doc += `### Category: ${category} (${Object.keys(values).length} variants)\n\n`;
    doc += `| Value | Count | Frequency % |\n`;
    doc += `| :--- | :--- | :--- |\n`;
    for (const [val, count] of sorted) {
      const pct = ((count / totalEntries) * 100).toFixed(2);
      doc += `| \`${val}\` | ${count} | ${pct}% |\n`;
    }
    doc += `\n`;
  }

  fs.writeFileSync(path.join(DOCS_DIR, 'trait-distribution.md'), doc);
  console.log(`Saved trait distribution analysis to docs/trait-distribution.md`);
  return { traitDist, lowVariance, playableTraits };
}

async function downloadFixtures(allChogs) {
  console.log('Selecting diverse Chog fixtures...');
  // Select 10 diverse Chogs across different Tiers, Skins, Heads, Eyes, Bodies
  const selectedIds = [1, 24, 77, 143, 314, 500, 777, 1024, 1462, 1969];
  const fixturesManifest = [];

  for (const id of selectedIds) {
    const chog = allChogs.find(c => c.tokenId === id) || allChogs[id - 1];
    if (!chog) continue;

    const jsonPath = path.join(FIXTURES_DIR, `chog-${id}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(chog, null, 2));

    const imgPath = path.join(FIXTURES_DIR, `chog-${id}.webp`);
    if (chog.image) {
      await fetchImageWithRetry(chog.image, imgPath);
    }

    fixturesManifest.push({
      tokenId: id,
      name: chog.name,
      json: `fixtures/chog-${id}.json`,
      image: `fixtures/chog-${id}.webp`,
      traits: chog.attributes
    });
  }

  fs.writeFileSync(path.join(FIXTURES_DIR, 'manifest.json'), JSON.stringify(fixturesManifest, null, 2));
  console.log(`Saved ${fixturesManifest.length} fixtures to fixtures/`);
}

async function run() {
  const allChogs = await fetchAllMetadata();
  await analyzeTraits(allChogs);
  await downloadFixtures(allChogs);
  console.log('All discovery tasks completed successfully!');
}

run().catch(console.error);
