// Set a nested value (e.g. "pet.owner.whatsapp") immutably.
export function setDeep(obj, path, value) {
  const keys = path.split('.');
  const next = Array.isArray(obj) ? [...obj] : { ...(obj || {}) };
  let cur = next;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] = cur[k] && typeof cur[k] === 'object' ? { ...cur[k] } : {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return next;
}

export function getDeep(obj, path, fallback = '') {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj) ?? fallback;
}

// Preço é armazenado em CENTAVOS (Number). Helpers de conversão pra UI:
// 2500 -> "R$ 25,00" / "25,00" -> 2500
export function centsToBRL(cents) {
  const n = Number(cents || 0) / 100;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function centsToInput(cents) {
  const n = Number(cents || 0) / 100;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// User digita qualquer coisa; só extraímos os dígitos e dividimos por 100.
// Ex: "R$ 25,00" -> "2500" -> 2500 centavos
export function inputToCents(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits === '' ? 0 : parseInt(digits, 10);
}
