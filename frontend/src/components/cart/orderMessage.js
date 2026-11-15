import { centsToBRL } from '../admin/utils';

export const PAYMENT_LABEL = {
  pix: 'Pix',
  card: 'Cartão (na entrega/retirada)',
  cash: 'Dinheiro'
};

// Monta o texto do pedido enviado ao WhatsApp do lojista.
// Asteriscos = negrito no WhatsApp.
export function buildOrderMessage({
  orderRef, storeName, lines, subtotal, deliveryFee, total,
  mode, table, couponCode, discount, customerName, customerAddress, payment, changeFor, notes
}) {
  const out = [];
  out.push(`*Novo pedido${orderRef ? ` #${orderRef}` : ''}${storeName ? ` - ${storeName}` : ''}*`);
  // Pedido na mesa: número da mesa em destaque logo no topo.
  if (mode === 'table' && table) out.push(`*🍽️ MESA ${table}* · consumo no local`);
  out.push('');
  for (const l of lines) {
    const price = l.unitPrice ?? l.product.price;
    out.push(`${l.qty}x ${l.product.name} - ${centsToBRL(l.qty * price)}`);
    if (l.optionsText) out.push(`   ↳ ${l.optionsText}`);
  }
  out.push('');
  out.push(`Subtotal: ${centsToBRL(subtotal)}`);
  if (discount > 0) out.push(`Cupom ${couponCode}: -${centsToBRL(discount)}`);
  if (mode === 'delivery') {
    out.push(`Entrega: ${deliveryFee > 0 ? centsToBRL(deliveryFee) : 'grátis'}`);
  }
  out.push(`*Total: ${centsToBRL(total)}*`);
  out.push('');
  if (customerName) out.push(`*Cliente:* ${customerName}`);
  if (mode === 'delivery') {
    out.push(`*Entregar em:* ${customerAddress}`);
  } else if (mode === 'table') {
    out.push(`*Mesa:* ${table}`);
  } else {
    out.push('*Retirada no local*');
  }
  if (payment) {
    let p = PAYMENT_LABEL[payment] || payment;
    if (payment === 'cash' && changeFor > 0) p += ` (troco para ${centsToBRL(changeFor)})`;
    out.push(`*Pagamento:* ${p}`);
  }
  if (notes && notes.trim()) {
    out.push(`*Observações:* ${notes.trim()}`);
  }
  return out.join('\n');
}
