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

// POST /api/customers  { slug, name, phone, consent, total }
// Chamado pelo carrinho ao enviar o pedido, SÓ quando o cliente marcou a caixa
// de consentimento. Responde 204 mesmo em caso de dados inválidos: o pedido do
// cliente já foi para o WhatsApp e nunca deve falhar por causa disto.
exports.register = async (req, res) => {
  try {
    if (BOT_UA.test(req.get('user-agent') || '')) return res.status(204).end();
    const { slug, name, phone, consent, total } = req.body || {};
    if (consent !== true) return res.status(204).end();
    const digits = normalizePhone(phone);
    if (!digits || typeof slug !== 'string') return res.status(204).end();

    const store = await User.findOne({ slug: slug.toLowerCase().slice(0, 64) })
      .select('id profileType signupSource subscription').lean();
    if (!store || !['menu', 'storefront'].includes(store.profileType) || !isProfileOnline(store)) {
      return res.status(204).end();
    }

    const now = new Date();
    const amount = Math.min(Math.max(Math.round(Number(total) || 0), 0), 10000000);
    await Customer.updateOne(
      { profile: store.id, phone: digits },
      {
        $set: { name: String(name || '').trim().slice(0, 80), consentAt: now, lastOrderAt: now },
        $inc: { orders: 1, totalSpent: amount },
        $setOnInsert: { firstOrderAt: now }
      },
      { upsert: true }
    );
    res.status(204).end();
  } catch (error) {
    console.error('customer register error:', error.message);
    res.status(204).end();
  }
};

// GET /api/customers — lista da loja logada (mais recentes primeiro).
exports.list = async (req, res) => {
  try {
    const customers = await Customer.find({ profile: req.user.id })
      .sort({ lastOrderAt: -1 })
      .limit(5000)
      .select('phone name orders totalSpent firstOrderAt lastOrderAt consentAt')
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
