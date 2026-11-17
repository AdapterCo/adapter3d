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

// Formato exato das chaves criadas por buildKey: "<ms>-<16 hex>.<ext>".
// Só chaves assim podem ser apagadas: a URL vem do perfil do lojista (texto
// livre), e sem essa trava daria para apagar qualquer objeto do bucket
// ("outra-pasta/arquivo", "//chave", "x/../chave"...).
const KEY_REGEX = /^\d{13}-[0-9a-f]{16}\.[a-z0-9]{1,10}$/;

// Chave do objeto a partir da URL pública, ou null se a URL não for de um
// upload deste app no prefixo atual.
function keyFromUrl(url) {
  if (typeof url !== 'string' || !url) return null;
  const prefix = MINIO_PUBLIC_URL.replace(/\/$/, '') + '/';
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length);
  return KEY_REGEX.test(key) ? key : null;
}

async function deleteByUrl(url) {
  const key = keyFromUrl(url);
  if (!key) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: MINIO_BUCKET, Key: key }));
  } catch (err) {
    console.warn('Failed to delete object from MinIO:', key, err.message);
  }
}

module.exports = { uploadBuffer, deleteByUrl, keyFromUrl };
