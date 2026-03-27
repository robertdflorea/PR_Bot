const express = require('express');
const router = express.Router();
const { fetchIssue } = require('../services/github');
const { evaluate, DEFAULT_CRITERIA } = require('../services/evaluator');
const { generateFirstPrompt } = require('../services/promptGen');
const IssueCheck = require('../models/IssueCheck');
const Standard = require('../models/Standard');

// POST /api/issues/check
router.post('/check', async (req, res) => {
  const { url, standardId, customContext } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  try {
    const issueData = await fetchIssue(url);

    // Load criteria from DB or fall back to defaults
    let criteria = DEFAULT_CRITERIA;
    let standardUsed = null;
    if (standardId) {
      const std = await Standard.findById(standardId);
      if (std) {
        criteria = std.criteria;
        standardUsed = std._id;
      }
    } else {
      const defaultStd = await Standard.findOne({ isDefault: true });
      if (defaultStd) {
        criteria = defaultStd.criteria;
        standardUsed = defaultStd._id;
      }
    }

    const { verdict, score, results } = evaluate(issueData, criteria);
    const firstPrompt = generateFirstPrompt(issueData, customContext);

    const record = await IssueCheck.create({
      url,
      ...issueData,
      verdict,
      results,
      standardUsed,
      customContext,
    });

    res.json({
      id: record._id,
      issueData,
      verdict,
      score: Math.round(score * 100),
      results,
      firstPrompt,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/issues/history
router.get('/history', async (req, res) => {
  const history = await IssueCheck.find().sort({ createdAt: -1 }).limit(50);
  res.json(history);
});

// DELETE /api/issues/history/:id
router.delete('/history/:id', async (req, res) => {
  await IssueCheck.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
