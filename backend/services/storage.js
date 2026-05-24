const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');

const {
  MINIO_ENDPOINT,
  MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY,
  MINIO_BUCKET,
  MINIO_PUBLIC_URL,
  MINIO_REGION = 'us-east-1'
} = process.env;

const s3 = new S3Client({
  endpoint: MINIO_ENDPOINT,
  region: MINIO_REGION,
  credentials: {
    accessKeyId: MINIO_ACCESS_KEY,
    secretAccessKey: MINIO_SECRET_KEY
  },
  forcePathStyle: true
});

function buildKey(originalName) {
  const ext = path.extname(originalName || '').toLowerCase() || '.bin';
  const random = crypto.randomBytes(8).toString('hex');
  return `${Date.now()}-${random}${ext}`;
}

async function uploadBuffer(buffer, originalName, mimetype) {
  const key = buildKey(originalName);
  await s3.send(new PutObjectCommand({
    Bucket: MINIO_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype
  }));
  return {
    key,
    url: `${MINIO_PUBLIC_URL.replace(/\/$/, '')}/${key}`
  };
}

async function deleteByUrl(url) {
  if (!url) return;
  const prefix = MINIO_PUBLIC_URL.replace(/\/$/, '') + '/';
  if (!url.startsWith(prefix)) return;
  const key = url.slice(prefix.length);
  if (!key) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: MINIO_BUCKET, Key: key }));
  } catch (err) {
    console.warn('Failed to delete object from MinIO:', key, err.message);
  }
}

module.exports = { uploadBuffer, deleteByUrl };
