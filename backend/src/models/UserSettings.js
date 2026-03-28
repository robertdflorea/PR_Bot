const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  key:    { type: String, required: true },
  value:  { type: String, required: true },
}, { timestamps: true });

userSettingsSchema.index({ userId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('UserSettings', userSettingsSchema);
