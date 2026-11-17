const crypto = require('crypto');

// Proteção das rotas /api/admin/* por chave estática (X-Admin-Key).
//
// - Comparação em tempo constante (hash SHA-256 dos dois lados, mesmo tamanho).
// - Só as tentativas ERRADAS contam: depois de MAX_FAILS erros do mesmo IP na
//   janela, aquele IP fica bloqueado até a janela acabar, mesmo com a chave
//   certa. O painel de gestão (chave certa) nunca é limitado no uso normal.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 10;
const fails = new Map(); // ip -> { count, resetAt }

const sweep = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of fails) if (entry.resetAt <= now) fails.delete(ip);
}, WINDOW_MS);
sweep.unref();

const digest = (v) => crypto.createHash('sha256').update(String(v)).digest();

function keyMatches(provided) {
  const expected = process.env.ADMIN_KEY;
  if (!provided || !expected) return false;
  return crypto.timingSafeEqual(digest(provided), digest(expected));
}

module.exports = function adminAuth(req, res, next) {
  const now = Date.now();
  const ip = req.ip || 'unknown';
  let entry = fails.get(ip);
  if (entry && entry.resetAt <= now) { fails.delete(ip); entry = null; }

  if (entry && entry.count >= MAX_FAILS) {
    res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
    return res.status(429).json({ message: 'Muitas tentativas com chave inválida. Aguarde alguns minutos.' });
  }

  if (!keyMatches(req.header('X-Admin-Key'))) {
    if (!entry) { entry = { count: 0, resetAt: now + WINDOW_MS }; fails.set(ip, entry); }
    entry.count += 1;
    if (entry.count === MAX_FAILS) console.warn(`adminAuth: ${MAX_FAILS} tentativas com chave inválida de ${ip}; bloqueado por 15 min.`);
    return res.status(401).json({ message: 'Admin key inválida ou ausente.' });
  }
  next();
};
