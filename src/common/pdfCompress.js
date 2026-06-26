const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// Ghostscript binary. Override with GHOSTSCRIPT_PATH if it isn't on PATH.
// On Windows the binary is typically `gswin64c`.
const GS_BIN =
  process.env.GHOSTSCRIPT_PATH ||
  (process.platform === 'win32' ? 'gswin64c' : 'gs');

// First-choice downsample preset. /ebook ≈ 150 DPI, /screen ≈ 72 DPI.
const PDF_SETTINGS = process.env.PDF_COMPRESS_PRESET || '/ebook';

const mb = (n) => (n / 1024 / 1024).toFixed(2) + 'MB';

/** Run Ghostscript once with a given preset. Returns the compressed Buffer, or throws. */
async function runGhostscript(inputBuffer, preset, timeoutMs) {
  const id = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const inPath = path.join(os.tmpdir(), `pdfc_in_${id}.pdf`);
  const outPath = path.join(os.tmpdir(), `pdfc_out_${id}.pdf`);
  try {
    await fs.promises.writeFile(inPath, inputBuffer);
    await execFileAsync(
      GS_BIN,
      [
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        `-dPDFSETTINGS=${preset}`,
        '-dNOPAUSE',
        '-dBATCH',
        '-dQUIET',
        '-dDetectDuplicateImages=true',
        '-dCompressFonts=true',
        `-sOutputFile=${outPath}`,
        inPath,
      ],
      { timeout: timeoutMs },
    );
    return await fs.promises.readFile(outPath);
  } finally {
    fs.promises.unlink(inPath).catch(() => {});
    fs.promises.unlink(outPath).catch(() => {});
  }
}

/**
 * Compress a PDF buffer toward a target size (default < 1 MB), trying
 * progressively stronger presets until it's under target (or out of presets).
 * Best-effort: if Ghostscript is unavailable or nothing helps, the ORIGINAL
 * buffer is returned so the upload never fails. Files already under the target
 * are left untouched.
 *
 * @param {Buffer} inputBuffer
 * @param {{ targetBytes?: number, minBytesToCompress?: number, timeoutMs?: number, presets?: string[] }} [opts]
 * @returns {Promise<Buffer>}
 */
async function compressPdfBuffer(inputBuffer, opts = {}) {
  const targetBytes = opts.targetBytes ?? 1024 * 1024;            // aim for < 1 MB
  const skipUnder = opts.minBytesToCompress ?? targetBytes;       // already small → leave it
  const timeoutMs = opts.timeoutMs ?? 120000;
  // Try the configured preset first, then progressively stronger ones.
  const presets = opts.presets || [...new Set([PDF_SETTINGS, '/ebook', '/screen'])];

  if (!Buffer.isBuffer(inputBuffer) || inputBuffer.length <= skipUnder) {
    return inputBuffer;
  }

  let best = inputBuffer;
  for (const preset of presets) {
    let out;
    try {
      out = await runGhostscript(inputBuffer, preset, timeoutMs);
    } catch (err) {
      console.warn(
        `[pdfCompress] Ghostscript unavailable or failed (${err.message}) — uploading original PDF. ` +
        `Install Ghostscript (or set GHOSTSCRIPT_PATH) to enable compression.`,
      );
      break; // gs broken/missing — no point trying more presets
    }
    if (out && out.length > 0 && out.length < best.length) best = out;
    if (best.length <= targetBytes) break; // reached the target
  }

  if (best.length < inputBuffer.length) {
    const savedPct = Math.round((1 - best.length / inputBuffer.length) * 100);
    const note = best.length <= targetBytes ? '' : ' (still above target)';
    console.log(`[pdfCompress] ${mb(inputBuffer.length)} → ${mb(best.length)} (-${savedPct}%)${note}`);
    return best;
  }
  return inputBuffer;
}

module.exports = { compressPdfBuffer, GS_BIN, PDF_SETTINGS };
