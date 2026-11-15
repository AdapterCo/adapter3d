const crypto = require('crypto');
const Tag = require('../models/Tag');
const User = require('../models/User');
const { isPaidType, subscriptionState, endOfDayPlusMonths } = require('../utils/plans');

const VALID_PROFILE_TYPES = ['business', 'pet', 'menu', 'storefront'];

// POST /api/admin/tags
// Aceita 3 formatos no body:
//   { ids: ["tag-abc", "tag-xyz"] }                  → cria essas IDs específicas
//   { prefix: "lote-", count: 50, padding: 3 }       → cria lote-001..lote-050
//   { count: 50 }                                    → cria 50 com IDs aleatórios (8 hex chars)
exports.createTags = async (req, res) => {
  try {
    const { ids, prefix, count, padding = 3, notes = '', profileType = 'business' } = req.body || {};

    if (!VALID_PROFILE_TYPES.includes(profileType)) {
      return res.status(400).json({ message: `profileType inválido. Use ${VALID_PROFILE_TYPES.map(t => `"${t}"`).join(', ')}.` });
    }

    let tagIds = [];

    if (Array.isArray(ids) && ids.length > 0) {
      tagIds = ids.map(s => String(s).trim()).filter(Boolean);
    } else if (typeof count === 'number' && count > 0 && count <= 1000) {
      if (typeof prefix === 'string' && prefix.length > 0) {
        for (let i = 1; i <= count; i++) {
          tagIds.push(`${prefix}${String(i).padStart(padding, '0')}`);
        }
      } else {
        for (let i = 0; i < count; i++) {
          tagIds.push(`tag-${crypto.randomBytes(4).toString('hex')}`);
        }
      }
    } else {
      return res.status(400).json({
        message: 'Envie { ids: [...] } ou { prefix, count } ou { count } (1-1000).'
      });
    }

    // insertMany com ordered:false → continua mesmo se algum duplicar
    let created = [];
    let duplicates = [];
    try {
      const docs = tagIds.map(id => ({ id, notes, profileType }));
      created = await Tag.insertMany(docs, { ordered: false });
    } catch (err) {
      if (err.writeErrors) {
        created = err.insertedDocs || [];
        duplicates = err.writeErrors
          .filter(e => e.err && e.err.code === 11000)
          .map(e => tagIds[e.index]);
      } else {
        throw err;
      }
    }

    res.status(201).json({
      createdCount: created.length,
      duplicateCount: duplicates.length,
      duplicates,
      created: created.map(t => ({ id: t.id, isActivated: t.isActivated, profileType: t.profileType, createdAt: t.createdAt }))
    });
  } catch (error) {
    console.error('createTags error:', error);
    res.status(500).json({ message: 'Erro ao criar tags.' });
  }
};

// GET /api/admin/tags?status=free|activated|all&type=business|pet|menu|storefront|all (defaults: all)
exports.listTags = async (req, res) => {
  try {
    const { status = 'all', type = 'all' } = req.query;
    const filter = {};
    if (status === 'free') filter.isActivated = false;
    else if (status === 'activated') filter.isActivated = true;
    if (VALID_PROFILE_TYPES.includes(type)) filter.profileType = type;
    const tags = await Tag.find(filter)
      .populate('activatedBy', 'slug email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ count: tags.length, tags });
  } catch (error) {
    console.error('listTags error:', error);
    res.status(500).json({ message: 'Erro ao listar tags.' });
  }
};

// DELETE /api/admin/tags/:id  (só se ainda não ativada)
exports.deleteTag = async (req, res) => {
  try {
    const { id } = req.params;
    const tag = await Tag.findOne({ id });
    if (!tag) return res.status(404).json({ message: 'Tag não encontrada.' });
    if (tag.isActivated) {
      return res.status(400).json({ message: 'Tag já ativada — não pode ser deletada.' });
    }
    await Tag.deleteOne({ id });
    res.json({ message: 'Tag removida.', id });
  } catch (error) {
    console.error('deleteTag error:', error);
    res.status(500).json({ message: 'Erro ao deletar tag.' });
  }
};

const USER_LIST_FIELDS = 'id slug name email profileType createdAt signupSource subscription shipping';

function adminUserView(u) {
  const state = subscriptionState(u);
  return {
    id: u.id,
    slug: u.slug,
    name: u.name,
    email: u.email,
    profileType: u.profileType,
    createdAt: u.createdAt,
    signupSource: u.signupSource || 'tag',
    subscription: {
      state: state.status,
      online: state.active,
      activeUntil: state.activeUntil || u.subscription?.activeUntil || null,
      canceled: u.subscription?.status === 'canceled',
      customerId: u.subscription?.customerId || '',
      subscriptionId: u.subscription?.subscriptionId || '',
      refundedAt: u.subscription?.refundedAt || null
    },
    shipping: u.shipping?.status && u.shipping.status !== 'none' ? {
      status: u.shipping.status,
      tagId: u.shipping.tagId || '',
      sentAt: u.shipping.sentAt || null,
      address: [
        [u.shipping.street, u.shipping.number].filter(Boolean).join(', '),
        u.shipping.complement,
        u.shipping.district,
        [u.shipping.city, u.shipping.state].filter(Boolean).join('/'),
        u.shipping.postalCode ? `CEP ${u.shipping.postalCode.replace(/^(\d{5})(\d{3})$/, '$1-$2')}` : ''
      ].filter(Boolean).join(' - ')
    } : null
  };
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/admin/summary
exports.summary = async (req, res) => {
  try {
    const users = await User.find({}).select('profileType signupSource subscription shipping').lean();
    const byType = {};
    const subs = { active: 0, pending: 0, expired: 0, canceled: 0, legacy: 0 };
    let shipmentsPending = 0;
    let refunds30d = 0;
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const u of users) {
      byType[u.profileType] = (byType[u.profileType] || 0) + 1;
      if (isPaidType(u.profileType)) {
        const st = subscriptionState(u).status;
        if (subs[st] !== undefined) subs[st] += 1;
      }
      if (u.shipping?.status === 'pending') shipmentsPending += 1;
      if (u.subscription?.refundedAt && new Date(u.subscription.refundedAt).getTime() >= since) refunds30d += 1;
    }
    const tagsFree = await Tag.countDocuments({ isActivated: false });
    res.json({ users: users.length, byType, subscriptions: subs, shipmentsPending, tagsFree, refunds30d });
  } catch (error) {
    console.error('admin summary error:', error);
    res.status(500).json({ message: 'Erro ao carregar resumo.' });
  }
};

// GET /api/admin/users?type=menu|storefront|business|pet&q=texto
exports.listUsers = async (req, res) => {
  try {
    const filter = {};
    if (VALID_PROFILE_TYPES.includes(req.query.type)) filter.profileType = req.query.type;
    const q = String(req.query.q || '').trim().slice(0, 60);
    if (q) {
      const re = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ name: re }, { slug: re }, { email: re }, { id: re }];
    }
    const users = await User.find(filter).select(USER_LIST_FIELDS).sort({ createdAt: -1 }).limit(500).lean();
    res.json({ count: users.length, users: users.map(adminUserView) });
  } catch (error) {
    console.error('admin listUsers error:', error);
    res.status(500).json({ message: 'Erro ao listar usuários.' });
  }
};

