const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const config = require('../config');
const { compressPdfBuffer } = require('./pdfCompress');

const s3Client = new S3Client({
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
  region: config.aws.region,
  // Auto-retry against the bucket's real region if it lives somewhere other
  // than config.aws.region (avoids the "must be addressed using the specified
  // endpoint" 301 when uploading/migrating across regions).
  followRegionRedirects: true,
});

const BUCKET = config.aws.s3Bucket;

const newPdfKey = () => `pdfs/${Date.now()}-${Math.round(Math.random() * 1e9)}.pdf`;
const urlForKey = (key) => `https://${BUCKET}.s3.${config.aws.region}.amazonaws.com/${key}`;

/** Upload a PDF buffer to a specific S3 key (overwrites if it exists). */
async function putPdf(key, buffer) {
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'application/pdf',
    ContentDisposition: 'inline',
  }));
}

/** Download a PDF object from S3 into a Buffer. */
async function getPdf(key) {
  const resp = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks = [];
  for await (const chunk of resp.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// ── URL-based variants ──────────────────────────────────────────────────────
// Operate on the EXACT bucket + key encoded in a stored rawPdfUrl (which may
// differ from the configured upload bucket). Used by the migration so it reads
// and overwrites the same object the app serves.
const { extractS3Parts } = require('./signedUrl');

async function getPdfFromUrl(url) {
  const parts = extractS3Parts(url);
  if (!parts) throw new Error(`Invalid S3 URL: ${url}`);
  const resp = await s3Client.send(new GetObjectCommand({ Bucket: parts.bucket, Key: parts.key }));
  const chunks = [];
  for await (const chunk of resp.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function putPdfToUrl(url, buffer) {
  const parts = extractS3Parts(url);
  if (!parts) throw new Error(`Invalid S3 URL: ${url}`);
  await s3Client.send(new PutObjectCommand({
    Bucket: parts.bucket,
    Key: parts.key,
    Body: buffer,
    ContentType: 'application/pdf',
    ContentDisposition: 'inline',
  }));
}

/** Get the byte size of an S3 object without downloading it (HEAD request). */
async function headPdfSizeFromUrl(url) {
  const parts = extractS3Parts(url);
  if (!parts) throw new Error(`Invalid S3 URL: ${url}`);
  const resp = await s3Client.send(new HeadObjectCommand({ Bucket: parts.bucket, Key: parts.key }));
  return resp.ContentLength || 0;
}

/**
 * Store a PDF and ensure it gets compressed.
 *  - If the background queue is enabled (PDF_COMPRESS_QUEUE=true + Redis up):
 *    upload the original immediately and enqueue a job that compresses and
 *    overwrites the SAME key (so the URL never changes), keeping the upload fast.
 *  - Otherwise: compress synchronously before uploading (default).
 *
 * @param {Buffer} buffer
 * @returns {Promise<string>} public S3 URL
 */
async function compressAndUploadPdf(buffer) {
  const key = newPdfKey();

  // Lazy require breaks the pdfUpload <-> pdfQueue require cycle.
  let queue = null;
  try { queue = require('./pdfQueue'); } catch { /* queue module optional */ }

  if (queue && queue.isQueueEnabled()) {
    await putPdf(key, buffer);            // original now…
    await queue.enqueuePdfCompress(key);  // …compressed in the background
    return urlForKey(key);
  }

  const optimized = await compressPdfBuffer(buffer);
  await putPdf(key, optimized);
  return urlForKey(key);
}

module.exports = { compressAndUploadPdf, putPdf, getPdf, getPdfFromUrl, putPdfToUrl, headPdfSizeFromUrl, newPdfKey, urlForKey, s3Client };
