// Extrai coordenadas de um link do Google Maps e sugere um endereço legível.
//
// O link curto (maps.app.goo.gl/...) redireciona para
//   https://www.google.com/maps/place/NOME/@-22.90,-43.57,17z/data=...!3d-22.9020055!4d-43.5733483...
// onde !3d/!4d é o ponto exato do estabelecimento e @lat,lng o centro do mapa.

const TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 5;

// Só seguimos redirecionamentos para domínios do Google: a URL vem do usuário,
// e sem essa trava o servidor poderia ser usado para acessar endereços internos.
function isGoogleHost(hostname) {
  const h = hostname.toLowerCase();
  return h === 'maps.app.goo.gl'
    || h === 'goo.gl'
    || h === 'g.co'
    || h === 'g.page'
    || /^([a-z0-9-]+\.)*google\.(com|com\.br)$/.test(h);
}

function parseCoordinates(url) {
  const exact = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const center = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const query = url.match(/[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const m = exact || center || query;
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

// Segue os redirects (só Google) até achar coordenadas na URL. Retorna null se não achar.
async function resolveCoordinates(mapsUrl) {
  let current;
  try {
    current = new URL(mapsUrl);
  } catch {
    return null;
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (current.protocol !== 'https:' && current.protocol !== 'http:') return null;
    if (!isGoogleHost(current.hostname)) return null;

    const coords = parseCoordinates(decodeURIComponent(current.href));
    if (coords) return coords;

    let res;
    try {
      res = await fetch(current.href, {
        redirect: 'manual',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AdapterCards/1.0)' },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
    } catch {
      return null;
    }
    const location = res.headers.get('location');
    if (!location || res.status < 300 || res.status >= 400) return null;
    current = new URL(location, current);
  }
  return null;
}

// Endereço sugerido via OpenStreetMap (Nominatim). Melhor esforço: em qualquer
// falha devolve '' e o lojista digita o endereço manualmente.
async function reverseGeocode({ lat, lng }) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=pt-BR&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AdapterCards/1.0' },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!res.ok) return '';
    const data = await res.json();
    const a = data?.address || {};
    const street = [a.road || a.pedestrian || a.footway, a.house_number].filter(Boolean).join(', ');
    const district = a.suburb || a.neighbourhood || a.quarter || a.city_district || '';
    const city = a.city || a.town || a.village || a.municipality || '';
    const uf = (a['ISO3166-2-lvl4'] || '').replace(/^BR-/, '') || a.state || '';
    const left = [street, district].filter(Boolean).join(' - ');
    const right = [city, uf].filter(Boolean).join(' - ');
    return [left, right].filter(Boolean).join(', ').slice(0, 200);
  } catch {
    return '';
  }
}

module.exports = { resolveCoordinates, reverseGeocode, parseCoordinates, isGoogleHost };
