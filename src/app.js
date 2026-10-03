const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { nodeEnv, corsOrigin } = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const taskRoutes = require('./routes/task.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '10kb' }));
if (nodeEnv === 'development') app.use(morgan('dev'));

// Basic brute-force protection on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => nodeEnv === 'test',
  message: { success: false, message: 'Too many requests, please try again later' },
});

app.get('/', (req, res) => res.json({ success: true, message: 'Task Management API is running' }));
app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', uptime: process.uptime() }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/tasks', taskRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
