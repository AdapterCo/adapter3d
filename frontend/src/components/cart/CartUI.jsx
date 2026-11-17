import { useState } from 'react';
import { ShoppingBag, X, Minus, Plus, Trash2, MessageCircle, CheckCircle2, Copy, Star, Gift } from 'lucide-react';
import QRCode from 'react-qr-code';
import { openStatus } from '../../utils/hours';
import { buildPixPayload, normalizePixKey } from '../../utils/pix';
import { applyCoupon } from '../../utils/coupons';
import { validateSelection } from '../../utils/productOptions';
import { deliveryQuote, zonesOf } from '../../utils/delivery';
import { centsToBRL, inputToCents, centsToInput, buildWhatsappLink } from '../admin/utils';
import { buildOrderMessage, PAYMENT_LABEL } from './orderMessage';
import { track } from '../../services/track';
import api from '../../services/api';

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
  const zones = zonesOf(settings);
  // Convite para avaliar no Google na tela de pedido enviado (mesmo link e a
  // mesma chave "mostrar botão" da aba Google Maps do painel).
  const reviewUrl = data.showReviewButton !== false ? data.googleReview?.reviewUrl || '' : '';
  const minOrder = Number(settings.minOrder || 0);

  const stored = readCustomer();
  const [mode, setMode] = useState(allowDelivery ? 'delivery' : 'pickup');
  const [name, setName] = useState(stored.name || '');
  // Lista de clientes da loja: só com a caixa marcada (opt-in, LGPD). Desmarcada por padrão.
  const [optIn, setOptIn] = useState(false);
  // Cartão fidelidade (consentimento separado). Vem marcado só se o próprio
  // cliente já participou DESTA loja antes neste aparelho (lista por slug).
  const loyaltyStores = Array.isArray(stored.loyaltyStores) ? stored.loyaltyStores : [];
  const loyaltyRule = settings.loyalty?.enabled && String(settings.loyalty.reward || '').trim() ? settings.loyalty : null;
  const [loyaltyIn, setLoyaltyIn] = useState(loyaltyStores.includes(data.slug));
  const [card, setCard] = useState(null); // progresso do cartão devolvido pelo servidor
  const wantsPhone = optIn || (loyaltyRule && loyaltyIn);
  const [phone, setPhone] = useState(stored.phone || '');
  const [address, setAddress] = useState(stored.address || '');
  const [zoneId, setZoneId] = useState(stored.zoneId || '');
  const [payment, setPayment] = useState(methods[0]);
  const [changeFor, setChangeFor] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null); // { ref, total, pixPayload } do último pedido
  const [pixCopied, setPixCopied] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponCode, setCouponCode] = useState(''); // cupom aplicado

  if (!cart.enabled) return null;

  // Cliente na mesa (QR/tag da mesa): consumo no local, sem entrega nem endereço.
  const tableMode = Boolean(cart.table);
  const effectiveMode = tableMode ? 'table'
    : mode === 'delivery' && !allowDelivery ? 'pickup' : mode === 'pickup' && !allowPickup ? 'delivery' : mode;
  // Cupom: recalculado a cada mudança no carrinho (pode deixar de valer se o subtotal cair).
  const couponResult = couponCode ? applyCoupon(settings.coupons, couponCode, cart.subtotal) : null;
  const discount = couponResult?.discount || 0;
  // Entrega: taxa única ou do bairro escolhido; frete grátis sobre o valor já com desconto.
  const quote = deliveryQuote(settings, zoneId, cart.subtotal - discount);
  const fee = effectiveMode === 'delivery' ? quote.fee : 0;
  const total = cart.subtotal - discount + fee;
  // "Peça também": produtos marcados como sugestão que ainda não estão no carrinho.
  const visibleCats = new Set((data.categories || []).filter(c => c.isVisible !== false).map(c => String(c._id)));
  const suggestions = (data.products || [])
    .filter(p => p.upsell && p.isVisible !== false && !p.soldOut && !validateSelection(p, []) && (!p.categoryId || visibleCats.has(String(p.categoryId))) && cart.qtyOf(p._id) === 0)
    .slice(0, 3);
  const applyTyped = () => {
    const r = applyCoupon(settings.coupons, couponInput, cart.subtotal);
    if (r.error) { setError(r.error); return; }
    setError('');
    setCouponCode(r.coupon.code);
  };
  const belowMin = minOrder > 0 && cart.subtotal < minOrder;

  // Horário de funcionamento: fora dele, o pedido não é enviado.
  const hoursStatus = openStatus(data.businessHours);
  const closed = hoursStatus.configured && !hoursStatus.open;

  const handleSend = () => {
    setError('');
    if (closed) return setError(`Estamos fechados agora. ${hoursStatus.label}.`);
    if (cart.lines.length === 0) return setError('Seu carrinho está vazio.');
    if (belowMin) return setError(`Pedido mínimo de ${centsToBRL(minOrder)}.`);
    if (!tableMode && !name.trim()) return setError('Informe seu nome.');
    if (wantsPhone && phone.replace(/\D/g, '').length < 10) return setError('Informe seu WhatsApp com DDD.');
    if (effectiveMode === 'delivery' && quote.needsZone) return setError('Escolha o seu bairro.');
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
      couponCode: discount > 0 ? couponCode : '',
      discount,
      total,
      mode: effectiveMode,
      table: cart.table,
      customerName: name.trim(),
      customerAddress: address.trim(),
      deliveryZone: effectiveMode === 'delivery' ? quote.zone?.name || '' : '',
      payment,
      changeFor: change,
      notes
    });
    const joinLoyalty = Boolean(loyaltyRule && loyaltyIn);
    saveCustomer({ name: name.trim(), address: address.trim(), zoneId, phone: wantsPhone ? phone.trim() : stored.phone || '', loyaltyStores: !loyaltyRule ? loyaltyStores : joinLoyalty ? [...new Set([...loyaltyStores, data.slug])].slice(-50) : loyaltyStores.filter(s => s !== data.slug) });
    setCard(null);
    if (wantsPhone && !data._preview && data.slug) {
      // Não bloqueia nem falha o pedido: ele já vai para o WhatsApp. Com
      // fidelidade, a resposta traz o progresso do cartão para a tela final.
      api.post('/customers', { slug: data.slug, name: name.trim(), phone: phone.trim(), consent: optIn, loyalty: joinLoyalty, total })
        .then(res => { if (res.data?.loyalty) setCard(res.data.loyalty); })
        .catch(() => {});
    }
    track(data, 'order', {
      value: total,
      items: cart.lines.map(l => ({ productId: String(l.productId), name: l.optionsText ? `${l.product.name} (${l.optionsText})` : l.product.name, qty: l.qty, price: l.unitPrice }))
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
    setCard(null);
    setCouponCode('');
    setCouponInput('');
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
                {card && (
                  <div className="border rounded-xl p-4 space-y-2 bg-amber-50 border-amber-200 text-left">
                    {card.earned ? (
                      <>
                        <p className="font-bold text-gray-900 text-center">🎉 Você completou o cartão fidelidade!</p>
                        <p className="text-sm text-gray-700 text-center">Seu prêmio: <strong>{card.reward}</strong></p>
                        <a
                          href={buildWhatsappLink(data.whatsapp, `Olá! Completei o cartão fidelidade e ganhei: ${card.reward}${order?.ref ? ` (pedido #${order.ref})` : ''}.`)}
                          target="_blank" rel="noopener noreferrer" data-track="loyalty_claim"
                          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl font-semibold" style={buttonStyle}
                        >
                          <Gift className="w-4 h-4" /> Avisar a loja que ganhei
                        </a>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-gray-900 flex items-center gap-1.5"><Gift className="w-4 h-4 text-amber-600" /> Cartão fidelidade · {card.stamps} de {card.goal}</p>
                        <div className="flex flex-wrap gap-1.5" aria-hidden="true">
                          {Array.from({ length: card.goal }, (_, i) => (
                            <span key={i} className={`w-5 h-5 rounded-full border-2 ${i < card.stamps ? 'bg-amber-500 border-amber-500' : 'border-amber-300 bg-white'}`} />
                          ))}
                        </div>
                        <p className="text-sm text-gray-700">Faltam <strong>{card.goal - card.stamps}</strong> pedido(s) para ganhar <strong>{card.reward}</strong>.</p>
                        {card.pending
                          ? <p className="text-xs text-gray-600">O selo deste pedido entra no cartão assim que a loja confirmar que recebeu o pedido.</p>
                          : !card.stamped && <p className="text-xs text-gray-500">Este pedido não somou selo.</p>}
                      </>
                    )}
                    {card.rewardsPending > (card.earned ? 1 : 0) && (
                      <p className="text-xs text-amber-800">Você tem {card.rewardsPending} prêmio(s) para retirar. É só avisar a loja.</p>
                    )}
                  </div>
                )}
                {reviewUrl && (
                  <div className="border rounded-xl p-4 space-y-2 bg-amber-50 border-amber-200">
                    <div className="flex justify-center gap-1 text-amber-400" aria-hidden="true">
                      {[0, 1, 2, 3, 4].map(i => <Star key={i} className="w-6 h-6" fill="currentColor" />)}
                    </div>
                    <p className="font-semibold text-gray-900">Gostou do atendimento?</p>
                    <p className="text-sm text-gray-600">Avaliar {data.name ? <strong>{data.name}</strong> : 'a loja'} no Google leva menos de 1 minuto e ajuda muito quem trabalha aqui.</p>
                    <a
                      href={reviewUrl} target="_blank" rel="noopener noreferrer" data-track="review_after_order"
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-xl font-semibold bg-white border border-amber-300 text-gray-900 hover:bg-amber-100"
                    >
                      <Star className="w-4 h-4 text-amber-500" fill="currentColor" /> Avaliar no Google
                    </a>
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
                      <li key={l.key} className="py-3 flex items-center gap-3">
                        <div className="flex-grow min-w-0">
                          <p className="font-medium truncate">{l.product.name}</p>
                          {l.optionsText && <p className="text-xs text-gray-500">{l.optionsText}</p>}
                          <p className="text-sm text-gray-500">{centsToBRL(l.unitPrice)} cada</p>
                        </div>
                        <QtyControl qty={l.qty} onChange={(q) => cart.setQty(l.key, q)} buttonStyle={buttonStyle} size="sm" />
                        <button onClick={() => cart.setQty(l.key, 0)} className="p-1 text-gray-400 hover:text-red-500" aria-label="Remover">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Mesa (consumo no local) ou entrega/retirada */}
                {tableMode && (
                  <div className="p-3 rounded-xl text-center font-semibold" style={buttonStyle}>
                    🍽️ Mesa {cart.table} · consumo no local
                  </div>
                )}
                {!tableMode && allowPickup && allowDelivery && (
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
                {!tableMode && !(allowPickup && allowDelivery) && (
                  <p className="text-sm text-gray-600">{effectiveMode === 'delivery' ? 'Somente entrega.' : 'Somente retirada no local.'}</p>
                )}

                <div className="space-y-3">
                  <input
                    value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
                    placeholder={tableMode ? 'Seu nome (opcional)' : 'Seu nome'}
                    className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-gray-300"
                  />
                  {loyaltyRule && (
                    <label className="flex items-start gap-2 text-sm text-gray-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <input type="checkbox" checked={loyaltyIn} onChange={(e) => setLoyaltyIn(e.target.checked)} className="w-4 h-4 mt-0.5" />
                      <span><Gift className="inline w-4 h-4 text-amber-600 -mt-0.5" /> <strong>Cartão fidelidade:</strong> a cada {loyaltyRule.goal} pedidos, ganhe <strong>{loyaltyRule.reward}</strong>. Quero participar.</span>
                    </label>
                  )}
                  <label className="flex items-start gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} className="w-4 h-4 mt-0.5" />
                    <span>Quero receber novidades e promoções{data.name ? <> de <strong>{data.name}</strong></> : ''} pelo WhatsApp.</span>
                  </label>
                  {wantsPhone && (
                    <div>
                      <input
                        value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20}
                        type="tel" inputMode="tel" autoComplete="tel" placeholder="Seu WhatsApp com DDD"
                        className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-gray-300"
                      />
                      <p className="text-xs text-gray-500 mt-1">A loja guarda seu nome e WhatsApp só para o que você marcou acima. Peça a remoção quando quiser. <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="underline">Privacidade</a></p>
                    </div>
                  )}
                  {effectiveMode === 'delivery' && zones.length > 0 && (
                    <select
                      value={quote.zone ? String(quote.zone._id) : ''} onChange={(e) => setZoneId(e.target.value)}
                      aria-label="Bairro"
                      className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-gray-300 bg-white"
                    >
                      <option value="">Escolha o seu bairro</option>
                      {zones.map(z => (
                        <option key={z._id} value={String(z._id)}>{z.name} · {z.fee > 0 ? centsToBRL(z.fee) : 'grátis'}</option>
                      ))}
                    </select>
                  )}
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

                {/* Peça também */}
                {cart.lines.length > 0 && suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Peça também</p>
                    {suggestions.map(p => (
                      <div key={p._id} className="flex items-center gap-3 border rounded-xl p-2">
                        {p.image ? <img src={p.image} alt="" className="w-12 h-12 rounded-lg object-cover" /> : <div className="w-12 h-12 rounded-lg bg-gray-100" />}
                        <div className="flex-grow min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-sm text-gray-600">{centsToBRL(p.price)}</p>
                        </div>
                        <button type="button" onClick={() => cart.add(p._id)} className="px-3 py-1.5 rounded-full text-sm font-semibold" style={buttonStyle} aria-label={`Adicionar ${p.name} sugerido`}>+ Adicionar</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cupom */}
                {(settings.coupons || []).some(c => c.active !== false) && (
                  couponCode && discount > 0 ? (
                    <div className="flex items-center justify-between text-sm bg-green-50 border border-green-200 text-green-800 rounded-xl px-3 py-2">
                      <span>Cupom <strong>{couponCode}</strong> aplicado: -{centsToBRL(discount)}</span>
                      <button type="button" onClick={() => { setCouponCode(''); setCouponInput(''); }} className="underline">remover</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Cupom de desconto" maxLength={20}
                        className="flex-grow px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-gray-300 uppercase" />
                      <button type="button" onClick={applyTyped} className="px-4 py-2 rounded-xl border font-medium text-gray-700">Aplicar</button>
                    </div>
                  )
                )}
                {couponCode && couponResult?.error && <p className="text-xs text-amber-700">{couponResult.error}</p>}

                {/* Totais */}
                <div className="space-y-1 text-sm border-t pt-4">
                  <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{centsToBRL(cart.subtotal)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-green-700"><span>Cupom {couponCode}</span><span>-{centsToBRL(discount)}</span></div>}
                  {effectiveMode === 'delivery' && (
                    <div className="flex justify-between"><span className="text-gray-600">Entrega{quote.zone ? ` · ${quote.zone.name}` : ''}</span><span>{quote.needsZone ? 'escolha o bairro' : fee > 0 ? centsToBRL(fee) : 'Grátis'}</span></div>
                  )}
                  {effectiveMode === 'delivery' && quote.missingForFree > 0 && (
                    <p className="text-xs text-green-700">Faltam {centsToBRL(quote.missingForFree)} para ganhar frete grátis.</p>
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
