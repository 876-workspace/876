# Railway Deployment Guide

This guide covers how to deploy the **876 monorepo** on [Railway](https://railway.com) as a set of
independently scaled services, all from the same GitHub repository.

---

## Architecture Overview

| Service           | Workspace          | Path               | Builder         | Railway Root Dir |
| ----------------- | ------------------ | ------------------ | --------------- | ---------------- |
| `876-api`         | `@876/api`         | `apps/api`         | Dockerfile      | `apps/api`       |
| `876-app`         | `@876/app`         | `apps/876`         | Railpack (Node) | _(repo root)_    |
| `876-console`     | `@876/console`     | `apps/console`     | Railpack (Node) | _(repo root)_    |
| `876-billing`     | `@876/billing-app` | `apps/billing`     | Railpack (Node) | _(repo root)_    |
| `876-widgets-api` | `@876/widgets-api` | `apps/widgets-api` | Railpack (Node) | _(repo root)_    |

> **Why does the Next.js root stay at repo root?**
> The Node services depend on shared `packages/`. Setting the root directory to an
> app subfolder would hide those packages from the build. Instead, we leave the root at the repo
> level and point Railway to each app's `railway.toml` via **Config File Path**.

### Builder: Railpack (not Nixpacks)

The Next.js services build with **Railpack** (`[build] builder = "RAILPACK"` in each
`railway.toml`) — Railway's default builder and the successor to the deprecated Nixpacks:

- Railpack reads `packageManager: pnpm@11.3.0` from the root `package.json` and provisions that
  exact pnpm via a current corepack.
- The Node version honors the root `engines.node` (`>=22.13`, required by pnpm 11).
- pnpm workspaces are supported natively — no install-phase overrides needed.

**Do not switch these services back to Nixpacks.** Its pinned nixpkgs tops out at Node 22.11
(below pnpm 11's floor) and its bundled corepack fails on pnpm 11 two different ways. The full
five-failure history is preserved in [Troubleshooting](#troubleshooting-production-deploys) —
those rows are marked _(Nixpacks era)_ and only matter if someone reintroduces that builder.

The FastAPI service is unaffected — it uses the Dockerfile builder.

### `PORT` handling — env var, never `$PORT` in a start command

Railway injects `PORT` as an environment variable. Each app's `start` script reads it with a
local-friendly fallback (`next start --port ${PORT:-3002}`), so:

- **Production**: Railway's `PORT` wins automatically — no flags needed.
- **Local / Codespaces / Gitpod**: `PORT` is unset, so each app keeps its fixed dev-parity port
  (3000/3001/3002/3003/3004/3005).

**Never write `$PORT` into a Railway start command** (`railway.toml` `startCommand` or the
dashboard field). Start commands are not guaranteed a shell, so `$PORT` can reach the process as
the literal string `"$PORT"` and crash it on boot — this exact failure took down the API service
once already.

---

## Prerequisites

- A [Railway](https://railway.com) account (Hobby or Pro plan).
- Your GitHub repository connected to Railway.
- A PostgreSQL database provisioned (Railway can host one, or use an external provider like Neon).
- WorkOS project credentials (API key, Client ID).
- PostHog project credentials (personal API key, project ID, and ingestion host).

---

## Step 1 — Create a Railway Project

1. Go to [railway.com/new](https://railway.com/new).
2. Click **Deploy from GitHub repo** and select `raheemja/876`.
3. Railway will scaffold a project with one default service — we'll configure that first, then add
   the remaining services.

---

## Step 2 — Configure the API Service (`876-api`)

This service is **fully self-contained Python** — the Dockerfile lives inside `apps/api` alongside
the FastAPI application.

### Dashboard settings

1. Click on the first (auto-created) service → **Settings → General**.
2. **Service Name**: `876-api`
3. **Root Directory**: `apps/api`
   - Railway will now see `apps/api/Dockerfile` and `apps/api/railway.toml` automatically.
4. **Watch Paths** _(optional, improves CI speed)_: `apps/api/**`

### Environment variables

Set these under **Variables** for the `876-api` service:

| Variable                   | Value / Notes                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`             | PostgreSQL connection string (`postgresql+asyncpg://...`)                                                                 |
| `WORKOS_API_KEY`           | WorkOS server key                                                                                                         |
| `WORKOS_CLIENT_ID`         | WorkOS client ID                                                                                                          |
| `WORKOS_JWKS_URL`          | Leave blank to use WorkOS default                                                                                         |
| `API_INTERNAL_KEY`         | A strong random secret — must match both Next.js apps                                                                     |
| `CORS_ALLOWED_ORIGINS`     | Comma-separated public URLs of the Next.js apps, e.g. `https://876-app.up.railway.app,https://876-console.up.railway.app` |
| `POSTHOG_PERSONAL_API_KEY` | Server-only personal API key with feature-flag write access                                                               |
| `POSTHOG_PROJECT_ID`       | Shared 876 PostHog project ID                                                                                             |
| `POSTHOG_HOST`             | `https://us.i.posthog.com` (or the configured regional/self-hosted URL)                                                   |
| `SENTRY_DSN`               | Optional — Sentry DSN for error tracking                                                                                  |
| `ENVIRONMENT`              | `production`                                                                                                              |
| `LOG_LEVEL`                | `info`                                                                                                                    |
| `PLATFORM_OWNER_EMAIL`     | Optional — bootstraps the first platform owner account                                                                    |

---

## Step 3 — Add the Consumer App Service (`876-app`)

The Next.js consumer app imports shared packages from `packages/` so the build **must** run from
the repository root.

### Add service

1. In the Railway project → click **+ New** → **GitHub Repo** → same repo (`raheemja/876`).
2. Railway creates a second service.

### Dashboard settings

1. Click the new service → **Settings → General**.
2. **Service Name**: `876-app`
3. **Root Directory**: _(leave blank — keep as repo root)_
4. **Config File Path**: `apps/876/railway.toml`
5. **Watch Paths** _(optional)_: `apps/876/**` and `packages/**`

### Environment variables

| Variable                      | Value / Notes                                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| `API_URL`                     | Internal URL of `876-api` — see [Private Networking](#private-networking) below                           |
| `API_INTERNAL_KEY`            | Must match the value set on `876-api`                                                                     |
| `API_876_KEY`                 | App API key for the consumer app (`876_app_secret_...`). Generate via `apps/api/scripts/seed_internal.py` |
| `WORKOS_COOKIE_PASSWORD`      | 32+ character secret — must match `876-console`'s value                                                   |
| `NEXT_PUBLIC_APP_URL`         | Public Railway URL of this service, e.g. `https://876-app.up.railway.app`                                 |
| `NEXT_PUBLIC_SITE_URL`        | Same as above                                                                                             |
| `NEXT_PUBLIC_CONSOLE_URL`     | Public Railway URL of the console service                                                                 |
| `NEXT_PUBLIC_SENTRY_DSN`      | Optional                                                                                                  |
| `NEXT_PUBLIC_POSTHOG_KEY`     | Optional                                                                                                  |
| `NEXT_PUBLIC_POSTHOG_HOST`    | `https://us.i.posthog.com`                                                                                |
| `NEXT_PUBLIC_APP_ENVIRONMENT` | `production`                                                                                              |

---

## Step 4 — Add the Console Service (`876-console`)

Same pattern as the consumer app — builds from repo root with its own `railway.toml`.

### Add service

1. In the Railway project → click **+ New** → **GitHub Repo** → same repo.
2. Railway creates a third service.

### Dashboard settings

1. Click the new service → **Settings → General**.
2. **Service Name**: `876-console`
3. **Root Directory**: _(leave blank — keep as repo root)_
4. **Config File Path**: `apps/console/railway.toml`
5. **Watch Paths** _(optional)_: `apps/console/**` and `packages/**`

### Environment variables

| Variable                      | Value / Notes                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `API_URL`                     | Internal URL of `876-api` — see [Private Networking](#private-networking) below |
| `API_INTERNAL_KEY`            | Must match `876-api` and `876-app`                                              |
| `API_876_KEY`                 | Console's own app API key (`876_app_secret_...`)                                |
| `WORKOS_COOKIE_PASSWORD`      | Must match `876-app`'s value                                                    |
| `CONSOLE_IDENTITY_URL`        | Public URL of the consumer app (handles login)                                  |
| `NEXT_PUBLIC_CONSUMER_URL`    | Public URL of the consumer app                                                  |
| `NEXT_PUBLIC_CONSOLE_URL`     | Public URL of this console service                                              |
| `NEXT_PUBLIC_SENTRY_DSN`      | Optional                                                                        |
| `NEXT_PUBLIC_POSTHOG_KEY`     | Optional                                                                        |
| `NEXT_PUBLIC_POSTHOG_HOST`    | `https://us.i.posthog.com`                                                      |
| `NEXT_PUBLIC_APP_ENVIRONMENT` | `production`                                                                    |
| `WIDGETS_API_URL`             | `http://${{876-widgets-api.RAILWAY_PRIVATE_DOMAIN}}`                            |
| `WIDGETS_SERVICE_KEY`         | Reference the shared `WIDGETS_SERVICE_KEY` variable                             |

---

## Step 5 — Add the Billing Service (`876-billing`)

Billing builds from the repository root and owns an app-local Prisma database. Its Railway
pre-deploy command applies committed migrations before the new application instance starts.

### Dashboard settings

1. Add the GitHub repository as a new service named `876-billing`.
2. Leave **Root Directory** blank.
3. Set **Config File Path** to `apps/billing/railway.toml`.
4. Set **Watch Paths** to `apps/billing/**` and `packages/**`.

### Environment variables

| Variable                       | Value / Notes                                                       |
| ------------------------------ | ------------------------------------------------------------------- |
| `BILLING_DATABASE_URL`         | Billing's app-local PostgreSQL connection string                    |
| `API_URL`                      | Private URL of `876-api`                                            |
| `BILLING_OAUTH_ISSUER`         | Public issuer URL of `876-api`                                      |
| `API_INTERNAL_KEY`             | Must match `876-api`                                                |
| `SESSION_COOKIE_SECRET`        | Must match the shared 876 session signing secret                    |
| `BILLING_API_876_KEY`          | App API key issued for the canonical `876-billing` app              |
| `BILLING_INTERNAL_KEY`         | Server-only key shared with Console's Billing administration client |
| `BILLING_PLATFORM_TENANT_SLUG` | Tenant receiving Console-mirrored platform records                  |
| `NEXT_PUBLIC_BILLING_URL`      | Public URL of the Billing service                                   |
| `NEXT_PUBLIC_POSTHOG_KEY`      | Shared 876 PostHog project token                                    |
| `NEXT_PUBLIC_POSTHOG_HOST`     | Shared PostHog ingestion host                                       |
| `NEXT_PUBLIC_APP_ENVIRONMENT`  | `production`                                                        |
| `WIDGETS_API_URL`              | `http://${{876-widgets-api.RAILWAY_PRIVATE_DOMAIN}}`                |
| `WIDGETS_SERVICE_KEY`          | Reference the shared `WIDGETS_SERVICE_KEY` variable                 |

---

## Step 5a — Add the Billing API (`876-billing-api`)

Deploy the FastAPI data plane as a separate service before handing it write
ownership. The initial shadow deployment must use `BILLING_WRITER=none`; this
permits readiness and reconciliation checks while rejecting every mutation.
Provision one additional Railway service slot before starting this step. The API
and its scheduler are separate services; keep the scheduler disabled until the
write-owner handoff is complete.

### Dashboard settings

1. Add the GitHub repository as a new service named `876-billing-api`.
2. Set **Root Directory** to `apps/billing-api`.
3. Leave **Config File Path** blank so Railway loads `railway.toml` from that root.
4. Set **Watch Paths** to `apps/billing-api/**`.
5. Generate a public domain only when external Billing clients require one;
   first-party services should use the Railway private domain.

### Environment variables

| Variable               | Value / Notes                                                         |
| ---------------------- | --------------------------------------------------------------------- |
| `BILLING_DATABASE_URL` | Reference `876-billing.BILLING_DATABASE_URL` during the handoff       |
| `BILLING_WRITER`       | Start with `none`; change to `fastapi` only during the cutover freeze |
| `API_URL`              | `http://${{876-api.RAILWAY_PRIVATE_DOMAIN}}`                          |
| `BILLING_API_876_KEY`  | Reference the canonical Billing app API key                           |
| `BILLING_INTERNAL_KEY` | Reference the server-only Billing administration key                  |
| `CORS_ALLOWED_ORIGINS` | Public Billing UI and approved first-party origins                    |
| `ENVIRONMENT`          | `production`                                                          |
| `LOG_LEVEL`            | `info`                                                                |
| `SENTRY_DSN`           | Optional service-specific Sentry DSN                                  |

The pre-deploy command validates required settings and applies Alembic before
Railway probes `/ready`. Do not create the `876-billing-scheduler` cron service
until the cutover runbook has moved `BILLING_WRITER` to `fastapi`; its config is
`apps/billing-api/railway.scheduler.toml` and it runs one bounded sweep every
five minutes.

---

## Step 6 — Add the Widgets API Service (`876-widgets-api`)

The Widgets API is the only service allowed to connect to the Widgets Postgres database. Its
pre-deploy command validates both required variables and applies committed Prisma migrations before
the new instance starts.

### Dashboard settings

1. Add the GitHub repository as a new service named `876-widgets-api`.
2. Leave **Root Directory** blank.
3. Leave **Config File Path** blank so Railway reads the repository-root `railway.toml`. New
   Railpack services can fail before loading a custom nested config path.
4. The root config manages watch paths for the Widgets app, shared Core package, scripts, config,
   and pnpm workspace manifests.
5. Do not generate a public domain; Console and Billing reach this service through Railway's
   private network.

### Environment variables

| Variable               | Value / Notes                                                               |
| ---------------------- | --------------------------------------------------------------------------- |
| `WIDGETS_DATABASE_URL` | Dedicated Widgets PostgreSQL URL; set only on `876-widgets-api`             |
| `WIDGETS_SERVICE_KEY`  | Reference the shared `WIDGETS_SERVICE_KEY` variable used by Console/Billing |

Create `WIDGETS_SERVICE_KEY` under **Project Settings → Shared Variables**, generate at least 32
random characters, and attach it to `876-widgets-api`, `876-console`, and `876-billing`. Railway
service variables are dashboard-managed secrets and are intentionally not stored in
`railway.toml`. The Widgets deploy fails during pre-deploy if its database URL or key is missing.

---

## Private Networking

If all services are in the **same Railway project**, use Railway's private network for server-to-
server calls. This avoids public egress and reduces latency.

In your Railway project, the private hostname for `876-api` will be available as:

```
${{876-api.RAILWAY_PRIVATE_DOMAIN}}
```

Set `API_URL` in both `876-app` and `876-console` to:

```
http://${{876-api.RAILWAY_PRIVATE_DOMAIN}}
```

Railway will resolve this at deploy time. You can copy the reference directly from the API
service's **Variables** tab under **Reference Variables**.

Set `WIDGETS_API_URL` on `876-console` and `876-billing` to:

```
http://${{876-widgets-api.RAILWAY_PRIVATE_DOMAIN}}
```

Do not set `WIDGETS_DATABASE_URL` on either host application.

---

## Does Railway Auto-Detect the Monorepo?

**No.** When you import the repository Railway creates a **single service** — it does not
auto-discover multiple apps. You must manually add one service per app (Steps 2–6 above) and
configure each service's **Root Directory** and/or **Config File Path** to point to the right
`railway.toml`.

Use **Watch Paths** on each service to make sure only relevant file changes trigger a rebuild —
otherwise a commit to one application would unnecessarily redeploy unrelated services.

---

## Generating the App API Keys

Both Next.js services need an `API_876_KEY` — a `876_app_secret_*` key that authenticates them
against the FastAPI backend.

Run this after the API service is deployed and the database is migrated:

```bash
# From apps/api, with DATABASE_URL set in your environment
python apps/api/scripts/seed_internal.py
```

This registers the internal apps and prints the keys to stdout. Store them as Railway environment
variables immediately — they are not recoverable from the database.

---

## Troubleshooting Production Deploys

Failures we have already hit once — check these before debugging anything else:

### Current setup (Railpack + Dockerfile)

| Symptom                                                                      | Cause                                                                                                                                             | Fix                                                                                                                                                                              |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Crash on boot; logs show uvicorn/next rejecting port `"$PORT"`               | A start command references `$PORT`; start commands are not guaranteed a shell, so the variable never expands                                      | Remove `$PORT` from every start command. The API's Dockerfile `CMD` is shell-wrapped; the Next.js apps read the `PORT` env var inside their `start` scripts                      |
| Deploy uses a stale/wrong start command even though `railway.toml` was fixed | The **dashboard** Start Command field is set — it persists independently and overrides both `railway.toml` removals and the Dockerfile `CMD`      | Clear **Settings → Deploy → Start Command** in the dashboard. Config-as-code only wins when the dashboard field is empty (or when `railway.toml` explicitly sets `startCommand`) |
| Console healthcheck times out despite the app running                        | `healthcheckPath = "/"` — the console proxy 307-redirects unauthenticated requests to `/login`, and Railway healthchecks require a 200            | Console probes `/login` (public). Any new session-guarded app must pick a public healthcheck route                                                                               |
| Builder ignores config (wrong builder, wrong commands)                       | The service's **Root Directory** is set to the app folder, so the build context is pruned and repo-root files (lockfile, `packages/`) are cut out | Root Directory must stay blank for the Next.js services; point Railway at the app via **Settings → Config-as-code → Railway Config File** (`apps/<app>/railway.toml`)            |
| Widgets deploy fails during pre-deploy                                       | `WIDGETS_DATABASE_URL` or `WIDGETS_SERVICE_KEY` is absent/invalid, or the database is unreachable                                                 | Set both variables on `876-widgets-api`; share the same service key with Console and Billing, then redeploy                                                                      |
| Notes show `Widgets API is not configured`                                   | The host lacks `WIDGETS_API_URL` or `WIDGETS_SERVICE_KEY`                                                                                         | Add both variables to Console/Billing and redeploy the affected host                                                                                                             |

### Historical — Nixpacks era (builder retired 2026-07; do not reintroduce)

The Next.js services originally used `builder = "nixpacks"` and hit five successive
builder-level failures. Kept for the record; every one of these is moot under Railpack:

| Symptom                                                                   | Cause                                                                                                                              |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `npm error Unsupported URL Type "workspace:"`                             | Nixpacks auto-generated an `npm i` install phase; npm cannot parse pnpm `workspace:*` deps                                         |
| `next build` Node engine/syntax errors                                    | Nixpacks provisioned Node 18; Next.js 16 needs Node 20+                                                                            |
| `corepack prepare` fails: `Cannot find matching keyid`                    | Nixpacks' corepack ships pre-rotation npm-registry signing keys                                                                    |
| pnpm crashes: `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`                    | Old corepack runs pnpm in a `vm` sandbox without a dynamic-`import()` callback; pnpm 11 uses dynamic import                        |
| `pnpm: command not found` after `npm install -g pnpm --prefix /usr/local` | The nixpacks image PATH excludes `/usr/local/bin`                                                                                  |
| pnpm refuses to run: `requires at least Node.js v22.13` on Node 22.11     | Nixpacks' pinned nixpkgs snapshot tops out at `nodejs_22` = 22.11 — **unfixable within Nixpacks**; this forced the Railpack switch |

---

## Custom Domains

After a successful first deploy, assign custom domains in each service's
**Settings → Networking → Custom Domain**.

| Service       | Suggested domain         |
| ------------- | ------------------------ |
| `876-api`     | `api.yourdomain.com`     |
| `876-app`     | `app.yourdomain.com`     |
| `876-console` | `console.yourdomain.com` |

Update `CORS_ALLOWED_ORIGINS` on the API and the relevant `NEXT_PUBLIC_*_URL` variables to reflect
the new domains, then redeploy the affected public services.

---

## Configuration File Reference

| File                                                                | Service                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [`apps/api/Dockerfile`](../apps/api/Dockerfile)                     | `876-api` — Python 3.12 slim image                                  |
| [`apps/api/railway.toml`](../apps/api/railway.toml)                 | `876-api` — Dockerfile builder, health check                        |
| [`apps/876/railway.toml`](../apps/876/railway.toml)                 | `876-app` — Railpack, pnpm monorepo build                           |
| [`apps/console/railway.toml`](../apps/console/railway.toml)         | `876-console` — Railpack, pnpm monorepo build                       |
| [`apps/billing/railway.toml`](../apps/billing/railway.toml)         | `876-billing` — Railpack, Prisma migration and pnpm monorepo build  |
| [`apps/billing-api/railway.toml`](../apps/billing-api/railway.toml) | `876-billing-api` — Dockerfile, Alembic pre-deploy, readiness check |
| [`railway.toml`](../railway.toml)                                   | `876-widgets-api` — Railpack, env validation and Prisma migration   |
