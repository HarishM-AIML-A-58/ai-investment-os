# AI Investment Operating System

Self-hosted AI-driven investment intelligence & semi-automated investing platform for Indian markets.

> Architecture: see `docs/`. This is a **two-service** system — a FastAPI "Intelligence" backend
> and the standalone `openalgo` Flask **Broker & Market-Data Gateway** — fronted by Next.js,
> backed by PostgreSQL+pgvector and Redis/Celery, orchestrated with Docker Compose.

## Core invariant

AI agents produce **opinions only**. The authority to spend money belongs exclusively to
deterministic code: the **Conviction Engine** (math), the **Policy Engine** (rules), and the
**Trade Guard** (gate). No agent output reaches the broker without passing all three.

## Quickstart (Docker)

```bash
cp .env.example .env
docker compose build
docker compose up -d postgres redis
docker compose run --rm backend pytest -v      # run the test suite in-container
docker compose up backend                       # start the API on :8000
```

Health:
- `GET /api/v1/health`        — liveness
- `GET /api/v1/health/ready`  — readiness (checks PostgreSQL + Redis)

## Layout

```
backend/    FastAPI intelligence service (agents, engines, execution, memory)
gateway/    openalgo (vendored, runs as-is) — added in a later milestone
frontend/   Next.js app — added in a later milestone
docker/     shared docker assets
docs/       architecture & ADRs
```
