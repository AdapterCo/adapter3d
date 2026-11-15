const Event = require('../models/Event');
const { EVENT_TYPES } = require('../models/Event');
const User = require('../models/User');

const TZ = 'America/Sao_Paulo';
const BOT_UA = /bot|crawler|spider|crawling|headless|lighthouse|slurp|preview/i;
const ALLOWED_DAYS = [7, 30, 90];

// Cache slug -> id do perfil, para não consultar o banco a cada evento.
const profileCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function profileIdForSlug(slug) {
  const hit = profileCache.get(slug);
  if (hit && hit.exp > Date.now()) return hit.id;
  const user = await User.findOne({ slug }).select('id').lean();
  const id = user ? user.id : null;
  profileCache.set(slug, { id, exp: Date.now() + CACHE_TTL_MS });
  if (profileCache.size > 5000) profileCache.delete(profileCache.keys().next().value);
  return id;
}

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const int = (v, max) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0;
};

// POST /api/track — chamado pelos perfis públicos (navigator.sendBeacon).
// Responde 204 sempre que possível: falha de analytics nunca afeta o visitante.
exports.track = async (req, res) => {
  try {
    if (BOT_UA.test(req.get('user-agent') || '')) return res.status(204).end();

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return res.status(204).end(); }
    }
    if (!body || typeof body !== 'object') return res.status(204).end();

    const slug = str(body.slug, 40).toLowerCase();
    const type = body.type;
    if (!slug || !EVENT_TYPES.includes(type)) return res.status(204).end();

    const profile = await profileIdForSlug(slug);
    if (!profile) return res.status(204).end();

    const event = {
      profile,
      type,
      target: str(body.target, 40),
      label: str(body.label, 80),
      source: body.source === 'tag' ? 'tag' : 'link',
      visitor: str(body.visitor, 40),
      value: type === 'order' ? int(body.value, 10000000) : type === 'add_to_cart' ? int(body.value, 99) : 0
    };
    if (type === 'order' && Array.isArray(body.items)) {
      event.items = body.items.slice(0, 50).map(i => ({
        productId: str(i?.productId, 40),
        name: str(i?.name, 100),
        qty: int(i?.qty, 99),
        price: int(i?.price, 10000000)
      }));
    }

    await Event.create(event);
    res.status(204).end();
  } catch (error) {
    console.error('track error:', error.message);
    res.status(204).end();
  }
};

function summarize(rows) {
  const out = { visits: 0, uniqueVisitors: 0, tagScans: 0, clicks: 0, orders: 0, revenue: 0 };
  const r = rows[0];
  if (!r) return out;
  return {
    visits: r.visits || 0,
    uniqueVisitors: (r.visitors || []).filter(Boolean).length,
    tagScans: r.tagScans || 0,
    clicks: r.clicks || 0,
    orders: r.orders || 0,
    revenue: r.revenue || 0
  };
}

const totalsGroup = {
  _id: null,
  visits: { $sum: { $cond: [{ $eq: ['$type', 'visit'] }, 1, 0] } },
  visitors: { $addToSet: { $cond: [{ $eq: ['$type', 'visit'] }, '$visitor', null] } },
  tagScans: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'visit'] }, { $eq: ['$source', 'tag'] }] }, 1, 0] } },
  clicks: { $sum: { $cond: [{ $eq: ['$type', 'click'] }, 1, 0] } },
  orders: { $sum: { $cond: [{ $eq: ['$type', 'order'] }, 1, 0] } },
  revenue: { $sum: { $cond: [{ $eq: ['$type', 'order'] }, '$value', 0] } }
};

function dayKey(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

// GET /api/stats?days=7|30|90 — estatísticas do perfil do usuário logado.
exports.getStats = async (req, res) => {
  try {
    const days = ALLOWED_DAYS.includes(Number(req.query.days)) ? Number(req.query.days) : 30;
    const profile = req.user.id;
    const now = new Date();
    const from = new Date(now.getTime() - days * 86400000);
    const prevFrom = new Date(from.getTime() - days * 86400000);

    const [current, previousRows] = await Promise.all([
      Event.aggregate([
        { $match: { profile, createdAt: { $gte: from, $lte: now } } },
        {
          $facet: {
            totals: [{ $group: totalsGroup }],
            daily: [
              { $match: { type: { $in: ['visit', 'order'] } } },
              {
                $group: {
                  _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } },
                  visits: { $sum: { $cond: [{ $eq: ['$type', 'visit'] }, 1, 0] } },
                  orders: { $sum: { $cond: [{ $eq: ['$type', 'order'] }, 1, 0] } },
                  revenue: { $sum: { $cond: [{ $eq: ['$type', 'order'] }, '$value', 0] } }
                }
              }
            ],
            clicks: [
              { $match: { type: 'click' } },
              { $group: { _id: { target: '$target', label: { $cond: [{ $eq: ['$target', 'link'] }, '$label', ''] } }, count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 15 }
            ],
            views: [
              { $match: { type: 'product_view' } },
              { $group: { _id: '$target', count: { $sum: 1 } } }
            ],
            added: [
              { $match: { type: 'add_to_cart' } },
              { $group: { _id: '$target', qty: { $sum: '$value' } } }
            ],
            ordered: [
              { $match: { type: 'order' } },
              { $unwind: '$items' },
              {
                $group: {
                  _id: '$items.productId',
                  name: { $last: '$items.name' },
                  qty: { $sum: '$items.qty' },
                  revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } }
                }
              }
            ]
          }
        }
      ]),
      Event.aggregate([
        { $match: { profile, createdAt: { $gte: prevFrom, $lt: from } } },
        { $group: totalsGroup }
      ])
    ]);

    const facet = current[0] || {};

    // Série diária completa (dias sem movimento = 0).
    const byDay = new Map((facet.daily || []).map(d => [d._id, d]));
    const daily = [];
    for (let i = days - 1; i >= 0; i--) {
      const key = dayKey(new Date(now.getTime() - i * 86400000));
      const d = byDay.get(key);
      daily.push({ date: key, visits: d?.visits || 0, orders: d?.orders || 0, revenue: d?.revenue || 0 });
    }

    // Produtos: junta visualizações, adições ao carrinho e itens pedidos.
    const owner = await User.findOne({ id: profile }).select('products._id products.name').lean();
    const names = new Map((owner?.products || []).map(p => [String(p._id), p.name]));
    const products = new Map();
    const row = (id) => {
      if (!products.has(id)) products.set(id, { productId: id, name: names.get(id) || '', views: 0, addedToCart: 0, ordered: 0, revenue: 0 });
      return products.get(id);
    };
    for (const v of facet.views || []) if (v._id) row(v._id).views = v.count;
    for (const a of facet.added || []) if (a._id) row(a._id).addedToCart = a.qty;
    for (const o of facet.ordered || []) {
      if (!o._id) continue;
      const r = row(o._id);
      r.ordered = o.qty;
      r.revenue = o.revenue;
      if (!r.name) r.name = o.name || '';
    }

    res.json({
      days,
      totals: summarize(facet.totals || []),
      previous: summarize(previousRows),
      daily,
      clicks: (facet.clicks || []).map(c => ({ target: c._id.target, label: c._id.label, count: c.count })),
      products: [...products.values()]
        .filter(p => p.name)
        .sort((a, b) => b.ordered - a.ordered || b.addedToCart - a.addedToCart || b.views - a.views)
        .slice(0, 20)
    });
  } catch (error) {
    console.error('getStats error:', error);
    res.status(500).json({ message: 'Erro ao carregar estatísticas.' });
  }
};
