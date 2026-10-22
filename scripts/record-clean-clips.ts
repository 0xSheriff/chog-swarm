import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { chromium, Browser, BrowserContext } from 'playwright';

if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [k, ...v] = trimmed.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}

import { signSessionPayload, STANDARD_SESSION_TTL_MS, SESSION_COOKIE_NAME } from '../lib/auth-session';

const CAPTURE_DIR = path.join(process.cwd(), 'assets/capture');
const TMP_REC = path.join(process.cwd(), '.tmp_video_clean');
fs.mkdirSync(CAPTURE_DIR, { recursive: true });
fs.mkdirSync(TMP_REC, { recursive: true });

const BASE_URL = 'http://localhost:3000';

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

function transcodeClip(webmPath: string, outputPath: string, durationSec: number, fps = 60) {
  console.log(`Transcoding ${path.basename(webmPath)} -> ${path.basename(outputPath)} (${durationSec}s @ ${fps}fps)...`);
  execSync(
    `ffmpeg -y -i "${webmPath}" -t ${durationSec} -r ${fps} -c:v libx264 -preset fast -crf 15 -pix_fmt yuv420p "${outputPath}"`
  );
  try { fs.rmSync(webmPath, { force: true }); } catch (_) {}
  const stat = fs.statSync(outputPath);
  console.log(`✓ Produced ${path.basename(outputPath)} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
}

async function recordScene(
  browser: Browser,
  name: string,
  outFileName: string,
  durationSec: number,
  setupFn: (ctx: BrowserContext) => Promise<void>
) {
  const outputPath = path.join(CAPTURE_DIR, outFileName);
  if (fs.existsSync(outputPath) && process.env.FORCE !== 'true') {
    console.log(`\n✓ ${outFileName} already exists. Verifying smoothness...`);
    try {
      execSync(`.venv/bin/python scripts/check-video-smoothness.py "${outputPath}"`, { stdio: 'inherit' });
      console.log(`✓ ${outFileName} passed stutter gate! Skipping re-capture.`);
      const demoMediaDest = path.join(process.cwd(), 'demo-video/assets/media', outFileName);
      fs.copyFileSync(outputPath, demoMediaDest);
      return;
    } catch (_) {
      console.log(`Clip failed verification or needs re-capture. Proceeding with capture.`);
    }
  }

  console.log(`\n================================================================`);
  console.log(`RECORDING: ${name} -> ${outFileName} (${durationSec}s)`);
  console.log(`================================================================`);

  // Clear temp directory
  fs.readdirSync(TMP_REC).forEach(f => {
    try { fs.rmSync(path.join(TMP_REC, f), { force: true }); } catch (_) {}
  });

  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: TMP_REC, size: { width: 1920, height: 1080 } },
  });

  await setupFn(ctx);

  await ctx.close();

  const webmFiles = fs.readdirSync(TMP_REC).filter(f => f.endsWith('.webm'));
  if (webmFiles.length === 0) {
    throw new Error(`No webm file recorded for ${name}`);
  }
  const rawWebm = path.join(TMP_REC, webmFiles[0]);
  transcodeClip(rawWebm, outputPath, durationSec);

  // Copy to demo-video/assets/media as well
  const demoMediaDest = path.join(process.cwd(), 'demo-video/assets/media', outFileName);
  fs.copyFileSync(outputPath, demoMediaDest);
  console.log(`✓ Synchronized to ${demoMediaDest}`);
}

async function main() {
  console.log('=== STARTING HIGH-FIDELITY SMOOTH RE-CAPTURE (NO IN-PAGE CURSOR) ===');

  const browser = await chromium.launch({
    args: [
      '--use-gl=angle',
      '--use-angle=metal',
      '--enable-gpu-rasterization',
      '--ignore-gpu-blocklist',
      '--disable-gpu-vsync',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--no-sandbox',
    ],
  });

  // -------------------------------------------------------------------------
  // 1. SCENE 1: BLOCKED GATE (24s)
  // -------------------------------------------------------------------------
  await recordScene(browser, 'Scene 1: Blocked Gate', 'scene1-nft-essential-blocked.mp4', 24, async (ctx) => {
    const page = await ctx.newPage();
    // Hide default cursor in CSS
    await page.addStyleTag({ content: '* { cursor: none !important; }' });
    await page.goto(`${BASE_URL}/arena`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="access-blocked-screen"]', { timeout: 10000 });

    // Let living background and subtle glow animate across the 24 seconds
    const interval = 200;
    const steps = (24 * 1000) / interval;
    for (let i = 0; i < steps; i++) {
      // Subtle smooth drift of pointer to keep specular sheen and parallax subtly shifting
      const mx = 960 + Math.sin(i * 0.05) * 40;
      const my = 540 + Math.cos(i * 0.04) * 30;
      await page.mouse.move(mx, my);
      await page.waitForTimeout(interval);
    }
  });

  // -------------------------------------------------------------------------
  // 2. SCENE 2: AUTH & SELECT CHOG (26s)
  // -------------------------------------------------------------------------
  await recordScene(browser, 'Scene 2: Auth & Pick', 'scene2-creator-pass-arena.mp4', 26, async (ctx) => {
    await ctx.addCookies([{ name: SESSION_COOKIE_NAME, value: creatorCookie, domain: 'localhost', path: '/' }]);
    const page = await ctx.newPage();
    await page.addStyleTag({ content: '* { cursor: none !important; }' });
    await page.addInitScript(() => { localStorage.setItem('chog_seen_arena_intro', 'true'); });
    await page.goto(`${BASE_URL}/arena`, { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Wait 3s on the arena view
    await page.waitForTimeout(3000);

    // Click "Switch Chog" button to open modal
    const switchBtn = page.locator('button:has-text("Switch Chog")').first();
    if (await switchBtn.count() > 0) {
      await switchBtn.click();
    }
    await page.waitForTimeout(1500);

    // Scroll modal smoothly to show authentic Chog NFTs
    const modalScrollArea = page.locator('.overflow-y-auto, [role="dialog"]').first();
    for (let s = 0; s < 10; s++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(1000);

    // Select Chog #143 or first card
    const chogCard = page.locator('button:has-text("Select"), button:has-text("Chog #143"), .cursor-pointer').nth(1);
    if (await chogCard.count() > 0) {
      await chogCard.click({ force: true });
    }
    await page.waitForTimeout(2000);

    // Remaining time in arena
    const remainingMs = 15000;
    const interval = 200;
    for (let i = 0; i < remainingMs / interval; i++) {
      const mx = 960 + Math.sin(i * 0.05) * 30;
      const my = 540 + Math.cos(i * 0.04) * 20;
      await page.mouse.move(mx, my);
      await page.waitForTimeout(interval);
    }
  });

  // -------------------------------------------------------------------------
  // 3. SCENE 3: CONTINUOUS ARENA RACE TO FINISH (28s)
  // -------------------------------------------------------------------------
  await recordScene(browser, 'Scene 3: Arena Simulation', 'scene3-arena-race-finish.mp4', 28, async (ctx) => {
    await ctx.addCookies([{ name: SESSION_COOKIE_NAME, value: creatorCookie, domain: 'localhost', path: '/' }]);
    const page = await ctx.newPage();
    await page.addStyleTag({ content: '* { cursor: none !important; }' });
    await page.addInitScript(() => { localStorage.setItem('chog_seen_arena_intro', 'true'); });
    await page.goto(`${BASE_URL}/arena`, { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 10000 });

    await page.waitForTimeout(1500);

    // Click START RACE
    const startBtn = page.locator('button:has-text("START RACE")');
    await startBtn.click();
    console.log('Started race! Letting continuous simulation run...');

    // The simulation runs turns automatically! Let's ensure continuous rAF repaints
    // Advance turns progressively across the 24 seconds to reach turn 25 (finish line!)
    const totalRaceTurns = 24;
    const msPerTurn = 900; // ~0.9s per turn
    for (let t = 1; t <= totalRaceTurns; t++) {
      await page.evaluate((turn) => {
        const input = document.querySelector('input[type="range"]') as HTMLInputElement;
        if (input) {
          input.value = String(turn);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, t);
      // Wait msPerTurn while moving mouse slightly for specular reflection
      const subSteps = 5;
      for (let s = 0; s < subSteps; s++) {
        await page.mouse.move(700 + Math.sin(t * 0.5 + s) * 20, 500 + Math.cos(t * 0.5 + s) * 20);
        await page.waitForTimeout(msPerTurn / subSteps);
      }
    }

    // Hold at celebration banner for remaining 4 seconds with lively celebration
    await page.waitForTimeout(4000);
  });

  // -------------------------------------------------------------------------
  // 4. SCENE 4: TRAIT LAB COUNTERFACTUAL (28s)
  // -------------------------------------------------------------------------
  await recordScene(browser, 'Scene 4: Trait Lab', 'scene4-trait-lab-counterfactual.mp4', 28, async (ctx) => {
    await ctx.addCookies([{ name: SESSION_COOKIE_NAME, value: creatorCookie, domain: 'localhost', path: '/' }]);
    const page = await ctx.newPage();
    await page.addStyleTag({ content: '* { cursor: none !important; }' });
    await page.goto(`${BASE_URL}/lab`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Click on mutation tabs/buttons sequentially
    const buttons = ['Eyes', 'Aura', 'Side', 'Headwear'];
    for (const btnText of buttons) {
      const btn = page.locator(`button:has-text("${btnText}")`).first();
      if (await btn.count() > 0) {
        await btn.click();
        console.log(`Clicked mutation: ${btnText}`);
      }
      await page.waitForTimeout(4500);
    }
    // Remaining time
    await page.waitForTimeout(8000);
  });

  // -------------------------------------------------------------------------
  // 5. SCENE 5: DAILY GAUNTLET & VERIFICATION (26s)
  // -------------------------------------------------------------------------
  await recordScene(browser, 'Scene 5: Daily Gauntlet', 'scene5-daily-gauntlet.mp4', 26, async (ctx) => {
    await ctx.addCookies([{ name: SESSION_COOKIE_NAME, value: creatorCookie, domain: 'localhost', path: '/' }]);
    const page = await ctx.newPage();
    await page.addStyleTag({ content: '* { cursor: none !important; }' });
    await page.goto(`${BASE_URL}/gauntlet`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Click "RUN DAILY SEED"
    const runBtn = page.locator('button:has-text("RUN DAILY SEED"), button:has-text("SIMULATE GAUNTLET")').first();
    if (await runBtn.count() > 0) {
      await runBtn.click();
      console.log('Clicked RUN DAILY SEED');
    }
    await page.waitForTimeout(5000);

    // Scroll down to inspect leaderboard / anti-cheat verification section
    for (let s = 0; s < 12; s++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(350);
    }
    await page.waitForTimeout(13000);
  });

  // -------------------------------------------------------------------------
  // 6. SCENE 6: REAL LEADERBOARD & REPLAY SHOWCASE (20s)
  // -------------------------------------------------------------------------
  await recordScene(browser, 'Scene 6: Leaderboard', 'scene6-leaderboard.mp4', 20, async (ctx) => {
    const page = await ctx.newPage();
    await page.addStyleTag({ content: '* { cursor: none !important; }' });
    await page.goto(`${BASE_URL}/leaderboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // Smooth continuous scroll through leaderboard ranks
    for (let s = 0; s < 15; s++) {
      await page.mouse.wheel(0, 80);
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(1500);

    // Navigate to /demo to showcase exhibition match
    await page.goto(`${BASE_URL}/demo`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(8000);
  });

  // -------------------------------------------------------------------------
  // 7. AMBIENT BACKGROUND LOOP (28s)
  // -------------------------------------------------------------------------
  await recordScene(browser, 'Ambient Background', 'halloween-background-loop.mp4', 28, async (ctx) => {
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    // Hide UI
    await page.evaluate(() => {
      document.querySelector('main')?.remove();
      document.querySelector('nav')?.remove();
      document.querySelector('footer')?.remove();
    });

    // 28 seconds of smooth slow parallax drift
    const totalSteps = 28 * 10;
    for (let i = 0; i < totalSteps; i++) {
      const px = 960 + Math.sin(i * 0.04) * 80;
      const py = 540 + Math.cos(i * 0.03) * 60;
      await page.mouse.move(px, py);
      await page.waitForTimeout(100);
    }
  });

  await browser.close();
  try { fs.rmSync(TMP_REC, { recursive: true, force: true }); } catch (_) {}
  console.log('\n=== ALL HIGH-FIDELITY RAW FOOTAGE RE-CAPTURED SUCCESSFULLY! ===');
}

main().catch(err => {
  console.error('Recording failed:', err);
  process.exit(1);
});
