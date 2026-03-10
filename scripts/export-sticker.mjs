/**
 * Export sticker-circle-v2.svg → PNG (300 dpi) + PDF/X-1a (CMYK, print-ready)
 * Uses @resvg/resvg-js for accurate SVG rendering
 * Uses ImageMagick for CMYK conversion + Ghostscript for PDF/X-1a
 *
 * 60mm bleed canvas at 300 dpi = 60 × (300/25.4) = 708.66 → 709px
 */

import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRINT_DIR = join(__dirname, '..', 'print');
const SVG_FILE = join(PRINT_DIR, 'sticker-circle-v2.svg');
const PNG_FILE = join(PRINT_DIR, 'sticker-circle-v2.png');
const CMYK_PDF = join(PRINT_DIR, 'sticker-circle-v2-cmyk.pdf');
const PDFX_FILE = join(PRINT_DIR, 'sticker-circle-v2-pdfx1a.pdf');

// 60mm at 300 dpi
const DPI = 300;
const MM = 60;
const PX = Math.round(MM * DPI / 25.4); // 709px

// --- Step 1: SVG → PNG ---
console.log(`Rendering SVG at ${PX}×${PX}px (${DPI} dpi, ${MM}mm)…`);

const svg = readFileSync(SVG_FILE, 'utf-8');

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: PX },
  font: { loadSystemFonts: true },
  dpi: DPI,
});

const pngData = resvg.render();
const pngBuffer = pngData.asPng();

writeFileSync(PNG_FILE, pngBuffer);
console.log(`PNG: ${PNG_FILE}`);
console.log(`  Size: ${pngData.width}×${pngData.height}px`);

// --- Step 2: PNG → CMYK PDF via ImageMagick ---
console.log('\nConverting to CMYK PDF…');
try {
  execSync(
    `magick -density ${DPI} -units PixelsPerInch "${PNG_FILE}" -colorspace CMYK -compress LZW "${CMYK_PDF}"`,
    { stdio: 'inherit' }
  );
  console.log(`CMYK PDF: ${CMYK_PDF}`);
} catch (e) {
  console.error('ImageMagick CMYK conversion failed:', e.message);
  process.exit(1);
}

// --- Step 3: CMYK PDF → PDF/X-1a via Ghostscript ---
console.log('\nConverting to PDF/X-1a…');

// PDF/X-1a definition postscript — tells Ghostscript the output intent
const pdfxDef = join(PRINT_DIR, '_pdfx_def.ps');
const iccProfile = 'C:/Program Files/gs/gs10.04.0/iccprofiles/default_cmyk.icc';

// MediaBox in points: 60mm = 170.08pt
const ptSize = Math.round(MM * 72 / 25.4 * 100) / 100;

writeFileSync(pdfxDef, `
%!PS
% PDF/X-1a output intent definition

/ICCProfile (${iccProfile.replace(/\\/g, '/')})
def

[/Title (Gaari Sticker 60mm)
 /DOCINFO pdfmark

[ /GTS_PDFXVersion (PDF/X-1a:2003)
  /GTS_PDFXConformance (PDF/X-1a:2003)
  /Title (Gaari Sticker 60mm)
  /Type /Catalog
  /DOCINFO pdfmark

[ /DestOutputProfile ICCProfile
  /OutputConditionIdentifier (Custom CMYK)
  /Info (CMYK print profile)
  /OutputCondition (CMYK)
  /RegistryName (http://www.color.org)
  /DestOutputProfileRef ICCProfile
  /Type /OutputIntent
  /S /GTS_PDFX
  /OutputIntents pdfmark
`);

try {
  execSync([
    'gswin64c',
    '-dPDFX',
    '-dBATCH',
    '-dNOPAUSE',
    '-dNOOUTERSAVE',
    '-sDEVICE=pdfwrite',
    `-sOutputFile="${PDFX_FILE}"`,
    '-dPDFSETTINGS=/prepress',
    '-dCompatibilityLevel=1.3',
    `-dDEVICEWIDTHPOINTS=${ptSize}`,
    `-dDEVICEHEIGHTPOINTS=${ptSize}`,
    '-dAutoRotatePages=/None',
    '-dColorConversionStrategy=/CMYK',
    '-dProcessColorModel=/DeviceCMYK',
    `-sColorConversionStrategyForImages=/CMYK`,
    `"${pdfxDef}"`,
    `"${CMYK_PDF}"`,
  ].join(' '), { stdio: 'inherit' });

  // Clean up temp files
  unlinkSync(pdfxDef);

  console.log(`PDF/X-1a: ${PDFX_FILE}`);
} catch (e) {
  console.error('Ghostscript PDF/X-1a conversion failed:', e.message);
  try { unlinkSync(pdfxDef); } catch {}
  console.log('Falling back to CMYK PDF (not PDF/X-1a).');
}

console.log('\nDone. Files in print/:');
console.log(`  sticker-circle-v2.svg         — source (60mm, vector)`);
console.log(`  sticker-circle-v2.png         — 300 dpi PNG, ${PX}×${PX}px`);
console.log(`  sticker-circle-v2-cmyk.pdf    — CMYK PDF`);
console.log(`  sticker-circle-v2-pdfx1a.pdf  — PDF/X-1a (print-ready, upload this)`);
