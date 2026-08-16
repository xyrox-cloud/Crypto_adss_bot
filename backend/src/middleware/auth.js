const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function requireAdmin(req, res, next) {
  const superAdminId = process.env.SUPER_ADMIN_ID;
  const botToken = process.env.BOT_TOKEN;
  const initData = req.headers['x-telegram-init-data'];

  // Cryptographic verification via Telegram WebApp initData for super admin
  if (superAdminId && initData && botToken && botToken !== 'placeholder_bot_token') {
    const tgUser = verifyTelegramInitData(initData, botToken);
    if (tgUser && String(tgUser.id).split('.')[0] === superAdminId) {
      req.admin = { role: 'super_admin', id: tgUser.id };
      return next();
    }
  }

  // JWT Bearer Token Authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ error: 'Server configuration error: Missing JWT secret' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
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
    if (!initData || typeof initData !== 'string') return null;

    let initDataStr = initData.trim();
    // Handle double-encoded initData string
    if (initDataStr.includes('%3D') && !initDataStr.includes('=')) {
      try {
        initDataStr = decodeURIComponent(initDataStr);
      } catch (e) {}
    }

    const params = new URLSearchParams(initDataStr);
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
    let computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    // Fallback verification: using raw un-decoded string values if URLSearchParams altered encoding (e.g. + vs spaces)
    if (computedHash.toLowerCase() !== hash.toLowerCase()) {
      const rawPairs = initDataStr.split('&').filter(p => !p.startsWith('hash='));
      rawPairs.sort();
      const rawCheckArr = rawPairs.map(pair => {
        const eqIdx = pair.indexOf('=');
        if (eqIdx === -1) return pair;
        const k = pair.slice(0, eqIdx);
        const v = decodeURIComponent(pair.slice(eqIdx + 1));
        return `${k}=${v}`;
      });
      const rawCheckString = rawCheckArr.join('\n');
      computedHash = crypto.createHmac('sha256', secretKey).update(rawCheckString).digest('hex');
    }

    if (computedHash.toLowerCase() !== hash.toLowerCase()) return null;

    // Validate freshness (24 hours window + 300s clock skew tolerance)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    if (authDate > 0) {
      const now = Math.floor(Date.now() / 1000);
      const diff = now - authDate;
      if (diff > 86400 || diff < -300) return null; // 24 hours
    }

    // Parse the user object
    const userStr = params.get('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (err) {
    return null;
  }
}

function extractTelegramUser(req, res, next) {
  const authHeader = req.headers.authorization;
  const initData = req.headers['x-telegram-init-data'];
  const telegramId = req.headers['x-telegram-id'];
  const telegramUsername = req.headers['x-telegram-username'];
  const botToken = process.env.BOT_TOKEN;
  const jwtSecret = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET;

  // 1. Verify via JWT Bearer token if provided
  if (authHeader && authHeader.startsWith('Bearer ') && jwtSecret) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, jwtSecret);
      if (decoded && (decoded.telegram_id || decoded.id)) {
        req.telegramUser = {
          id: String(decoded.telegram_id || decoded.id).split('.')[0],
          username: decoded.username || ''
        };
        return next();
      }
    } catch (e) {
      // Continue to next check if token verification fails
    }
  }

  // 2. Cryptographically validate initData
  if (initData && botToken && botToken !== 'placeholder_bot_token') {
    const user = verifyTelegramInitData(initData, botToken);
    if (user) {
      req.telegramUser = {
        id: String(user.id).split('.')[0],
        username: user.username || ''
      };
      return next();
    }
  }

  // 3. Fallback: header-based auth if telegramId is present
  if (telegramId) {
    req.telegramUser = {
      id: String(telegramId).split('.')[0],
      username: telegramUsername || ''
    };
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized: Missing valid authentication token or initData' });
}

module.exports = {
  requireAdmin,
  extractTelegramUser,
  verifyTelegramInitData
};
