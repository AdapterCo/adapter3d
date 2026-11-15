// Link direto de produto: /<slug>?p=<id>. Abre o perfil com o produto já aberto
// e, colado no WhatsApp/Instagram, mostra a prévia do produto (rota /api/og).

export const productUrl = (slug, productId) => `${window.location.origin}/${slug}?p=${encodeURIComponent(productId)}`;

export function readProductParam() {
  try { return new URLSearchParams(window.location.search).get('p') || null; } catch { return null; }
}

// Mantém ?p= na barra de endereço enquanto o produto está aberto (preserva
// outros parâmetros, como ?mesa=). Não cria entradas no histórico.
export function setProductParam(productId) {
  try {
    const url = new URL(window.location.href);
    if (productId) url.searchParams.set('p', productId);
    else url.searchParams.delete('p');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  } catch { /* ambiente sem history */ }
}

// Compartilhar: menu nativo do celular ou copiar o link.
export async function shareProduct({ slug, product, storeName }) {
  const url = productUrl(slug, product._id);
  const title = storeName ? `${product.name} · ${storeName}` : product.name;
  if (navigator.share) {
    try { await navigator.share({ title, url }); return 'shared'; } catch (e) { if (e?.name === 'AbortError') return 'cancelled'; }
  }
  try { await navigator.clipboard.writeText(url); return 'copied'; } catch { window.prompt('Copie o link do produto:', url); return 'prompted'; }
}
