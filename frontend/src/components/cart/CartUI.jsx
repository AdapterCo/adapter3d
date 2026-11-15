import { useState } from 'react';
import { ShoppingBag, X, Minus, Plus, Trash2, MessageCircle, CheckCircle2, Copy } from 'lucide-react';
import QRCode from 'react-qr-code';
import { openStatus } from '../../utils/hours';
import { buildPixPayload, normalizePixKey } from '../../utils/pix';
import { centsToBRL, inputToCents, centsToInput, buildWhatsappLink } from '../admin/utils';
import { buildOrderMessage, PAYMENT_LABEL } from './orderMessage';
import { track } from '../../services/track';

const CUSTOMER_KEY = 'cart:customer';

function readCustomer() {
  try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || '{}') || {}; } catch { return {}; }
}
function saveCustomer(c) {
  try { localStorage.setItem(CUSTOMER_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

export function QtyControl({ qty, onChange, buttonStyle, size = 'md' }) {
  const pad = size === 'sm' ? 'p-1' : 'p-2';
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(qty - 1)} className={`${pad} rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700`} aria-label="Diminuir">
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-6 text-center font-semibold text-gray-900">{qty}</span>
      <button type="button" onClick={() => onChange(qty + 1)} className={`${pad} rounded-full`} style={buttonStyle} aria-label="Aumentar">
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

// Barra flutuante + painel do carrinho/checkout. Renderiza nada se o carrinho
// estiver desativado (sem WhatsApp, ou desligado pelo lojista).
export default function CartUI({ cart, data, buttonStyle }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const settings = cart.settings;
  const allowPickup = settings.pickup !== false;
  const allowDelivery = settings.delivery !== false;
  const methods = (settings.paymentMethods && settings.paymentMethods.length ? settings.paymentMethods : ['pix', 'card', 'cash']);
  const deliveryFee = Number(settings.deliveryFee || 0);
  const minOrder = Number(settings.minOrder || 0);

  const stored = readCustomer();
  const [mode, setMode] = useState(allowDelivery ? 'delivery' : 'pickup');
  const [name, setName] = useState(stored.name || '');
  const [address, setAddress] = useState(stored.address || '');
  const [payment, setPayment] = useState(methods[0]);
  const [changeFor, setChangeFor] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null); // { ref, total, pixPayload } do último pedido
  const [pixCopied, setPixCopied] = useState(false);

  if (!cart.enabled) return null;

  const effectiveMode = mode === 'delivery' && !allowDelivery ? 'pickup' : mode === 'pickup' && !allowPickup ? 'delivery' : mode;
  const fee = effectiveMode === 'delivery' ? deliveryFee : 0;
  const total = cart.subtotal + fee;
  const belowMin = minOrder > 0 && cart.subtotal < minOrder;

  // Horário de funcionamento: fora dele, o pedido não é enviado.
  const hoursStatus = openStatus(data.businessHours);
  const closed = hoursStatus.configured && !hoursStatus.open;

  const handleSend = () => {
    setError('');
    if (closed) return setError(`Estamos fechados agora. ${hoursStatus.label}.`);
    if (cart.lines.length === 0) return setError('Seu carrinho está vazio.');
    if (belowMin) return setError(`Pedido mínimo de ${centsToBRL(minOrder)}.`);
    if (!name.trim()) return setError('Informe seu nome.');
    if (effectiveMode === 'delivery' && !address.trim()) return setError('Informe o endereço de entrega.');
    const change = payment === 'cash' ? inputToCents(changeFor) : 0;
    if (payment === 'cash' && change > 0 && change < total) return setError('O troco precisa ser para um valor maior que o total.');

    // Número curto do pedido: aparece na mensagem e no Pix, para o lojista conferir.
    const orderRef = Array.from(crypto.getRandomValues(new Uint8Array(4)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
    const pixKey = normalizePixKey(data.pix);
    const pixPayload = payment === 'pix' && pixKey
      ? buildPixPayload({ key: pixKey, name: data.orderSettings?.pixName || data.name, city: data.orderSettings?.pixCity, amount: total, txid: orderRef })
      : '';

    const message = buildOrderMessage({
      orderRef,
      storeName: data.name,
      lines: cart.lines,
      subtotal: cart.subtotal,
      deliveryFee: fee,
      total,
      mode: effectiveMode,
      customerName: name.trim(),
      customerAddress: address.trim(),
      payment,
      changeFor: change,
      notes
    });
    saveCustomer({ name: name.trim(), address: address.trim() });
    track(data, 'order', {
      value: total,
      items: cart.lines.map(l => ({ productId: String(l.productId), name: l.product.name, qty: l.qty, price: l.product.price || 0 }))
    });
    window.open(buildWhatsappLink(data.whatsapp, message), '_blank', 'noopener');
    setOrder({ ref: orderRef, total, pixPayload });
    setSent(true);
  };

  const copyPix = () => {
    navigator.clipboard.writeText(order.pixPayload);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2500);
  };

  const startNew = () => {
    cart.clear();
    setNotes('');
    setChangeFor('');
    setSent(false);
    setOpen(false);
  };

  return (
    <>
      {cart.count > 0 && !open && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-4 pointer-events-none">
          <button
            onClick={() => setOpen(true)}
            className="pointer-events-auto max-w-md mx-auto w-full flex items-center justify-between px-5 py-4 rounded-2xl shadow-2xl font-semibold"
            style={buttonStyle}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Ver carrinho ({cart.count})
            </span>
            <span>{centsToBRL(cart.subtotal)}</span>
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div
            className="bg-white w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl text-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold flex items-center gap-2"><ShoppingBag className="w-5 h-5" /> Seu pedido</h2>
              <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-gray-100" aria-label="Fechar"><X className="w-5 h-5" /></button>
            </div>

            {sent ? (
              <div className="p-6 text-center space-y-4">
                <CheckCircle2 className="w-14 h-14 mx-auto text-green-600" />
                <h3 className="text-lg font-bold">Pedido {order?.ref ? `#${order.ref} ` : ''}pronto no WhatsApp!</h3>
                <p className="text-sm text-gray-600">Confira a mensagem e toque em <strong>enviar</strong> no WhatsApp para concluir o pedido.</p>
                {order?.pixPayload && (
                  <div className="border rounded-xl p-4 space-y-3 text-left">
                    <p className="font-semibold text-center">Pague com Pix · {centsToBRL(order.total)}</p>
                    <div className="flex justify-center bg-white p-2"><QRCode value={order.pixPayload} size={168} /></div>
                    <button onClick={copyPix} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl font-semibold" style={buttonStyle}>
                      <Copy className="w-4 h-4" /> {pixCopied ? 'Código copiado!' : 'Copiar Pix copia e cola'}
                    </button>
                    <p className="text-xs text-gray-500 text-center">Abra o app do seu banco, escolha Pix copia e cola e cole o código. O valor já vem preenchido.</p>
                  </div>
                )}
                <button onClick={startNew} className="w-full p-3 rounded-xl font-semibold" style={buttonStyle}>Fazer novo pedido</button>
                <button onClick={() => setSent(false)} className="w-full p-3 rounded-xl font-medium border text-gray-700">Voltar ao carrinho</button>
              </div>
            ) : (
              <div className="p-5 space-y-5">
                {/* Itens */}
                {cart.lines.length === 0 ? (
                  <p className="text-center text-gray-500 py-6">Seu carrinho está vazio.</p>
                ) : (
                  <ul className="divide-y">
                    {cart.lines.map(l => (
                      <li key={l.productId} className="py-3 flex items-center gap-3">
                        <div className="flex-grow min-w-0">
                          <p className="font-medium truncate">{l.product.name}</p>
                          <p className="text-sm text-gray-500">{centsToBRL(l.product.price)} cada</p>
                        </div>
                        <QtyControl qty={l.qty} onChange={(q) => cart.setQty(l.productId, q)} buttonStyle={buttonStyle} size="sm" />
                        <button onClick={() => cart.setQty(l.productId, 0)} className="p-1 text-gray-400 hover:text-red-500" aria-label="Remover">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Entrega ou retirada */}
                {allowPickup && allowDelivery && (
                  <div className="grid grid-cols-2 gap-2">
                    {[['delivery', 'Entrega'], ['pickup', 'Retirar no local']].map(([value, label]) => (
                      <button
                        key={value} type="button" onClick={() => setMode(value)}
                        className={`p-3 rounded-xl border text-sm font-medium ${effectiveMode === value ? 'border-transparent shadow' : 'bg-white text-gray-700'}`}
                        style={effectiveMode === value ? buttonStyle : undefined}
                      >{label}</button>
                    ))}
                  </div>
                )}
                {!(allowPickup && allowDelivery) && (
                  <p className="text-sm text-gray-600">{effectiveMode === 'delivery' ? 'Somente entrega.' : 'Somente retirada no local.'}</p>
                )}

                <div className="space-y-3">
                  <input
                    value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
                    placeholder="Seu nome"
                    className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-gray-300"
                  />
                  {effectiveMode === 'delivery' && (
                    <textarea
                      value={address} onChange={(e) => setAddress(e.target.value)} maxLength={250} rows={2}
                      placeholder="Endereço de entrega (rua, número, bairro, complemento)"
                      className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-gray-300 resize-none"
                    />
                  )}
                </div>

                {/* Pagamento */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Forma de pagamento</p>
                  <div className="flex flex-wrap gap-2">
                    {methods.map(m => (
                      <button
                        key={m} type="button" onClick={() => setPayment(m)}
                        className={`px-3 py-2 rounded-full border text-sm ${payment === m ? 'border-transparent shadow' : 'bg-white text-gray-700'}`}
                        style={payment === m ? buttonStyle : undefined}
                      >{m === 'card' ? 'Cartão' : PAYMENT_LABEL[m]}</button>
                    ))}
                  </div>
                  {payment === 'cash' && (
                    <input
                      value={changeFor}
                      onChange={(e) => setChangeFor(e.target.value ? centsToInput(inputToCents(e.target.value)) : '')}
                      inputMode="numeric"
                      placeholder="Troco para quanto? (opcional)"
                      className="mt-3 w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-gray-300"
                    />
                  )}
                </div>

                <textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} rows={2}
                  placeholder="Observações (ex: sem cebola, ponto da carne...)"
                  className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-gray-300 resize-none"
                />

                {/* Totais */}
                <div className="space-y-1 text-sm border-t pt-4">
                  <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{centsToBRL(cart.subtotal)}</span></div>
                  {effectiveMode === 'delivery' && (
                    <div className="flex justify-between"><span className="text-gray-600">Entrega</span><span>{fee > 0 ? centsToBRL(fee) : 'Grátis'}</span></div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-1"><span>Total</span><span>{centsToBRL(total)}</span></div>
                  {belowMin && <p className="text-amber-700 text-xs pt-1">Pedido mínimo: {centsToBRL(minOrder)}</p>}
                </div>

                {closed && (
                  <p className="text-sm bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-center">{hoursStatus.label}. Pedidos só no horário de funcionamento.</p>
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  onClick={handleSend}
                  disabled={cart.lines.length === 0 || closed}
                  className="w-full flex items-center justify-center p-4 rounded-xl font-semibold shadow disabled:opacity-50"
                  style={buttonStyle}
                >
                  <MessageCircle className="w-5 h-5 mr-2" /> Enviar pedido pelo WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
