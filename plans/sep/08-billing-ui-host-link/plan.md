# Implementation Plan: Remove `next/link` from `@876/billing-ui` via Host-Supplied Link

## Objectives

1. Create `packages/billing-ui/src/link.tsx` with `BillingUiLinkComponent`, `BillingUiLinkProvider`, and `Link`.
2. Export `./link` in `packages/billing-ui/package.json`.
3. Replace direct `next/link` imports across 11 `@876/billing-ui` components with `./link` (or relative paths for panels). Preserve all JSX.
4. Wire `BillingUiLinkProvider` with `next/link` into the provider composition of all three host apps:
   - `apps/billing/src/components/providers/providers.tsx`
   - `apps/invoice/src/components/providers/pwa-provider.tsx`
   - `apps/console/src/components/providers/providers.tsx`
5. Add boundary test ensuring no source files in `@876/billing-ui/src` import `next/link` (ignoring fixture in `src/panels/panel.test.ts`), plus unit tests for `Link` and `BillingUiLinkProvider` in `packages/billing-ui/src/link.test.tsx`.
6. Fix test count assertion in `plans/2026-09-07-invoice-lifecycle-hardening/plan.md:201` to reflect 34 direct `it()` calls plus 2 `it.each()` declaration sites (36 declaration sites total).
7. Verify all checks and tests pass across `@876/billing-ui`, `@876/billing-app`, `@876/invoice-app`, and `@876/console`.
8. Write verification report to `plans/2026-09-07-invoice-lifecycle-hardening/reports/codex/2026-09-08-billing-ui-host-link.md`.

## Proposed Changes

### `packages/billing-ui`
- `packages/billing-ui/src/link.tsx`: Context, provider, Link fallback, `'use client'`.
- `packages/billing-ui/package.json`: Add `"./link"` export.
- Update imports in:
  - `src/bank-accounts-grid.tsx`
  - `src/customer-contact-form.tsx`
  - `src/customers-table.tsx`
  - `src/invoice-lifecycle-actions.tsx`
  - `src/invoices-table.tsx`
  - `src/items-table.tsx`
  - `src/payments-table.tsx`
  - `src/panels/customer-contacts-panel.tsx`
  - `src/panels/customer-transactions-panel.tsx`
  - `src/panels/access/role-members-panel.tsx`
  - `src/panels/access/roles-list-panel.tsx`
- `packages/billing-ui/src/link.test.tsx`:
  - Unit tests for `Link` with and without `BillingUiLinkProvider`.
  - Boundary test walking all source files with regex parsing ensuring no `next/link` value imports.

### Host Applications
- `apps/billing/src/components/providers/providers.tsx`: Wrap children with `BillingUiLinkProvider` passing `Link` from `next/link`.
- `apps/invoice/src/components/providers/pwa-provider.tsx`: Wrap children with `BillingUiLinkProvider` passing `Link` from `next/link`.
- `apps/console/src/components/providers/providers.tsx`: Wrap children with `BillingUiLinkProvider` passing `Link` from `next/link`.

### Documentation Fix
- `plans/2026-09-07-invoice-lifecycle-hardening/plan.md`: Update line 201 count statement.

## Verification Plan
- `pnpm --filter @876/billing-ui typecheck`
- `pnpm --filter @876/billing-ui test`
- `pnpm --filter @876/billing-app typecheck`
- `pnpm --filter @876/billing-app test`
- `pnpm --filter @876/invoice-app typecheck`
- `pnpm --filter @876/invoice-app test`
- `pnpm --filter @876/console typecheck`
- `pnpm --filter @876/console test`
