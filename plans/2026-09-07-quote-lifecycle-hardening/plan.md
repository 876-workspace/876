# Implementation Plan: Quote Lifecycle Hardening

**Run ID:** `2026-09-07-quote-lifecycle-hardening`  
**Branch:** `feature/quote-lifecycle-hardening`  
**Base:** `main@4f869314ff2b264d12bc5c07f1c9017392b55ad8`  
**Status:** COMPLETED — UNVERIFIED; REBASE REQUIRED BEFORE LOCAL VERIFICATION

## Overview

Finish the quote lifecycle foundation on top of the invoice/payment work merged in PR #514. The implementation makes quote decisions and quote-to-invoice conversion explicit domain workflows without turning Quote into an order engine or conflating quote decision state with invoice state.

## Completed outcomes

1. Centralized quote lifecycle transition rules in the Billing API.
2. Added replay-safe lifecycle commands and optional command idempotency.
3. Added durable first-send and expiry timestamps plus transactional quote lifecycle outbox events.
4. Added explicit `expire` and `convert-to-invoice` commands.
5. Kept conversion on the canonical quote-backed invoice creation path; no second invoice-copy implementation exists.
6. Made conversion naturally replay-safe by returning the already-linked invoice and recovering concurrent duplicate conversion races.
7. Preserved `QuoteStatus` as the decision lifecycle; `convertedInvoice` remains the durable conversion dimension instead of adding `INVOICED`.
8. Added tenant quote conversion preferences backed by the existing `ModulePreference` owner: `manual | draft-invoice-on-accept`, defaulting to `manual` without a redundant row.
9. Added tenant and integration quote command parity through `@876/billing`.
10. Consolidated Billing and Invoice quote action presentation in `@876/billing-ui` while hosts retain transport, routing, permissions, navigation, and refresh behavior.
11. Froze expired draft/sent quotes at the service boundary rather than relying only on UI visibility.
12. Added focused API/domain/SDK/shared-UI tests as code. None were executed by GPT Web.
13. Added `apps/billing/docs/quote-lifecycle.md` describing lifecycle, expiry, conversion, preferences, and accounting boundaries.

## Architectural invariants

1. A quote is a non-posting commercial proposal. Acceptance does not create accounts receivable.
2. Quote decision status and invoice conversion are separate dimensions.
3. `convertedInvoice != null` is durable evidence that a quote has been converted.
4. A quote may have at most one converted invoice.
5. Conversion creates a **draft** invoice. Invoice finalization remains the accounting boundary.
6. Conversion reuses the canonical quote-backed invoice creation repository/workflow.
7. Repeated conversion returns the already-linked invoice; it does not create a second invoice.
8. An unaccepted quote cannot be accepted after its proposal expiry time has passed.
9. A quote that was accepted while valid remains accepted and may still be converted later; proposal expiry does not retroactively invalidate an accepted commercial decision.
10. Draft quotes are editable/deletable only while they remain valid drafts. Sent/accepted/declined/canceled/expired quotes are historical commercial documents.
11. Automatic conversion may create a draft invoice after acceptance, but this run never auto-finalizes or auto-sends it.
12. No sales-order implementation was introduced.
13. Expected lifecycle conflicts use Billing application errors rather than leaking database/provider failures.

## Canonical decision lifecycle

```text
DRAFT -> SENT
DRAFT -> ACCEPTED        # manual/internal acceptance while valid
DRAFT -> CANCELED
SENT  -> SENT            # resend: fresh communication evidence, first sentAt preserved
SENT  -> ACCEPTED
SENT  -> DECLINED
SENT  -> CANCELED
DRAFT/SENT -> EXPIRED    # only when expiresAt <= now
```

`ACCEPTED`, `DECLINED`, `CANCELED`, and `EXPIRED` are terminal decision states. A converted quote stays `ACCEPTED`; the conversion relation supplies the derived presentation state "Invoiced".

## Expiry semantics

`expiresAt` is authoritative for whether a still-open proposal may be accepted. GET/read paths do not mutate status. Persistence of `EXPIRED` happens only through the explicit expiry command.

Important final correction: an already-accepted quote is not rejected from conversion merely because its original proposal expiry time later passes. Acceptance is durable evidence that the customer decision happened while the quote was valid.

## Conversion command

```text
POST /api/v1/quotes/:quoteId/convert-to-invoice
```

The command delegates to the existing quote-backed invoice creation path. If `convertedInvoice` already exists, it returns that invoice as a replay. A concurrent one-to-one conflict is re-read and converted into the same replay result when another caller won the conversion race.

Integration parity uses:

```text
POST /api/v1/integrations/organizations/:organizationId/quotes/:quoteId/convert-to-invoice
```

## Conversion preferences

Tenant-owned preference:

```text
manual
draft-invoice-on-accept
```

Default: `manual`.

Storage reuses the existing generic `ModulePreference` table under the quote module. The default is represented by absence of an override row. This run does not add `finalize`, `send`, or sales-order conversion preferences.

## Permissions

No new persisted permission catalog was invented. Backend tenant routes continue to use the existing `sales:read` / `sales:write` authority. Product-host UI continues to use the host's existing quote/invoice capabilities, and integration routes use existing Billing quote integration scopes.

## Rules read

