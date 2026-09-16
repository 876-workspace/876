# Implementation Plan: 876 Projects Phase 9 — Budgets & Billing Integration

- **Run ID:** `2026-09-15-projects-phase-9`
- **Branch:** `feature/projects-phase-8-time` (9a lands alongside phase 8; the PR covers both)
- **Status:** `IN_PROGRESS`

## Binding decisions

1. **876 Billing owns money. Projects owns effort and budgets.** Per `.claude/rules/billing-commercial-platform.md` and `platform-services.md`, Projects must not create customers, invoices, payments or ledger rows of its own. Invoicing calls Billing through `@876/billing/service` with the Projects app credential; Projects stores the resulting opaque invoice id only.
2. **New Projects-owned models** (`projects_project_billing`, `projects_budgets`, `projects_rates`):
   - project billing config: `billingMethod` ∈ `non-billable | fixed-fee | time-and-materials | hourly | phase-based`, `currency`, optional `billingCustomerId` (opaque Billing customer), `fixedFeeAmount` (minor units, integer).
   - budget: scope (`project | milestone | user`), `amountMinor` **or** `hours` (exactly one), `thresholdPercent`, `periodStart`/`periodEnd` optional.
   - rate: scope (`project | user | project-user`), `billRateMinor` per hour, `costRateMinor` per hour, `currency`, effective range.
3. **Money is integer minor units end to end; rates and percentages are strings/integers, never JS floats** (`.claude/rules/billing-data-plane.md`). No `number` carries an amount.
4. **Planned vs actual is derived on read** from Phase 8 time entries and these rates — never stored. Cost = minutes × costRate; revenue = billable minutes × billRate; both computed in a **pure module** `finance.calculations.ts` with integer maths and documented rounding (round half up at the minute→hour conversion, once, at the end).
5. **Rate resolution is explicit and ordered**: project-user rate → user rate → project rate → none. A missing rate yields `null`, never 0 — an unpriced entry must be visibly unpriced rather than silently free.
6. **Invoice creation is a Billing call, and it is idempotent.** `POST /projects/:id/invoice-drafts` takes the approved, unbilled time entries in a period, calls Billing once with an idempotency key derived from (tenant, project, period, entry id set), stores the returned invoice id against those entries (`billedInvoiceId`), and refuses to bill an entry twice. Only **approved** entries are billable.
7. **No payment, tax, or ledger logic in Projects.** No second invoice numbering. No writes into Billing's tables.

## Brief
| Brief | Delegate | Scope |
| ----- | -------- | ----- |
| briefs/codex/9a-api.md | Codex `-p muse` | billing config, budgets, rates, derived financials, invoice-draft handoff |
