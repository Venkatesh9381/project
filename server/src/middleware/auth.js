import jwt from 'jsonwebtoken';

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

export function requireAuth(req, res, next) {
  const parts = (req.headers.authorization ?? '').trim().split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    return res.status(503).json({ error: 'Authentication is not configured. Set a secure JWT_SECRET and restart the API.' });
  }

  try {
    const payload = jwt.verify(parts[1], process.env.JWT_SECRET, {
      issuer: 'interviewos-api',
      audience: 'interviewos-client'
    });
    if (!payload || typeof payload !== 'object' || typeof payload.sub !== 'string' || !OBJECT_ID_PATTERN.test(payload.sub)) {
      return res.status(401).json({ error: 'Session token is invalid. Please sign in again.' });
    }
    req.user = { id: payload.sub };
    return next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
}
