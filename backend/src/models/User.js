const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarPath:   { type: String, default: null },
    role:         { type: String, enum: ['user', 'admin'], default: 'user' },
    status:       { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
