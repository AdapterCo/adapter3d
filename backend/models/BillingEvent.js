const mongoose = require('mongoose');

// Notificações de webhook do Mercado Pago já processadas. O Mercado Pago pode reenviar a mesma
// notificação (tentativas automáticas); o _id evita processar duas
// vezes (ex.: estender a assinatura em dobro).
const billingEventSchema = new mongoose.Schema({
  _id: { type: String },              // tipo:data.id:ação:x-request-id
  event: { type: String },            // ex.: subscription_authorized_payment
  paymentId: { type: String },
  subscriptionId: { type: String },
  userId: { type: String },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 365 }
}, { versionKey: false });

module.exports = mongoose.model('BillingEvent', billingEventSchema);
