# Brief — Couriers shipment notification emails

Repo `/root/projects/876`, branch `feature/transactional-email-platform` (already
checked out). Do NOT create/switch/merge branches. Do NOT commit. Do NOT edit the
lockfile.

## Goal

When a courier package changes status, email the customer. This is the second
consumer of the new 876 Communications service (the first is Billing invoices and
quotes — copy its shape).

## Rules you MUST read first, in this order

1. `.agents/rules/email.md` — the binding email standard. Read it completely.
2. `.agents/rules/express-api.md` — module/layer shape for `apps/couriers-api`.
3. `.agents/rules/error-handling.md` — expected failures are values.
4. `.agents/rules/testing.md` — the test standard.

Then read the **reference implementation** you are copying, read-only:
`apps/billing-api/src/lib/services/communications.ts` (the lazy service client)
and `apps/billing-api/src/modules/documents/document-email.service.ts` (how a
product service resolves recipient + template + sender and calls Communications
once).

## Scope — files you may create or edit

Only under `apps/couriers-api/`, plus the two seed/config files named below.
Do not touch `apps/communications-api/`, `packages/communications/`,
`apps/billing-api/`, `packages/billing/`, or any Next.js app.

## What to build

### 1. A lazy Communications service client for Couriers

Create `apps/couriers-api/src/lib/services/communications.ts` mirroring
`apps/billing-api/src/lib/services/communications.ts`. It must:

- construct the `@876/communications/service` client **lazily** on first use (the
  service must import without runtime secrets present — this is a Vercel build
  constraint, not a preference);
- read `COMMUNICATIONS_API_URL` and `COMMUNICATIONS_INTERNAL_KEY` through the
  couriers service **config module**, never `process.env` directly;
- be the only place in `apps/couriers-api` that knows Communications exists.

Add both variables to `apps/couriers-api/.env.example`. Mark neither optional —
they are required for notifications to work, but a **missing** configuration must
degrade per section 4 below rather than crash the service at boot.

### 2. Three notification categories

Add these template categories (durable kebab-case identifiers — do not invent
different spellings):

| Category              | Trigger (`PackageStatus` transition) |
| --------------------- | ------------------------------------ |
| `shipment-received`   | → `RECEIVED`                         |
| `shipment-ready`      | → `READY_FOR_PICKUP`                 |
| `shipment-delivered`  | → `COLLECTED`                        |

The enum lives at `apps/couriers-api/prisma/schema/package.prisma`. Only those
three transitions notify. `PRE_ALERT`, `IN_TRANSIT`, `ARRIVED` and `UNCLAIMED`
must **not** send email in this change.

Add the three system templates to the Communications seed the same way the
invoice/quote system templates were added — find that seed by grepping
`apps/communications-api` for the existing invoice/quote template seed and add
yours **to it**. That seed file is the one exception to the scope rule above: you
may edit only that file inside `apps/communications-api`, and nothing else there.

System templates must be currency-neutral and must not contain any customer PII
as literal text. Keep the copy short and factual.

### 3. The notification service

Create `apps/couriers-api/src/modules/packages/packages.notifications.ts`:

- One exported function per concern, called from the existing status-transition
  path in `apps/couriers-api/src/modules/packages/packages.service.ts`
  (`updatePackage`). **Read that function first** and hook in where the new status
  is known and the write has succeeded.
- Resolve the customer's email through the **existing** registry provider
  `apps/couriers-api/src/providers/billing/customers.ts`. Do not add a second
  customer lookup path and do not query another service's tables.
- Build an **explicit flat map of primitive variables** — no domain objects, no
  Prisma rows. At minimum: tracking number, package description, status label,
  branch name (when known), customer name, organization name. Every variable the
  template references must be present or the render fails; that is intended.
