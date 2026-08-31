# Brief — migrate Invoice and Couriers off the `@876/client` facade

Model: `gpt-5.6-sol`, `model_reasoning_effort=medium`.
Branch: `refactor/bounded-service-clients` (already checked out; do not branch, commit, rebase, merge, or open a PR).

These two apps are the **authority-sensitive** slice of the bounded-client
migration. Both compose several domains, and both currently hold a deliberate
per-request credential that must survive the refactor unchanged. Two other
agents are working in parallel on `apps/console` and on
`apps/{enterprise,876,billing}` — stay inside your own files.

## Context

ADR `docs/architecture/020-bounded-service-clients-and-application-bffs.md`
replaces the repo-wide `$876` facade with explicit bounded clients, and names
each entrypoint after the **caller principal**, not the credential:

| Principal     | Meaning                                                                         | Example entrypoint         |
| ------------- | ------------------------------------------------------------------------------- | -------------------------- |
| `session`     | a signed-in human                                                               | `@876/workspace/session`   |
| `service`     | a first-party 876 app                                                           | `@876/crm/service`         |
| `operator`    | 876 administering the platform, server-only                                     | `@876/platform/operator`   |
| `integration` | an app acting **for one organization that granted a connection**, scope-limited | `@876/billing/integration` |

`@876/account` is the signed-in Account (auth, me, sessions, OAuth grants,
mobile numbers). `@876/workspace/session` is one organization's own data at the
signed-in user's authority.

