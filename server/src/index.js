import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { z } from 'zod';

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'interviewos-api', mode: 'development' }));

const reviewSchema = z.object({
  question: z.string().min(5).max(2000),
  answer: z.string().min(12).max(12000),
  role: z.string().min(2).max(120).default('Candidate'),
  interviewType: z.enum(['Technical', 'HR', 'Mixed']).default('Technical')
});

app.post('/api/review', async (req, res) => {
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
  } catch (error) {
    res.status(503).json({ error: 'AI review service is unavailable', message: 'Start the Python AI service and try again.', mode: 'unavailable' });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT ?? 4000);
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(error => console.error('MongoDB connection failed:', error.message));
}
app.listen(port, () => console.log(`InterviewOS API listening on http://localhost:${port}`));
