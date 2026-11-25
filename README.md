# InterviewOS · AI Mock Interview Coach

A responsive mock-interview practice application. The first milestone establishes the React dashboard, interview setup and question flow, a transparent demo answer-review experience, and starter API/AI services.

> **Current status: foundation / demo milestone.** The UI's answer review is heuristic demo feedback, not a real AI evaluation. Authentication, persistent interview history, real speech transcription, model-powered evaluation, and executable coding challenges are not implemented yet.

## Stack

- Frontend: React 18, Vite, Lucide React, Recharts dependency
- API: Node.js, Express, Zod, Helmet
- AI service: Python, FastAPI
- Database: MongoDB connection scaffold (persistence models/routes are a later milestone)

## Repository layout

```text
.
├── src/                 # React application
├── server/              # Express API
├── ai-service/          # FastAPI review service
├── index.html
├── package.json
└── vite.config.js
```

## Run the frontend

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Run the API

In a second terminal:

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

API health check: http://localhost:4000/api/health.

## Run the Python AI-service scaffold

In a third terminal, from the repository root:

```bash
cd ai-service
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check: http://localhost:8000/health.

## Current functionality

- Responsive dark/light dashboard and navigation
- Interview setup for role, interview type, level, and question count
- Three-question practice flow for Technical, HR, and Mixed tracks
- Text answer entry, word count, review and next-question flow
- Clear demo feedback with explicit heuristic-mode disclosure
- Recent session list held in frontend memory
- Starter Express review proxy and FastAPI demo endpoint

## Important limitations

- Demo sessions are held in memory and reset on page reload.
- No production authentication or account system yet.
- No MongoDB persistence yet; only the connection scaffold exists.
- No real LLM provider/Ollama integration yet.
- No audio recording, Whisper transcription, or real-time voice interview yet.
- No code execution engine. Do not run untrusted code on the API server.
- The current score is a simple heuristic and must not be used as a hiring decision or objective assessment.

## Development roadmap

1. Foundation UI and local demo flow (current)
2. Data models, authentication, protected routes, and persistent history
3. AI provider abstraction with Ollama/local model support and evaluation tests
4. Audio capture, upload limits, transcription pipeline, and privacy controls
5. Coding workspace with isolated execution service and test cases
6. Analytics, reports, accessibility, security review, and end-to-end tests

## Security notes

Never commit real secrets. Copy `.env.example` to `.env` and use strong, unique values. Production deployment requires HTTPS, strict CORS, rate limiting, secure token storage, request validation, upload size limits, and isolated code execution.
