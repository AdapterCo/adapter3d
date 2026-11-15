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
  mode, customerName, customerAddress, payment, changeFor, notes
}) {
  const out = [];
  out.push(`*Novo pedido${orderRef ? ` #${orderRef}` : ''}${storeName ? ` - ${storeName}` : ''}*`);
  out.push('');
  for (const l of lines) {
    out.push(`${l.qty}x ${l.product.name} - ${centsToBRL(l.qty * l.product.price)}`);
  }
  out.push('');
  out.push(`Subtotal: ${centsToBRL(subtotal)}`);
  if (mode === 'delivery') {
    out.push(`Entrega: ${deliveryFee > 0 ? centsToBRL(deliveryFee) : 'grátis'}`);
  }
  out.push(`*Total: ${centsToBRL(total)}*`);
  out.push('');
  out.push(`*Cliente:* ${customerName}`);
  if (mode === 'delivery') {
    out.push(`*Entregar em:* ${customerAddress}`);
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
