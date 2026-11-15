import { useEffect, useState } from 'react';
import { BarChart3, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import api from '../../services/api';
import { centsToBRL } from './utils';

const PERIODS = [7, 30, 90];
const BAR_COLOR = '#3b82f6';

const CLICK_LABEL = {
  whatsapp: 'WhatsApp',
  phone: 'Ligar',
  pix: 'Copiar Pix',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  review: 'Avaliar no Google',
  directions_maps: 'Como chegar · Google Maps',
  directions_waze: 'Como chegar · Waze',
  directions_uber: 'Como chegar · Uber',
  directions_99: 'Como chegar · 99',
  share: 'Compartilhar',
  link: 'Link'
};

const fmtInt = (n) => Number(n || 0).toLocaleString('pt-BR');
const fmtDay = (iso) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; };

function Delta({ now, before }) {
  if (!before) return <span className="text-xs text-gray-400">sem comparação</span>;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return <span className="text-xs text-gray-500">= período anterior</span>;
  const up = pct > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`text-xs font-medium inline-flex items-center ${up ? 'text-green-700' : 'text-red-600'}`}>
      <Icon className="w-3.5 h-3.5" />{up ? '+' : ''}{pct}% vs período anterior
    </span>
  );
}

function Kpi({ label, value, now, before, hint }) {
  return (
    <div className="border rounded-xl p-4 bg-white">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      <div className="mt-1 min-h-[1rem]">
        {hint ? <span className="text-xs text-gray-500">{hint}</span> : <Delta now={now} before={before} />}
      </div>
    </div>
  );
}

