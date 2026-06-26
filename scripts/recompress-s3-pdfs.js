#!/usr/bin/env node
/**
 * Re-compress PDFs ALREADY uploaded to S3, in place.
 *
 * For every published PDF chapter it downloads the object, compresses it with
 * Ghostscript, and (with --apply) overwrites the SAME S3 key — so rawPdfUrl
 * stays valid and no DB change is needed.
 *
 * Usage:
 *   node scripts/recompress-s3-pdfs.js                 # DRY RUN — reports savings, changes nothing
 *   node scripts/recompress-s3-pdfs.js --apply         # actually overwrite the S3 objects
 *   node scripts/recompress-s3-pdfs.js --min-mb=2      # only touch files >= 2 MB (default 1)
 *   node scripts/recompress-s3-pdfs.js --apply --min-mb=5
 *
 * Requires Ghostscript installed (see scripts/compress-pdfs.js header) and the
 * usual MONGODB_URI / AWS_* env vars in .env.
 */
const config = require('../src/config');               // loads dotenv
const mongoose = require('mongoose');
const { getPdfFromUrl, putPdfToUrl, headPdfSizeFromUrl } = require('../src/common/pdfUpload');
const { compressPdfBuffer } = require('../src/common/pdfCompress');
const Chapter = require('../src/modules/chapters/Chapter.model');

const APPLY = process.argv.includes('--apply');
const minArg = process.argv.find((a) => a.startsWith('--min-mb='));
const MIN_BYTES = (minArg ? parseFloat(minArg.split('=')[1]) : 1) * 1024 * 1024;

const mb = (n) => (n / 1024 / 1024).toFixed(2) + 'MB';

async function main() {
  console.log(APPLY ? '*** APPLY MODE — S3 objects will be overwritten ***' : '— DRY RUN (no changes) —');
  await mongoose.connect(config.mongodb.uri);

  const chapters = await Chapter.find({
    sourceType: 'pdf',
    rawPdfUrl: { $nin: [null, ''] },
  }).select('_id title rawPdfUrl').lean();

  console.log(`Found ${chapters.length} PDF chapter(s).\n`);

  let totalIn = 0, totalOut = 0, changed = 0, skipped = 0, failed = 0;

  for (const ch of chapters) {
    try {
      // Cheap HEAD first: skip small files without downloading them (fast re-runs).
      const headSize = await headPdfSizeFromUrl(ch.rawPdfUrl);
      if (headSize < MIN_BYTES) { skipped++; continue; }

      // Big scans can take several minutes in Ghostscript — give them room and
      // show a heads-up line so the run doesn't look stuck.
      if (headSize > 8 * 1024 * 1024) {
        console.log(`… compressing ${String(ch.title).slice(0, 36)} (${mb(headSize)}) — may take a few minutes`);
      }

      const original = await getPdfFromUrl(ch.rawPdfUrl);
      const compressed = await compressPdfBuffer(original, { minBytesToCompress: 0, timeoutMs: 900000 });
      const smaller = compressed.length > 0 && compressed.length < original.length;

      totalIn += original.length;
      totalOut += smaller ? compressed.length : original.length;

      if (smaller) {
        const pct = Math.round((1 - compressed.length / original.length) * 100);
        console.log(`${APPLY ? '✓' : '·'} ${String(ch.title).slice(0, 36).padEnd(38)} ${mb(original.length)} → ${mb(compressed.length)} (-${pct}%)`);
        if (APPLY) { await putPdfToUrl(ch.rawPdfUrl, compressed); changed++; }
      } else {
        skipped++;
      }
    } catch (err) {
      failed++;
      console.error(`✗ ${ch._id} (${ch.title}) — ${err.message}`);
    }
  }

  const savedPct = totalIn ? Math.round((1 - totalOut / totalIn) * 100) : 0;
  console.log(`\n${APPLY ? 'Overwrote' : 'Would compress'} ${APPLY ? changed : (changed || '—')} file(s). Skipped ${skipped}, failed ${failed}.`);
  console.log(`Total of processed: ${mb(totalIn)} → ${mb(totalOut)} (saved ${savedPct}%)`);
  if (!APPLY) console.log('\nRe-run with --apply to write these changes to S3.');

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
