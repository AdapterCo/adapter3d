// Rate limiter em memória por IP (janela fixa). Suficiente para uma única
// instância do backend; se escalar para várias réplicas, trocar por Redis.
// Depende de `app.set('trust proxy', 1)` para req.ip ser o IP real (Traefik).

module.exports = function rateLimit({ windowMs, max, message }) {
  const hits = new Map(); // ip -> { count, resetAt }

  // Limpeza periódica para o Map não crescer indefinidamente.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(ip);
    }
  }, windowMs);
  sweep.unref();

  return function (req, res, next) {
    const now = Date.now();
    const ip = req.ip || 'unknown';
    let entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ message });
    }
    next();
  };
};
