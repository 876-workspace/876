# Brief: Quote lifecycle + edit/delete (876 Billing API, Billing app, Invoice app)

Branch `feature/customer-contacts-ui`. Do **not** commit — the orchestrator commits.

## Concurrency — read this first

Two other agents are working in this tree right now on **disjoint** file sets.

- **You own:** `apps/billing-api/src/modules/documents/**`,
  `packages/billing/src/{resources,types}/*quote*`,
  `apps/billing/src/app/(app)/(sales)/quotes/**`,
  `apps/invoice/src/app/(app)/quotes/**`,
  `apps/billing/src/lib/client/quotes.ts`, and the Invoice app's quote client.
- **You must NOT touch:** anything under `packages/billing-ui/`, anything under
  `customers/`, or anything under `invoices/`. If you believe a quote component
  should be shared in `@876/billing-ui`, **report it instead of doing it** — the
  orchestrator will promote it afterwards.

Pull before you start and again before you finish.

## Read first (binding)

`.claude/rules/express-api.md`, `.claude/rules/billing-data-plane.md`,
`.claude/rules/stripe-api-pattern.md`, `.claude/rules/app-layout.md`,
`.claude/rules/error-handling.md`, `.claude/rules/api-backend.md`,
`.claude/rules/testing.md`, `.claude/rules/ai-code-quality.md`.

## Verified premises (I checked these — build on them)

- `QuoteStatus` in `apps/billing-api/prisma/schema/enums.prisma:153` is
  `DRAFT | SENT | ACCEPTED | DECLINED | EXPIRED | CANCELED`. The statuses
  already exist.
- The quote HTTP surface is registered through the generic resource helper at
  `apps/billing-api/src/modules/documents/documents.routes.ts:162` and exposes
  **only** `list`, `get`, `create`, `update`, `del`. There is **no** send,
  accept, decline, cancel, or convert endpoint — that is the actual gap.
- Invoices in the same module already have the transition pattern to copy:
  `/invoices/:invoiceId/finalize` (line ~294) and `/invoices/:invoiceId/void`
  (line ~308). Mirror their route/controller/service/serializer shape exactly.
- `apps/billing/src/app/(app)/(sales)/quotes/[quoteId]/page.tsx` renders metric
  cards and a details list with **no actions at all**.

## Part 1 — backend transitions (`apps/billing-api`)

Add these tenant-tier routes beside the existing quote routes, each with
`permission: 'sales:write'`:

```
POST /quotes/:quoteId/send      DRAFT                  -> SENT
POST /quotes/:quoteId/accept    SENT                   -> ACCEPTED
POST /quotes/:quoteId/decline   SENT                   -> DECLINED
POST /quotes/:quoteId/cancel    DRAFT | SENT           -> CANCELED
```

Rules:

- The **service** owns the transition table. A transition from a status not in
  the allowed set returns a registered, client-safe error — not a 500 and not a
  silent no-op. Add the error codes to the owning catalog rather than restating
  a message at the call site (`.claude/rules/error-handling.md`).
- Set the matching timestamp column when one already exists on the model (the
  detail page reads `quote.acceptedAt`, so that column exists — check
  `apps/billing-api/prisma/schema/quote.prisma` for the full set and add a
  migration **file** only if a needed column is genuinely absent). Do **not**
  run `prisma migrate`; hand-write the SQL to the conventional migrations path
  and say so in your report.
- Transitions are idempotent-safe: re-sending an already-`SENT` quote returns
  the registered conflict error, not a duplicate side effect.
- `EXPIRED` is a time-derived state, not a user action — do **not** add an
  endpoint for it.
- **Do not implement convert-to-invoice.** It is a document-creation operation
  with snapshot and numbering consequences and is out of scope for this pass;
  note it in your report as deliberately deferred.
- Only a `DRAFT` quote may be updated or deleted. Enforce that in the service if
  it is not already enforced, and add tests proving a `SENT` quote cannot be.

Then add the four operations to `packages/billing/src/resources/quotes.ts` with
their types, following the file's existing shape and the standard verb rules in
`.claude/rules/sdk-conventions.md`.

## Part 2 — quote detail actions (both apps)

Give the quote detail record a real action set, in both `apps/billing` and
`apps/invoice`, matching each app's existing conventions. Read
`apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/_components/invoice-actions.tsx`
first and mirror its structure — that is the established pattern for this repo.

- Primary action varies by status: `Send` on a `DRAFT`, then `Accept` /
  `Decline` on a `SENT` quote. Use `variant="info"` for the primary
  (`app-layout.md` §9 — and **never** a green button).
- `···` dropdown: `Edit` (draft only), `Cancel` (draft/sent), separator,
  destructive `Delete` (draft only), last. Bare-verb labels only
  (`app-layout.md` §10).
- Destructive confirmations are `AlertDialog`; the multi-field edit is a
  **dedicated route**, never a dialog (`app-layout.md` §1).
- Disable, rather than hide, an action that is invalid for the current status,
  and give it a tooltip saying why — except `Delete` and `Edit`, which are
  absent entirely on a non-draft quote.
- Gate every affordance on the app's existing `sales:write` permission check.

## Part 3 — edit route (both apps)

`/quotes/[quoteId]/edit` in each app, reusing that app's existing quote **create**
form rather than writing a second one (`.claude/rules/ai-code-quality.md` — find
it under the app's `quotes/new/`). Extract shared field logic if and only if the
create page can then use it unchanged. Only a `DRAFT` quote is editable: a
non-draft quote's edit route redirects back to the quote.

A failed save keeps the form and its entered values mounted and renders the
error in place — never a toast, never a redirect on failure.

## Tests — minimum 26 `it()` cases total

Per `.claude/rules/testing.md`. Assert full shapes and exact call arguments; no
existence-only assertions.

- API service/routes (≥14): each of the four transitions from its legal source
  status; each from an illegal status returning the exact registered error code
  and status; update and delete rejected on a non-`DRAFT` quote; the permission
  guard rejecting `sales:read`; a serializer shape assertion per transition.
- SDK (≥4): each new method hits the exact path with the exact body and schema.
- App components (≥8, split across both apps): the action set rendered for
  `DRAFT` vs `SENT` vs `ACCEPTED`; delete and edit absent on a non-draft;
  a member without `sales:write` sees no mutating affordance; the edit route
  redirects for a non-draft quote.

Check each package's `vitest.config.ts` `environment` before writing a component
test.

## Verification (run and report real output)

```
pnpm --filter @876/billing-api typecheck && pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries && pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing typecheck
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
```

## Do not

Do not touch `packages/billing-ui/`, `customers/`, or `invoices/`. No
`eslint-disable`, `@ts-ignore`, or `as any`. No server actions. No new
top-level app `/api` route — both apps already proxy their document resources.
Do not run `prisma migrate` against any database. Do not commit or branch.

## Report

`plans/2026-09-07-customer-contacts-ui/reports/codex/2026-09-07-quote-lifecycle.md`
— files changed and why, migration SQL in full if any, the **counted** `it()`
total, real verification output, and everything you could not verify.
