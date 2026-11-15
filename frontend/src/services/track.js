// Envio de eventos de estatística dos perfis públicos.
// Usa navigator.sendBeacon (não se perde quando o visitante sai para o
// WhatsApp/Maps) com corpo text/plain, que não exige preflight de CORS.

const ENDPOINT = `${import.meta.env.VITE_API_URL || '/api'}/track`;
const VISITOR_KEY = 'av:visitor';

function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`).slice(0, 40);
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

// Não conta: preview do painel e o próprio dono logado visitando o perfil.
function shouldTrack(data) {
  if (!data || !data.slug || data._preview) return false;
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (localStorage.getItem('token') && user.slug === data.slug) return false;
  } catch { /* ignore */ }
  return true;
}

export function track(data, type, extra = {}) {
  if (!shouldTrack(data)) return;
  const body = JSON.stringify({ slug: data.slug, type, visitor: visitorId(), ...extra });
  try {
    const blob = new Blob([body], { type: 'text/plain' });
    if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, blob)) return;
  } catch { /* cai no fetch */ }
  fetch(ENDPOINT, { method: 'POST', body, headers: { 'Content-Type': 'text/plain' }, keepalive: true }).catch(() => {});
}

const HOST_TARGETS = [
  [/(^|\.)wa\.me$|whatsapp\.com$/, 'whatsapp'],
  [/instagram\.com$/, 'instagram'],
  [/facebook\.com$|fb\.com$/, 'facebook'],
  [/tiktok\.com$/, 'tiktok'],
  [/youtube\.com$|youtu\.be$/, 'youtube'],
  [/linkedin\.com$/, 'linkedin'],
  [/waze\.com$/, 'directions_waze'],
  [/uber\.com$/, 'directions_uber']
];

function classify(href) {
  if (href.startsWith('tel:')) return 'phone';
  let url;
  try { url = new URL(href, window.location.href); } catch { return null; }
  // Links internos (ex.: Política de Privacidade no rodapé) não contam como clique.
  if (url.origin === window.location.origin) return null;
  if (url.hostname === 'search.google.com' && url.pathname.includes('writereview')) return 'review';
  if (/google\.[a-z.]+$/.test(url.hostname) && url.pathname.startsWith('/maps')) return 'directions_maps';
  for (const [re, target] of HOST_TARGETS) if (re.test(url.hostname)) return target;
  if (url.protocol === 'http:' || url.protocol === 'https:') return 'link';
  return null;
}

// Handler único (onClickCapture na raiz do perfil): registra cliques em links
// e em elementos marcados com data-track="alvo".
export function trackClick(event, data) {
  const el = event.target.closest('[data-track], a[href]');
  if (!el) return;
  const explicit = el.getAttribute('data-track');
  const target = explicit || classify(el.getAttribute('href') || '');
  if (!target) return;
  const label = target === 'link' ? (el.textContent || '').trim().slice(0, 80) : '';
  track(data, 'click', { target, label });
}
