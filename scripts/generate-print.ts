/**
 * Generate print-ready marketing assets for Gåri.
 *
 * Output: print/ directory (gitignored)
 *   - sticker-circle.png    75mm @ 300dpi (886×886px)
 *   - sticker-rect.png      90×55mm @ 300dpi (1063×650px)
 *   - poster-a4.png         A4 @ 150dpi (1240×1754px)
 *   - poster-a3.png         A3 @ 150dpi (1754×2480px)
 *
 * Usage: cd scripts && npx tsx generate-print.ts
 */

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import QRCode from 'qrcode';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'print');

// Design tokens
const RED = '#C82D2D';
const WHITE = '#FFFFFF';
const TEXT_PRIMARY = '#141414';
const TEXT_MUTED = '#595959';

// Copy (settled in copywriting session)
const STICKER_TAGLINE = 'Alt som skjer i Bergen — på ett sted';
const POSTER_HEADLINE = "Ke\u2019 det G\u00e5ri, Bergen?";
const POSTER_BODY_1 = 'Skodde eller sol — det er alltid noe som skjer i Bergen.';
const POSTER_BODY_2 = 'Finn alt på gaari.no';
const URL = 'gaari.no';
const QR_URL = 'https://gaari.no';

async function loadFonts() {
  const interData = readFileSync(join(ROOT, 'static/fonts/Inter-Regular.ttf'));
  const barlowData = readFileSync(join(ROOT, 'static/fonts/BarlowCondensed-Bold.ttf'));
  return [
    { name: 'Inter', data: interData.buffer as ArrayBuffer, weight: 400 as const, style: 'normal' as const },
    { name: 'Barlow Condensed', data: barlowData.buffer as ArrayBuffer, weight: 700 as const, style: 'normal' as const },
  ];
}

async function makeQrDataUrl(size: number): Promise<string> {
  return QRCode.toDataURL(QR_URL, {
    width: size,
    margin: 1,
    color: { dark: TEXT_PRIMARY, light: WHITE },
    errorCorrectionLevel: 'M',
  });
}

async function render(markup: object, width: number, height: number, fonts: Awaited<ReturnType<typeof loadFonts>>): Promise<Buffer> {
  const svg = await satori(markup as Parameters<typeof satori>[0], { width, height, fonts });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  return Buffer.from(resvg.render().asPng());
}

// ─── Sticker circle (886×886px = 75mm @ 300dpi) ──────────────────────────────

function stickerCircleMarkup(qrDataUrl: string) {
  const S = 886;
  const pad = 68;
  const qrSize = 380;
  const qrBoxPad = 18;

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: S,
        height: S,
        backgroundColor: RED,
        borderRadius: S / 2,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        padding: pad,
      },
      children: [
        // Headline — fill the visual width of the circle
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: 88,
              fontFamily: 'Barlow Condensed',
              color: WHITE,
              letterSpacing: '-0.02em',
              lineHeight: 1.0,
              textAlign: 'center',
            },
            children: "Ke\u2019 det G\u00e5ri, Bergen?",
          },
        },
        // QR code in white box
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              backgroundColor: WHITE,
              borderRadius: 14,
              padding: qrBoxPad,
            },
            children: [
              {
                type: 'img',
                props: {
                  src: qrDataUrl,
                  width: qrSize,
                  height: qrSize,
                  style: { display: 'flex' },
                },
              },
            ],
          },
        },
        // URL anchor
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: 36,
              fontFamily: 'Barlow Condensed',
              color: 'rgba(255,255,255,0.75)',
              letterSpacing: '0.04em',
            },
            children: 'gaari.no',
          },
        },
      ],
    },
  };
}

// ─── Sticker rectangle (1063×650px = 90×55mm @ 300dpi) ───────────────────────

function stickerRectMarkup(qrDataUrl: string) {
  const W = 1063;
  const H = 650;
  const qrSize = 380;
  const qrBoxPad = 16;

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: W,
        height: H,
        backgroundColor: RED,
        flexDirection: 'row',
        alignItems: 'center',
        padding: '48px 52px',
        gap: 48,
      },
      children: [
        // Left: text content
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flex: 1,
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 16,
            },
            children: [
              // Headline — intentional single line
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: 68,
                    fontFamily: 'Barlow Condensed',
                    color: WHITE,
                    letterSpacing: '-0.02em',
                    lineHeight: 0.95,
                    whiteSpace: 'nowrap',
                  },
                  children: "Ke\u2019 det G\u00e5ri, Bergen?",
                },
              },
              // Separator line
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    width: 48,
                    height: 3,
                    backgroundColor: 'rgba(255,255,255,0.5)',
                  },
                },
              },
              // Subtitle — larger, readable from distance
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: 40,
                    fontFamily: 'Barlow Condensed',
                    color: 'rgba(255,255,255,0.9)',
                    letterSpacing: '0.01em',
                    lineHeight: 1.15,
                  },
                  children: 'Alle arrangementer\ni Bergen p\u00e5 ett sted',
                },
              },
              // URL anchor
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: 28,
                    fontFamily: 'Barlow Condensed',
                    color: 'rgba(255,255,255,0.55)',
                    letterSpacing: '0.05em',
                  },
                  children: 'gaari.no',
                },
              },
            ],
          },
        },
        // Right: QR code in white box
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              backgroundColor: WHITE,
              borderRadius: 12,
              padding: qrBoxPad,
              flexShrink: 0,
            },
            children: [
              {
                type: 'img',
                props: {
                  src: qrDataUrl,
                  width: qrSize,
                  height: qrSize,
                  style: { display: 'flex' },
                },
              },
            ],
          },
        },
      ],
    },
  };
}

