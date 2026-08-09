const express = require('express');
const { getDb } = require('../db/database');
const { extractTelegramUser } = require('../middleware/auth');
const router = express.Router();

// GET /api/support
// Get all tickets for the logged-in user
router.get('/', extractTelegramUser, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE telegram_id = ?').get(req.telegramUser.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const tickets = db.prepare(`
      SELECT id, type, message, status, admin_reply, created_at 
      FROM support_tickets 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(user.id);
    
    res.json({ tickets });
  } catch (err) {
    console.error('[Support GET]', err);
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
});

// POST /api/support
// Create a new support ticket
router.post('/', extractTelegramUser, (req, res) => {
  try {
    const { type, message } = req.body;
    if (!type || !message) {
      return res.status(400).json({ error: 'Type and message are required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE telegram_id = ?').get(req.telegramUser.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Prevent spam by checking if they have too many open tickets
    const openCount = db.prepare(`SELECT COUNT(*) as c FROM support_tickets WHERE user_id = ? AND status = 'open'`).get(user.id).c;
    if (openCount >= 3) {
      return res.status(429).json({ error: 'You already have 3 open tickets. Please wait for a response before creating more.' });
    }

    const stmt = db.prepare(`
      INSERT INTO support_tickets (user_id, telegram_id, type, message) 
      VALUES (?, ?, ?, ?)
    `);
    
    const info = stmt.run(user.id, req.telegramUser.id, type, message);
    
    res.json({ success: true, ticket_id: info.lastInsertRowid });
  } catch (err) {
    console.error('[Support POST]', err);
    res.status(500).json({ error: 'Failed to submit support ticket' });
  }
});

module.exports = router;
