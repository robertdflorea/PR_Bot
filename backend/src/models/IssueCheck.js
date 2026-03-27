const mongoose = require('mongoose');

const issueCheckSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    owner: String,
    repo: String,
    issueNumber: Number,
    title: String,
    body: String,
    state: String,
    language: String,
    prFilesChanged: Number,
    verdict: { type: String, enum: ['good', 'bad', 'warning'] },
    results: [
      {
        key: String,
        label: String,
        passed: Boolean,
        message: String,
      },
    ],
    standardUsed: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard' },
    customContext: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('IssueCheck', issueCheckSchema);
