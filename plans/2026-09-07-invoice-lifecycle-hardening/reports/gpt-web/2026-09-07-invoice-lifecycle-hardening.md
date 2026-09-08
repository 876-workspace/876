# GPT Web Report: Invoice Lifecycle Hardening

**Run ID:** `2026-09-07-invoice-lifecycle-hardening`  
**Branch:** `feature/invoice-lifecycle-hardening`  
**Base:** `main@d0475b5da880d84f483f42bdd2d9f46b3ff6e5ae`  
**Execution environment:** GitHub connector only  
**Verification:** not executed; verification is the orchestrator's

## Outcome

The existing 876 Billing invoice engine was hardened rather than replaced. The
current durable eight-value `InvoiceStatus` contract remains intact, while the
backend now has one canonical collectible-state projection used by payment
allocations, credit-note applications, automatic credit settlement, and overdue
materialization. Explicit send and full-balance write-off commands were added,
void eligibility was tightened, the bounded Billing SDK and integration client
were extended, and Billing/Invoice now render lifecycle actions through one
shared `@876/billing-ui` component.

The important behavioral result is that communication, delinquency, and
settlement no longer overwrite one another accidentally. A partially settled
past-due invoice remains `OVERDUE`; recording another send updates `sentAt`
without replacing that financial status; a write-off clears only the remaining
receivable and records `WRITE_OFF` accounting evidence without pretending cash
was received or reversing inventory.

## Per-phase status and tests added

| Phase | Status | Literal `it()` declarations added | Notes |
| --- | --- | ---: | --- |
| 1 — Lifecycle foundation | Complete | 9 | New `invoice-lifecycle.test.ts`. Two `it.each` declarations expand the file to 15 runtime cases. |
| 2 — Lifecycle command hardening | Complete | 6 shared with Phase 3 | Existing workflow suite grew from 5 to 11 declarations: three send cases, one void regression, two write-off cases. |
| 3 — Settlement consistency | Complete | 0 additional beyond the 6 above | Payment/credit/auto-settlement paths use the same projection; workflow cases cover command invariants. |
| 4 — SDK and shared UI parity | Complete with one deliberate deferral | 11 | Seven new shared Billing UI cases plus four Invoice same-origin client lifecycle-command cases. |
| 5 — Documentation/review/handoff | Complete | 0 | Engine/accounting docs updated; diff reviewed; report written. |

**Total new literal `it()` declarations: 26.** The lifecycle file's parameterized
cases make the expected executed-case count higher than 26, but no test was run
from this environment.

## Architecture decisions

### Preserve the durable status contract

No Prisma enum or stored-value migration was introduced. Existing public and
persisted values remain:

```text
DRAFT
OPEN
SENT
PARTIALLY_PAID
OVERDUE
PAID
UNCOLLECTIBLE
VOID
```

Changing those values would require a coordinated database/API/SDK/UI migration
and was unnecessary for the lifecycle hardening goal.

### Canonical collectible projection

`apps/billing-api/src/modules/documents/invoice-lifecycle.ts` now owns the
collectible status set and the flattened status projection:

```text
amountDue = 0                       -> PAID
positive balance after dueAt       -> OVERDUE
cash or credit applied             -> PARTIALLY_PAID
sentAt exists                      -> SENT
otherwise                          -> OPEN
```

This deliberately gives `OVERDUE` precedence over `PARTIALLY_PAID` while a
positive balance remains.

### Sending is communication

The new send command is transactional and optionally idempotent. It records
`sentAt` and an `invoice.sent` outbox event. `OPEN` becomes the legacy-compatible
`SENT`; `PARTIALLY_PAID`, `OVERDUE`, and `PAID` retain their financial status.
Draft, void, and uncollectible invoices are rejected.

### Write-off is not payment and not void

The write-off command writes off the **entire remaining balance** in this MVP.
It:

- requires a non-empty audit reason;
- requires a collectible invoice with `amountDue > 0`;
- sets `amountDue` to zero;
- increments `amountWrittenOff`;
- moves status to `UNCOLLECTIBLE`;
- records a `WRITE_OFF` ledger credit;
- recomputes customer AR;
- emits `invoice.written-off`;
- does not restore Inventory, because the sale still happened.

No new write-off table or migration was necessary because the engine already had
`amountWrittenOff`, `UNCOLLECTIBLE`, the `WRITE_OFF` ledger type, metadata, and
outbox infrastructure.

### Void remains an unsettled-invoice correction

Void continues to reverse the posted receivable and inventory sale movement, but
it now explicitly rejects `UNCOLLECTIBLE` and other non-collectible states in
addition to rejecting paid/allocated invoices. Active payment or credit-note
allocations still block voiding.

Because the flattened `OVERDUE` status can now represent a partially settled
invoice, the shared UI does not infer that `OVERDUE` or `PARTIALLY_PAID` is safe
to void. It presents Void only for `OPEN` and `SENT`. If the product later needs
to void an unsettled overdue invoice, the correct next step is a server-provided
capability/settlement summary rather than guessing from status alone.

