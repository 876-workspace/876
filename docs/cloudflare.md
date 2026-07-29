# Cloudflare Deployment Guide

Deploy the **876 monorepo** on [Cloudflare](https://developers.cloudflare.com/) as
Workers (Next.js via OpenNext) and Containers (FastAPI), against the existing
Neon Postgres databases.

---

## Architecture

| Worker / Container | Workspace          | Path               | Runtime                                        |
| ------------------ | ------------------ | ------------------ | ---------------------------------------------- |
| `876-api`          | `@876/api`         | `apps/api`         | **Container** (Dockerfile + Worker front door) |
| `876-billing-api`  | `@876/billing-api` | `apps/billing-api` | **Container** + Cron `*/5 * * * *`             |
| `876-app`          | `@876/app`         | `apps/876`         | OpenNext Worker                                |
| `876-enterprise`   | `@876/enterprise`  | `apps/enterprise`  | OpenNext Worker                                |
| `876-console`      | `@876/console`     | `apps/console`     | OpenNext Worker                                |
| `876-billing`      | `@876/billing-app` | `apps/billing`     | OpenNext Worker                                |
| `876-couriers`     | `@876/couriers`    | `apps/couriers`    | OpenNext Worker                                |
| `876-widgets-api`  | `@876/widgets-api` | `apps/widgets-api` | OpenNext Worker                                |

**Hostname strategy:** `*.workers.dev` script names above, with custom domains
(`api.876.app`, etc.) added as needed.

**Databases:** Neon (already production).

| Neon endpoint       | Used by            | Env var                  |
| ------------------- | ------------------ | ------------------------ |
| `ep-muddy-cell`     | api + billing-api  | `(BILLING_)DATABASE_URL` |
| `ep-purple-brook`   | Console app-local  | `CONSOLE_DATABASE_URL`   |
| `ep-rough-darkness` | Couriers app-local | `DATABASE_URL`           |
| `ep-falling-flower` | Widgets only       | `WIDGETS_DATABASE_URL`   |

**Hyperdrive is not used.** The Worker-side Prisma clients use
`@prisma/adapter-neon` (Neon's serverless driver, HTTP/WebSocket), which pools
at Neon's edge and needs no TCP socket. Setting the plain Neon connection
string as a Worker secret is sufficient — there is no binding to wire.

> Why not `@prisma/adapter-pg`: `pg` reaches Postgres over TCP, which on Workers
> comes from `pg-cloudflare`'s `workerd` export condition. Next's file tracing
> only resolves the `default` condition, so OpenNext copies `dist/empty.js` and
> the bundle fails with `Could not resolve "pg-cloudflare"`. The Node-only
> `prisma/seed.ts` and backfill scripts still use `adapter-pg`.

---

## Runtime constraints

Cloudflare Workers is not Node. Three constraints shaped the port:

**1. No `proxy.ts`.** Next.js 16 runs `proxy.ts` on the Node.js runtime and
throws if you set a `runtime` config, so OpenNext rejects it outright
(`Node.js middleware is not currently supported`). All five proxies were
removed. They were coarse session gates whose RSC layouts already call
`requireSession` before rendering; `apps/876`'s realm hard block moved to
`requireConsumerRealm` in `src/lib/auth/guards.ts`, called by the `/app`
layout. Put new coarse routing in RSC layouts, never in a proxy.

Side effect: `x-request-id` is no longer minted at the edge. Consumers already
treat it as optional and forward it when present.

**2. No Node built-ins, and no bundler, at request time.** `@876/app` used
`@serwist/turbopack`'s `/serwist/[path]` route, which compiled the service
worker per request: it reached for `esbuild-wasm` (the Worker build failed with
`Could not resolve "esbuild-wasm"`, and shipping it would only move the failure
to the same `Wasm code generation disallowed by embedder` wall the Prisma client
hit) and read the git SHA with `spawnSync` at module scope.

Both are build-machine work, so they moved there:
`apps/876/scripts/build-sw.mjs` compiles `src/app/sw.ts` to `public/sw.js` with
esbuild before every build, injecting the precache manifest and revision via
`define`; OpenNext ships it as a static asset and `SerwistProvider` registers
`/sw.js`. Precaching covers the offline fallback rather than the full Next asset
manifest (that is only known after `next build`); runtime caching is unchanged.

Console and Couriers use the same static-asset architecture through the shared
`scripts/build-serwist.mjs` and `scripts/serwist-shell-worker.ts` build
subsystem. Their `build:next` scripts compile an app-namespaced `/sw.js` before
OpenNext collects static assets, and their root layouts register it at scope
`/`. These authenticated apps deliberately cache only `/_next/static/**` plus
their static offline page and install icons. HTML, RSC, API, auth, tenant image,
and cross-origin responses are network-only so user or tenant data never enters
Cache Storage.

The general rule stands: anything needing a Node built-in or a bundler belongs
in a build script, never in a route.

**2b. No database URL at build time.** `next build` imports every route module
to collect page data, so a module-scope Prisma client makes the connection
string a build requirement — and the Cloudflare builder has no database URL, by
design. Each app-local `src/lib/db/index.ts` therefore exports `prisma` as a
Proxy that constructs the client on first property access. Keep it that way when
adding a datastore to a new app.

**2c. No database client shared between requests.** `@prisma/adapter-neon` opens
a Neon **WebSocket pool**, and a socket on workerd belongs to the request that
opened it. Caching the client in module scope — the ordinary Node/HMR pattern —
means the second request served by a warm isolate reuses that socket and gets
`Cannot perform I/O on behalf of a different request`. Worse, the adapter
reports that on the pool instead of rejecting the in-flight query, so the query
promise never settles, the runtime cancels the invocation as a hang, and the
page fails with **Error 1101** without a single application error being raised.

Each `src/lib/db/index.ts` therefore resolves its client through
`createRequestScopedResolver` from `@876/core/db`: one client per request on
workerd (held in a `WeakMap` keyed by the request's `ExecutionContext`), one
client per process under Node. The same module supplies `createQueryGuard`,
which bounds every query and reports failures — the pending timer keeps the
invocation alive long enough for the rejection to reach Sentry and an error
boundary, instead of the runtime killing it silently.

When you add a datastore to a new app, wire both. Do not reintroduce a
module-level `let client`.

**3. Worker size.** Free plan caps a Worker at 3 MiB; every Next.js app exceeds
that. **Workers Paid is required** (it also gates Containers, so both FastAPI
services need it too).

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

| File                  | Role                                        |
| --------------------- | ------------------------------------------- |
| `wrangler.jsonc`      | Worker name, `nodejs_compat`, assets        |
| `open-next.config.ts` | OpenNext Cloudflare adapter                 |
| `.dev.vars.example`   | Local secret template (copy to `.dev.vars`) |
| `public/_headers`     | Long-cache `/_next/static/*`                |

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
`@876/couriers` and `@876/widgets-api`.

### Local dev

Continue using `next dev`. Optionally call `initOpenNextCloudflareForDev()` from
`@opennextjs/cloudflare` in `next.config.ts` when you need local bindings.

Migrations (`prisma migrate deploy`) run in **CI before deploy**, not inside the
Worker.

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

### URL values

| Variable               | Value                                         |
| ---------------------- | --------------------------------------------- |
| `CORS_ALLOWED_ORIGINS` | List of all Cloudflare public origins         |
| `BILLING_OAUTH_ISSUER` | Public `876-api` workers.dev (or custom) URL  |
| `NEXT_PUBLIC_*_URL`    | Matching public Cloudflare application origin |

### Shared secrets (must match across services)

| Key                                                | Services                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| `API_INTERNAL_KEY`                                 | api, console, billing, couriers — **rotate** if still `dev-internal-secret-876` |
| `WORKOS_COOKIE_PASSWORD` / `SESSION_COOKIE_SECRET` | api + apps that seal 876 session cookies                                        |
| `WIDGETS_SERVICE_KEY`                              | widgets-api + every host that calls it                                          |
| `BILLING_INTERNAL_KEY`                             | console + billing                                                               |

Generate a strong `API_INTERNAL_KEY`:

```bash
openssl rand -hex 32
# wrangler secret put API_INTERNAL_KEY --name 876-api
# repeat for every service that needs it
```

### Production key inventory (names only)

Values are **not** stored in git.

Verify the runtime secret bindings for every Worker, or one Worker at a time:

```bash
pnpm check:worker-secrets
pnpm check:worker-secrets 876-couriers
```

The checker calls `wrangler secret list`, which returns names and types only;
it never reads or prints secret values. A missing `API_INTERNAL_KEY` can look
like an application access problem because `AdminDep` calls return 401. In
Couriers, affected users are routed to onboarding and see
`Setup is unavailable.` rather than an obvious authentication error.

**876-api:** `API_INTERNAL_KEY`, `COOKIE_SECURE`, `CORS_ALLOWED_ORIGINS`,
`DATABASE_URL`, `ENVIRONMENT`, `IS_PRODUCTION`, `LOG_LEVEL`, `POSTHOG_*`,
`WORKOS_*`, `SENTRY_DSN`, `PLATFORM_OWNER_EMAIL`.

**876 console:** `API_876_KEY`, `API_INTERNAL_KEY`, `API_URL`, `BILLING_*`,
`CONSOLE_DATABASE_URL`, `NEXT_PUBLIC_*`, `WIDGETS_*`, `WORKOS_COOKIE_PASSWORD`.

**876-billing:** `API_INTERNAL_KEY`, `API_URL`, `BILLING_*`, `SESSION_*`,
`NEXT_PUBLIC_*`, `WIDGETS_*`.

**876-billing-api:** `API_URL`, `BILLING_API_876_KEY`,
`BILLING_API_PRIMARY_INSTANCE`, `BILLING_DATABASE_URL`,
`BILLING_INTERNAL_KEY`, `CORS_ALLOWED_ORIGINS`, `ENVIRONMENT`, `LOG_LEVEL`,
`PORT`.

**876 couriers:** `API_876_KEY`, `API_INTERNAL_KEY`, `API_URL`, `BILLING_URL`,
`DATABASE_URL`, `NEXT_PUBLIC_*`, `STORAGE_INTERNAL_KEY`, `WIDGETS_*`,
`WORKOS_COOKIE_PASSWORD`.

**876-widgets-api:** `WIDGETS_DATABASE_URL`, `WIDGETS_SERVICE_KEY` only.

---

## Inter-service networking

| Caller → callee   | Current                                                                  | Later                            |
| ----------------- | ------------------------------------------------------------------------ | -------------------------------- |
| UI → `876-api`    | `https://876-api.<subdomain>.workers.dev` + `API_INTERNAL_KEY` / app key | Custom domain + optional mTLS    |
| UI → widgets-api  | Public workers.dev + `WIDGETS_SERVICE_KEY`                               | Worker **service binding**       |
| Console → billing | Public billing Worker URL                                                | Service binding or custom domain |

---

## Continuous deployment

Two systems share the job, and they must not overlap:

| System                        | Owns                                                          | Trigger                     |
| ----------------------------- | ------------------------------------------------------------- | --------------------------- |
| **Cloudflare Workers Builds** | Build + deploy of all OpenNext Workers and Container services | Push to `main` (git-linked) |
| **GitHub Actions**            | Storage API schema migrations                                 | Matching push to `main`     |
| GitHub Actions (manual)       | Migrations and deploys when an explicit fallback is needed    | `workflow_dispatch`         |

### Cloudflare Workers Builds settings

Set these under **Workers & Pages → \<worker\> → Settings → Build**. Builds
trigger on merge to the production branch (`main`).

Every `wrangler.jsonc` points `main` at `.open-next/worker.js`, so the build
step must run OpenNext — plain `next build` only writes `.next/` and the
deploy fails. Each Worker app's `pnpm run build` (and `cf:build`) therefore
runs `opennextjs-cloudflare build`. Prefer these dashboard values:

| Setting           | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| Build command     | `pnpm run build` (or `cf:build`)                                       |
| Deploy command    | `npx opennextjs-cloudflare deploy`                                     |
| Root directory    | `/apps/<app>` (see table below)                                        |
| Build watch paths | `apps/<app>/*`, `packages/*`; add `scripts/*` for Console and Couriers |

`npx wrangler deploy` also works once `.open-next/` exists; prefer
`opennextjs-cloudflare deploy` so incremental cache wiring stays intact.
A pure Next.js build (no Worker bundle) is still available as `build:next`.
Each app's `open-next.config.ts` sets `buildCommand: 'pnpm run build:next'` so
OpenNext does not re-enter `pnpm build` (which would recurse forever).

| Worker            | Root directory      |
| ----------------- | ------------------- |
| `876-app`         | `/apps/876`         |
| `876-enterprise`  | `/apps/enterprise`  |
| `876-console`     | `/apps/console`     |
| `876-billing`     | `/apps/billing`     |
| `876-couriers`    | `/apps/couriers`    |
| `876-widgets-api` | `/apps/widgets-api` |

Install needs no configuration: the build image detects `pnpm@11.3.0` from
`packageManager` and runs `pnpm install --frozen-lockfile`, which resolves the
whole workspace from the repo root even though the root directory is one app.

**Build variables** are required — Workers Builds does not inherit the Worker's
runtime secrets, and `NEXT_PUBLIC_*` values are inlined at build time. Set per
Worker:

| Worker           | Build variables                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| all Next.js apps | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_SENTRY_DSN` |
| `876-console`    | plus `NEXT_PUBLIC_876_API_URL`, `NEXT_PUBLIC_876_API_KEY`                                              |

`NEXT_PUBLIC_SENTRY_DSN` must be configured here as a Workers Builds build
variable for browser-side error capture. Next.js inlines `NEXT_PUBLIC_*` values
during the build, and runtime Worker vars from `wrangler.jsonc` are not visible
to that build.

**Workers Builds does not run migrations.** The Storage API migration stays in
GitHub Actions, which holds its database URL. Other datastore migrations run
through an explicit manual dispatch. Keep migrations additive so a Workers
Build that lands before its migration job does not break.

### GitHub Actions

`.github/workflows/deploy-cloudflare.yml`:

- **Path-filtered on push.** Only a Storage API change runs its migration.
- **Ordered on manual deploys.** Data-plane Workers run before dependent UIs.
- **Migrations never run inside a Worker.** Storage migrations run on matching
  pushes; the other datastore migrations require an explicit manual deploy.
- **Every deploy step is `workflow_dispatch`-only** so pushes do not deploy a
  Worker twice.
- Shared toolchain setup lives in `.github/actions/setup`.

### Required GitHub configuration

| Kind     | Name                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| Secret   | `CLOUDFLARE_API_TOKEN` (Workers Scripts:Edit + Containers), `CLOUDFLARE_ACCOUNT_ID` (manual deploys only)         |
| Secret   | `WIDGETS_DATABASE_URL`, `CONSOLE_DATABASE_URL`, `BILLING_DATABASE_URL`, `COURIERS_DATABASE_URL` (migrations only) |
| Secret   | `NEXT_PUBLIC_876_API_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`                                                              |
| Variable | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_876_API_URL`, `NEXT_PUBLIC_POSTHOG_HOST`                                      |

Only build-time (`NEXT_PUBLIC_*`) values and migration URLs belong in GitHub.
Every runtime secret is set with `wrangler secret put` and read from the Worker
environment — CI never sees them.

- Never commit `.dev.vars` or exported environment files.

---

## Related docs

- [`docs/billing-api-cutover.md`](./billing-api-cutover.md) — `BILLING_WRITER` handoff
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)
- [Cloudflare Containers](https://developers.cloudflare.com/containers/)
