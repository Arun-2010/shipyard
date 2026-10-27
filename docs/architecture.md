# Architecture

## Services

```
             ┌──────────────┐  server-side fetch   ┌──────────────┐
 browser ───▶│ web (Next.js)│ ── + session cookie ▶│ api (Fastify)│──▶ Postgres
             │  :3000       │                      │  :4000       │
             └──────────────┘                      └──────┬───────┘
                                                          │ enqueue (M2)
                                                          ▼
                                    Redis (BullMQ jobs, log pub/sub)
                                                          │
                                                          ▼
                                    worker (M2): clone → build in Docker → upload
                                                          │
                                                          ▼
                       router (M4) ◀── MinIO / S3: deployments/<id>/…
```

Status: **M1 done** (web, api, db). Worker, router, queue and storage arrive in M2–M4.

## Request flow (M1)

1. The user clicks "Sign in with GitHub". Auth.js runs the OAuth flow, and its `jwt` callback stores `githubId` + `login` in an encrypted session cookie (`authjs.session-token`).
2. Dashboard pages are server components. They call the API through `apiFetch()` (`apps/web/src/lib/api.ts`), forwarding the request's cookies.
3. The API's auth hook decrypts the cookie with the shared `AUTH_SECRET` (`apps/api/src/auth.ts`), upserts the `User` row, and sets `request.userId`.
4. Routes validate input with zod schemas from `@shipyard/shared` and scope every query by `userId`.

## Packages

| Package           | Role                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| `apps/web`        | Next.js App Router dashboard. No database access: everything goes through the API.                 |
| `apps/api`        | Fastify REST API. `buildApp()` builds the instance without listening, so tests use `app.inject()`. |
| `packages/db`     | Prisma schema, migrations and `createPrismaClient()`.                                              |
| `packages/shared` | zod schemas, DTO types and constants used by both web and api.                                     |
| `packages/config` | Shared tsconfig, ESLint and Prettier presets.                                                      |
