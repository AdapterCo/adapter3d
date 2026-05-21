const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  title: String,
  url: String,
  isActive: { type: Boolean, default: true }
});

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
  profileType: { type: String, enum: ['business', 'pet'], required: true, default: 'business', index: true },

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

  // Pet-specific block (only meaningful when profileType === 'pet')
  pet: { type: petSchema, default: () => ({}) },

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
