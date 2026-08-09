const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function requireAdmin(req, res, next) {
  const superAdminId = process.env.SUPER_ADMIN_ID;
  
  if (superAdminId) {
    const initData = req.headers['x-telegram-init-data'];
    const botToken = process.env.BOT_TOKEN;
    const tgId = req.headers['x-telegram-id'];

    if (initData && botToken && botToken !== 'placeholder_bot_token') {
      const tgUser = verifyTelegramInitData(initData, botToken);
      if (tgUser && String(tgUser.id).split('.')[0] === superAdminId) {
        req.admin = { role: 'super_admin' };
        return next();
      }
    } else if (tgId && String(tgId).split('.')[0] === superAdminId) {
      req.admin = { role: 'super_admin' };
      return next();
    }
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

/**
 * Verify Telegram WebApp initData using HMAC-SHA256.
 * Returns the parsed user object if valid, or null if invalid.
 * @param {string} initData - The initData string from window.Telegram.WebApp.initData
 * @param {string} botToken - The bot token from @BotFather
 * @returns {{ id: number, username?: string, first_name: string } | null}
 */
function verifyTelegramInitData(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    // Build the data-check string (all params except hash, sorted)
    params.delete('hash');
    const dataCheckArr = [];
    params.sort(); // URLSearchParams.sort() sorts keys alphabetically
    for (const [key, value] of params.entries()) {
      dataCheckArr.push(`${key}=${value}`);
    }
    const dataCheckString = dataCheckArr.join('\n');

    // HMAC secret key = HMAC-SHA256("WebAppData", botToken)
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

    // Compute expected hash
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (computedHash !== hash) return null;

    // Optionally validate freshness (5 min window)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 300) return null; // 5 minutes

    // Parse the user object
    const userStr = params.get('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

function extractTelegramUser(req, res, next) {
  const initData = req.headers['x-telegram-init-data'];
  const telegramId = req.headers['x-telegram-id'];
  const telegramUsername = req.headers['x-telegram-username'];
  const botToken = process.env.BOT_TOKEN;

  // In production: validate initData cryptographically
  if (initData && botToken && botToken !== 'placeholder_bot_token') {
    const user = verifyTelegramInitData(initData, botToken);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid Telegram initData' });
    }
    req.telegramUser = {
      id: String(user.id).split('.')[0],
      username: user.username || ''
    };
    return next();
  }

  // Fallback: header-based auth (development / bot calls)
  if (!telegramId) {
    return res.status(401).json({ error: 'Unauthorized: Missing Telegram ID' });
  }

  req.telegramUser = {
    id: String(telegramId).split('.')[0],
    username: telegramUsername || ''
  };

  next();
}

module.exports = {
  requireAdmin,
  extractTelegramUser,
  verifyTelegramInitData
};
