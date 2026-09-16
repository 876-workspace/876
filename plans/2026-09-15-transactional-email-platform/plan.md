# Implementation Plan: Transactional Email Platform

- **Run ID:** `2026-09-15-transactional-email-platform`
- **Branch:** `feature/transactional-email-platform`
- **Base:** `main` @ `a407efd6599a7d26569091b020dfa0d578f11ea1`
- **Status:** IN_PROGRESS
- **Primary provider:** Resend
- **Primary consumers in this run:** Billing service, 876 Billing, 876 Invoice

## Overview

Build transactional email as a shared 876 platform service rather than an
Invoice-only helper or a Core identity module. Organizations own sending domains,
sender identities, templates, and delivery history. Billing continues to own the
financial semantics and lifecycle of invoices/quotes; the Communications service
owns message composition, delivery evidence, and provider integration.

The initial provider is Resend, behind an 876-owned provider boundary. Product
apps and Billing must never construct a Resend client or hold a Resend API key.

## Binding rules / source material read

- `CLAUDE.md`
- `.agents/rules/gpt-web-operating-rules.md`
- `.agents/rules/ai-code-quality.md`
- `.agents/rules/naming.md`
- `.agents/rules/types.md`
- `.agents/rules/code-style.md`
- `.agents/rules/testing.md`
- `.agents/rules/error-handling.md`
- `.agents/rules/api-backend.md`
- `.agents/rules/express-api.md`
- `.agents/rules/stripe-api-pattern.md`
- `.agents/rules/sdk-conventions.md`
- `.agents/rules/platform-services.md`
- `.agents/rules/access-tiers.md`
- `.agents/rules/env-configuration.md`
- `.agents/rules/deletions.md`
- `.agents/rules/new-app-guide.md`
- `.agents/rules/implementation-tracker.md`
- `.agents/rules/git.md`
- `.agents/rules/execution-autonomy.md`

Additional UI rules will be read before touching the host UI phase.

## Verified premises

1. `platform-services.md` explicitly places cross-surface messaging in the
   **shared platform services** bucket. Transactional Communications therefore
   owns its own bounded service/database and SDK root; it does not live in
   `apps/api`.
2. Billing already has invoice/quote lifecycle commands that record communication
   state and outbox events without performing external email delivery. Those
   semantics remain canonical.
3. The monorepo uses independent Express + Prisma shared services and bounded
   SDKs. Communications follows those patterns rather than adding an ecosystem
   aggregator.
4. Resend supports the provider capabilities required for the first slice:
   domain management, transactional sends, provider idempotency, and Svix-signed
   webhooks.

## Architectural scope and invariants

### New bounded context

```text
apps/communications-api
packages/communications
```

The public product root is `communications`.

Communications owns:

- organization email domains;
- sender identities;
- transactional email templates;
- deterministic template rendering / composition;
- immutable delivery records;
- provider delivery events;
- Resend normalization and webhook ingestion.

Cross-context references (`organizationId`, Billing resource IDs, customer IDs,
user IDs) are opaque strings only. No cross-database foreign keys are allowed.

### Billing remains owner of financial semantics

Billing owns invoices, quotes, customers/contacts, financial lifecycle state,
document/public links, and the business command that records a financial document
as sent. Communications does not duplicate those records and must not change
invoice financial-state precedence or quote decision states.

### Provider boundary

Only `apps/communications-api/src/providers/**` knows Resend request/response
spelling. Billing, Invoice, Billing UI, and the bounded SDK speak only 876
contracts.

## Key design decisions

1. **Communications is a shared service, not Core.** The repo's platform boundary
   rule is authoritative.
2. **Prepare/render is side-effect free; send is explicit.** UI preview/edit
   never sends mail.
3. **Local idempotency is canonical.** Resend's idempotency key is defense in
   depth, not the source of truth.
4. **Custom senders require a verified same-organization domain.**
5. **Templates accept explicit flat variables.** No arbitrary property walking
   or raw Prisma/provider objects are exposed to rendering.
6. **Historical delivery snapshots are immutable evidence.** Later customer,
   sender, or template changes do not rewrite a sent record.
7. **Webhook ingestion is append-safe.** Provider events are deduplicated and
   late events must not regress aggregate status.
8. **Existing Billing send lifecycle remains authoritative.** Real email
   delivery is attached to the current communication seam rather than replacing
   financial semantics.

## Implemented data model

The initial Communications migration now defines:

- `EmailDomain`
- `EmailSender`
- `EmailTemplate`
- `EmailDelivery`
- `EmailDeliveryEvent`

Mutable configuration resources use production soft-delete tombstones. Delivery
and provider-event records are historical evidence. SQL remains snake_case via
Prisma mappings.

