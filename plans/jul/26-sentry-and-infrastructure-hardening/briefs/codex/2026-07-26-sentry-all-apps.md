# Brief: get Sentry actually reporting, on every app

## Why

Sentry reports nothing in production. The dashboard for `876-console` still
shows the "Get Started" onboarding card, meaning zero events have ever been
received. Two separate causes:

1. **No DSN is configured anywhere.** `apps/console/.env` and `.env.example`
   define `NEXT_PUBLIC_SENTRY_DSN=` with an **empty value**, no `wrangler.jsonc`
   declares it, and it is not a Worker secret. `Sentry.init({ dsn: undefined })`
   silently disables the SDK, so the existing wiring never sends anything.
   `.env*` is gitignored, so the value cannot be committed there — it must come
   from `wrangler.jsonc` `vars`.
2. **Three apps have no SDK at all** — `apps/couriers`, `apps/enterprise`,
   `apps/widgets-api`.

The motivating incident: a user clicked logout on `876-console` and got
Cloudflare **Error 1101 (Worker threw exception)**, Ray `a215229ecac0d67d`. That
exception must land in Sentry with a stack trace. It is a _server-side_ Worker
exception, so server-side capture is the priority.

## Sentry projects (already created — do not create any)

Org `efesto`, team `efesto-technologies`. Use these DSNs verbatim:

| App                | Wrangler `name`   | DSN                                                                                               |
| ------------------ | ----------------- | ------------------------------------------------------------------------------------------------- |
| `apps/876`         | `876-app`         | `https://da40e44586268d1c33e81b0520c10f55@o4507681618591744.ingest.us.sentry.io/4511802775830528` |
| `apps/console`     | `876-console`     | `https://83d33d619c53ce274bb1c1aefb7d1867@o4507681618591744.ingest.us.sentry.io/4511802776092672` |
| `apps/couriers`    | `876-couriers`    | `https://34e105d78c6616375353e169b8cd28fd@o4507681618591744.ingest.us.sentry.io/4511802776223744` |
| `apps/enterprise`  | `876-enterprise`  | `https://3ee6b0b5285a3eb3a8808baab081b620@o4507681618591744.ingest.us.sentry.io/4511802776420352` |
| `apps/billing`     | `876-billing`     | `https://6734c1997cea1aa887a776b9c3578614@o4507681618591744.ingest.us.sentry.io/4511802776748032` |
| `apps/widgets-api` | `876-widgets-api` | `https://b4507723864a778a1097eeeb587816ae@o4507681618591744.ingest.us.sentry.io/4511802776944640` |

FastAPI DSNs (for `.env.example` documentation only — see §4):

| Service            | DSN                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| `apps/api`         | `https://5eae615bbf71103685497986d2abd604@o4507681618591744.ingest.us.sentry.io/4511802778648576` |
| `apps/billing-api` | `https://dba9d550a8121922a3021288456f4569@o4507681618591744.ingest.us.sentry.io/4511802778910720` |
| `apps/storage-api` | `https://ea3e9c5ced00db2aace0995f19b01710@o4507681618591744.ingest.us.sentry.io/4511802779238403` |

**A Sentry DSN is a public identifier, not a credential** — it is designed to
ship inside browser bundles. Committing it to `wrangler.jsonc` `vars` is correct
and intended. Do **not** treat it as a secret or route it through
`wrangler secret put`.

## 1. The DSN split — read this before writing any config

`NEXT_PUBLIC_*` variables are **inlined by Next.js at build time**. Workers
Builds does not inherit runtime Worker vars into the build, so a
`NEXT_PUBLIC_SENTRY_DSN` declared only in `wrangler.jsonc` `vars` will **not**
reach the browser bundle.

Server-side code, by contrast, reads `process.env` at runtime inside the Worker,
where OpenNext exposes the Worker's `vars`.

So use **two** variable names, and wire each to the side that can actually see it:

- **`SENTRY_DSN`** — runtime, server/edge. Set in `wrangler.jsonc` `vars`.
  This is what makes the Error 1101 capture work on the next deploy, with no
  dashboard configuration required.
- **`NEXT_PUBLIC_SENTRY_DSN`** — build time, browser. Also add to
  `wrangler.jsonc` `vars` for local/dev parity, but it only reaches the browser
  bundle when it is _also_ set as a **Workers Builds build variable** in the
  Cloudflare dashboard. Document that; do not pretend the var alone is enough.

Accordingly:

- `sentry.server.config.ts` and `sentry.edge.config.ts` →
  `dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN`
- client config (`sentry.client.config.ts` / `src/instrumentation-client.ts`) →
  `dsn: process.env.NEXT_PUBLIC_SENTRY_DSN`

Apply this DSN split to **all six** Next.js apps, including the three that
already have Sentry (`apps/876`, `apps/console`, `apps/billing`) — their server
configs currently read only `NEXT_PUBLIC_SENTRY_DSN`.

## 2. Add the SDK to the three apps missing it

`apps/couriers`, `apps/enterprise`, `apps/widgets-api`.

**Mirror `apps/console` exactly** — it is the reference implementation. Read
these before writing anything:

