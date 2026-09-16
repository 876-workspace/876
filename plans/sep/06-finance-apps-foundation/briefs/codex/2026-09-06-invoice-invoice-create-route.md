# Phase 6c (corrected) — 876 Invoice's `/invoices/new`

Branch: `feature/finance-apps`. Do not create, switch, merge, or rebase a
branch. Do not commit — the orchestrator stages and commits.

## Read this first: the previous brief was wrong, and you were right to stop

A previous run of this task was told Invoice reaches Billing's **tenant**
routes and that adding a `quotes` proxy entry would work. It correctly refused,
because `apps/invoice/src/lib/api/resource-proxy.ts:48` builds
`['integrations','organizations',organizationId,resource,...path]`, and
`apps/billing-api` defines an integration base for `invoices` only
(`documents.routes.ts:428`). That refusal was verified and accepted.

**So quotes are out of scope here.** `/quotes/new` needs a new integration
route in `apps/billing-api`, which the orchestrator is handling separately
because it is an authorization-boundary change.

**Invoices are in scope and are buildable today**, which is the whole point of
this task.

## Verified premises

- `POST /integrations/organizations/:organizationId/invoices` exists
  (`apps/billing-api/src/modules/documents/documents.routes.ts:453-470`),
  guarded by the integration scope `billing.invoices.write`, with body
  `IntegrationInvoiceCreateSchema`
  (`apps/billing-api/src/modules/documents/schemas/invoice.ts:93` —
  `invoiceCreateSchema(true)`). **Read that schema and mirror it exactly.**
- `invoices` is already registered in
  `apps/invoice/src/lib/api/resource-manifest.ts`, and
  `apps/invoice/src/app/api/invoices/[[...path]]/route.ts` already proxies it.
  **You should not need to add a route or a manifest entry at all.**
- Invoice has **no** `src/features/` directory yet.
- `apps/invoice/src/lib/client/` holds the browser mutation clients
  (`customers.ts`, `items.ts`, `request.ts`) — follow their shape.
- `packages/billing-ui/src/document/document-line-items-editor.tsx` exports
  `DocumentLineItemsEditor`. Invoice wants the **plain** case: pass no `items`,
  no `allowPercentageDiscount`, no `priceListActive`.

## Rules to read first

- `.claude/rules/finance-app-parity.md`
- `.claude/rules/billing-data-plane.md` — money is minor units, never a float
- `.claude/rules/app-layout.md` §1, §10, §10a
- `.claude/rules/data-loading.md` — a form is a shell
- `.claude/rules/app-api-routing.md`
- `.claude/rules/error-handling.md` — errors do not own the page
- `.claude/rules/testing.md`

## Scope — these files and no others

```
apps/invoice/src/app/(app)/invoices/new/**
apps/invoice/src/app/(app)/invoices/_components/invoices-toolbar.tsx
apps/invoice/src/features/documents/**            (new)
apps/invoice/src/lib/client/**
```

Do **not** touch `apps/billing/**`, `apps/billing-api/**`,
`packages/billing-ui/**`, `packages/billing/**`, or `packages/core/**`.
Another agent is editing `apps/billing` concurrently, and the orchestrator is
editing `apps/billing-api`.

## What to do

1. **Build `apps/invoice/src/features/documents/`** with the create form. Take
   a `kind: 'invoice' | 'quote'` prop that decides title, submit label,
   endpoint and return URL — **but only wire and render the `'invoice'` case**.
   Shaping it for both now means `/quotes/new` is a page, not a rewrite, once
   its backend route lands. Do not create `/quotes/new`.

2. **Render `DocumentLineItemsEditor`** for the lines. Use `formatMinorUnits`
   from `@876/core/money` for `formatAmount`. Do not write a second line editor
   and do not copy Billing's form.

3. **Gate submit on `onTotalsChange`.** An `{ status: 'invalid' }` snapshot
   blocks submission and renders its `message`. No second validation path, and
   never recompute a total yourself — `@876/core/money` owns that arithmetic.

4. **Build `/invoices/new`** as a server page that resolves the Invoice context,
   loads customers and items, and renders the form. Per `data-loading.md` the
   static fields render immediately; only a control genuinely waiting on data
   shows a loading state. Do not wrap the whole form in one Suspense fallback.

5. **Add the browser mutation client** under `apps/invoice/src/lib/client/`,
   posting to Invoice's own `/api/invoices`. **No server actions.** The body
   must match `IntegrationInvoiceCreateSchema`; amounts are minor-unit
   integers.

6. **Point the toolbar's Add button at `/invoices/new`.** The label is the bare
   verb `Add` (`app-layout.md` §10).

7. **On failure, keep the form and its entered values on screen** and render
   the error beside the control or as a form-level notice — never a toast, and
   never an empty form (`error-handling.md`).

## Verification (run these; report the real output)

```
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

`pnpm --filter @876/invoice-app lint` already emits 3 pre-existing
`no-location-assign-relative-destination` warnings in files outside your scope.
Those are not yours; leave them. 0 errors is the bar.

## Hard prohibitions

- No `eslint-disable`, no `@ts-ignore`, no `as any` (`as unknown as T` only for
  a genuine external mismatch, and say so in the report).
- No server actions. No second line-item editor. No copy of Billing's form.
- Do not carry a money value as a JS `number`.
- Do not weaken production code to make a test easier.
- Do not commit. Do not touch `main`.
- If a premise above turns out to be false, **stop that step and report it**
  rather than inventing a contract. The last run did exactly that and it was
  the right call.

## Tests — floor is 12 new `it()` cases

Cover at minimum: submit is blocked and the message shown while the totals
snapshot is invalid; the client posts to `/api/invoices` and never a Billing
origin; the posted body matches the integration schema with minor-unit
integers; a rejected submission keeps the entered values on screen; the line
editor is the shared one (no local editor module exists); required-field
validation blocks the request entirely.

Count the cases and state the number.

## Report

Write `plans/2026-09-06-finance-apps-foundation/reports/codex/2026-09-06-invoice-invoice-create-route.md`:
files changed and why, the counted new test number, verification output
verbatim, decisions the brief did not settle, and anything you could not
verify.
