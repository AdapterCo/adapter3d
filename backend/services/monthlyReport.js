const Event = require('../models/Event');
const User = require('../models/User');
const mailer = require('./mailer');

// Resumo mensal por e-mail: no dia 1 (a partir das 9h de Brasília) cada
// lojista recebe os números do mês anterior comparados com o mês retrasado.
// Só envia para quem teve visita ou pedido no mês. Cada conta guarda o último
// mês enviado (reports.lastMonthlySent), então reinícios não duplicam envios.

const TZ_OFFSET_HOURS = 3; // Brasília (UTC-3)
const SEND_HOUR = 9;
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const brl = (cents) => (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (n) => Number(n || 0).toLocaleString('pt-BR');
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 'AAAA-MM' -> intervalo [início, fim) em UTC correspondente ao mês em Brasília.
function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1, TZ_OFFSET_HOURS)), end: new Date(Date.UTC(y, m, 1, TZ_OFFSET_HOURS)) };
}

const prevMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

function nowInBrazil(now = new Date()) {
  const b = new Date(now.getTime() - TZ_OFFSET_HOURS * 3600 * 1000);
  return { year: b.getUTCFullYear(), month: b.getUTCMonth() + 1, day: b.getUTCDate(), hour: b.getUTCHours() };
}

async function monthStats(profile, month) {
  const { start, end } = monthRange(month);
  const [row] = await Event.aggregate([
    { $match: { profile, createdAt: { $gte: start, $lt: end } } },
    {
      $facet: {
        totals: [{
          $group: {
            _id: null,
            visits: { $sum: { $cond: [{ $eq: ['$type', 'visit'] }, 1, 0] } },
            visitors: { $addToSet: { $cond: [{ $eq: ['$type', 'visit'] }, '$visitor', null] } },
            tagScans: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'visit'] }, { $eq: ['$source', 'tag'] }] }, 1, 0] } },
            clicks: { $sum: { $cond: [{ $eq: ['$type', 'click'] }, 1, 0] } },
            orders: { $sum: { $cond: [{ $eq: ['$type', 'order'] }, 1, 0] } },
            revenue: { $sum: { $cond: [{ $eq: ['$type', 'order'] }, '$value', 0] } }
          }
        }],
        top: [
          { $match: { type: 'order' } },
          { $unwind: '$items' },
          { $group: { _id: '$items.name', qty: { $sum: '$items.qty' } } },
          { $sort: { qty: -1 } },
          { $limit: 3 }
        ]
      }
    }
  ]);
  const t = row?.totals?.[0] || {};
  return {
    visits: t.visits || 0,
    uniqueVisitors: (t.visitors || []).filter(Boolean).length,
    tagScans: t.tagScans || 0,
    clicks: t.clicks || 0,
    orders: t.orders || 0,
    revenue: t.revenue || 0,
    top: (row?.top || []).filter(p => p._id).map(p => ({ name: p._id, qty: p.qty }))
  };
}

function delta(now, before) {
  if (!before) return '';
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return ' (igual ao mês anterior)';
  return ` (${pct > 0 ? '+' : ''}${pct}% vs mês anterior)`;
}

