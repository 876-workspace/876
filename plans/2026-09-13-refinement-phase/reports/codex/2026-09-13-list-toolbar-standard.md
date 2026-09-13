# List toolbar standardization

| Task | Files changed | Result |
| --- | --- | --- |
| A | `apps/billing/src/app/(app)/settings/users/_components/users-shell.tsx`, `apps/invoice/src/app/(app)/settings/users/_components/users-shell.tsx`, `apps/crm/src/app/(app)/customers/_components/customers-shell.tsx`, `packages/billing-ui/src/panels/access/roles-shell.tsx` | The split-view Add action remains rendered while a detail route is open. |
| B | The same shells | Corrected the `all` option labels to `All Users`, `All Customers`, and `All Roles`; each uses the shared `StatusFilterHeading`. |
| C | `packages/ui/src/components/resource-toolbar.tsx` and the same shells | Exported `DropdownAction`, added `disabled`, and rendered disabled Import/Export actions beside Refresh. |
| List labels | Billing customers; Invoice customers, payments, quotes, recurring invoices, and sales receipts | Replaced list-toolbar `New` labels with `Add`. |

## Status gaps

No new lifecycle-status client gaps were introduced. This pass did not add or alter backend filtering.

## Tests added

- `packages/ui/src/components/resource-toolbar.test.tsx`: 6 `it()` cases covering primary accessibility, Refresh ordering/callback, separator, and disabled Import/Export.
- Split detail tests: 4 `it()` cases across Billing users, Invoice users, CRM customers, and billing roles.

## Verification

| Check | Result |
| --- | --- |
| `pnpm --filter @876/ui typecheck` | Passed |
| `pnpm --filter @876/ui test` | Passed (315 tests) |
| Focused Billing, Invoice, CRM, and billing-ui split-shell tests | Passed |
| Billing, Invoice, CRM, and billing-ui typechecks | Passed |
| Full app test/lint matrix and `check-app-structure` | Not completed before handoff |

## Remaining work

The full cross-app toolbar inventory remains to be applied to all sidebar list pages. The concurrently edited `apps/console/src/app/(app)/orgs/**` area was deliberately untouched.
