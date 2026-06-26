const config = require('../config');
const { compressPdfBuffer } = require('./pdfCompress');

// Optional background PDF-compression queue. Disabled unless
// PDF_COMPRESS_QUEUE=true AND a Redis connection can be established. When
// disabled, compressAndUploadPdf() compresses synchronously instead, so this is
// purely an upload-latency optimization and never a correctness dependency.

let queue = null;
let enabled = false;

const isQueueEnabled = () => enabled;

/**
 * Initialize the queue + in-process worker. Call once at server startup.
 * Safe to call when disabled or when Redis is unavailable — it degrades to
 * synchronous compression.
 */
function initPdfQueue() {
  if (process.env.PDF_COMPRESS_QUEUE !== 'true') {
    console.log('[pdfQueue] disabled. PDFs compress synchronously on upload. ' +
      'Set PDF_COMPRESS_QUEUE=true (with Redis) to compress in the background.');
    return;
  }

  try {
    const Queue = require('bull');
    queue = new Queue('pdf-compress', {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        maxRetriesPerRequest: 3,
      },
    });

    // Worker: download the object, compress, and overwrite the SAME key so the
    // stored URL stays valid. Lazy require avoids a load-time cycle.
    queue.process(2, async (job) => {
      const { getPdf, putPdf } = require('./pdfUpload');
      const { key } = job.data;
      const original = await getPdf(key);
      const compressed = await compressPdfBuffer(original, { minBytesToCompress: 0 });
      if (compressed.length > 0 && compressed.length < original.length) {
        await putPdf(key, compressed);
        return { key, before: original.length, after: compressed.length };
      }
      return { key, skipped: true };
    });

    queue.on('failed', (job, err) =>
      console.warn('[pdfQueue] job failed for', job?.data?.key, '-', err.message));
    queue.on('error', (err) => console.warn('[pdfQueue] error:', err.message));

    enabled = true;
    console.log('[pdfQueue] enabled — PDFs will be compressed in the background.');
  } catch (e) {
    console.warn('[pdfQueue] init failed, using synchronous compression instead:', e.message);
    queue = null;
    enabled = false;
  }
}

/** Enqueue a compression job for an already-uploaded S3 key. No-op if disabled. */
async function enqueuePdfCompress(key) {
  if (!queue) return;
  try {
    await queue.add({ key }, {
      attempts: 2,
      backoff: 5000,
      removeOnComplete: true,
      removeOnFail: 50,
    });
  } catch (e) {
    console.warn('[pdfQueue] enqueue failed for', key, '-', e.message);
  }
}

module.exports = { initPdfQueue, enqueuePdfCompress, isQueueEnabled };
