# Brief: Customer portal Part 1 — tenant resolution, mailbox allocation, enrollment (implementation)

**Agent:** codex `gpt-5.6-sol`, high reasoning. **You may create/edit files in `apps/couriers` only. Do NOT commit, do NOT touch git, do NOT edit prisma schema files, do NOT run migrations, do NOT edit any other app or package.**

## Context (verified — do not re-explore)

`apps/couriers` (`@876/couriers`) is a multitenant courier SaaS (Next.js App Router, React 19, Prisma). We are adding the consumer-facing customer portal backend. Facts you can rely on:

- `Tenant` has `orgId`, `slug`, `mailboxPrefix: String?`, relation `domains` (`prisma/schema/tenant.prisma`). `Domain` has unique `hostname`, `verified`, `isPrimary` (`prisma/schema/schema.prisma:22-35`). Tenant creation seeds `${slug}.couriers.876.app` as verified primary (`src/lib/service/tenants/create.ts:23-31`).
- `service` singleton exports `{ tenants, customerProfiles }` (`src/lib/service/index.ts`). Existing verbs: `tenants.create/update/retrieve/retrieveBySlug/retrieveByOrgId/retrieveByHostname` (`src/lib/service/tenants/`), `customerProfiles.ensure/list/retrieveByTenantAndUser` (`src/lib/service/customer-profiles/`). `customerProfiles.ensure({ tenantId, userId, billingCustomerId, mailboxNumber })` atomically creates profile + primary mailbox but requires the caller to supply `mailboxNumber` (`ensure.ts:9-63`).
- `Mailbox`: `@@unique([tenantId, number])`, fields `customerId, tenantId, number, isPrimary, createdAt, updatedAt` (Unix seconds) (`prisma/schema/mailbox.prisma`).
- `Package`: `status: PackageStatus` (`PRE_ALERT → RECEIVED → IN_TRANSIT → ARRIVED → READY_FOR_PICKUP → COLLECTED/UNCLAIMED`), `mailboxId`, `customerId`, `tenantId`, `trackingNum`, `collectedAt`, etc. (`prisma/schema/package.prisma`). Zod contracts exist unused in `src/types/package.ts`.
- Billing: `getFinanceClient()` (`src/lib/finance/client.ts:3-14`) and `ensureSharedCoreUserCustomer(finance, organizationId, user: CoreUserSnapshot): Promise<IntegrationResult<BillingCustomer>>` (`src/lib/finance/customers.ts:28-84`) — looks up billing customer by core `user_id`, creates if absent, idempotent. Currently has no production caller.
- Session: `getAuthSession(): Promise<Session876Result<Current876Session>>`, `isSignedSession(...)` type guard (`src/lib/auth/session.ts:28-78`). Snapshot carries `userId`, identity fields (name/email), optional `realm`. Consumer-realm auth bridge already exists at `src/app/api/auth/[...path]/route.ts` (sets `X-876-Realm: consumer`).
- `ServiceResult` helpers live in `src/lib/service/result.ts` — read it and match how `tenants/create.ts` and `customer-profiles/ensure.ts` use it.
- `src/proxy.ts` is a pass-through with `matcher: []` — leave it alone. Tenant resolution happens server-side (Node runtime), not in the proxy.

## Rules you MUST follow (read these files first)

- `.agents/rules/sdk-conventions.md` — verb vocabulary (`create/retrieve/update/delete/list/search`, `retrieveBy<Key>`; NEVER `findBy*/getBy*/get()/find()`); app-local datastore layering: only `src/lib/service/**` may query `prisma` (from `@/lib/db`); one file per verb composed by index files; mutations return `ServiceResult`.
- `.agents/rules/code-style.md` — brace-less single-statement ifs, blank lines between concern groups, ternaries (applies to `src/lib/` and `src/app/api/`).
- `.agents/rules/types.md` — shared/exported contracts go in `src/types/` (PascalCase types, camelCase `...Schema` Zod).
- `.agents/rules/api-access.md` — no server actions; route handlers are thin: authorize → call service/lib → `{ data }` / `{ error }`, no business logic.
- Timestamps are Unix **seconds** everywhere.

## Deliverables

### 1. Portal tenant resolution — `src/lib/portal/tenant.ts`

`getPortalTenant(): Promise<Tenant | null>`, wrapped in `React.cache` for per-request dedup. Resolution order:

1. Read hostname from `headers()`: `x-forwarded-host` first, then `host`; strip port; lowercase.
2. Exact match via `service.tenants.retrieveByHostname(hostname)` — only accept when the matched domain row has `verified === true`; return its tenant.
3. Platform-subdomain parse: if hostname ends with `.` + `PORTAL_BASE_DOMAIN` env (default `couriers.876.app`), extract the leftmost label as slug → `service.tenants.retrieveBySlug(slug)`.
4. Dev override (Codespaces/local, where there is one forwarded hostname): only when `process.env.NODE_ENV !== 'production'`, read `PORTAL_DEV_TENANT_SLUG` env → `retrieveBySlug`. This branch must be unreachable in production builds.
5. Otherwise `null`.

