import { useState } from 'react';
import { ShoppingBag, Ticket, Trash2, Gift } from 'lucide-react';
import { centsToInput, inputToCents, newObjectId } from './utils';
import { couponLabel, normalizeCode } from '../../utils/coupons';

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
            <p className="text-xs text-gray-500 mt-1">{(s.deliveryZones || []).length > 0 ? 'Não usada: a taxa vem do bairro.' : '0,00 = entrega grátis.'}</p>
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

        {s.delivery && (
          <DeliveryZonesEditor
            zones={s.deliveryZones || []} freeOver={s.freeDeliveryOver || 0}
            onZones={(deliveryZones) => update({ deliveryZones })}
            onFreeOver={(freeDeliveryOver) => update({ freeDeliveryOver })}
          />
        )}

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

      <LoyaltyEditor loyalty={s.loyalty || {}} onChange={(loyalty) => update({ loyalty })} />

      <CouponsEditor coupons={s.coupons || []} onChange={(coupons) => update({ coupons })} />

      <p className="text-xs text-gray-500">Clique em <strong>Salvar</strong> no topo para aplicar.</p>
    </div>
  );
}

// Cupons de desconto: o cliente digita o código no carrinho.
function CouponsEditor({ coupons, onChange }) {
  const [form, setForm] = useState({ code: '', type: 'percent', value: '', minOrder: '' });
  const [error, setError] = useState('');

  const add = () => {
    setError('');
    const code = normalizeCode(form.code);
    if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return setError('Código com 3 a 20 letras, números, - ou _.');
    if (coupons.some(c => normalizeCode(c.code) === code)) return setError('Já existe um cupom com esse código.');
    const value = form.type === 'percent' ? Math.round(Number(form.value)) : inputToCents(form.value);
    if (!value || value <= 0 || (form.type === 'percent' && value > 100)) return setError(form.type === 'percent' ? 'Informe um desconto de 1 a 100%.' : 'Informe o valor do desconto.');
    onChange([...coupons, { code, type: form.type, value, minOrder: inputToCents(form.minOrder), active: true }]);
    setForm({ code: '', type: form.type, value: '', minOrder: '' });
  };
  const toggle = (i) => onChange(coupons.map((c, j) => (j === i ? { ...c, active: c.active === false } : c)));
  const remove = (i) => onChange(coupons.filter((_, j) => j !== i));
  const input = 'px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="border-t pt-5 space-y-3">
      <h4 className="font-semibold flex items-center gap-2"><Ticket className="w-4 h-4" /> Cupons de desconto</h4>
      <p className="text-sm text-gray-500">Crie códigos para divulgar (ex.: PROMO10). O desconto vale sobre os produtos e aparece no pedido que chega no seu WhatsApp.</p>
      {coupons.length > 0 && (
        <ul className="divide-y border rounded-lg bg-white">
          {coupons.map((c, i) => (
            <li key={c.code} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <code className="font-semibold">{c.code}</code>
              <span className="text-gray-600">{couponLabel(c)}{c.minOrder > 0 ? ` · pedidos a partir de R$ ${centsToInput(c.minOrder)}` : ''}</span>
              <label className="ml-auto flex items-center gap-1 text-xs"><input type="checkbox" checked={c.active !== false} onChange={() => toggle(i)} /> ativo</label>
              <button type="button" onClick={() => remove(i)} className="p-1 text-gray-400 hover:text-red-500" aria-label={`Remover cupom ${c.code}`}><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <input className={`${input} w-32 uppercase`} placeholder="CÓDIGO" value={form.code} maxLength={20} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} />
        <select className={input} value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value, value: '' }))}>
          <option value="percent">% de desconto</option>
          <option value="fixed">R$ de desconto</option>
        </select>
        <input className={`${input} w-24`} inputMode="numeric" placeholder={form.type === 'percent' ? '10' : '5,00'} value={form.type === 'fixed' && form.value ? centsToInput(inputToCents(form.value)) : form.value} onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))} />
        <input className={`${input} w-40`} inputMode="numeric" placeholder="Pedido mín. (opcional)" value={form.minOrder ? centsToInput(inputToCents(form.minOrder)) : ''} onChange={(e) => setForm(f => ({ ...f, minOrder: e.target.value }))} />
        <button type="button" onClick={add} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm">Adicionar cupom</button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

