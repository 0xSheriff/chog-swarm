import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { chromium, Page } from 'playwright';

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
import { injectCursor } from './lib/cursor-recorder';

const CAPTURE_DIR = path.join(process.cwd(), 'assets/capture');
fs.mkdirSync(CAPTURE_DIR, { recursive: true });
const BASE_URL = 'http://localhost:3000';

async function recordFrames(page: Page, framesCount: number, fps: number, stepAction: (idx: number) => Promise<void>, outputFile: string) {
  const tmpDir = path.join(process.cwd(), `.tmp_frames_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  console.log(`Recording ${framesCount} frames for ${path.basename(outputFile)}...`);
  for (let i = 0; i < framesCount; i++) {
    await stepAction(i);
    const framePath = path.join(tmpDir, `frame_${String(i).padStart(5, '0')}.png`);
    await page.screenshot({ path: framePath, fullPage: false });
  }

  console.log(`Encoding ${framesCount} frames to ${outputFile} at ${fps} fps (CRF 16)...`);
  await new Promise<void>((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-y',
      '-framerate', String(fps),
      '-i', path.join(tmpDir, 'frame_%05d.png'),
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '16',
      '-pix_fmt', 'yuv420p',
      outputFile
    ]);
    ff.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
  const stat = fs.statSync(outputFile);
  console.log(`✓ Saved ${outputFile} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
}

async function main() {
  console.log('=== STARTING HIGH-FIDELITY FOOTAGE CAPTURE ===');
  const browser = await chromium.launch();

  // -------------------------------------------------------------------------
  // CLIP 1: SCENE "NFT IS ESSENTIAL" - BLOCKED GATE SCREEN
  // -------------------------------------------------------------------------
  console.log('\n[Clip 1] Capturing Blocked Gate Screen (NFT Essentiality)...');
  const nonHolderCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const nonHolderPage = await nonHolderCtx.newPage();
  await nonHolderPage.goto(`${BASE_URL}/arena`, { waitUntil: 'domcontentloaded' });
  await nonHolderPage.waitForSelector('[data-testid="access-blocked-screen"]', { timeout: 10000 });
  await injectCursor(nonHolderPage);

  // Scripted motion: cursor starts top-left, moves to headline, down to "Get a Chog", then to Judge Pass code input
  const clip1Frames = 120; // 4 seconds at 30fps
  await recordFrames(nonHolderPage, clip1Frames, 30, async (idx) => {
    let x = 300;
    let y = 200;
    if (idx < 30) {
      // Move toward headline
      const t = idx / 30;
      x = 300 + (960 - 300) * t;
      y = 200 + (320 - 200) * t;
    } else if (idx < 70) {
      // Move to "Get a Chog on Monad"
      const t = (idx - 30) / 40;
      x = 960 + (850 - 960) * t;
      y = 320 + (560 - 320) * t;
    } else {
      // Move to Judge Code input box
      const t = (idx - 70) / 50;
      x = 850 + (920 - 850) * t;
      y = 560 + (710 - 560) * t;
    }
    await nonHolderPage.evaluate(({ x, y }) => (window as any).__setCursor(x, y), { x, y });
  }, path.join(CAPTURE_DIR, 'scene1-nft-essential-blocked.mp4'));
  await nonHolderCtx.close();

  // Setup Creator Pass session for remaining gameplay clips
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

  const creatorCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await creatorCtx.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: creatorCookie,
      domain: 'localhost',
      path: '/',
    },
  ]);

  // -------------------------------------------------------------------------
  // CLIP 2: SCENE "HOW TO PLAY" - ARENA WITH CREATOR BANNER & START BUTTON
  // -------------------------------------------------------------------------
  console.log('\n[Clip 2] Capturing Arena with Creator Pass Banner...');
  const arenaPage = await creatorCtx.newPage();
  await arenaPage.addInitScript(() => {
    localStorage.setItem('chog_seen_arena_intro', 'true');
  });
  await arenaPage.goto(`${BASE_URL}/arena`, { waitUntil: 'networkidle' });
  await arenaPage.waitForSelector('canvas', { timeout: 10000 });
  await injectCursor(arenaPage);

  const clip2Frames = 150; // 5 seconds at 30fps
  await recordFrames(arenaPage, clip2Frames, 30, async (idx) => {
    let x = 200;
    let y = 100;
    if (idx < 40) {
      // Glides over Creator Pass banner
      const t = idx / 40;
      x = 200 + (500 - 200) * t;
      y = 100 + (110 - 100) * t;
    } else if (idx < 90) {
      // Moves toward START RACE button
      const t = (idx - 40) / 50;
      x = 500 + (1020 - 500) * t;
      y = 110 + (285 - 110) * t;
    } else if (idx === 90) {
      // Click with ripple
      await arenaPage.evaluate(() => (window as any).__triggerRipple());
      await arenaPage.locator('button:has-text("START RACE")').click();
      x = 1020;
      y = 285;
    } else {
      // Settles on grid
      x = 1020;
      y = 285;
    }
    await arenaPage.evaluate(({ x, y }) => (window as any).__setCursor(x, y), { x, y });
  }, path.join(CAPTURE_DIR, 'scene2-creator-pass-arena.mp4'));

  // -------------------------------------------------------------------------
  // CLIP 3: SCENE "RACE FINISH & CELEBRATION"
  // -------------------------------------------------------------------------
  console.log('\n[Clip 3] Capturing Race Finish & Winner Celebration...');
  // Let the race finish and trigger celebration
  await arenaPage.waitForTimeout(2000);
  const clip3Frames = 120; // 4 seconds at 30fps
  await recordFrames(arenaPage, clip3Frames, 30, async (idx) => {
    // Slowly pan cursor along the race telemetry / scrubber
    const t = idx / clip3Frames;
    const x = 500 + (1100 - 500) * t;
    const y = 880;
    await arenaPage.evaluate(({ x, y }) => (window as any).__setCursor(x, y), { x, y });
  }, path.join(CAPTURE_DIR, 'scene3-arena-race-finish.mp4'));
  await arenaPage.close();

  // -------------------------------------------------------------------------
  // CLIP 4: SCENE "TRAIT LAB COUNTERFACTUAL"
  // -------------------------------------------------------------------------
  console.log('\n[Clip 4] Capturing Trait Lab Counterfactual...');
  const labPage = await creatorCtx.newPage();
  await labPage.goto(`${BASE_URL}/lab`, { waitUntil: 'networkidle' });
  await injectCursor(labPage);

  const clip4Frames = 150; // 5 seconds at 30fps
  await recordFrames(labPage, clip4Frames, 30, async (idx) => {
    let x = 300;
    let y = 300;
    if (idx < 50) {
      // Hover over base trait breakdown
      const t = idx / 50;
      x = 300 + (480 - 300) * t;
      y = 300 + (420 - 300) * t;
    } else if (idx < 90) {
      // Move to a trait toggle button
      const t = (idx - 50) / 40;
      x = 480 + (820 - 480) * t;
      y = 420 + (420 - 420) * t;
    } else if (idx === 90) {
      // Trigger toggle
      await labPage.evaluate(() => (window as any).__triggerRipple());
      const traitBtn = await labPage.locator('button:has-text("Top Hat"), button:has-text("Crown"), button:has-text("Halo")').first();
      if (await traitBtn.count() > 0) await traitBtn.click();
      x = 820;
      y = 420;
    } else {
      // Glide over the delta indicators
      const t = (idx - 90) / 60;
      x = 820 + (1100 - 820) * t;
      y = 420 + (480 - 420) * t;
    }
    await labPage.evaluate(({ x, y }) => (window as any).__setCursor(x, y), { x, y });
  }, path.join(CAPTURE_DIR, 'scene4-trait-lab-counterfactual.mp4'));
  await labPage.close();

  // -------------------------------------------------------------------------
  // CLIP 5: SCENE "DAILY GAUNTLET & LEADERBOARD"
  // -------------------------------------------------------------------------
  console.log('\n[Clip 5] Capturing Daily Gauntlet & Retention...');
  const gauntletPage = await creatorCtx.newPage();
  await gauntletPage.goto(`${BASE_URL}/gauntlet`, { waitUntil: 'networkidle' });
  await injectCursor(gauntletPage);

  const clip5Frames = 120; // 4 seconds at 30fps
  await recordFrames(gauntletPage, clip5Frames, 30, async (idx) => {
    let x = 400;
    let y = 200;
    if (idx < 60) {
      // Move to "RUN DAILY SEED"
      const t = idx / 60;
      x = 400 + (1120 - 400) * t;
      y = 200 + (240 - 200) * t;
    } else if (idx === 60) {
      await gauntletPage.evaluate(() => (window as any).__triggerRipple());
      const runSeedBtn = await gauntletPage.locator('button:has-text("RUN DAILY SEED")');
      if (await runSeedBtn.count() > 0) await runSeedBtn.click();
      x = 1120;
      y = 240;
    } else {
      x = 1120;
      y = 240;
    }
    await gauntletPage.evaluate(({ x, y }) => (window as any).__setCursor(x, y), { x, y });
  }, path.join(CAPTURE_DIR, 'scene5-daily-gauntlet.mp4'));
  await gauntletPage.close();

  // -------------------------------------------------------------------------
  // CLIP 6: LIVING HALLOWEEN BACKGROUND LOOP (20 SECONDS CLEAN)
  // -------------------------------------------------------------------------
  console.log('\n[Clip 6] Capturing Living Halloween Background Loop (20s)...');
  const bgPage = await creatorCtx.newPage();
  await bgPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  // Hide foreground UI for a pristine background loop
  await bgPage.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.style.opacity = '0';
    const nav = document.querySelector('nav');
    if (nav) nav.style.opacity = '0';
    const footer = document.querySelector('footer');
    if (footer) footer.style.opacity = '0';
  });

  const bgFrames = 300; // 10 seconds at 30fps (loops cleanly)
  await recordFrames(bgPage, bgFrames, 30, async (idx) => {
    // Parallax pointer subtle movement
    const px = Math.sin(idx * 0.05) * 40 + 960;
    const py = Math.cos(idx * 0.05) * 30 + 540;
    await bgPage.mouse.move(px, py);
    await bgPage.waitForTimeout(33);
  }, path.join(CAPTURE_DIR, 'halloween-background-loop.mp4'));
  await bgPage.close();

  await creatorCtx.close();
  await browser.close();
  console.log('=== ALL REAL FOOTAGE CAPTURED SUCCESSFULLY ===');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