### Customer AR predicate remains locally duplicated

The Customers AR repository still carries its local four-status open-invoice
predicate. Documents workflows already call Customers to recompute AR; making
Customers import Documents would create a cross-module cycle prohibited by the
backend rules. Documents' settlement/overdue code uses the canonical lifecycle
module; the Customer AR list is documented as the deliberate boundary exception
until dependency direction is redesigned.

### Timeline UI deliberately deferred

Outbox events now contain `invoice.sent` and `invoice.written-off`, but the
outbox is not a user-facing invoice-history read API. No fake timeline was added
to Billing or Invoice. A future timeline should be implemented only after the
backend exposes a durable, authorized invoice-event read contract.

## Files changed and why

### Billing API — lifecycle owner

- `apps/billing-api/src/modules/documents/invoice-lifecycle.ts` — canonical
  collectible status sets and flattened status projection.
- `apps/billing-api/src/modules/documents/invoice-lifecycle.test.ts` — lifecycle
  invariants, including overdue-over-partial precedence.
- `apps/billing-api/src/modules/documents/index.ts` — exposes lifecycle helpers
  to other bounded Billing modules such as Payments.
- `apps/billing-api/src/modules/documents/repositories/invoices/mark-overdue.ts`
  — consumes the canonical overdue-candidate status set.
- `apps/billing-api/src/modules/documents/repositories/invoices/settlement.ts` —
  automatic cash/credit settlement now projects status centrally.
- `apps/billing-api/src/modules/payments/repositories/payments/shared.ts` — manual
  payment allocations validate collectible invoices and project status centrally.
- `apps/billing-api/src/modules/documents/repositories/credit-notes/shared.ts` —
  credit applications use the same collectible predicate/projection.

### Billing API — lifecycle commands

- `apps/billing-api/src/modules/documents/repositories/invoice-workflow.ts` —
  repository helpers for send/write-off and metadata-preserving void/write-off
  updates.
- `apps/billing-api/src/modules/documents/workflows/send-invoice.ts` —
  transactional/idempotent communication command.
- `apps/billing-api/src/modules/documents/workflows/write-off-invoice.ts` —
  transactional/idempotent full remaining-balance write-off.
- `apps/billing-api/src/modules/documents/workflows/void-invoice.ts` — hardened
  collectible/settlement eligibility.
- `apps/billing-api/src/modules/documents/workflows/index.ts` — exports new
  workflows.
- `apps/billing-api/src/modules/documents/workflows/invoice-workflows.test.ts` —
  send, uncollectible-void, and write-off regression coverage.
- `apps/billing-api/src/modules/documents/schemas/invoice.ts` — strict required
  write-off reason contract.
- `apps/billing-api/src/modules/documents/documents.service.ts` — bounded service
  commands for send/write-off with integration ownership checks.
- `apps/billing-api/src/modules/documents/documents.controller.ts` — thin tenant
  and integration transport adapters with command idempotency context.
- `apps/billing-api/src/modules/documents/documents.routes.ts` — session and
  integration `send`/`write-off` routes with typed validation/OpenAPI contracts.
- `apps/billing-api/src/modules/outbox/outbox.service.ts` — typed
  `invoice.sent` and `invoice.written-off` event contracts.

### Bounded Billing SDK

- `packages/billing/src/types/invoice.ts` — `InvoiceWriteOffParams` contract,
  while preserving the existing editor-facing JSDoc.
- `packages/billing/src/types/index.ts` — canonical export for write-off params.
- `packages/billing/src/resources/invoices.ts` — session/tenant `send()` and
  `writeOff()` resource commands.
- `packages/billing/src/integration/types/invoice-write-off.ts` — integration
  write-off input contract.
- `packages/billing/src/integration/types/index.ts` — exposes integration input.
- `packages/billing/src/integration/resources/invoices.ts` — integration
  `send()` and `writeOff()` commands.

### Billing host

- `apps/billing/src/types/invoice.ts` — host write-off request type.
- `apps/billing/src/lib/client/invoices.ts` — same-origin browser send/write-off
  methods.
- `apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/_components/invoice-actions.tsx`
  — thin adapter over shared lifecycle presentation; supplies Billing callbacks
  and conservative void eligibility.

### Invoice host

- `apps/invoice/src/lib/client/documents.ts` — same-origin finalize/send/void/
  write-off commands with idempotency headers.
- `apps/invoice/src/lib/client/documents.test.ts` — exact proxy path/body/header
  coverage for four lifecycle commands.
- `apps/invoice/src/app/(app)/invoices/[invoiceId]/_components/invoice-actions.tsx`
  — thin adapter over the shared lifecycle presentation, retaining host access
  gating and navigation behavior.

### Shared Billing UI

