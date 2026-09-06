# Phase 6b — 876 Invoice document create routes

Branch: `feature/finance-apps`. Do not create, switch, merge, or rebase a
branch. Do not commit — the orchestrator stages and commits.

## Why this exists

876 Invoice can list invoices and quotes but cannot create one. Billing can.
`.claude/rules/finance-app-parity.md`: a screen more than one 876 surface
renders is defined once in `@876/billing-ui`, and the hosts adapt it.

So Invoice gets `/invoices/new` and `/quotes/new` built on the **shared**
`DocumentLineItemsEditor`. Do not copy Billing's form, and do not write a
second line editor.

## Rules to read first

- `.claude/rules/finance-app-parity.md` — panels render, hosts fetch
- `.claude/rules/billing-data-plane.md` — money is minor units, never a float
- `.claude/rules/app-layout.md` — §1 pages over pop-ups, §10a form anatomy
- `.claude/rules/data-loading.md` — a form is a shell; one slow select must not
  hide the whole form
- `.claude/rules/app-api-routing.md` — product vocabulary, no service namespace
- `.claude/rules/sdk-conventions.md` — resource verbs, caller entrypoints
- `.claude/rules/testing.md`

## Verified premises — build on these, and check them

- `packages/billing/src/resources/invoices.ts` **has** `create`, `finalize`,
  `void`, `list`.
- `packages/billing/src/resources/quotes.ts` has **only** `list`. It needs
  `create`, and `createEstimatesResource` in the same file needs nothing.
- `apps/billing-api/src/modules/documents/documents.routes.ts:160-176` declares
  the quotes resource with `create` (`billing-billing_post_quotes`),
  `get`, `update`, `del`. So the backend route exists; only the SDK verb is
  missing. **Read that route and its schema before writing the SDK verb** —
  mirror the real request/response contract, do not invent one.
- Invoice reaches Billing through `@876/billing/integration`
  (`apps/invoice/src/lib/services/billing-integration.ts`), request-scoped.
- Invoice proxies browser resources through
  `apps/invoice/src/app/api/<resource>/[[...path]]/route.ts` +
  `apps/invoice/src/lib/api/resource-manifest.ts`. `invoices` is registered;
  `quotes` is **not**.
- Invoice has **no** `src/features/` directory yet.

## Scope — these files and no others

```
packages/billing/src/resources/quotes.ts
packages/billing/src/schemas*            (only what the quote create contract needs)
packages/billing/src/types*              (same)
apps/invoice/src/app/(app)/invoices/new/**
apps/invoice/src/app/(app)/quotes/new/**
apps/invoice/src/app/api/quotes/**
apps/invoice/src/lib/api/resource-manifest.ts
apps/invoice/src/features/documents/**   (new)
apps/invoice/src/lib/client/**
```

Do **not** touch `apps/billing/**`, `packages/billing-ui/**`, or
`packages/core/**`. Another agent is working in `apps/billing` concurrently.

## The shared editor's contract

`@876/billing-ui/document/document-line-items-editor` exports
`DocumentLineItemsEditor` and `DocumentLineDraft`. Invoice's needs are the
plain case: **pass no `items`, no `allowPercentageDiscount`, no
`priceListActive`**. A line is free text, quantity, rate, discount amount, tax.

Required props: `lines`, `onChange`, `formatAmount`. Use
`formatMinorUnits` from `@876/core/money` for `formatAmount`.

Gate submission on `onTotalsChange`: a snapshot of `{ status: 'invalid' }` must
block submit and render its `message`. Do not add a second validation path, and
do not recompute a total yourself — `@876/core/money` owns that arithmetic.

## What to do

1. **Add `create` to `createQuotesResource`**, mirroring `invoices.create`
   exactly in shape: `Request<QuoteCreated>` with `POST /api/v1/quotes`, a
   response schema, and typed params. Add the schema and types beside the
   existing quote ones.

2. **Register `quotes` as a proxied resource**: add it to `PROXIED_RESOURCES`
   and add `apps/invoice/src/app/api/quotes/[[...path]]/route.ts` copying the
   invoices route exactly (`createInvoiceResourceRoute('quotes')`).

3. **Build `apps/invoice/src/features/documents/`** with one shared form
   component both routes render, differing by a `kind: 'invoice' | 'quote'`
   prop that decides the title, the submit label, the endpoint, and the return
   URL. One form, not two.

4. **Build `/invoices/new` and `/quotes/new`** as server pages that resolve the
   Invoice context, load customers and items, and render the form.
   `data-loading.md` applies: the form's static fields render immediately; only
   a control genuinely waiting on data shows a loading state. Do not wrap the
   whole form in one Suspense fallback.

5. **Add the browser mutation client** under `apps/invoice/src/lib/client/`
   following the existing `customers.ts` / `items.ts` shape. Mutations go
   through the route handler; **no server actions**.

6. **Wire the toolbars.** `invoices/_components/invoices-toolbar.tsx` and
   `quotes/_components/quotes-toolbar.tsx` must point their Add button at the
   new routes. Per `app-layout.md` §10 the label is the bare verb `Add`.

## Verification (run these; report the real output)

```
pnpm --filter @876/billing typecheck
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

## Hard prohibitions

- No `eslint-disable`, no `@ts-ignore`, no `as any` (`as unknown as T` only for
  a genuine external mismatch, and say so in the report).
- No server actions.
- No second line-item editor, and no copy of Billing's form.
- Do not carry a money value as a JS `number`.
- Do not weaken production code to make a test easier.
- Do not commit. Do not touch `main`.
- If the quote create contract on the backend turns out to differ materially
  from what this brief assumes, **stop that step and report it** rather than
  inventing a contract.

## Tests — floor is 12 new `it()` cases

Cover, at minimum: the SDK `quotes.create` calls the right path with the right
body and schema; the form blocks submit while the totals snapshot is invalid
and shows the message; the form posts to the app's own `/api/<resource>` URL,
never a Billing origin; a validation failure keeps the entered values on screen
(`error-handling.md` — errors do not own the page); the quote and invoice
variants differ only in title/label/endpoint.

Count the cases and state the number.

## Report

Write `plans/2026-09-06-finance-apps-foundation/reports/codex/2026-09-06-invoice-document-create-routes.md`:
files changed and why, the counted new test number, verification output
verbatim, the real quote create contract you found, decisions the brief did not
settle, and anything you could not verify.
