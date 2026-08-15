const crypto = require('crypto');

const DEFAULT_SESSION_HOURS = 12;

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(payload) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET no configurado');
  }

  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
}

function createToken(username, rememberMe = false) {
  const sessionHours = rememberMe ? 24 * 30 : DEFAULT_SESSION_HOURS;
  const payload = encode(JSON.stringify({
    username,
    expiresAt: Date.now() + sessionHours * 60 * 60 * 1000
  }));

  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) {
    return null;
  }

  try {
    const [payload, signature] = token.split('.');
    const expected = Buffer.from(sign(payload));
    const received = Buffer.from(signature || '');

    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      return null;
    }

    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session.expiresAt || Date.now() >= session.expiresAt) {
      return null;
    }

    return session;
  } catch (error) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const session = verifyToken(token);

  if (!session) {
    return res.status(401).json({ error: 'Autenticación requerida' });
  }

  req.adminSession = session;
  next();
}

function credentialsMatch(username, password) {
  const configuredUsername = process.env.ADMIN_USERNAME || '';
  const configuredPassword = process.env.ADMIN_PASSWORD || '';

  if (!configuredUsername || !configuredPassword || !username || !password) {
    return false;
  }

  const providedUser = crypto.createHash('sha256').update(String(username)).digest();
  const expectedUser = crypto.createHash('sha256').update(configuredUsername).digest();
  const providedPassword = crypto.createHash('sha256').update(String(password)).digest();
  const expectedPassword = crypto.createHash('sha256').update(configuredPassword).digest();

  return crypto.timingSafeEqual(providedUser, expectedUser)
    && crypto.timingSafeEqual(providedPassword, expectedPassword);
}

module.exports = {
  createToken,
  verifyToken,
  requireAuth,
  credentialsMatch
};