// POST /api/admin/users/:id/active-until { date: 'YYYY-MM-DD' }
// Ajuste manual (cortesia, acerto de pagamento, migração de conta legado).
// Data no passado = perfil sai do ar. Não altera a cobrança no Mercado Pago.
exports.setActiveUntil = async (req, res) => {
  try {
    const date = String(req.body?.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: 'Data inválida (use AAAA-MM-DD).' });
    const user = await User.findOne({ id: req.params.id }).select(USER_LIST_FIELDS);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
    if (!isPaidType(user.profileType)) return res.status(400).json({ message: 'Este tipo de perfil não tem mensalidade.' });

    // Fim do dia escolhido, horário de Brasília.
    const activeUntil = endOfDayPlusMonths(date, 0);
    user.subscription.activeUntil = activeUntil;
    if (user.subscription.status === 'none' || user.subscription.status === 'pending') {
      user.subscription.status = 'active';
    }
    await user.save();
    res.json({ user: adminUserView(user) });
  } catch (error) {
    console.error('admin setActiveUntil error:', error);
    res.status(500).json({ message: 'Erro ao atualizar.' });
  }
};

// GET /api/admin/shipments?status=pending|sent
exports.listShipments = async (req, res) => {
  try {
    const status = req.query.status === 'sent' ? 'sent' : 'pending';
    const users = await User.find({ 'shipping.status': status }).select(USER_LIST_FIELDS).sort({ createdAt: 1 }).lean();
    res.json({ count: users.length, users: users.map(adminUserView) });
  } catch (error) {
    console.error('admin listShipments error:', error);
    res.status(500).json({ message: 'Erro ao listar envios.' });
  }
};

// POST /api/admin/shipments/:id/link-tag { tagId }
// Vincula uma tag livre à conta e marca o envio como feito. A partir daí
// /tag/<tagId> abre o perfil dessa conta.
exports.linkTag = async (req, res) => {
  try {
    const tagId = String(req.body?.tagId || '').trim();
    if (!tagId) return res.status(400).json({ message: 'Informe o código da tag.' });
    const user = await User.findOne({ id: req.params.id }).select(USER_LIST_FIELDS);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const tag = await Tag.findOneAndUpdate(
      { id: tagId, isActivated: false },
      { isActivated: true, activatedBy: user._id, profileType: user.profileType },
      { returnDocument: 'after' }
    );
    if (!tag) return res.status(400).json({ message: 'Tag não encontrada ou já vinculada a outra conta.' });

    user.shipping.status = 'sent';
    user.shipping.tagId = tag.id;
    user.shipping.sentAt = new Date();
    await user.save();
    res.json({ user: adminUserView(user) });
  } catch (error) {
    console.error('admin linkTag error:', error);
    res.status(500).json({ message: 'Erro ao vincular tag.' });
  }
};