- `packages/billing-ui/src/invoice-lifecycle-actions.tsx` — one presentation
  implementation for Print/Edit/Finalize/Send/Write-off/Void/Delete, with host
  callbacks and localized mutation errors.
- `packages/billing-ui/src/invoice-lifecycle-actions.test.tsx` — draft,
  overdue, open-void, write-off-reason, paid, and terminal-state presentation
  coverage.
- `packages/billing-ui/package.json` — public subpath export and test/runtime
  package declarations needed by the new shared component.

### Documentation/tracker

- `apps/billing/BILLING_ENGINE.md` — hardened lifecycle semantics and command
  distinctions.
- `apps/billing/docs/accounting-model.md` — AR/settlement/write-off model and
  Customer-module boundary exception.
- `plans/2026-09-07-invoice-lifecycle-hardening/plan.md` — durable tracker and
  handoff state.
- `plans/2026-09-07-invoice-lifecycle-hardening/reports/gpt-web/2026-09-07-invoice-lifecycle-hardening.md`
  — this report.

## Migration SQL

None. No Prisma schema change, migration, generator, or live database operation
was required or executed.

## Compatibility review

- Existing `InvoiceStatus` values were preserved.
- Existing invoice create/update/finalize/void routes were not renamed.
- Existing Billing/Invoice action behavior (print, draft edit, finalize, void,
  delete) was preserved and moved behind shared presentation where appropriate.
- `SENT` remains a compatibility status rather than being removed.
- New send/write-off APIs are additive.
- No compatibility alias or deprecated route was introduced.
- The initially generated SDK type-file JSDoc churn was detected during diff
  review and restored so the final type change is only the write-off contract.
- A self-import in the initial write-off workflow draft was detected and fixed
  to a relative Documents-internal lifecycle import.
- Shared UI originally offered Void for every collectible status; review caught
  that `OVERDUE` can be partially settled under the new projection, so both the
  shared UI and host adapters were tightened to avoid presenting an action whose
  legality cannot be proven from status alone.

## Deliberate gaps

1. **No user-facing invoice timeline.** There is no appropriate read contract
   yet; outbox events are delivery infrastructure, not a UI history API.
2. **No server-provided lifecycle capabilities object.** The shared UI uses
   conservative status presentation. A future invoice detail contract should
   expose capabilities or settlement evidence if richer action eligibility is
   needed.
3. **No partial write-off.** This implementation writes off the complete
   remaining receivable. Partial write-off needs a more explicit reversal and
   evidence contract before being exposed.
4. **Customer AR open-status predicate remains local** to avoid a Documents ↔
   Customers module cycle.
5. **No enum normalization/migration.** Uppercase legacy values remain durable
   compatibility values.

## Risks for the reviewer to check first

1. Run Billing API typecheck/boundaries first: the lifecycle helper is consumed
   across Documents, Payments, and Credit Notes and the repo enforces module
   boundaries.
2. Exercise payment and credit-note allocation against an already-overdue invoice
   and verify the persisted status remains `OVERDUE` with the correct remaining
   balance.
3. Exercise send against OPEN, OVERDUE, PARTIALLY_PAID, PAID, DRAFT, VOID, and
   UNCOLLECTIBLE to verify the compatibility behavior and event emission.
4. Exercise write-off against OPEN/OVERDUE and verify AR cache, ledger entry,
   `amountWrittenOff`, `amountDue`, and Inventory are all correct.
5. Verify void still restores Inventory only for eligible unsettled invoices and
   refuses allocations/write-offs.
6. Run API contract generation/check to catch any missing operation metadata or
   response-shape mismatch on the two additive routes.
7. Run Billing UI tests/typecheck because the shared component relies on the
   repository's Base UI `AlertDialogTrigger render={...}` pattern and Next peer
   dependencies.
8. Review integration idempotency expectations. The backend supports optional
   command idempotency; the existing integration resource style did not expose
   command-specific idempotency options for finalize/void, and this run preserved
   that shape for send/write-off rather than creating an inconsistent new API.

## Verification not performed

GPT Web has no shell, package manager, database, runtime, or test runner in this
repo workflow. The following were **not executed**:

- Prettier;
- ESLint;
- TypeScript typecheck;
- Vitest;
- dependency-cruiser boundaries;
- Next/Express builds;
- Prisma validate/generate/migrate;
- database drift checks;
- API contract checks;
- live database migrations;
- browser/manual testing;
- CI workflow execution.

No statement in this report should be read as claiming those checks pass.

## Orchestrator verification commands

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

If those checks expose generated API or formatting changes, the orchestrator
should inspect and commit only intentional output, following the repo's no-churn
rules.

## PR / branch state

No pull request was opened. GPT Web operating rules prohibit opening or
commenting on PRs. At the last pre-report comparison the branch was based exactly
on `main@d0475b5` with no commits behind main; the orchestrator should re-check
`main` before PR preparation because main may advance after this report.
