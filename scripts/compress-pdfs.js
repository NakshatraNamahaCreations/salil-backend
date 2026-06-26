#!/usr/bin/env node
/**
 * Batch-compress a folder of PDFs with Ghostscript.
 *
 * Usage:
 *   node scripts/compress-pdfs.js [inputDir] [outputDir]
 *   npm run compress-pdfs -- ./pdfs-in ./pdfs-out
 *
 * Defaults: inputDir = ./pdfs-in, outputDir = ./pdfs-out
 *
 * Requires Ghostscript installed:
 *   - Windows: https://ghostscript.com/releases/  (binary: gswin64c)
 *   - macOS:   brew install ghostscript
 *   - Linux:   sudo apt-get install ghostscript
 * Override the binary / quality with env vars:
 *   GHOSTSCRIPT_PATH=/path/to/gs  PDF_COMPRESS_PRESET=/screen  node scripts/compress-pdfs.js
 *   (/ebook ≈ 150 DPI default, /screen ≈ 72 DPI for the smallest files)
 */
const fs = require('fs');
const path = require('path');
const { compressPdfBuffer, GS_BIN, PDF_SETTINGS } = require('../src/common/pdfCompress');

const inputDir = path.resolve(process.argv[2] || './pdfs-in');
const outputDir = path.resolve(process.argv[3] || './pdfs-out');

const mb = (n) => (n / 1024 / 1024).toFixed(2) + 'MB';

async function main() {
  if (!fs.existsSync(inputDir)) {
    console.error(`Input folder not found: ${inputDir}`);
    console.error(`Create it and drop your PDFs in, or pass a path: node scripts/compress-pdfs.js <inputDir> <outputDir>`);
    process.exit(1);
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const files = fs.readdirSync(inputDir).filter((f) => f.toLowerCase().endsWith('.pdf'));
  if (files.length === 0) {
    console.error(`No PDF files found in ${inputDir}`);
    process.exit(1);
  }

  console.log(`Ghostscript: ${GS_BIN}   preset: ${PDF_SETTINGS}`);
  console.log(`Compressing ${files.length} PDF(s) from ${inputDir}\n`);

  let totalIn = 0;
  let totalOut = 0;
  let failed = 0;

  for (const name of files) {
    const inPath = path.join(inputDir, name);
    const outPath = path.join(outputDir, name);
    try {
      const input = fs.readFileSync(inPath);
      // minBytesToCompress: 0 → attempt every file regardless of size.
      const output = await compressPdfBuffer(input, { minBytesToCompress: 0 });
      fs.writeFileSync(outPath, output);

      totalIn += input.length;
      totalOut += output.length;
      const pct = input.length ? Math.round((1 - output.length / input.length) * 100) : 0;
      const note = output.length < input.length ? `-${pct}%` : 'no change';
      console.log(`✓ ${name.padEnd(40)} ${mb(input.length)} → ${mb(output.length)}  (${note})`);
    } catch (err) {
      failed++;
      console.error(`✗ ${name} — ${err.message}`);
    }
  }

  const savedPct = totalIn ? Math.round((1 - totalOut / totalIn) * 100) : 0;
  console.log(`\nDone. ${files.length - failed} compressed, ${failed} failed.`);
  console.log(`Total: ${mb(totalIn)} → ${mb(totalOut)}  (saved ${savedPct}%)`);
  console.log(`Output: ${outputDir}`);
  if (totalOut >= totalIn) {
    console.log('\n⚠ Files did not shrink. Ghostscript may not be installed — see the header of this script.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
