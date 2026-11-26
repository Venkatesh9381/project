# InterviewOS · AI Mock Interview Coach

A responsive mock-interview practice application for technical, HR and mixed interviews.

> **Current status: active development.** Registration/login and authenticated interview persistence are connected to the API. Answer review calls the local AI service, which attempts Ollama and explicitly falls back to heuristic demo feedback when the local model is unavailable. Browser microphone capture and an optional local Whisper transcription endpoint are implemented, but still require hardware-level verification. A browser-based JavaScript coding practice workspace with sample tests is implemented. It is a learning runner, not a hardened service for executing untrusted code.

## Stack

- Frontend: React 18, Vite, Lucide React
- API: Node.js, Express, Zod, Helmet, JWT, bcryptjs
- Database: MongoDB with Mongoose
- AI service: Python, FastAPI, Ollama (local model), transparent heuristic fallback

## Repository layout

```text
.
├── src/                 # React application and auth gate
├── server/
│   └── src/
│       ├── middleware/  # JWT authentication
│       ├── models/      # User and interview schemas
│       └── routes/      # Auth and interview endpoints
├── ai-service/          # FastAPI + local Ollama review provider
└── .github/workflows/   # Build and syntax checks
```

## Requirements

- Node.js 20+
- Python 3.10+
- MongoDB 6+ (local or hosted)
- Ollama installed locally for model-powered feedback (optional; heuristic fallback works without it)
- Microphone and a modern browser for voice input
- Optional faster-whisper dependencies and a compatible local machine for speech-to-text

## 1. Configure and run MongoDB

Start a local MongoDB server, or create a database in a hosted MongoDB service. Keep the connection string private.

## 2. Run the API

In a terminal:

```bash
cd server
npm install
```

Copy `.env.example` to `.env` and configure:

- `MONGODB_URI`: your MongoDB connection string
- `JWT_SECRET`: a unique random secret of at least 32 characters
- `CLIENT_ORIGIN`: `http://localhost:5173`
- `AI_SERVICE_URL`: `http://127.0.0.1:8000`

Then start the API:

```bash
npm run dev
```

API health check: http://localhost:4000/api/health.

## 3. Run the AI service

In another terminal, from the repository root:

```bash
cd ai-service
python -m venv .venv
```

Activate the environment:

```powershell
# Windows PowerShell
.venv\Scripts\Activate.ps1
```

```bash
# macOS/Linux
source .venv/bin/activate
```

Install dependencies and configure the AI service:

```bash
pip install -r requirements.txt
# Optional: install local Whisper transcription support
pip install -r requirements-voice.txt
```

Copy `.env.example` to `.env`. Defaults use:

- `OLLAMA_BASE_URL=http://127.0.0.1:11434`
- `OLLAMA_MODEL=qwen2.5:3b`

For speech-to-text, the optional `requirements-voice.txt` installs faster-whisper. The default Whisper model is `base`, using CPU `int8` mode. The first transcription may download model weights, so an internet connection is required for that initial setup unless weights are pre-cached. Configure `WHISPER_MODEL`, `WHISPER_DEVICE` and `WHISPER_COMPUTE_TYPE` in `ai-service/.env` if needed.

Install and start Ollama separately, then download the model:

```bash
ollama pull qwen2.5:3b
```

Start FastAPI:

```bash
uvicorn main:app --reload --port 8000
```

Health check: http://localhost:8000/health.

If Ollama is not running or the model is unavailable, the AI service returns clearly labelled heuristic demo feedback. Do not mistake this fallback for an LLM evaluation.

## 4. Run the frontend

In a third terminal, from the repository root:

```bash
npm install
npm run dev
```

Open http://localhost:5173.

The Vite development server proxies `/api` requests to the API at `http://localhost:4000`.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API health |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/interviews` | List signed-in user's sessions |
| POST | `/api/interviews` | Create an interview |
| GET | `/api/interviews/:id` | Read own interview |
| PATCH | `/api/interviews/:id` | Update own interview |
| POST | `/api/review` | Request authenticated answer review |
| POST | `/api/transcribe` | Upload a short recording for local Whisper transcription |

Protected endpoints require `Authorization: Bearer <token>`. The frontend keeps the short-lived token in session storage for the current browser tab.

## Current functionality

- JavaScript coding practice with three starter challenges, hints, sample test cases, reset and run controls
- Coding submissions run in a temporary browser Worker with network APIs disabled and a short execution timeout; this is a learning aid, not a secure hostile-code sandbox
- Dashboard averages, completion counts, practice time and saved coaching notes calculated from persisted interview sessions

- Responsive dark/light dashboard and navigation
- Registration and login screens connected to the API
- bcrypt password hashing and short-lived JWT authentication
- Interview setup for role, interview type, level and question count
- Technical, HR and Mixed practice question tracks
- Text answer entry, word count, review and next-question flow
- Interview records, answers, scores and duration persisted through the authenticated API
- Interview history loaded from the signed-in user's account
- Local Ollama review integration with structured JSON output and a labelled heuristic fallback
- Browser microphone recording, authenticated audio upload, and optional local faster-whisper transcription
- Audio upload is limited to 25 MB, with temporary audio files removed after transcription
- API validation and ownership-scoped interview queries

## Known limitations

- Real MongoDB registration/login and end-to-end interview flow still need integration testing against a configured database.
- Ollama model quality and hardware performance have not yet been verified on the handover machine.
- No refresh-token, password-reset or account-deletion flow yet.
- Voice capture and Whisper transcription are implemented as optional local features, but still need a real microphone/model test on the target machine. No real-time spoken AI interviewer or speech playback yet.
- Coding practice currently provides a lightweight JavaScript editor and browser Worker runner for three sample challenges. It is not Monaco and is not a production-grade sandbox or multi-language execution service. Never execute untrusted code inside the API process.
- Dashboard score averages, completed-session counts, practice time and coaching notes are derived from saved interview records. Skill-level scoring and trend forecasting are not yet implemented.
- This is a development build, not a production-ready service.

## Development roadmap

1. Core dashboard and API foundation
2. Frontend authentication and interview persistence
3. Local Ollama review integration
4. Complete MongoDB, Ollama and microphone/Whisper integration testing on the target machine
5. Expand coding practice after validating the current browser runner; use a hardened isolated execution service before accepting untrusted submissions
6. Add detailed interview reports and skill-level scoring from structured evaluation data
7. Accessibility, security review and final handover package

## Security notes

Never commit real secrets. Keep all `.env` files private. Production deployment requires HTTPS, strict CORS, rate limiting, secure token storage, request validation, upload size limits, dependency scanning and isolated code execution. Audio is sent only to the configured local AI service in this setup; temporary files are deleted after transcription. Do not use heuristic demo scores for hiring decisions.
