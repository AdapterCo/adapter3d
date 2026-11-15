const Customer = require('../models/Customer');
const User = require('../models/User');
const { isProfileOnline } = require('../utils/plans');

const BOT_UA = /bot|crawler|spider|crawling|headless|lighthouse|slurp|preview/i;

// Celular/fixo brasileiro: 10 ou 11 dígitos (DDD + número), com ou sem 55.
// Devolve só dígitos com DDI 55, ou null.
function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 12 || d.length === 13) {
    if (!d.startsWith('55')) return null;
    d = d.slice(2);
  }
  if (d.length !== 10 && d.length !== 11) return null;
  if (d.startsWith('0') || Number(d.slice(0, 2)) < 11) return null; // DDD válido: 11 a 99
  return `55${d}`;
}

// Intervalo mínimo entre selos do mesmo WhatsApp: o pedido termina no WhatsApp
// (não sabemos se foi pago), então isto evita inflar o cartão com envios seguidos.
const STAMP_INTERVAL_MS = 30 * 60 * 1000;

// Calcula o cartão após um pedido. Puro (testável): recebe o estado atual.
function applyStamp({ stamps = 0, rewardsPending = 0, lastStampAt = null }, goal, now) {
  const recent = lastStampAt && now - new Date(lastStampAt) < STAMP_INTERVAL_MS;
  if (recent) return { stamps, rewardsPending, lastStampAt, stamped: false, earned: false };
  let s = stamps + 1;
  let pending = rewardsPending;
  let earned = false;
  if (s >= goal) { s -= goal; pending += 1; earned = true; }
  return { stamps: s, rewardsPending: pending, lastStampAt: now, stamped: true, earned };
}

// POST /api/customers  { slug, name, phone, consent, loyalty, total }
// Chamado pelo carrinho ao enviar o pedido, SÓ quando o cliente marcou
// "receber novidades" (consent) e/ou "cartão fidelidade" (loyalty).
// Nunca devolve erro: o pedido já foi para o WhatsApp e não pode falhar por
// causa disto. Com fidelidade, devolve o progresso do cartão (200); senão 204.
exports.register = async (req, res) => {
  try {
    if (BOT_UA.test(req.get('user-agent') || '')) return res.status(204).end();
    const { slug, name, phone, total } = req.body || {};
    const marketing = req.body?.consent === true;
    let loyalty = req.body?.loyalty === true;
    if (!marketing && !loyalty) return res.status(204).end();
    const digits = normalizePhone(phone);
    if (!digits || typeof slug !== 'string') return res.status(204).end();

    const store = await User.findOne({ slug: slug.toLowerCase().slice(0, 64) })
      .select('id profileType signupSource subscription orderSettings.loyalty').lean();
    if (!store || !['menu', 'storefront'].includes(store.profileType) || !isProfileOnline(store)) {
      return res.status(204).end();
    }
    const rule = store.orderSettings?.loyalty;
    if (!rule?.enabled || !String(rule.reward || '').trim()) loyalty = false;
    if (!marketing && !loyalty) return res.status(204).end();

    const now = new Date();
    const amount = Math.min(Math.max(Math.round(Number(total) || 0), 0), 10000000);
    const filter = { profile: store.id, phone: digits };
    const existing = await Customer.findOne(filter).lean();

    const set = { name: String(name || '').trim().slice(0, 80), lastOrderAt: now };
    // Aceitar novidades agora liga; não marcar desta vez não revoga um aceite
    // anterior (para sair, o cliente pede e o lojista remove).
    if (marketing) Object.assign(set, { marketing: true, consentAt: now });
    else if (!existing) set.marketing = false;

    let card = null;
    if (loyalty) {
      const goal = Math.min(Math.max(Math.round(Number(rule.goal) || 10), 2), 50);
      card = applyStamp(existing || {}, goal, now);
      Object.assign(set, { loyalty: true, loyaltyAt: now, stamps: card.stamps, rewardsPending: card.rewardsPending, lastStampAt: card.lastStampAt });
      card.goal = goal;
      card.reward = rule.reward;
    }

    await Customer.updateOne(
      filter,
      { $set: set, $inc: { orders: 1, totalSpent: amount }, $setOnInsert: { firstOrderAt: now } },
      { upsert: true }
    );

    if (!card) return res.status(204).end();
    res.json({ loyalty: { stamps: card.stamps, goal: card.goal, reward: card.reward, rewardsPending: card.rewardsPending, stamped: card.stamped, earned: card.earned } });
  } catch (error) {
    console.error('customer register error:', error.message);
    res.status(204).end();
  }
};

// POST /api/customers/:id/redeem — lojista confirma que entregou um prêmio.
exports.redeem = async (req, res) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'ID inválido.' });
    const doc = await Customer.findOneAndUpdate(
      { _id: req.params.id, profile: req.user.id, rewardsPending: { $gt: 0 } },
      { $inc: { rewardsPending: -1, rewardsRedeemed: 1 } },
      { new: true }
    ).select('rewardsPending rewardsRedeemed').lean();
    if (!doc) return res.status(404).json({ message: 'Nenhum prêmio pendente para este cliente.' });
    res.json({ rewardsPending: doc.rewardsPending, rewardsRedeemed: doc.rewardsRedeemed });
  } catch (error) {
    console.error('customer redeem error:', error.message);
    res.status(500).json({ message: 'Erro ao registrar o prêmio.' });
  }
};

// GET /api/customers — lista da loja logada (mais recentes primeiro).
exports.list = async (req, res) => {
  try {
    const customers = await Customer.find({ profile: req.user.id })
      .sort({ lastOrderAt: -1 })
      .limit(5000)
      .select('phone name orders totalSpent firstOrderAt lastOrderAt marketing consentAt loyalty stamps rewardsPending rewardsRedeemed')
      .lean();
    res.json({ customers });
  } catch (error) {
    console.error('customer list error:', error.message);
    res.status(500).json({ message: 'Erro ao carregar clientes.' });
  }
};

// DELETE /api/customers/:id — remove o cliente (ex.: pediu para sair da lista).
exports.remove = async (req, res) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'ID inválido.' });
    const r = await Customer.deleteOne({ _id: req.params.id, profile: req.user.id });
    if (!r.deletedCount) return res.status(404).json({ message: 'Cliente não encontrado.' });
    res.json({ ok: true });
  } catch (error) {
    console.error('customer remove error:', error.message);
    res.status(500).json({ message: 'Erro ao remover cliente.' });
  }
};

exports.normalizePhone = normalizePhone;
exports.applyStamp = applyStamp;
