# Shipyard — Self-Hosted Deploy Platform (Mini Vercel)

## What this project is
Shipyard lets a user paste a public GitHub repo URL (a static/SPA frontend: Vite, CRA, plain HTML, Next.js static export). It then:
1. clones the repo,
2. builds it inside an isolated Docker container,
3. streams build logs live to the browser,
4. uploads the build output to object storage,
5. serves it at `https://<project-slug>.<domain>`.

This is a portfolio project for full-stack internship applications. The goal is **depth and clarity**, not feature count. Every architectural decision must be explainable in an interview.

## Tech stack
- **Language:** TypeScript everywhere (`strict: true`)
- **Monorepo:** pnpm workspaces + Turborepo
- **Dashboard:** Next.js (App Router), Tailwind CSS, shadcn/ui
- **API:** Node.js + Fastify, zod for validation
- **Database:** PostgreSQL + Prisma
- **Queue:** BullMQ on Redis
- **Build runner:** a separate worker process using `dockerode` to run build containers
- **Storage:** S3-compatible object storage (MinIO locally, Cloudflare R2/AWS S3 in prod)
- **Request router:** Node service (`http-proxy`) that maps subdomain → deployment → files in storage
- **Live logs:** Redis Pub/Sub → WebSocket (or SSE) to the browser
- **Auth:** GitHub OAuth (Auth.js)
- **Testing:** Vitest (unit/integration), Playwright (e2e)
- **Infra:** Docker Compose for local dev, GitHub Actions for CI

## Repository layout
```
apps/
  web/          # Next.js dashboard
  api/          # Fastify REST API + WebSocket log stream
  worker/       # BullMQ consumer that runs Docker builds
  router/       # Subdomain reverse proxy that serves deployments
packages/
  db/           # Prisma schema + client
  shared/       # zod schemas, types, constants shared across apps
  config/       # eslint, tsconfig, prettier presets
docker/
  build-images/ # base images used for builds (node:20-alpine etc.)
docs/
  architecture.md
  decisions.md  # ADR-style log of decisions and tradeoffs
docker-compose.yml
```

## Architecture (request flow)
1. User submits repo URL in `web` → `POST /projects` / `POST /deployments` on `api`.
2. `api` creates a `Deployment` row (status `QUEUED`) and enqueues a BullMQ job.
3. `worker` picks the job → status `BUILDING` → clones repo (shallow, `--depth 1`) → runs `install` + `build` in a fresh container with CPU/memory limits and no host mounts except a temp workspace.
4. Each log line from the container is published to Redis channel `logs:<deploymentId>` and appended to persistent storage.
5. `api` subscribes and pushes lines over WebSocket to the dashboard.
6. On success, the output dir (`dist`/`build`/`out`) is uploaded to `deployments/<deploymentId>/` in storage → status `READY`; project's `activeDeploymentId` is updated (atomic switch = instant rollback possible).
7. `router` resolves `<slug>.<domain>` → project → active deployment → streams file from storage (with caching + SPA fallback to `index.html`).

## Data model (core)
- `User` (id, githubId, name)
- `Project` (id, userId, slug unique, repoUrl, buildCommand, outputDir, installCommand, activeDeploymentId)
- `Deployment` (id, projectId, commitSha, status: QUEUED|BUILDING|READY|FAILED|CANCELLED, startedAt, finishedAt, durationMs, errorMessage)
- `BuildLog` stored as a file in object storage (`logs/<deploymentId>.txt`), not row-per-line in Postgres

## Commands
```
pnpm install
docker compose up -d        # postgres (host port 5433), redis, minio
pnpm db:migrate             # prisma migrate dev
pnpm dev                    # runs all apps via turbo (web :3000, api :4000)
pnpm test                   # vitest (api tests need compose up; use the shipyard_test DB)
pnpm test:e2e               # playwright — not added yet
pnpm lint && pnpm typecheck
```
(Add these scripts to the root package.json as the project is scaffolded; keep this section in sync.)

## Milestones (build in this order; don't skip ahead)
1. **M1 — Skeleton:** monorepo, Docker Compose, Prisma schema, GitHub login, create project.
2. **M2 — Builds:** queue + worker + Docker build of a sample Vite repo, status updates.
3. **M3 — Live logs:** Redis Pub/Sub → WebSocket → log viewer with auto-scroll.
4. **M4 — Serving:** upload output to MinIO, router serves `<slug>.localhost`.
5. **M5 — Polish:** deployment history, one-click rollback, build cancellation, auto-detect framework (read package.json).
6. **M6 — Prove it:** k6 load test on the router, record numbers in README; GitHub webhook for auto-deploy on push (stretch).

## Security rules (non-negotiable)
- Builds run untrusted code: always in a throwaway container, non-root user, CPU/memory/time limits (e.g. 1 CPU, 1GB, 10 min), no Docker socket inside the build container, and no secrets in the build env unless explicitly user-provided.
- Validate repo URLs with zod (github.com only for now); never pass user input into a shell string — use argument arrays.
- Sanitize slugs (`^[a-z0-9-]{3,40}$`), reserve `www`, `api`, `admin`.
- Router must prevent path traversal when mapping URLs to storage keys.

## Coding conventions
- Validate every API input with zod schemas from `packages/shared`.
- No `any`. Prefer explicit return types on exported functions.
- Errors: throw typed errors, map them to HTTP responses in one Fastify error handler.
- Keep worker logic in small pure functions (clone, detect, build, upload) so they're unit-testable.
- Use structured logging (pino) with `deploymentId` on every log line.
- Small commits with conventional commit messages (`feat:`, `fix:`, `chore:`).

## How Claude should work in this repo
- **I am learning.** Before writing a non-trivial piece (queue setup, Docker runner, WebSocket streaming, router), briefly explain the approach and the alternatives, then implement.
- After each milestone, append an entry to `docs/decisions.md`: the decision, alternatives considered, and why (e.g. "BullMQ vs Kafka", "SSE vs WebSocket", "serve from storage vs local disk").
- Prefer simple, readable code over clever abstractions. I must be able to explain every line in an interview.
- Write or update tests alongside features; don't mark a milestone done with failing tests.
- Don't add new dependencies without saying why.
- Keep the README updated: what it is, demo GIF/video link, architecture diagram, tradeoffs, load-test numbers, how to run locally.

## Interview talking points to keep in mind
Isolation of untrusted builds, queue-based backpressure, atomic deployment switching for rollback, log streaming fan-out, caching strategy in the router, what would change at 1000x scale.