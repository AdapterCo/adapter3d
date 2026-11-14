// Regras de validação compartilhadas entre cadastro (authController) e
// atualização de perfil (userController).

const RESERVED_SLUGS = new Set(['admin', 'register', 'tag', 'api', 'login', 'uploads', 'auth']);
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// Collation case-insensitive: encontra "Joao@X.com" ao buscar "joao@x.com".
// Necessário porque contas antigas podem ter email salvo com maiúsculas.
const EMAIL_COLLATION = { locale: 'en', strength: 2 };

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return EMAIL_REGEX.test(email) && email.length <= 254;
}

function normalizeSlug(slug) {
  return String(slug || '').trim().toLowerCase();
}

function isValidSlug(slug) {
  return SLUG_REGEX.test(slug) && !RESERVED_SLUGS.has(slug);
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  EMAIL_COLLATION,
  normalizeEmail,
  isValidEmail,
  normalizeSlug,
  isValidSlug
};
