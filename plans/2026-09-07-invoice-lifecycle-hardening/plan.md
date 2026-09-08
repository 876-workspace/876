# Implementation Plan: Invoice Lifecycle Hardening

**Run ID:** `2026-09-07-invoice-lifecycle-hardening`  
**Branch:** `feature/invoice-lifecycle-hardening`  
**Base:** `main@d0475b5da880d84f483f42bdd2d9f46b3ff6e5ae`  
**Status:** IN_PROGRESS

## Overview

Harden the existing 876 Billing invoice lifecycle without replacing the commercial data plane that already landed on `main`. Billing remains the source of truth for invoices, receivables, payments, credits, inventory side effects, and lifecycle commands. 876 Invoice and 876 Billing remain host surfaces over that bounded domain.

The implementation keeps the current durable `InvoiceStatus` compatibility contract (`DRAFT`, `OPEN`, `SENT`, `PARTIALLY_PAID`, `OVERDUE`, `PAID`, `UNCOLLECTIBLE`, `VOID`) while centralizing what those values mean and preventing callers from treating communication, due state, and settlement as unrelated ad-hoc status mutations.

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

Additional domain/UI/SDK rules will be read before the corresponding phase is edited.

## Architectural scope

Primary owner:

- `apps/billing-api/src/modules/documents/**`
- `apps/billing-api/src/modules/payments/**`
- `apps/billing-api/src/modules/customers/**` only where shared AR predicates already live
- `packages/billing/**` for bounded SDK contracts in later phases
- `packages/billing-ui/**`, `apps/billing/**`, and `apps/invoice/**` only after shared lifecycle behavior is stable

### Invariants

1. Draft invoices have no AR impact and are the only invoices that may be deleted or financially rewritten.
2. Finalization is the posting boundary and creates the receivable exactly once.
3. Payment and credit allocations, write-offs, and reversals are the only normal settlement mechanisms; callers cannot set `PAID` directly.
4. `sentAt` is communication evidence. `SENT` remains a compatibility projection, not a new receivable state.
5. Overdue is determined by a positive remaining balance, a passed due date, and an otherwise collectible posted invoice. The persisted `OVERDUE` value is retained for compatibility.
6. Partial settlement must not erase overdue information: when a past-due invoice still has a positive balance, the flattened compatibility status is `OVERDUE`.
7. `PAID` means the remaining receivable is zero through cash and/or credits. `amountPaid`, `amountCredited`, and `amountWrittenOff` remain distinct evidence.
8. `VOID` and `UNCOLLECTIBLE` remove an invoice from open AR without deleting history.
9. Financial mutations remain transactional and preserve BigInt/minor-unit arithmetic.
10. Existing API/SDK status values are not renamed in this run.

## Key design decisions

### Canonical flattened-status precedence

For the existing compatibility enum, lifecycle projection will use this precedence:

```text
VOID
UNCOLLECTIBLE
PAID
OVERDUE
PARTIALLY_PAID
SENT
OPEN
DRAFT
```

`OVERDUE` therefore wins over `PARTIALLY_PAID` when a positive balance remains after the due date. UI can still render paid/credited amounts alongside the overdue badge.

### One lifecycle owner

A focused invoice lifecycle domain helper will own collectible-status predicates and the compatibility status projection. Payment allocation, credit-note allocation, automatic credit settlement, overdue materialization, and AR queries must reuse it or its exported constants instead of restating status arrays/ternaries.

### No enum migration

The uppercase enum values are existing durable contracts across Prisma, API, integration SDK, reports, Billing, Invoice, and shared Billing UI. This run does not migrate those stored values.

### Commands, not status setters

Lifecycle-changing behavior is exposed as explicit domain commands (`finalize`, `send`, `void`, `write-off`, payment allocation, credit-note application). Generic invoice updates do not become a back door for financial status transitions.

## Dispatched briefs

No sub-agent briefs. This GPT Web run is implementing directly through the GitHub connector.

## Execution reports

| Tool | Report | Status |
| --- | --- | --- |
| GPT Web | `./reports/gpt-web/2026-09-07-invoice-lifecycle-hardening.md` | pending |

## Task checklist

### Phase 1 — Lifecycle foundation

- [ ] Locate every existing owner/call site for invoice collectible-status and settlement-status logic.
- [ ] Add one canonical lifecycle helper without changing the durable enum.
- [ ] Reuse it from payment allocations, credit-note allocations, automatic settlement, overdue materialization, and AR status predicates where layer boundaries permit.
- [ ] Add focused invariant tests, including overdue + partial settlement precedence.

### Phase 2 — Lifecycle command hardening

- [ ] Verify finalization already recomputes totals/snapshots/AR and preserve the newer inventory side effects from `main`.
- [ ] Prevent illegal direct financial state transitions through update paths.
- [ ] Add explicit invoice send command that records communication evidence without creating a second receivable.
- [ ] Harden void eligibility against settled invoices and preserve reversal/audit evidence.
- [ ] Add explicit full-remaining-balance write-off workflow and durable evidence if the current schema lacks it.

### Phase 3 — Settlement consistency

- [ ] Route payment and credit-note allocations through the canonical lifecycle projection.
- [ ] Ensure settlement formula keeps cash, credits, and write-offs distinct.
- [ ] Preserve unapplied overpayments/customer credits.
- [ ] Ensure reversals restore the correct open/overdue/partial compatibility state.

### Phase 4 — Contract and shared UI parity

- [ ] Read `sdk-conventions.md`, `stripe-api-pattern.md`, `shared-product-ui.md`, `app-structure.md`, and `app-layout.md` before edits.
- [ ] Add bounded SDK methods for new lifecycle commands if missing.
- [ ] Keep Billing and Invoice lifecycle actions/status presentation in `@876/billing-ui` where both surfaces need the behavior.
- [ ] Expose settlement evidence and lifecycle timeline only if the backend contract is complete enough to support them honestly.

### Phase 5 — Documentation, compatibility review, and handoff

- [ ] Update `apps/billing/BILLING_ENGINE.md` and accounting docs to distinguish financial, settlement, due, and communication dimensions.
- [ ] Search for duplicate lifecycle rules and stale direct status writes.
- [ ] Review the complete branch diff for compatibility residue, swallowed errors, duplicate helpers, and scope leaks.
- [ ] Write the GPT Web report with exact unverified items and orchestrator commands.

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
```

If shared Billing packages or hosts change:

```bash
pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/invoice-app typecheck
```

Use the actual workspace names from each affected `package.json` if they differ from the labels above.

## Multi-session continuity / handoff

Current state:

- Branch created from the latest `main` after commercial data-plane PR #513 merged.
- Existing Billing engine already has finalization, voiding, AR ledger entries, payment allocations, credit-note allocations, automatic credit application, overdue materialization, inventory consumption on invoice finalization, and all eight compatibility statuses.
- Duplicate settlement/status logic has been confirmed in `documents/repositories/invoices/settlement.ts`, payment repository code, credit-note repository code, overdue materialization, and customer AR status predicates.
- No application code has been edited yet.
- No tests, typecheck, lint, build, Prisma validation, drift check, API contract check, migration, or generator has been executed.

Exact next step: implement Phase 1 against the existing owner files, starting with a canonical lifecycle helper and focused tests, then replace duplicated status decisions without changing public wire values.

## PR preparation summary

Not ready. No PR is to be opened by GPT Web. The final section will list commits, changed files, and orchestrator verification evidence after implementation.