## Public SDK target

```ts
communications.domains.create(...)
communications.domains.retrieve(...)
communications.domains.list(...)
communications.domains.verify(...)
communications.domains.delete(...)

communications.senders.create(...)
communications.senders.retrieve(...)
communications.senders.list(...)
communications.senders.update(...)
communications.senders.delete(...)

communications.templates.create(...)
communications.templates.retrieve(...)
communications.templates.list(...)
communications.templates.update(...)
communications.templates.delete(...)

communications.deliveries.create(...)
communications.deliveries.retrieve(...)
communications.deliveries.list(...)
```

Billing remains resource-oriented: Invoice/Quote callers must not manually
orchestrate sender/template/delivery APIs to perform the standard document-send
workflow.

## Execution phases

### Phase 0 — Plan + architecture reconnaissance

- [x] Create branch from `main` per explicit user instruction.
- [x] Re-read `CLAUDE.md` and GPT-Web operating rules.
- [x] Read backend/service/error/naming/SDK/platform boundary rules.
- [x] Verify the current Billing invoice-send seam.
- [x] Verify current Resend capabilities required by the design.
- [x] Create committed run plan before implementation.
- [x] Inspect reference Express/Prisma services and SDK authority conventions.

### Phase 1 — Communications service scaffold

- [x] Add `apps/communications-api` package using the canonical Express 5 / ESM
      service shape.
- [x] Add environment contract, Prisma config/generation, TypeScript, tsup,
      Vitest, ESLint, dependency-cruiser, Vercel entrypoint, server and health
      endpoint.
- [x] Add request context, registered error catalog, response helpers, 404/error
      middleware, constant-time internal service auth, and structured logging.
- [x] Add Prisma multi-file schema and hand-written additive initial migration.
- [ ] Run scaffold/type/migration verification locally. **Unverified in GPT-Web.**

### Phase 2 — `@876/communications` bounded SDK

- [ ] Add package manifest and shared contracts/types.
- [ ] Add bounded HTTP client with `{ data, error }` handling.
- [ ] Add `service` entrypoint for first-party server-to-server consumers.
- [ ] Add resources for domains, senders, templates, and deliveries.
- [ ] Add `session` only if a real session-authorized API surface is implemented;
      do not create a misleading alias.
- [ ] Add SDK contract/error tests.

### Phase 3 — Resend provider + domains/senders

- [x] Add provider interface and normalized provider error boundary.
- [x] Implement Resend REST adapter for domain operations and transactional send.
- [x] Send Resend idempotency header from the internal delivery idempotency key.
- [x] Implement custom domain create/retrieve/list/verify/refresh/delete.
- [x] Persist normalized DNS records/status/verification timestamps.
- [x] Implement sender create/retrieve/list/update/delete.
- [x] Enforce duplicate prevention, same-org ownership, verified-domain matching,
      active/default sender rules, and production soft deletion.
- [x] Draft provider/domain regression tests.
- [ ] Add missing sender route/service test floor and execute all tests locally.

### Phase 4 — Templates, rendering, delivery, webhooks

- [x] Implement organization/system transactional templates.
- [x] Implement explicit-variable renderer with HTML escaping and missing-variable
      failures.
- [x] Revalidate rendered subjects against header/newline injection.
- [x] Implement template preview/render path without delivery side effects.
- [x] Implement delivery create/send with local + provider idempotency.
- [x] Persist immutable sender/recipient/subject/body snapshots.
- [x] Persist provider message IDs and queued/sent/failed timestamps.
- [x] Implement raw-body Svix/Resend webhook verification using Node crypto.
- [x] Add webhook event deduplication and out-of-order aggregate-status
      protection.
- [x] Handle sent/delivered/opened/clicked/bounced/complained/failed provider
      events.
- [x] Draft renderer, provider, webhook, domain and delivery regression tests.
- [ ] Add remaining template/webhook route coverage and execute all tests locally.

### Phase 5 — Billing invoice/quote integration

- [ ] Inspect current Billing resource SDK/router/workflow contracts in full.
- [ ] Add one service-to-service Communications client owned by Billing.
- [ ] Add invoice email preparation contract using Billing-owned customer/contact
      and document/public-link information that exists today.
- [ ] Add invoice real-delivery path without changing financial lifecycle
      precedence or existing outbox semantics.
- [ ] Add quote equivalent through the same integration.
- [ ] Preserve command idempotency and tenant isolation.
- [ ] Add integration tests for first send, resend, rejection, delivery/provider
      failure, and cross-tenant access.

### Phase 6 — Billing/Invoice host UI

