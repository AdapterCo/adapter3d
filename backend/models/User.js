const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  title: String,
  url: String,
  isActive: { type: Boolean, default: true }
});

// Categoria de produto (ex: "Lanches", "Bebidas"). _id é gerado automaticamente
// e referenciado por productSchema.categoryId.
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 50 },
  order: { type: Number, default: 0 },
  isVisible: { type: Boolean, default: true }
});

// Produto exibido no cardápio/vitrine. Preço em CENTAVOS (evita float).
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  price: { type: Number, min: 0, default: 0 },
  image: { type: String, default: '' },
  categoryId: { type: mongoose.Schema.Types.ObjectId, default: null },
  order: { type: Number, default: 0 },
  isVisible: { type: Boolean, default: true }
}, { timestamps: true });

const petSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  species: { type: String, enum: ['dog', 'cat', 'bird', 'other'], default: 'dog' },
  breed: { type: String, default: '' },
  birthDate: { type: Date, default: null },
  gender: { type: String, enum: ['male', 'female', ''], default: '' },
  color: { type: String, default: '' },
  weight: { type: Number, default: null },
  microchip: { type: String, default: '' },
  neutered: { type: Boolean, default: false },

  owner: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    whatsapp: { type: String, default: '' }
  },

  vet: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' }
  },

  lostMode: {
    active: { type: Boolean, default: false },
    reward: { type: String, default: '' },
    message: { type: String, default: '' }
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // The Tag ID
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  slug: { type: String, required: true, unique: true }, // The custom URL

  // Which kind of profile this user owns. Locked to the Tag's profileType at registration.
  profileType: { type: String, enum: ['business', 'pet', 'menu', 'storefront'], required: true, default: 'business', index: true },

  name: { type: String, default: 'Nome do Usuário' },
  avatar: { type: String, default: '' },

  // Social Links
  instagram: { type: String, default: '' },
  facebook: { type: String, default: '' },
  tiktok: { type: String, default: '' },
  youtube: { type: String, default: '' },
  linkedin: { type: String, default: '' },

  // Contact
  whatsapp: { type: String, default: '' },
  phone: { type: String, default: '' },
  pix: { type: String, default: '' },

  // Custom Links
  customLinks: [linkSchema],

  // Botão "Avaliar no Google". Preenchido SÓ pela rota /api/google-review, que
  // resolve o link do Maps num link direto de avaliação (search.google.com).
  // Não está na lista de campos editáveis do PUT /users para garantir que o
  // botão sempre aponte para o Google.
  googleReview: {
    mapsUrl: { type: String, default: '' },
    reviewUrl: { type: String, default: '' },
    placeId: { type: String, default: '' },
    businessName: { type: String, default: '' }
  },

  // Pet-specific block (only meaningful when profileType === 'pet')
  pet: { type: petSchema, default: () => ({}) },

  // Menu/Storefront-specific (only meaningful when profileType is 'menu' or 'storefront')
  categories: { type: [categorySchema], default: [] },
  products: {
    type: [productSchema],
    default: [],
    validate: {
      validator: (arr) => !Array.isArray(arr) || arr.length <= 30,
      message: 'Máximo de 30 produtos por estabelecimento.'
    }
  },

  // Theme configuration
  theme: {
    backgroundType: { type: String, enum: ['solid', 'gradient', 'image'], default: 'solid' },
    backgroundColor: { type: String, default: '#f3f4f6' },
    backgroundGradient: { type: String, default: 'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)' },
    backgroundImage: { type: String, default: '' },
    textColor: { type: String, default: '#111827' },
    buttonColor: { type: String, default: '#3b82f6' },
    buttonTextColor: { type: String, default: '#ffffff' }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
