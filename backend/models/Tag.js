const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true },
  isActivated: { type: Boolean, default: false, index: true },
  activatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  profileType: { type: String, enum: ['business', 'pet'], default: 'business', index: true },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Tag', tagSchema);
