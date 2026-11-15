import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, Users, Truck, Tags, LogOut, RefreshCw, Copy, Download, Search } from 'lucide-react';
import api from '../services/api';

// Painel do administrador (dono do sistema). Autenticação pela ADMIN_KEY do
// servidor, guardada só nesta aba do navegador (sessionStorage).
const KEY_STORAGE = 'gestao:key';
const TYPE_LABEL = { menu: 'Cardápio', storefront: 'Vitrine', business: 'Cartão', pet: 'Pet' };
const STATE = {
  active: ['Ativa', 'bg-green-100 text-green-800'],
  legacy: ['Legado', 'bg-blue-100 text-blue-800'],
  pending: ['Aguardando pgto', 'bg-amber-100 text-amber-800'],
  expired: ['Vencida', 'bg-red-100 text-red-800'],
  canceled: ['Cancelada', 'bg-gray-200 text-gray-700'],
  not_required: ['Sem mensalidade', 'bg-gray-100 text-gray-600']
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');
const readKey = () => { try { return sessionStorage.getItem(KEY_STORAGE) || ''; } catch { return ''; } };

function useAdminApi(key, onUnauthorized) {
  return useCallback(async (method, url, data) => {
    try {
      const res = await api.request({ method, url, data, headers: { 'X-Admin-Key': key } });
      return res.data;
    } catch (err) {
      if (err.response?.status === 401) onUnauthorized();
      throw new Error(err.response?.data?.message || 'Erro na requisição.', { cause: err });
    }
  }, [key, onUnauthorized]);
}

function LoginBox({ onLogin }) {
  const [value, setValue] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={(e) => { e.preventDefault(); onLogin(value.trim()); }} className="bg-white rounded-2xl shadow p-8 w-full max-w-sm space-y-4">
        <img src="/logo.png" alt="" className="h-12 mx-auto" />
        <h1 className="text-lg font-bold text-center">Gestão</h1>
        <input type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Chave de administrador (ADMIN_KEY)"
          className="w-full px-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
        <button className="w-full py-3 bg-gray-900 text-white rounded-lg font-semibold">Entrar</button>
      </form>
    </div>
  );
}

function Badge({ state }) {
  const [label, cls] = STATE[state] || [state, 'bg-gray-100'];
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>{label}</span>;
}

