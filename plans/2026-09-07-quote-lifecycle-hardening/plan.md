# Implementation Plan: Quote Lifecycle Hardening

**Run ID:** `2026-09-07-quote-lifecycle-hardening`  
**Branch:** `feature/quote-lifecycle-hardening`  
**Base:** `main@4f869314ff2b264d12bc5c07f1c9017392b55ad8`  
**Status:** IN_PROGRESS

## Overview

Finish the quote lifecycle foundation on top of the invoice/payment work merged in PR #514. The goal is to make quote decisions and quote-to-invoice conversion explicit domain workflows without turning Quote into an order engine or conflating quote decision state with invoice state.

## Objectives

1. Centralize quote lifecycle transition rules in the Billing API.
2. Make quote commands idempotent where retries are expected.
3. Add an explicit quote-to-invoice conversion command while retaining one underlying invoice-creation implementation.
4. Make conversion replay-safe: a repeated conversion returns the existing linked draft invoice rather than creating or surfacing a second invoice.
5. Preserve `QuoteStatus` as the quote decision lifecycle; expose conversion through the existing `convertedInvoice` relation instead of adding `INVOICED` to the enum.
6. Add organization-level quote conversion preferences using the existing Billing preference ownership model, with conservative defaults.
7. Keep Billing and Invoice hosts aligned through `@876/billing` and `@876/billing-ui`; hosts own transport and authorization.
8. Harden editing/deletion/acceptance rules around sent, expired, terminal, and converted quotes.
9. Add focused tests and update product/accounting documentation.

## Architectural scope

### Owning service

- `apps/billing-api/src/modules/documents/**`
- `apps/billing-api/prisma/**` only if a durable preference/timestamp requires persistence

### Public product contract

- `packages/billing/src/**`
- integration entrypoint only where the existing quote integration surface supports the same capability

### Shared product UI / hosts

- `packages/billing-ui/**` for quote action presentation shared by Billing and Invoice
- `apps/billing/**` and `apps/invoice/**` for same-origin transport, permissions, routing, and page composition

### Documentation

- existing Billing engine / accounting / lifecycle documentation
- this plan and final GPT Web report

## Invariants

1. A quote is a non-posting commercial proposal. Acceptance does not create AR.
2. Quote decision status and invoice conversion are different dimensions.
3. `convertedInvoice != null` is the durable evidence that the quote has been converted.
4. A quote may have at most one converted invoice.
5. Conversion creates a **draft** invoice. Invoice finalization remains the accounting boundary.
6. Conversion reuses the canonical invoice creation repository/workflow; no second invoice-copy implementation is introduced.
7. A repeated conversion of the same accepted quote is a replay and returns the already-linked invoice.
8. Only accepted, non-expired quotes may convert.
9. Draft quotes are editable/deletable. Sent/accepted/declined/canceled/expired quotes are historical commercial documents and are not casually rewritten.
10. Automatic conversion preferences may create a draft invoice after acceptance; this run does not auto-finalize or auto-send invoices.
11. No sales-order implementation is introduced.
12. Expected lifecycle conflicts remain stable Billing application errors; raw database/provider failures are not exposed.

## Key design decisions

### Decision lifecycle

Canonical transitions for this run:

```text
DRAFT -> SENT
DRAFT -> ACCEPTED        # manual/internal acceptance
DRAFT -> CANCELED
SENT  -> ACCEPTED
SENT  -> DECLINED
SENT  -> CANCELED
DRAFT/SENT -> EXPIRED    # only when expiresAt <= now
```

`ACCEPTED`, `DECLINED`, `CANCELED`, and `EXPIRED` are terminal decision states. A converted quote stays `ACCEPTED`; the conversion relation supplies the derived presentation state "Invoiced".

### Expiry

`expiresAt` is authoritative. Acceptance and conversion must reject an already-expired quote. A lifecycle helper may project `EXPIRED` for command decisions; persistence of `EXPIRED` is handled only through the explicit expiry workflow rather than by mutating on a GET.

### Conversion command

Expose an intent-level command:

```text
POST /api/v1/quotes/:quoteId/convert-to-invoice
```

The command delegates to the existing quote-backed invoice creation path. If `convertedInvoice` already exists, return that invoice as a successful replay. No duplicate route-specific copy logic.

