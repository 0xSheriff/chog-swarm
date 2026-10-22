import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
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
import { injectCursor, moveCursorSmooth, clickWithRipple } from './lib/cursor-recorder';

const CAPTURE_DIR = path.join(process.cwd(), 'assets/capture');
const TMP_REC = path.join(process.cwd(), '.tmp_video_rec');
fs.mkdirSync(CAPTURE_DIR, { recursive: true });
fs.mkdirSync(TMP_REC, { recursive: true });

const BASE_URL = 'http://localhost:3000';

function transcodeWebMToMP4(webmPath: string, outputPath: string, fps = 60) {
  console.log(`Transcoding ${webmPath} to ${outputPath} at ${fps}fps (CRF 15)...`);
  execSync(`ffmpeg -y -i "${webmPath}" -r ${fps} -c:v libx264 -preset fast -crf 15 -pix_fmt yuv420p "${outputPath}"`);
  fs.rmSync(webmPath, { force: true });
  const stat = fs.statSync(outputPath);
  console.log(`✓ Generated ${outputPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
}

async function main() {
  console.log('=== RECORDING 6 CANONICAL CAPTURE SCENES (1080p 60fps) ===');
  const browser = await chromium.launch();

  // -------------------------------------------------------------------------
  // SCENE 1: NFT IS ESSENTIAL (BLOCKED GATE SCREEN)
  // -------------------------------------------------------------------------
  const s1Path = path.join(CAPTURE_DIR, 'scene1-nft-essential-blocked.mp4');
  if (fs.existsSync(s1Path)) {
    console.log(`\n[1/6] scene1-nft-essential-blocked.mp4 already exists, skipping.`);
  } else {
    console.log('\n[1/6] Recording scene1-nft-essential-blocked.mp4...');
    const ctx = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: TMP_REC, size: { width: 1920, height: 1080 } },
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/arena`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="access-blocked-screen"]', { timeout: 10000 });
    await injectCursor(page);

    await page.waitForTimeout(600);
    await moveCursorSmooth(page, 960, 360, 40);
    await page.waitForTimeout(400);
    await moveCursorSmooth(page, 850, 560, 45);
    await page.waitForTimeout(600);
    await moveCursorSmooth(page, 920, 710, 45);
    await page.waitForTimeout(800);
    await moveCursorSmooth(page, 1080, 710, 30);
    await page.waitForTimeout(800);

    await ctx.close();
    const videoFile = fs.readdirSync(TMP_REC).find(f => f.endsWith('.webm'));
    if (videoFile) transcodeWebMToMP4(path.join(TMP_REC, videoFile), s1Path);
  }

  // Setup Creator Pass session
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

  // -------------------------------------------------------------------------
  // SCENE 2: ARENA WITH CREATOR BANNER & START BUTTON
  // -------------------------------------------------------------------------
  const s2Path = path.join(CAPTURE_DIR, 'scene2-creator-pass-arena.mp4');
  if (fs.existsSync(s2Path)) {
    console.log(`\n[2/6] scene2-creator-pass-arena.mp4 already exists, skipping.`);
  } else {
    console.log('\n[2/6] Recording scene2-creator-pass-arena.mp4...');
    const ctx = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: TMP_REC, size: { width: 1920, height: 1080 } },
    });
    await ctx.addCookies([{ name: SESSION_COOKIE_NAME, value: creatorCookie, domain: 'localhost', path: '/' }]);
    const page = await ctx.newPage();
    await page.addInitScript(() => { localStorage.setItem('chog_seen_arena_intro', 'true'); });
    await page.goto(`${BASE_URL}/arena`, { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 10000 });
    await injectCursor(page);

    await page.waitForTimeout(600);
    await moveCursorSmooth(page, 480, 110, 40);
    await page.waitForTimeout(600);
    await moveCursorSmooth(page, 1550, 450, 50);
    await page.waitForTimeout(600);
    const btnBox = await page.locator('button:has-text("START RACE")').boundingBox();
    if (btnBox) {
      await clickWithRipple(page, btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2);
    }
    await page.waitForTimeout(1500);

    await ctx.close();
    const videoFile = fs.readdirSync(TMP_REC).find(f => f.endsWith('.webm'));
    if (videoFile) transcodeWebMToMP4(path.join(TMP_REC, videoFile), s2Path);
  }

  // -------------------------------------------------------------------------
  // SCENE 3: RACE ACTION & WINNER CELEBRATION
  // -------------------------------------------------------------------------
  const s3Path = path.join(CAPTURE_DIR, 'scene3-arena-race-finish.mp4');
  if (fs.existsSync(s3Path)) {
    console.log(`\n[3/6] scene3-arena-race-finish.mp4 already exists, skipping.`);
  } else {
    console.log('\n[3/6] Recording scene3-arena-race-finish.mp4...');
    const ctx = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: TMP_REC, size: { width: 1920, height: 1080 } },
    });
    await ctx.addCookies([{ name: SESSION_COOKIE_NAME, value: creatorCookie, domain: 'localhost', path: '/' }]);
    const page = await ctx.newPage();
    await page.addInitScript(() => { localStorage.setItem('chog_seen_arena_intro', 'true'); });
    await page.goto(`${BASE_URL}/arena`, { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 10000 });
    await injectCursor(page);

    await page.locator('button:has-text("START RACE")').click();
    await page.waitForTimeout(1200);

    for (let i = 0; i <= 20; i++) {
      await page.evaluate((turn) => {
        const input = document.querySelector('input[type="range"]') as HTMLInputElement;
        if (input) {
          const max = Number(input.max) || 20;
          input.value = String(Math.min(turn, max));
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, i);
      await moveCursorSmooth(page, 450 + i * 20, 890, 4);
    }
    await page.waitForTimeout(1500);

    await ctx.close();
    const videoFile = fs.readdirSync(TMP_REC).find(f => f.endsWith('.webm'));
    if (videoFile) transcodeWebMToMP4(path.join(TMP_REC, videoFile), s3Path);
  }

  // -------------------------------------------------------------------------
  // SCENE 4: TRAIT LAB COUNTERFACTUAL
  // -------------------------------------------------------------------------
  console.log('\n[4/6] Recording scene4-trait-lab-counterfactual.mp4...');
  {
    const ctx = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: TMP_REC, size: { width: 1920, height: 1080 } },
    });
    await ctx.addCookies([{ name: SESSION_COOKIE_NAME, value: creatorCookie, domain: 'localhost', path: '/' }]);
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/lab`, { waitUntil: 'networkidle' });
    await injectCursor(page);

    await page.waitForTimeout(800);
    await moveCursorSmooth(page, 480, 230, 40); // Mutate Parameter Bar
    await page.waitForTimeout(400);

    // Click on Eyes (Valuation) mutation button
    const eyeBtn = page.locator('button:has-text("Eyes (Valuation)"), button:has-text("Aura"), button:has-text("Side")').first();
    if (await eyeBtn.count() > 0) {
      const box = await eyeBtn.boundingBox();
      if (box) await clickWithRipple(page, box.x + box.width / 2, box.y + box.height / 2);
    }
    await page.waitForTimeout(800);

    // Click on Aura (Risk Buffer)
    const auraBtn = page.locator('button:has-text("Aura (Risk Buffer)")').first();
    if (await auraBtn.count() > 0) {
      const box = await auraBtn.boundingBox();
      if (box) await clickWithRipple(page, box.x + box.width / 2, box.y + box.height / 2);
    }
    await page.waitForTimeout(800);

    // Glide cursor over counterfactual divergence cards
    await moveCursorSmooth(page, 1100, 460, 40);
    await page.waitForTimeout(1000);

    await ctx.close();
    const videoFile = fs.readdirSync(TMP_REC).find(f => f.endsWith('.webm'));
    if (videoFile) {
      transcodeWebMToMP4(path.join(TMP_REC, videoFile), path.join(CAPTURE_DIR, 'scene4-trait-lab-counterfactual.mp4'));
    }
  }

  // -------------------------------------------------------------------------
  // SCENE 5: DAILY GAUNTLET & RETENTION
  // -------------------------------------------------------------------------
  console.log('\n[5/6] Recording scene5-daily-gauntlet.mp4...');
  {
    const ctx = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: TMP_REC, size: { width: 1920, height: 1080 } },
    });
    await ctx.addCookies([{ name: SESSION_COOKIE_NAME, value: creatorCookie, domain: 'localhost', path: '/' }]);
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/gauntlet`, { waitUntil: 'networkidle' });
    await injectCursor(page);

    await page.waitForTimeout(600);
    await moveCursorSmooth(page, 380, 240, 40); // UTC Seed highlight
    await page.waitForTimeout(600);
    const runBtn = page.locator('button:has-text("RUN DAILY SEED")');
    const rBox = await runBtn.boundingBox();
    if (rBox) {
      await clickWithRipple(page, rBox.x + rBox.width / 2, rBox.y + rBox.height / 2);
    }
    await page.waitForTimeout(2000);

    await ctx.close();
    const videoFile = fs.readdirSync(TMP_REC).find(f => f.endsWith('.webm'));
    if (videoFile) {
      transcodeWebMToMP4(path.join(TMP_REC, videoFile), path.join(CAPTURE_DIR, 'scene5-daily-gauntlet.mp4'));
    }
  }

  // -------------------------------------------------------------------------
  // SCENE 6: LIVING HALLOWEEN BACKGROUND LOOP (20 SECONDS CLEAN)
  // -------------------------------------------------------------------------
  console.log('\n[6/6] Recording halloween-background-loop.mp4 (20 seconds)...');
  {
    const ctx = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: TMP_REC, size: { width: 1920, height: 1080 } },
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    // Hide foreground UI for a pristine background loop
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.style.opacity = '0';
      const nav = document.querySelector('nav');
      if (nav) nav.style.opacity = '0';
      const footer = document.querySelector('footer');
      if (footer) footer.style.opacity = '0';
    });

    // 20-second slow drifting parallax
    for (let i = 0; i < 400; i++) {
      const px = Math.sin(i * 0.03) * 60 + 960;
      const py = Math.cos(i * 0.02) * 45 + 540;
      await page.mouse.move(px, py);
      await page.waitForTimeout(50);
    }

    await ctx.close();
    const videoFile = fs.readdirSync(TMP_REC).find(f => f.endsWith('.webm'));
    if (videoFile) {
      transcodeWebMToMP4(path.join(TMP_REC, videoFile), path.join(CAPTURE_DIR, 'halloween-background-loop.mp4'));
    }
  }

  await browser.close();
  fs.rmSync(TMP_REC, { recursive: true, force: true });
  console.log('\n=== ALL 6 HIGH-FIDELITY FOOTAGE CLIPS RECORDED AND ENCODED! ===');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
