const nodemailer = require('nodemailer');

// Envio de e-mails transacionais (recuperação de senha).
//
// Variáveis (mesmo padrão das outras aplicações):
//   SMTP_HOST, SMTP_PORT, SMTP_SECURE (true/false), SMTP_USER, SMTP_PASSWORD, EMAIL_FROM
// Também aceita os nomes antigos SMTP_PASS e SMTP_FROM.
// Sem SMTP_HOST ou remetente, o e-mail é apenas registrado no log do servidor.

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT) || 587;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
const from = process.env.EMAIL_FROM || process.env.SMTP_FROM;
// SMTP_SECURE explícito tem prioridade; sem ele, TLS direto só na porta 465
// (na 587 a conexão é atualizada com STARTTLS automaticamente).
const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE.trim().toLowerCase() === 'true' : port === 465;

const missing = [!host && 'SMTP_HOST', !from && 'EMAIL_FROM'].filter(Boolean);
const configured = missing.length === 0;

const transport = configured
  ? nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined
    })
  : null;

if (configured) {
  console.log(`SMTP configurado: ${host}:${port} (secure=${secure}), remetente ${from}`);
} else {
  console.warn(`SMTP não configurado (faltando: ${missing.join(', ')}): e-mails serão apenas registrados no log.`);
}

async function sendMail({ to, subject, text, html }) {
  if (!transport) {
    console.log(`[e-mail não enviado - SMTP ausente] Para: ${to} | Assunto: ${subject}\n${text}`);
    return;
  }
  await transport.sendMail({ from, to, subject, text, html });
}

module.exports = { sendMail, isConfigured: () => configured };
