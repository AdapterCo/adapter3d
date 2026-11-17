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

// Pedidos aguardando confirmação por cliente (o resto é ignorado até o lojista
// confirmar ou descartar).
const MAX_PENDING = 10;

const loyaltyGoal = (rule) => Math.min(Math.max(Math.round(Number(rule?.goal) || 10), 2), 50);
const loyaltyOn = (rule) => Boolean(rule?.enabled && String(rule.reward || '').trim());

// POST /api/customers  { slug, name, phone, consent, loyalty, total }
// Chamado pelo carrinho ao enviar o pedido, SÓ quando o cliente marcou
// "receber novidades" (consent) e/ou "cartão fidelidade" (loyalty).
// O envio é anônimo e nada prova que o telefone é de quem enviou, então aqui
// só se registra um PEDIDO A CONFIRMAR: selo, aceite de novidades, nome e
// total passam a valer quando o lojista confirma no painel (confirm).
// Nunca devolve erro: o pedido já foi para o WhatsApp e não pode falhar por
// causa disto. Com fidelidade, devolve o cartão atual (200); senão 204.
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
    if (!loyaltyOn(rule)) loyalty = false;
    if (!marketing && !loyalty) return res.status(204).end();

    const now = new Date();
    const amount = Math.min(Math.max(Math.round(Number(total) || 0), 0), 10000000);
    const filter = { profile: store.id, phone: digits };
    const existing = await Customer.findOne(filter).select('stamps rewardsPending pendingOrders').lean();

    // Só acrescenta o pedido à fila; nada do cliente confirmado é alterado.
    // Cliente novo nasce SEM aceite de novidades (o default do esquema é true
    // por causa de registros antigos) até o lojista confirmar.
    if ((existing?.pendingOrders?.length || 0) < MAX_PENDING) {
      await Customer.updateOne(
        filter,
        {
          $push: { pendingOrders: { at: now, total: amount, name: String(name || '').trim().slice(0, 80), marketing, loyalty } },
          $setOnInsert: { firstOrderAt: now, lastOrderAt: now, marketing: false }
        },
        { upsert: true }
      );
    }

    if (!loyalty) return res.status(204).end();
    res.json({
      loyalty: {
        stamps: existing?.stamps || 0,
        goal: loyaltyGoal(rule),
        reward: rule.reward,
        rewardsPending: existing?.rewardsPending || 0,
        pending: true,
        stamped: false,
        earned: false
      }
    });
  } catch (error) {
    console.error('customer register error:', error.message);
    res.status(204).end();
  }
};

// POST /api/customers/:id/confirm — lojista confirma o pedido mais antigo da
// fila (recebeu no WhatsApp daquele número). Só agora contam: pedido e total,
// nome, aceite de novidades e selo do cartão fidelidade.
// Tudo numa atualização atômica (pipeline): o selo é somado sobre o valor
// atual do banco, sem sobrescrever um resgate de prêmio feito ao mesmo tempo.
exports.confirm = async (req, res) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'ID inválido.' });
    const current = await Customer.findOne({ _id: req.params.id, profile: req.user.id }).select('pendingOrders loyalty').lean();
    if (!current) return res.status(404).json({ message: 'Cliente não encontrado.' });
    const order = current.pendingOrders?.[0];
    if (!order) return res.status(404).json({ message: 'Nenhum pedido aguardando confirmação.' });

    const store = await User.findOne({ id: req.user.id }).select('orderSettings.loyalty').lean();
    const rule = store?.orderSettings?.loyalty;
    const stamp = order.loyalty && loyaltyOn(rule);
    const goal = loyaltyGoal(rule);

    // Valores do pedido entram como $literal: um nome como "$email" não pode
    // ser lido pelo pipeline como referência a outro campo.
    const lit = (v) => ({ $literal: v });
    const set = {
      orders: { $add: [{ $ifNull: ['$orders', 0] }, 1] },
      totalSpent: { $add: [{ $ifNull: ['$totalSpent', 0] }, lit(order.total || 0)] },
      lastOrderAt: lit(order.at),
      pendingOrders: { $filter: { input: '$pendingOrders', cond: { $ne: ['$$this._id', order._id] } } }
    };
    if (order.name) set.name = lit(order.name);
    if (order.marketing) Object.assign(set, { marketing: true, consentAt: lit(order.at) });

    const pipeline = [];
    if (stamp) {
      pipeline.push({ $set: { _s: { $add: [{ $ifNull: ['$stamps', 0] }, 1] } } });
      pipeline.push({ $set: {
        stamps: { $cond: [{ $gte: ['$_s', goal] }, { $subtract: ['$_s', goal] }, '$_s'] },
        rewardsPending: { $add: [{ $ifNull: ['$rewardsPending', 0] }, { $cond: [{ $gte: ['$_s', goal] }, 1, 0] }] },
        lastStampAt: lit(new Date()),
        loyalty: true,
        loyaltyAt: current.loyalty ? { $ifNull: ['$loyaltyAt', lit(order.at)] } : lit(order.at)
      } });
      pipeline.push({ $unset: '_s' });
    }
    pipeline.push({ $set: set });

    // O filtro exige que ESTE pedido ainda esteja na fila: dois cliques (ou
    // duas abas) não confirmam o mesmo pedido duas vezes.
    const before = await Customer.findOneAndUpdate(
      { _id: req.params.id, profile: req.user.id, 'pendingOrders._id': order._id },
      pipeline,
      { updatePipeline: true, returnDocument: 'before' }
    ).select('rewardsPending').lean();
    if (!before) return res.status(409).json({ message: 'Este pedido já foi confirmado ou descartado. Atualize a lista.' });

    const doc = await Customer.findById(req.params.id)
      .select('phone name orders totalSpent firstOrderAt lastOrderAt marketing consentAt loyalty stamps rewardsPending rewardsRedeemed pendingOrders')
      .lean();
    res.json({ customer: doc, earned: stamp && (doc.rewardsPending || 0) > (before.rewardsPending || 0) });
  } catch (error) {
    console.error('customer confirm error:', error.message);
    res.status(500).json({ message: 'Erro ao confirmar o pedido.' });
  }
};

// POST /api/customers/:id/discard — lojista descarta os pedidos aguardando
// (não recebeu no WhatsApp). Se o cliente só existia por causa deles, sai da lista.
exports.discard = async (req, res) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'ID inválido.' });
    const r = await Customer.updateOne({ _id: req.params.id, profile: req.user.id }, { $set: { pendingOrders: [] } });
    if (!r.matchedCount) return res.status(404).json({ message: 'Cliente não encontrado.' });
    const gone = await Customer.deleteOne({
      _id: req.params.id, profile: req.user.id, orders: 0, loyalty: { $ne: true }, marketing: false, 'pendingOrders.0': { $exists: false }
    });
    res.json({ ok: true, removed: gone.deletedCount > 0 });
  } catch (error) {
    console.error('customer discard error:', error.message);
    res.status(500).json({ message: 'Erro ao descartar o pedido.' });
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
      .select('phone name orders totalSpent firstOrderAt lastOrderAt marketing consentAt loyalty stamps rewardsPending rewardsRedeemed pendingOrders')
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
