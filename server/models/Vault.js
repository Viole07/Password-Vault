const mongoose = require('mongoose');

const vaultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  url: { type: String },
  email: { type: String, required: true },
  password: { type: String, required: true }, // AES Encrypted string
  category: { type: String, default: 'General' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vault', vaultSchema);