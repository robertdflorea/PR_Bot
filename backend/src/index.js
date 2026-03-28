const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const issuesRouter   = require('./routes/issues');
const standardsRouter = require('./routes/standards');
const promptsRouter  = require('./routes/prompts');
const setupRouter    = require('./routes/setup');
const settingsRouter = require('./routes/settings');
const authRouter     = require('./routes/auth');
const tasksRouter    = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 4500;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pr_bot';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth',      authRouter);
app.use('/api/issues',    issuesRouter);
app.use('/api/standards', standardsRouter);
app.use('/api/prompts',   promptsRouter);
app.use('/api/setup',     setupRouter);
app.use('/api/settings',  settingsRouter);
app.use('/api/tasks',     tasksRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
