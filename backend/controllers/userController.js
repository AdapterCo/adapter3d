const User = require('../models/User');
const Tag = require('../models/Tag');
const storage = require('../services/storage');
const { isProfileOnline } = require('../utils/plans');
const { normalizeSlug, isValidSlug } = require('../utils/validation');
const { optimizeImage } = require('../services/imageProcessor');

// Get User by Slug (Public Card View)
exports.getUserBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    // Busca pelo slug atual; se não achar, por um slug antigo do perfil (o
    // frontend corrige a URL para o slug atual).
    const user = await User.findOne({ slug }).select('-password -email -previousSlugs')
      || await User.findOne({ previousSlugs: slug }).select('-password -email -previousSlugs');

    if (!user) {
      return res.status(404).json({ message: 'Perfil não encontrado' });
    }

    // Cardápio/vitrine sem assinatura paga: fora do ar (link, QR e tag).
    if (!isProfileOnline(user)) {
      return res.status(403).json({ unavailable: true, message: 'Perfil temporariamente indisponível.' });
    }

    // Dados internos (assinatura, endereço de entrega) nunca vão para o público.
    const data = user.toObject();
    delete data.subscription;
    delete data.shipping;
    delete data.signupSource;
    delete data.termsAcceptedAt;
    res.json(data);
  } catch (error) {
    console.error('Error in getUserBySlug:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get User by Tag ID (For Physical NFC Redirection)
exports.getUserByTagId = async (req, res) => {
  try {
    const { id } = req.params;
    // 1) ID da própria conta (contas antigas: = código da tag; contas por
    //    assinatura: "u-...", usado para gravar a tag pelo painel).
    let user = await User.findOne({ id }).select('slug');
    // 2) Tag física vinculada depois a uma conta (envio pelo /gestao).
    if (!user) {
      const tag = await Tag.findOne({ id, activatedBy: { $ne: null } }).select('activatedBy').lean();
      if (tag) user = await User.findById(tag.activatedBy).select('slug');
    }

    if (!user) {
      return res.status(404).json({ message: 'Tag não ativada' });
    }

    res.json({ slug: user.slug });
  } catch (error) {
    console.error('Error in getUserByTagId:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

// Coleta toda URL de imagem referenciada pelo usuário (avatar, background, fotos
// de produto). Set deduplica caso a mesma URL esteja em vários lugares.
function collectImageUrls(user) {
  const urls = new Set();
  if (user?.avatar) urls.add(user.avatar);
  if (user?.theme?.backgroundImage) urls.add(user.theme.backgroundImage);
  for (const p of (user?.products || [])) {
    if (p?.image) urls.add(p.image);
  }
  return urls;
}

// Deleta do MinIO toda imagem que existia em `before`, sumiu em `after` e não é
// referenciada por NENHUM outro perfil. A checagem global impede que alguém
// cole a URL da foto de outra loja no próprio perfil e, ao removê-la, apague
// a imagem da outra loja.
// Fire-and-forget: erros só logam, não bloqueiam a resposta do save.
function cleanupOrphanedImages(before, after) {
  const oldUrls = collectImageUrls(before);
  const newUrls = collectImageUrls(after);
  for (const url of oldUrls) {
    if (newUrls.has(url)) continue;
    User.exists({
      $or: [{ avatar: url }, { 'theme.backgroundImage': url }, { 'products.image': url }]
    })
      .then(stillUsed => (stillUsed ? null : storage.deleteByUrl(url)))
      .catch(err => console.warn('Falha ao deletar imagem órfã do MinIO:', url, err.message));
  }
}

// Únicos campos que o dono do perfil pode alterar por esta rota. Qualquer outro
// (id, email, password, profileType, timestamps, futuros campos de plano/cobrança)
// é descartado silenciosamente.
const UPDATABLE_FIELDS = [
  'slug', 'name', 'avatar',
  'instagram', 'facebook', 'tiktok', 'youtube', 'linkedin',
  'whatsapp', 'phone', 'pix',
  'customLinks', 'pet', 'categories', 'products', 'theme',
  'address', 'showReviewButton', 'showDirectionsButton', 'orderSettings'
];

function pickUpdatableFields(body) {
  const updates = {};
  if (!body || typeof body !== 'object') return updates;
  for (const key of UPDATABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) updates[key] = body[key];
  }
  return updates;
}

// Update User Data
exports.updateUser = async (req, res) => {
  try {
    // Always use the authenticated user's ID from the JWT — never trust the URL param.
    const id = req.user.id;
    // Lista de permitidos: email/password/id/profileType e qualquer campo
    // desconhecido nunca chegam ao $set.
    const updates = pickUpdatableFields(req.body);

    // Sanitiza categoryId em produtos: qualquer valor que não seja ObjectId válido
    // (ex: "undefined" vindo de categoria recém-criada sem _id) vira null.
    if (Array.isArray(updates.products)) {
      updates.products = updates.products.map((p) => ({
        ...p,
        categoryId: p?.categoryId && OBJECT_ID_REGEX.test(String(p.categoryId)) ? p.categoryId : null
      }));
    }

    if (updates.slug) {
      // Pet: slug é fixo (= tagId, gravado no QR da coleira). Ignora qualquer tentativa de mudar.
      const currentUser = await User.findOne({ id }).select('profileType slug previousSlugs');
      if (currentUser?.profileType === 'pet') {
        delete updates.slug;
      } else {
        const newSlug = normalizeSlug(updates.slug);
        if (!isValidSlug(newSlug)) {
          return res.status(400).json({ message: 'Slug inválido ou reservado.' });
        }
        updates.slug = newSlug;
        // Bloqueia também slugs antigos de outros perfis: links impressos com
        // eles continuam apontando para o dono original.
        const existingSlug = await User.findOne({
          $or: [{ slug: newSlug }, { previousSlugs: newSlug }],
          id: { $ne: id }
        });
        if (existingSlug) {
          return res.status(400).json({ message: 'Este link (slug) já está em uso por outro usuário.' });
        }
        // Guarda o slug antigo (até 10) para os links antigos continuarem funcionando.
        if (currentUser && currentUser.slug !== newSlug) {
          updates.previousSlugs = [...(currentUser.previousSlugs || []).filter(s => s !== newSlug && s !== currentUser.slug), currentUser.slug].slice(-10);
        }
      }
    }

    // Snapshot anterior pra detectar imagens órfãs depois do update.
    const before = await User.findOne({ id })
      .select('avatar theme.backgroundImage products.image')
      .lean();

    const user = await User.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    cleanupOrphanedImages(before, user.toObject());

    res.json(user);
  } catch (error) {
    console.error('Error in updateUser:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Identifica JPEG/PNG/GIF/WebP pela assinatura binária (magic bytes).
function detectImageType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: '.jpg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: '.png' };
  const head6 = buf.subarray(0, 6).toString('ascii');
  if (head6 === 'GIF87a' || head6 === 'GIF89a') return { mime: 'image/gif', ext: '.gif' };
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return { mime: 'image/webp', ext: '.webp' };
  return null;
}

// Upload image to MinIO and return the public URL
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    // O mimetype vem do navegador e pode ser forjado: o tipo real é detectado
    // pelos primeiros bytes do arquivo. SVG (que pode conter script) e
    // qualquer coisa fora da lista são recusados.
    const detected = detectImageType(req.file.buffer);
    if (!detected) {
      return res.status(400).json({ message: 'Formato não suportado. Envie JPG, PNG, WebP ou GIF.' });
    }

    // Reduz, converte para WebP e remove metadados (EXIF/GPS).
    let optimized;
    try {
      optimized = await optimizeImage(req.file.buffer, detected);
    } catch (err) {
      console.warn('uploadImage: imagem inválida ou corrompida:', err.message);
      return res.status(400).json({ message: 'Não foi possível processar esta imagem. Tente outra foto.' });
    }

    const { url } = await storage.uploadBuffer(
      optimized.buffer,
      `upload${optimized.ext}`,
      optimized.mime
    );

    res.json({ url });
  } catch (error) {
    console.error('Error in uploadImage:', error);
    res.status(500).json({ message: 'Erro ao enviar imagem.' });
  }
};
