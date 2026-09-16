# Implementation Plan: Console finance workspaces (Billing + Invoice)

- **Run ID:** `2026-09-02-console-finance-workspaces`
- **Branch:** `feature/console-finance-workspaces` (cut from `main` @ `fa0ad120`)
- **Status:** COMPLETED ✅

## Overview

876 CRM is fully reachable from Console's organization workspace
(`/orgs/<slug>/workspace/crm`): an operator opens the product as the
organization sees it. Billing and Invoice are the next apps to be built out, so
Console must reach the same depth for them now — and the shared UI must be the
same components the apps themselves render, so building a screen in Billing
builds it in Console at the same time.

Two concrete gaps today:

1. **The Billing/Invoice rails are short.** `resolveWorkspaceNavigation` walks
   only the registries' _top-level_ entries, and omits any entry Console has no
   page for. Billing therefore shows 4 of its 10 sections; Invoice shows 3 of 11.
2. **Customers and Payments tables are duplicated** between `apps/billing` and
   `apps/invoice` (near byte-identical), so Console cannot render either without
   writing a third copy — exactly what `shared-product-ui.md` forbids.

## Scope

Sections are added only where the Console operator client can reach **real
data**. A rail link to an empty placeholder is worse than no link, which is the
rule the existing resolver already encodes.

Reachable via `@876/billing/service` (integration): organizations, customers,
items, invoices, payments, paymentMethods, paymentIntents, paymentModes,
bankAccounts. Via `@876/billing/operator`: products, plans, prices,
subscriptions, stats.

**Not reachable, therefore out of scope:** quotes, estimates, credit notes,
sales receipts, vendors, expenses, payroll, time tracking, reports, settings.
They stay omitted from the rail until the owning service exposes them.

### Target rails

| Billing             | entry key        | Invoice             | entry key   |
| ------------------- | ---------------- | ------------------- | ----------- |
| Overview            | `home`           | Overview            | `home`      |
| Customers **(new)** | `customers`      | Customers **(new)** | `customers` |
| Items               | `items`          | Items               | `items`     |
| Invoices **(new)**  | `sales-invoices` | Invoices            | `invoices`  |
| Payments **(new)**  | `sales-payments` | Payments **(new)**  | `payments`  |
| Subscriptions       | `subscriptions`  |                     |             |
| Banking **(new)**   | `banking`        |                     |             |

Billing's `Accounts` placeholder is replaced by the real `Customers` screen; it
already bound to the `customers` entry key and rendered `EmptyWorkspaceView`.

## Key design decisions

1. **Extract, do not copy.** `CustomersTable` and `PaymentsTable` move into
   `@876/billing-ui` with the `baseHref` + `formatAmount` prop shape the already
   extracted `ItemsTable`/`InvoicesTable` established. Both apps then render the
   shared component; Console is the third host, not a third implementation.
2. **The rail resolves child entries too.** `sales-invoices` and
   `sales-payments` are children of the `sales` group entry, so
   `resolveWorkspaceNavigation` must match a section against child keys as well
   as top-level ones. This keeps each section gated by its own `requires`, which
   is what makes the org's feature rollout decide the rail.
3. **Console reads at the tier the capability lives at.** Customers, invoices,
   payments and bank accounts come from the service client; nothing new is added
   to a facade.

## Task checklist

- [x] Phase 1 — extract `CustomersTable`/`CustomersList` into `@876/billing-ui` (agy, gemini-3.8-flash-high)
- [x] Phase 2 — extract `PaymentsTable` and `BankAccountsGrid` into `@876/billing-ui`
- [x] Phase 3 — `resolveWorkspaceNavigation` matches child registry entries
- [x] Phase 4 — Console Billing: Customers, Invoices, Payments, Banking pages
- [x] Phase 5 — Console Invoice: Customers, Payments pages
- [x] Phase 6 — registry sections + icons + tests
- [x] Phase 7 — Console Couriers: Customers, Packages, Branches, Warehouses, Team
- [x] Verification, commits, PR

### Notes taken during the run

- **Payments were not a duplicate.** Billing renders payments as a list-pane and
  Invoice as a table, so the shared `PaymentsTable` was extracted from Invoice's
  copy; Billing's list-pane is a deliberate product difference and stays.
- **Banking carries no balance in Console.** The organization-scoped account
  list has no balance — Billing derives it from that account's bank
  transactions. `BankAccountRow.balance` is therefore optional, and Console
  leaves it unset rather than rendering a zero that would read as real.
- **The Console pages are factories, not copies.** Billing and Invoice are two
  products over one finance plane, so Customers/Invoices/Payments/Banking are
  the same screen with a different workspace segment. They live in
  `workspace/_components/finance-workspace-pages.tsx`, the way
  `createWorkspaceLayout` already handles the shell.

## Verification

```bash
pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/console typecheck
pnpm --filter @876/console test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/invoice-app typecheck
node scripts/check-app-structure.mjs
```

### Phase 7 — 876 Couriers workspace

The `agy` run for this phase (`gemini-3.1-pro-high`) stopped without a report,
having produced only the registry/icon edits and one row projection while
deleting both placeholder routes — leaving `app-workspaces.test.ts` failing on
five sections with no route. The orchestrator finished it; see
`reports/agy/2026-09-02-couriers-workspace-pages.md`.

- **Couriers is keyed by tenant, not organization**, so every screen resolves
  `couriers.tenants.retrieve({ organizationId })` first. `tenant/not-found` is a
  normal state (the org has never used Couriers) and renders an empty view; any
  other failure renders `AppError`.
- **Couriers rows carry no names.** A customer profile points at the registry
  party, a package points at a profile, and a team member points at a directory
  user. Each name is resolved by one page-wide list, never a retrieve per row.
- **`@876/couriers/admin` was missing its `Package` exports** — every sibling
  resource exported its serialized type and packages did not. Added to the
  barrel rather than restating the contract in Console.

## Verified result

Run on the finished branch (20 commits over `origin/main` @ `fa0ad120`), all in
the foreground:

| Command                                    | Result                             |
| ------------------------------------------ | ---------------------------------- |
| `pnpm --filter @876/billing-ui typecheck`  | clean                              |
| `pnpm --filter @876/billing-ui test`       | 71 passed (6 files)                |
| `pnpm --filter @876/console typecheck`     | clean                              |
| `pnpm --filter @876/console test`          | 1389 passed (140 files)            |
| `pnpm --filter @876/console lint`          | 0 errors, 21 pre-existing warnings |
| `pnpm --filter @876/billing-app typecheck` | clean                              |
| `pnpm --filter @876/invoice-app typecheck` | clean                              |
| `pnpm --filter @876/couriers typecheck`    | clean                              |
| `pnpm --filter @876/couriers test`         | 135 passed (12 files)              |
| `node scripts/check-app-structure.mjs`     | OK                                 |
| `pnpm check:transpile`                     | OK                                 |

## Handoff state

Complete. All seven phases landed and verified on
`feature/console-finance-workspaces`.

The `apps/api/src/seeds/` changes in the working tree (`internal-plan.ts`,
`internal-plan.test.ts`, `cli.ts`, `index.ts`, `plans.repository.ts`) belong to
a **different** work stream and are not part of this run — do not commit them
with it.
