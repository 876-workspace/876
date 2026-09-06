# Panel layer and customer-tab parity

## Changed files

- Added `packages/billing-ui/src/panels/` with the shared `PanelState`/`PanelProps` contract, seven customer panels, panel chrome/skeleton helpers, and colocated component/contract tests. Each panel receives resolved display data only; it has no session, service, or transport dependency.
- Added individual package subpath exports for every public panel and the contract in `packages/billing-ui/package.json`.
- Replaced Billing customer overview markup with the four overview panels, retained its metric cards, removed the Reserved placeholder, renamed `history` to `activity`, and changed the tab order to include Billing-only Subscriptions.
- Replaced Billing customer tab stubs with panel-shaped empty states and panel skeleton Suspense fallbacks.
- Added Invoice customer detail layout, six customer tab routes, overview composition, and streamed customer header/data reads through Invoice's session-authority `getBilling` service module.
- Added layout regression tests for tab labels, sanctioned Billing/Invoice divergence, and params-derived hrefs.

## Test count

The work adds **34 literal `it()` cases**: 28 panel cases (ready, empty, error, and href policy for each panel), 2 panel-contract cases, and 4 layout cases.

## Customer filter verification

- `billing.invoices.list` does **not** accept a customer filter. Its `InvoiceListParams` has only `status` at `packages/billing/src/types/invoice.ts:361`, and the resource passes that params object unchanged at `packages/billing/src/resources/invoices.ts:17`.
- `billing.payments.list` does **not** accept a customer filter (or list parameters); it accepts only request options at `packages/billing/src/resources/payments.ts:18`.

Therefore the Transactions panels intentionally render their honest empty state. No unscoped client-side filtering or backend API expansion was added.

## Verification

- Passed: `pnpm --filter @876/billing-ui typecheck`
- Passed: `pnpm --filter @876/billing-ui test` (101 tests)
- Started but did not await completion: `pnpm --filter @876/billing-app typecheck`; the workspace had concurrent app development processes.
- Not run: the remaining orchestrator verification commands.

## Unverified

- Full Billing and Invoice app typechecks/tests and the app-structure check remain for the orchestrator.
