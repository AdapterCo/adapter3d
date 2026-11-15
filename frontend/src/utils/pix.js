// Pix copia e cola com valor (BR Code estático, padrão EMV do Banco Central).
// Gera o texto que o cliente cola no app do banco, já com chave, valor e
// identificador do pedido. O QR Code é esse mesmo texto.

const strip = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').trim();

// Campo EMV: ID (2 dígitos) + tamanho (2 dígitos) + valor.
const field = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`;

// CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), exigido no campo 63.
export function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// key: chave Pix (CPF/CNPJ, e-mail, telefone +55..., ou aleatória)
// amount: valor em CENTAVOS
// txid: identificador do pedido (até 25 letras/números)
export function buildPixPayload({ key, name, city, amount, txid }) {
  const merchant = field('00', 'br.gov.bcb.pix') + field('01', String(key).trim());
  const value = (Number(amount || 0) / 100).toFixed(2);
  const ref = strip(txid).replace(/ /g, '').slice(0, 25) || '***';
  const body =
    field('00', '01') +
    field('26', merchant) +
    field('52', '0000') +
    field('53', '986') +
    (Number(amount) > 0 ? field('54', value) : '') +
    field('58', 'BR') +
    field('59', (strip(name) || 'RECEBEDOR').slice(0, 25)) +
    field('60', (strip(city) || 'BRASIL').slice(0, 15)) +
    field('62', field('05', ref)) +
    '6304';
  return body + crc16(body);
}

// Normaliza a chave sem adivinhar o tipo (um CPF de 11 dígitos pode parecer
// celular, por isso celular precisa ser digitado com +55):
//   e-mail -> minúsculas; +55... -> + e dígitos; chave aleatória -> minúsculas;
//   resto (CPF/CNPJ com pontuação) -> só dígitos.
export function normalizePixKey(raw) {
  const k = String(raw || '').trim();
  if (!k) return '';
  if (k.includes('@')) return k.toLowerCase();
  if (k.startsWith('+')) return `+${k.replace(/\D/g, '')}`;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)) return k.toLowerCase();
  return k.replace(/\D/g, '');
}
