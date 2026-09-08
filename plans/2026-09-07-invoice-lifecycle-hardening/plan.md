# Implementation Plan: Invoice Lifecycle Hardening

**Run ID:** `2026-09-07-invoice-lifecycle-hardening`  
**Branch:** `feature/invoice-lifecycle-hardening`  
**Base:** `main@d0475b5da880d84f483f42bdd2d9f46b3ff6e5ae`  
**Status:** COMPLETED ✅ — verification pending orchestrator execution

## Overview

Harden the existing 876 Billing invoice lifecycle without replacing the commercial data plane that already landed on `main`. Billing remains the source of truth for invoices, receivables, payments, credits, inventory side effects, and lifecycle commands. 876 Invoice and 876 Billing remain host surfaces over that bounded domain.

The implementation preserves the durable `InvoiceStatus` compatibility contract (`DRAFT`, `OPEN`, `SENT`, `PARTIALLY_PAID`, `OVERDUE`, `PAID`, `UNCOLLECTIBLE`, `VOID`) while centralizing what those values mean and preventing communication, due state, and settlement from becoming unrelated ad-hoc status mutations.

## Rules read

- [x] `CLAUDE.md`
- [x] `.agents/rules/gpt-web-operating-rules.md`
- [x] `.agents/rules/implementation-tracker.md`
- [x] `.agents/rules/ai-code-quality.md`
- [x] `.agents/rules/naming.md`
- [x] `.agents/rules/types.md`
- [x] `.agents/rules/code-style.md`
- [x] `.agents/rules/testing.md`
- [x] `.agents/rules/error-handling.md`
- [x] `.agents/rules/api-backend.md`
- [x] `.agents/rules/sdk-conventions.md`
- [x] `.agents/rules/stripe-api-pattern.md`
- [x] `.agents/rules/shared-product-ui.md`
- [x] `.agents/rules/app-structure.md`
- [x] `.agents/rules/app-layout.md`

## Architectural scope

Primary owner:

- `apps/billing-api/src/modules/documents/**`
- `apps/billing-api/src/modules/payments/**`
- `packages/billing/**`
- `packages/billing-ui/**`
- `apps/billing/**`
- `apps/invoice/**`

### Invariants

1. Draft invoices have no AR impact and are the only invoices that may be deleted or financially rewritten.
2. Finalization is the posting boundary and creates the receivable exactly once.
3. Payment and credit allocations, write-offs, and reversals are the normal settlement mechanisms; callers cannot set `PAID` directly.
4. `sentAt` is communication evidence. `SENT` remains a compatibility projection, not a separate receivable state.
5. Overdue means a collectible posted invoice has a positive remaining balance after its due date.
6. Partial settlement does not erase delinquency: a past-due invoice with a positive balance remains `OVERDUE`.
7. `PAID` means the remaining receivable is zero through cash and/or credits. `amountPaid`, `amountCredited`, and `amountWrittenOff` remain distinct evidence.
8. `VOID` and `UNCOLLECTIBLE` remove an invoice from open AR without deleting history.
9. Financial mutations remain transactional and preserve BigInt/minor-unit arithmetic.
10. Existing API/SDK status values are not renamed in this run.

## Key design decisions

### Canonical collectible projection

The flattened compatibility projection for collectible invoices is:

```text
amountDue = 0                       -> PAID
positive balance after dueAt       -> OVERDUE
cash or credit applied             -> PARTIALLY_PAID
sentAt exists                      -> SENT
otherwise                          -> OPEN
```

`OVERDUE` therefore wins over `PARTIALLY_PAID` while a positive balance remains after the due date.

### One lifecycle owner

`apps/billing-api/src/modules/documents/invoice-lifecycle.ts` owns the collectible status set, overdue candidate set, and compatibility projection. Payment allocation, credit-note allocation, automatic credit settlement, and overdue materialization reuse that owner.

The Customers AR repository intentionally keeps a local four-status predicate. Documents already depends on Customers for AR recomputation, so making Customers import Documents would create a prohibited module cycle. The boundary exception is documented in the accounting model and final report.

### No enum migration

The uppercase enum values are durable contracts across Prisma, API, integration SDK, reports, Billing, Invoice, and shared Billing UI. This run does not migrate those stored values.

### Commands, not status setters

Lifecycle-changing behavior is exposed as explicit domain commands (`finalize`, `send`, `void`, `write-off`, payment allocation, credit-note application). Generic invoice updates are not a back door for financial status transitions.

### Communication audit semantics

The send command preserves the first `sentAt` timestamp across repeated send records while emitting a fresh `invoice.sent` event for every successful command. This keeps the invoice header's initial-send evidence stable without losing later communication events.

### Conservative void presentation

Because `OVERDUE` can now represent a partially settled invoice, status alone cannot prove that an overdue/partial invoice is safe to void. The backend still enforces actual settlement evidence; shared UI and host adapters only present Void for `OPEN` and `SENT`. A richer future UI should consume server-provided capabilities rather than guess from flattened status.

### Timeline deferred

Outbox events are not a user-facing history API. No invoice timeline was fabricated from infrastructure events. A future timeline needs a durable, authorized read contract first.

## Dispatched briefs

No sub-agent briefs. This GPT Web run implemented directly through the GitHub connector.

## Execution reports

| Tool | Report | Status |
| --- | --- | --- |
| GPT Web | `./reports/gpt-web/2026-09-07-invoice-lifecycle-hardening.md` | complete |

## Task checklist

