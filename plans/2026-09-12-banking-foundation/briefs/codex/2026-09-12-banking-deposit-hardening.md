# Codex brief — harden the deposit-to flow (system accounts migration + missing tests)

Repo `/root/projects/876`, branch `feature/banking`. Phase A/B work is uncommitted in the tree and passing gates.
Read `plans/2026-09-12-banking-foundation/reports/codex/2026-09-12-banking-finish.md` first. Do not commit, branch, push,
or write run logs. Never `eslint-disable`, `@ts-ignore`, `as any`.

**Concurrency:** another agent is editing, in parallel, the Core directory module (`apps/api/src/modules/directory/*`),
billing-api `banking-directory.*` + `providers/core-directory/*`, SDK `bank-directory*`, and ALL files under
`apps/billing/src/` (banking pages/components). Do NOT touch those. Your scope: `apps/billing-api/prisma/**`,
`apps/billing-api/src/modules/banking/banking.{repository,service}.ts`, `banking-engine.{repository,service}.ts`,
and new test files under `apps/billing-api/src/modules/banking/`.

## 1. The system-accounts migration is unsafe on existing data (orchestrator-verified)
`BankAccountType` with `UNDEPOSITED_FUNDS`/`PETTY_CASH` shipped in July (`20260711160000_banking_and_payments_foundation`),
so production tenants may ALREADY have zero, one, or several user-created accounts of those types, and may have an
unrelated account already named "Undeposited Funds"/"Petty Cash" (`@@unique([tenantId, name])`). The current migration
`20260912210000_banking_system_accounts` would then fail (unique partial index over duplicates; name collision on insert).
Redesign:
- add `is_system BOOLEAN NOT NULL DEFAULT false` (Prisma `isSystem @map("is_system")`) to `billing_bank_accounts`;
- partial unique index on `(tenant_id, account_type) WHERE is_system`;
- backfill: for each tenant+type, adopt the OLDEST existing active account of that type as the system account;
  otherwise insert one, choosing a name that cannot collide (e.g. if the name is taken, suffix ` (System)`);
- keep it one hand-written, idempotent, additive migration file (rewrite the existing uncommitted one in place; it has
  never been applied anywhere);
- update the repository ensure (`createMany skipDuplicates` must key on the new index, with the same name-collision rule),
  the lifecycle guards (block deactivate/delete/type-change of `isSystem` accounts, not of every account of that type),
  deposit source validation, and expose `isSystem` on the serialized bank account + Zod schema + SDK type
  (`packages/billing/src/types/bank-account*.ts` — you may edit these two files).
Validate with `pnpm --filter @876/billing-api db:validate` and regenerate the client.

## 2. Tests the previous run skipped (count `it()`, required floors)
Put them beside the module (look at existing `apps/billing-api/src/modules/**/__tests__` / `*.test.ts` patterns and
the repo's Prisma mocking conventions first):
- deposit service guards ≥10: same-account, inactive account, non-holding source, non-bank destination, currency
  mismatch, items not incoming credits / wrong account / other tenant, amount ≠ sum, already-deposited item (conflict),
  serializable conflict mapping, void of an already voided deposit, void restores items as depositable;
- deposit routes via supertest on the assembled app ≥5: create 201 shape, validation 400, unauthenticated 401,
  cross-tenant 404, void 200;
- system-account ensure ≥3: idempotent on repeat, adopts an existing account instead of duplicating, name collision;
- payment deposit-account validation ≥2: inactive account rejected, currency mismatch rejected.
Every test must be able to fail (see `.claude/rules/testing.md`).

## Verify (foreground) and report
```
pnpm --filter @876/billing-api typecheck && pnpm --filter @876/billing-api lint && pnpm --filter @876/billing-api boundaries && pnpm --filter @876/billing-api test && pnpm --filter @876/billing-api db:validate && pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/billing typecheck
```
(`@876/billing test` has 2 pre-existing invoice fixture failures on main — ignore those two only.)
Report: `plans/2026-09-12-banking-foundation/reports/codex/2026-09-12-banking-deposit-hardening.md` — migration SQL in
full, counted tests per group, files changed, exact command results.
