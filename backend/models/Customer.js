const mongoose = require('mongoose');

// Cliente de um cardápio/vitrine que AUTORIZOU receber novidades da loja
// (caixa marcada no carrinho). Sem consentimento, nada é gravado aqui.
// O lojista pode apagar qualquer cliente pelo painel (pedido de exclusão, LGPD).
const customerSchema = new mongoose.Schema({
  profile: { type: String, required: true },                  // User.id da loja
  phone: { type: String, required: true, maxlength: 13 },     // só dígitos, com DDI 55
  name: { type: String, default: '', trim: true, maxlength: 80 },
  orders: { type: Number, default: 0, min: 0 },
  totalSpent: { type: Number, default: 0, min: 0 },           // centavos (soma dos pedidos enviados)
  consentAt: { type: Date, required: true },                  // última vez que marcou a caixa
  firstOrderAt: { type: Date, default: Date.now },
  lastOrderAt: { type: Date, default: Date.now }
}, { versionKey: false });

customerSchema.index({ profile: 1, phone: 1 }, { unique: true });
customerSchema.index({ profile: 1, lastOrderAt: -1 });

module.exports = mongoose.model('Customer', customerSchema);
