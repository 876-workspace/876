# Brief: record a payment without leaving the invoice

Repo root `/root/projects/876`, branch `feat/document-sharing-options`.
**Do not commit, push, branch, or open a PR.**

Read first and treat as binding: `.claude/rules/ai-code-quality.md`,
`.claude/rules/app-layout.md` (§5a list/detail split view — this is the core
rule here), `.claude/rules/app-structure.md`, `.claude/rules/data-loading.md`,
`.claude/rules/finance-app-parity.md`, `.claude/rules/testing.md`,
`.claude/rules/code-style.md`. No `as any`, no `eslint-disable`, no
`@ts-ignore`, no server actions, no barrel `index.ts`, no new dependency.

## The gap

Today "Record payment" on an invoice navigates to `/payments/new`, which throws
the user out of the Invoices section entirely. The reference product keeps them
in place: the detail column swaps to a form titled **"Payment for INV-000001"**
while the invoice list stays beside it.

## What already exists — reuse it, do not rebuild it

`@876/billing-ui/payment-received-form` (`PaymentReceivedForm`) already does
everything the form needs: it prefills customer and currency from the invoice,
**defaults the amount to that invoice's `amountDue`** so a partial payment is
just an edit (`payment-received-form.tsx:135`), supports bank charges, and
allocates to the invoice. Both apps already wrap it —
`apps/invoice/src/features/payments/components/payment-received-form.tsx` is the
reference wrapper.

**Write no new form and no new field set.** This task is routing and
composition only.

## Task

Add a route in each app that renders that existing form inside the invoice
detail column:

- `apps/invoice/src/app/(app)/invoices/[invoiceId]/payments/new/page.tsx`
- `apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/payments/new/page.tsx`

Requirements:

- Title the surface after the invoice, e.g. `Payment for INV-000003` — resolve
  the real invoice number, do not print the id.
- It renders **in the detail column**, so the invoice list beside it stays
  mounted. Follow §5a: the section's `layout.tsx` owns the shell; this is
  another route below it, not a new `Page` with its own breadcrumb.
- Load the same option data `/payments/new` already loads (customers, bank
  accounts, payment modes, currencies, open invoices) via the existing server
  helpers. Do not duplicate that loading logic — if it is worth sharing between
  the two routes, extract it once to the app's `_lib`/`src/lib` and have both
  call it.
- Prefill from the invoice in the URL.
- Authorize with the app's existing `payments.create` / `payments:write` check,
  matching how `/payments/new` does it today.
- On success, return to the invoice (`/invoices/<id>`) so the new payment shows
  in the Payments received accordion. On cancel, the same.
- Point the invoice's `recordPaymentHref` at this new route in both apps —
  `invoice-actions.tsx` and the next-action panel both feed off it, so change it
  in the one place that supplies it rather than in two.

Out of scope: Save-as-Draft payments, online payment gateways, and the
TDS/"Tax deducted?" field (Indian withholding tax — irrelevant here).

## Tests

Minimum 4 `it()` per app route covering: the form renders with the invoice
prefilled; an unauthorized principal is refused; the invoice number is used in
the title; and the cancel/success destination is the invoice. Follow the
existing page tests beside `/payments/new` for style and mocking.

## Verify, in the foreground, and report real output

```
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/billing-ui typecheck && pnpm --filter @876/billing-ui test
node scripts/check-app-structure.mjs
```

`node scripts/check-app-structure.mjs` currently reports one **pre-existing**
violation, `apps/console/src/components/shell/sidebar.tsx: ConsoleHome`. Leave
it; do not fix unrelated console code. `pnpm --filter @876/billing test` has two
**pre-existing** failures in `documents.test.ts` and `recurring-invoices.test.ts`
— verified against a clean tree. Do not chase them.

## Report

Write `plans/2026-09-12-invoice-payment-history/reports/codex/2026-09-12-record-payment-in-place.md`
with per-task status, **counted** `it()` cases per file, files changed and why,
real verification output, and anything you could not verify.
