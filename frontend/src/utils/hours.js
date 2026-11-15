// Horário de funcionamento (horário de Brasília).
// days: [{ day: 0-6 (0 = domingo), open, start: 'HH:MM', end: 'HH:MM' }]
// end <= start = vira a noite (ex.: 18:00 às 02:00 fecha no dia seguinte).

export const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const toMin = (hhmm) => {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return h * 60 + m;
};

// Dia da semana e minuto do dia agora, em Brasília.
function nowInBrazil(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const get = (t) => parts.find(p => p.type === t)?.value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, minute: Number(get('hour')) * 60 + Number(get('minute')) };
}

const byDay = (days) => {
  const map = new Map();
  for (const d of days || []) map.set(Number(d.day), d);
  return map;
};

// Intervalo [início, fim) em minutos a partir do início do dia.
function interval(entry) {
  const s = toMin(entry.start);
  let e = toMin(entry.end);
  if (e <= s) e += 24 * 60; // vira a noite
  return [s, e];
}

// { configured, open, label } — label pronto para exibir.
export function openStatus(hours, date = new Date()) {
  if (!hours?.enabled || !Array.isArray(hours.days) || hours.days.length === 0) {
    return { configured: false, open: true, label: '' };
  }
  const map = byDay(hours.days);
  const { day, minute } = nowInBrazil(date);

  // Aberto pelo turno de hoje ou pelo de ontem que atravessou a meia-noite.
  const today = map.get(day);
  if (today?.open) {
    const [s, e] = interval(today);
    if (minute >= s && minute < e) return { configured: true, open: true, label: `Aberto agora · fecha às ${today.end}` };
  }
  const yesterday = map.get((day + 6) % 7);
  if (yesterday?.open) {
    const [s, e] = interval(yesterday);
    if (e > 24 * 60 && minute + 24 * 60 >= s && minute + 24 * 60 < e) {
      return { configured: true, open: true, label: `Aberto agora · fecha às ${yesterday.end}` };
    }
  }

  // Próxima abertura (hoje mais tarde ou nos próximos 7 dias).
  for (let i = 0; i < 7; i++) {
    const d = (day + i) % 7;
    const entry = map.get(d);
    if (!entry?.open) continue;
    const [s] = interval(entry);
    if (i === 0 && s <= minute) continue;
    const when = i === 0 ? 'hoje' : i === 1 ? 'amanhã' : SHORT[d];
    return { configured: true, open: false, label: `Fechado · abre ${when} às ${entry.start}` };
  }
  return { configured: true, open: false, label: 'Fechado no momento' };
}
