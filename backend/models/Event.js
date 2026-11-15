const mongoose = require('mongoose');

// Evento de analytics de um perfil público. Sem IP nem dados pessoais:
// `visitor` é um ID aleatório gerado no navegador do visitante.
const EVENT_TYPES = ['visit', 'click', 'product_view', 'add_to_cart', 'order'];
const RETENTION_DAYS = 400;

const eventSchema = new mongoose.Schema({
  profile: { type: String, required: true },         // User.id (ID da tag)
  type: { type: String, enum: EVENT_TYPES, required: true },
  target: { type: String, default: '', maxlength: 40 }, // ex: whatsapp, instagram, productId
  label: { type: String, default: '', maxlength: 80 },  // ex: título do link personalizado
  source: { type: String, enum: ['tag', 'link'], default: 'link' },
  visitor: { type: String, default: '', maxlength: 40 },
  value: { type: Number, default: 0 },                 // order: total em centavos; add_to_cart: quantidade
  items: [{
    _id: false,
    productId: { type: String, maxlength: 40 },
    name: { type: String, maxlength: 100 },
    qty: { type: Number, min: 0 },
    price: { type: Number, min: 0 }
  }],
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

eventSchema.index({ profile: 1, createdAt: -1 });
eventSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 });

module.exports = mongoose.model('Event', eventSchema);
module.exports.EVENT_TYPES = EVENT_TYPES;
