# Decisions

ADR-style log: what we chose, what else we considered, and why.

---

## M1 — Skeleton (2026-10-27)

### Monorepo: pnpm workspaces + Turborepo

- **Chose:** one repo with `apps/*` and `packages/*`. Internal packages (`@shipyard/shared`, `@shipyard/db`) ship TypeScript source, so there's no build step between them.
- **Alternatives:** separate repos (painful to keep zod schemas and types in sync); Nx (more powerful, but a lot more config to explain).
- **Why:** the API and dashboard must agree on request shapes. A shared package means they literally import the same zod schema. Turbo runs `dev`/`typecheck`/`test` across packages and caches typecheck results.

### Auth: Auth.js JWT session, decrypted by the API

- **Chose:** the dashboard signs in with GitHub via Auth.js using the `jwt` session strategy (an encrypted cookie, no session table). The `jwt` callback copies the GitHub id/login into the token. The API shares `AUTH_SECRET` and decrypts the same cookie with `@auth/core/jwt`'s `decode()`. On each authenticated request the API upserts the `User` row from the token.
- **Alternatives:**
  - _Prisma adapter + database sessions in the web app._ Then both `web` and `api` write to the database, and every request needs a session lookup.
  - _Web app mints its own API tokens._ An extra token format, signing key and expiry to manage.
  - _Web proxies everything with a trusted `x-user-id` header._ Simple, but the API then trusts whoever can reach it.
- **Why:** only the API talks to Postgres, the API verifies identity cryptographically on its own, and the browser can later talk to the API directly (WebSocket logs in M3) with the same cookie, because cookies for `localhost` are shared across ports.
- **Tradeoff:** JWT sessions can't be revoked server-side before they expire (30 days by default). If revocation becomes important, add a `tokenVersion` column on `User` and check it.

### Validation: zod schemas in `packages/shared`, checked twice

- The server action validates for fast form feedback; the API validates again because it's the trust boundary.
- Repo URLs are normalized to `https://github.com/owner/repo`, so `.git` and trailing-slash variants don't count as different repos.
- **Build commands are restricted to a safe character set** (no `&&`, `|`, `;`, `$`, backticks). The worker (M2) will split them on spaces and run them as an argument array, never through a shell. That fails loudly up front instead of half-working later, and keeps the "no shell strings" rule. Tradeoff: users can't chain commands. They can put a script in `package.json` instead.
- Slugs must be valid DNS labels (no leading/trailing hyphen) since they become subdomains.

### API: Fastify with encapsulated auth

- Protected routes are registered inside one plugin that has an auth `preHandler` hook. Fastify scopes hooks to the plugin, so a new route added there can't forget auth, and `/health` outside it stays public.
- Errors: routes throw typed `AppError`s / `ZodError`s; one `setErrorHandler` maps them to a consistent `{ error: { code, message, issues? } }` body. Unexpected errors are logged and return a generic 500.
- Another user's project returns **404, not 403**, so project ids can't be probed.
- Duplicate slugs are detected by the **unique index** (Prisma `P2002` → 409), not "check then insert", which would race.

### Database: Prisma 7 + Postgres

- Prisma 7 generates the client into `packages/db/src/generated` and connects through the `pg` driver adapter.
- `Project.activeDeploymentId` is a nullable unique foreign key to `Deployment`. Making a deployment live, or rolling back, is a single-row update: an atomic switch.
- Integration tests run against a separate `shipyard_test` database (created by a Postgres init script), migrated by Vitest's global setup.

### Local infra notes

- Compose Postgres listens on host port **5433**, so it doesn't clash with a locally installed Postgres on 5432.
- **MinIO** stopped publishing community images to Docker Hub in 2025; we use `cgr.dev/chainguard/minio`, which is the same MinIO server built from source by Chainguard.
- Pinned TypeScript 5.9 and Prisma 7.10 rather than the brand-new TypeScript 7 / Prisma 8 RC, to keep Next.js, typescript-eslint and Prisma tooling on well-trodden versions.
