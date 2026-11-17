const sharp = require('sharp');

// Otimiza toda imagem enviada antes de ir para o MinIO:
//  - reduz para no máximo 1600px no maior lado (fotos de celular têm 4000px+);
//  - converte para WebP (bem menor que JPEG/PNG com a mesma qualidade visual);
//  - corrige a rotação pela orientação EXIF e REMOVE os metadados
//    (o EXIF de fotos de celular pode conter a localização GPS de quem tirou).
// GIF/WebP animados continuam animados.

const MAX_SIDE = 1600;
const QUALITY = 80;
// Protege o servidor contra imagens gigantes (ex.: 20000x20000 pixels).
const MAX_INPUT_PIXELS = 40_000_000;
// Animações: um GIF de poucos KB pode declarar milhares de quadros grandes e,
// ao decodificar, ocupar gigabytes. Os limites abaixo são conferidos no
// cabeçalho (barato) antes de decodificar qualquer quadro.
const MAX_FRAMES = 300;
const MAX_TOTAL_PIXELS = 200_000_000; // soma de todos os quadros
const TIMEOUT_SECONDS = 20;

async function optimizeImage(buffer, { mime }) {
  const animated = mime === 'image/gif' || mime === 'image/webp';

  const meta = await sharp(buffer, { animated, limitInputPixels: false }).metadata();
  const frames = Math.max(1, meta.pages || 1);
  const frameHeight = meta.pageHeight || (meta.height / frames);
  const framePixels = (meta.width || 0) * (frameHeight || 0);
  if (!framePixels) throw new Error('dimensões inválidas');
  if (framePixels > MAX_INPUT_PIXELS) throw new Error(`quadro grande demais (${meta.width}x${frameHeight})`);
  if (frames > MAX_FRAMES) throw new Error(`quadros demais (${frames})`);
  if (framePixels * frames > MAX_TOTAL_PIXELS) throw new Error(`animação grande demais (${frames} quadros de ${meta.width}x${frameHeight})`);

  let pipeline = sharp(buffer, { animated, limitInputPixels: MAX_INPUT_PIXELS }).timeout({ seconds: TIMEOUT_SECONDS });
  if (!animated) pipeline = pipeline.rotate(); // aplica a orientação EXIF
  const out = await pipeline
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 4 })
    .toBuffer();
  return { buffer: out, mime: 'image/webp', ext: '.webp' };
}

module.exports = { optimizeImage, MAX_SIDE };