- `CLAUDE.md`
- `.agents/rules/gpt-web-operating-rules.md`
- `.agents/rules/execution-autonomy.md`
- `.agents/rules/implementation-tracker.md`
- `.agents/rules/ai-code-quality.md`
- `.agents/rules/naming.md`
- `.agents/rules/types.md`
- `.agents/rules/code-style.md`
- `.agents/rules/testing.md`
- `.agents/rules/error-handling.md`
- `.agents/rules/api-backend.md`
- `.agents/rules/sdk-conventions.md`
- `.agents/rules/stripe-api-pattern.md`
- `.agents/rules/module-settings.md`
- `.agents/rules/data-fetching.md`
- `.agents/rules/app-structure.md`
- `.agents/rules/shared-product-ui.md`
- `.agents/rules/app-layout.md`
- `.agents/rules/access-control.md`
- `.agents/rules/app-api-routing.md`
- `.agents/rules/git.md`

## Phase checklist

### Phase 0 — Inventory current owner

- [x] Confirm PR #514 is merged to the run's base and contains accepted-only quote conversion.
- [x] Confirm quote transition commands already exist and inventory their state table.
- [x] Confirm draft-only update/delete behavior already exists.
- [x] Confirm conversion relation is one-to-one and quote retrieval exposes `convertedInvoice`.
- [x] Confirm existing invoice create path copies quote lines into a draft invoice.

### Phase 1 — Quote lifecycle domain workflow

- [x] Add canonical quote transition helper and workflow.
- [x] Add durable first-send and expiry timestamp persistence.
- [x] Enforce expiry on acceptance while preserving already-accepted quote decisions.
- [x] Support manual acceptance from DRAFT and SENT.
- [x] Add explicit expiry command/workflow for eligible expired quotes.
- [x] Emit quote lifecycle outbox events using the existing Billing event mechanism.
- [x] Add command idempotency support to quote transition commands.
- [x] Add focused lifecycle tests as code.

### Phase 2 — Explicit idempotent conversion

- [x] Add `convertQuoteToInvoice` service command.
- [x] Reuse the canonical quote-backed invoice creation implementation.
- [x] Treat an existing converted invoice as a successful replay.
- [x] Recover a concurrent duplicate conversion by re-reading the one-to-one relation.
- [x] Add tenant and integration API routes/controllers.
- [x] Add `@876/billing` tenant/integration SDK methods and tests.
- [x] Add Billing and Invoice host browser-client commands where required.
- [x] Add focused conversion tests for non-accepted, accepted, post-expiry accepted, replay, and concurrent replay behavior.

### Phase 3 — Quote conversion preference foundation

- [x] Reuse existing Billing `ModulePreference` ownership rather than creating another settings table.
- [x] Add `manual | draft-invoice-on-accept` preference contract.
- [x] Default to `manual` without storing redundant default rows.
- [x] On quote acceptance, create one draft invoice when the preference is `draft-invoice-on-accept`.
- [x] Keep finalization and sending explicit separate commands.
- [x] Add preference schema/SDK catalog foundation.

### Phase 4 — Shared UI and host parity

- [x] Centralize quote lifecycle action presentation in `@876/billing-ui`.
- [x] Show `View invoice` whenever a converted invoice link exists.
- [x] Show `Convert to invoice` only for accepted, unconverted quotes with invoice-create authority.
- [x] Expose manual Accept for valid draft/sent quotes where the host permits it.
- [x] Expose explicit `Mark expired` for expired DRAFT/SENT quotes.
- [x] Remove invalid actions after terminal states and freeze expired drafts.
- [x] Preserve host-owned routing, authorization, mutation transport, navigation, and refresh.
- [x] Add shared lifecycle UI tests; host adapters remain thin and require integration/browser verification locally.

### Phase 5 — Documentation / compatibility review

- [x] Document quote lifecycle, expiry, conversion, and preference semantics.
- [x] Review final branch diff for duplicate helpers/contracts, compatibility residue, swallowed errors, and scope expansion.
- [x] Confirm no `INVOICED` `QuoteStatus` was introduced.
- [x] Confirm no sales-order behavior was introduced.
- [x] Confirm no auto-finalize or auto-send behavior was introduced.
- [x] Write final GPT Web report.
- [x] Complete this implementation tracker.

## Schema / migration

Added:

```text
apps/billing-api/prisma/migrations/20260907232000_quote_lifecycle_timestamps/migration.sql
```

The migration adds quote lifecycle timestamps used by the command/event model. **GPT Web did not run or apply this migration.** Local/orchestrator verification must validate Prisma schema generation, migration consistency, and drift before deployment.

## Verification status

**NOT RUN** by GPT Web:

- Prettier / formatting
- ESLint
- TypeScript typecheck
- Vitest
- dependency/boundary checks
- Next/Express builds
- Prisma validate/generate
- database migration execution
- database drift checks
- API contract generation/check
- browser/manual testing
- CI

Suggested local verification after rebasing onto current `main`:

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

Use the repository's actual current script names if any package labels have changed.

## Upstream drift / rebase handoff

The branch was cut from `main@4f869314ff2b264d12bc5c07f1c9017392b55ad8`. During the run, `main` advanced by six commits beyond that merge base. The newer upstream work primarily affects Billing/Invoice host link-provider composition and shared `@876/billing-ui` link usage.

There is overlap in `packages/billing-ui/package.json`, and upstream also touched `apps/invoice/src/app/layout.tsx` plus several existing Billing UI components. The quote lifecycle implementation does not intentionally replace that host-link architecture, so the local agent should rebase this branch onto current `main`, preserve the newer host link/provider work, and reconcile the package export additions rather than choosing one side wholesale.

Do not treat the branch as verified until that rebase and the verification matrix above complete successfully.

## PR preparation summary

Implementation and documentation are complete for this run, but the branch is **not PR-ready until rebased and verified locally**. No PR was opened by GPT Web.