- Call Communications **once** per notification.
- Derive a **deterministic idempotency key** from the business event, so a retried
  transition cannot send a second email. Use the shape
  `couriers-<category>:<hash of { tenantId, packageId, category }>` and reuse the
  repo's existing idempotency hash helper — grep for `idempotencyHash` in
  `apps/billing-api` and use the equivalent already available to couriers rather
  than writing a second hashing implementation. If none exists in couriers,
  import the shared one from `@876/core`; only if that does not exist may you add
  one, and say so in your report.

**Idempotency subtlety you must get right:** the key must be stable for the same
(package, category) pair so a repeat transition into the same status does not
re-send. A package that goes `RECEIVED → IN_TRANSIT → RECEIVED` must NOT send a
second `shipment-received` email.

### 4. Failure must never break the package update

A notification is a side effect of a courier operation, not part of it.

- A failed or unconfigured send must **not** fail, roll back, or 500 the package
  update. The package status change is the user's actual operation and must
  succeed.
- A customer with no email address is a normal, expected state — skip silently at
  the domain level, but record the skip reason so it is observable.
- Do **not** swallow the failure into nothing: log it with the structured logger
  including the package id, tenant id, and the Communications error code.
  `.agents/rules/ai-code-quality.md` forbids converting an unexpected failure
  into a silent success.
- Do not use `after()`/fire-and-forget in a way that loses the error. Await the
  call and handle its `{ data, error }` result explicitly.

### 5. Tests — floor is 14 `it()` cases

In `apps/couriers-api/src/modules/packages/__tests__/` (match the existing test
layout there). Cover, at minimum:

1. `→ RECEIVED` sends with category `shipment-received` — assert the **exact**
   arguments passed to the Communications client, including the variable map.
2. `→ READY_FOR_PICKUP` sends `shipment-ready`.
3. `→ COLLECTED` sends `shipment-delivered`.
4. `→ IN_TRANSIT` sends **nothing** — assert `not.toHaveBeenCalled()`.
5. `→ PRE_ALERT` sends nothing.
6. `→ UNCLAIMED` sends nothing.
7. A transition to the **same** status the package already had sends nothing.
8. `RECEIVED → IN_TRANSIT → RECEIVED` produces the **same** idempotency key both
   times (assert the literal key equality).
9. Customer with no email: no send, package update still succeeds.
10. Communications returns an error: package update still succeeds, error is
    logged with the package id and the error code.
11. Communications client throws: package update still succeeds.
12. Missing `COMMUNICATIONS_API_URL` config: package update still succeeds, no
    unhandled rejection.
13. The variable map contains no Prisma row, no nested object, and no `undefined`
    value — assert the exact shape.
14. Cross-tenant: a package id from another tenant is not notifiable.

Assert exact call counts (`toHaveBeenCalledTimes(1)`), exact arguments, and both
sides of every `{ data, error }` result. `toBeDefined()` alone is not an
assertion. Do not mock the function under test.

## Verification — run in the foreground, one at a time

```bash
cd /root/projects/876
pnpm --filter @876/couriers-api typecheck
pnpm --filter @876/couriers-api lint
pnpm --filter @876/couriers-api boundaries
pnpm --filter @876/couriers-api test
```

All must pass, and the test count must go **up** by at least 14. Record the count
before and after.

## Hard prohibitions

- No `as any`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, or tsconfig
  relaxation. `as unknown as T` only for a real library mismatch, and say so.
- No provider (Resend) knowledge anywhere in `apps/couriers-api`. No API key.
- No new email tables, no template storage in couriers, no second send helper.
- Do not change `PackageStatus`, the package schema, or any existing route
  contract. This change is additive.
- Do not delete or skip an existing test.
- Do not commit, branch, or open a PR.

## Report

`plans/sep/15-transactional-email-platform/reports/codex/2026-09-16-couriers-shipment-notifications.md`
— task status, literal test count before/after, the final output of all four
commands, every file changed with a one-line reason, and anything you could not
do. A truthful "not done" beats a false claim.
