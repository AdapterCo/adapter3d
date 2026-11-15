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

async function optimizeImage(buffer, { mime }) {
  const animated = mime === 'image/gif' || mime === 'image/webp';
  let pipeline = sharp(buffer, { animated, limitInputPixels: MAX_INPUT_PIXELS });
  if (!animated) pipeline = pipeline.rotate(); // aplica a orientação EXIF
  const out = await pipeline
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 4 })
    .toBuffer();
  return { buffer: out, mime: 'image/webp', ext: '.webp' };
}

module.exports = { optimizeImage, MAX_SIDE };
