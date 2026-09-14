# Couriers finance settings and items

## Phase 1 — Couriers finance connection scopes

Status: complete in source; database application intentionally not run.

Changed `docs/handoff/data/2026-08-31-provisioning-defaults.v1.json` to declare
the existing embedded Couriers finance dependency with:

- `billing.taxes.read` and `billing.taxes.write` (the Billing guard uses these
  scopes for both tax authorities and tax rates);
- `billing.currencies.read` and `billing.currencies.write`;
- the pre-existing customers, items, invoices, and payments read/write scopes.

The existing `reconcileFinanceConnections` path compares the profile revision
and replaces the app connection scope set; no database row is hand-edited.
`apps/api/src/modules/provisioning/__tests__/provisioning-import.test.ts` adds
four contract tests for the Couriers embedded profile, exact scope set, draft
carry-through, and the independently declared tax/currency scopes.

Apply this to the shared database, then reconcile the connection:

```bash
pnpm --filter @876/api provisioning:import
curl --fail-with-body -X POST "$API_URL/api/v1/billing/finance-provisioning/reconcile" \
  -H "x-internal-key: $API_INTERNAL_KEY" \
  -H 'content-type: application/json' \
  --data '{"limit":100}'
```

If the reconciliation is paginated, repeat the second command with the returned
cursor until `next_cursor` is null. The normal finance-provisioning dispatcher
then delivers the queued connection revision.

Verification: `pnpm --filter @876/api exec vitest run
src/modules/provisioning/__tests__/provisioning-import.test.ts` — 14 passed;
`pnpm --filter @876/api typecheck` — passed.

## Phase 2 — create/update responses accepted end to end

Status: complete.

Root cause confirmed: the payment-mode repository returned `{ id }`, while the
integration client validates a full `payment_mode` resource. The payments
service now serializes the actual created/updated Prisma row using the existing
serializer. This makes the Billing response conform to the integration schema
and prevents the Couriers BFF from turning a successful 201 into a 502.

`apps/billing-api/src/modules/payments/payments.mode-responses.test.ts` adds two
service tests using the real serialized resource. The four Couriers payment
mode/tax-rate create/update route tests now assert the complete real resource
shape, covering the downstream integration boundary.

Tests added/strengthened: 6.

Verification:

```text
pnpm --filter @876/billing-api exec vitest run src/modules/payments/payments.mode-responses.test.ts src/modules/currencies/__tests__/currencies.integration-routes.test.ts
7 passed
NODE_ENV=test pnpm --filter @876/couriers-app exec vitest run src/app/api/manage/finance/currencies/route.test.ts src/app/api/manage/finance/currencies/[code]/route.test.ts src/app/api/manage/finance/payment-modes/route.test.ts src/app/api/manage/finance/payment-modes/[modeId]/route.test.ts src/app/api/manage/finance/taxes/route.test.ts src/app/api/manage/finance/taxes/[taxId]/route.test.ts
24 passed
```

## Phase 3 — currencies through the integration boundary

Status: complete.

Billing API now exposes list, enable, update, set-default, and disable at the
existing integration authority, gated by the narrowly named currency read/write
scopes and routed to the existing currency service. `@876/billing/integration`
now owns the typed currency resource. Couriers exposes matching same-origin
routes and uses `CurrencySettingsPanel` instead of the unavailable placeholder.
The shared panel now supports display-metadata edits; its typed prop is used by
Billing, Invoice, and Couriers.

OpenAPI and generated Billing v1 contract snapshots were regenerated.

Tests added: 18 (5 Billing API integration routes, 5 Billing SDK resource
tests, and 8 Couriers route tests).

Verification:

```text
pnpm --filter @876/billing typecheck
passed
pnpm --filter @876/billing exec vitest run src/integration/resources/__tests__/currencies.integration.test.ts src/integration/resources/__tests__/payment-modes-tax.integration.test.ts
17 passed
NODE_ENV=test pnpm --filter @876/couriers-app exec vitest run src/app/[orgSlug]/settings/finance/_components/finance-sections.test.tsx src/app/api/manage/finance/currencies/route.test.ts src/app/api/manage/finance/currencies/[code]/route.test.ts
15 passed
pnpm --filter @876/billing-api api:contract:generate
regenerated frozen OpenAPI and compatibility manifest
pnpm --filter @876/billing-api api:contract:check
385 frozen/Express operations; 0 mismatches
pnpm --filter @876/billing-api typecheck
passed
pnpm --filter @876/billing-api lint
completed with the repository's existing Next pages-directory warning
pnpm --filter @876/billing-api boundaries
no dependency violations (697 modules, 2,258 dependencies)
node scripts/check-app-structure.mjs
app-structure: OK
```

## Phase 4 — finance settings controls

Status: partially complete.

Payment modes now have shared add, edit, set-default, archive/restore, and
delete controls; currencies have shared add/enable, edit, set-default, and
disable controls. Mutation failures remain inline and keep each panel mounted.
Empty-state prose was removed from the shared currency and payment-mode panels.

Tax-rate details are intentionally immutable in the existing Billing contract:
`TaxRateUpdateParams` and the Billing update schema permit only `isActive` and
`isDefault`. The shared tax panel therefore supports add, archive/activate, and
default, but not a misleading detail editor. It also must ask for a tax
authority because the Billing create service requires an active authority. A
real tax edit needs a versioned/effective-dated successor capability in Billing,
not a UI-only workaround. This is the remaining Phase 4 gap.

Tests added: 2 shared-panel mutation tests.

Verification:

```text
pnpm --filter @876/billing-ui exec vitest run src/panels/currency-settings-panel.test.tsx src/panels/payment-mode-settings-panel.test.tsx
23 passed
pnpm --filter @876/billing-ui typecheck
passed
pnpm --filter @876/invoice-app typecheck
passed
pnpm --filter @876/billing-app typecheck
passed
pnpm --filter @876/couriers-app typecheck
passed
```

## Phase 5 — items

Not completed. Couriers currently has a read-only shared-catalog list/detail
surface; create, edit, and archive still need the Invoice item form/components
promoted into `@876/billing-ui` and same-origin Couriers mutation routes.

## Phase 6 — payment-mode images

Not completed. This requires the additive Billing relationship migration and
the existing Storage media upload workflow to be traced and reused. No storage
or media schema was changed.

## Files changed

- `apps/api` provisioning import fixture and test: declared and locked the
  Couriers finance scope set.
- `apps/billing-api` currencies routes/controller/service and generated
  contract: added integration-tier currencies without duplicating currency
  business logic.
- `apps/billing-api` payment-mode repositories/service and tests: returned and
  serialized full resources.
- `packages/billing`: integration currency resource and public currency types.
- `packages/billing-ui`: shared currency and payment-mode edit controls.
- Billing, Invoice, and Couriers compositions/clients/routes/tests: connected
  the shared interfaces at their correct authority boundary.

No commits, branches, database writes, seed/import, or reconciliation commands
were run.
