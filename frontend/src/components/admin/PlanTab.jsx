import { useCallback, useEffect, useState } from 'react';
import { CreditCard, ExternalLink, RefreshCw, Truck, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import api from '../../services/api';

const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');

const STATUS = {
  active: { label: 'Ativa', cls: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  legacy: { label: 'Conta antiga (sem cobrança)', cls: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
  pending: { label: 'Aguardando pagamento', cls: 'bg-amber-100 text-amber-800', icon: Clock },
  expired: { label: 'Vencida', cls: 'bg-red-100 text-red-800', icon: AlertTriangle },
  canceled: { label: 'Cancelada', cls: 'bg-gray-200 text-gray-700', icon: AlertTriangle }
};

const SHIPPING = {
  pending: 'Sua tag está sendo preparada para envio.',
  sent: 'Sua tag foi enviada.'
};

export default function PlanTab() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/billing/me');
      setInfo(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar o plano.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregamento de dados ao montar/mudar filtro (padrão de busca de dados).
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  const subscribe = async () => {
    setBusy(true); setError(''); setMsg('');
    try {
      const res = await api.post('/billing/subscribe');
      if (res.data.invoiceUrl) window.open(res.data.invoiceUrl, '_blank', 'noopener');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível assinar agora.');
    } finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!window.confirm('Cancelar a renovação automática? Seu perfil sai do ar quando o período pago terminar.')) return;
    setBusy(true); setError(''); setMsg('');
    try {
      const res = await api.post('/billing/cancel');
      setMsg(res.data.message);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível cancelar agora.');
    } finally { setBusy(false); }
  };

  if (loading) return <p className="text-gray-500">Carregando plano...</p>;
  if (!info) return <p className="text-red-600">{error}</p>;
  if (!info.required) return <p className="text-gray-600">Este tipo de perfil não tem mensalidade.</p>;

  const st = STATUS[info.status] || STATUS.pending;
  const needsSubscription = !info.hasSubscription && info.status !== 'legacy';
  const legacyCanSubscribe = info.status === 'legacy' && !info.hasSubscription;

  return (
    <div className="space-y-6 max-w-xl">
      <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2"><CreditCard className="w-5 h-5" /> Plano</h3>

      <div className="border rounded-xl p-5 space-y-3 bg-white">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${st.cls}`}>
            <st.icon className="w-4 h-4" /> {st.label}
          </span>
          {info.price && <span className="text-gray-700"><strong>{brl(info.price)}</strong>/mês</span>}
        </div>

        {info.status === 'active' && (
          <p className="text-sm text-gray-600">
            {info.canceled ? 'Renovação cancelada. ' : ''}Seu perfil está no ar até <strong>{fmtDate(info.activeUntil)}</strong>
            {info.canceled ? '.' : ' e renova automaticamente.'}
          </p>
        )}
        {info.status === 'pending' && <p className="text-sm text-amber-800">Seu perfil entra no ar assim que o primeiro pagamento for confirmado.</p>}
        {info.status === 'expired' && <p className="text-sm text-red-700">Seu perfil está <strong>fora do ar</strong> desde {fmtDate(info.activeUntil)}. Pague a fatura para voltar.</p>}
        {info.status === 'canceled' && <p className="text-sm text-gray-700">Assinatura cancelada. Seu perfil está fora do ar. Assine de novo para voltar.</p>}
        {info.status === 'legacy' && <p className="text-sm text-gray-600">Sua conta é anterior às assinaturas e continua no ar.</p>}

        {info.invoiceUrl && (
          <a href={info.invoiceUrl} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold">
            <ExternalLink className="w-4 h-4" /> Pagar no Mercado Pago
          </a>
        )}

        {(needsSubscription || legacyCanSubscribe) && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm text-gray-700">{legacyCanSubscribe ? 'Quer ativar a assinatura mensal?' : 'Assine para colocar seu perfil no ar:'}</p>
            <button onClick={subscribe} disabled={busy}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-60">
              {busy ? 'Gerando cobrança...' : 'Assinar agora'}
            </button>
          </div>
        )}

        {info.hasSubscription && (
          <button onClick={cancel} disabled={busy} className="text-sm text-red-600 hover:underline disabled:opacity-60">
            Cancelar renovação automática
          </button>
        )}

        {msg && <p className="text-sm text-green-700">{msg}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button onClick={() => { setLoading(true); load(); }} className="text-xs text-gray-500 inline-flex items-center gap-1 hover:underline">
          <RefreshCw className="w-3 h-3" /> Atualizar situação
        </button>
      </div>

      {info.shipping?.status && info.shipping.status !== 'none' && (
        <div className="border rounded-xl p-4 bg-white flex gap-3 items-start">
          <Truck className="w-5 h-5 text-gray-500 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-medium">Tag NFC</p>
            <p>{SHIPPING[info.shipping.status]}{info.shipping.status === 'sent' && info.shipping.sentAt ? ` (${fmtDate(info.shipping.sentAt)})` : ''}</p>
            <p className="text-gray-500 mt-1">Enquanto isso, use seu link e o QR Code em Compartilhar. Você também pode gravar uma tag em branco pelo botão "Gravar tag".</p>
          </div>
        </div>
      )}
    </div>
  );
}
