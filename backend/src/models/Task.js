const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  num:     Number,
  prompt:  String,
  q1:      String,
  q2:      String,
  q3:      String,
  q4:      String,
  ratings: { type: Map, of: String },
  q12:     String,
  q13:     String,
}, { _id: false });

const taskSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  issueUrl:       { type: String, default: '' },
  repoUrl:        { type: String, default: '' },
  repoFolder:     { type: String, default: '' },
  baseSha:        { type: String, default: '' },
  setupCommitSha: { type: String, default: '' },
  tmuxUuid:       { type: String, default: '' },
  rawInteractions:{ type: String, default: '' },
  interactions:   [interactionSchema],
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
