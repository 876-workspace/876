# Brief — migrate Enterprise, 876 and Billing off the `@876/client` facade

Model: `gpt-5.6-terra`, `model_reasoning_effort=high`.
Branch: `refactor/bounded-service-clients` (already checked out; do not branch, commit, rebase, merge, or open a PR).

This is the **mechanical** slice of the bounded-client migration. Two other
agents are working in parallel on `apps/console` and on `packages/**`. Stay
inside your own files.

## Context

ADR `docs/architecture/020-bounded-service-clients-and-application-bffs.md`
replaces the repo-wide `$876` facade with explicit bounded clients:

- `@876/account` — the signed-in 876 Account: auth, current user, sessions, OAuth grants, mobile numbers.
- `@876/workspace/session` — one organization's own data at the signed-in user's authority.
- `@876/workspace/operator`, `@876/platform/operator` — 876 operator authority, server-only.
- `@876/billing/*`, `@876/widgets/*`, `@876/storage/*`, `@876/crm/*`, `@876/work/*`, `@876/couriers/*` — product domains, with the entrypoint naming the caller (`session` / `service` / `operator` / `integration`).

`@876/sdk` and `@876/admin` are already thin compatibility shims over
`@876/account` and `@876/platform`; prefer the new package names in anything you
touch.

**`apps/crm` is the finished reference.** Read `apps/crm/src/lib/services/crm.ts`
and `apps/crm/src/lib/services/workspace.ts` before you start. Note the two
lifetimes it uses, and reuse them:

- a **module singleton** where the credential is static (a server API key), constructed **lazily on first use** so OpenNext can import route modules during the Cloudflare build without runtime secrets present;
- a **request-scoped factory** where authority belongs to one request (a signed-in user's access token).

## Your three apps

### 1. `apps/enterprise` — 22 references, the largest

`apps/enterprise/src/lib/876/index.ts` is a **browser** client
(`'use client'`, `create876Client({ baseUrl: '/api' })`) pointed at the app's own
same-origin routes. It also has `server.ts` and `platform-client.ts`.

Split it by domain into `apps/enterprise/src/lib/services/`:

- account concerns (auth, me, sessions) → `@876/account`;
- organization concerns (orgs, memberships, members, locations, contacts, departments, invites, app assignments) → `@876/workspace/session`, at the signed-in user's authority.

Enterprise is org-tier, not operator-tier. **It must not acquire
`@876/platform/operator` or any internal-key credential.** If a call appears to
need one, stop and report it rather than granting it.

### 2. `apps/876` — 7 references

The consumer app. Almost everything here is account-tier → `@876/account`.

One deliberate exception exists and **must be preserved exactly**:
`apps/876/src/lib/auth/guards.ts` uses an internal-key admin client for session
bootstrap only (resolving the sealed cookie to the full user, features, routing
memberships). Keep that privileged path server-only and do not widen it, do not
move it into a shared root, and do not let the browser reach it.

### 3. `apps/billing` — 3 references

`apps/billing/src/lib/876/index.ts` composes a Billing **tenant** transport plus
a Widgets **member** transport. Replace it with explicit roots under
`apps/billing/src/lib/services/`. Keep the Billing call at tenant authority — the
signed-in Billing user's token, resolving `billing_active_org` exactly as today.
Do **not** substitute an operator/internal client for convenience.

## Rules for all three

- Delete each app's `src/lib/876/` **only** when nothing in that app imports it.
- **Do not create a replacement aggregator** — no `services` object, no `clients` barrel, no new `$876`-shaped thing. A module that spans domains imports several roots; that explicit dependency is the point.
- Update `package.json` dependencies **and** `next.config.ts` `transpilePackages` together for every new `@876/*` package an app uses. These packages ship raw TypeScript; a missing `transpilePackages` entry does not fail the build, it fails in the browser at runtime as `Element type is invalid`.
- Do not change any request path, credential, auth tier, permission check, guard, or audit call. This is a client-swap, not a behaviour change.
- Keep browser code on same-origin app routes. No service origin, no `/v1`, no server credential may reach the browser.

## Hard "do not"

- Do not touch `apps/console/**`, `apps/crm/**`, `apps/invoice/**`, `apps/couriers/**`, or anything under `packages/**`. Other agents own those right now.
- Do not delete `packages/client`, `packages/sdk`, or `packages/admin` — a later pass does that.
- Do not add `eslint-disable`; do not use `as any` (`as unknown as T` only, with a comment saying why).
- Do not delete or skip a test. If a test mocks `@/lib/876`, re-point the mock at the specific root the code under test now uses and keep every assertion.
- Do not weaken a production signature to make a test easier.
- Do not hand-edit `pnpm-lock.yaml`. If a manifest changes, run `pnpm install --no-frozen-lockfile` — and if another agent is mid-install, wait and retry rather than running two at once.

## Verification — foreground, per app, and again at the end

```bash
pnpm --filter @876/enterprise typecheck && pnpm --filter @876/enterprise test
pnpm --filter @876/app typecheck        && pnpm --filter @876/app test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
npx prettier --check "apps/{enterprise,876,billing}/**/*.{ts,tsx}"
grep -rn "@876/client\|lib/876" apps/enterprise/src apps/876/src apps/billing/src
```

Typecheck must be **0 errors**, not fewer errors. Record each app's test count
before and after — a green suite with fewer tests than it started with is a
failure. The final grep must return nothing.

Baselines measured on this branch: `apps/enterprise` 18 files / 358 tests,
`apps/876` 5 files / 30 tests. Measure Billing's yourself before you change it.

## Report

Write `.claude/reports/codex/2026-08-30-simple-app-client-migration.md`: per app,
the old composition root and the roots that replaced it; every file changed with
a one-line reason; the client lifetime you chose for each root and why; any
`package.json` / `transpilePackages` entry added; test counts before and after;
the verbatim output of every verification command; and anything you could not do,
stated plainly rather than worked around.
