import { chromium } from 'playwright';

async function captureRefGame() {
  const browser = await chromium.launch({ headless: true });

  // Desktop
  const ctxD = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pD = await ctxD.newPage();
  await pD.goto('https://graveyard-pinball.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
  await pD.waitForTimeout(2000);
  await pD.keyboard.press('Enter');
  await pD.waitForTimeout(3000);
  await pD.screenshot({ path: 'docs/pinball/reference-gameplay-1440x900.png' });
  await ctxD.close();

  // Mobile
  const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const pM = await ctxM.newPage();
  await pM.goto('https://graveyard-pinball.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
  await pM.waitForTimeout(2000);
  await pM.keyboard.press('Enter');
  await pM.waitForTimeout(3000);
  await pM.screenshot({ path: 'docs/pinball/reference-gameplay-390x844.png' });
  await ctxM.close();

  await browser.close();
  console.log('✓ Captured reference gameplay screenshots');
}

captureRefGame().catch(console.error);
