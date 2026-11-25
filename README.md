# InterviewOS · AI Mock Interview Coach

A responsive mock-interview practice application. The current milestone includes the React dashboard, interview setup and question flow, transparent demo answer review, and starter API/AI services.

> **Current status: early development.** The UI's answer review is heuristic demo feedback, not a real AI evaluation. Authentication and protected interview API endpoints are scaffolded, but still need integration tests and production hardening. Voice transcription, model-powered evaluation, and executable coding challenges are not implemented yet.

## Stack

- Frontend: React 18, Vite, Lucide React
- API: Node.js, Express, Zod, Helmet, JWT, bcryptjs
- Database: MongoDB with Mongoose user and interview models
- AI service: Python, FastAPI (currently heuristic demo response)

## Repository layout

```text
.
├── src/                 # React application
├── server/
│   └── src/
│       ├── middleware/  # JWT authentication middleware
│       ├── models/      # User and interview schemas
│       └── routes/      # Auth and interview endpoints
├── ai-service/          # FastAPI review service
└── .github/workflows/   # Build and syntax checks
```

## Requirements

- Node.js 20+
- Python 3.10+
- MongoDB 6+ (local or hosted)

## Run the frontend

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
```

Set `JWT_SECRET` to a random secret of at least 32 characters and set `MONGODB_URI` to your MongoDB connection string. Then run:

```bash
npm run dev
```

API health check: http://localhost:4000/api/health.

### API endpoints currently available

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API health |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/interviews` | List signed-in user's sessions |
| POST | `/api/interviews` | Create an interview |
| GET | `/api/interviews/:id` | Read own interview |
| PATCH | `/api/interviews/:id` | Update own interview |
| POST | `/api/review` | Request demo answer review |

Protected endpoints require `Authorization: Bearer <token>`.

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
- Technical, HR, and Mixed practice question tracks
- Text answer entry, word count, review and next-question flow
- Clearly disclosed heuristic demo feedback
- Starter registration/login endpoints with bcrypt password hashing and short-lived JWTs
- Protected interview CRUD endpoints scoped to the authenticated user
- FastAPI demo review endpoint and Express proxy

## Important limitations

- Frontend demo sessions are held in memory and reset on page reload.
- The current frontend is not yet wired to the authentication and interview APIs.
- API authentication and database routes have not yet received automated integration/security testing.
- No refresh-token or password-reset flow yet.
- No real LLM/Ollama integration yet.
- No audio recording, Whisper transcription, or real-time voice interview yet.
- No code execution engine. Never execute untrusted code in the API process.
- The current score is a simple heuristic and must not be used as a hiring decision or objective assessment.

## Development roadmap

1. Foundation UI and service scaffolding (current)
2. Connect frontend authentication, protected routes, and persistent interview history
3. Add tests and harden authentication, API validation, and data access
4. Add local-model provider abstraction (Ollama) and evaluation quality tests
5. Add audio capture, upload limits, transcription pipeline, and privacy controls
6. Add coding workspace with isolated execution service and test cases
7. Add analytics, reports, accessibility, security review, and end-to-end tests

## Security notes

Never commit real secrets. Copy `.env.example` to `.env` and use strong, unique values. Production deployment requires HTTPS, strict CORS, rate limiting, secure token storage, request validation, upload size limits, dependency scanning, and isolated code execution. Do not use the demo score to assess real candidates.
