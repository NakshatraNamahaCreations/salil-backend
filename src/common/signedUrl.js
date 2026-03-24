const { S3Client, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../config');

const s3Client = new S3Client({
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
  region: config.aws.region,
});

/**
 * Extract the S3 key from a full S3 URL.
 * Supports both path-style and virtual-hosted-style URLs:
 *   https://bucket.s3.region.amazonaws.com/pdfs/file.pdf  → pdfs/file.pdf
 *   https://s3.region.amazonaws.com/bucket/pdfs/file.pdf  → pdfs/file.pdf
 */
const extractS3Key = (url) => {
  try {
    const parsed = new URL(url);
    // Virtual-hosted: bucket.s3.region.amazonaws.com/key
    if (parsed.hostname.includes('.s3.')) {
      return decodeURIComponent(parsed.pathname.slice(1)); // remove leading /
    }
    // Path-style: s3.region.amazonaws.com/bucket/key
    const parts = parsed.pathname.slice(1).split('/');
    parts.shift(); // remove bucket name
    return decodeURIComponent(parts.join('/'));
  } catch {
    return null;
  }
};

/**
 * Stream a PDF from S3 directly to an Express response.
 * Supports HTTP Range requests for fast page-by-page loading.
 * @param {string} s3Url - The permanent S3 URL stored in DB
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const streamPdfFromS3 = async (s3Url, req, res) => {
  const key = extractS3Key(s3Url);
  if (!key) throw new Error('Invalid S3 URL');

  const bucket = config.aws.s3Bucket;
  const rangeHeader = req.headers.range;

  if (rangeHeader) {
    // ── Range request: fetch only the requested byte range ──
    // First get the total file size
    const headCmd = new HeadObjectCommand({ Bucket: bucket, Key: key });
    const headResp = await s3Client.send(headCmd);
    const totalSize = headResp.ContentLength;

    // Parse the range header (e.g. "bytes=0-1023")
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
    const chunkSize = end - start + 1;

    const getCmd = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: `bytes=${start}-${end}`,
    });
    const s3Response = await s3Client.send(getCmd);

    res.status(206);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
      'Content-Range': `bytes ${start}-${end}/${totalSize}`,
      'Content-Length': String(chunkSize),
      'Accept-Ranges': 'bytes',
      'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Range, Content-Length',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });

    s3Response.Body.pipe(res);
  } else {
    // ── Full request (no Range header) ──
    const getCmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    const s3Response = await s3Client.send(getCmd);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
      'Accept-Ranges': 'bytes',
      'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Range, Content-Length',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });

    if (s3Response.ContentLength) {
      res.set('Content-Length', String(s3Response.ContentLength));
    }

    s3Response.Body.pipe(res);
  }
};

/**
 * Generate a short-lived presigned S3 URL for a PDF.
 * The client (mobile WebView / pdf.js) fetches directly from S3 — no backend proxy hop.
 * @param {string} s3Url - The permanent S3 URL stored in DB
 * @param {number} expiresIn - Seconds until the URL expires (default: from config)
 */
const getPresignedPdfUrl = async (s3Url, expiresIn) => {
  const key = extractS3Key(s3Url);
  if (!key) throw new Error('Invalid S3 URL');

  const ttl = expiresIn || config.aws.signedUrlExpiry || 900;
  const cmd = new GetObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
    ResponseContentType: 'application/pdf',
    ResponseContentDisposition: 'inline',
  });

  return getSignedUrl(s3Client, cmd, { expiresIn: ttl });
};

module.exports = { extractS3Key, streamPdfFromS3, getPresignedPdfUrl };

