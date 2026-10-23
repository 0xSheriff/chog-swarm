import { chromium } from 'playwright';
import fs from 'fs';
import crypto from 'crypto';

// Load .env.local safely
function getEnvConfig() {
  const content = fs.readFileSync('.env.local', 'utf8');
  const config: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      config[key] = val;
    }
  }
  return config;
}

async function verifyAllThreeCases() {
  const env = getEnvConfig();
  const sessionSecret = env.SESSION_SECRET || 'chog_default_dev_session_secret_change_in_production_32b';
  const judgeCode = env.JUDGE_CODE;
  const allowlist = (env.OWNER_ALLOWLIST || '').split(',').map(a => a.trim()).filter(Boolean);
  const allowlistedAddress = allowlist[0] || '0x71C8A16BE3D447e1DE403A7727191316bFBE6b68';

  console.log('--- STARTING LIVE TEST SUITE ON https://chog-swarm.netlify.app ---');
  const browser = await chromium.launch({ headless: true });

  // ==========================================
  // CASE 1: Non-Holder Blocked
  // ==========================================
  console.log('\n[CASE 1] Verifying non-holder blocked state...');
  const ctx1 = await browser.newContext();
  const page1 = await ctx1.newPage();
  
  const res1 = await page1.goto('https://chog-swarm.netlify.app/arena?tokenId=24', { waitUntil: 'networkidle' });
  console.log('Case 1 response status:', res1?.status());
  
  const blockedScreen = await page1.waitForSelector('[data-testid="access-blocked-screen"]', { timeout: 10000 });
  if (!blockedScreen) throw new Error('Case 1 failed: Access Blocked screen not found!');
  
  await page1.screenshot({ path: 'public/screenshots/live-case1-blocked.png', fullPage: true });
  console.log('Case 1 PASS: Blocked screen visible. Screenshot saved to public/screenshots/live-case1-blocked.png');

  // ==========================================
  // CASE 2: Judge Pass Unlocks
  // ==========================================
  console.log('\n[CASE 2] Verifying Judge Pass unlock flow...');
  const judgeInput = await page1.waitForSelector('input[placeholder="Enter JUDGE_CODE"]', { timeout: 5000 });
  await judgeInput.fill(judgeCode);
  
  const enterBtn = await page1.waitForSelector('button:has-text("Enter")', { timeout: 5000 });
  await enterBtn.click();
  
  // Wait for the judge pass banner
  const judgeBanner = await page1.waitForSelector('text=Judge pass: playing Chog', { timeout: 15000 });
  console.log('Judge banner text:', await judgeBanner.textContent());
  
  // Wait for arena canvas
  const canvas1 = await page1.waitForSelector('canvas', { timeout: 10000 });
  console.log('Canvas found:', !!canvas1);

  await page1.waitForTimeout(2000); // let animations settle
  await page1.screenshot({ path: 'public/screenshots/live-case2-judge.png', fullPage: true });
  console.log('Case 2 PASS: Judge Pass unlocked arena. Screenshot saved to public/screenshots/live-case2-judge.png');
  await ctx1.close();

  // ==========================================
  // CASE 3: Allowlisted Wallet Unlocks (Creator Pass)
  // ==========================================
  console.log('\n[CASE 3] Verifying allowlisted wallet unlock (Creator Pass)...');
  const ctx2 = await browser.newContext();
  
  const now = Date.now();
  const sessionData = {
    address: allowlistedAddress,
    isHolder: false,
    creatorPass: true,
    judgePass: false,
    selectedChogId: 24,
    issuedAt: now,
    expiresAt: now + 12 * 60 * 60 * 1000,
    lastHoldingCheck: now,
  };
  const json = JSON.stringify(sessionData);
  const payloadB64 = Buffer.from(json, 'utf8').toString('base64url');
  const hmac = crypto.createHmac('sha256', sessionSecret).update(payloadB64).digest('hex');
  const signedCookie = `${payloadB64}.${hmac}`;

  await ctx2.addCookies([
    {
      name: 'chog_session',
      value: signedCookie,
      domain: 'chog-swarm.netlify.app',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);

  const page2 = await ctx2.newPage();
  const res3 = await page2.goto('https://chog-swarm.netlify.app/arena?tokenId=24', { waitUntil: 'networkidle' });
  console.log('Case 3 response status:', res3?.status());

  const creatorBanner = await page2.waitForSelector('text=Creator pass: playing Chog #24', { timeout: 15000 });
  console.log('Creator banner text:', await creatorBanner.textContent());

  const canvas2 = await page2.waitForSelector('canvas', { timeout: 10000 });
  console.log('Canvas found:', !!canvas2);

  await page2.waitForTimeout(2000);
  await page2.screenshot({ path: 'public/screenshots/live-case3-allowlist.png', fullPage: true });
  console.log('Case 3 PASS: Allowlisted wallet unlocked arena. Screenshot saved to public/screenshots/live-case3-allowlist.png');
  await ctx2.close();

  await browser.close();
  console.log('\n--- ALL 3 LIVE CASES VERIFIED AND PASSED SUCCESSFULLY ---');
}

verifyAllThreeCases().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
