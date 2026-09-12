# Invoice payment history and next actions

## Task status

1. Complete — invoice serialization publishes `paymentAllocations` and `creditNoteAllocations` with the required discriminators. The mapping is invoice-only; credit notes retain their pre-existing `allocations` contract.
2. Complete — Payments received is an initially open, print-hidden accordion with a payment-count badge, the six requested columns, linked payment numbers, status badges, muted em-dash references, and the separate credit-note group.
3. Complete — collectible invoices render a print-hidden shared next-action panel. It uses the shared collectible-status set, links Record payment with the info variant, and includes a disabled Send reminder tooltip with no delivery mutation.
4. Complete — both hosts compose toolbar, next action, payments, then document. Both reuse their existing date/money formatting and loaded invoice data. Invoice leaves credit notes unlinked; Billing supplies its route builder.

## Test cases

- `apps/billing-api/src/modules/documents/__tests__/invoice-payment-history.test.ts`: 8 `it()` cases.
- `packages/billing/src/types/invoice.schema.test.ts`: 4 `it()` cases.
- `packages/billing-ui/src/panels/invoice-payments-panel.test.tsx`: 10 `it()` cases.
- `packages/billing-ui/src/panels/invoice-next-action-panel.test.tsx`: 2 `it()` cases.

## Changed files

- `apps/billing-api/src/modules/documents/documents.serializers.ts` — invoice-only allocation serialization; preserves credit-note allocation compatibility.
- `apps/billing-api/src/modules/documents/repositories/invoices/retrieve.ts` — retrieves non-reversed payment and credit-note allocations with the display fields.
- `apps/billing-api/src/modules/documents/__tests__/invoice-payment-history.test.ts` — allocation query/serialization regression tests, including credit notes.
- `packages/billing/src/types/invoice.ts` and `invoice.schema.ts` — invoice-detail payment-history contract and runtime schema.
- `packages/billing/src/types/invoice.schema.test.ts` — schema coverage for valid, empty, omitted, and malformed allocation rows.
- `packages/billing-ui/src/invoice-status.ts` — canonical collectible invoice-status set.
- `packages/billing-ui/src/panels/document-toolbar.tsx` — reuses and re-exports the canonical set.
- `packages/billing-ui/src/panels/panel-frame.tsx` — permits a React header node so the accordion trigger can live in the standard panel frame.
- `packages/billing-ui/src/panels/invoice-payments-panel.tsx` and test — accordion ledger panel and coverage.
- `packages/billing-ui/src/panels/invoice-next-action-panel.tsx` and test — reusable collectible-invoice action callout and coverage.
- `packages/billing-ui/package.json` — subpath exports for the new shared modules.
- Both invoice detail pages — identical shared-panel composition, with their existing permission and route differences only.

## Verification

- Passed: `pnpm --filter @876/billing-api typecheck`.
- Passed: `pnpm --filter @876/billing-api boundaries` — 635 modules / 2,037 dependencies, no violations.
- Passed: `pnpm --filter @876/billing-api test` — 108 files, 980 tests.
- Passed: `pnpm --filter @876/billing typecheck`.
- Failed, pre-existing: `pnpm --filter @876/billing test` — 2 failures in existing `documents.test.ts` and `recurring-invoices.test.ts`. Both supply minimal invoice stubs to the strict `InvoiceDetailSchema`; `git show HEAD:packages/billing/src/resources/invoices.ts` confirms retrieve already used that schema before this work.
- Passed: `pnpm --filter @876/billing-ui typecheck`.
- Passed: `pnpm --filter @876/billing-ui test` — 57 files, 545 tests. Test environment also logs four pre-existing `Not implemented: navigation to another Document` notices.
- Passed: `pnpm --filter @876/invoice-app typecheck`.
- Passed: `pnpm --filter @876/billing-app typecheck`.
- `pnpm --filter @876/billing-api lint` exited 0 with three pre-existing unused-argument warnings in `src/http/errors.ts` and Zoho error handling. The new serializer warning was removed.
- `node scripts/check-app-structure.mjs` reported an unrelated existing violation: `apps/console/src/components/shell/sidebar.tsx: ConsoleHome` (`app-name-symbol-prefix`).
- Passed: `git diff --check`; review found no `as any`, `eslint-disable`, or `@ts-ignore` in the implementation files.

## Open decisions

None. The count badge intentionally counts payments only; credit notes remain their separately labelled applied-credit group.
