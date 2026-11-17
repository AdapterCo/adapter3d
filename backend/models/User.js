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

// Opção de um grupo (ex.: "Grande", "+ Bacon"). price = acréscimo em centavos.
const optionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  price: { type: Number, min: 0, max: 10000000, default: 0 }
});

// Grupo de opções. min 0 = opcional; max 1 = escolha única.
const optionGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  min: { type: Number, min: 0, max: 20, default: 0 },
  max: { type: Number, min: 1, max: 20, default: 1 },
  options: {
    type: [optionSchema],
    default: [],
    validate: { validator: (a) => a.length <= 20, message: 'Máximo de 20 opções por grupo.' }
  }
});

// Produto exibido no cardápio/vitrine. Preço em CENTAVOS (evita float).
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  price: { type: Number, min: 0, default: 0 },
  image: { type: String, default: '' },
  categoryId: { type: mongoose.Schema.Types.ObjectId, default: null },
  order: { type: Number, default: 0 },
  isVisible: { type: Boolean, default: true },
  upsell: { type: Boolean, default: false }, // sugerido no carrinho ("Peça também")
  description: { type: String, trim: true, maxlength: 500, default: '' },
  compareAtPrice: { type: Number, min: 0, default: 0 }, // preço "de" (riscado) quando > price
  soldOut: { type: Boolean, default: false }, // aparece, mas não pode ser pedido
  // Variações e adicionais: ex. "Tamanho" (escolha 1) e "Adicionais" (até 3).
  optionGroups: {
    type: [optionGroupSchema],
    default: [],
    validate: { validator: (a) => a.length <= 10, message: 'Máximo de 10 grupos de opções por produto.' }
  }
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
  // Recuperação de senha: guardamos só o hash (SHA-256) do token enviado por
  // e-mail. select:false = nunca sai em consultas sem pedir explicitamente.
  resetPasswordHash: { type: String, default: null, select: false },
  resetPasswordExpires: { type: Date, default: null, select: false },
  // Como a conta foi criada: 'tag' (ativação pelo código da tag — cartão/pet e
  // contas antigas) ou 'subscription' (cardápio/vitrine pelo site, com assinatura).
  signupSource: { type: String, enum: ['tag', 'subscription'], default: 'tag' },

  // Assinatura mensal (cardápio/vitrine), cobrada pelo Mercado Pago. Atualizada pelo
  // webhook de pagamento. Nunca editável pelo lojista (fora de UPDATABLE_FIELDS).
  subscription: {
    status: { type: String, enum: ['none', 'pending', 'active', 'canceled'], default: 'none' },
    tier: { type: Number, enum: [30, 50, 100], default: 30 }, // plano: máximo de produtos
    // Plano maior escolhido ao assinar por quem já estava no ar (cortesia/conta
    // antiga): só vira "tier" quando o primeiro pagamento for aprovado.
    pendingTier: { type: Number, enum: [30, 50, 100, null], default: null },
    activeUntil: { type: Date, default: null },
    customerId: { type: String, default: '' },      // payer_id no Mercado Pago
    subscriptionId: { type: String, default: '' },  // id da preapproval
    invoiceUrl: { type: String, default: '' },      // link de pagamento (init_point)
    // Pagamentos que liberaram meses. Permite desfazer exatamente o mês de um
    // pagamento estornado/contestado. Mantém só os mais recentes.
    payments: [{
      _id: false,
      paymentId: { type: String },
      invoiceId: { type: String },
      chargeDate: { type: String },        // AAAA-MM-DD da cobrança
      coveredUntil: { type: Date },        // fim do mês liberado por ele
      revokedAt: { type: Date, default: null },
      revokeReason: { type: String, default: '' } // refunded | charged_back
    }],
    refundedAt: { type: Date, default: null }      // último estorno/contestação
  },

  // Endereço de entrega da tag física e situação do envio.
  shipping: {
    postalCode: { type: String, default: '' },
    street: { type: String, default: '' },
    number: { type: String, default: '' },
    complement: { type: String, default: '' },
    district: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    status: { type: String, enum: ['none', 'pending', 'sent'], default: 'none' },
    tagId: { type: String, default: '' },
    sentAt: { type: Date, default: null }
  },

  // Resumo mensal por e-mail (dia 1). O lojista pode desligar em Estatísticas.
  emailReports: { type: Boolean, default: true },
  reports: { lastMonthlySent: { type: String, default: '' } }, // 'AAAA-MM' já enviado

  // Data em que aceitou os Termos de Uso e a Política de Privacidade (LGPD).
  // null em contas criadas antes do aceite obrigatório.
  termsAcceptedAt: { type: Date, default: null },
  slug: { type: String, required: true, unique: true }, // The custom URL
  // Slugs antigos deste perfil: links/QRs impressos com o endereço antigo
  // continuam abrindo o perfil. Não podem ser usados por outro usuário.
  previousSlugs: { type: [String], default: [], index: true },

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

  // Coordenadas do estabelecimento, extraídas do mesmo link do Maps (rota
  // /api/google-review). Usadas pelo botão "Como chegar" (Maps/Waze/Uber/99).
  location: {
    lat: { type: Number, default: null, min: -90, max: 90 },
    lng: { type: Number, default: null, min: -180, max: 180 }
  },
  // Endereço exibido no perfil. Pré-preenchido a partir das coordenadas,
  // editável pelo lojista.
  address: { type: String, default: '', trim: true, maxlength: 200 },
  showReviewButton: { type: Boolean, default: true },
  showDirectionsButton: { type: Boolean, default: true },

  // Carrinho + pedido pelo WhatsApp (perfis menu e storefront). Valores em centavos.
  orderSettings: {
    enabled: { type: Boolean, default: true },
    pickup: { type: Boolean, default: true },
    delivery: { type: Boolean, default: true },
    deliveryFee: { type: Number, default: 0, min: 0, max: 100000 },
    // Taxa por bairro: quando há bairros, o cliente escolhe o dele e deliveryFee é ignorada.
    deliveryZones: {
      type: [{
        name: { type: String, required: true, trim: true, maxlength: 60 },
        fee: { type: Number, default: 0, min: 0, max: 100000 }
      }],
      default: [],
      validate: { validator: (a) => a.length <= 100, message: 'Máximo de 100 bairros.' }
    },
    freeDeliveryOver: { type: Number, default: 0, min: 0, max: 10000000 }, // 0 = sem frete grátis
    // Cartão fidelidade: a cada `goal` pedidos, o cliente ganha `reward`.
    loyalty: {
      enabled: { type: Boolean, default: false },
      goal: { type: Number, default: 10, min: 2, max: 50 },
      reward: { type: String, default: '', trim: true, maxlength: 80 }
    },
    minOrder: { type: Number, default: 0, min: 0, max: 10000000 },
    paymentMethods: {
      type: [{ type: String, enum: ['pix', 'card', 'cash'] }],
      default: () => ['pix', 'card', 'cash']
    },
    // Dados do recebedor para o Pix copia e cola com valor (padrão BR Code).
    // A chave é o campo `pix` do perfil.
    pixName: { type: String, default: '', trim: true, maxlength: 25 },
    pixCity: { type: String, default: '', trim: true, maxlength: 15 },
    // Pedido na mesa: QR/tag de cada mesa abre o cardápio com ?mesa=N e o
    // pedido chega com "Mesa N" (consumo no local, sem endereço nem taxa).
    tableService: { type: Boolean, default: false },
    tables: { type: Number, default: 10, min: 1, max: 200 },
    // Cupons de desconto digitados no carrinho. value: % (1-100) ou centavos.
    coupons: {
      type: [{
        _id: false,
        code: { type: String, trim: true, uppercase: true, maxlength: 20, match: /^[A-Z0-9_-]{3,20}$/ },
        type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
        value: { type: Number, min: 0, max: 10000000 },
        minOrder: { type: Number, default: 0, min: 0 },
        active: { type: Boolean, default: true }
      }],
      default: [],
      validate: { validator: (a) => a.length <= 30, message: 'Máximo de 30 cupons.' }
    }
  },

  // Horário de funcionamento (cardápio/vitrine). Fora do horário o perfil
  // mostra "Fechado" e o carrinho não envia pedidos. Horário de Brasília.
  // end < start = vira a noite (ex.: 18:00 às 02:00).
  businessHours: {
    enabled: { type: Boolean, default: false },
    days: {
      type: [{
        _id: false,
        day: { type: Number, min: 0, max: 6 },          // 0 = domingo
        open: { type: Boolean, default: true },
        start: { type: String, default: '08:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
        end: { type: String, default: '18:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ }
      }],
      default: () => [0, 1, 2, 3, 4, 5, 6].map(day => ({ day, open: day !== 0, start: '08:00', end: '18:00' })),
      validate: { validator: (arr) => Array.isArray(arr) && arr.length <= 7, message: 'Horário inválido.' }
    }
  },

  // Pet-specific block (only meaningful when profileType === 'pet')
  pet: { type: petSchema, default: () => ({}) },

  // Menu/Storefront-specific (only meaningful when profileType is 'menu' or 'storefront')
  categories: { type: [categorySchema], default: [] },
  products: {
    type: [productSchema],
    default: [],
    validate: {
      // Teto absoluto (maior plano). O limite do plano do lojista é conferido no
      // updateUser (subscription.tier).
      validator: (arr) => !Array.isArray(arr) || arr.length <= 100,
      message: 'Máximo de 100 produtos por estabelecimento.'
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
