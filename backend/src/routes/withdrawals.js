const express = require('express');
const { getDb, getSettings } = require('../db/database');
const { extractTelegramUser } = require('../middleware/auth');
const router = express.Router();

// ── POST /api/withdrawals/request ────────────────────────────────────────────
router.post('/request', extractTelegramUser, (req, res) => {
  try {
    const db = getDb();
    const telegramId = req.telegramUser.id;
    const { amount, wallet_address } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress;

    // Read from shared config
    const sharedConfig = require('../../../config.json');
    const minWithdrawal = sharedConfig.MIN_WITHDRAWAL;

    if (!wallet_address || !/^(EQ|UQ)[a-zA-Z0-9_-]{46}$/.test(wallet_address)) {
      return res.status(400).json({ error: 'Invalid wallet address (must be a valid TON address)' });
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < minWithdrawal) {
      return res.status(400).json({ error: `Minimum withdrawal amount is ${minWithdrawal} TON` });
    }

    const user = db.prepare('SELECT id, balance, banned FROM users WHERE telegram_id = ?').get(telegramId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.banned) return res.status(403).json({ error: 'Account is banned' });

    if (user.balance < withdrawAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const tx = db.transaction(() => {
      db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(withdrawAmount, user.id);

      const result = db.prepare(`
        INSERT INTO withdrawals (user_id, telegram_id, amount, wallet_address, status, ip_address)
        VALUES (?, ?, ?, ?, 'pending', ?)
      `).run(user.id, telegramId, withdrawAmount, wallet_address, ipAddress);

      return result.lastInsertRowid;
    });

    const withdrawalId = tx();

    res.json({
      success: true,
      withdrawal_id: withdrawalId,
      remaining_balance: user.balance - withdrawAmount
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process withdrawal request' });
  }
});

// ── GET /api/withdrawals/history ─────────────────────────────────────────────
router.get('/history', extractTelegramUser, (req, res) => {
  try {
    const db = getDb();
    const telegramId = req.telegramUser.id;

    const withdrawals = db.prepare(`
      SELECT id, amount, wallet_address, status, requested_at, paid_at, admin_note
      FROM withdrawals
      WHERE telegram_id = ?
      ORDER BY requested_at DESC
    `).all(telegramId);

    res.json(withdrawals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch withdrawal history' });
  }
});

module.exports = router;
