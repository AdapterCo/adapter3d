// Regras de validação compartilhadas entre cadastro (authController) e
// atualização de perfil (userController).

const RESERVED_SLUGS = new Set(['admin', 'register', 'tag', 'api', 'login', 'uploads', 'auth', 'esqueci-senha', 'redefinir-senha', 'termos', 'privacidade', 'assinar', 'gestao']);
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

const onlyDigits = (v) => String(v || '').replace(/\D/g, '');

function isValidCpf(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

function isValidCnpj(cnpj) {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((s, w, i) => s + Number(cnpj[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

const isValidCpfCnpj = (v) => {
  const d = onlyDigits(v);
  return d.length === 11 ? isValidCpf(d) : d.length === 14 ? isValidCnpj(d) : false;
};

// Celular/telefone BR com DDD: 10 ou 11 dígitos (sem o 55).
function normalizeBrPhone(v) {
  let d = onlyDigits(v);
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  return d.length === 10 || d.length === 11 ? d : null;
}

const UFS = new Set(['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']);

// Endereço de entrega da tag. Retorna { value } normalizado ou { error }.
function validateShipping(s) {
  const t = (v, max) => String(v || '').trim().slice(0, max);
  const value = {
    postalCode: onlyDigits(s?.postalCode),
    street: t(s?.street, 120),
    number: t(s?.number, 20),
    complement: t(s?.complement, 80),
    district: t(s?.district, 80),
    city: t(s?.city, 80),
    state: t(s?.state, 2).toUpperCase()
  };
  if (value.postalCode.length !== 8) return { error: 'CEP inválido.' };
  if (!value.street || !value.number || !value.district || !value.city) return { error: 'Preencha o endereço completo para envio da tag.' };
  if (!UFS.has(value.state)) return { error: 'UF inválida.' };
  return { value };
}

module.exports = {
  onlyDigits,
  isValidCpfCnpj,
  normalizeBrPhone,
  validateShipping,
  MIN_PASSWORD_LENGTH,
  EMAIL_COLLATION,
  normalizeEmail,
  isValidEmail,
  normalizeSlug,
  isValidSlug
};