function buildEmail(user, month, s, p) {
  const [y, m] = month.split('-').map(Number);
  const label = `${MONTHS[m - 1]} de ${y}`;
  const hasOrders = user.profileType === 'menu' || user.profileType === 'storefront';
  const panel = `${(process.env.APP_URL || '').replace(/\/$/, '')}/admin`;
  const lines = [
    ['Visitas', `${num(s.visits)}${delta(s.visits, p.visits)}`],
    ['Pessoas diferentes', num(s.uniqueVisitors)],
    ['Leituras da tag (NFC/QR)', num(s.tagScans)],
    ['Cliques (WhatsApp, rotas, redes...)', num(s.clicks)]
  ];
  if (hasOrders) {
    lines.push(['Pedidos pelo WhatsApp', `${num(s.orders)}${delta(s.orders, p.orders)}`]);
    lines.push(['Valor em pedidos', brl(s.revenue)]);
  }

  const subject = hasOrders && s.orders > 0
    ? `${user.name}: ${num(s.orders)} pedidos e ${brl(s.revenue)} em ${MONTHS[m - 1]}`
    : `${user.name}: ${num(s.visits)} visitas em ${MONTHS[m - 1]}`;

  const text = [
    `Resumo de ${label} - ${user.name}`,
    '',
    ...lines.map(([k, v]) => `${k}: ${v}`),
    ...(hasOrders && s.top.length ? ['', 'Mais pedidos:', ...s.top.map((t, i) => `${i + 1}. ${t.name} (${num(t.qty)})`)] : []),
    '',
    `Veja os detalhes no painel: ${panel}`,
    'Para não receber mais este resumo, desligue em Estatísticas no painel.'
  ].join('\n');

  const rows = lines.map(([k, v]) => `<tr><td style="padding:8px 0;color:#555">${escapeHtml(k)}</td><td style="padding:8px 0;text-align:right;font-weight:bold;color:#111">${escapeHtml(v)}</td></tr>`).join('');
  const top = hasOrders && s.top.length
    ? `<p style="margin:20px 0 6px;font-weight:bold">Mais pedidos</p><ol style="margin:0;padding-left:20px;color:#333">${s.top.map(t => `<li>${escapeHtml(t.name)} (${num(t.qty)})</li>`).join('')}</ol>`
    : '';
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#111">
<h2 style="margin:0 0 4px">Seu resumo de ${escapeHtml(label)}</h2>
<p style="margin:0 0 16px;color:#555">${escapeHtml(user.name)}</p>
<table style="width:100%;border-collapse:collapse;border-top:1px solid #eee">${rows}</table>
${top}
<p style="margin:24px 0"><a href="${panel}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none">Ver detalhes no painel</a></p>
<p style="color:#888;font-size:12px">Para não receber mais este resumo, desligue em Estatísticas no painel.</p>
</div>`;

  return { subject, text, html };
}

// Envia o resumo de `month` para um usuário. force=true ignora "sem movimento"
// (usado pelo envio de teste do administrador).
async function sendMonthlyReport(user, month, { force = false } = {}) {
  const s = await monthStats(user.id, month);
  if (!force && s.visits === 0 && s.orders === 0) return { sent: false, reason: 'sem movimento' };
  const p = await monthStats(user.id, prevMonth(month));
  await mailer.sendMail({ to: user.email, ...buildEmail(user, month, s, p) });
  return { sent: true, stats: s };
}

// Rodada do mês: só no dia 1 depois das 9h. Cada conta é "reservada" antes do
// envio (lastMonthlySent = mês), evitando e-mail duplicado.
async function runMonthlyReports(now = new Date()) {
  const b = nowInBrazil(now);
  if (b.day !== 1 || b.hour < SEND_HOUR) return { skipped: true };
  const month = prevMonth(`${b.year}-${String(b.month).padStart(2, '0')}`);

  let sent = 0;
  const candidates = await User.find({ emailReports: { $ne: false }, 'reports.lastMonthlySent': { $ne: month } })
    .select('_id id email name profileType').lean();
  for (const u of candidates) {
    const claimed = await User.updateOne(
      { _id: u._id, 'reports.lastMonthlySent': { $ne: month } },
      { $set: { 'reports.lastMonthlySent': month } }
    );
    if (!claimed.modifiedCount) continue;
    try {
      if ((await sendMonthlyReport(u, month)).sent) sent += 1;
    } catch (err) {
      console.error(`resumo mensal: falha ao enviar para ${u.id}:`, err.message);
    }
  }
  if (sent) console.log(`resumo mensal ${month}: ${sent} e-mail(s) enviado(s)`);
  return { month, sent };
}

// Verifica de hora em hora (o envio só acontece no dia 1 após as 9h).
function startMonthlyReportScheduler() {
  const tick = () => runMonthlyReports().catch(err => console.error('resumo mensal:', err.message));
  setTimeout(tick, 60 * 1000).unref();
  setInterval(tick, 60 * 60 * 1000).unref();
}

module.exports = { sendMonthlyReport, runMonthlyReports, startMonthlyReportScheduler, monthRange, prevMonth, buildEmail };
