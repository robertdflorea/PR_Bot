const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { authMiddleware } = require('../middleware/auth');

// POST /api/tasks — save a completed task
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      issueUrl, repoUrl, repoFolder, baseSha,
      setupCommitSha, tmuxUuid, rawInteractions, interactions,
    } = req.body;

    const task = await Task.create({
      userId: req.user._id,
      issueUrl:        issueUrl        || '',
      repoUrl:         repoUrl         || '',
      repoFolder:      repoFolder       || '',
      baseSha:         baseSha          || '',
      setupCommitSha:  setupCommitSha   || '',
      tmuxUuid:        tmuxUuid         || '',
      rawInteractions: rawInteractions  || '',
      interactions:    Array.isArray(interactions) ? interactions : [],
    });

    res.json({ id: task._id, savedAt: task.createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks — user sees their own; admin sees all
router.get('/', authMiddleware, async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { userId: req.user._id };
    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('userId', 'name email');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id — owner or admin can delete
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Not allowed' });
    await task.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
