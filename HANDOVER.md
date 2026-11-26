# InterviewOS handover guide

This guide is for the person setting up and demonstrating the project. It assumes a Windows 10/11 computer. The application is a local development project, not a hosted production service.

## What is included

- React + Vite responsive web application
- Express API with account registration, login, JWT authentication and user-scoped interview records
- MongoDB persistence
- Python FastAPI service for local Ollama answer review
- Optional local faster-whisper speech-to-text
- Monaco-based JavaScript practice challenges with sample tests in a browser Worker
- CI checks for frontend build, npm dependency audits, MongoDB-backed API tests, AI-service tests and a real Chromium end-to-end interview flow

## Software to install

- Node.js 22.12 or newer (Node.js 24 LTS recommended)
- Python 3.10 or newer
- MongoDB Community Server, or a MongoDB Atlas database
- Git
- Ollama (optional, for model-based feedback)
- A modern browser such as Chrome or Edge

## 1. Get the source

Download the repository ZIP from GitHub or clone it:

```powershell
git clone https://github.com/Venkatesh9381/project.git
cd project
```

Use the default `main` branch. No special feature branch is required for setup.

## 2. Configure MongoDB and the API

Start MongoDB. In a hosted MongoDB setup, create a database user and allow the development machine's IP address. Keep the connection string private.

In PowerShell:

```powershell
cd server
Copy-Item .env.example .env
```

Generate a unique JWT secret in PowerShell:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

Edit `server/.env` and set:
- `MONGODB_URI` to the local or hosted MongoDB connection string
- `JWT_SECRET` to the generated random value (at least 32 characters)
- `CLIENT_ORIGIN=http://localhost:5173`
- `AI_SERVICE_URL=http://127.0.0.1:8000`

Do not leave the example JWT value in place. The API intentionally refuses to start with a missing, short, or example placeholder secret. Never share or commit the generated secret or the `.env` file.

Install and start the API:

```powershell
npm install
npm run dev
```

Keep this terminal open. The API starts only after it successfully connects to MongoDB. Check http://localhost:4000/api/health. The response should report database connected.

## 3. Configure the AI service

Open a second PowerShell terminal from the repository root:

```powershell
cd ai-service
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

For model-based feedback, install Ollama separately and run:

```powershell
ollama pull qwen2.5:3b
```

Start the AI service from the `ai-service` directory:

```powershell
uvicorn main:app --reload --port 8000
```

Check http://127.0.0.1:8000/health.

If Ollama is unavailable, answer review uses a clearly labelled heuristic demonstration fallback. It is not model-generated feedback.

### Optional voice transcription

Install the additional dependencies:

```powershell
pip install -r requirements-voice.txt
```

The first transcription may download the Whisper model weights. A microphone and browser permission are required. This feature must be tested on the actual demonstration computer.

## 4. Start the frontend

Open a third PowerShell terminal from the repository root:

```powershell
npm install
npm run dev
```

Open http://localhost:5173, create an account and start a mock interview.

## 5. Run the browser end-to-end test locally (optional)

With MongoDB, the API, the Python AI service and the Vite frontend running in separate terminals, install Chromium and run:

```powershell
npx playwright install chromium
npm run test:e2e
```

The browser test registers a candidate, reviews answers, reloads and resumes an unfinished interview, then completes the session. It uses the configured AI service; without Ollama, the expected review is the clearly labelled heuristic fallback.

## 6. Suggested demonstration flow

1. Register a new user account.
2. Start a technical or HR mock interview.
3. Start a role-specific session and check the question-generation mode shown in the interview header.
4. Answer a question in text.
5. Review the answer and show whether the result is Ollama or heuristic demo mode.
6. Move to the next question and finish the interview.
7. Open Interview history, resume an in-progress session if one exists, then open a saved report and review Performance to show persisted session information.
8. Open Coding practice, choose a challenge, edit the JavaScript and run sample tests.
9. Optionally test microphone recording and local Whisper transcription.

## Important limitations

- MongoDB, Ollama and Whisper require local configuration and were not verified on the recipient's hardware by the cloud repository workflow. In-progress sessions can be resumed from Interview history; the current answer is persisted when it is reviewed or when the user moves to the next question.
- No live hosted deployment is included.
- The coding practice workspace uses Monaco for JavaScript editing. Its Worker runner is intended for learning examples, not for securely running hostile code. A production assessment platform needs a hardened isolated execution service.
- There is no real-time spoken AI interviewer, speech playback, password reset, refresh-token flow or account deletion flow.
- Analytics use saved interview scores and feedback. They do not claim to measure separate communication, confidence or technical skill dimensions unless those metrics are explicitly captured.
- Do not use heuristic demo scores for real hiring decisions.
- Keep all `.env` files private. Never commit passwords, MongoDB credentials, JWT secrets or API keys.

## Troubleshooting

- API exits at startup: check that MongoDB is running, `MONGODB_URI` is correct, and `JWT_SECRET` is a unique random value of at least 32 characters.
- Registration/login fails: check the API terminal, MongoDB health endpoint and `JWT_SECRET`.
- AI review shows heuristic demo mode: check Ollama is running, the model is pulled, and the AI service terminal has no connection errors.
- Voice transcription unavailable: install `requirements-voice.txt`, allow microphone access, and verify the Whisper model can load.
- Browser microphone access generally requires localhost or HTTPS.
- If Vite cannot call the API, confirm the API is running on port 4000 and use the Vite URL on port 5173.
