// Regras de assinatura.
//
// - Só cardápio (menu) e vitrine (storefront) têm mensalidade. Cartão de
//   visita e pet são venda única da tag e ficam sempre no ar.
// - Não há plano grátis, teste nem carência: o perfil fica no ar enquanto a
//   assinatura estiver paga (subscription.activeUntil no futuro). Vencida ou
//   ainda não paga, o perfil público mostra "temporariamente indisponível".
// - Contas de cardápio/vitrine criadas pela tag ANTES das assinaturas
//   (sem nenhuma assinatura registrada) são "legado": continuam no ar até o
//   administrador definir uma data no painel /gestao.

const PAID_TYPES = ['menu', 'storefront'];

const isPaidType = (profileType) => PAID_TYPES.includes(profileType);

function isLegacy(user) {
  const s = user.subscription || {};
  return isPaidType(user.profileType)
    && user.signupSource !== 'subscription'
    && (!s.status || s.status === 'none')
    && !s.activeUntil;
}

// Situação da assinatura. status:
//   'not_required' (tipo sem mensalidade) | 'legacy' | 'active' |
//   'pending' (aguardando o primeiro pagamento) | 'expired' (vencida) |
//   'canceled' (cancelada e já vencida)
function subscriptionState(user, now = new Date()) {
  if (!isPaidType(user.profileType)) return { required: false, active: true, status: 'not_required', activeUntil: null };
  if (isLegacy(user)) return { required: true, active: true, status: 'legacy', activeUntil: null };

  const s = user.subscription || {};
  const until = s.activeUntil ? new Date(s.activeUntil) : null;
  if (until && now <= until) {
    return { required: true, active: true, status: 'active', activeUntil: until, canceled: s.status === 'canceled' };
  }
  if (s.status === 'canceled') return { required: true, active: false, status: 'canceled', activeUntil: until };
  if (!until) return { required: true, active: false, status: 'pending', activeUntil: null };
  return { required: true, active: false, status: 'expired', activeUntil: until };
}

const isProfileOnline = (user, now) => subscriptionState(user, now).active;

// Fim do dia (23:59:59 de Brasília) da data informada + N meses.
function endOfDayPlusMonths(dateStr, months) {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  // 23:59:59 em UTC-3 = 02:59:59 UTC do dia seguinte
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), day + 1, 2, 59, 59));
}

// Data de hoje em Brasília (YYYY-MM-DD).
function todayInBrazil(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

// Planos por quantidade de produtos. O de 30 é o básico (preço em
// PLAN_PRICE_MENU / PLAN_PRICE_STOREFRONT, padrão 39,90). Os maiores só existem
// se o preço estiver configurado: PLAN_PRICE_MENU_50, PLAN_PRICE_MENU_100,
// PLAN_PRICE_STOREFRONT_50, PLAN_PRICE_STOREFRONT_100.
const PLAN_TIERS = [30, 50, 100];
const BASE_TIER = 30;

const normalizeTier = (t) => (PLAN_TIERS.includes(Number(t)) ? Number(t) : BASE_TIER);

function readPrice(name) {
  const n = Number(String(process.env[name] || '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

// Preço mensal (R$) do plano, ou null se esse plano não estiver à venda.
function planPrice(profileType, tier = BASE_TIER) {
  const base = profileType === 'storefront' ? 'PLAN_PRICE_STOREFRONT' : 'PLAN_PRICE_MENU';
  const t = normalizeTier(tier);
  if (t === BASE_TIER) return readPrice(base) ?? 39.9;
  return readPrice(`${base}_${t}`);
}

// Planos à venda para o tipo: [{ tier, price }].
const planOptions = (profileType) => PLAN_TIERS
  .map(tier => ({ tier, price: planPrice(profileType, tier) }))
  .filter(o => o.price !== null);

// Máximo de produtos do perfil (cardápio/vitrine seguem o plano; contas antigas
// e outros tipos ficam no básico).
const productLimit = (user) => normalizeTier(user?.subscription?.tier);

module.exports = {
  PAID_TYPES, isPaidType, isLegacy, subscriptionState, isProfileOnline, endOfDayPlusMonths, todayInBrazil,
  PLAN_TIERS, BASE_TIER, normalizeTier, planPrice, planOptions, productLimit
};
