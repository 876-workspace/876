# Codex brief — finish 876 Banking on `feature/banking`

You are working in `/root/projects/876` on branch `feature/banking` (already checked out). A GPT-web run
authored ~11k lines it never executed. Your job: make it pass every gate, then close three product gaps.
You CAN run commands — run them. Do not commit, branch, push, or open PRs. Do not write run logs.

## Read first (binding)
- `plans/2026-09-12-banking-foundation/plan.md`, `reports/gpt-web/2026-09-12-banking-foundation.md`
- `.claude/rules/ai-code-quality.md`, `billing-data-plane.md`, `express-api.md`, `api-backend.md`,
  `app-layout.md`, `data-loading.md`, `app-api-routing.md`, `error-handling.md`, `testing.md`, `naming.md`
Preserve: statement evidence (`BankStatementLine`) separate from booked cash (`BankTransaction`); Billing stores
opaque Core bank/branch IDs only; money is integer minor units / strings, never JS float math.

Never: `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`, loosening production types to satisfy
a test, green buttons, dialogs for multi-field create forms, storing a full bank account number in a plain column.

## Verified facts (orchestrator checked)
- Prisma validate/generate pass for `apps/api` and `apps/billing-api`.
- Typecheck: `@876/api`, `@876/billing`, `@876/billing-app` pass. `@876/billing-api` has 6 errors in
  `banking-engine.repository.ts` (441, 728, 755), `banking-engine.service.ts` (433, 664),
  `banking-statement-file.parser.ts` (310). Fix at the cause (correct Prisma input types / narrowing), not casts.
- Payments already have `depositAccountId` and post a `BankTransaction` (`modules/payments/repositories/payments/shared.ts:208`).
- `BankAccountType` includes `UNDEPOSITED_FUNDS` and `PETTY_CASH`; `BankDeposit`/`BankDepositItem` models exist in
  `banking-engine.prisma` but NO service/route/UI uses them. No tenant gets default system accounts.
- Core `Bank` has `logoUrl`, `shortName`; `BankBranch` has `transitNumber`, `routingNumber`.

## Phase A — make every gate green
Run and fix until all pass (foreground, generous timeouts):
```
pnpm --filter @876/billing-api typecheck && pnpm --filter @876/billing-api lint && pnpm --filter @876/billing-api boundaries && pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api db:validate; pnpm --filter @876/billing-api api:contract:check   # regenerate the contract via its script if the check says it is stale
pnpm --filter @876/api lint && pnpm --filter @876/api boundaries && pnpm --filter @876/api test
pnpm --filter @876/billing test
pnpm --filter @876/billing-app lint && pnpm --filter @876/billing-app test
node scripts/check-app-structure.mjs
```
`db:drift` needs a live DB — skip it and say so. Fix real defects in tests AND code; never delete a test to go green.
Record pre-existing failures that also fail on `origin/main` separately (check with `git stash`-free reasoning or
by reading the failing test's history) rather than "fixing" unrelated code.

## Phase B — Zoho-style "Deposit to" bookkeeping (the core product requirement)
Caribbean banks rarely offer feeds: money received is recorded to a holding account, later physically deposited,
and the bank statement is reconciled against it. Implement Zoho Books' flow:
1. **System accounts.** Each tenant has one `Undeposited Funds` (UNDEPOSITED_FUNDS) and one `Petty Cash` (PETTY_CASH)
   account in its base currency, ensured idempotently by one owning service function (lazy ensure on bank-account
   list/payment-form load or at tenant provisioning — pick the existing tenant-setup seam if one exists). Unique per
   tenant+type for these two; they cannot be deleted/deactivated or renamed to collide. Additive migration SQL
   (hand-written in `apps/billing-api/prisma/migrations/<timestamp>_banking_system_accounts/`), no data loss.
2. **Payment "Deposit to".** Billing (and Invoice, if it shares the payment form contract) payment/sales-receipt forms
   default `depositAccountId` to Undeposited Funds when creating; user may pick Petty Cash or any active bank account
   of matching currency. Server validates currency match and active account.
3. **Record deposit.** From an UNDEPOSITED_FUNDS or PETTY_CASH account, the user selects undeposited incoming booked
   transactions and deposits them to a CHECKING/SAVINGS account: one service command creates `BankDeposit` +
   `BankDepositItem`s and, in ONE transaction, a withdrawal `BankTransaction` on the source and a deposit
   `BankTransaction` on the destination for the total. Guards: same currency, item not already in a posted deposit,
   items belong to source account and tenant, amount = sum of items. Reverse (void) a deposit restores items to
   undeposited and reverses both transactions — never hard delete. The destination deposit transaction is what a
   statement line later matches.
4. Expose: billing-api routes (+schemas/serializers/docs/OpenAPI), `@876/billing` resource
   `bankDeposits.{create,list,retrieve}` + a void/cancel verb, BFF under the existing `/api/banking` resource
   pattern, typed browser client, and UI page `/banking/[accountId]/deposits/new` (dedicated page, `FormRow`
   anatomy, blue `info` primary, server-loaded data). Account detail shows a "Record deposit" action for
   holding accounts and lists deposits.
Tests (count them): service guards (≥10 incl. double-deposit, currency mismatch, cross-tenant, void restores),
route/auth via supertest (≥5), SDK resource (≥4), system-account ensure idempotency (≥3).

## Phase C — Bank identity in the Banking UI
1. Billing directory contract (`banking-directory.*`, SDK `bank-directory`) exposes `logoUrl`, `shortName`,
   and branch `transitNumber`, `routingNumber` if not already.
2. Banking list and account detail show the bank logo (fallback: initials avatar from `shortName`/name — do not
   invent or hotlink logo URLs; if the catalog has none, null is correct), bank name, branch name + transit, and the
   account number as `<transit> · ••••<last4>` (Jamaican numbers are branch transit + account number). Resolve
   bank/branch for a page of accounts with ONE batched call, not per row — add a batch `ids` filter on the Core
   directory list endpoint + provider if missing.
3. Account form: after choosing bank → branch, show the transit/routing read-only beside the branch select.
Tests: ≥4 (serializer/contract + batch resolution + display helper).

## Deliverable
Write `plans/2026-09-12-banking-foundation/reports/codex/2026-09-12-banking-finish.md`: per-phase status, counted
`it()` added, every file changed with reason, migration SQL in full, decisions made, exact final command results
(pass/fail per command), anything skipped and why. Then stop.
