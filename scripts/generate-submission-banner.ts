import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const ROOT = process.cwd();

// Base64 helper
function getBase64(filePath: string, mime: string): string {
  const buf = fs.readFileSync(filePath);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

const fontPirata = getBase64(path.join(ROOT, 'demo-video/assets/fonts/PirataOne-Regular.ttf'), 'font/ttf');
const frame1 = getBase64(path.join(ROOT, 'public/frame1.jpg'), 'image/jpeg');
const frame2 = getBase64(path.join(ROOT, 'public/frame2-eth-cap-skeleton.JPG'), 'image/jpeg');
const frame3 = getBase64(path.join(ROOT, 'public/frame3-top-hat-skeleton.JPG'), 'image/jpeg');
const frame4 = getBase64(path.join(ROOT, 'public/frame4-flaming-skull.JPG'), 'image/jpeg');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @font-face {
    font-family: 'Pirata One';
    src: url('${fontPirata}') format('truetype');
    font-weight: 400;
  }
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    width: 1920px;
    height: 1080px;
    overflow: hidden;
    background: #06040a;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    color: #efe6d2;
    position: relative;
  }

  /* Atmospheric Background Layers */
  .bg-glow-1 {
    position: absolute;
    top: -100px;
    left: -100px;
    width: 900px;
    height: 900px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(131, 110, 249, 0.18) 0%, transparent 70%);
    pointer-events: none;
  }

  .bg-glow-2 {
    position: absolute;
    top: 200px;
    right: 100px;
    width: 1000px;
    height: 1000px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 102, 0, 0.16) 0%, transparent 70%);
    pointer-events: none;
  }

  .bg-glow-3 {
    position: absolute;
    bottom: -150px;
    left: 450px;
    width: 800px;
    height: 800px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 122, 26, 0.12) 0%, transparent 70%);
    pointer-events: none;
  }

  .grid-pattern {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 60px 60px;
    opacity: 0.6;
    pointer-events: none;
  }

  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 50%, transparent 40%, rgba(6, 4, 10, 0.9) 95%);
    pointer-events: none;
  }

  /* Container */
  .layout {
    position: relative;
    z-index: 10;
    width: 100%;
    height: 100%;
    padding: 70px 90px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  /* Left Column */
  .left-col {
    max-width: 880px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .badges-row {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .event-pill {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 18px;
    background: rgba(255, 122, 26, 0.12);
    border: 1px solid rgba(255, 122, 26, 0.4);
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 700;
    color: #ff9e3b;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .event-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff7a1a;
    box-shadow: 0 0 10px #ff7a1a;
  }

  .monad-pill {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 18px;
    background: rgba(131, 110, 249, 0.12);
    border: 1px solid rgba(131, 110, 249, 0.4);
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 700;
    color: #a99bfc;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .monad-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #836ef9;
    box-shadow: 0 0 10px #836ef9;
  }

  .title-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .main-title {
    font-family: 'Pirata One', cursive;
    font-size: 116px;
    line-height: 0.95;
    letter-spacing: 0.02em;
    background: linear-gradient(135deg, #fff2d6 0%, #ff9e3b 45%, #ff5500 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 40px rgba(255, 110, 0, 0.45));
  }

  .sub-title {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #efe6d2;
    opacity: 0.9;
  }

  /* Hook Card */
  .hook-card {
    background: rgba(16, 11, 28, 0.75);
    border: 1px solid rgba(255, 122, 26, 0.3);
    border-radius: 20px;
    padding: 24px 30px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), inset 0 0 30px rgba(255, 122, 26, 0.06);
    backdrop-filter: blur(12px);
  }

  .hook-headline {
    font-family: 'Pirata One', cursive;
    font-size: 38px;
    line-height: 1.1;
    color: #ff9e3b;
    margin-bottom: 8px;
    letter-spacing: 0.03em;
  }

  .hook-body {
    font-size: 17px;
    line-height: 1.55;
    color: rgba(239, 230, 210, 0.85);
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    margin-top: 4px;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 18px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    color: #efe6d2;
  }

  .feature-icon {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ff7a1a;
  }

  .footer-links {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-top: 8px;
  }

  .link-pill {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 20px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 500;
    color: #efe6d2;
  }

  .link-pill-accent {
    border-color: rgba(255, 122, 26, 0.5);
    color: #ff9e3b;
    background: rgba(255, 122, 26, 0.1);
  }

  /* Right Column (Hero Visual Showcase) */
  .right-col {
    position: relative;
    width: 800px;
    height: 880px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Centerpiece Chog Card */
  .hero-card {
    position: relative;
    width: 410px;
    background: rgba(14, 10, 24, 0.92);
    border: 2px solid rgba(255, 122, 26, 0.6);
    border-radius: 28px;
    padding: 18px;
    box-shadow: 0 40px 100px rgba(0, 0, 0, 0.9), 0 0 70px rgba(255, 122, 26, 0.35);
    z-index: 20;
    transform: rotate(-2deg);
  }

  .hero-img-wrap {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 20px;
    overflow: hidden;
    position: relative;
    background: #000;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* Rule A: Authentic Chog NFT art */
  .hero-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .hero-hud {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .hud-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .hud-name {
    font-family: 'Pirata One', cursive;
    font-size: 28px;
    color: #efe6d2;
  }

  .hud-id {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: #ff7a1a;
    font-weight: 700;
    background: rgba(255, 122, 26, 0.15);
    padding: 4px 10px;
    border-radius: 6px;
  }

  .hud-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    background: rgba(0, 0, 0, 0.4);
    padding: 10px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .hud-stat-col {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .hud-stat-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(239, 230, 210, 0.5);
  }

  .hud-stat-val {
    font-family: 'JetBrains Mono', monospace;
    font-size: 15px;
    font-weight: 700;
    color: #ff9e3b;
  }

  /* Floating Companion Cards */
  .companion-card {
    position: absolute;
    width: 220px;
    background: rgba(12, 8, 20, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 20px;
    padding: 12px;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
  }

  .companion-top-left {
    top: 30px;
    left: 20px;
    transform: rotate(-10deg);
    border-color: rgba(131, 110, 249, 0.45);
    box-shadow: 0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(131, 110, 249, 0.2);
    z-index: 10;
  }

  .companion-top-right {
    top: 50px;
    right: 20px;
    transform: rotate(12deg);
    border-color: rgba(255, 122, 26, 0.35);
    z-index: 10;
  }

  .companion-bottom-right {
    bottom: 50px;
    right: 30px;
    transform: rotate(-6deg);
    border-color: rgba(255, 60, 60, 0.4);
    box-shadow: 0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(255, 60, 60, 0.2);
    z-index: 10;
  }

  .companion-img-wrap {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 14px;
    overflow: hidden;
    background: #000;
  }

  .companion-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .companion-label {
    margin-top: 8px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(239, 230, 210, 0.8);
    text-align: center;
  }

  /* Telemetry Floating Banner */
  .telemetry-banner {
    position: absolute;
    bottom: 30px;
    left: 10px;
    background: rgba(14, 10, 24, 0.95);
    border: 1px solid rgba(255, 122, 26, 0.4);
    border-radius: 16px;
    padding: 14px 22px;
    display: flex;
    align-items: center;
    gap: 18px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 122, 26, 0.25);
    z-index: 25;
    transform: rotate(3deg);
  }

  .telemetry-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #27c93f;
    box-shadow: 0 0 12px #27c93f;
  }

  .telemetry-text {
    display: flex;
    flex-direction: column;
  }

  .telemetry-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #ff9e3b;
    text-transform: uppercase;
  }

  .telemetry-val {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 700;
    color: #efe6d2;
  }
</style>
</head>
<body>
  <div class="bg-glow-1"></div>
  <div class="bg-glow-2"></div>
  <div class="bg-glow-3"></div>
  <div class="grid-pattern"></div>
  <div class="vignette"></div>

  <div class="layout">
    <!-- Left Column: Branding, Value Proposition, Feature Matrix -->
    <div class="left-col">
      <div class="badges-row">
        <div class="event-pill">
          <span class="event-dot"></span>
          CHOGATHON 2026 OFFICIAL SUBMISSION
        </div>
        <div class="monad-pill">
          <span class="monad-dot"></span>
          MONAD CHAIN 143 • VERIFIED ACCESS GATE
        </div>
      </div>

      <div class="title-group">
        <h1 class="main-title">CHOG SWARM</h1>
        <div class="sub-title">HALLOWEEN EDITION • AUTONOMOUS ON-CHAIN PINBALL</div>
      </div>

      <div class="hook-card">
        <div class="hook-headline">THE NFT IS THE DRIVER, NOT THE BADGE</div>
        <div class="hook-body">
          Every Chog NFT owned compiles into an autonomous agent policy. Traits directly determine physics mass, bumper aggression, risk buffer, and flipper reaction cadence in a 100% deterministic state engine.
        </div>
      </div>

      <div class="features-grid">
        <div class="feature-item">
          <div class="feature-icon">⚡</div>
          <span>Pure Deterministic Physics Engine (Seed + Policy)</span>
        </div>
        <div class="feature-item">
          <div class="feature-icon">🛡️</div>
          <span>Fail-Closed Monad Access Gate (SIWE + Viem)</span>
        </div>
        <div class="feature-item">
          <div class="feature-icon">🧪</div>
          <span>Trait Lab Counterfactual Sensitivity Sandbox</span>
        </div>
        <div class="feature-item">
          <div class="feature-icon">🎵</div>
          <span>Procedural Web Audio Engine (Zero Samples)</span>
        </div>
      </div>

      <div class="footer-links">
        <div class="link-pill link-pill-accent">
          <span>🌐 Play Live: chog-swarm.netlify.app</span>
        </div>
        <div class="link-pill">
          <span>📦 GitHub: 0xSheriff/chog-swarm</span>
        </div>
      </div>
    </div>

    <!-- Right Column: Hero Chog Centerpiece & Companion Avatars -->
    <div class="right-col">
      <!-- Companion 1: ETH Cap Skeleton -->
      <div class="companion-card companion-top-left">
        <div class="companion-img-wrap">
          <img class="companion-img" src="${frame2}" alt="ETH Cap Skeleton" />
        </div>
        <div class="companion-label">Tactical Defender</div>
      </div>

      <!-- Companion 2: Top Hat Skeleton -->
      <div class="companion-card companion-top-right">
        <div class="companion-img-wrap">
          <img class="companion-img" src="${frame3}" alt="Top Hat Skeleton" />
        </div>
        <div class="companion-label">Risk Calculator</div>
      </div>

      <!-- Centerpiece: Flame Chog #143 -->
      <div class="hero-card">
        <div class="hero-img-wrap">
          <img class="hero-img" src="${frame1}" alt="Flame Chog Genesis #143" />
        </div>
        <div class="hero-hud">
          <div class="hud-header">
            <div class="hud-name">Flame Chog #143</div>
            <div class="hud-id">COMPILED POLICY</div>
          </div>
          <div class="hud-stats">
            <div class="hud-stat-col">
              <span class="hud-stat-label">Aggression</span>
              <span class="hud-stat-val">+34%</span>
            </div>
            <div class="hud-stat-col">
              <span class="hud-stat-label">Cadence</span>
              <span class="hud-stat-val">180ms</span>
            </div>
            <div class="hud-stat-col">
              <span class="hud-stat-label">Risk Buffer</span>
              <span class="hud-stat-val">-15%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Companion 3: Flaming Skull -->
      <div class="companion-card companion-bottom-right">
        <div class="companion-img-wrap">
          <img class="companion-img" src="${frame4}" alt="Flaming Skull" />
        </div>
        <div class="companion-label">Berserk Striker</div>
      </div>

      <!-- Live Match Telemetry Floating Badge -->
      <div class="telemetry-banner">
        <div class="telemetry-dot"></div>
        <div class="telemetry-text">
          <div class="telemetry-title">Verified Server Replay</div>
          <div class="telemetry-val">Daily Seed #133742 • Score: 148,200 (3.2x)</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

async function renderBanner() {
  console.log('Rendering 4K/Retina submission banners via Playwright...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=metal', '--enable-gpu-rasterization']
  });

  // 1. Master 1920x1080 (16:9) Banner
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // High-DPI 3840x2160 internal raster for razor sharpness
  });
  const page = await ctx.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const bannerOut1 = path.join(ROOT, 'public/submission-banner.png');
  const bannerOut2 = path.join(ROOT, 'docs/submission-banner.png');
  await page.screenshot({ path: bannerOut1 });
  fs.copyFileSync(bannerOut1, bannerOut2);
  console.log('✓ Master banner generated at ' + bannerOut1 + ' and ' + bannerOut2);

  // 2. OpenGraph 1200x630 Card
  const ctxOg = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
  });
  const pageOg = await ctxOg.newPage();
  // Adjust scale via transform for 1200x630
  const ogHtml = htmlContent.replace(
    'body {',
    'body { transform: scale(0.625); transform-origin: top left; width: 1920px; height: 1080px; '
  );
  await pageOg.setContent(ogHtml, { waitUntil: 'networkidle' });
  await pageOg.waitForTimeout(1000);
  const ogOut = path.join(ROOT, 'public/og-image.png');
  await pageOg.screenshot({ path: ogOut });
  console.log('✓ OpenGraph image updated at ' + ogOut);

  await browser.close();
}

renderBanner().catch((err) => {
  console.error(err);
  process.exit(1);
});
