# Sales Orders recovery report

Model: gpt-5.6-terra, medium effort.

## Recovered failures

- Billing API typecheck and boundaries pass. The existing recovery edits moved tax and quote-lock database work into repositories, added the missing Sales Receipt tax snapshots, and narrowed the update workflow result.
- The generated OpenAPI contract was retained. The authentication matrix count was corrected to 380 total / 379 protected operations: Sales Orders add nine routes, not ten.
- Billing SDK settings now recognizes `sales-orders` as Billing-only. Invoice detail parsing now includes nullable `salesOrderId`; invalid minimal retrieve fixtures were replaced with complete invoice-detail fixtures rather than weakening the schema.
- Quote conversion repository coverage was retained for the transaction lock query.

## Host and docs work

- Added a Billing Sales Orders route, product-owned proxy route, server facade/client methods, draft creation via the shared `DocumentLineItemsEditor`, detail status/actions, and accepted Quote to Sales Order action.
- Added the `sales-orders:read` route guard and `sales-orders:write` mutation guards. This is a partial host implementation: it does not yet satisfy the requested list/detail split, edit route, or A14 ten-host-test floor.
- Updated ADR 013 and mirrored commercial-platform rules (`cmp` passed).

## Verification observed

- `pnpm --filter @876/billing-api typecheck`: pass.
- `pnpm --filter @876/billing-api boundaries`: pass (687 modules, 2,226 dependencies).
- targeted API auth/conversion tests: pass (2 files, 9 tests).
- `pnpm --filter @876/billing test`: pass (41 files, 391 tests).
- `pnpm --filter @876/billing-app typecheck`: pass.
- `node scripts/check-app-structure.mjs`: pass.

Not run to completion in this recovery: the complete required verification matrix, migration diff, test-floor count audit, API lint/contract check, UI/core test suites, and host A14 tests. The full API suite previously also exposed unrelated flaky DocumentsService chaos tests (timeout/log-state leakage) and was not re-run after host work.

## Remaining risks

The Sales Orders host UI is incomplete relative to the brief; it should not be represented as finished. No commits were created.
