import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Interview from '../models/Interview.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const items = await Interview.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ interviews: items });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const schema = z.object({
      role: z.string().trim().min(2).max(120),
      interviewType: z.enum(['Technical', 'HR', 'Mixed']),
      level: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Intermediate')
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid interview setup', details: parsed.error.flatten() });
    const interview = await Interview.create({ ...parsed.data, user: req.user.id });
    res.status(201).json({ interview });
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid interview ID' });
  try {
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user.id });
    if (!interview) return res.status(404).json({ error: 'Interview not found' });
    res.json({ interview });
  } catch (error) { next(error); }
});

router.patch('/:id', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid interview ID' });
  try {
    const schema = z.object({
      status: z.enum(['in_progress', 'completed', 'abandoned']).optional(),
      overallScore: z.number().min(0).max(100).nullable().optional(),
      durationSeconds: z.number().int().min(0).max(86400).optional(),
      answers: z.array(z.object({
        question: z.string().min(1).max(2000),
        answer: z.string().max(12000).default(''),
        feedback: z.record(z.unknown()).nullable().optional()
      })).max(30).optional()
    }).refine(data => Object.keys(data).length > 0);
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid interview update', details: parsed.error.flatten() });
    const interview = await Interview.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: parsed.data },
      { new: true, runValidators: true }
    );
    if (!interview) return res.status(404).json({ error: 'Interview not found' });
    res.json({ interview });
  } catch (error) { next(error); }
});

export default router;
