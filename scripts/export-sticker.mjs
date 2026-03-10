/**
 * Export sticker-circle-v2.svg → PNG (300 dpi) + CMYK PDF
 * Uses @resvg/resvg-js for accurate SVG rendering
 *
 * 60mm bleed canvas at 300 dpi = 60 × (300/25.4) = 708.66 → 709px
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRINT_DIR = join(__dirname, '..', 'print');
const SVG_FILE = join(PRINT_DIR, 'sticker-circle-v2.svg');
const PNG_FILE = join(PRINT_DIR, 'sticker-circle-v2.png');
const PDF_FILE = join(PRINT_DIR, 'sticker-circle-v2-cmyk.pdf');

// 60mm at 300 dpi
const DPI = 300;
const MM = 60;
const PX = Math.round(MM * DPI / 25.4); // 709px

console.log(`Rendering SVG at ${PX}×${PX}px (${DPI} dpi, ${MM}mm)…`);

const svg = readFileSync(SVG_FILE, 'utf-8');

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: PX },
  font: {
    loadSystemFonts: true,
  },
  dpi: DPI,
});

const pngData = resvg.render();
const pngBuffer = pngData.asPng();

writeFileSync(PNG_FILE, pngBuffer);
console.log(`PNG: ${PNG_FILE}`);
console.log(`  Size: ${pngData.width}×${pngData.height}px`);

// Convert PNG → CMYK PDF via ImageMagick
// -density 300: tag as 300dpi
// -colorspace CMYK: convert to CMYK
// -compress LZW: lossless compression
console.log('\nConverting to CMYK PDF…');
try {
  execSync(
    `magick -density ${DPI} -units PixelsPerInch "${PNG_FILE}" -colorspace CMYK -compress LZW "${PDF_FILE}"`,
    { stdio: 'inherit' }
  );
  console.log(`PDF: ${PDF_FILE}`);
} catch (e) {
  console.error('ImageMagick CMYK conversion failed:', e.message);
}

console.log('\nDone. Files in print/:');
console.log(`  sticker-circle-v2.svg      — source (60mm physical size, vector)`);
console.log(`  sticker-circle-v2.png      — 300 dpi PNG, ${PX}×${PX}px`);
console.log(`  sticker-circle-v2-cmyk.pdf — CMYK PDF (print-ready)`);
console.log('\nNB: For PDF/X-1a, open the PDF in Affinity Publisher or Adobe Acrobat');
console.log('    and export as PDF/X-1a with embedded fonts.');
