import { chromium } from 'playwright';
import fs from 'fs';

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const networkLogs: any[] = [];
  page.on('request', req => {
    networkLogs.push({
      type: 'request',
      url: req.url(),
      method: req.method(),
      resourceType: req.resourceType(),
    });
  });

  page.on('response', async res => {
    networkLogs.push({
      type: 'response',
      url: res.url(),
      status: res.status(),
      headers: res.headers(),
    });
  });

  console.log('1. Navigating to / ...');
  await page.goto('https://chog-swarm.netlify.app/', { waitUntil: 'networkidle' });
  console.log('Title on /:', await page.title());

  console.log('2. Navigating to /arena?tokenId=24 ...');
  const res = await page.goto('https://chog-swarm.netlify.app/arena?tokenId=24', { waitUntil: 'networkidle' });
  console.log('Status for /arena?tokenId=24:', res?.status());

  // Wait for access blocked screen
  const blockedEl = await page.waitForSelector('[data-testid="access-blocked-screen"]', { timeout: 10000 });
  console.log('Blocked screen visible:', !!blockedEl);
  await page.screenshot({ path: 'public/screenshots/live-case1-blocked.png', fullPage: true });
  console.log('Saved public/screenshots/live-case1-blocked.png');

  // Case 2: Enter Judge Pass
  console.log('Submitting Judge Pass code...');
  // Read judge code from local env if available or test with judge input
  // Let's check the input
  const judgeInput = await page.$('input[placeholder*="Judge Code" i], input[type="password"]');
  if (judgeInput) {
    // We can read JUDGE_CODE from process.env safely
    const judgeCode = process.env.JUDGE_CODE || 'CHOGATHON_2026_JUDGE2002';
    await judgeInput.fill(judgeCode);
    const enterBtn = await page.$('button[type="submit"]');
    if (enterBtn) {
      await enterBtn.click();
      console.log('Clicked submit button, waiting for navigation or session update...');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'public/screenshots/live-case2-judge.png', fullPage: true });
      console.log('Saved public/screenshots/live-case2-judge.png');
    }
  }

  await browser.close();
  fs.writeFileSync('/tmp/network-repro.json', JSON.stringify(networkLogs.slice(-20), null, 2));
}

run().catch(console.error);
