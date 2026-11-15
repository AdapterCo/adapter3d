// Cupons de desconto do carrinho. O desconto é calculado sobre o subtotal dos
// produtos (sem a taxa de entrega) e nunca passa do subtotal.

export const normalizeCode = (code) => String(code || '').trim().toUpperCase().replace(/\s+/g, '');

// Retorna { coupon, discount } ou { error } para o código digitado.
export function applyCoupon(coupons, code, subtotal) {
  const wanted = normalizeCode(code);
  if (!wanted) return { error: 'Digite o código do cupom.' };
  const coupon = (coupons || []).find(c => c.active !== false && normalizeCode(c.code) === wanted);
  if (!coupon) return { error: 'Cupom inválido ou expirado.' };
  const min = Number(coupon.minOrder || 0);
  if (min > 0 && subtotal < min) {
    return { error: `Este cupom vale para pedidos a partir de ${(min / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.` };
  }
  const raw = coupon.type === 'fixed'
    ? Number(coupon.value || 0)
    : Math.round(subtotal * Math.min(100, Number(coupon.value || 0)) / 100);
  return { coupon, discount: Math.max(0, Math.min(subtotal, raw)) };
}

export const couponLabel = (c) => (c.type === 'fixed'
  ? `${(Number(c.value || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de desconto`
  : `${Number(c.value || 0)}% de desconto`);
