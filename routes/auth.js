const express = require('express');
const { createToken, requireAuth, credentialsMatch } = require('../middleware/auth');

const router = express.Router();
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function isRateLimited(ip) {
  const now = Date.now();
  const current = attempts.get(ip);

  if (!current || now - current.startedAt >= WINDOW_MS) {
    attempts.set(ip, { count: 1, startedAt: now });
    return false;
  }

  current.count += 1;
  return current.count > MAX_ATTEMPTS;
}

router.post('/login', (req, res) => {
  if (isRateLimited(req.ip)) {
    return res.status(429).json({ error: 'Demasiados intentos. Probá nuevamente en unos minutos.' });
  }

  const { username, password, rememberMe = false } = req.body || {};
  if (!credentialsMatch(username, password)) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  attempts.delete(req.ip);
  const token = createToken(username, Boolean(rememberMe));
  const session = require('../middleware/auth').verifyToken(token);

  res.json({
    token,
    username,
    expiresAt: session.expiresAt
  });
});

router.get('/session', requireAuth, (req, res) => {
  res.json({
    username: req.adminSession.username,
    expiresAt: req.adminSession.expiresAt
  });
});

module.exports = router;