### Phase 1 — Lifecycle foundation

- [x] Located existing collectible/status logic across Documents, Payments, Credit Notes, overdue materialization, and Customer AR.
- [x] Added one canonical lifecycle helper without changing the durable enum.
- [x] Reused it from payment allocations, credit-note allocations, automatic settlement, and overdue materialization; documented the Customer AR cycle exception.
- [x] Added focused invariant tests, including overdue + partial settlement precedence.

### Phase 2 — Lifecycle command hardening

- [x] Verified the current finalization workflow already owns posting, inventory consumption, ledger/AR effects, and idempotency; preserved it.
- [x] Kept generic invoice updates free of financial status setters.
- [x] Added explicit invoice send command that records communication evidence without creating a second receivable and preserves the first `sentAt`.
- [x] Hardened void eligibility against terminal and settled invoices while preserving reversal/audit evidence.
- [x] Added explicit full-remaining-balance write-off using existing `amountWrittenOff`, `UNCOLLECTIBLE`, `WRITE_OFF` ledger evidence, metadata, and outbox infrastructure.

### Phase 3 — Settlement consistency

- [x] Routed payment and credit-note allocations through the canonical lifecycle projection.
- [x] Routed automatic available-credit settlement through the same projection.
- [x] Kept cash, credits, and write-offs distinct.
- [x] Preserved existing unapplied overpayment/customer-credit behavior.
- [x] Preserved reversal behavior that restores captured pre-allocation invoice status and paid timestamp.

### Phase 4 — Contract and shared UI parity

- [x] Read SDK, API-pattern, shared-product-UI, app-structure, and app-layout rules before completing the cross-surface work.
- [x] Added bounded Billing SDK and integration client methods for `send` and `writeOff`.
- [x] Added bounded Billing SDK request-path tests for the additive commands.
- [x] Added Billing and Invoice same-origin browser client commands.
- [x] Consolidated lifecycle action presentation into `@876/billing-ui` with thin Billing/Invoice adapters.
- [x] Added shared UI and Invoice client tests.
- [x] Evaluated settlement/timeline presentation and deliberately deferred timeline UI because no honest backend read contract exists yet.

### Phase 5 — Documentation, compatibility review, and handoff

- [x] Updated `apps/billing/BILLING_ENGINE.md`, `apps/billing/docs/accounting-model.md`, and added `apps/billing/docs/invoice-lifecycle.md`.
- [x] Reviewed duplicated lifecycle rules and centralized the safe owners.
- [x] Reviewed the complete branch diff for compatibility residue, duplicate helpers, destructive JSDoc churn, module cycles, and unsafe UI action inference.
- [x] Restored accidental SDK type documentation churn found during diff review.
- [x] Fixed an initial Documents self-import in the write-off workflow.
- [x] Tightened Void presentation after review identified status ambiguity for partially settled overdue invoices.
- [x] Reconciled first-send timestamp documentation and implementation.
- [x] Wrote and reconciled the GPT Web final report with exact unverified items and orchestrator commands.

## Test drafting summary

No test was executed from GPT Web.

- New lifecycle helper file: 9 literal `it()` declarations; two `it.each` declarations expand the file to 15 expected runtime cases.
- Existing invoice workflow suite: 6 new `it()` declarations, growing the suite from 5 to 11 declarations.
- Bounded Billing SDK document resources: 2 new `it()` declarations for `send` and `writeOff`.
- New shared Billing UI suite: 7 `it()` declarations.
- Invoice app lifecycle browser-client coverage: 4 new `it()` declarations.

**Total new literal `it()` declarations: 28.**

## Verification commands

GPT Web cannot execute these. Verification is the orchestrator's responsibility.

```bash
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api build
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api db:drift
pnpm --filter @876/billing-api api:contract:check

pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
```

No Prisma generator, migration, drift check, formatter, linter, test, typecheck, build, or API contract check was run from this seat.

## Multi-session continuity / handoff

Implementation state:

- Lifecycle projection is centralized and reused across the primary settlement paths.
- Send and full-balance write-off commands are available on tenant and integration API surfaces.
- Repeated sends preserve the invoice's first `sentAt` and emit fresh send events.
- `invoice.sent` and `invoice.written-off` outbox events are typed.
- Void rejects written-off/non-collectible and settled invoices.
- Billing SDK, integration SDK, Billing browser client, and Invoice browser client expose the new commands.
- Billing and Invoice lifecycle actions share one `@876/billing-ui` implementation.
- Shared UI conservatively presents Void only for `OPEN`/`SENT`.
- Engine/accounting/dedicated lifecycle documentation describes the new semantics.
- No database migration is required.
- The full implementation report is committed under this run directory.

Remaining work is **verification only** by an environment with shell/runtime/database access. If checks fail, fix the concrete failures without weakening the lifecycle invariants described here.

## PR preparation summary

Implementation is complete but unverified.

- Base used for this run: `main@d0475b5da880d84f483f42bdd2d9f46b3ff6e5ae`.
- Branch: `feature/invoice-lifecycle-hardening`.
- Final pre-handoff comparison showed the branch ahead of and not behind `main`.
- No PR was opened; GPT Web rules prohibit it.
- No migration SQL exists for this run.
- Before PR preparation, the orchestrator must re-sync/compare with current `main`, run the verification commands above, inspect generated/API-contract output, and review any failures.
- Final report: `plans/2026-09-07-invoice-lifecycle-hardening/reports/gpt-web/2026-09-07-invoice-lifecycle-hardening.md`.