// Taxa por bairro e frete grátis acima de um valor.
function DeliveryZonesEditor({ zones, freeOver, onZones, onFreeOver }) {
  const input = 'px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white';
  const setZone = (i, patch) => onZones(zones.map((z, j) => (j === i ? { ...z, ...patch } : z)));
  return (
    <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
      <div>
        <p className="text-sm font-medium text-gray-700">Taxa por bairro (opcional)</p>
        <p className="text-xs text-gray-500">Com bairros cadastrados, o cliente escolhe o dele e paga a taxa certa. Sem bairros, vale a taxa única acima.</p>
      </div>
      {zones.map((z, i) => (
        <div key={z._id || i} className="flex items-center gap-2">
          <input className={`${input} flex-grow min-w-0`} value={z.name} maxLength={60} placeholder="Bairro" onChange={(e) => setZone(i, { name: e.target.value })} />
          <span className="text-xs text-gray-500">R$</span>
          <input className={`${input} w-24 text-right`} inputMode="numeric" value={centsToInput(z.fee || 0)} onChange={(e) => setZone(i, { fee: inputToCents(e.target.value) })} aria-label={`Taxa de ${z.name || 'bairro'}`} />
          <button type="button" onClick={() => onZones(zones.filter((_, j) => j !== i))} className="p-1 text-gray-400 hover:text-red-500" aria-label="Remover bairro"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
      {zones.length < 100 && (
        <button type="button" onClick={() => onZones([...zones, { _id: newObjectId(), name: '', fee: 0 }])} className="text-sm text-blue-600 hover:underline">+ Adicionar bairro</button>
      )}
      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Frete grátis a partir de (R$)</label>
        <input type="text" inputMode="numeric" className={`${input} w-40`} value={centsToInput(freeOver)} onChange={(e) => onFreeOver(inputToCents(e.target.value))} />
        <p className="text-xs text-gray-500 mt-1">0,00 = sem frete grátis. O carrinho mostra quanto falta para o cliente ganhar o frete.</p>
      </div>
    </div>
  );
}

// Cartão fidelidade: "a cada N pedidos, ganhe X".
function LoyaltyEditor({ loyalty, onChange }) {
  const l = { enabled: false, goal: 10, reward: '', ...loyalty };
  const set = (patch) => onChange({ ...l, ...patch });
  const input = 'px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white';
  return (
    <div className="border-t pt-5 space-y-3">
      <h4 className="font-semibold flex items-center gap-2"><Gift className="w-4 h-4" /> Cartão fidelidade</h4>
      <p className="text-sm text-gray-500">O cliente que participa informa o WhatsApp no carrinho e acompanha os selos. Cada WhatsApp soma no máximo 1 selo a cada 30 minutos.</p>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={l.enabled} onChange={() => set({ enabled: !l.enabled })} className="w-4 h-4" /> Ativar cartão fidelidade
      </label>
      <div className={`flex flex-wrap items-center gap-2 text-sm ${l.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
        <span>A cada</span>
        <input type="number" min={2} max={50} className={`${input} w-20`} value={l.goal} onChange={(e) => set({ goal: Math.max(2, Math.min(50, Number(e.target.value) || 2)) })} aria-label="Pedidos para ganhar" />
        <span>pedidos, o cliente ganha</span>
        <input className={`${input} flex-grow min-w-[12rem]`} maxLength={80} placeholder="ex.: 1 açaí de 300ml" value={l.reward} onChange={(e) => set({ reward: e.target.value })} aria-label="Prêmio" />
      </div>
      {l.enabled && !String(l.reward || '').trim() && <p className="text-xs text-amber-700">Escreva o prêmio para o cartão aparecer no carrinho.</p>}
      <p className="text-xs text-gray-500">Quando alguém completar o cartão, o prêmio aparece na aba <strong>Clientes</strong>. Marque "Prêmio entregue" na hora de entregar.</p>
    </div>
  );
}