- [ ] Read the binding app/UI/data-loading/routing rules before implementation.
- [ ] Reuse `@876/billing-ui` when the same composer/history belongs to Billing
      and Invoice.
- [ ] Add invoice/quote email composer shell: From, To, CC, BCC, template,
      subject, body, and document attachment/link control supported by the current
      document renderer.
- [ ] Keep recoverable failures inline without tearing down page chrome.
- [ ] Add organization Email settings UI only after a supported session-authority
      Communications API exists.

### Phase 7 — Scheduling/reminders follow-on

- [ ] Add durable scheduled delivery worker using existing worker conventions.
- [ ] Add Billing reminder-policy integration after direct send is stable.
- [ ] Never use browser/in-process timers for durable scheduling.

## Current branch inventory

At this tracker update the branch is **65 commits ahead of the recorded base** and
contains the Communications API foundation plus this plan. The major implemented
areas are:

```text
apps/communications-api/
  prisma/schema/**
  prisma/migrations/20260915220000_transactional_email_foundation/**
  src/http/**
  src/modules/domains/**
  src/modules/senders/**
  src/modules/templates/**
  src/modules/deliveries/**
  src/providers/**
  src/platform/**
  src/types/**
  src/application.ts
  src/server.ts
```

`packages/communications` and Billing/Invoice integrations are the next active
work, not yet landed at this checkpoint.

## Draft test floors

GPT-Web cannot execute the suite. Existing test files are drafts until local
verification proves them.

Target floors before the implemented scope is called complete:

- provider adapter: **8 `it()` cases**
- domain service/repository/routes: **10 `it()` cases**
- sender service/repository/routes: **10 `it()` cases**
- template renderer/service: **10 `it()` cases**
- delivery send + idempotency: **12 `it()` cases**
- webhook normalization/idempotency: **10 `it()` cases**
- SDK resources: **8 `it()` cases**
- Billing integration: **12 `it()` cases**

The final GPT-Web report must count literal cases from the completed branch and
must not claim floors that were not reached.

## Verification commands

No command below has been claimed as run by GPT-Web.

```bash
# Required once after new workspaces are present
pnpm install --lockfile-only

pnpm --filter @876/communications-api typecheck
pnpm --filter @876/communications-api lint
pnpm --filter @876/communications-api boundaries
pnpm --filter @876/communications-api test
pnpm --filter @876/communications-api build
pnpm --filter @876/communications-api db:generate
pnpm --filter @876/communications-api db:deploy

pnpm --filter @876/communications typecheck
pnpm --filter @876/communications lint
pnpm --filter @876/communications test

pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api build

pnpm check:error-contract
pnpm check:service-bundle
```

UI phases additionally require the touched hosts' typecheck/tests plus the
repository structure, RSC-boundary and shared-transpile checks required by their
rules.

## Known execution constraints / risks

- `pnpm-lock.yaml` has not been updated because the GitHub contents API only
  supports whole-file replacement and the lockfile is too large to safely
  synthesize. Run `pnpm install --lockfile-only` locally after the new workspace
  package manifests land.
- No test/typecheck/lint/build/migration command has executed in this GPT-Web
  environment; committed tests are not verification evidence yet.
- The service currently exposes an internal-key first-party surface. Do not add a
  `session` SDK alias until the backend actually implements session authorization.
- Billing integration must compose one Communications service client in Billing;
  product UIs must not call Communications + Billing as a distributed transaction.

## Dispatched briefs

None. This GPT-Web run is implementing directly through the GitHub connector.

## Execution reports

Final report required at:

`plans/2026-09-15-transactional-email-platform/reports/gpt-web/2026-09-15-transactional-email-platform.md`

It must include phase status, literal test counts, changed-file inventory,
migration SQL, verification evidence/unverified items, deliberate gaps, risks,
and exact continuation instructions.

## Multi-session continuity / handoff state

Completed enough to build on without re-deriving:

- standalone Communications bounded context decision;
- Express/API foundation;
- database schema + migration;
- error/auth/provider boundaries;
- custom domains;
- senders;
- templates and safe rendering;
- delivery/idempotency records;
- signed provider webhooks and event projection;
- draft regression coverage for the highest-risk provider/render/delivery paths.

**Current active step:** implement `packages/communications` by following the
bounded SDK conventions used by Projects/Work/Billing. Then inspect the full
Billing invoice/quote route + SDK + workflow seam and add the service-to-service
Communications integration.

Do not restart architecture discovery unless main has materially changed.

## PR preparation summary

Not ready. Implementation remains in progress. No local verification has been
executed or claimed, the new workspace lockfile importer is not yet generated,
and Billing/Invoice integration remains outstanding.
