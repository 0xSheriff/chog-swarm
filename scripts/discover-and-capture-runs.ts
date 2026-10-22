import fs from 'fs';
import path from 'path';

// Load .env.local into process.env before importing auth-session
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [k, ...v] = trimmed.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}

import { chromium } from 'playwright';
import { signSessionPayload, STANDARD_SESSION_TTL_MS, SESSION_COOKIE_NAME } from '../lib/auth-session';
import fixturesManifest from '../fixtures/manifest.json';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(process.cwd(), 'docs/demo/screenshots');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function main() {
  console.log('--- STARTING DISCOVERY & REAL RUNS ---');
  const browser = await chromium.launch();

  // 1. NON-HOLDER BLOCKED SCREEN (NFT Essentiality Beat)
  console.log('Capturing non-holder blocked screen...');
  const nonHolderCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const nonHolderPage = await nonHolderCtx.newPage();
  await nonHolderPage.goto(`${BASE_URL}/arena`, { waitUntil: 'domcontentloaded' });
  await nonHolderPage.waitForSelector('[data-testid="access-blocked-screen"]', { timeout: 10000 });
  await nonHolderPage.waitForTimeout(1000);
  await nonHolderPage.screenshot({ path: path.join(SCREENSHOT_DIR, '01-non-holder-blocked-arena.png'), fullPage: false });
  await nonHolderCtx.close();

  // 2. CREATOR PASS SESSION SETUP
  console.log('Setting up Creator Pass session...');
  const creatorAddress = '0x0533cda710e375b00d106e557da995b859e5bf94';
  const creatorSessionPayload = {
    address: creatorAddress,
    isHolder: false,
    creatorPass: true,
    judgePass: false,
    selectedChogId: 143,
    issuedAt: Date.now(),
    expiresAt: Date.now() + STANDARD_SESSION_TTL_MS,
    lastHoldingCheck: Date.now(),
  };
  const creatorCookie = signSessionPayload(creatorSessionPayload);

  const creatorCtx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  });
  await creatorCtx.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: creatorCookie,
      domain: 'localhost',
      path: '/',
    },
  ]);

  // 3. OVERVIEW / LANDING PAGE
  console.log('Capturing Landing Page (Overview)...');
  const page = await creatorCtx.newPage();
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-overview-landing.png') });

  // 4. ARENA WITH CREATOR BANNER
  console.log('Capturing Arena with Creator Pass Banner...');
  await page.addInitScript(() => {
    localStorage.setItem('chog_seen_arena_intro', 'true');
  });
  await page.goto(`${BASE_URL}/arena`, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-arena-initial-grid.png') });

  // 5. RUN 5 REAL MATCHES WITH DIFFERENT CHOGS VIA SERVER API
  console.log('Executing 5 real matches with varied Chogs...');
  const testChogs = [
    { tokenId: 143, name: 'Chog #143', traits: [{ trait_type: 'Headwear', value: 'Crown' }, { trait_type: 'Clothes', value: 'Kimono' }, { trait_type: 'Background', value: 'Monad Purple' }] },
    { tokenId: 24, name: 'Chog #24', traits: [{ trait_type: 'Headwear', value: 'Halo' }, { trait_type: 'Clothes', value: 'Armor' }, { trait_type: 'Background', value: 'Electric Blue' }] },
    { tokenId: 1, name: 'Chog #1', traits: [{ trait_type: 'Headwear', value: 'Top Hat' }, { trait_type: 'Clothes', value: 'Tuxedo' }, { trait_type: 'Background', value: 'Gold' }] },
    { tokenId: 10, name: 'Chog #10', traits: [{ trait_type: 'Headwear', value: 'Bandana' }, { trait_type: 'Clothes', value: 'Hoodie' }, { trait_type: 'Background', value: 'Dark Graphite' }] },
    { tokenId: 50, name: 'Chog #50', traits: [{ trait_type: 'Headwear', value: 'Cap' }, { trait_type: 'Clothes', value: 'Jersey' }, { trait_type: 'Background', value: 'Pumpkin Orange' }] },
  ];

  const raceRuns = [];
  const defaultRivals = fixturesManifest.filter(f => f.tokenId !== 143).slice(0, 3).map(f => ({
    chog: { tokenId: f.tokenId, name: f.name, image: f.image, attributes: f.traits }
  }));

  for (let i = 0; i < testChogs.length; i++) {
    const chog = testChogs[i];
    const seed = 2026100 + i * 77;
    const res = await fetch(`${BASE_URL}/api/arena/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION_COOKIE_NAME}=${creatorCookie}`,
      },
      body: JSON.stringify({
        seed,
        rulesVersion: 'race-v1',
        chog: {
          tokenId: chog.tokenId,
          name: chog.name,
          image: `/chogs/${chog.tokenId}.webp`,
          attributes: chog.traits,
        },
        rivals: defaultRivals,
      }),
    });
    const data = await res.json();
    raceRuns.push({
      runNumber: i + 1,
      chogName: chog.name,
      tokenId: chog.tokenId,
      seed,
      winnerId: data.replay?.winnerId,
      matchChecksum: data.replay?.matchChecksum,
      totalTurns: data.replay?.stateHistory?.length,
      finalScores: data.replay?.finalScores,
    });
    console.log(`  Run ${i + 1} (${chog.name}): Winner = ${data.replay?.winnerId}, Checksum = ${data.replay?.matchChecksum}`);
  }

  // Save real runs manifest
  fs.writeFileSync(
    path.join(process.cwd(), 'docs/demo/real-runs-manifest.json'),
    JSON.stringify(raceRuns, null, 2)
  );

  // Capture finished arena race with celebration
  console.log('Capturing Arena Finished State with Winner celebration...');
  const startBtn = await page.locator('button:has-text("START RACE")');
  if (await startBtn.count() > 0) {
    await startBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-arena-finished-race.png') });
  }

  // 6. TRAIT LAB
  console.log('Capturing Trait Lab...');
  await page.goto(`${BASE_URL}/lab`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-trait-lab-baseline.png') });

  // Click on a trait modification button in Trait Lab
  const traitBtn = await page.locator('button:has-text("Top Hat"), button:has-text("Crown"), button:has-text("Halo")').first();
  if (await traitBtn.count() > 0) {
    await traitBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-trait-lab-counterfactual.png') });
  }

  // 7. DAILY GAUNTLET
  console.log('Capturing Daily Gauntlet...');
  await page.goto(`${BASE_URL}/gauntlet`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-daily-gauntlet.png') });

  // 8. LEADERBOARD
  console.log('Capturing Leaderboard...');
  await page.goto(`${BASE_URL}/leaderboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-leaderboard.png') });

  // 9. EXHIBITION REPLAY (DEMO)
  console.log('Capturing Exhibition Replay (/demo)...');
  await page.goto(`${BASE_URL}/demo`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-exhibition-demo-replay.png') });

  await creatorCtx.close();
  await browser.close();
  console.log('--- DISCOVERY & CAPTURE COMPLETE ---');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
