# Codex brief — Phase 2: Recurring Invoices data plane (backend + SDK)

Run: `plans/2026-09-11-commercial-engine-account-ledger/` · Branch:
`feat/commercial-engine-account-ledger` (checked out; do not create/switch/push
branches). **Do not commit.** No AI attribution. Phase 1 (engine correctness,
shared finalize core, drain-until-done sweep, Vercel cron) is already on this
branch — build on it, do not re-derive it.

## Read first (binding)

`CLAUDE.md`, `.agents/rules/ai-code-quality.md`, `express-api.md`,
`api-backend.md`, `billing-data-plane.md`, `billing-commercial-platform.md`,
`finance-app-parity.md`, `sdk-conventions.md`, `stripe-api-pattern.md`,
`naming.md`, `testing.md`, `error-handling.md`, `module-settings.md`, and
`apps/billing/docs/accounting-model.md`. Read `plan.md` → "Key design
decisions" item 4.

## What a Recurring Invoice is (fixed design — do not redesign)

A **Recurring Invoice** is a tenant-scoped *profile* that generates ordinary
canonical Invoices on a cadence from a template of free-form document lines.
It is **not** a Subscription: no Plans/Prices required, no proration, no
amendments. It exists so an org can bill "JMD 45,000 retainer every month" in
876 Invoice and 876 Billing (Zoho Books "Recurring Invoice").

- It belongs to the existing `invoices` module. **No new module key, no new
  permission key, no new integration scope** — tenant routes use the same
  permissions as invoices; integration routes use `billing.invoices.read` /
  `billing.invoices.write`.
- A generated Invoice is an ordinary Invoice (same numbering, lines, totals,
  finalize core, ledger, AR, inventory, billing event). It carries a nullable
  `recurringInvoiceId` link so the profile can list its children and the
  invoice detail can show its origin.

### Resource shape (API/JSON camelCase; object `recurring-invoice`)

```
id, object: 'recurring-invoice', profileName, customerId, currency,
status: 'active' | 'paused' | 'stopped' | 'expired',
frequency: { intervalUnit: 'week'|'month'|'year', intervalCount: int ≥1 }
  (also support 'day' only if the existing addInterval helper already does),
startAt, endAt | null, maxCycles | null,
nextRunAt | null, lastRunAt | null, generatedCount,
generationMode: 'draft' | 'finalize' | 'finalize-and-send',
paymentTermId | null, salespersonId | null, priceListId | null,
taxBehavior, notes | null, terms | null,
lines: [ document lines — reuse the canonical document line input schema and
         buildDocumentLines/calculateDocumentTotals; itemId/variantId optional ],
subtotalAmount, discountAmount, taxAmount, totalAmount (template preview,
  minor-unit strings), createdAt, updatedAt
```

Symbolic values are kebab-case per `naming.md`. Map to UPPER_SNAKE Prisma enums
only if that is the established Billing convention (check `enums.prisma`);
serialize kebab/lowercase to match the newest resources (see how Sales
Receipts serialize `status`).

Template lines are **editable** (it is a template, not a finalized document).
Each generated invoice snapshots lines and resolves prices at generation time
exactly like a manually created invoice with the same lines would. Do not write
a second totals calculation.

### Generation engine

- Table `billing_recurring_invoices` (+ `billing_recurring_invoice_lines`) and a
  run table `billing_recurring_invoice_runs` with
  `UNIQUE (recurring_invoice_id, scheduled_for)`, status
  `processing|succeeded|failed`, attempt count, error code/message, invoiceId —
  same pattern as `SubscriptionBillingRun`.
- Add `recurring_invoice_id` (nullable, FK within Billing DB) to
  `billing_invoices` + index.
- Indexes for the sweep: `(status, next_run_at)`, `(tenant_id, customer_id)`.
- Hand-write the migration at
  `apps/billing-api/prisma/migrations/20260911150000_recurring_invoices/migration.sql`
  and verify it with `prisma migrate diff` from the previous schema (the
  sales-receipts closeout in the prior run did exactly this). Regenerate the
  client with `pnpm --filter @876/billing-api db:generate`.
- A `generateDueRecurringInvoice(tenantId, id, asOf, { transaction })`
  function: row-lock the profile, skip unless `active` and `nextRunAt <= asOf`,
  create the run row, create the Invoice through the canonical create path
  (refactor it to accept a transaction if it does not — keep one
  implementation), finalize through the Phase 1 shared finalize core when mode
  is `finalize`/`finalize-and-send`, record send communication through the
  existing send workflow when `finalize-and-send` (only the communication
  stamp — no email provider work beyond what `send` already does), advance
  `nextRunAt` with the existing `addInterval` helper anchored on `startAt`
  (no drift across month ends), increment `generatedCount`, set `expired` when
  `endAt`/`maxCycles` is reached. `issueAt` = the scheduled run time, not
  `asOf`, so a late sweep still dates invoices correctly.
