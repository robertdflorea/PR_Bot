const express = require('express');
const router = express.Router();
const Standard = require('../models/Standard');
const { DEFAULT_CRITERIA } = require('../services/evaluator');

// GET /api/standards  — list all + embedded defaults
router.get('/', async (req, res) => {
  const standards = await Standard.find().sort({ createdAt: -1 });
  res.json({ standards, defaultCriteria: DEFAULT_CRITERIA });
});

// POST /api/standards  — create new standard
router.post('/', async (req, res) => {
  const { name, criteria, isDefault } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  if (isDefault) {
    await Standard.updateMany({}, { isDefault: false });
  }

  const std = await Standard.create({ name, criteria: criteria || DEFAULT_CRITERIA, isDefault: !!isDefault });
  res.json(std);
});

// PUT /api/standards/:id
router.put('/:id', async (req, res) => {
  const { name, criteria, isDefault } = req.body;

  if (isDefault) {
    await Standard.updateMany({}, { isDefault: false });
  }

  const std = await Standard.findByIdAndUpdate(
    req.params.id,
    { name, criteria, isDefault: !!isDefault },
    { new: true }
  );
  if (!std) return res.status(404).json({ error: 'Not found' });
  res.json(std);
});

// DELETE /api/standards/:id
router.delete('/:id', async (req, res) => {
  await Standard.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// POST /api/standards/reset-defaults  — restore built-in criteria
router.post('/reset-defaults', async (req, res) => {
  await Standard.deleteMany({ isDefault: true });
  const std = await Standard.create({
    name: 'Default',
    criteria: DEFAULT_CRITERIA,
    isDefault: true,
  });
  res.json(std);
});

module.exports = router;
