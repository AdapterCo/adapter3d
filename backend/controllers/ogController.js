const User = require('../models/User');

// Prévia de link (Open Graph) para robôs de WhatsApp, Instagram, Facebook,
// Telegram etc. Eles não executam JavaScript, então o SPA mostraria só
// "Adapter Cards". O nginx do frontend encaminha esses robôs para cá.

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function appUrl() {
  return (process.env.APP_URL || '').replace(/\/$/, '');
}

function describe(user) {
  const where = user.address ? ` · ${user.address}` : '';
  switch (user.profileType) {
    case 'menu':
      return `Veja o cardápio e faça seu pedido pelo WhatsApp${where}`;
    case 'storefront':
      return `Confira os produtos e compre pelo WhatsApp${where}`;
    case 'pet':
      return user.pet?.lostMode?.active
        ? `${user.pet?.name || 'Este pet'} está perdido! Toque para ver como ajudar.`
        : `Perfil de ${user.pet?.name || 'pet'} · contato do tutor`;
    default:
      return `Contatos, redes sociais e links de ${user.name}${where}`;
  }
}

function render(res, { status = 200, title, description, image, url }) {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const img = escapeHtml(image);
  const u = escapeHtml(url);
  res
    .status(status)
    .set('Content-Type', 'text/html; charset=utf-8')
    .set('Cache-Control', 'public, max-age=300')
    .send(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${t}</title>
<meta name="description" content="${d}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Adapter Cards">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:image" content="${img}">
<meta property="og:url" content="${u}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${img}">
<link rel="canonical" href="${u}">
<meta http-equiv="refresh" content="0;url=${u}">
</head>
<body><a href="${u}">${t}</a></body>
</html>`);
}

function renderUser(res, user) {
  const base = appUrl();
  const image = /^https:\/\//.test(user.avatar || '') ? user.avatar : `${base}/logo.png`;
  render(res, {
    title: user.name || 'Adapter Cards',
    description: describe(user),
    image,
    url: `${base}/${user.slug}`
  });
}

function renderNotFound(res) {
  const base = appUrl();
  render(res, {
    status: 404,
    title: 'Adapter Cards',
    description: 'Cartões digitais, cardápios e vitrines com NFC e QR Code.',
    image: `${base}/logo.png`,
    url: `${base}/`
  });
}

const FIELDS = 'name slug avatar address profileType pet.name pet.lostMode';

// GET /api/og/:slug  (aceita também slugs antigos do perfil)
exports.bySlug = async (req, res) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase().slice(0, 64);
    const user = await User.findOne({ slug }).select(FIELDS).lean()
      || await User.findOne({ previousSlugs: slug }).select(FIELDS).lean();
    return user ? renderUser(res, user) : renderNotFound(res);
  } catch (error) {
    console.error('og bySlug error:', error.message);
    renderNotFound(res);
  }
};

// GET /api/og/tag/:id  (endereço permanente gravado nas tags e QRs)
exports.byTag = async (req, res) => {
  try {
    const id = String(req.params.id || '').slice(0, 64);
    const user = await User.findOne({ id }).select(FIELDS).lean();
    return user ? renderUser(res, user) : renderNotFound(res);
  } catch (error) {
    console.error('og byTag error:', error.message);
    renderNotFound(res);
  }
};
