# Brief: Billing `customers.link` / `customers.unlink` (EXTERNAL ↔ CORE_USER)

## Context & why

Per `.claude/rules/customer-architecture.md` (read first — design authority):
an org's `EXTERNAL` customer (imported or hand-entered, no 876 account) may
later be linked to an 876 consumer account — e.g. the person buys a ticket or
enrolls with the courier and claims the relationship. Linking is a first-class
registry verb, never a hand-edit of `userId`. This task adds the primitive to
the Billing app (the org-customer registry of record).

Read `.claude/rules/sdk-conventions.md` (app-local service layering),
`.claude/rules/code-style.md`, `.claude/rules/types.md`,
`.claude/rules/testing.md` first, and study the existing
`apps/billing/src/lib/service/customers/` verbs (`create.ts`, `update.ts`,
`ensure.ts`, `delete.ts`, `import.ts`) plus their tests — match the house
patterns exactly (ServiceResult, `err`/`ok`, one file per verb, index
composition, route handler shape, client module shape).

## Scope (file boundaries — do not touch anything else)

`apps/billing/**` only. Do NOT touch `apps/api`, `packages/*`, `apps/couriers`,
or `.claude/rules`. Do NOT commit — the orchestrator commits.

## Service verbs

`apps/billing/src/lib/service/customers/link.ts`:

- `link(tenantId: string, customerId: string, params: { userId: string })`
  → `ServiceResult<...>` returning the house "customer updated"-style payload
  (match `update.ts`'s return shape).
- Rules:
  - customer must exist in the tenant (404 otherwise);
  - customer must be `customerType === 'EXTERNAL'` (422 with a clear message
    for CORE_USER/CORE_ORGANIZATION — already linked / org-typed);
  - `userId` must be a non-empty string; trim it (422 otherwise);
  - no other customer in the tenant may already reference that `userId`
    (409 — respect the `[tenantId, userId]` unique index; precheck for the
    friendly error, and also catch the P2002 race on write and map it to the
    same 409, mirroring how other verbs map constraint errors);
  - on success set `customerType: 'CORE_USER'`, `userId`, `coreSyncedAt: null`
    (forces the next snapshot refresh from the live 876 record),
    `updatedAt: now`.
- `unlink(tenantId, customerId)` in the same file or `unlink.ts` (prefer a
  separate file per the one-file-per-verb rule):
  - 404 if absent; 422 unless `customerType === 'CORE_USER'`
    (CORE_ORGANIZATION rows are provisioning-owned and must not be unlinked
    here);
  - sets `customerType: 'EXTERNAL'`, `userId: null`, `coreSyncedAt: null`.
    Snapshot identity fields (name/email/…) are retained as plain data.
- Compose both into `service.customers` via the index.

## Route handlers (pure transport, `customers:write`)

- `POST apps/billing/src/app/api/billing/customers/[customerId]/link/route.ts`
  — body `{ userId }`, Zod-validated (schema in `src/types/` per types.md —
  extend `src/types/customer.ts` or the closest existing contract file; do not
  inline exported schemas in the route).
- `POST .../[customerId]/unlink/route.ts` — no body.
- Both: `requirePermission('customers:write')`, call the service verb, map
  ServiceResult exactly like the import route
  (`app/api/billing/customers/import/route.ts`) does.

## Typed browser client

`apps/billing/src/lib/client/customers.ts`: add `link(customerId, { userId })`
and `unlink(customerId)` hitting `/api/v1/customers/{id}/link` / `/unlink`
(the `/api/v1` rewrite is the house convention — see existing methods).

## Tests (per `.claude/rules/testing.md` — mutation-resistant, exact shapes)

`link.test.ts` (+ unlink coverage) colocated with the service verbs, using the
house Prisma dynamic-ref mock pattern. Cover at minimum: happy link (full
returned shape + exact prisma update args), 404 missing customer, 422 already
CORE_USER, 422 CORE_ORGANIZATION, 422 empty/whitespace userId, 409 precheck
duplicate, 409 P2002 race path, happy unlink (exact update args:
customerType EXTERNAL, userId null, coreSyncedAt null), 422 unlink on
EXTERNAL, 422 unlink on CORE_ORGANIZATION. Assert both `data` and `error`
sides of every result.

## Verification (all must pass)

- `pnpm --filter @876/billing-app test`
- `pnpm --filter @876/billing-app typecheck` (check the actual script name in
  its package.json)
- `pnpm --filter @876/billing-app lint` — 0 errors (warnings pre-exist).

## Return shape

Report: files created/changed, decisions taken where the brief left latitude,
verification outputs (pass/fail counts), anything left out.
