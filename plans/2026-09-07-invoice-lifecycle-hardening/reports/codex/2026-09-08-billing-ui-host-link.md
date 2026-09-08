# Billing UI Host Link — Verification and Report

Date: 2026-09-08

## Outcome

All required changes and verification checks passed. Direct imports of `next/link` were removed from all eleven `@876/billing-ui` components and replaced with the package's new host-supplied `Link` component. `BillingUiLinkProvider` was wired into all three host applications (`apps/billing`, `apps/invoice`, `apps/console`). Unit tests and a strict import-boundary test were added to `@876/billing-ui`. The declaration count in `plans/2026-09-07-invoice-lifecycle-hardening/plan.md:201` was updated to the true count of 34 direct `it()` calls plus 2 `it.each()` declaration sites (36 declaration sites total).

## Verification Commands

| Command | Result | Test Counts / Details |
| --- | --- | --- |
| `pnpm --filter @876/billing-ui typecheck` | PASS | 0 errors |
| `pnpm --filter @876/billing-ui test` | PASS | 37 test files passed (37), 392 tests passed (392); 38.47s |
| `pnpm --filter @876/billing-app typecheck` | PASS | 0 errors |
| `pnpm --filter @876/billing-app test` | PASS | 84 test files passed (84), 859 tests passed (859); 60.16s |
| `pnpm --filter @876/invoice-app typecheck` | PASS | 0 errors |
| `pnpm --filter @876/invoice-app test` | PASS | 53 test files passed (53), 392 tests passed (392); 40.27s |
| `pnpm --filter @876/console typecheck` | PASS | 0 errors |
| `pnpm --filter @876/console test` | PASS | 173 test files passed (173), 1706 tests passed (1706); 218.92s |

Total tests executed and passing across the four suites: **3,349 tests** across **347 test files**.

## Files Changed

| File | Change & Rationale |
| --- | --- |
| `packages/billing-ui/src/link.tsx` | Created `BillingUiLinkComponent` type, `BillingUiLinkProvider` context provider, and `Link` fallback component. Marked `'use client'`. When provided, delegates to host-supplied component; otherwise falls back to standard `<a>`. |
| `packages/billing-ui/package.json` | Exported `"./link"` subpath matching the existing package subpath export convention. |
| `packages/billing-ui/src/bank-accounts-grid.tsx` | Replaced `next/link` import with `import { Link } from './link'`. |
| `packages/billing-ui/src/customer-contact-form.tsx` | Replaced `next/link` import with `import { Link } from './link'`. |
| `packages/billing-ui/src/customers-table.tsx` | Replaced `next/link` import with `import { Link } from './link'`. Retained `useRouter` from `next/navigation`. |
| `packages/billing-ui/src/invoice-lifecycle-actions.tsx` | Replaced `next/link` import with `import { Link } from './link'`. |
| `packages/billing-ui/src/invoices-table.tsx` | Replaced `next/link` import with `import { Link } from './link'`. |
| `packages/billing-ui/src/items-table.tsx` | Replaced `next/link` import with `import { Link } from './link'`. |
| `packages/billing-ui/src/item-stock.ts` | Handled optional inventory properties on `ItemStockState` so operator reads lacking inventory can render fallback. |
| `packages/billing-ui/src/payments-table.tsx` | Replaced `next/link` import with `import { Link } from './link'`. |
| `packages/billing-ui/src/panels/customer-contacts-panel.tsx` | Replaced `next/link` import with `import { Link } from '../link'`. |
| `packages/billing-ui/src/panels/customer-transactions-panel.tsx` | Replaced `next/link` import with `import { Link } from '../link'`. |
| `packages/billing-ui/src/panels/access/role-members-panel.tsx` | Replaced `next/link` import with `import { Link } from '../../link'`. |
| `packages/billing-ui/src/panels/access/roles-list-panel.tsx` | Replaced `next/link` import with `import { Link } from '../../link'`. |
| `packages/billing-ui/src/link.test.tsx` | Added 3 tests: (1) host-supplied link component rendering with props and data attributes, (2) fallback to plain `<a>` when provider is absent, and (3) boundary test parsing each import statement across all `src` files to verify zero `next/link` imports. |
| `apps/billing/src/components/providers/providers.tsx` | Provided `next/link` through `BillingUiLinkProvider` in `ThemeProvider`. |
| `apps/invoice/src/components/providers/pwa-provider.tsx` | Provided `next/link` through `BillingUiLinkProvider` in `PwaProvider`. |
| `apps/console/src/components/providers/providers.tsx` | Provided `next/link` through `BillingUiLinkProvider` in `ThemeProvider`. |
| `plans/2026-09-07-invoice-lifecycle-hardening/plan.md` | Corrected line 201 count statement from 35 literal `it()` declarations to "34 direct `it()` calls plus 2 `it.each()` declaration sites (36 declaration sites total)". |
| `plans/2026-09-08-billing-ui-host-link/plan.md` | Recorded the implementation plan for the host link refactoring. |

## Verification Limitations

None. All 8 verification commands were executed in the foreground and completed with 100% pass rates.

## Findings Not Fixed

- `packages/billing-ui/src/panels/panel.test.ts:76`: Contains a fixture string `"import Link from 'next/link'\nimport type { CustomerContact } from '@876/billing'"` used to test import parsing logic. Per the brief, this is fixture data and was intentionally left intact.
