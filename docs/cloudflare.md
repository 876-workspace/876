# Cloudflare Deployment Guide

Deploy the **876 monorepo** on [Cloudflare](https://developers.cloudflare.com/) as
Workers (Next.js via OpenNext) and Containers (FastAPI), with Neon Postgres behind
[Hyperdrive](https://developers.cloudflare.com/hyperdrive/).

This replaces the Railway layout in [`docs/railway.md`](./railway.md). Keep Railway
warm only during dual-run cutover.

---

## Architecture

| Worker / Container | Workspace          | Path               | Runtime                                        |
| ------------------ | ------------------ | ------------------ | ---------------------------------------------- |
| `876-api`          | `@876/api`         | `apps/api`         | **Container** (Dockerfile + Worker front door) |
| `876-billing-api`  | `@876/billing-api` | `apps/billing-api` | **Container** + Cron `*/5 * * * *`             |
| `876-app`          | `@876/app`         | `apps/876`         | OpenNext Worker                                |
| `876-enterprise`   | `@876/enterprise`  | `apps/enterprise`  | OpenNext Worker                                |
| `876-console`      | `@876/console`     | `apps/console`     | OpenNext Worker + Hyperdrive                   |
| `876-billing`      | `@876/billing-app` | `apps/billing`     | OpenNext Worker + Hyperdrive                   |
| `876-couriers`     | `@876/couriers`    | `apps/couriers`    | OpenNext Worker + Hyperdrive                   |
| `876-widgets-api`  | `@876/widgets-api` | `apps/widgets-api` | OpenNext Worker + Hyperdrive                   |
| `876-docs`         | `@876/docs`        | `apps/docs`        | OpenNext Worker                                |

**Hostname strategy (phase 1):** `*.workers.dev` script names above. Custom
domains (`api.876.app`, etc.) come after dual-run is healthy.

**Databases:** Neon (already production). Do not put Postgres on Railway. Create
one Hyperdrive config per Neon endpoint for Worker-side Prisma.

| Hyperdrive name (suggested) | Neon usage                                  | Env var on app                          |
| --------------------------- | ------------------------------------------- | --------------------------------------- |
| `876-identity-neon`         | Identity API (+ billing DB if still shared) | `DATABASE_URL` / `BILLING_DATABASE_URL` |
| `876-console-neon`          | Console app-local                           | `CONSOLE_DATABASE_URL`                  |
| `876-couriers-neon`         | Couriers app-local                          | `DATABASE_URL`                          |
| `876-widgets-neon`          | Widgets only                                | `WIDGETS_DATABASE_URL`                  |

```bash
# Example — connection string never committed
wrangler hyperdrive create 876-console-neon \
  --connection-string="$CONSOLE_DATABASE_URL"
```

Paste the returned `id` into the app’s `wrangler.jsonc` `hyperdrive` binding.

---

## Prerequisites

- Cloudflare account with **Workers Paid** (Containers).
- Wrangler ≥ 4 (`wrangler whoami`).
- Docker (for Container image build/push on deploy).
- Neon databases (existing).
- WorkOS / PostHog credentials.

Account used in migration planning: `b033115f2e5e7382047b69539b971105`.

---

## Per-app OpenNext (Next.js Workers)

Each Next app has:

| File                  | Role                                                      |
| --------------------- | --------------------------------------------------------- |
| `wrangler.jsonc`      | Worker name, `nodejs_compat`, assets, optional Hyperdrive |
| `open-next.config.ts` | OpenNext Cloudflare adapter                               |
| `.dev.vars.example`   | Local secret template (copy to `.dev.vars`)               |
| `public/_headers`     | Long-cache `/_next/static/*`                              |

### Scripts

```bash
pnpm --filter @876/console preview   # opennextjs-cloudflare build + preview
pnpm --filter @876/console deploy    # build + deploy to Workers
pnpm deploy:console                  # monorepo root alias
```

### Install (once per app)

```bash
pnpm --filter @876/console add @opennextjs/cloudflare
pnpm --filter @876/console add -D wrangler
```

Same pattern for `@876/app`, `@876/enterprise`, `@876/billing-app`,
`@876/couriers`, `@876/widgets-api`, `@876/docs`.

### Local dev

Continue using `next dev`. Optionally call `initOpenNextCloudflareForDev()` from
`@opennextjs/cloudflare` in `next.config.ts` when you need local bindings.

Migrations (`prisma migrate deploy`) run in **CI before deploy**, not inside the
Worker (there is no Railway-style `preDeployCommand` shell).

---

## FastAPI Containers

### Identity API (`876-api`)

- Image: `apps/api/Dockerfile` (uvicorn on `PORT`, default 4000).
- Worker: `apps/api/worker/index.ts` → Durable Object Container class `ApiContainer`.
- Config: `apps/api/wrangler.jsonc`.

```bash
cd apps/api
# Docker must be running
pnpm deploy   # or: wrangler deploy
```

Health: `GET /health` on the Worker URL (proxied into the container).

### Billing API (`876-billing-api`)

- Image: `apps/billing-api/Dockerfile` (port 4004).
- Cron: `*/5 * * * *` → Worker `scheduled` handler (billing sweep).
- Keep `BILLING_WRITER=none` until finance cutover (see billing cutover docs).

---

## Secrets and env vars

### Do not migrate from Railway

Any `RAILWAY_*` key, plus `HOSTNAME=::` (Railway IPv6 private bind).

### Replace URL values on cutover

| Pattern                | Action                                           |
| ---------------------- | ------------------------------------------------ |
| `*.railway.internal`   | Service bindings or public `*.workers.dev` HTTPS |
| `*.up.railway.app`     | New Worker/Container URL                         |
| `CORS_ALLOWED_ORIGINS` | Rebuild list of all CF public origins            |
| `BILLING_OAUTH_ISSUER` | Public `876-api` workers.dev (or custom) URL     |
| `NEXT_PUBLIC_*_URL`    | Matching public CF hostnames                     |

### Shared secrets (must match across services)

| Key                                                | Services                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| `API_INTERNAL_KEY`                                 | api, console, billing, couriers — **rotate** if still `dev-internal-secret-876` |
| `WORKOS_COOKIE_PASSWORD` / `SESSION_COOKIE_SECRET` | api + apps that seal 876 session cookies                                        |
| `WIDGETS_SERVICE_KEY`                              | widgets-api + every host that calls it                                          |
| `BILLING_INTERNAL_KEY`                             | console + billing                                                               |

### Transfer helper

```bash
chmod +x scripts/transfer-railway-secrets-to-cf.sh
./scripts/transfer-railway-secrets-to-cf.sh 876-api 876-api
./scripts/transfer-railway-secrets-to-cf.sh "876 console" 876-console
./scripts/transfer-railway-secrets-to-cf.sh 876-billing 876-billing
./scripts/transfer-railway-secrets-to-cf.sh "876 couriers" 876-couriers
./scripts/transfer-railway-secrets-to-cf.sh 876-widgets-api 876-widgets-api
```

The script refuses to copy the known weak `API_INTERNAL_KEY` placeholder. Generate:

```bash
openssl rand -hex 32
# wrangler secret put API_INTERNAL_KEY --name 876-api
# repeat for every service that needs it
```

### Production key inventory (names only)

Snapshot from Railway production (2026-07-23). Values are **not** stored in git.

**876-api:** `API_INTERNAL_KEY`, `COOKIE_SECURE`, `CORS_ALLOWED_ORIGINS`,
`DATABASE_URL`, `ENVIRONMENT`, `IS_PRODUCTION`, `LOG_LEVEL`, `POSTHOG_*`,
`WORKOS_*`, `SENTRY_DSN`, `PLATFORM_OWNER_EMAIL`.

**876 console:** `API_876_KEY`, `API_INTERNAL_KEY`, `API_URL`, `BILLING_*`,
`CONSOLE_DATABASE_URL`, `NEXT_PUBLIC_*`, `WIDGETS_*`, `WORKOS_COOKIE_PASSWORD`.

**876-billing:** `API_INTERNAL_KEY`, `API_URL`, `BILLING_*`, `SESSION_*`,
`NEXT_PUBLIC_*`, `WIDGETS_*`.

**876 couriers:** `API_876_KEY`, `API_INTERNAL_KEY`, `API_URL`, `BILLING_URL`,
`DATABASE_URL`, `NEXT_PUBLIC_*`, `WIDGETS_*`, `WORKOS_COOKIE_PASSWORD`.

**876-widgets-api:** `WIDGETS_DATABASE_URL`, `WIDGETS_SERVICE_KEY` only
(drop `HOSTNAME` / `PORT` Railway hacks).

---

## Inter-service networking

Railway private DNS (`http://876-api.railway.internal`) has no CF equivalent.

| Caller → callee   | Phase 1 (workers.dev)                                                    | Later                            |
| ----------------- | ------------------------------------------------------------------------ | -------------------------------- |
| UI → `876-api`    | `https://876-api.<subdomain>.workers.dev` + `API_INTERNAL_KEY` / app key | Custom domain + optional mTLS    |
| UI → widgets-api  | Public workers.dev + `WIDGETS_SERVICE_KEY`                               | Worker **service binding**       |
| Console → billing | Public billing Worker URL                                                | Service binding or custom domain |

---

## Cutover order

1. Create Hyperdrive configs (four Neon endpoints).
2. Deploy `876-widgets-api` → smoke `/api/health`.
3. Deploy `876-api` Container → smoke `/health`.
4. Deploy `876-billing-api` shadow (`BILLING_WRITER=none`).
5. Deploy console, billing UI, couriers; point env at CF API/widgets.
6. Deploy app, enterprise, docs.
7. Dual-run 48–72h; flip any remaining DNS/custom domains.
8. Decommission Railway services; archive `railway.toml` usage.

---

## CI notes

- Path-filter deploys (console changes should not rebuild API containers).
- Run `prisma migrate deploy` / `alembic upgrade head` in CI **before**
  `wrangler deploy` / `opennextjs-cloudflare deploy`.
- Never commit `.dev.vars` or exported Railway env files.

---

## Related docs

- [`docs/railway.md`](./railway.md) — legacy Railway layout (source of env keys)
- [`docs/billing-api-cutover.md`](./billing-api-cutover.md) — `BILLING_WRITER` handoff
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)
- [Cloudflare Containers](https://developers.cloudflare.com/containers/)
