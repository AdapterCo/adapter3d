// Assinaturas mensais pelo Mercado Pago (API de preapproval, sem plano associado).
// Docs: https://www.mercadopago.com.br/developers/pt/docs/subscriptions
//
// Modelo "pagamento pendente": a assinatura é criada sem meio de pagamento e o
// Mercado Pago devolve um link (init_point) onde o cliente conclui o pagamento
// com o meio que preferir. Os pagamentos mensais chegam pelo webhook
// `subscription_authorized_payment`; mudanças na assinatura (ex.: cancelamento)
// por `subscription_preapproval`.
//
// Variáveis:
//   MP_ACCESS_TOKEN     access token da aplicação (de teste ou de produção)
//   MP_WEBHOOK_SECRET   chave secreta do webhook (Suas integrações > Webhooks)

const { MercadoPagoConfig, PreApproval, Invoice, Payment, Chargeback, WebhookSignatureValidator } = require('mercadopago');

let client = null;
function getClient() {
  if (!process.env.MP_ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN não configurado');
  if (!client) client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN, options: { timeout: 20000 } });
  return client;
}

const isConfigured = () => Boolean(process.env.MP_ACCESS_TOKEN);

// Mensagem legível de um erro do SDK/API do Mercado Pago.
function errorMessage(err) {
  const cause = Array.isArray(err?.cause) ? err.cause.map(c => c?.description).filter(Boolean).join(' ') : '';
  return cause || err?.message || 'erro desconhecido';
}

function createSubscription({ reason, payerEmail, amount, backUrl, externalReference }) {
  return new PreApproval(getClient()).create({
    body: {
      reason,
      external_reference: externalReference,
      payer_email: payerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: amount,
        currency_id: 'BRL'
      },
      back_url: backUrl,
      status: 'pending'
    }
  });
}

const getSubscription = (id) => new PreApproval(getClient()).get({ id });

const cancelSubscription = (id) => new PreApproval(getClient()).update({ id, body: { status: 'cancelled' } });

// Pagamento mensal de uma assinatura (authorized payment).
const getAuthorizedPayment = (id) => new Invoice(getClient()).get({ id });

// Pagamento (para detectar estorno: status refunded / charged_back).
const getPayment = (id) => new Payment(getClient()).get({ id });

// Contestação (chargeback): traz o payment_id do pagamento contestado.
const getChargeback = (id) => new Chargeback(getClient()).get({ id });

// Valida o header x-signature do webhook. Lança erro se inválido.
// IDs alfanuméricos (ex.: assinaturas) entram no HMAC em minúsculas segundo a
// regra do Mercado Pago; o SDK usa o ID como veio. Por isso, se a primeira
// validação falhar e o ID tiver letras, tenta de novo em minúsculas. As duas
// tentativas exigem a chave secreta: notificação forjada continua recusada.
function validateWebhookSignature({ xSignature, xRequestId, dataId }) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) throw new Error('MP_WEBHOOK_SECRET não configurado');
  try {
    WebhookSignatureValidator.validate({ xSignature, xRequestId, dataId, secret });
  } catch (err) {
    const lower = typeof dataId === 'string' ? dataId.toLowerCase() : dataId;
    if (!lower || lower === dataId) throw err;
    WebhookSignatureValidator.validate({ xSignature, xRequestId, dataId: lower, secret });
  }
}

// Recurso inexistente no Mercado Pago (ex.: ID fictício de uma simulação).
const isNotFound = (err) => err?.status === 404 || err?.name === 'MPNotFoundError';

module.exports = {
  isConfigured, errorMessage, isNotFound,
  createSubscription, getSubscription, cancelSubscription, getAuthorizedPayment, getPayment, getChargeback,
  validateWebhookSignature
};
