# opencode (Muse 1.3) brief — Banking bank identity UI (Phase C)

Repo `/root/projects/876`, branch `feature/banking` (checked out). Other work (gate fixes + deposit-to flow) is
already in the working tree uncommitted — do not revert or rewrite it. Do not commit, branch, or push. No run logs.

Read and follow: `.claude/rules/ai-code-quality.md`, `app-layout.md`, `data-loading.md`, `sdk-conventions.md`,
`billing-data-plane.md`, `naming.md`, `testing.md`. Never `eslint-disable`, `@ts-ignore`, `as any`, invented URLs,
or storing a full bank account number.

## Context (verified)
- Core `Bank` (apps/api/prisma/schema/bank.prisma) has `logoUrl`, `shortName`; `BankBranch` has `transitNumber`,
  `routingNumber`. Core directory module: `apps/api/src/modules/directory/financial.*`.
- Billing API proxies the directory via `apps/billing-api/src/providers/core-directory/` and
  `apps/billing-api/src/modules/banking/banking-directory.*`; SDK: `packages/billing/src/resources/bank-directory.ts`,
  `packages/billing/src/types/bank-directory*.ts`.
- Billing `BankAccount` stores opaque `directoryBankId`, `directoryBranchId`, `accountNumberLast4`.
- UI: `apps/billing/src/app/(app)/banking/` (list under `(list)`, `[accountId]`, `new`),
  `apps/billing/src/features/banking/components/bank-account-form.tsx`.

## Tasks
1. Ensure the Billing directory contract and SDK expose bank `logoUrl`, `shortName`, and branch `transitNumber`,
   `routingNumber` (add where missing, end to end: Core serializer → provider types → billing-api schema/serializer →
   SDK schema/type).
2. Batch resolution: the banking list resolves bank + branch for a page of accounts in ONE directory call per kind
   (add an `ids` filter to the Core `/directory/banks` and branches list + provider + Billing proxy + SDK if missing).
   No per-row requests.
3. A small shared presentational `BankIdentity` component in `apps/billing/src/features/banking/components/`: bank logo
   (`<img>` from `logoUrl`), falling back to an initials avatar from `shortName`/name; bank name; branch name + transit.
   An account-number helper renders `<transit> · ••••<last4>` (omit parts that are null; em dash when nothing).
4. Use it in the banking list rows and the account detail header. In `bank-account-form.tsx`, after a branch is selected,
   show transit and routing number read-only beside the branch select.
5. Tests (count `it()`): serializer/contract fields (≥2), batch `ids` filtering (≥2), account-number/initials helper (≥3).

## Verify (run, foreground)
```
pnpm --filter @876/api typecheck && pnpm --filter @876/api lint && pnpm --filter @876/api test
pnpm --filter @876/billing-api typecheck && pnpm --filter @876/billing-api lint && pnpm --filter @876/billing-api boundaries && pnpm --filter @876/billing-api test && pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app lint && pnpm --filter @876/billing-app test
node scripts/check-app-structure.mjs
```
Report to `plans/2026-09-12-banking-foundation/reports/opencode/2026-09-12-banking-bank-identity-ui.md`: files changed
with reasons, counted tests, exact command results, anything skipped.

## Concurrency (binding)
A Codex agent is editing in parallel: `apps/billing-api/prisma/**`, `apps/billing-api/src/modules/banking/banking.{repository,service}.ts`,
`banking-engine.*`, new banking tests in billing-api, and `packages/billing/src/types/bank-account*.ts` (adding `isSystem`).
Do NOT edit those files. Your scope is the Core directory module, billing-api `banking-directory.*` +
`providers/core-directory/*`, SDK `bank-directory*`, and `apps/billing/src/**` banking UI. If a gate fails only because of
the other agent's in-progress files, note it in your report rather than editing them.