function Summary({ call }) {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { call('get', '/admin/summary').then(setS).catch(e => setError(e.message)); }, [call]);
  if (error) return <p className="text-red-600">{error}</p>;
  if (!s) return <p className="text-gray-500">Carregando...</p>;
  const cards = [
    ['Contas', s.users], ['Assinaturas ativas', s.subscriptions.active], ['Aguardando pagamento', s.subscriptions.pending],
    ['Vencidas', s.subscriptions.expired + s.subscriptions.canceled], ['Legado', s.subscriptions.legacy],
    ['Tags a enviar', s.shipmentsPending], ['Tags livres', s.tagsFree], ['Estornos (30 dias)', s.refunds30d || 0]
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(([l, v]) => (
          <div key={l} className="bg-white border rounded-xl p-4">
            <p className="text-xs uppercase text-gray-500">{l}</p>
            <p className="text-2xl font-bold">{v}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-600">Por tipo: {Object.entries(s.byType).map(([t, n]) => `${TYPE_LABEL[t] || t}: ${n}`).join(' · ') || '—'}</p>
    </div>
  );
}

function Subscribers({ call }) {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [type, setType] = useState('paid');
  const [dates, setDates] = useState({});
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type !== 'paid' && type !== 'all') params.set('type', type);
      if (q) params.set('q', q);
      const res = await call('get', `/admin/users?${params}`);
      setUsers(type === 'paid' ? res.users.filter(u => u.profileType === 'menu' || u.profileType === 'storefront') : res.users);
    } catch (e) { setMsg(e.message); } finally { setLoading(false); }
  }, [call, q, type]);

  // Carregamento de dados ao montar/mudar filtro (padrão de busca de dados).
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  const saveDate = async (u) => {
    const date = dates[u.id];
    if (!date) return;
    if (!window.confirm(`Definir ${u.name} como ativo até ${date.split('-').reverse().join('/')}? (não altera a cobrança no Mercado Pago)`)) return;
    try {
      const res = await call('post', `/admin/users/${encodeURIComponent(u.id)}/active-until`, { date });
      setUsers(list => list.map(x => (x.id === u.id ? res.user : x)));
      setMsg(`Atualizado: ${u.name}`);
    } catch (e) { setMsg(e.message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} placeholder="Nome, link, e-mail"
            className="pl-8 pr-3 py-2 border rounded-lg text-sm" />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="paid">Cardápio + Vitrine</option>
          <option value="all">Todos</option>
          {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button onClick={load} className="p-2 border rounded-lg" aria-label="Atualizar"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        <span className="text-sm text-gray-500">{users.length} conta(s)</span>
      </div>
      {msg && <p className="text-sm text-blue-700">{msg}</p>}
      <div className="overflow-x-auto bg-white border rounded-xl">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-gray-500 border-b">
            <th className="p-3">Conta</th><th className="p-3">Tipo</th><th className="p-3">Assinatura</th><th className="p-3">Ativo até</th><th className="p-3">Ajuste manual</th>
          </tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b last:border-0 align-top">
                <td className="p-3">
                  <p className="font-medium">{u.name}</p>
                  <a href={`/${u.slug}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs">/{u.slug}</a>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </td>
                <td className="p-3">{TYPE_LABEL[u.profileType]}</td>
                <td className="p-3 space-y-1">
                  <Badge state={u.subscription.state} />
                  {u.subscription.canceled && u.subscription.state === 'active' && <p className="text-xs text-gray-500">renovação cancelada</p>}
                  {u.subscription.refundedAt && <p className="text-xs font-medium text-red-700">Estorno/contestação em {fmtDate(u.subscription.refundedAt)}</p>}
                  {u.subscription.customerId && <p className="text-[11px] text-gray-400 break-all">{u.subscription.customerId}</p>}
                </td>
                <td className="p-3 whitespace-nowrap">{fmtDate(u.subscription.activeUntil)}</td>
                <td className="p-3">
                  {(u.profileType === 'menu' || u.profileType === 'storefront') && (
                    <div className="flex gap-1">
                      <input type="date" value={dates[u.id] || ''} onChange={(e) => setDates(d => ({ ...d, [u.id]: e.target.value }))} className="px-2 py-1 border rounded text-xs" />
                      <button onClick={() => saveDate(u)} className="px-2 py-1 bg-gray-900 text-white rounded text-xs">Salvar</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">"Legado": contas antigas sem assinatura, ficam no ar até você definir uma data. Data no passado tira o perfil do ar.</p>
    </div>
  );
}

function Shipments({ call }) {
  const [status, setStatus] = useState('pending');
  const [users, setUsers] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState({});
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([call('get', `/admin/shipments?status=${status}`), call('get', '/admin/tags?status=free')]);
      setUsers(s.users);
      setTags(t.tags);
    } catch (e) { setMsg(e.message); }
  }, [call, status]);

  // Carregamento de dados ao montar/mudar filtro (padrão de busca de dados).
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  const link = async (u) => {
    const tagId = (tagInput[u.id] || '').trim();
    if (!tagId) return setMsg('Informe o código da tag.');
    try {
      await call('post', `/admin/shipments/${encodeURIComponent(u.id)}/link-tag`, { tagId });
      setMsg(`Tag ${tagId} vinculada a ${u.name}. Grave na tag: ${window.location.origin}/tag/${tagId}`);
      load();
    } catch (e) { setMsg(e.message); }
  };

  const copy = (t) => { navigator.clipboard.writeText(t); setMsg('Copiado!'); };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[['pending', 'A enviar'], ['sent', 'Enviadas']].map(([v, l]) => (
          <button key={v} onClick={() => setStatus(v)} className={`px-3 py-1.5 rounded-lg text-sm ${status === v ? 'bg-gray-900 text-white' : 'bg-white border'}`}>{l}</button>
        ))}
      </div>
      {msg && <p className="text-sm text-blue-700 break-all">{msg}</p>}
      {users.length === 0 && <p className="text-gray-500 text-sm">Nada por aqui.</p>}
      <div className="space-y-3">
        {users.map(u => {
          const freeOfType = tags.filter(t => t.profileType === u.profileType);
          return (
            <div key={u.id} className="bg-white border rounded-xl p-4 space-y-2">
              <div className="flex justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-medium">{u.name} <span className="text-xs text-gray-500">({TYPE_LABEL[u.profileType]})</span></p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <Badge state={u.subscription.state} />
              </div>
              <div className="flex items-start gap-2 text-sm">
                <p className="flex-grow">{u.shipping?.address}</p>
                <button onClick={() => copy(`${u.name}\n${u.shipping?.address}`)} className="p-1 border rounded" aria-label="Copiar endereço"><Copy className="w-4 h-4" /></button>
              </div>
              {status === 'pending' ? (
                <div className="flex flex-wrap gap-2 items-center">
                  <input list={`tags-${u.id}`} value={tagInput[u.id] || ''} onChange={(e) => setTagInput(s => ({ ...s, [u.id]: e.target.value }))}
                    placeholder="Código da tag" className="px-3 py-2 border rounded-lg text-sm" />
                  <datalist id={`tags-${u.id}`}>{freeOfType.map(t => <option key={t.id} value={t.id} />)}</datalist>
                  <button onClick={() => link(u)} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm">Vincular e marcar enviada</button>
                  <span className="text-xs text-gray-500">{freeOfType.length} tag(s) livre(s) desse tipo</span>
                </div>
              ) : (
                <div className="text-sm flex flex-wrap items-center gap-2">
                  <span>Tag <strong>{u.shipping?.tagId}</strong> · enviada em {fmtDate(u.shipping?.sentAt)}</span>
                  <button onClick={() => copy(`${window.location.origin}/tag/${u.shipping?.tagId}`)} className="text-xs text-blue-600 underline">copiar link da tag</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500">Grave na tag física o endereço <code>{window.location.origin}/tag/CÓDIGO</code>: ele abre o perfil da conta vinculada.</p>
    </div>
  );
}

function TagsTab({ call }) {
  const [tags, setTags] = useState([]);
  const [filter, setFilter] = useState('free');
  const [form, setForm] = useState({ count: 10, profileType: 'menu', prefix: '', notes: '' });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try { setTags((await call('get', `/admin/tags?status=${filter}`)).tags); } catch (e) { setMsg(e.message); }
  }, [call, filter]);
  // Carregamento de dados ao montar/mudar filtro (padrão de busca de dados).
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  const create = async (e) => {
    e.preventDefault();
    try {
      const body = { count: Number(form.count), profileType: form.profileType, notes: form.notes };
      if (form.prefix.trim()) body.prefix = form.prefix.trim();
      const res = await call('post', '/admin/tags', body);
      setMsg(`${res.createdCount} tag(s) criada(s)${res.duplicateCount ? `, ${res.duplicateCount} já existiam` : ''}.`);
      load();
    } catch (err) { setMsg(err.message); }
  };

  const exportCsv = () => {
    const rows = [['codigo', 'tipo', 'ativada', 'conta', 'url_para_gravar']].concat(
      tags.map(t => [t.id, t.profileType, t.isActivated ? 'sim' : 'nao', t.activatedBy?.slug || '', `${window.location.origin}/tag/${t.id}`])
    );
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `tags-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="bg-white border rounded-xl p-4 flex flex-wrap gap-2 items-end">
        <label className="text-sm">Quantidade<input type="number" min={1} max={1000} value={form.count} onChange={(e) => setForm(f => ({ ...f, count: e.target.value }))} className="block px-3 py-2 border rounded-lg w-24" /></label>
        <label className="text-sm">Tipo<select value={form.profileType} onChange={(e) => setForm(f => ({ ...f, profileType: e.target.value }))} className="block px-3 py-2 border rounded-lg">
          {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select></label>
        <label className="text-sm">Prefixo (opcional)<input value={form.prefix} onChange={(e) => setForm(f => ({ ...f, prefix: e.target.value }))} placeholder="vazio = código aleatório" className="block px-3 py-2 border rounded-lg" /></label>
        <label className="text-sm">Observação<input value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="block px-3 py-2 border rounded-lg" /></label>
        <button className="px-4 py-2 bg-gray-900 text-white rounded-lg">Criar lote</button>
      </form>
      <p className="text-xs text-gray-500">Prefira códigos aleatórios (sem prefixo): sequenciais são fáceis de adivinhar.</p>
      {msg && <p className="text-sm text-blue-700">{msg}</p>}
      <div className="flex gap-2 items-center">
        {[['free', 'Livres'], ['activated', 'Vinculadas'], ['all', 'Todas']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} className={`px-3 py-1.5 rounded-lg text-sm ${filter === v ? 'bg-gray-900 text-white' : 'bg-white border'}`}>{l}</button>
        ))}
        <button onClick={exportCsv} className="ml-auto px-3 py-1.5 border rounded-lg text-sm inline-flex items-center gap-1 bg-white"><Download className="w-4 h-4" /> CSV</button>
      </div>
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-gray-500 border-b"><th className="p-3">Código</th><th className="p-3">Tipo</th><th className="p-3">Conta</th><th className="p-3">Criada</th></tr></thead>
          <tbody>
            {tags.slice(0, 500).map(t => (
              <tr key={t.id} className="border-b last:border-0">
                <td className="p-3 font-mono">{t.id}</td>
                <td className="p-3">{TYPE_LABEL[t.profileType]}</td>
                <td className="p-3">{t.activatedBy?.slug ? `/${t.activatedBy.slug}` : '—'}</td>
                <td className="p-3">{fmtDate(t.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TABS = [
  ['summary', 'Resumo', LayoutDashboard, Summary],
  ['subs', 'Assinantes', Users, Subscribers],
  ['ship', 'Envios', Truck, Shipments],
  ['tags', 'Tags', Tags, TagsTab]
];

export default function Gestao() {
  const [key, setKey] = useState(readKey);
  const [tab, setTab] = useState('summary');

  const logout = useCallback(() => {
    try { sessionStorage.removeItem(KEY_STORAGE); } catch { /* ignore */ }
    setKey('');
  }, []);
  const login = (k) => {
    try { sessionStorage.setItem(KEY_STORAGE, k); } catch { /* ignore */ }
    setKey(k);
  };
  const call = useAdminApi(key, logout);
  const Active = useMemo(() => TABS.find(t => t[0] === tab)[3], [tab]);

  if (!key) return <LoginBox onLogin={login} />;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-8" />
          <span className="font-bold">Gestão</span>
        </div>
        <button onClick={logout} className="text-sm text-gray-600 inline-flex items-center gap-1"><LogOut className="w-4 h-4" /> Sair</button>
      </header>
      <nav className="bg-white border-b px-4 sm:px-6 flex gap-4 overflow-x-auto">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={`py-3 text-sm inline-flex items-center gap-1 border-b-2 whitespace-nowrap ${tab === id ? 'border-gray-900 font-semibold' : 'border-transparent text-gray-500'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </nav>
      <main className="p-4 sm:p-6 max-w-6xl mx-auto">
        <Active call={call} />
      </main>
    </div>
  );
}
