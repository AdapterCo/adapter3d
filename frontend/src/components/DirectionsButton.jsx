import { useState } from 'react';
import { Navigation, MapPin, X } from 'lucide-react';

function hasDirections(data) {
  const loc = data?.location;
  return data?.showDirectionsButton !== false
    && loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';
}

function buildLinks(data) {
  const { lat, lng } = data.location;
  const name = data.googleReview?.businessName || data.name || '';
  const address = data.address || '';
  const placeId = data.googleReview?.placeId;

  const maps = new URL('https://www.google.com/maps/dir/');
  maps.searchParams.set('api', '1');
  maps.searchParams.set('destination', `${lat},${lng}`);
  if (placeId) maps.searchParams.set('destination_place_id', placeId);

  const uber = new URL('https://m.uber.com/ul/');
  uber.searchParams.set('action', 'setPickup');
  uber.searchParams.set('pickup', 'my_location');
  uber.searchParams.set('dropoff[latitude]', String(lat));
  uber.searchParams.set('dropoff[longitude]', String(lng));
  if (name) uber.searchParams.set('dropoff[nickname]', name);
  if (address) uber.searchParams.set('dropoff[formatted_address]', address);

  // A 99 não tem link universal: o esquema taxis99:// abre o app se instalado.
  const n99 = new URLSearchParams({
    dropoff_latitude: String(lat),
    dropoff_longitude: String(lng),
    dropoff_title: name,
    dropoff_address: address
  });

  return {
    maps: maps.toString(),
    waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
    uber: uber.toString(),
    app99: `taxis99://call?${n99.toString()}`
  };
}

// Tenta abrir o app da 99; se em ~1,5s a página continuar visível (app não
// instalado ou desktop), leva para o site da 99.
function open99(deepLink) {
  let left = false;
  const onHide = () => { left = true; };
  document.addEventListener('visibilitychange', onHide, { once: true });
  window.location.href = deepLink;
  setTimeout(() => {
    document.removeEventListener('visibilitychange', onHide);
    if (!left && document.visibilityState === 'visible') {
      window.open('https://99app.com/', '_blank', 'noopener');
    }
  }, 1500);
}

export default function DirectionsButton({ data, buttonStyle, className = '' }) {
  const [open, setOpen] = useState(false);
  if (!hasDirections(data)) return null;
  const links = buildLinks(data);

  const optionClass = 'w-full flex items-center gap-3 p-4 rounded-xl border hover:bg-gray-50 font-medium text-gray-800';

  return (
    <>
      <button
        type="button" onClick={() => setOpen(true)}
        className={`w-full flex items-center justify-center p-4 rounded-xl shadow-sm hover:scale-[1.02] transition-all ${className}`}
        style={buttonStyle}
      >
        <Navigation className="w-5 h-5 mr-3" />
        <span className="font-medium">Como chegar</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl text-gray-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">Como chegar</h3>
                {data.address && (
                  <p className="text-sm text-gray-600 mt-1 flex items-start gap-1">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" /> {data.address}
                  </p>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-gray-100" aria-label="Fechar"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              <a href={links.maps} target="_blank" rel="noopener noreferrer" className={optionClass}>
                <span className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold">G</span> Google Maps
              </a>
              <a href={links.waze} target="_blank" rel="noopener noreferrer" className={optionClass}>
                <span className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-sm font-bold">W</span> Waze
              </a>
              <a href={links.uber} target="_blank" rel="noopener noreferrer" className={optionClass}>
                <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">Uber</span> Uber
              </a>
              <button type="button" data-track="directions_99" onClick={() => open99(links.app99)} className={optionClass}>
                <span className="w-8 h-8 rounded-full bg-yellow-300 text-black flex items-center justify-center text-sm font-bold">99</span> 99
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
