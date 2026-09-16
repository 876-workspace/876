# Implementation Plan: Invoice finance settings route-level tabs

- **Run ID:** `2026-09-07-invoice-finance-route-tabs`
- **Branch:** `feature/invoice-billing-finance-settings`
- **Status:** IN_PROGRESS

## Goal

Refactor the Invoice finance settings from a single tabbed client-state page (`/settings/finance`) into dedicated routes for each tab:
- `/settings/finance/currencies` (Currencies)
- `/settings/finance/payment-modes` (Payment modes)
- `/settings/finance/taxes` (Taxes)
- `/settings/finance` (redirects to the first accessible tab)

## User Request

> "https://5sg15cqw-3006.euw.devtunnels.ms/settings/finance let the tabbed pages render on different routes each, edit this only"

## Architecture & Layout

1. **Shared Layout (`apps/invoice/src/app/(app)/settings/finance/layout.tsx`)**:
   - Gated with `requireAppPermission('settings.view')`.
   - Resolves context and finance access using `getInvoiceContextResult()` and `resolveInvoiceFinanceAccess()`.
   - Determines readable tabs based on permissions:
     - `currencies:read` -> `/settings/finance/currencies`
     - `payments:read` -> `/settings/finance/payment-modes`
     - `taxes:read` -> `/settings/finance/taxes`
   - If no permissions held, renders `<FinanceAccessPage />` with page chrome and scoped error notice.
   - If authorized, renders `<Page>`, `<PageBreadcrumb>`, `<PageHeader>`, and `<RouteTabs>` (`@876/ui/route-tabs`) tab strip, with `{children}` below.

2. **Index Route (`apps/invoice/src/app/(app)/settings/finance/page.tsx`)**:
   - Resolves permissions and redirects to the first available tab route (`/settings/finance/currencies`, `/settings/finance/payment-modes`, or `/settings/finance/taxes`).
   - If no permissions held, returns `<FinanceAccessPage />`.

3. **Currencies Tab (`apps/invoice/src/app/(app)/settings/finance/currencies/page.tsx`)**:
   - Requires `currencies:read`.
   - Suspends data fetch for `billing.currencies.list()`.
   - Renders `<CurrenciesPanel>` (shared panel from `@876/billing-ui/panels/currency-settings-panel`).

4. **Payment Modes Tab (`apps/invoice/src/app/(app)/settings/finance/payment-modes/page.tsx`)**:
   - Requires `payments:read`.
   - Suspends data fetch for `billing.paymentModes.list()`.
   - Renders `<PaymentModesPanel>` (shared panel from `@876/billing-ui/panels/payment-mode-settings-panel`).

5. **Taxes Tab (`apps/invoice/src/app/(app)/settings/finance/taxes/page.tsx`)**:
   - Requires `taxes:read`.
   - Suspends data fetch for `billing.taxAuthorities.list()` and `billing.taxRates.list()` via `Promise.all`.
   - Renders `<TaxesPanel>` (shared panels from `@876/billing-ui`).

6. **Components (`apps/invoice/src/app/(app)/settings/finance/_components/finance-settings.tsx`)**:
   - Client wrappers for each panel (`CurrenciesPanel`, `PaymentModesPanel`, `TaxesPanel`) to manage actions (`client.*`) and router refresh.

## Verification

- `node scripts/check-app-structure.mjs`
- `pnpm --filter @876/invoice-app typecheck`
- `pnpm --filter @876/invoice-app test`
