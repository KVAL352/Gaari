// Tar opp en loopable scroll-tour av gaari.no for slide 2.
// Bruker requestAnimationFrame for smooth scroll + pre-load av alle bilder.
// Kjør: node record-gaari.mjs

import { chromium } from 'playwright-chromium';
import { mkdir, rename, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const OUT_DIR = './assets/_rec';
const VIDEO_OUT = './assets/gaari-forside.webm';

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

console.log('Loader gaari.no ...');
await page.goto('https://gaari.no', { waitUntil: 'networkidle', timeout: 30000 });

// Pre-scroll for å trigge lazy-loaded bilder, så scroll tilbake til topp
console.log('Pre-scroll for å laste alle bilder ...');
await page.evaluate(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  for (let i = 1; i <= 8; i++) {
    window.scrollTo(0, (maxScroll * i) / 8);
    await sleep(180);
  }
});

// Force-load alle img-elementer
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

// Scroll tilbake til topp og settle
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
console.log('Bilder cachet. Settling 1.5s før scroll-opptak ...');
await page.waitForTimeout(1500);

console.log('Smooth scroll-tour ...');
await page.evaluate(async () => {
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const target = Math.min(maxScroll, 4500);
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
  await sleep(700);
  await smoothScroll(0, target, 10000);
  await sleep(900);
  await smoothScroll(target, 0, 3500);
  await sleep(700);
});

await context.close();
await browser.close();

const files = await readdir(OUT_DIR);
const webm = files.find(f => f.endsWith('.webm'));
if (!webm) {
  console.error('Ingen .webm-fil funnet i', OUT_DIR);
  process.exit(1);
}
await rename(join(OUT_DIR, webm), VIDEO_OUT);
await rm(OUT_DIR, { recursive: true, force: true });
console.log('Skrev', VIDEO_OUT);