// ─── Poster A4 (1240×1754px = 210×297mm @ 150dpi) ────────────────────────────

function posterA4Markup(qrDataUrl: string) {
  const W = 1240;
  const H = 1754;
  const qrSize = 740;
  const qrBoxPad = 24;

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: W,
        height: H,
        backgroundColor: RED,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 80px',
        gap: 44,
      },
      children: [
        // Headline
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: 116,
              fontFamily: 'Barlow Condensed',
              color: WHITE,
              letterSpacing: '-0.02em',
              lineHeight: 1.0,
              textAlign: 'center',
            },
            children: POSTER_HEADLINE,
          },
        },
        // Thin white rule — separates brand from action
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              width: 80,
              height: 3,
              backgroundColor: 'rgba(255,255,255,0.4)',
            },
          },
        },
        // QR code in white box
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              backgroundColor: WHITE,
              borderRadius: 20,
              padding: qrBoxPad,
            },
            children: [
              {
                type: 'img',
                props: {
                  src: qrDataUrl,
                  width: qrSize,
                  height: qrSize,
                  style: { display: 'flex' },
                },
              },
            ],
          },
        },
        // Tagline
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: 48,
              fontFamily: 'Barlow Condensed',
              color: WHITE,
              textAlign: 'center',
              lineHeight: 1.2,
            },
            children: 'Alle arrangementer i Bergen p\u00e5 ett sted',
          },
        },
        // URL — always show, gives people something to act on
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: 38,
              fontFamily: 'Barlow Condensed',
              color: 'rgba(255,255,255,0.6)',
              letterSpacing: '0.06em',
              textAlign: 'center',
            },
            children: 'gaari.no',
          },
        },
      ],
    },
  };
}

// ─── Poster A3 (1754×2480px = 297×420mm @ 150dpi) ────────────────────────────
// Scale up from A4 proportionally (factor ~1.41)

function posterA3Markup(qrDataUrl: string) {
  const W = 1754;
  const H = 2480;
  const qrSize = 1040;

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: W,
        height: H,
        backgroundColor: RED,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '140px 112px',
        gap: 64,
      },
      children: [
        // Headline
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: 164,
              fontFamily: 'Barlow Condensed',
              color: WHITE,
              letterSpacing: '-0.02em',
              lineHeight: 1.0,
              textAlign: 'center',
            },
            children: POSTER_HEADLINE,
          },
        },
        // Thin white rule
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              width: 112,
              height: 4,
              backgroundColor: 'rgba(255,255,255,0.4)',
            },
          },
        },
        // QR code in white box
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              backgroundColor: WHITE,
              borderRadius: 28,
              padding: 32,
            },
            children: [
              {
                type: 'img',
                props: {
                  src: qrDataUrl,
                  width: qrSize,
                  height: qrSize,
                  style: { display: 'flex' },
                },
              },
            ],
          },
        },
        // Tagline
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: 68,
              fontFamily: 'Barlow Condensed',
              color: WHITE,
              textAlign: 'center',
              lineHeight: 1.2,
            },
            children: 'Alle arrangementer i Bergen p\u00e5 ett sted',
          },
        },
        // URL
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: 52,
              fontFamily: 'Barlow Condensed',
              color: 'rgba(255,255,255,0.6)',
              letterSpacing: '0.06em',
              textAlign: 'center',
            },
            children: 'gaari.no',
          },
        },
      ],
    },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  console.log('Loading fonts...');
  const fonts = await loadFonts();

  console.log('Generating QR codes...');
  const [qrSmall, qrMedium, qrLarge] = await Promise.all([
    makeQrDataUrl(460),   // sticker circle
    makeQrDataUrl(420),   // sticker rect
    makeQrDataUrl(1200),  // posters
  ]);

  const assets = [
    { name: 'sticker-circle.png', markup: stickerCircleMarkup(qrSmall),   w: 886,  h: 886  },
    { name: 'sticker-rect.png',   markup: stickerRectMarkup(qrMedium),    w: 1063, h: 650  },
    { name: 'poster-a4.png',      markup: posterA4Markup(qrLarge),        w: 1240, h: 1754 },
    { name: 'poster-a3.png',      markup: posterA3Markup(qrLarge),        w: 1754, h: 2480 },
  ];

  for (const { name, markup, w, h } of assets) {
    process.stdout.write(`Generating ${name}...`);
    const png = await render(markup, w, h, fonts);
    writeFileSync(join(OUT_DIR, name), png);
    const kb = Math.round(png.length / 1024);
    console.log(` ${kb} KB`);
  }

  console.log(`\nDone! Files written to print/`);
  console.log('  sticker-circle.png  — 75mm rund @ 300dpi (send til stickertrykkeri)');
  console.log('  sticker-rect.png    — 90×55mm @ 300dpi (send til stickertrykkeri)');
  console.log('  poster-a4.png       — A4 @ 150dpi (skriv ut på laserskriver eller send til kopieringsbutikk)');
  console.log('  poster-a3.png       — A3 @ 150dpi (send til kopieringsbutikk eller plakattrykkeri)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
