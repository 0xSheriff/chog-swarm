import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [k, ...v] = trimmed.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}

import { chromium, Page } from 'playwright';

const CAPTURE_DIR = path.join(process.cwd(), 'assets/capture');
fs.mkdirSync(CAPTURE_DIR, { recursive: true });

export async function injectCursor(page: Page) {
  await page.evaluate(() => {
    if (document.getElementById('virtual-cursor')) return;
    const cursor = document.createElement('div');
    cursor.id = 'virtual-cursor';
    cursor.style.position = 'fixed';
    cursor.style.width = '24px';
    cursor.style.height = '24px';
    cursor.style.zIndex = '999999';
    cursor.style.pointerEvents = 'none';
    cursor.style.transform = 'translate(100px, 100px)';
    cursor.style.transition = 'none';
    cursor.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 2px 8px rgba(0,0,0,0.8));">
        <path d="M5.5 3.2L18.8 12.4C19.7 13 19.3 14.5 18.2 14.5H13L15.8 20.3C16.2 21.1 15.3 21.9 14.5 21.5L12 17.8L8.8 21.4C8 22.3 6.5 21.7 6.5 20.5V3.8C6.5 2.6 7.9 2 8.8 2.8" fill="#ff7a1a" stroke="#efe6d2" stroke-width="1.5"/>
      </svg>
      <div id="cursor-ripple" style="position:absolute; top:2px; left:2px; width:20px; height:20px; border-radius:50%; border:2px solid #ff7a1a; opacity:0; transform:scale(0); pointer-events:none;"></div>
    `;
    document.body.appendChild(cursor);

    (window as any).__cursorPos = { x: 100, y: 100 };
    (window as any).__setCursor = (x: number, y: number) => {
      cursor.style.transform = `translate(${x}px, ${y}px)`;
      (window as any).__cursorPos = { x, y };
    };

    (window as any).__triggerRipple = () => {
      const rip = document.getElementById('cursor-ripple');
      if (!rip) return;
      rip.style.transition = 'none';
      rip.style.transform = 'scale(0.5)';
      rip.style.opacity = '1';
      setTimeout(() => {
        rip.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
        rip.style.transform = 'scale(2.5)';
        rip.style.opacity = '0';
      }, 20);
    };
  });
}

export async function moveCursorSmooth(page: Page, targetX: number, targetY: number, steps = 30) {
  const start = await page.evaluate(() => (window as any).__cursorPos || { x: 100, y: 100 });
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    // Cubic ease-out with slight overshoot
    const ease = 1 - Math.pow(1 - t, 3);
    const curX = start.x + (targetX - start.x) * ease;
    const curY = start.y + (targetY - start.y) * ease;
    await page.evaluate(({ x, y }) => (window as any).__setCursor(x, y), { x: curX, y: curY });
    await page.mouse.move(curX, curY);
    await page.waitForTimeout(16); // ~60fps step
  }
}

export async function clickWithRipple(page: Page, targetX: number, targetY: number) {
  await moveCursorSmooth(page, targetX, targetY, 20);
  await page.evaluate(() => (window as any).__triggerRipple());
  await page.mouse.click(targetX, targetY);
  await page.waitForTimeout(100);
}
