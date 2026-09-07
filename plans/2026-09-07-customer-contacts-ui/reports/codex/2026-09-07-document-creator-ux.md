# Document creator UX report

## Files changed

- `apps/billing-api/src/modules/customers/customers.schemas.ts`
- `apps/billing-api/src/modules/customers/customers.repository.ts`
- `apps/billing-api/src/modules/customers/customers.controller.ts`
- `apps/billing-api/src/modules/catalog/catalog.schemas.ts`
- `apps/billing-api/src/modules/catalog/catalog.controller.ts`
- `apps/billing-api/src/modules/catalog/catalog.service.ts`
- `apps/billing-api/src/modules/catalog/repositories/items/list.ts`
- `packages/billing/src/resources/customers.ts`
- `packages/billing/src/resources/items.ts`
- `packages/billing/src/types/customer.ts`
- `packages/billing/src/integration/resources/customers.ts`
- `packages/billing/src/integration/resources/items.ts`
- `packages/billing/src/integration/types/customer.ts`
- `packages/billing/src/integration/types/item.ts`
- `packages/ui/src/components/searchable-select.tsx`
- `packages/billing-ui/src/document/document-line-items-editor.tsx`
- `packages/billing-ui/src/document/document-line-items-editor.test.tsx`
- `apps/invoice/src/features/documents/components/document-create-form.tsx`
- `apps/invoice/src/app/(app)/invoices/new/page.tsx`
- `apps/invoice/src/app/(app)/quotes/new/page.tsx`

## Test count

No new `it()` cases were added. The edited line-editor test file contains 45 existing cases; three were adapted to the searchable control.

## Verification

- `pnpm --filter @876/billing-api typecheck` — passed.
- `pnpm --filter @876/billing-api boundaries` — passed: `no dependency violations found (508 modules, 1573 dependencies cruised)`.
- `pnpm --filter @876/billing-ui typecheck` — passed before the final test assertion adaptation.
- `pnpm --filter @876/invoice-app typecheck` — passed.
- `pnpm --filter @876/billing-ui exec vitest run src/document/document-line-items-editor.test.tsx` — passed: 45 tests.
- `pnpm --filter @876/billing-api lint` — could not run: ESLint fails configuration discovery with `Pages directory cannot be found ... apps/billing-api/pages or .../src/pages`.
- Full test commands were started, but the tool time limit ended them before final aggregate results. `@876/billing-ui` exposed pre-existing `customer-contact-form` failures and the line-editor assertions changed by this work; the latter were updated but not rerun after the final adaptation.

## Recipient details

The existing recipient component is private to Billing's document-create form. Invoice has a materially different, minimal customer option shape, so it needs to be promoted/shared before it can be used without creating a second component. That was not completed.

## Incomplete scope

The requested debounced browser search, cancellation, recipient-detail parity, form cleanup, cursor pagination for items, and the requested minimum 24 new tests are not complete. The current changes add server-side `q` filtering and bounded item/customer initial requests, make the shared selector capable of reporting search input/loading/error state, and give Invoice the catalogue Item column.
