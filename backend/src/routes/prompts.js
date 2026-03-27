const express = require('express');
const router = express.Router();
const { generateFirstPrompt, generateFollowUpTemplate, generateFinalPrompt } = require('../services/promptGen');

// POST /api/prompts/first
router.post('/first', (req, res) => {
  const { issueData, customContext } = req.body;
  if (!issueData) return res.status(400).json({ error: 'issueData is required' });
  const prompt = generateFirstPrompt(issueData, customContext);
  res.json({ prompt });
});

// POST /api/prompts/followup
router.post('/followup', (req, res) => {
  const { notes } = req.body;
  const prompt = generateFollowUpTemplate(notes);
  res.json({ prompt });
});

// GET /api/prompts/final
router.get('/final', (req, res) => {
  res.json({ prompt: generateFinalPrompt() });
});

module.exports = router;
