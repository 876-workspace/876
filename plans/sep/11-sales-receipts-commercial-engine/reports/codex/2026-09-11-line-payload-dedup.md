# Sales receipt line-payload deduplication

## Completed

- Moved the canonical draft-line to create-payload conversion to `@876/billing-ui/document/document-line-payload`; Billing documents and Sales Receipt creation now call the same pure function.
- Deleted Billing's local `prepareDocumentLine` and the Sales Receipt form's `prepareLine`; `emptyDocumentLine` remains Billing-local.
- Moved all four existing line-payload tests and added five Sales Receipt-focused cases: percentage resolution, excessive amount discount, percentage above 100%, variant propagation, and grouped input parsing.
- Exported the existing customer-transactions `formatMinorAmount` and reused it from the sales-receipts accordion. Its currency-prefixed rendering is identical to the removed local function.
- Registered all 10 Express-only Sales Receipt / quote-conversion paths in Billing's post-legacy implementation inventory and added the `salesReceipts` root-client facade expectation.
- Replaced the obsolete Invoice `draft` filter test with the supported `void` filter, retaining five cases.
- Added five mocked-Prisma Payments Received isolation tests. They assert the exact `salesReceipt: { is: null }` filter for list/retrieve/update/cancel/apply and the 404 result for the ordinary mutations.

## Parser decision

`apps/billing/src/lib/format.ts` previously had a stricter parser than Billing UI. Per the orchestrator decision, the shared helper uses Billing UI's core-backed `parseMinorAmountInput` (`@876/core/money` `parseDecimalToMinorUnits`). This intentionally widens Billing document-create acceptance to grouping commas and leading/trailing decimal points; the API remains the final amount validator. The helper preserves its own `|| '0'` defaults, so blank discount, tax, and resolved-price defaults are unchanged. Test coverage pins `1,000.50` to `100050` at two decimal places.

## Files changed

- `packages/billing-ui/src/document/document-line-payload.ts` and `.test.ts` — shared pure mapper and its nine tests.
- `packages/billing-ui/package.json` — direct `document/document-line-payload` subpath export.
- `apps/billing/src/features/documents/document-create-model.ts` and `.test.ts` — removed the local mapper and its moved test file; retained `emptyDocumentLine`.
- `apps/billing/src/features/documents/components/document-create-form.tsx` and `packages/billing-ui/src/sales-receipt-create-form.tsx` — consume the shared mapper; removed duplicate Sales Receipt preparation.
- `packages/billing-ui/src/customer-transactions-accordions.tsx` and `customer-sales-receipts-accordion.tsx` — one exported/reused minor-amount formatter.
- `apps/billing/src/lib/api/contract-baseline.test.ts` and `src/lib/client/resources.test.ts` — repaired the implementation inventory and root client expectation.
- `apps/invoice/src/app/(app)/sales-receipts/_components/sales-receipts-list.test.tsx` — updated the no-longer-valid status case.
- `apps/billing-api/src/modules/payments/__tests__/payments.repository.test.ts` — Payments Received / Sales Receipt isolation coverage.

## Tests added or moved

- Moved: 4 `it()` cases from Billing's document-create model.
- Added: 5 Sales Receipt payload `it()` cases and 5 Payments Received isolation `it()` cases.
- Modified: 1 Invoice status-filter `it()` case; retained its suite's five-case count.

## Verification output

```text
$ pnpm --filter @876/billing-ui typecheck && pnpm --filter @876/billing-ui test
$ tsc --noEmit
Test Files  42 passed (42)
Tests  417 passed (417)

$ pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
$ tsc --noEmit
Test Files  90 passed (90)
Tests  875 passed (875)

$ pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
$ tsc --noEmit
Test Files  74 passed (74)
Tests  498 passed (498)

$ pnpm --filter @876/billing-api typecheck && pnpm --filter @876/billing-api boundaries && pnpm --filter @876/billing-api test
$ tsc --noEmit
✔ no dependency violations found (602 modules, 1917 dependencies cruised)
Test Files  87 passed (87)
Tests  769 passed (769)

$ node scripts/check-app-structure.mjs
app-structure: 1 violation(s)
app-name-symbol-prefix (1)
- apps/console/src/components/shell/sidebar.tsx: ConsoleHome

$ pnpm check:transpile
shared-ui-transpile: OK
check-tailwind-sources: OK
```

`check-app-structure` remains the only failed requested check; its Console sidebar violation is unrelated to this work. Nothing else remains incomplete.

## Out of scope

`apps/invoice/src/features/documents/document-create-model.ts` and its pre-existing divergent `toInvoiceLine` were deliberately left unchanged.
