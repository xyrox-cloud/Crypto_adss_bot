// Basic Input Validation and Sanitization Middleware

function sanitizeInput(req, res, next) {
  // Check req.params (e.g. /users/:id)
  for (const [key, value] of Object.entries(req.params)) {
    if ((key === 'id' || key === 'userid') && value !== undefined) {
      if (!/^\d+$/.test(value)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }
    }
    // Reject overly long params (e.g. > 100 chars)
    if (typeof value === 'string' && value.length > 100) {
      return res.status(400).json({ error: `Parameter ${key} is too long` });
    }
  }

  // Check req.query
  for (const [key, value] of Object.entries(req.query)) {
    if ((key === 'id' || key === 'userid') && value !== undefined) {
      if (!/^\d+$/.test(value)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }
    }
    if (typeof value === 'string' && value.length > 200) {
      return res.status(400).json({ error: `Query ${key} is too long` });
    }
  }

  // Basic check for req.body strings
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      // Allow longer strings for things like messages or tickets, but cap others
      if (typeof value === 'string' && value.length > 2000) {
        return res.status(400).json({ error: `Field ${key} is too long` });
      }
    }
  }

  next();
}

module.exports = { sanitizeInput };
