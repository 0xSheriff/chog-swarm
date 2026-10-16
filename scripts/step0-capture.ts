import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function main() {
  const outDir = path.resolve(process.cwd(), 'docs/pinball');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  // 1. Capture Reference (graveyard-pinball.vercel.app)
  console.log('Capturing Reference: https://graveyard-pinball.vercel.app ...');
  try {
    const refContext1440 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageRef1440 = await refContext1440.newPage();
    await pageRef1440.goto('https://graveyard-pinball.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    await pageRef1440.waitForTimeout(4000);
    await pageRef1440.screenshot({ path: path.join(outDir, 'reference-desktop-1440x900.png') });
    await refContext1440.close();

    const refContext390 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const pageRef390 = await refContext390.newPage();
    await pageRef390.goto('https://graveyard-pinball.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    await pageRef390.waitForTimeout(4000);
    await pageRef390.screenshot({ path: path.join(outDir, 'reference-mobile-390x844.png') });
    await refContext390.close();
    console.log('✓ Reference screenshots captured.');
  } catch (err: any) {
    console.warn('Warning capturing reference live:', err.message);
  }

  // 2. Capture Current Localhost (http://localhost:3000/play)
  console.log('Capturing Current: http://localhost:3000/play ...');
  const localContext1440 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageLocal1440 = await localContext1440.newPage();
  await pageLocal1440.goto('http://localhost:3000/play', { waitUntil: 'networkidle', timeout: 15000 });
  await pageLocal1440.waitForTimeout(2000);
  // Click guest spirit or play to enter the game table view
  const guestBtn = await pageLocal1440.$('button:has-text("Play as Guest Spirit")');
  if (guestBtn) {
    await guestBtn.click();
    await pageLocal1440.waitForTimeout(2000);
  }
  await pageLocal1440.screenshot({ path: path.join(outDir, 'current-desktop-1440x900.png') });
  await localContext1440.close();

  const localContext390 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const pageLocal390 = await localContext390.newPage();
  await pageLocal390.goto('http://localhost:3000/play', { waitUntil: 'networkidle', timeout: 15000 });
  await pageLocal390.waitForTimeout(2000);
  const guestBtnMobile = await pageLocal390.$('button:has-text("Play as Guest Spirit")');
  if (guestBtnMobile) {
    await guestBtnMobile.click();
    await pageLocal390.waitForTimeout(2000);
  }
  await pageLocal390.screenshot({ path: path.join(outDir, 'current-mobile-390x844.png') });
  await localContext390.close();
  console.log('✓ Current localhost screenshots captured.');

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
