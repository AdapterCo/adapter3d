import { Clock, Copy } from 'lucide-react';
import { DAY_NAMES } from '../../utils/hours';

const DEFAULT_DAYS = [0, 1, 2, 3, 4, 5, 6].map(day => ({ day, open: day !== 0, start: '08:00', end: '18:00' }));
// Exibe de segunda a domingo (mais natural para o lojista).
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function HoursTab({ data, setData }) {
  const hours = data.businessHours || {};
  const days = DEFAULT_DAYS.map(d => ({ ...d, ...((hours.days || []).find(x => Number(x.day) === d.day) || {}) }));

  const update = (patch) => setData(prev => ({ ...prev, businessHours: { enabled: false, days, ...(prev.businessHours || {}), ...patch } }));
  const setDay = (day, patch) => update({ days: days.map(d => (d.day === day ? { ...d, ...patch } : d)) });
  const copyToAll = (from) => {
    const src = days.find(d => d.day === from);
    update({ days: days.map(d => ({ ...d, open: src.open, start: src.start, end: src.end })) });
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2"><Clock className="w-5 h-5" /> Horário de funcionamento</h3>
      <p className="text-sm text-gray-500 -mt-2">
        Seu perfil mostra <strong>"Aberto agora"</strong> ou <strong>"Fechado · abre às..."</strong>, e fora do horário o carrinho
        não envia pedidos. Horário de Brasília. Para virar a noite, coloque o fechamento menor que a abertura (ex.: 18:00 às 02:00).
      </p>

      <label className="flex items-center gap-3">
        <input type="checkbox" checked={!!hours.enabled} onChange={() => update({ enabled: !hours.enabled })} className="w-5 h-5" />
        <span className="font-medium">Usar horário de funcionamento</span>
      </label>

      <div className={`space-y-2 ${hours.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
        {ORDER.map(dayNum => {
          const d = days.find(x => x.day === dayNum);
          return (
            <div key={dayNum} className="flex flex-wrap items-center gap-3 border rounded-lg px-3 py-2 bg-white">
              <label className="flex items-center gap-2 w-28">
                <input type="checkbox" checked={d.open} onChange={() => setDay(dayNum, { open: !d.open })} className="w-4 h-4" />
                <span className="text-sm font-medium">{DAY_NAMES[dayNum]}</span>
              </label>
              {d.open ? (
                <div className="flex items-center gap-2 text-sm">
                  <input type="time" value={d.start} onChange={(e) => setDay(dayNum, { start: e.target.value })} className="px-2 py-1 border rounded" required />
                  <span className="text-gray-500">às</span>
                  <input type="time" value={d.end} onChange={(e) => setDay(dayNum, { end: e.target.value })} className="px-2 py-1 border rounded" required />
                </div>
              ) : (
                <span className="text-sm text-gray-400">Fechado</span>
              )}
              <button type="button" onClick={() => copyToAll(dayNum)} className="ml-auto text-xs text-blue-600 inline-flex items-center gap-1 hover:underline" title="Aplicar este horário em todos os dias">
                <Copy className="w-3 h-3" /> copiar para todos
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500">Clique em <strong>Salvar</strong> no topo para aplicar.</p>
    </div>
  );
}
