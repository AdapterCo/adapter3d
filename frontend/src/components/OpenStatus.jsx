import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { openStatus } from '../utils/hours';

// Selo "Aberto agora · fecha às 22:00" / "Fechado · abre amanhã às 18:00".
// Atualiza sozinho a cada minuto. Não mostra nada sem horário configurado.
export default function OpenStatus({ hours }) {
  const [status, setStatus] = useState(() => openStatus(hours));

  useEffect(() => {
    const tick = () => setStatus(openStatus(hours));
    const id = setInterval(tick, 60 * 1000);
    tick();
    return () => clearInterval(id);
  }, [hours]);

  if (!status.configured) return null;
  return (
    <span className={`mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${status.open ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
      <Clock className="w-3.5 h-3.5" /> {status.label}
    </span>
  );
}
