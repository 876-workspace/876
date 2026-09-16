# Sales Orders API and conversion test floors — pass 3

## Completed

- Added 12 assembled-Express/Supertest Sales Order route cases: missing credential, missing read permission, tenant-isolated missing order, non-draft update conflict, three create validation failures, status/customer list parameters, normalized create, confirm, and invoice conversion.
- Added 3 repository cases: status and customer predicates are asserted in the Sales Order `where` clause, and invoice-derived state uses exactly one batched invoice query for a multi-row page.
- Added 12 conversion workflow cases: 4 Quote → Sales Order cases (accepted-state gate, replayed duplicate conversion, snapshot copy, tenant isolation) and 8 Sales Order → Invoice cases (confirmed gate, tenant isolation, snapshot/tax copy, duplicate active invoice, void re-invoice, idempotent replay/claim completion, and discount snapshot preservation).
- Expanded the existing derived-financial-state case to assert OPEN, SENT, and OVERDUE map to `unpaid`; PARTIALLY_PAID maps to `partially-paid`; PAID maps to `paid`; and no invoice maps to `not-invoiced` plus null payment status.
- Matched Quotes' split-layout status behavior in Sales Orders: the selected `StatusFilterHeading` status filters the already-loaded list client-side. A Next layout does not receive search params and Quotes uses this same client-side filter; no direct app-to-API fetch or new proxy was introduced. Added 1 component case.
- Updated Phase 2 and Phase 4 checkboxes and the plan status.

## Counted `it()` cases

| Area | Existing | New | Total |
| --- | ---: | ---: | ---: |
| Sales Order API/persistence | 19 | 15 | 34 |
| Conversions | 0 | 12 | 12 |
| Sales Order status-filter UI | 0 | 1 | 1 |

## Defects found

None. The conversion and derived-status implementations already met the asserted contracts; no production code fix was required beyond matching the established Quotes client-side split-list filtering behavior.

## Verification

- PASS — `pnpm --filter @876/billing-api typecheck`
- PASS — `pnpm --filter @876/billing-app typecheck`
- PASS — `pnpm --filter @876/billing-api lint` (emits the existing Next pages-directory configuration notice)
- PASS — `pnpm --filter @876/billing-api boundaries` (691 modules, 2234 dependencies)
- PASS — `pnpm --filter @876/billing-api api:contract:check` (380 frozen / 380 Express operations; no mismatches)
- PASS — targeted Billing API tests: 5 files, 31 tests
- PASS — targeted Billing app tests: 2 files, 2 tests
- PASS — `git diff --check`
- NOT COMPLETED — full `@876/billing-api test` began and exposed two failures in the pre-existing `documents.service.chaos.test.ts` before the command window ended; this suite was already identified as flaky in pass 2 and is outside the Sales Order paths.
- NOT COMPLETED — full `@876/billing-app test` began but did not finish before the command window ended. Targeted affected app tests passed.

No Commerce-owned path was modified.