**`apps/crm` is the finished reference** — read
`apps/crm/src/lib/services/crm.ts` (lazy module singleton, static credential) and
`apps/crm/src/lib/services/workspace.ts` (request-scoped factory bound to the
signed-in user's access token). Reuse both shapes.

A module singleton must construct its client **lazily on first use**: OpenNext
imports every route module during the Cloudflare build, when runtime secrets are
deliberately absent, so reading a secret at module scope fails the build.

## The rule that matters most here

> **Never replace a user-scoped or organization-scoped call with an operator /
> internal-key client because it is more convenient.**

Both apps deliberately avoid holding privileged credentials. Downgrading that is
a silent privilege escalation that no test will catch. If a call genuinely
cannot be expressed at its current authority, **stop and report it** rather than
reaching for the internal key.

## `@876/core/platform` is NOT part of this migration — keep it

Both apps hold a fifth client you must leave alone:
`apps/invoice/src/lib/876/platform-client.ts` and
`apps/couriers/src/lib/876/platform-client.ts` construct
`create876PlatformClient` from **`@876/core/platform`** — the narrow, server-only
platform bootstrap client (`packages/core/src/platform/index.ts`).

It is already bounded, it is **not** `@876/client` / `@876/sdk` / `@876/admin`,
and it is **not** slated for deletion. It is the current and correct home of:

- geo — `countries.list()` and `regions.list(countryCode)`
  (`packages/core/src/platform/resources/geo.ts`), which
  `apps/couriers/src/lib/geo/resolve-region.ts` already calls through it;
- organization bootstrap — `POST /organizations/bootstrap`
  (`packages/core/src/platform/resources/orgs.ts:29`), used by both apps'
  onboarding.

So: **do not** try to find geo or `organizations.bootstrap` on
`@876/workspace/session` or `@876/platform/operator` — they are not there, by
design, and their absence is not a blocker. Keep each app's `platform-client.ts`
exactly as it is, and if it currently lives under `src/lib/876/`, move the file
to `src/lib/services/platform.ts` with its contents unchanged.

Your only target in these two apps is the `@876/client` / `@876/client/server`
facade. Nothing else.

## 1. `apps/invoice`

`apps/invoice/src/lib/876/index.ts` exports a **request-scoped**
`get876Client(organizationId)` that resolves the signed-in session, redirects to
`/login` when unauthenticated, threads `x-request-id`, and builds a Billing
transport bound to that caller. Alongside it sit `billing-config.ts`,
`billing-config.test.ts`, and `billing-integration.ts`.

**Invoice legitimately uses BOTH Billing boundaries today. Preserve both.**

- `apps/invoice/src/lib/876/billing-integration.ts` already uses
  `@876/billing/integration` with `INVOICE_API_876_KEY`. Leave that authority as
  it is.
- The `index.ts` facade binds the Billing **tenant** transport to the caller's
  access token. That one moves to the `@876/billing` **root** entrypoint
  (`create876Client` from `packages/billing/src/client.ts`), which is the tenant
  client and is the only one carrying `quotes`. Invoice's quote page keeps
  `GET /api/v1/quotes` at tenant authority.

Do **not** force the tenant calls onto `@876/billing/integration` — that
boundary has no `quotes` resource
(`packages/billing/src/integration/resources/` has none), and moving them would
change the authority contract. A previous attempt at this brief stopped here;
the answer is the tenant root, not the integration root.

Per `.claude/rules/product-api-boundary.md`, Invoice's _integration_ hop keeps
its existing model exactly:

- validate the Invoice user session **first**;
- authenticate the server-to-server hop **as the 876 Invoice product app**;
- call Billing's **integration** boundary under the active organization;
- authorization comes from the Invoice finance connection and the published
  Billing integration scopes — **not** from a Billing workspace member row, and
  **not** from an internal key.

So Invoice's Billing root is `@876/billing/integration`, request-scoped, keeping
the redirect-on-unauthenticated behaviour, the `organizationId` binding, and the
request-id propagation byte-for-byte. Account concerns move to `@876/account`;
any Core organization read moves to `@876/workspace/session`.

Keep `billing-config.ts` and its test working. If the config module has to move,
move its test with it and keep every assertion.

## 2. `apps/couriers`

`apps/couriers/src/lib/876/index.ts` composes four domains at three different
authorities:

| Today                               | Becomes                    | Authority to preserve             |
| ----------------------------------- | -------------------------- | --------------------------------- |
| `create876CouriersAdminClient`      | `@876/couriers/operator`   | server-only internal key          |
| `create876BillingIntegrationClient` | `@876/billing/integration` | org-scoped connection + scopes    |
| `create876StorageClient`            | `@876/storage/service`     | server-only                       |
| `createWidgetsClient`               | `@876/widgets/service`     | member/service transport as today |

Split these into one file per domain under `apps/couriers/src/lib/services/`.
It also has `platform-client.ts` and uses `getAccessToken()` — anything bound to
that token stays **request-scoped**, never a module singleton.

Couriers reads Core identity/organization data too. Route that through
`@876/workspace/session` where it is the signed-in user's own organization, and
through `@876/platform/operator` **only** where the existing code already used an
internal-key platform client. Do not change which of the two a given call uses.

`apps/couriers` has a root dynamic `/[orgSlug]` route and a reserved-slug guard
(`src/lib/reserved-slugs.ts`). Do not touch that logic or its test.

## Rules for both apps

- Delete each app's `src/lib/876/` **only** when nothing in that app imports it.
- **Do not create a replacement aggregator** — no `services` object, no `clients` barrel, no new `$876`-shaped thing. A module spanning domains imports several roots; that explicit dependency is the point of the architecture.
- Update `package.json` dependencies **and** `next.config.ts` `transpilePackages` together for every new `@876/*` package. These packages ship raw TypeScript; a missing `transpilePackages` entry does not fail the build — it fails in the browser at runtime as `Element type is invalid`.
- Do not change any request path, header, credential, auth tier, permission check, guard, or audit call.
- Keep browser code on same-origin app routes. No service origin, no `/v1`, no integration path, no server credential may reach browser code.

## Hard "do not"

- Do not touch `apps/console/**`, `apps/crm/**`, `apps/enterprise/**`, `apps/876/**`, `apps/billing/**`, or anything under `packages/**`. Other agents own those right now.
- Do not delete `packages/client`, `packages/sdk`, or `packages/admin` — a later pass does that.
- Do not add `eslint-disable`; do not use `as any` (`as unknown as T` only, with a comment saying why).
- Do not delete or skip a test. If a test mocks `@/lib/876`, re-point the mock at the specific root the code under test now uses and keep every assertion.
- Do not weaken a production signature to make a test easier.
- Do not hand-edit `pnpm-lock.yaml`. If a manifest changes, run `pnpm install --no-frozen-lockfile` — and if another agent is mid-install, wait and retry rather than running two at once.

## Verification — foreground, per app, and again at the end

```bash
pnpm --filter @876/invoice-app typecheck  && pnpm --filter @876/invoice-app test
pnpm --filter @876/couriers-app typecheck && pnpm --filter @876/couriers-app test
npx prettier --check "apps/{invoice,couriers}/**/*.{ts,tsx}"
grep -rn "@876/client\|lib/876" apps/invoice/src apps/couriers/src
```

Typecheck must be **0 errors**, not fewer errors. Record each app's test count
before and after — a green suite with fewer tests than it started with is a
failure. The final grep must return nothing.

Baselines measured on this branch: `apps/invoice` 10 files / 118 tests,
`apps/couriers` 72 files / 766 tests, **all passing, zero failures**. (An
earlier note claiming three pre-existing Couriers failures was wrong — they came
from a full-repo run under concurrent installs. Treat any failure as yours.)

## Report

Write `.claude/reports/codex/2026-08-30-invoice-couriers-client-migration.md`:
per app, the old composition root and the roots that replaced it; **the authority
each root carries and the evidence it is unchanged from before**; every file
changed with a one-line reason; the client lifetime chosen for each root and why;
`package.json` / `transpilePackages` entries added; test counts before and after;
the verbatim output of every verification command; and anything you could not do
at the correct authority, stated plainly rather than worked around.
