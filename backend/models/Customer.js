const mongoose = require('mongoose');

// Cliente de um cardápio/vitrine que marcou no carrinho "receber novidades"
// e/ou "participar do cartão fidelidade". Sem uma das caixas, nada é gravado.
// O lojista pode apagar qualquer cliente pelo painel (pedido de exclusão, LGPD).
const customerSchema = new mongoose.Schema({
  profile: { type: String, required: true },                  // User.id da loja
  phone: { type: String, required: true, maxlength: 13 },     // só dígitos, com DDI 55
  name: { type: String, default: '', trim: true, maxlength: 80 },
  orders: { type: Number, default: 0, min: 0 },
  totalSpent: { type: Number, default: 0, min: 0 },           // centavos (soma dos pedidos enviados)
  // Consentimentos separados por finalidade. Registros antigos (sem o campo)
  // vieram da caixa "receber novidades", por isso marketing tem default true.
  marketing: { type: Boolean, default: true },
  consentAt: { type: Date, default: null },                   // última vez que aceitou novidades
  // Cartão fidelidade: selos rumo ao prêmio; prêmios ganhos aguardam o lojista
  // confirmar a entrega no painel.
  loyalty: { type: Boolean, default: false },
  loyaltyAt: { type: Date, default: null },
  stamps: { type: Number, default: 0, min: 0 },
  rewardsPending: { type: Number, default: 0, min: 0 },
  rewardsRedeemed: { type: Number, default: 0, min: 0 },
  lastStampAt: { type: Date, default: null },
  firstOrderAt: { type: Date, default: Date.now },
  lastOrderAt: { type: Date, default: Date.now }
}, { versionKey: false });

customerSchema.index({ profile: 1, phone: 1 }, { unique: true });
customerSchema.index({ profile: 1, lastOrderAt: -1 });

module.exports = mongoose.model('Customer', customerSchema);