- `apps/console/package.json` (`@sentry/nextjs` version — match it)
- `apps/console/sentry.server.config.ts`
- `apps/console/sentry.edge.config.ts`
- `apps/console/sentry.client.config.ts`
- `apps/console/src/instrumentation.ts`
- `apps/console/src/instrumentation-client.ts`
- `apps/console/next.config.ts` (the `withSentryConfig(...)` wrapper, lines 1 and ~69)

Carry across **verbatim**, adjusting only the DSN source per §1:

- the `beforeSend` `scrubEvent` helper — it deletes `user.email`,
  `user.username`, `user.ip_address` and strips `Authorization`, `Cookie`,
  `Set-Cookie`, `x-internal-key`, `x-api-key`, `X-876-API-Key` from breadcrumb
  data. **This scrubbing is mandatory on every app.** Do not ship a config
  without it, and do not weaken it.
- `sendDefaultPii: false`
- `tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0`
- `export const onRequestError = Sentry.captureRequestError` in
  `src/instrumentation.ts` — this is what reports server-side route/RSC
  exceptions, i.e. the Error 1101 class.

`apps/widgets-api` is an OpenNext Worker like the others; treat it the same. If
its structure genuinely differs (no `src/` directory, no `next.config.ts`
export shape to wrap), adapt minimally and **say so in your report** rather than
forcing the console layout onto it.

## 3. Declare the vars in wrangler.jsonc

For each of the six Next.js apps, add to the existing `vars` block, using that
app's DSN from the table:

```jsonc
"SENTRY_DSN": "<dsn>",
"NEXT_PUBLIC_SENTRY_DSN": "<dsn>",
```

Do not touch any other key in `vars` — `API_URL`, `WIDGETS_API_URL`,
`BILLING_URL`, `BILLING_API_URL` and `BILLING_OAUTH_ISSUER` were fixed in a
previous PR and are correct.

Both `nodejs_compat` and a `compatibility_date` of `2025-08-16` or later are
required by the Sentry SDK on Workers (it needs `https.request`). Every app is
already on `2026-07-23` with `nodejs_compat` — **verify this per app and report
it, but change nothing** if already satisfied.

## 4. FastAPI services — documentation only, no code

`apps/api`, `apps/billing-api` and `apps/storage-api` are **already complete**:
each has `sentry-sdk[fastapi,sqlalchemy]>=2.0,<3` in `requirements.txt`, calls
`sentry_sdk.init(...)` in `main.py` gated on `settings.sentry_dsn`, and reads
`SENTRY_DSN` via `Field(validation_alias="SENTRY_DSN")` in `core/config.py`.

**Write no Python code.** Only ensure `SENTRY_DSN=` appears in each service's
`.env.example` with a short comment. These Workers are not deployed yet, so the
DSN gets set with `wrangler secret put` at deploy time.

## 5. Documentation

- Add `NEXT_PUBLIC_SENTRY_DSN=` and `SENTRY_DSN=` to every affected app's
  `.env.example` (do not touch `.env` — gitignored).
- In `docs/cloudflare.md`, extend the existing Workers Builds setup notes to
  state that `NEXT_PUBLIC_SENTRY_DSN` must be set as a **build variable** in the
  Cloudflare dashboard for browser-side error capture, and explain why
  (`NEXT_PUBLIC_*` is inlined at build time; runtime Worker vars are not visible
  to the build). Keep it to a short paragraph or table row in the existing
  style — do not restructure the document.

## Constraints

- Do not create Sentry projects, run `@sentry/wizard`, or call the Sentry API —
  the projects exist and the DSNs above are authoritative.
- Do not add `@sentry/cloudflare`. The official Sentry guide for Next.js on
  Cloudflare Workers uses `@sentry/nextjs` plus `nodejs_compat`; a second SDK
  would double-instrument.
- Do not add source-map upload / `SENTRY_AUTH_TOKEN` wiring in this change.
- Do not change `open-next.config.ts` in any app.
- Do not weaken or skip the PII scrubbing described in §2.
- Do not commit. The orchestrating agent stages and commits.

## Verification (all must pass; report each)

```bash
# 1. Every Next.js app has the SDK
for a in 876 console billing couriers enterprise widgets-api; do
  printf "%-14s " "$a"; grep -q '@sentry/nextjs' apps/$a/package.json && echo OK || echo MISSING
done

# 2. Every Next.js app declares both DSN vars
for a in 876 console billing couriers enterprise widgets-api; do
  printf "%-14s " "$a"
  grep -q 'SENTRY_DSN' apps/$a/wrangler.jsonc && echo OK || echo MISSING
done

# 3. Server configs prefer the runtime var
grep -l 'process.env.SENTRY_DSN' apps/*/sentry.server.config.ts

# 4. Install, typecheck, lint, test the changed apps
pnpm install
pnpm --filter @876/couriers typecheck && pnpm --filter @876/enterprise typecheck
pnpm --filter @876/console typecheck && pnpm --filter @876/app typecheck
pnpm --filter @876/couriers test
pnpm --filter @876/console test

# 5. Formatting
pnpm exec prettier --check "apps/**/*.{ts,tsx,jsonc,json}"
```

`pnpm install` will change `pnpm-lock.yaml` — that is expected and correct here
because dependencies genuinely change. Report the lockfile as modified.

Report: which files you created vs edited per app, any app whose structure
forced a deviation, and the result of every verification command.
