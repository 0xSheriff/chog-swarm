import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [k, ...v] = trimmed.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}

const routes = [
  { name: 'Arena (/arena)', url: 'http://localhost:3000/arena' },
  { name: 'Trait Lab (/lab)', url: 'http://localhost:3000/lab' },
  { name: 'Daily Gauntlet (/gauntlet)', url: 'http://localhost:3000/gauntlet' }
];

async function measureRoute(page: any, route: { name: string; url: string }) {
  console.log(`\n=== Tracing ${route.name} for 10 seconds of pointer movement ===`);
  await page.goto(route.url, { waitUntil: 'networkidle' });

  // Unlock if gate shown
  const isBlocked = await page.locator('text=Unlock for Judges').count();
  if (isBlocked > 0) {
    await page.fill('input[placeholder*="Judge Code"]', 'CHOGATHON_2026_JUDGE2002');
    await page.click('button:has-text("Unlock Access")');
    await page.waitForTimeout(1000);
  }

  // Inject frame measurement harness into page
  await page.evaluate(`
    window.__perfResults = {
      deltas: [],
      longFrames20ms: 0,
      longFrames50ms: 0,
      maxDelta: 0
    };
    let last = performance.now();
    function onFrame(now) {
      const d = now - last;
      last = now;
      window.__perfResults.deltas.push(d);
      if (d > 20) window.__perfResults.longFrames20ms++;
      if (d > 50) window.__perfResults.longFrames50ms++;
      if (d > window.__perfResults.maxDelta) window.__perfResults.maxDelta = d;
      requestAnimationFrame(onFrame);
    }
    requestAnimationFrame(onFrame);
  `);

  // Move pointer continuously for 10 seconds
  const startTime = Date.now();
  let step = 0;
  while (Date.now() - startTime < 10000) {
    const angle = step * 0.15;
    const x = 960 + Math.cos(angle) * 450;
    const y = 540 + Math.sin(angle * 1.3) * 300;
    await page.mouse.move(x, y);
    step++;
    await page.waitForTimeout(16);
  }

  const results = await page.evaluate(() => (window as any).__perfResults);
  const deltas: number[] = results.deltas.slice(5); // skip initial warmup frame
  deltas.sort((a, b) => a - b);
  const totalFrames = deltas.length;
  const p50 = deltas[Math.floor(totalFrames * 0.50)] || 0;
  const p95 = deltas[Math.floor(totalFrames * 0.95)] || 0;
  const p99 = deltas[Math.floor(totalFrames * 0.99)] || 0;
  const avg = deltas.reduce((a, b) => a + b, 0) / (totalFrames || 1);

  console.log(`Results for ${route.name}:`);
  console.log(`- Total rAF frames sampled: ${totalFrames}`);
  console.log(`- Frames > 20ms: ${results.longFrames20ms} (${((results.longFrames20ms / totalFrames) * 100).toFixed(1)}%)`);
  console.log(`- Frames > 50ms: ${results.longFrames50ms} (${((results.longFrames50ms / totalFrames) * 100).toFixed(1)}%)`);
  console.log(`- Average frame time: ${avg.toFixed(2)} ms (${(1000 / avg).toFixed(1)} FPS)`);
  console.log(`- p50: ${p50.toFixed(2)} ms | p95: ${p95.toFixed(2)} ms | p99: ${p99.toFixed(2)} ms`);
  console.log(`- Max frame time: ${results.maxDelta.toFixed(2)} ms`);

  return {
    route: route.name,
    totalFrames,
    longFrames20ms: results.longFrames20ms,
    longFrames50ms: results.longFrames50ms,
    avg: avg.toFixed(2),
    p50: p50.toFixed(2),
    p95: p95.toFixed(2),
    p99: p99.toFixed(2),
    maxDelta: results.maxDelta.toFixed(2)
  };
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=metal',
      '--enable-gpu-rasterization',
      '--ignore-gpu-blocklist'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const allResults = [];
  for (const r of routes) {
    const res = await measureRoute(page, r);
    allResults.push(res);
  }

  await browser.close();

  console.log('\n=== SUMMARY TABLE ===');
  console.table(allResults);
}

run().catch(console.error);
