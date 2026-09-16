# Verification repair

All requested checks are green. These repairs did not change a branch, the pre-existing lockfile edit, a migration, a dependency-cruiser rule, or the public v1 contract.

## Defects

1. **Catalog amount calls — fixed.** `quantity` is now part of the single options object at both price-list resolver calls and both subscription calls. The commercial-kernel calculator keeps `quantity` required. Its runtime `pricingModel` default is `FLAT`, matching the Prisma `Price` default, so the unchanged subscription test fixture (which omits that field) is not incorrectly treated as a tiered price.
2. **Circular dependencies — fixed structurally.** Moved `calculateCatalogAmount` and `applyPercentageAdjustment` into the pure leaf `apps/billing-api/src/commerce/calculations.ts`. It imports only `@876/core/money`; it has no Prisma, I/O, or domain-module dependency. Billing Engine retains a compatibility re-export for its existing public calculation surface, while Catalog, Pricing, and Subscriptions import the leaf owner directly. Removed Catalog's forwarding calculator export and the now-duplicate Pricing adjustment module/export. This removes the route/controller-bearing barrel paths rather than suppressing the cycle. `boundaries` reports zero violations.
3. **Invented Storage error — fixed.** Storage's `resourceLinks.create` is idempotent: it returns an existing exact link rather than emitting an already-linked conflict. There is no registered resource-link conflict error to use or add. The Billing orchestration recovery path does exist for a retryable create failure followed by an exact-link lookup, so its test now uses the registered `storage/provider-error` and accurately describes that scenario. No Storage catalog or API change was needed.
4. **Reserved `module` lint variable — fixed.** Renamed only the loop binding to `permissionModule`; the three pre-existing warnings remain warnings.
5. **Regression checks — fixed/verified.** Billing API remains at 658 passing tests and the API contract check has zero differences.

## Changed files

- `apps/billing-api/src/commerce/calculations.ts` — new leaf owner for pure commercial price arithmetic.
- `apps/billing-api/src/modules/billing-engine/calculations.ts` — re-exports the catalog calculator from its leaf owner; retains other Billing Engine calculations.
- `apps/billing-api/src/modules/catalog/repositories/price-lists/resolve.ts` — uses the leaf arithmetic owner and canonical single options object.
- `apps/billing-api/src/modules/catalog/index.ts` — removes the non-owning calculator re-export.
- `apps/billing-api/src/modules/pricing/pricing.service.ts` and `apps/billing-api/src/modules/pricing/index.ts` — use the leaf owner and remove its prior indirect export.
- `apps/billing-api/src/modules/pricing/price-list-adjustment.ts` — removed after its sole pure implementation moved to the leaf owner.
- `apps/billing-api/src/modules/subscriptions/repositories/bill.ts` and `preview.ts` — use the leaf calculator and provide `quantity` in its options object.
- `apps/billing-api/src/modules/access/__tests__/finance-catalog-drift.test.ts` — minimal reserved-word loop-variable rename.
- `packages/billing/src/server/item-media.test.ts` — replaces the nonexistent Storage code and corrects the scenario name.
- `plans/2026-09-07-billing-commercial-platform-architecture/reports/codex/2026-09-07-verification-repair.md` — this verification report.

## Final test counts

| Package | Passing tests |
| --- | ---: |
| `@876/billing-api` | 658 |
| `@876/billing` | 313 |
| `@876/billing-ui` | 380 |
| `@876/storage` | 391 |

## Verification command tails

`pnpm --filter @876/billing-api generate`

```text
Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma/schema.

✔ Generated Prisma Client (7.9.1) to ./src/db/generated/prisma in 2.12s
```

`pnpm --filter @876/billing-api typecheck`

```text
$ tsc --noEmit
```

`pnpm --filter @876/billing-api lint`

```text
/root/projects/876/apps/billing-api/src/providers/accounting/zoho-books/errors.ts
  38:3  warning  '_providerCode' is defined but never used     @typescript-eslint/no-unused-vars
  39:3  warning  '_providerMessage' is defined but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (0 errors, 3 warnings)
```

`pnpm --filter @876/billing-api boundaries`

```text
$ depcruise src --config .dependency-cruiser.cjs

✔ no dependency violations found (555 modules, 1714 dependencies cruised)
```

`pnpm --filter @876/billing-api test`

```text
Test Files  70 passed (70)
     Tests  658 passed (658)
Duration  22.25s
```

`pnpm --filter @876/billing-api api:contract:check`

```text
Missing operations: 0
Extra operations: 0
status-code mismatches: 0
request schema mismatches: 0
response schema mismatches: 0
```

`pnpm --filter @876/billing typecheck`

```text
$ tsc --noEmit
```

`pnpm --filter @876/billing test`

```text
Test Files  28 passed (28)
     Tests  313 passed (313)
Duration  4.57s
```

`pnpm --filter @876/billing-ui typecheck`

```text
$ tsc --noEmit
```

`pnpm --filter @876/billing-ui test`

```text
Test Files  34 passed (34)
     Tests  380 passed (380)
Duration  31.13s
```

`pnpm --filter @876/storage typecheck`

```text
$ tsc --noEmit
```

`pnpm --filter @876/storage test`

```text
Test Files  15 passed (15)
     Tests  391 passed (391)
Duration  1.71s
```

## Unresolved items

None. The Billing API lint command still reports its three pre-existing warnings, but it exits successfully with zero errors as required.

## Follow-up

Removed the unreachable `pricingModel = 'FLAT'` fallback from the commercial-kernel calculator and added `pricingModel: 'FLAT'` to the subscription billing fixture so it matches Prisma's non-nullable `Price.pricingModel` contract.
