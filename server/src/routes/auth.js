import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';

const router = Router();
const credentials = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128)
});

function issueToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '2h', issuer: 'interviewos-api', audience: 'interviewos-client' });
}

router.post('/register', async (req, res, next) => {
  try {
    const parsed = credentials.extend({ name: z.string().trim().min(2).max(80) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid registration details', details: parsed.error.flatten() });
    const email = parsed.data.email.toLowerCase();
    if (await User.exists({ email })) return res.status(409).json({ error: 'An account with this email already exists' });
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await User.create({ name: parsed.data.name, email, passwordHash });
    return res.status(201).json({ token: issueToken(user), user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = credentials.omit({ name: true }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password' });
    const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+passwordHash');
    const valid = user && await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Email or password is incorrect' });
    return res.json({ token: issueToken(user), user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) { next(error); }
});

export default router;