// Barras diárias de uma única série. Tooltip ao passar o mouse/tocar.
function DailyBars({ title, series, valueKey, format, unit }) {
  const [hover, setHover] = useState(null);
  const W = 640, H = 170, PAD_L = 8, PAD_R = 8, PAD_T = 12, PAD_B = 22;
  const max = Math.max(1, ...series.map(d => d[valueKey]));
  const step = (W - PAD_L - PAD_R) / series.length;
  const barW = Math.max(1, step - 2); // 2px de respiro entre barras
  const y = (v) => PAD_T + (H - PAD_T - PAD_B) * (1 - v / max);
  const baseY = H - PAD_B;
  const labelIdx = new Set([0, Math.floor((series.length - 1) / 2), series.length - 1]);
  const total = series.reduce((s, d) => s + d[valueKey], 0);
  const active = hover != null ? series[hover] : null;

  return (
    <div className="border rounded-xl p-4 bg-white">
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <h4 className="font-semibold text-gray-800">{title}</h4>
        <span className="text-sm text-gray-600">
          {active ? <><strong>{fmtDay(active.date)}</strong>: {format(active[valueKey])} {unit}</> : <>máx. {format(max === 1 && total === 0 ? 0 : max)} {unit}/dia</>}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label={`${title}: total ${format(total)} ${unit} em ${series.length} dias`}
        onMouseLeave={() => setHover(null)}>
        <line x1={PAD_L} x2={W - PAD_R} y1={baseY} y2={baseY} stroke="#e5e7eb" strokeWidth="1" />
        {series.map((d, i) => {
          const v = d[valueKey];
          const x = PAD_L + i * step + 1;
          const top = y(v);
          const h = baseY - top;
          const r = Math.min(4, barW / 2, h);
          return (
            <g key={d.date}>
              {v > 0 && (
                <path
                  d={`M${x},${baseY} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${baseY} Z`}
                  fill={BAR_COLOR} opacity={hover == null || hover === i ? 1 : 0.45}
                />
              )}
              {/* área de toque maior que a barra */}
              <rect x={PAD_L + i * step} y={PAD_T} width={step} height={baseY - PAD_T} fill="transparent"
                onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
              {labelIdx.has(i) && (
                <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#6b7280">{fmtDay(d.date)}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function HBarList({ rows }) {
  const max = Math.max(1, ...rows.map(r => r.count));
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li key={i}>
          <div className="flex justify-between text-sm mb-1 gap-2">
            <span className="text-gray-700 truncate">{r.name}</span>
            <span className="font-semibold text-gray-900">{fmtInt(r.count)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, backgroundColor: BAR_COLOR }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function StatsTab({ data }) {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hasOrders = data.profileType === 'menu' || data.profileType === 'storefront';

  useEffect(() => {
    let cancelled = false;
    api.get('/stats', { params: { days } })
      .then(res => { if (!cancelled) { setStats(res.data); setError(''); } })
      .catch(err => { if (!cancelled) setError(err.response?.data?.message || 'Erro ao carregar estatísticas.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);

  const changePeriod = (d) => { setLoading(true); setDays(d); };

  const t = stats?.totals || {};
  const p = stats?.previous || {};
  const ticket = t.orders ? Math.round(t.revenue / t.orders) : 0;
  const conversion = t.uniqueVisitors ? (t.orders / t.uniqueVisitors) * 100 : 0;

  const clickRows = (stats?.clicks || []).map(c => ({
    name: c.target === 'link' ? `Link: ${c.label || 'sem título'}` : (CLICK_LABEL[c.target] || c.target),
    count: c.count
  }));

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
        <h3 className="font-semibold text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-600" /> Estatísticas</h3>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />}
          <div className="inline-flex rounded-lg border overflow-hidden">
            {PERIODS.map(d => (
              <button key={d} onClick={() => changePeriod(d)}
                className={`px-3 py-1.5 text-sm ${days === d ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                {d} dias
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Visitas" value={fmtInt(t.visits)} now={t.visits} before={p.visits} />
            <Kpi label="Visitantes únicos" value={fmtInt(t.uniqueVisitors)} now={t.uniqueVisitors} before={p.uniqueVisitors} />
            <Kpi label="Leituras da tag" value={fmtInt(t.tagScans)} now={t.tagScans} before={p.tagScans} />
            <Kpi label="Cliques" value={fmtInt(t.clicks)} now={t.clicks} before={p.clicks} />
            {hasOrders && (
              <>
                <Kpi label="Pedidos" value={fmtInt(t.orders)} now={t.orders} before={p.orders} />
                <Kpi label="Valor em pedidos" value={centsToBRL(t.revenue)} now={t.revenue} before={p.revenue} />
                <Kpi label="Ticket médio" value={t.orders ? centsToBRL(ticket) : '—'} hint={t.orders ? `${fmtInt(t.orders)} pedidos` : 'sem pedidos'} />
                <Kpi label="Conversão" value={`${conversion.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`} hint="pedidos ÷ visitantes únicos" />
              </>
            )}
          </div>

          {t.visits === 0 && (
            <p className="text-sm bg-blue-50 border border-blue-100 text-blue-800 rounded-lg p-3">
              Ainda não há visitas neste período. Compartilhe seu link e deixe a tag à vista: os números aparecem aqui automaticamente.
            </p>
          )}

          <DailyBars title="Visitas por dia" series={stats.daily} valueKey="visits" format={fmtInt} unit="visitas" />
          {hasOrders && (
            <DailyBars title="Pedidos por dia" series={stats.daily} valueKey="orders" format={fmtInt} unit="pedidos" />
          )}

          <div className={`grid gap-4 ${hasOrders ? 'lg:grid-cols-2' : ''}`}>
            <div className="border rounded-xl p-4 bg-white">
              <h4 className="font-semibold text-gray-800 mb-3">O que mais clicam</h4>
              {clickRows.length ? <HBarList rows={clickRows} /> : <p className="text-sm text-gray-500">Nenhum clique no período.</p>}
            </div>

            {hasOrders && (
              <div className="border rounded-xl p-4 bg-white overflow-x-auto">
                <h4 className="font-semibold text-gray-800 mb-3">Produtos</h4>
                {stats.products.length ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-gray-500 border-b">
                        <th className="py-2 pr-2 font-medium">Produto</th>
                        {data.profileType === 'storefront' && <th className="py-2 px-2 font-medium text-right">Vistos</th>}
                        <th className="py-2 px-2 font-medium text-right">No carrinho</th>
                        <th className="py-2 px-2 font-medium text-right">Pedidos</th>
                        <th className="py-2 pl-2 font-medium text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.products.map(pr => (
                        <tr key={pr.productId} className="border-b last:border-0">
                          <td className="py-2 pr-2 text-gray-800">{pr.name}</td>
                          {data.profileType === 'storefront' && <td className="py-2 px-2 text-right tabular-nums">{fmtInt(pr.views)}</td>}
                          <td className="py-2 px-2 text-right tabular-nums">{fmtInt(pr.addedToCart)}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{fmtInt(pr.ordered)}</td>
                          <td className="py-2 pl-2 text-right tabular-nums">{centsToBRL(pr.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="text-sm text-gray-500">Nenhuma interação com produtos no período.</p>}
              </div>
            )}
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600">Ver dados diários em tabela</summary>
            <table className="mt-2 w-full max-w-md text-sm">
              <thead><tr className="text-left text-xs uppercase text-gray-500 border-b">
                <th className="py-1">Dia</th><th className="py-1 text-right">Visitas</th>
                {hasOrders && <><th className="py-1 text-right">Pedidos</th><th className="py-1 text-right">Valor</th></>}
              </tr></thead>
              <tbody>
                {stats.daily.slice().reverse().map(d => (
                  <tr key={d.date} className="border-b last:border-0">
                    <td className="py-1">{fmtDay(d.date)}</td>
                    <td className="py-1 text-right tabular-nums">{fmtInt(d.visits)}</td>
                    {hasOrders && <><td className="py-1 text-right tabular-nums">{fmtInt(d.orders)}</td><td className="py-1 text-right tabular-nums">{centsToBRL(d.revenue)}</td></>}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>

          <p className="text-xs text-gray-500">
            Suas próprias visitas (logado no painel) não são contadas.
            {hasOrders && ' "Pedidos" são pedidos montados no carrinho e abertos no WhatsApp; o cliente ainda confirma o envio lá.'}
          </p>
        </>
      )}
    </div>
  );
}
