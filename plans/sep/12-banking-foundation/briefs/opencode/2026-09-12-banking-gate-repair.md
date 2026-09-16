# opencode (Muse 1.3) brief — repair gates after interrupted runs, finish Phase C

Repo `/root/projects/876`, branch `feature/banking`. Two agents (Codex: deposit hardening; Muse: bank identity UI)
were killed mid-run. Their uncommitted work is in the tree. You are now the ONLY agent. Do not commit/branch/push,
no run logs, no `eslint-disable`/`@ts-ignore`/`as any`. Run ONE test suite at a time (7 GB RAM box).

Read the two briefs for intent:
- `plans/2026-09-12-banking-foundation/briefs/codex/2026-09-12-banking-deposit-hardening.md`
- `plans/2026-09-12-banking-foundation/briefs/opencode/2026-09-12-banking-bank-identity-ui.md` (ignore its concurrency section)

## Orchestrator-verified current state
All five packages typecheck. `@876/api` lint+test pass, `@876/billing-api` lint passes, app-structure passes. Failing:
1. `pnpm --filter @876/billing-api boundaries`:
   `src/modules/banking/__tests__/payment-deposit-account-validation.test.ts` imports `src/db/client.ts`
   (prisma-only-in-repositories) and `src/modules/payments/repositories/payments/shared.ts` (module-boundary).
   Rework the test to go through the payments module's public `index.ts` / mock at the repository boundary the way
   other billing-api tests do — do not relax `.dependency-cruiser.cjs`.
2. `pnpm --filter @876/billing-api test`: `src/test/openapi-contract.test.ts` (frozen contract) and
   `api:contract:check` fail, and `full-route-auth-matrix.test.ts > keeps intentionally public operations out of the
   protected matrix` fails — both after the new directory `ids` batch filter / deposit routes. Find how prior commits
   on this branch registered new Express-only operations (see git log -p for `v1-contract.generated.ts`,
   `apps/billing/contracts/v1/openapi.json`, the auth matrix) and follow the same regeneration/registration path.
3. `pnpm --filter @876/billing test`: fix `client.test.ts > creates a bank account through the canonical banking path`,
   `bank-directory.test.ts > parses bank identity fields including the logo url`,
   `banking-engine.test.ts > preserves full bank-account responses including Core directory ids` (likely fixtures lacking
   the new `isSystem` / identity fields). IGNORE `documents.test.ts` and `recurring-invoices.test.ts` — pre-existing on main.
4. `pnpm --filter @876/billing-app test`: `src/lib/client/resources.test.ts` cases
   `lists directory banks with a batch id…` and `lists directory branches across banks…`.
Fix tests AND code by cause; the product contract wins over a stale fixture only when the contract is correct.

## Then finish and confirm
- Confirm Phase C is complete per its brief (logo+initials fallback, branch + transit, `<transit> · ••••<last4>`,
  batched resolution on the list, transit/routing shown in the account form) and deposit hardening is complete per its
  brief (`is_system` migration safe on existing data, lifecycle guards on `isSystem` only, test floors met). Fill gaps.
- Re-run every command, one at a time:
```
pnpm --filter @876/api typecheck && pnpm --filter @876/api lint && pnpm --filter @876/api test
pnpm --filter @876/billing-api typecheck && pnpm --filter @876/billing-api lint && pnpm --filter @876/billing-api boundaries && pnpm --filter @876/billing-api test && pnpm --filter @876/billing-api db:validate && pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app lint && pnpm --filter @876/billing-app test
node scripts/check-app-structure.mjs
```
Report: `plans/2026-09-12-banking-foundation/reports/opencode/2026-09-12-banking-gate-repair.md` — what you fixed and why,
Phase C + hardening completeness checklist, counted tests added per group, the migration SQL in full, exact results.
