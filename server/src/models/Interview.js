import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  question: { type: String, required: true, maxlength: 2000 },
  answer: { type: String, default: '', maxlength: 12000 },
  feedback: { type: mongoose.Schema.Types.Mixed, default: null }
}, { _id: false });

const interviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, required: true, maxlength: 120 },
  interviewType: { type: String, enum: ['Technical', 'HR', 'Mixed'], required: true },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  questions: { type: [String], default: [] },
  status: { type: String, enum: ['in_progress', 'completed', 'abandoned'], default: 'in_progress' },
  currentQuestionIndex: { type: Number, min: 0, max: 4, default: 0 },
  answers: { type: [answerSchema], default: [] },
  overallScore: { type: Number, min: 0, max: 100, default: null },
  durationSeconds: { type: Number, min: 0, default: 0 }
}, { timestamps: true });

export default mongoose.model('Interview', interviewSchema);
