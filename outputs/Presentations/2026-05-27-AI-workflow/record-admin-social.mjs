// Tar opp /admin/social-siden fra lokal dev-server.
// Forutsetter at npm run dev kjører på localhost:5173 og ADMIN_PASSWORD ligger i ../../../.env.
//
// Workflow:
//   1. Leser ADMIN_PASSWORD fra Gaari-rota sin .env
//   2. Åpner browser headless, går til /admin/login, fyller inn passord
//   3. Naviger til /admin/social, vent på data, ta opp scroll-tour
//   4. Lagrer som webm
//
// Kjør: node record-admin-social.mjs

import { chromium } from 'playwright-chromium';
import { mkdir, rename, readdir, rm, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const DEV_URL = process.env.GAARI_DEV_URL || 'http://localhost:5173';
const TARGET_PATH = '/admin/social';
const OUT_DIR = './assets/_rec';
const ENV_PATH = resolve('c:/Users/kjers/Projects/Gaari/.env');

// Read ADMIN_PASSWORD from .env (without committing it anywhere)
let adminPassword = process.env.ADMIN_PASSWORD;
if (!adminPassword) {
  const envText = await readFile(ENV_PATH, 'utf8');
  const match = envText.match(/^ADMIN_PASSWORD=(.*)$/m);
  if (!match) throw new Error('ADMIN_PASSWORD not found in ' + ENV_PATH);
  adminPassword = match[1].trim().replace(/^["']|["']$/g, '');
}

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

console.log(`Logging in via ${DEV_URL}/admin/login ...`);
await page.goto(`${DEV_URL}/admin/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.fill('input[name="password"]', adminPassword);
await Promise.all([
  page.waitForURL(/\/admin\/(?!login)/, { timeout: 30000 }),
  page.click('button[type="submit"]'),
]);
console.log('Logged in. Navigating to', TARGET_PATH);

await page.goto(`${DEV_URL}${TARGET_PATH}`, { waitUntil: 'networkidle', timeout: 30000 });

// Wait for the page heading and report what's on the page
await page.waitForSelector('h1', { timeout: 15000 });
const diagnostic = await page.evaluate(() => ({
  articleCount: document.querySelectorAll('article').length,
  imageCount: document.querySelectorAll('img').length,
}));
console.log('Diagnostic:', JSON.stringify(diagnostic));

// Pre-scroll to bottom to trigger ALL lazy-loaded images,
// then scroll back to top so the real recording starts with everything cached.
console.log('Pre-scroll to trigger lazy loads ...');
await page.evaluate(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  // jump scroll to bottom in 6 steps
  for (let i = 1; i <= 6; i++) {
    window.scrollTo(0, (maxScroll * i) / 6);
    await sleep(150);
  }
});

// Force-load any remaining images and wait until everything is complete
await page.evaluate(async () => {
  const imgs = Array.from(document.querySelectorAll('img'));
  imgs.forEach(img => { img.loading = 'eager'; });
  await Promise.all(imgs.map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise(resolve => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
      setTimeout(resolve, 8000);
    });
  }));
});
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

// Scroll back to top
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
console.log('Images cached. Settling 1.5s before scroll-recording ...');
await page.waitForTimeout(1500);

// Smooth scroll tour
await page.evaluate(async () => {
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  async function smoothScroll(fromPx, toPx, durationMs) {
    return new Promise((resolve) => {
      const start = performance.now();
      function step(now) {
        const t = Math.min((now - start) / durationMs, 1);
        const eased = 0.5 - Math.cos(t * Math.PI) / 2;
        window.scrollTo(0, fromPx + (toPx - fromPx) * eased);
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  }
  await sleep(800);
  await smoothScroll(0, maxScroll, 10000);
  await sleep(900);
  await smoothScroll(maxScroll, 0, 3500);
  await sleep(600);
});

await context.close();
await browser.close();

const files = await readdir(OUT_DIR);
const webm = files.find(f => f.endsWith('.webm'));
if (!webm) {
  console.error('No webm produced');
  process.exit(1);
}
await rename(join(OUT_DIR, webm), './assets/admin-social.webm');
await rm(OUT_DIR, { recursive: true, force: true });
console.log('Wrote ./assets/admin-social.webm');
console.log('Neste steg: konverter til mp4 og oppdater slide 8.');
