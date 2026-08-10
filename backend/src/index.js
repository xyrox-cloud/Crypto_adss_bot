require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDb } = require('./db/database');

const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const adsRouter = require('./routes/ads');
const withdrawalsRouter = require('./routes/withdrawals');
const adminRouter = require('./routes/admin');
const supportRouter = require('./routes/support');
const { sanitizeInput } = require('./middleware/sanitize');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy — needed for correct IP behind nginx/Cloudflare
app.set('trust proxy', 1);

// Security headers (relax CSP a bit for admin panel inline scripts)
app.use(helmet({
  contentSecurityPolicy: false // Admin panel uses inline scripts
}));

// CORS — allow the Vite frontend in dev and the deployed frontend in production
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-telegram-id', 'x-telegram-username']
}));

// Request logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json());
app.use(sanitizeInput);

// Global rate limit — 200 requests per 15 min per IP (keeps scraper bots away)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
}));

// Serve admin panel static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Redirect /admin to the admin panel HTML
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// Redirect /superadmin to the superadmin panel HTML
app.get('/superadmin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'superadmin.html'));
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/ads', adsRouter);
app.use('/api/withdrawals', withdrawalsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/support', supportRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Initialize DB and Start Server
initDb();
console.log('[DB] Database initialized');

app.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
  console.log(`[ADMIN] Panel available at http://localhost:${PORT}/admin`);
});
