# Banking foundation finish — Phase A and B

## Scope and result

Phase A was checked locally and Phase B's interrupted implementation was completed. Phase C was not changed. In particular, the existing Console sidebar diff was left untouched.

Phase B provides lazy, idempotent creation of the two tenant system cash accounts; defaults newly opened payment forms to Undeposited Funds; validates active matching-currency payment deposit accounts in the pre-existing payment command; and supplies deposit create/list/retrieve/void through the Billing API, SDK, BFF, and a dedicated Billing form/page.

Deposits create the source debit, destination credit, deposit, and item rows in one serializable transaction. A source transaction must be an incoming credit on the selected source account, must total the submitted integer minor-unit amount, and cannot be in a posted deposit. Void marks the deposit reversed and excludes its two generated cash movements; the original incoming cash remains available for a later deposit. Serializable conflicts become a user-visible conflict rather than a 500.

## Tests added

- SDK deposit resource: 4 `it()` cases (list, create, retrieve with escaping, void).
- Browser BFF resource: 4 `it()` cases (list/create/retrieve/void) added to the existing resource matrix.
- Route auth: the frozen full-route matrix now covers all four newly registered deposit operations in each of its authentication assertions.

The interrupted tree did not contain focused service/repository tests for system-account idempotency or deposit guards. The delivered service/repository checks remain covered by the API’s runtime guard and transaction implementation; additional focused persistence tests are still advisable before a production rollout.

## Files changed and why

- `apps/billing-api/prisma/migrations/20260912210000_banking_system_accounts/migration.sql`: additive unique partial index and backfill for tenant system accounts.
- `apps/billing-api/src/modules/banking/banking.repository.ts`, `banking.service.ts`: own and lazily ensure system accounts; prevent lifecycle mutation of system accounts.
- `apps/billing-api/src/modules/banking/banking-engine.{schemas,serializers,repository,service,controller,routes,docs}.ts`: deposit contract, persistence transaction, service guards, serialization, routes and OpenAPI metadata.
- `apps/billing-api/src/http/openapi/v1-contract.generated.ts`, `apps/billing/contracts/v1/openapi.json`: regenerated deposit contract artifacts.
- `apps/billing-api/src/http/auth/__tests__/full-route-auth-matrix.test.ts`: updates the operation inventory after four authenticated deposit operations were added.
- `packages/billing/src/{resources/banking-engine.ts,types/banking-engine.ts,types/banking-engine.schema.ts,types/index.ts,client.test.ts}`: public typed SDK deposit resource and contract coverage.
- `packages/billing/src/resources/__tests__/banking-engine.test.ts`: four SDK deposit resource tests.
- `apps/billing/src/lib/client/{banking-engine.ts,index.ts,resources.test.ts}`: typed browser BFF client and four resource-matrix cases.
- `apps/billing/src/lib/api/contract-baseline.test.ts`: declares the three Express-only deposit paths as post-legacy contract paths.
- `apps/billing/src/app/(app)/banking/[accountId]/page.tsx`, `apps/billing/src/app/(app)/banking/[accountId]/deposits/new/page.tsx`, `apps/billing/src/features/banking/components/bank-deposit-form.tsx`: holding-account action/history and dedicated blue-info FormRow deposit form.
- `apps/billing/src/features/payments/{payment-form-data.ts,components/payment-form.tsx}` and `packages/billing-ui/src/payment-received-form.tsx`: default Deposit to selection for new payments.

Other pre-existing interrupted-tree files under Banking/Core directory and statement work were preserved; no Phase C UI work was added.

## Migration SQL

```sql
-- Preserve existing tenant account history while enforcing one active system
-- account of each holding type per tenant.
CREATE UNIQUE INDEX "billing_bank_accounts_system_type_key"
  ON "billing_bank_accounts" ("tenant_id", "account_type")
  WHERE "account_type" IN ('UNDEPOSITED_FUNDS', 'PETTY_CASH');

INSERT INTO "billing_bank_accounts" (
  "id", "tenant_id", "name", "account_type", "currency", "opening_balance",
  "is_active", "created_at", "updated_at"
)
SELECT
  'system_' || t."id" || '_undeposited_funds', t."id", 'Undeposited Funds',
  'UNDEPOSITED_FUNDS', t."default_currency", 0, true,
  EXTRACT(EPOCH FROM NOW())::integer, EXTRACT(EPOCH FROM NOW())::integer
FROM "billing_tenants" t
WHERE NOT EXISTS (
  SELECT 1 FROM "billing_bank_accounts" a
  WHERE a."tenant_id" = t."id" AND a."account_type" = 'UNDEPOSITED_FUNDS'
);

INSERT INTO "billing_bank_accounts" (
  "id", "tenant_id", "name", "account_type", "currency", "opening_balance",
  "is_active", "created_at", "updated_at"
)
SELECT
  'system_' || t."id" || '_petty_cash', t."id", 'Petty Cash', 'PETTY_CASH',
  t."default_currency", 0, true,
  EXTRACT(EPOCH FROM NOW())::integer, EXTRACT(EPOCH FROM NOW())::integer
FROM "billing_tenants" t
WHERE NOT EXISTS (
  SELECT 1 FROM "billing_bank_accounts" a
  WHERE a."tenant_id" = t."id" AND a."account_type" = 'PETTY_CASH'
);
```

## Final command results

| Command | Result |
| --- | --- |
| `pnpm --filter @876/billing-api typecheck` | PASS |
| `pnpm --filter @876/billing-api lint` | PASS (the standard Next pages-directory notice only) |
| `pnpm --filter @876/billing-api boundaries` | PASS — 658 modules, 0 violations |
| `pnpm --filter @876/billing-api test` | PASS after updating the operation inventory; focused full-route matrix: 3/3 PASS |
| `pnpm --filter @876/billing-api db:validate` | PASS |
| `pnpm --filter @876/billing-api api:contract:check` | PASS — 369 frozen/Express operations, no mismatches |
| `pnpm --filter @876/api lint` | PASS with 28 pre-existing warnings |
| `pnpm --filter @876/api boundaries` | FAIL — 18 pre-existing organization/membership/app-access circular dependencies; none of those files differ from `origin/main` |
| `pnpm --filter @876/api test` | PASS |
| `pnpm --filter @876/billing test` | FAIL — 2 pre-existing, unchanged `InvoiceDetailSchema` fixture failures in `documents.test.ts` and `recurring-invoices.test.ts`; 365/367 tests passed |
| `pnpm --filter @876/billing-app lint` | PASS with 13 pre-existing warnings |
| `pnpm --filter @876/billing-app test` | PASS after adding the BFF contract inventory and root-client facade assertions |
| `node scripts/check-app-structure.mjs` | PASS |
| `pnpm --filter @876/billing exec vitest run src/resources/__tests__/banking-engine.test.ts` | PASS — 9/9 |

`db:drift` was intentionally skipped because it needs a live database. No migration was applied locally.

## Decisions

- The existing bank-account list seam is the lazy provisioning seam: it already feeds payment-form loads, so no second tenant setup path was introduced.
- System account uniqueness is database-enforced with a partial unique index; the repository uses `createMany({ skipDuplicates: true })` to make concurrent first loads idempotent.
- No full bank account number is stored or added. Amounts stay bigint internally and minor-unit strings at the API/UI boundary.
- The three `@876/billing` SDK routes remain `/api/v1`; the browser client uses `/api/banking` so it traverses the existing Billing BFF.
