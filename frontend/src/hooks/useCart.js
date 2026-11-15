import { useEffect, useMemo, useState } from 'react';
import { track } from '../services/track';

const MAX_QTY = 99;

function readStored(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(i => i && i.productId && i.qty > 0) : [];
  } catch {
    return [];
  }
}

// Carrinho do visitante, salvo no navegador por perfil (cart:<slug>).
// Guarda só { productId, qty }: nome e preço vêm sempre do cardápio atual,
// então mudanças de preço ou produtos ocultados refletem na hora.
export default function useCart(data) {
  const key = `cart:${data.slug || 'preview'}`;
  const [items, setItems] = useState(() => readStored(key));

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(items)); } catch { /* modo privado etc. */ }
  }, [key, items]);

  const settings = data.orderSettings || {};
  const enabled = settings.enabled !== false
    && !!data.whatsapp
    && (settings.pickup !== false || settings.delivery !== false);

  const productsById = useMemo(() => {
    const visibleCats = new Set((data.categories || []).filter(c => c.isVisible !== false).map(c => String(c._id)));
    const map = new Map();
    for (const p of data.products || []) {
      if (p.isVisible === false) continue;
      if (p.categoryId && !visibleCats.has(String(p.categoryId))) continue;
      map.set(String(p._id), p);
    }
    return map;
  }, [data.products, data.categories]);

  const lines = items
    .map(i => ({ ...i, product: productsById.get(String(i.productId)) }))
    .filter(l => l.product);

  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.qty * (l.product.price || 0), 0);

  const setQty = (productId, qty) => {
    const id = String(productId);
    const q = Math.max(0, Math.min(MAX_QTY, Math.floor(qty)));
    const delta = q - qtyOf(id);
    if (delta > 0) track(data, 'add_to_cart', { target: id, value: delta });
    setItems(prev => {
      const rest = prev.filter(i => String(i.productId) !== id);
      if (q === 0) return rest;
      const existing = prev.find(i => String(i.productId) === id);
      return existing
        ? prev.map(i => (String(i.productId) === id ? { ...i, qty: q } : i))
        : [...rest, { productId: id, qty: q }];
    });
  };

  const qtyOf = (productId) => items.find(i => String(i.productId) === String(productId))?.qty || 0;
  const add = (productId, n = 1) => setQty(productId, qtyOf(productId) + n);
  const clear = () => setItems([]);

  return { enabled, settings, lines, count, subtotal, add, setQty, qtyOf, clear };
}
