import { useEffect, useMemo, useState } from 'react';
import { Users, Download, Trash2, MessageCircle, RefreshCw, Search, Gift } from 'lucide-react';
import api from '../../services/api';
import { centsToBRL } from './utils';

// "5511987654321" -> "(11) 98765-4321"
function formatPhone(digits) {
  const d = String(digits || '').replace(/^55/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');

// CSV com ";" e BOM: abre certo no Excel em português.
function toCsv(customers) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Nome', 'WhatsApp', 'Pedidos', 'Total (R$)', 'Primeiro pedido', 'Último pedido', 'Autorizou em'];
  const rows = customers.map(c => [
    c.name, formatPhone(c.phone), c.orders, (Number(c.totalSpent || 0) / 100).toFixed(2).replace('.', ','),
    fmtDate(c.firstOrderAt), fmtDate(c.lastOrderAt), fmtDate(c.consentAt)
  ]);
  return '﻿' + [head, ...rows].map(r => r.map(cell).join(';')).join('\r\n');
}

// Clientes que, no carrinho, aceitaram receber novidades e/ou entraram no
// cartão fidelidade. O CSV (para campanhas) leva só quem aceitou novidades.
export default function CustomersTab({ data }) {
  const goal = data?.orderSettings?.loyalty?.goal || 10;
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.get('/customers')
      .then(res => { if (!cancelled) { setCustomers(res.data.customers || []); setError(''); } })
      .catch(err => { if (!cancelled) setError(err.response?.data?.message || 'Erro ao carregar clientes.'); });
    return () => { cancelled = true; };
  }, [reload]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qd = q.replace(/\D/g, '');
    if (!customers || !q) return customers || [];
    return customers.filter(c => (c.name || '').toLowerCase().includes(q) || (qd && c.phone.includes(qd)));
  }, [customers, query]);

  const marketingList = filtered.filter(c => c.marketing !== false);

  const exportCsv = () => {
    const blob = new Blob([toCsv(marketingList)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const redeem = async (c) => {
    if (!confirm(`Confirmar que ${c.name || formatPhone(c.phone)} recebeu o prêmio do cartão fidelidade?`)) return;
    try {
      const res = await api.post(`/customers/${c._id}/redeem`);
      setCustomers(list => list.map(x => (x._id === c._id ? { ...x, ...res.data } : x)));
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao registrar o prêmio.');
    }
  };

  const remove = async (c) => {
    if (!confirm(`Remover ${c.name || formatPhone(c.phone)} da lista? Faça isso quando o cliente pedir para sair.`)) return;
    try {
      await api.delete(`/customers/${c._id}`);
      setCustomers(list => list.filter(x => x._id !== c._id));
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao remover cliente.');
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
        <h3 className="font-semibold text-lg flex items-center gap-2"><Users className="w-5 h-5" /> Clientes</h3>
        <div className="flex gap-2">
          <button onClick={() => setReload(n => n + 1)} className="p-2 rounded-lg border text-gray-600 hover:bg-gray-50" aria-label="Atualizar lista"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={exportCsv} disabled={!marketingList.length} title="Só clientes que aceitaram receber novidades" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-40">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        Clientes que, ao fazer um pedido, marcaram <strong>"Quero receber novidades"</strong> ou entraram no <strong>cartão fidelidade</strong>.
        O CSV leva só quem aceitou novidades: use para avisar de promoções pelo WhatsApp. Se alguém pedir para sair, remova pela lixeira.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!customers && !error && <p className="text-sm text-gray-500">Carregando…</p>}

      {customers && customers.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-10 border rounded-lg bg-gray-50">
          Ainda não há clientes na lista. Eles aparecem aqui quando fazem um pedido e autorizam receber novidades.
        </p>
      )}

      {customers && customers.length > 0 && (
        <>
          <div className="flex items-center gap-2 border rounded-lg px-3 bg-white focus-within:ring-2 focus-within:ring-blue-500">
            <Search className="w-4 h-4 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou telefone" className="w-full py-2 outline-none text-sm" />
          </div>
          <p className="text-xs text-gray-500">{filtered.length} de {customers.length} cliente(s)</p>
          <ul className="divide-y border rounded-lg bg-white">
            {filtered.map(c => (
              <li key={c._id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                <div className="flex-grow min-w-[10rem]">
                  <p className="font-medium text-gray-900">{c.name || '(sem nome)'}</p>
                  <p className="text-gray-500">{formatPhone(c.phone)}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.marketing !== false && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs">novidades</span>}
                    {c.loyalty && <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-xs flex items-center gap-1"><Gift className="w-3 h-3" /> {c.stamps || 0}/{goal} selos</span>}
                    {c.rewardsRedeemed > 0 && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">{c.rewardsRedeemed} prêmio(s) entregue(s)</span>}
                  </div>
                </div>
                {c.rewardsPending > 0 && (
                  <button onClick={() => redeem(c)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600" title="Marque quando entregar o prêmio">
                    <Gift className="w-3.5 h-3.5" /> {c.rewardsPending > 1 ? `${c.rewardsPending} prêmios · ` : ''}Prêmio entregue
                  </button>
                )}
                <div className="text-right text-gray-600">
                  <p>{c.orders} pedido(s) · {centsToBRL(c.totalSpent)}</p>
                  <p className="text-xs text-gray-400">último em {fmtDate(c.lastOrderAt)}</p>
                </div>
                <a href={`https://wa.me/${c.phone}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-green-700 hover:bg-green-50" aria-label={`Conversar com ${c.name || 'cliente'} no WhatsApp`}>
                  <MessageCircle className="w-4 h-4" />
                </a>
                <button onClick={() => remove(c)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50" aria-label={`Remover ${c.name || 'cliente'} da lista`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
