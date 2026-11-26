import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { z } from 'zod';
import authRoutes from './routes/auth.js';
import interviewRoutes from './routes/interviews.js';
import { requireAuth } from './middleware/auth.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173').split(',').map(origin => origin.trim()).filter(Boolean) }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const normalizedMime = file.mimetype.split(';')[0].trim().toLowerCase();
    const allowed = new Set(['audio/webm', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp4', 'audio/aac']);
    if (!allowed.has(normalizedMime)) {
      const error = new Error('Unsupported audio format. Use WebM, OGG, WAV, MP3, MP4 or AAC.');
      error.status = 415;
      return callback(error);
    }
    callback(null, true);
  }
});
const audioLimiter = rateLimit({ windowMs: 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
app.get('/api/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'degraded', service: 'interviewos-api', database: connected ? 'connected' : 'disconnected' });
});
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/interviews', interviewRoutes);

const reviewSchema = z.object({
  question: z.string().min(5).max(2000),
  answer: z.string().min(12).max(12000),
  role: z.string().min(2).max(120).default('Candidate'),
  interviewType: z.enum(['Technical', 'HR', 'Mixed']).default('Technical')
});

app.post('/api/transcribe', requireAuth, audioLimiter, (req, res, next) => {
  audioUpload.single('audio')(req, res, async error => {
    if (error) return next(error);
    if (!req.file) return res.status(400).json({ error: 'Choose an audio recording first.' });
    try {
      const form = new FormData();
      form.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname || 'answer-audio');
      const response = await fetch(`${process.env.AI_SERVICE_URL ?? 'http://127.0.0.1:8000'}/transcribe`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(120000)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(response.status).json(data);
      return res.json(data);
    } catch (error) {
      return res.status(503).json({ error: 'Speech-to-text service is unavailable. Check the local Whisper setup.' });
    }
  });
});

app.post('/api/review', requireAuth, async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid review request', details: parsed.error.flatten() });
  try {
    const response = await fetch(`${process.env.AI_SERVICE_URL ?? 'http://127.0.0.1:8000'}/review`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`AI service returned ${response.status}`);
    res.json(await response.json());
  } catch {
    res.status(503).json({ error: 'AI review service is unavailable', message: 'Start the Python AI service and try again.', mode: 'unavailable' });
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: 'Audio upload rejected: ' + err.message });
  if (err?.status) return res.status(err.status).json({ error: err.message });
  if (err?.code === 11000) return res.status(409).json({ error: 'An account with this email already exists' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT ?? 4000);

export async function startServer() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required. Configure server/.env before starting the API.');
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB connected');
  return app.listen(port, () => console.log(`InterviewOS API listening on http://localhost:${port}`));
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch(error => {
    console.error('API startup failed:', error.message);
    process.exitCode = 1;
  });
}
