import { useEffect, useMemo, useState } from 'react';
import { track } from '../services/track';
import { lineKey, optionsLabel, unitPrice, validateSelection } from '../utils/productOptions';

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

// Número da mesa válido (1..mesas configuradas) ou null. Só com o recurso ligado.
function readTable(key, settings) {
  if (!settings.tableService) return null;
  const max = Number(settings.tables) || 200;
  const valid = (v) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= max ? n : null;
  };
  try {
    const fromUrl = valid(new URLSearchParams(window.location.search).get('mesa'));
    if (fromUrl) {
      sessionStorage.setItem(key, String(fromUrl));
      return fromUrl;
    }
    return valid(sessionStorage.getItem(key));
  } catch {
    return null;
  }
}

// Carrinho do visitante, salvo no navegador por perfil (cart:<slug>).
// Guarda só { productId, qty, options? }: nome e preço vêm sempre do cardápio atual,
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

  // Pedido na mesa: ?mesa=N (QR/tag da mesa). Fica guardado na sessão do
  // navegador para não se perder se o cliente recarregar a página.
  const [table] = useState(() => readTable(`mesa:${data.slug || 'preview'}`, settings));

  const productsById = useMemo(() => {
    const visibleCats = new Set((data.categories || []).filter(c => c.isVisible !== false).map(c => String(c._id)));
    const map = new Map();
    for (const p of data.products || []) {
      if (p.isVisible === false || p.soldOut) continue;
      if (p.categoryId && !visibleCats.has(String(p.categoryId))) continue;
      map.set(String(p._id), p);
    }
    return map;
  }, [data.products, data.categories]);

  const lines = items
    .map(i => {
      const product = productsById.get(String(i.productId));
      if (!product) return null;
      const options = (i.options || []).map(String);
      // Opção removida pelo lojista ou escolha que deixou de valer: a linha sai.
      if (validateSelection(product, options)) return null;
      return {
        ...i,
        key: lineKey(i.productId, options),
        options,
        product,
        optionsText: optionsLabel(product, options),
        unitPrice: unitPrice(product, options)
      };
    })
    .filter(Boolean);

  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

  const keyOf = (i) => lineKey(i.productId, i.options || []);

  // Quantidade de uma linha (key = id do produto quando ele não tem opções).
  const setQty = (key, qty) => {
    const k = String(key);
    const q = Math.max(0, Math.min(MAX_QTY, Math.floor(qty)));
    const current = items.find(i => keyOf(i) === k);
    const delta = q - (current?.qty || 0);
    if (delta > 0) track(data, 'add_to_cart', { target: String(current?.productId || k.split('|')[0]), value: delta });
    setItems(prev => {
      if (q === 0) return prev.filter(i => keyOf(i) !== k);
      return prev.some(i => keyOf(i) === k)
        ? prev.map(i => (keyOf(i) === k ? { ...i, qty: q } : i))
        : prev;
    });
  };

  // Total do produto no carrinho, somando todas as variações.
  const qtyOf = (productId) => items
    .filter(i => String(i.productId) === String(productId))
    .reduce((s, i) => s + i.qty, 0);

  const add = (productId, n = 1, options = []) => {
    const id = String(productId);
    const opts = (options || []).map(String);
    const k = lineKey(id, opts);
    track(data, 'add_to_cart', { target: id, value: n });
    setItems(prev => (prev.some(i => keyOf(i) === k)
      ? prev.map(i => (keyOf(i) === k ? { ...i, qty: Math.min(MAX_QTY, i.qty + n) } : i))
      : [...prev, opts.length ? { productId: id, qty: Math.min(MAX_QTY, n), options: opts } : { productId: id, qty: Math.min(MAX_QTY, n) }]));
  };
  const clear = () => setItems([]);

  return { enabled, settings, table, lines, count, subtotal, add, setQty, qtyOf, clear };
}
