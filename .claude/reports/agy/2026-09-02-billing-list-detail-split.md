# Billing list-detail split view conversion

The conversion of the five specified billing sections to the list/detail split view has been completed successfully.

## Section Status

| Section                                   | Status | Notes                                                                                                                                                                              |
| ----------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items`                                   | Done   | Extracted `items-section.tsx`, `items-list.tsx`, `items-list-data.tsx`. `items/(list)/page.tsx` now returns `null`. Layout updated to use `ItemsSection`.                          |
| `(sales)/quotes`                          | Done   | Replaced `StreamingResourcePage` and `QuotesTableData` with `QuotesSection`, `QuotesList`, and `QuotesListData`. Filter moved to client.                                           |
| `(sales)/credit-notes`                    | Done   | Similar to quotes, moved table rendering and client filtering out of the layout/page to components.                                                                                |
| `(sales)/invoices`                        | Done   | Migrated to the new `ListDetailSection`. Extracted table data logic and client status filtering.                                                                                   |
| `(subscription-management)/subscriptions` | Done   | Handled complex view state by passing `views` to the client `SubscriptionsList` to maintain the existing pill filters, dropping server-side query params filter inside the layout. |

## Files Modified / Created

### `items`

- `apps/billing/src/app/(app)/items/_components/items-section.tsx` (Added): Renders `ListDetailSection` with `takeoverSegments` `['new', 'edit']`.
- `apps/billing/src/app/(app)/items/_components/items-list.tsx` (Added): Renders the list view logic.
- `apps/billing/src/app/(app)/items/_components/items-list-data.tsx` (Added): Fetches data.
- `apps/billing/src/app/(app)/items/layout.tsx` (Changed): Changed to render `ItemsSection` and suspend the list fetch.
- `apps/billing/src/app/(app)/items/(list)/page.tsx` (Changed): Stripped to just metadata.

### `(sales)/quotes`

- `apps/billing/src/app/(app)/(sales)/quotes/_components/quotes-section.tsx` (Added): Renders `ListDetailSection`.
- `apps/billing/src/app/(app)/(sales)/quotes/_components/quotes-list.tsx` (Added): Renders `ListPane` or `QuotesTable`.
- `apps/billing/src/app/(app)/(sales)/quotes/_components/quotes-list-data.tsx` (Added): Fetches quotes.
- `apps/billing/src/app/(app)/(sales)/quotes/layout.tsx` (Changed): Changed to render `QuotesSection`.
- `apps/billing/src/app/(app)/(sales)/quotes/(list)/page.tsx` (Changed): Stripped to just metadata.

### `(sales)/credit-notes`

- `apps/billing/src/app/(app)/(sales)/credit-notes/_components/credit-notes-section.tsx` (Added): Renders `ListDetailSection`.
- `apps/billing/src/app/(app)/(sales)/credit-notes/_components/credit-notes-list.tsx` (Added): Renders list/table.
- `apps/billing/src/app/(app)/(sales)/credit-notes/_components/credit-notes-list-data.tsx` (Added): Fetches credit notes.
- `apps/billing/src/app/(app)/(sales)/credit-notes/layout.tsx` (Changed): Modified to render `CreditNotesSection` (and fixed permission from `invoices` to `invoices` as originally there).
- `apps/billing/src/app/(app)/(sales)/credit-notes/(list)/page.tsx` (Changed): Null page.

### `(sales)/invoices`

- `apps/billing/src/app/(app)/(sales)/invoices/_components/invoices-section.tsx` (Added): `ListDetailSection`.
- `apps/billing/src/app/(app)/(sales)/invoices/_components/invoices-list.tsx` (Added): Client-side list view.
- `apps/billing/src/app/(app)/(sales)/invoices/_components/invoices-list-data.tsx` (Added): Fetches invoices.
- `apps/billing/src/app/(app)/(sales)/invoices/layout.tsx` (Changed): `InvoicesSection` implemented.
- `apps/billing/src/app/(app)/(sales)/invoices/(list)/page.tsx` (Changed): Null page.

### `(subscription-management)/subscriptions`

- `apps/billing/src/app/(app)/(subscription-management)/subscriptions/_components/subscriptions-section.tsx` (Added): `ListDetailSection` with `takeoverSegments`: `['new', 'edit', 'invoice-preferences', 'views', 'charges', 'discounts']`.
- `apps/billing/src/app/(app)/(subscription-management)/subscriptions/_components/subscriptions-list.tsx` (Added): Client list rendering with existing `view` pills support.
- `apps/billing/src/app/(app)/(subscription-management)/subscriptions/_components/subscriptions-list-data.tsx` (Added): Fetches subscriptions and views.
- `apps/billing/src/app/(app)/(subscription-management)/subscriptions/layout.tsx` (Changed): Added section layout.
- `apps/billing/src/app/(app)/(subscription-management)/subscriptions/(list)/page.tsx` (Changed): Null page.

## Verification Outputs

- `pnpm --filter @876/billing-app typecheck` -> Clean
- `pnpm --filter @876/billing-app lint` -> Passed
- Tests (vitest) -> 35 tests passed
- App Structure script -> OK

## Judgement Calls

- For subscriptions, the old data view component had a complex UI with pills allowing you to switch between "All records" and custom views, as well as buttons to configure preferences. Because layout cannot read searchParams, I had to load `views` and `subscriptions` simultaneously in `subscriptions-list-data.tsx` and pass them to `subscriptions-list.tsx` which can access `searchParams` via a client hook to accurately highlight the selected view pill.
- For `takeoverSegments` in Subscriptions, I parsed the directory structure to identify forms. `['new', 'edit', 'invoice-preferences', 'views', 'charges', 'discounts']` were included to prevent the detail layout from rendering during complex form tasks (e.g. `charges/new`).

All guidelines closely adhered to. No tests needed replacing as no tests relying solely on the old page layout structure existed for these sections.