### Conversion preferences

Add a tenant-owned quote conversion preference with conservative enum values:

```text
manual
draft-invoice-on-accept
```

Default: `manual`.

No `finalize` or `send` option is added in this run because acceptance must not silently cross the invoice accounting boundary or claim delivery without a provider-backed send workflow.

### Permissions

Do not invent a new persisted permission unless the current Billing permission model already has a quote/invoice-specific catalog ready to grant it. Existing `sales:read` / `sales:write` remains the backend route authority for this run; host UI continues to require the existing quote/invoice capabilities already in use.

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

- [x] Confirm PR #514 is merged to `main` and contains accepted-only quote conversion.
- [x] Confirm quote transition commands already exist and identify their current state table.
- [x] Confirm draft-only update/delete behavior already exists.
- [x] Confirm conversion relation is one-to-one and quote retrieval exposes `convertedInvoice`.
- [x] Confirm existing invoice create path copies quote lines into a draft invoice.

### Phase 1 — Quote lifecycle domain workflow

- [ ] Add canonical quote transition helpers/workflow.
- [ ] Add send timestamp persistence if the current model has no durable send evidence.
- [ ] Enforce expiry on acceptance and conversion.
- [ ] Support manual acceptance from DRAFT.
- [ ] Add explicit expiry command/workflow for eligible expired quotes.
- [ ] Emit quote lifecycle outbox events using the existing Billing event mechanism.
- [ ] Add command idempotency to quote transition commands.
- [ ] Add focused lifecycle tests.

### Phase 2 — Explicit idempotent conversion

- [ ] Add `convertQuoteToInvoice` service/workflow command.
- [ ] Reuse the canonical quote-backed invoice creation implementation.
- [ ] Treat an existing converted invoice as a successful replay.
- [ ] Add API controller/route and integration route if quote integration parity exists.
- [ ] Add `@876/billing` SDK methods and tests.
- [ ] Add host browser-client commands where required.
- [ ] Add conversion tests for accepted, expired, non-accepted, duplicate/replay, and cross-tenant cases.

### Phase 3 — Quote conversion preference foundation

- [ ] Inspect existing Billing preferences/provisioning ownership before adding storage.
- [ ] Add `manual | draft-invoice-on-accept` preference in the canonical owner.
- [ ] Default to `manual` without storing redundant default rows where the current settings architecture permits.
- [ ] On quote acceptance, create one draft invoice only when the preference is `draft-invoice-on-accept`.
- [ ] Keep finalization and sending explicit separate commands.
- [ ] Add preference contract and behavior tests.

### Phase 4 — Shared UI and host parity

- [ ] Centralize quote lifecycle action presentation in `@876/billing-ui` if Billing and Invoice still duplicate it.
- [ ] Show `View invoice` whenever `convertedInvoice` exists.
- [ ] Show `Convert to invoice` only for accepted, unconverted, unexpired quotes with invoice-create authority.
- [ ] Expose manual Accept for draft/sent quotes where the host permits it.
- [ ] Remove invalid actions after terminal states.
- [ ] Preserve host-owned routing, authorization, and mutation transport.
- [ ] Add Billing and Invoice host tests.

### Phase 5 — Documentation / compatibility review

- [ ] Document quote lifecycle, expiry, conversion, and preference semantics.
- [ ] Review final diff for duplicate helpers/contracts, compatibility residue, swallowed errors, or scope expansion.
- [ ] Confirm no `INVOICED` QuoteStatus was introduced.
- [ ] Confirm no sales-order or auto-finalize/send behavior was introduced.
- [ ] Write final GPT Web report.
- [ ] Mark plan COMPLETED only after implementation/report are committed.

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

## Handoff state

Current work is on `feature/quote-lifecycle-hardening`, cut directly from `main@4f869314ff2b264d12bc5c07f1c9017392b55ad8`. The invoice lifecycle / Payments Received / initial accepted-quote conversion work from PR #514 is already in the base. Continue from the existing quote service/repository/SDK/UI owners; do not reintroduce alternate quote or invoice models.

## PR preparation summary

Not ready. No PR has been requested or opened. Verification has not been executed.