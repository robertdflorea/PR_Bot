const mongoose = require('mongoose');

const criterionSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  description: { type: String },
  enabled: { type: Boolean, default: true },
  weight: { type: Number, default: 1 },
});

const standardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, default: 'Default' },
    isDefault: { type: Boolean, default: false },
    criteria: [criterionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Standard', standardSchema);
