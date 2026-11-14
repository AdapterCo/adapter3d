import { ShoppingBag } from 'lucide-react';
import { centsToInput, inputToCents } from './utils';

const DEFAULTS = { enabled: true, pickup: true, delivery: true, deliveryFee: 0, minOrder: 0, paymentMethods: ['pix', 'card', 'cash'] };
const PAYMENTS = [['pix', 'Pix'], ['card', 'Cartão'], ['cash', 'Dinheiro']];

export default function OrdersTab({ data, setData }) {
  const s = { ...DEFAULTS, ...(data.orderSettings || {}) };
  const update = (patch) => setData(prev => ({ ...prev, orderSettings: { ...DEFAULTS, ...(prev.orderSettings || {}), ...patch } }));

  const togglePayment = (m) => {
    const has = s.paymentMethods.includes(m);
    const next = has ? s.paymentMethods.filter(x => x !== m) : [...s.paymentMethods, m];
    if (next.length === 0) return; // pelo menos uma forma de pagamento
    update({ paymentMethods: PAYMENTS.map(([k]) => k).filter(k => next.includes(k)) });
  };

  const toggleMode = (field) => {
    const other = field === 'pickup' ? 'delivery' : 'pickup';
    if (s[field] && !s[other]) return; // pelo menos entrega ou retirada
    update({ [field]: !s[field] });
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
        <ShoppingBag className="w-5 h-5" /> Pedidos pelo WhatsApp
      </h3>
      <p className="text-sm text-gray-500 -mt-2">
        Seus clientes montam o carrinho e o pedido chega pronto no seu WhatsApp: itens, total, entrega ou retirada,
        endereço e forma de pagamento.
      </p>

      {!data.whatsapp && (
        <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3">
          Cadastre seu WhatsApp na aba <strong>Contato</strong>: sem ele o carrinho não aparece.
        </p>
      )}

      <label className="flex items-center gap-3">
        <input type="checkbox" checked={s.enabled} onChange={() => update({ enabled: !s.enabled })} className="w-5 h-5" />
        <span className="font-medium">Ativar carrinho de pedidos</span>
      </label>

      <div className={`space-y-6 ${s.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Como o cliente recebe</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={s.delivery} onChange={() => toggleMode('delivery')} className="w-4 h-4" /> Entrega
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={s.pickup} onChange={() => toggleMode('pickup')} className="w-4 h-4" /> Retirada no local
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={s.delivery ? '' : 'opacity-50'}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Taxa de entrega (R$)</label>
            <input
              type="text" inputMode="numeric" disabled={!s.delivery}
              value={centsToInput(s.deliveryFee)}
              onChange={(e) => update({ deliveryFee: inputToCents(e.target.value) })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">0,00 = entrega grátis.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pedido mínimo (R$)</label>
            <input
              type="text" inputMode="numeric"
              value={centsToInput(s.minOrder)}
              onChange={(e) => update({ minOrder: inputToCents(e.target.value) })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">0,00 = sem mínimo.</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Formas de pagamento aceitas</p>
          <div className="flex flex-wrap gap-4">
            {PAYMENTS.map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={s.paymentMethods.includes(k)} onChange={() => togglePayment(k)} className="w-4 h-4" /> {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">Clique em <strong>Salvar</strong> no topo para aplicar.</p>
    </div>
  );
}
