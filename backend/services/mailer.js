const nodemailer = require('nodemailer');

// Envio de e-mails transacionais (recuperação de senha).
// Configuração via SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
// Sem SMTP configurado, o e-mail é apenas registrado no log do servidor
// (útil em desenvolvimento; em produção configure o SMTP).

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

const configured = Boolean(SMTP_HOST && SMTP_FROM);

const transport = configured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
    })
  : null;

if (!configured) {
  console.warn('SMTP não configurado: e-mails serão apenas registrados no log.');
}

async function sendMail({ to, subject, text, html }) {
  if (!transport) {
    console.log(`[e-mail não enviado - SMTP ausente] Para: ${to} | Assunto: ${subject}\n${text}`);
    return;
  }
  await transport.sendMail({ from: SMTP_FROM, to, subject, text, html });
}

module.exports = { sendMail, isConfigured: () => configured };
