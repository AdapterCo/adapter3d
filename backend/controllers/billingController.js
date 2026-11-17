const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const BillingEvent = require('../models/BillingEvent');
const mp = require('../services/mercadopago');
const { isPaidType, subscriptionState, endOfDayPlusMonths, planPrice, planOptions, normalizeTier, productLimit } = require('../utils/plans');
const {
  MIN_PASSWORD_LENGTH, EMAIL_COLLATION, normalizeEmail, isValidEmail,
  normalizeSlug, isValidSlug, normalizeBrPhone, validateShipping
} = require('../utils/validation');
const { slugTakenByTag } = require('../utils/tagSlug');

const PLAN_LABEL = { menu: 'Cardápio digital', storefront: 'Vitrine digital' };

const signToken = (user) => jwt.sign({ user: { id: user.id, slug: user.slug, v: user.tokenVersion || 0 } }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (u) => ({ id: u.id, slug: u.slug, email: u.email, name: u.name, profileType: u.profileType });
const appUrl = () => (process.env.APP_URL || '').replace(/\/$/, '');

// GET /api/billing/prices — preços exibidos na página de assinatura.
// menu/storefront: preço do plano básico (formato antigo, mantido para páginas
// ainda abertas com o frontend anterior). plans: todos os planos à venda.
exports.prices = (req, res) => {
  res.json({
    menu: planPrice('menu'),
    storefront: planPrice('storefront'),
    plans: { menu: planOptions('menu'), storefront: planOptions('storefront') },
    available: mp.isConfigured()
  });
};

const planReason = (user, tier) => `${PLAN_LABEL[user.profileType] || 'Assinatura'} Adapter Cards (até ${tier} produtos) - ${user.slug}`;

// Cria a assinatura (preapproval pendente) no Mercado Pago e devolve o link de pagamento.
async function startSubscription(user, tier = productLimit(user)) {
  const pre = await mp.createSubscription({
    reason: planReason(user, tier),
    payerEmail: user.email,
    amount: planPrice(user.profileType, tier),
    backUrl: `${appUrl()}/admin`,
    externalReference: user.id
  });
  return { subscriptionId: pre.id, invoiceUrl: pre.init_point || '', customerId: pre.payer_id ? String(pre.payer_id) : '' };
}

// POST /api/billing/signup — cadastro de cardápio/vitrine com assinatura.
exports.signup = async (req, res) => {
  const b = req.body || {};
  const profileType = b.profileType;
  if (!isPaidType(profileType)) return res.status(400).json({ message: 'Escolha cardápio ou vitrine.' });
  if (b.acceptTerms !== true) return res.status(400).json({ message: 'É preciso aceitar os Termos de Uso e a Política de Privacidade.' });
  if (!mp.isConfigured()) return res.status(503).json({ message: 'Assinaturas indisponíveis no momento. Tente mais tarde.' });

  const name = String(b.name || '').trim().slice(0, 80);
  const email = normalizeEmail(b.email);
  const slug = normalizeSlug(b.slug);
  const phone = normalizeBrPhone(b.phone);
  const password = typeof b.password === 'string' ? b.password : '';
  const shipping = validateShipping(b.shipping);
  const tier = normalizeTier(b.tier);

  if (!name) return res.status(400).json({ message: 'Informe o nome do estabelecimento.' });
  if (!isValidEmail(email)) return res.status(400).json({ message: 'E-mail inválido.' });
  if (password.length < MIN_PASSWORD_LENGTH) return res.status(400).json({ message: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` });
  if (!isValidSlug(slug)) return res.status(400).json({ message: 'Link inválido. Use de 3 a 32 letras minúsculas, números ou hífen.' });
  if (!phone) return res.status(400).json({ message: 'WhatsApp inválido. Informe com DDD.' });
  if (shipping.error) return res.status(400).json({ message: shipping.error });
  if (planPrice(profileType, tier) === null) return res.status(400).json({ message: 'Plano indisponível. Escolha outro.' });

  // Link antes do e-mail: com um link já usado (são públicos), a resposta não
  // pode servir para testar de graça se um e-mail tem conta.
  if (await User.findOne({ $or: [{ slug }, { previousSlugs: slug }] }).select('_id') || await slugTakenByTag(slug)) {
    return res.status(400).json({ message: 'Este link já está em uso. Escolha outro.' });
  }
  if (await User.findOne({ email }).collation(EMAIL_COLLATION).select('_id')) {
    return res.status(400).json({ message: 'Este e-mail já está em uso.' });
  }

  let user;
  try {
    user = await User.create({
      // Conta sem tag: ID próprio (a tag física é vinculada depois, no /gestao).
      id: `u-${crypto.randomBytes(5).toString('hex')}`,
      email,
      password: await bcrypt.hash(password, await bcrypt.genSalt(10)),
      slug,
      name,
      profileType,
      whatsapp: phone,
      signupSource: 'subscription',
      termsAcceptedAt: new Date(),
      subscription: { status: 'pending', tier },
      shipping: { ...shipping.value, status: 'pending' }
    });
  } catch (err) {
    if (err?.code === 11000) return res.status(400).json({ message: 'E-mail ou link já em uso.' });
    console.error('billing signup: erro ao criar usuário:', err);
    return res.status(500).json({ message: 'Erro no servidor.' });
  }

  try {
    const started = await startSubscription(user);
    user.subscription.subscriptionId = started.subscriptionId;
    user.subscription.invoiceUrl = started.invoiceUrl;
    user.subscription.customerId = started.customerId;
    await user.save();
    res.status(201).json({ token: signToken(user), user: publicUser(user), invoiceUrl: started.invoiceUrl });
  } catch (err) {
    // Sem assinatura no Mercado Pago a conta não serve: desfaz o cadastro.
    await User.deleteOne({ _id: user._id }).catch(() => {});
    console.error('billing signup: erro no Mercado Pago:', mp.errorMessage(err));
    res.status(502).json({ message: 'Não foi possível criar a assinatura agora. Tente novamente em instantes.' });
  }
};

// GET /api/billing/me — situação da assinatura do lojista logado.
exports.me = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).select('profileType signupSource subscription shipping slug products._id');
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    const state = subscriptionState(user);
    const subId = user.subscription?.subscriptionId;
    const hasSubscription = Boolean(subId) && user.subscription.status !== 'canceled';

    // Link de pagamento só faz sentido enquanto o perfil não estiver pago.
    let invoiceUrl = '';
    if (hasSubscription && !state.active) {
      invoiceUrl = user.subscription.invoiceUrl || '';
      try {
        const pre = await mp.getSubscription(subId);
        if (pre?.init_point) invoiceUrl = pre.init_point;
      } catch (e) {
        console.warn('billing me: falha ao consultar assinatura no Mercado Pago:', mp.errorMessage(e));
      }
    }

    res.json({
      ...state,
      price: isPaidType(user.profileType) ? planPrice(user.profileType, productLimit(user)) : null,
      tier: productLimit(user),
      pendingTier: user.subscription?.pendingTier || null,
      productCount: (user.products || []).length,
      plans: isPaidType(user.profileType) ? planOptions(user.profileType) : [],
      hasSubscription,
      invoiceUrl,
      shipping: {
        status: user.shipping?.status || 'none',
        city: user.shipping?.city || '',
        state: user.shipping?.state || '',
        sentAt: user.shipping?.sentAt || null
      }
    });
  } catch (error) {
    console.error('billing me error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// POST /api/billing/subscribe — (re)assinar: cancelados, vencidos ou contas
// antigas que vão passar a pagar.
exports.subscribe = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    if (!isPaidType(user.profileType)) return res.status(400).json({ message: 'Este tipo de perfil não tem mensalidade.' });
    if (!mp.isConfigured()) return res.status(503).json({ message: 'Assinaturas indisponíveis no momento.' });
    if (user.subscription?.subscriptionId && user.subscription.status !== 'canceled') {
      return res.status(400).json({ message: 'Você já tem uma assinatura. Use o botão de pagamento.' });
    }

    // Plano escolhido ao assinar (padrão: o atual). Precisa estar à venda e
    // caber nos produtos já cadastrados.
    const current = productLimit(user);
    const tier = req.body?.tier === undefined ? current : Number(req.body.tier);
    if (normalizeTier(tier) !== tier || planPrice(user.profileType, tier) === null) {
      return res.status(400).json({ message: 'Plano indisponível.' });
    }
    const count = (user.products || []).length;
    if (count > tier) {
      return res.status(400).json({ message: `Você tem ${count} produtos. Remova ${count - tier} para assinar o plano de até ${tier}.` });
    }

    const wasActive = subscriptionState(user).active;
    const keepsOnline = wasActive && Boolean(user.subscription.activeUntil);
    const started = await startSubscription(user, tier);
    user.subscription.subscriptionId = started.subscriptionId;
    user.subscription.invoiceUrl = started.invoiceUrl;
    if (started.customerId) user.subscription.customerId = started.customerId;
    user.subscription.status = keepsOnline ? 'active' : 'pending';
    // Quem continua no ar enquanto o pagamento não sai (cortesia) só ganha o
    // limite maior quando o primeiro pagamento for aprovado (creditPayment).
    // Quem fica aguardando pagamento está fora do ar: o plano já vale.
    if (tier > current && keepsOnline) {
      user.subscription.pendingTier = tier;
    } else {
      user.subscription.tier = tier;
      user.subscription.pendingTier = null;
    }
    await user.save();
    res.json({ invoiceUrl: started.invoiceUrl, tier: productLimit(user), pendingTier: user.subscription.pendingTier });
  } catch (err) {
    console.error('billing subscribe error:', mp.errorMessage(err));
    res.status(502).json({ message: 'Não foi possível criar a assinatura agora. Tente novamente.' });
  }
};

// POST /api/billing/plan { tier } — muda o plano (quantidade de produtos).
// Com assinatura ativa, o novo valor vale a partir da próxima cobrança no
// Mercado Pago; o novo limite de produtos vale na hora. Para descer de plano,
// os produtos já precisam caber no novo limite.
exports.changePlan = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).select('profileType slug subscription products._id');
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    if (!isPaidType(user.profileType)) return res.status(400).json({ message: 'Este tipo de perfil não tem planos.' });
    const tier = Number(req.body?.tier);
    const price = planPrice(user.profileType, tier);
    if (normalizeTier(tier) !== tier || price === null) return res.status(400).json({ message: 'Plano indisponível.' });
    if (tier === productLimit(user)) return res.status(400).json({ message: 'Você já está neste plano.' });
    const count = (user.products || []).length;
    if (count > tier) {
      return res.status(400).json({ message: `Você tem ${count} produtos. Remova ${count - tier} para mudar para o plano de até ${tier}.` });
    }

    const subId = user.subscription?.subscriptionId;
    const live = Boolean(subId) && user.subscription.status !== 'canceled';
    // Sem assinatura ativa no Mercado Pago (conta antiga, cortesia ou cancelada)
    // não há cobrança para atualizar: subir de plano aqui liberaria mais
    // produtos de graça. Só pode descer; para subir, precisa assinar.
    if (!live && tier > productLimit(user)) {
      return res.status(400).json({ message: 'Para aumentar o plano é preciso ter uma assinatura ativa. Assine pela aba Plano e escolha a quantidade de produtos.' });
    }
    if (live) {
      if (!mp.isConfigured()) return res.status(503).json({ message: 'Troca de plano indisponível no momento.' });
      await mp.updateSubscriptionAmount(subId, { amount: price, reason: planReason(user, tier) });
    }
    await User.updateOne({ _id: user._id }, { $set: { 'subscription.tier': tier, 'subscription.pendingTier': null } });
    const brl = price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    res.json({
      tier,
      price,
      message: live
        ? `Plano alterado para até ${tier} produtos. As próximas cobranças serão de ${brl}/mês.`
        : `Plano alterado para até ${tier} produtos (${brl}/mês).`
    });
  } catch (err) {
    console.error('billing changePlan error:', mp.errorMessage(err));
    res.status(502).json({ message: 'Não foi possível mudar o plano agora. Tente novamente.' });
  }
};

// POST /api/billing/cancel — cancela a renovação. Fica no ar até o fim do período pago.
exports.cancel = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).select('subscription profileType');
    if (!user?.subscription?.subscriptionId || user.subscription.status === 'canceled') {
      return res.status(400).json({ message: 'Não há assinatura ativa para cancelar.' });
    }
    await mp.cancelSubscription(user.subscription.subscriptionId);
    await User.updateOne({ _id: user._id }, { $set: { 'subscription.status': 'canceled', 'subscription.invoiceUrl': '' } });
    const until = user.subscription.activeUntil;
    res.json({ message: until && until > new Date()
      ? `Assinatura cancelada. Seu perfil fica no ar até ${until.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`
      : 'Assinatura cancelada.' });
  } catch (err) {
    console.error('billing cancel error:', mp.errorMessage(err));
    res.status(502).json({ message: 'Não foi possível cancelar agora. Tente novamente.' });
  }
};

// Status de pagamento que desfazem o mês liberado: estorno e contestação.
const REVOKED_STATUSES = new Set(['refunded', 'charged_back']);
const MAX_PAYMENTS_KEPT = 24;

const plainPayments = (user) => (user.subscription?.payments || []).map(p => (p.toObject ? p.toObject() : { ...p }));

// Fim do período coberto pelos pagamentos que não foram estornados.
function coverageFrom(payments) {
  const valid = payments.filter(p => !p.revokedAt && p.coveredUntil);
  return valid.length ? new Date(Math.max(...valid.map(p => new Date(p.coveredUntil).getTime()))) : null;
}

// Registra um pagamento aprovado: libera 1 mês a partir da data da cobrança.
// Idempotente: o mesmo pagamento nunca libera dois meses.
async function creditPayment(user, { paymentId, invoiceId, chargeDate }) {
  const payments = plainPayments(user);
  if (payments.some(p => p.paymentId === paymentId)) return;
  payments.push({ paymentId, invoiceId, chargeDate, coveredUntil: endOfDayPlusMonths(chargeDate, 1), revokedAt: null, revokeReason: '' });
  const kept = payments.slice(-MAX_PAYMENTS_KEPT);
  const fromPayments = coverageFrom(kept);
  const current = user.subscription.activeUntil;
  const activeUntil = current && fromPayments && current > fromPayments ? current : fromPayments;
  const set = {
    'subscription.payments': kept,
    'subscription.activeUntil': activeUntil,
    'subscription.status': user.subscription.status === 'canceled' ? 'canceled' : 'active',
    'subscription.invoiceUrl': ''
  };
  // Plano maior escolhido na assinatura: passa a valer com o pagamento aprovado.
  if (user.subscription.pendingTier) {
    set['subscription.tier'] = user.subscription.pendingTier;
    set['subscription.pendingTier'] = null;
  }
  await User.updateOne({ _id: user._id }, { $set: set });
}

// Estorno ou contestação de um pagamento: desfaz o mês que ele liberou (o
// perfil sai do ar na hora, salvo se houver outro mês pago e não estornado),
// cancela a assinatura no Mercado Pago e registra a data para o /gestao.
async function revokePayment(paymentId, reason) {
  const user = await User.findOne({ 'subscription.payments.paymentId': paymentId }).select('id subscription');
  if (!user) {
    console.warn(`webhook: estorno/contestação do pagamento ${paymentId} sem assinatura correspondente`);
    return null;
  }
  const payments = plainPayments(user);
  const entry = payments.find(p => p.paymentId === paymentId);
  if (entry.revokedAt) return user.id; // já desfeito antes
  entry.revokedAt = new Date();
  entry.revokeReason = reason;

  const now = new Date();
  const remaining = coverageFrom(payments);
  // Sem outro mês pago válido: vencimento no passado = fora do ar imediatamente.
  const activeUntil = remaining && remaining > now ? remaining : new Date(now.getTime() - 1000);

  // Sem novas cobranças depois de um estorno.
  if (user.subscription.subscriptionId && user.subscription.status !== 'canceled') {
    try {
      await mp.cancelSubscription(user.subscription.subscriptionId);
    } catch (e) {
      console.error(`estorno: falha ao cancelar assinatura ${user.subscription.subscriptionId} no Mercado Pago:`, mp.errorMessage(e));
    }
  }

  await User.updateOne({ _id: user._id }, {
    $set: {
      'subscription.payments': payments,
      'subscription.activeUntil': activeUntil,
      'subscription.status': 'canceled',
      'subscription.invoiceUrl': '',
      'subscription.refundedAt': entry.revokedAt
    }
  });
  console.warn(`${reason === 'charged_back' ? 'Contestação' : 'Estorno'} do pagamento ${paymentId}: conta ${user.id} com assinatura cancelada`);
  return user.id;
}

// POST /api/billing/webhook — notificações do Mercado Pago.
// O Mercado Pago envia ?data.id=...&type=... e o corpo { type, action, data: { id } }.
// A notificação só diz "algo mudou": o estado real é sempre consultado na API.
exports.webhook = async (req, res) => {
  const dataId = String(req.query['data.id'] || req.body?.data?.id || '');
  const type = String(req.query.type || req.body?.type || req.query.topic || '');

  try {
    mp.validateWebhookSignature({ xSignature: req.get('x-signature'), xRequestId: req.get('x-request-id'), dataId });
  } catch (err) {
    console.warn(`webhook Mercado Pago: assinatura inválida (tipo ${type || '?'}, id ${dataId || '?'}):`, err.message);
    return res.status(401).json({ message: 'unauthorized' });
  }
  if (!dataId || !type) return res.json({ ok: true });

  // O Mercado Pago pode reenviar a mesma notificação.
  const eventId = `${type}:${dataId}:${req.body?.action || ''}:${req.get('x-request-id') || ''}`;

  try {
    if (await BillingEvent.exists({ _id: eventId })) return res.json({ ok: true, duplicate: true });

    let userId = null;
    if (type === 'subscription_authorized_payment') {
      // Cobrança mensal da assinatura.
      const inv = await mp.getAuthorizedPayment(dataId);
      const payStatus = inv?.payment?.status;
      if (payStatus === 'approved' && inv.preapproval_id) {
        const user = await User.findOne({ 'subscription.subscriptionId': inv.preapproval_id }).select('subscription id');
        if (user) {
          userId = user.id;
          const chargeDate = String(inv.debit_date || inv.date_created || new Date().toISOString()).slice(0, 10);
          await creditPayment(user, { paymentId: String(inv.payment.id), invoiceId: String(inv.id), chargeDate });
        } else {
          console.warn(`webhook: assinatura ${inv.preapproval_id} sem usuário correspondente`);
        }
      } else if (REVOKED_STATUSES.has(payStatus) && inv.payment?.id) {
        userId = await revokePayment(String(inv.payment.id), payStatus);
      }
    } else if (type === 'payment') {
      // Estorno de pagamento (o aviso de aprovação vem por subscription_authorized_payment).
      const pay = await mp.getPayment(dataId);
      if (REVOKED_STATUSES.has(pay?.status)) userId = await revokePayment(String(pay.id), pay.status);
    } else if (type === 'chargebacks' || type === 'topic_chargebacks_wh') {
      // Contestação aberta pelo cliente no cartão.
      const cb = await mp.getChargeback(dataId);
      if (cb?.payment_id) userId = await revokePayment(String(cb.payment_id), 'charged_back');
    } else if (type === 'subscription_preapproval') {
      // Mudança na assinatura (autorizada, pausada, cancelada).
      const pre = await mp.getSubscription(dataId);
      const user = pre?.id ? await User.findOne({ 'subscription.subscriptionId': pre.id }).select('id subscription') : null;
      if (user) {
        userId = user.id;
        const set = {};
        if (pre.payer_id) set['subscription.customerId'] = String(pre.payer_id);
        if (pre.status === 'cancelled') {
          set['subscription.status'] = 'canceled';
          set['subscription.invoiceUrl'] = '';
        } else if (pre.status === 'pending' && pre.init_point) {
          set['subscription.invoiceUrl'] = pre.init_point;
        }
        if (Object.keys(set).length) await User.updateOne({ _id: user._id }, { $set: set });
      }
    }

    // Registra só depois de processar: se algo falhar acima, o Mercado Pago reenvia.
    await BillingEvent.create({ _id: eventId, event: type, paymentId: dataId, userId })
      .catch(err => { if (err?.code !== 11000) throw err; });
    res.json({ ok: true });
  } catch (error) {
    // ID que não existe no Mercado Pago (ex.: notificação simulada no painel):
    // não há o que processar. Responde 200 para o Mercado Pago não reenviar.
    if (mp.isNotFound(error)) {
      console.warn(`webhook Mercado Pago: ${type} ${dataId} não encontrado na API (simulação?). Ignorado.`);
      return res.json({ ok: true, ignored: 'not_found' });
    }
    console.error(`billing webhook error (${type} ${dataId}):`, mp.errorMessage(error));
    res.status(500).json({ message: 'error' });
  }
};
