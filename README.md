# Synapse

AI-powered biomedical research intelligence platform built with Next.js.

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- NVIDIA API key

## Quick Start

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Environment
cp .env.example frontend/.env.local
# Set NVIDIA_API_KEY in frontend/.env.local

# 3. Install & migrate
cd frontend
npm install
npm run db:push

# 4. Start dev server
npm run dev

# 5. Background worker (separate terminal)
npm run worker
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- **Next.js 15** App Router (Turbopack)
- **Drizzle ORM** + PostgreSQL + pgvector
- **BullMQ** for PDF processing jobs
- **NVIDIA Nemotron** via OpenAI-compatible API
- **shadcn/ui**, TanStack Query, Zustand, React Flow

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/papers/search` | Search PubMed |
| POST | `/api/papers/upload` | Upload PDF |
| GET | `/api/papers/[id]` | Get paper + analysis |
| POST | `/api/papers/[id]/analyze` | Trigger AI analysis |
| GET | `/api/papers/[id]/evidence` | Evidence score |
| POST | `/api/chat/research` | RAG research chat |
| GET | `/api/graph/topic/[topic]` | Knowledge graph |

## Testing

```bash
cd frontend && npm test
```

## Deploy to Vercel

See [DEPLOY.md](./DEPLOY.md) for full instructions. Quick summary:

1. Push repo to GitHub
2. Import on [vercel.com/new](https://vercel.com/new) with **Root Directory** = `frontend`
3. Add **Neon Postgres** from Vercel Storage marketplace
4. Set `NVIDIA_API_KEY` and other env vars
5. Deploy — build runs `drizzle-kit push` automatically