- If the customer is archived/deleted or the currency is disabled, fail that
  run with a registered error, keep the profile `active`, and let the next
  sweep retry (a failure must not advance `nextRunAt`).
- Wire it into `runBillingSweep` as a second claim loop (same
  `FOR UPDATE SKIP LOCKED`, same time budget, same `hasMore` semantics). Add
  counts to the run result additively (`recurringInvoices: { processed,
  succeeded, failed, skipped }` or the flattest shape that fits the existing
  strict schema). Catch-up rule: one sweep generates **at most one** invoice per
  profile per claim; a profile several periods behind catches up across
  successive claims in the same drain loop, each dated at its own scheduled time.

### Commands (tenant session routes + integration routes, mirroring
`modules/documents/sales-receipts.routes.ts`)

`list` (filter by `status`, `customerId`; cursor pagination), `create`,
`retrieve`, `update` (template + schedule; changing `startAt`/frequency
recomputes `nextRunAt` only forward), `pause`, `resume` (recomputes the next
future run; never back-fills skipped periods), `stop` (terminal), `delete`
(only when `generatedCount = 0`; soft-delete per `deletions.md` otherwise
reject with 409), and `list children` (the invoices it generated — reuse the
invoice list with a `recurringInvoiceId` filter rather than a new list query).

Module placement: a new sub-area of `modules/documents` (e.g.
`recurring-invoices.{routes,controller,service}.ts` + `repositories/recurring-invoices/`
+ `schemas/recurring-invoice.ts`), following the sales-receipts layout. Register
routes where sales receipts are registered. Expected failures are registered
errors (`billing/recurring-invoice-not-found`, etc. — follow the existing
catalog style), never ad-hoc messages.

### SDK (`packages/billing`)

Add `recurringInvoices` resource(s) at the same entrypoints sales receipts are
exposed (tenant/session client and `integration`), with Zod response parsing
and tests mirroring `resources/sales-receipts.ts`. Add `recurringInvoiceId` to
the invoice resource schema (nullable, additive) and the invoice list filter.
Add `'recurring-invoices'` to `apps/invoice/src/lib/api/resource-manifest.ts`
**only** if the Invoice app's Pattern-B proxy is how Invoice reaches invoices
(it is — see that file); update its manifest test.

## Tests (minimum counts — count and report)

- schema validation: ≥ 8 (frequency bounds, endAt < startAt rejected,
  maxCycles ≥ 1, empty lines rejected, currency enabled, extra keys rejected…)
- generation: ≥ 12 — draft vs finalize vs finalize-and-send; ledger DEBIT only
  when finalized; AR recompute; idempotent replay of the same scheduledFor;
  month-end anchor (Jan 31 → Feb 28/29 → Mar 31); endAt and maxCycles expiry;
  paused profile skipped; failure does not advance nextRunAt; late sweep dates
  invoice at scheduled time; catch-up across two claims; generated invoice has
  `recurringInvoiceId`.
- commands: ≥ 10 (pause/resume/stop transitions incl. invalid transitions →
  409, delete guard, update recomputes nextRunAt forward only, tenant isolation
  404, integration scope enforcement via Supertest).
- sweep integration: ≥ 3.
- SDK: ≥ 6 (parse success, malformed response rejected, endpoints/paths, list
  filters, integration entrypoint, invoice `recurringInvoiceId` parse).

## Must not

No UI (Phase 4). No reporting (Phase 3). No `eslint-disable` / `as any` /
`@ts-ignore`. No new permission keys or modules. No second line-total or
finalize implementation. Do not touch `apps/billing` or `apps/invoice` except
the Invoice resource manifest + its test.

## Verification (foreground, paste results)

```bash
pnpm --filter @876/billing-api db:generate
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api api:contract:generate && pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
pnpm --filter @876/invoice-app test -- resource-manifest
grep -rn "eslint-disable\|as any\|@ts-ignore" apps/billing-api/src packages/billing/src
```

## Report

`plans/2026-09-11-commercial-engine-account-ledger/reports/codex/2026-09-11-phase-2-recurring-invoices.md`
— files + why, migration SQL in full, open decisions and your choice, counted
`it()` per group, verification output, what you could not do. No run logs.
