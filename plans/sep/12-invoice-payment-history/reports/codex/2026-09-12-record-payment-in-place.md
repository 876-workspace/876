# Record payment in place

## Status

Completed.

- Invoice app: added `/invoices/[invoiceId]/payments/new` as an invoice-detail
  child route. It authorizes `payments.create`, resolves the invoice number,
  prefills the existing received-payment form, and returns to the invoice after
  either save or cancel.
- Billing app: added the matching invoice-detail child route using the existing
  `payments:write` gate and the same return behavior.
- Both invoice detail pages now supply one `recordPaymentHref` to both the
  toolbar action and next-action panel: `/invoices/<id>/payments/new`.
- Payment option loading is shared with each app's existing `/payments/new`
  page. No payment form or form fields were added.

## Tests added or updated

| File | `it()` cases | Coverage |
| --- | ---: | --- |
| `apps/invoice/src/app/(app)/invoices/[invoiceId]/payments/new/page.test.tsx` | 4 | Invoice prefill, refusal before data loading, number-based title, invoice return destination. |
| `apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/payments/new/page.test.tsx` | 4 | Invoice prefill, refusal before data loading, number-based title, invoice return destination. |
| `apps/invoice/src/app/(app)/invoices/[invoiceId]/_components/invoice-actions.test.tsx` | 4 | Updated the record-payment link expectation. |
| `apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/_components/invoice-actions.test.tsx` | 6 | Updated the record-payment link expectation. |

## Files changed

- `apps/invoice/src/app/(app)/invoices/[invoiceId]/payments/new/page.tsx` and
  `apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/payments/new/page.tsx`:
  nested detail-column payment entry routes.
- `apps/invoice/src/features/payments/payment-form-data.ts` and
  `apps/billing/src/features/payments/payment-form-data.ts`: each app's shared
  server-side payment form options loader, used by both the standalone and
  invoice-nested create routes.
- `apps/invoice/src/app/(app)/payments/new/page.tsx` and
  `apps/billing/src/app/(app)/(sales)/payments/new/page.tsx`: reuse the shared
  option loader.
- `apps/billing/src/app/(app)/(sales)/payments/[paymentId]/edit/page.tsx`:
  follows the relocated Billing loader.
- `apps/billing/src/app/(app)/(sales)/payments/_lib/form-data.ts`: removed after
  relocating its shared behavior to the payments feature.
- `apps/invoice/src/features/payments/components/payment-received-form.tsx` and
  `apps/billing/src/features/payments/components/payment-form.tsx`: accept an
  optional return destination so the existing shared form returns to its
  composing invoice route after save or cancel.
- Both invoice detail pages and `invoice-actions` components/tests: make the
  detail page the sole owner of `recordPaymentHref`.

## Verification

All requested typechecks and package tests passed:

```text
pnpm --filter @876/invoice-app typecheck
$ tsc --noEmit

pnpm --filter @876/invoice-app test
Test Files  82 passed (82)
Tests  533 passed (533)
Duration  42.96s

pnpm --filter @876/billing-app typecheck
$ tsc --noEmit

pnpm --filter @876/billing-app test
Test Files  102 passed (102)
Tests  940 passed (940)
Duration  45.95s

pnpm --filter @876/billing-ui typecheck
$ tsc --noEmit

pnpm --filter @876/billing-ui test
Test Files  57 passed (57)
Tests  545 passed (545)
Duration  52.96s
```

Targeted new-route tests also passed independently: 4/4 in Invoice and 4/4 in
Billing.

`node scripts/check-app-structure.mjs` exited non-zero solely for the stated
pre-existing violation:

```text
app-structure: 1 violation(s)

  app-name-symbol-prefix (1)
    - apps/console/src/components/shell/sidebar.tsx: ConsoleHome
```

`git diff --check` passed. No commits, branches, pushes, or pull requests were
created.

## Not verified

No browser end-to-end flow was run. The route and wrapper contracts are covered
by component/page tests; the requested typechecks and package suites passed.
