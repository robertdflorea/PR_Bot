const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const User    = require('../models/User');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const JWT_SECRET  = process.env.JWT_SECRET || 'pr_bot_secret';
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar_${req.user._id}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

function userView(u) {
  return { id: u._id, name: u.name, email: u.email, role: u.role, status: u.status, avatarPath: u.avatarPath };
}

/* ─── POST /api/auth/register ─── */
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password)
    return res.status(400).json({ error: 'name, email, and password are required' });
  try {
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const isFirst    = (await User.countDocuments()) === 0;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name:      name.trim(),
      email:     email.toLowerCase().trim(),
      passwordHash,
      role:      isFirst ? 'admin' : 'user',
      status:    isFirst ? 'approved' : 'pending',
    });

    if (isFirst) {
      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({ token, user: userView(user) });
    }
    res.status(201).json({ message: 'Registration submitted. Awaiting admin approval.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ─── POST /api/auth/login ─── */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'email and password are required' });
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.status === 'pending')  return res.status(403).json({ error: 'Account pending admin approval' });
    if (user.status === 'rejected') return res.status(403).json({ error: 'Account rejected' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: userView(user) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ─── GET /api/auth/me ─── */
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: userView(req.user) });
});

/* ─── PUT /api/auth/me ─── */
router.put('/me', authMiddleware, async (req, res) => {
  const updates = {};
  if (req.body.name?.trim())  updates.name  = req.body.name.trim();
  if (req.body.email?.trim()) updates.email = req.body.email.toLowerCase().trim();
  try {
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-passwordHash');
    res.json({ user: userView(user) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ─── PUT /api/auth/me/password ─── */
router.put('/me/password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  try {
    const user = await User.findById(req.user._id);
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ─── POST /api/auth/me/avatar ─── */
router.post('/me/avatar', authMiddleware, (req, res) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      const avatarPath = `/uploads/${req.file.filename}`;
      await User.findByIdAndUpdate(req.user._id, { avatarPath });
      res.json({ avatarPath });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
});

/* ─── GET /api/auth/users  (admin) ─── */
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json({ users: users.map(userView) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ─── POST /api/auth/users/:id/approve  (admin) ─── */
router.post('/users/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: userView(user) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ─── POST /api/auth/users/:id/reject  (admin) ─── */
router.post('/users/:id/reject', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: userView(user) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ─── DELETE /api/auth/users/:id  (admin) ─── */
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (req.params.id === String(req.user._id))
      return res.status(400).json({ error: 'Cannot delete your own account' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
