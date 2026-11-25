# AI Mock Interview Coach

A full-stack mock interview practice platform for technical, HR and mixed interviews. The project is being built as a monorepo with a React frontend, Node/Express API, Python/FastAPI AI service, MongoDB persistence, and an explicit demo mode when local AI services are unavailable.

## Project status

**Initial scaffold in progress.** This repository is the source of truth. Features are only marked complete after implementation and verification; local Ollama, Whisper, microphone and browser behaviour require validation on the target machine.

## Planned stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, React Router, Recharts, Monaco Editor
- API: Node.js, Express, TypeScript, JWT, bcrypt, Mongoose
- AI service: Python, FastAPI, Ollama (local model), optional faster-whisper
- Data: MongoDB
- Quality: Vitest, Supertest, Pytest, ESLint, TypeScript checks

## Quick start

See [docs/SETUP.md](docs/SETUP.md) for prerequisites and setup. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for service boundaries and [docs/ROADMAP.md](docs/ROADMAP.md) for implementation status.

## Safety and privacy

- Never commit `.env` files, tokens, passwords, recordings, or personal interview data.
- Demo feedback is labelled as simulated and must not be presented as a real AI evaluation.
- Local AI mode calls the configured Ollama service. Whisper is optional and can be enabled separately.
- Do not expose the AI service directly to the public internet without adding authentication and network controls.

## License

This project is currently an educational project. Add a license only after the project owner chooses one.