Only return tenants with `status === 'ACTIVE'` (PENDING/SUSPENDED → treat as `null`; export a second helper `getPortalTenantAnyStatus()` ONLY if you find you need it — prefer not to).

### 2. `mailboxes` service resource — `src/lib/service/mailboxes/`

One file per verb + `index.ts`, exported from the service root (`service.mailboxes`):

- `allocate.ts` — `allocate(params: { tenantId: string }): ServiceResult<{ number: string }>`. Algorithm: load tenant (`mailboxPrefix`), compute prefix = `mailboxPrefix` (trimmed, uppercased) or `''` when null. Sequence: count existing mailboxes for the tenant, candidate = `1000 + count + 1` zero-padded to 4+ digits, number = `${prefix}${candidate}` (e.g. `RSJ1001`). Verify availability with a `findUnique` on `@@unique([tenantId, number])`; on collision increment and retry (bounded, e.g. 25 attempts) then fail with a service error. **This returns a candidate number only — it does not insert.** The insert happens inside `customerProfiles.ensure`'s existing transaction; the unique constraint is the final arbiter, so document that callers must retry allocation once if `ensure` fails with a unique-violation on mailbox number (P2002). Keep it simple — no new tables, no counters.
- `list.ts` — `list(params: { tenantId: string; customerId: string })` — reads, plain values.

### 3. `packages` service resource — `src/lib/service/packages/`

Portal reads only:

- `list.ts` — `list(params: { tenantId: string; customerId: string })`: packages for that customer, newest first (`createdAt` desc), include `carrier` and `branch` names if the relations make that cheap (check the generated client under `src/lib/db/generated/`), plus mailbox number.
- `retrieve.ts` — `retrieve(params: { tenantId: string; id: string })`: single package scoped by tenant; return `null` when not found. Caller enforces customer ownership.

Export from the service root.

### 4. Enrollment orchestration — `src/lib/portal/enroll.ts`

`ensurePortalCustomer(params: { tenant: Tenant; userId: string; email: string; firstName?: string | null; lastName?: string | null }): Promise<ServiceResult-shaped result>` (put the exact exported result type in `src/types/portal.ts`):

1. `service.customerProfiles.retrieveByTenantAndUser(tenant.id, userId)` — if found, return it (idempotent re-login path; do NOT touch billing again).
2. `getFinanceClient()` → `ensureSharedCoreUserCustomer(finance, tenant.orgId, coreUserSnapshot)`. Check `src/lib/finance/customers.ts` for the exact `CoreUserSnapshot` shape and build it from the params. On integration error, return a client-safe error (`portal/billing-unavailable` style code matching the app's existing error-code conventions — check `src/lib/errors`).
3. `service.mailboxes.allocate({ tenantId })` → on success call `service.customerProfiles.ensure({ tenantId, userId, billingCustomerId, mailboxNumber })`. If `ensure` fails with a mailbox unique violation, re-allocate and retry once.
4. Return the profile with its primary mailbox number.

### 5. Thin portal route handlers

- `src/app/portal/auth/complete/route.ts` (GET): mirror the structure of `src/app/auth/complete/route.ts` but for the portal: `getAuthSession()`; if not signed → redirect `/portal/login`. `getPortalTenant()`; if null → redirect `/portal/unavailable` (route can 404 for now — Part 2 adds the page; just redirect). Call `ensurePortalCustomer` with session identity. On success redirect to a sanitized relative `returnTo` (must start with `/portal`, default `/portal`); on error redirect to `/portal/login?error=enrollment`.
- `src/app/api/portal/packages/route.ts` (GET): session + tenant + `retrieveByTenantAndUser`; if no profile → 403 envelope; else `{ data: service.packages.list(...) }`. Follow the existing `{ data, error }` envelope conventions used by `src/app/api/manage/*` routes (read one first and match its error shape and status usage exactly).

### 6. Types

Portal contracts in `src/types/portal.ts` (result/type shapes used across lib/routes). Reuse `src/types/package.ts` types where they fit — do not duplicate.

## Explicitly out of scope (Part 2 / later — do not build)

Portal pages/UI, login/register pages, layout, warehouse address display, pre-alerts, package events history, proxy/hostname rewrites, prisma schema changes, changes to `packages/*`, `apps/api`, or other apps.

## Verification (run before finishing; fix what you break)

```bash
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers test
```

Both must pass. Do not write new tests (a separate test pass follows); do not delete or weaken existing tests.

## Return shape

Report: files created/changed with one-line purpose each; any deviation from this brief and why; the exact typecheck/test output tail proving green; open questions for the reviewer.
