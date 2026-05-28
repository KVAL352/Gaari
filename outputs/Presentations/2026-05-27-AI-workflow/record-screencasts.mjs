// Tar opp 3 screencaster for slide 6, 7, 8.
// Kjør: node record-screencasts.mjs

import { chromium } from 'playwright-chromium';
import { mkdir, rename, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = './assets/_rec';

async function record({ url, outFile, duration, scroll }) {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  if (scroll) {
    // Smooth scroll tour using requestAnimationFrame (60 fps) with ease-in-out
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

      // hold at top briefly so the start frame is recognisable
      await sleep(700);
      // slow scroll down (~9s)
      await smoothScroll(0, maxScroll, 9000);
      // pause at bottom
      await sleep(800);
      // faster scroll back up (~3s)
      await smoothScroll(maxScroll, 0, 3000);
      // hold at top
      await sleep(700);
    });
  } else {
    // Just wait for the animation loop to play
    await page.waitForTimeout(duration);
  }

  await context.close();
  await browser.close();

  const files = await readdir(OUT_DIR);
  const webm = files.find(f => f.endsWith('.webm'));
  if (!webm) throw new Error('No webm produced');
  await rename(join(OUT_DIR, webm), outFile);
  console.log('Wrote', outFile);
}

const mockupRoot = 'file:///' + resolve(__dirname, 'assets', 'mockups').replace(/\\/g, '/');
const digestPath = 'file:///' + resolve('c:/Users/kjers/Projects/Gaari/scripts/.digest-preview/digest-2026-04-11.html').replace(/\\/g, '/');

// Slide 6: Claude Code terminal (3s static + 11s animation = 14s, record 15s)
await record({
  url: `${mockupRoot}/claude-code.html`,
  outFile: './assets/claude-terminal.webm',
  duration: 15000,
});

// Slide 7: morning terminal (3s static + 11s animation = 14s, record 15s)
await record({
  url: `${mockupRoot}/morning-terminal.html`,
  outFile: './assets/morning-terminal.webm',
  duration: 15000,
});

// Slide 8: meta CLI (3s static + 10s animation = 13s, record 14s)
await record({
  url: `${mockupRoot}/meta-cli.html`,
  outFile: './assets/meta-cli.webm',
  duration: 14000,
});

// Slide 9: newsletter scheduled (3s static + 10s animation = 13s, record 14s)
await record({
  url: `${mockupRoot}/newsletter-cli.html`,
  outFile: './assets/newsletter-cli.webm',
  duration: 14000,
});

// Cleanup
await rm(OUT_DIR, { recursive: true, force: true });
console.log('Done. All 3 webm files written to assets/');
