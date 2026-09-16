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
financial semantics and lifecycle of invoices/quotes; the communications service
owns message composition/delivery evidence and provider integration.

The initial provider is Resend, behind an 876-owned provider boundary. Product
apps and Billing must never construct a Resend client or hold a Resend API key.

## Repository rules / source material read

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
- `.agents/rules/implementation-tracker.md`
- `.agents/rules/git.md`

Additional rules must be read before touching the layer they govern.

## Verified premises

1. `platform-services.md` explicitly places cross-surface messaging in the
   **shared platform services** bucket. Therefore transactional communications
   gets its own bounded service/database and SDK root; it does not live in
   `apps/api`.
2. Billing already has invoice/quote lifecycle commands that record communication
   state and outbox events without performing external email delivery. Those
   semantics remain canonical.
3. The monorepo already uses independent Express + Prisma shared services such as
   Work, CRM, Projects, Storage, and Billing; the new service must follow those
   patterns rather than inventing a service architecture.
4. Resend currently supports programmatic domain create/retrieve/verify/delete,
   `POST /emails`, provider idempotency keys, and Svix-signed webhooks.

## Architectural scope

### New bounded context

```text
apps/communications-api
packages/communications
```

The public product root is `communications`.

The service owns:

- organization email domains;
- sender identities;
- transactional email templates;
- resolved compositions;
- immutable delivery records;
- provider delivery events;
- Resend provider normalization;
- provider webhook ingestion;
- tenant email suspension / limits when introduced.

The service stores `organizationId`, `userId`, app/resource IDs, and other
cross-context references as opaque strings only. It never joins another service's
database.

### Billing remains owner of financial semantics

Billing owns:

- invoices / quotes / statements / payments;
- customer + contact data used to construct recipient candidates;
- invoice/quote PDFs or hosted resource links;
- the business transition that records an invoice/quote as sent;
- Billing outbox events.

Billing may call the communications service through the server/service client to
prepare/send a message, but communications must not duplicate invoice/quote rows.

### Product apps

876 Billing and 876 Invoice consume Billing and Communications through their
bounded server clients. Browser code never calls Resend and never receives a
provider credential.

## Key design decisions

### 1. Service name: Communications

Use `@876/communications-api` / `@876/communications` instead of an `email-api`
name. The current implementation is transactional email, but the bounded context
can later own related delivery channels without forcing Billing/Invoice contracts
to depend on a vendor or transport name.

### 2. Composition and send are separate

The API exposes a deterministic prepare/preview contract before send. Preparing a
message has no delivery side effect.

Conceptually:

```text
financial resource resolver
        -> composition input
        -> template resolution/rendering
        -> editable composition
        -> send
        -> immutable delivery + provider message id
```

### 3. Provider abstraction, not provider leakage

`src/providers/resend/**` owns Resend request/response spelling. Internal/public
876 contracts use camelCase properties and kebab-case symbolic values.

The service may use the Resend HTTP API directly instead of adding an npm SDK if
that avoids a dependency/lockfile-only change; either way the Resend transport is
fully encapsulated in the provider adapter.

### 4. Resend + local idempotency

The service owns a stable delivery ID/idempotency key and also sends a Resend
`Idempotency-Key` header. Resend's 24-hour provider window is defense in depth,
not the database source of truth.

### 5. Sender/domain ownership

A custom sender can only use a domain belonging to the same organization and the
domain must be verified before it can send. An 876-managed sender path remains
possible without custom DNS.

### 6. Template variables are explicit

Templates render from a normalized variables object. The renderer does not
receive raw Prisma/provider/domain objects and does not support arbitrary property
walking.

### 7. Delivery evidence is append-safe

A send is represented by a delivery row plus delivery events. Template/customer
changes after the send do not rewrite historical sender, recipients, subject, or
provider evidence.

### 8. Existing Billing send lifecycle stays authoritative

Do not change invoice financial-state precedence or quote decision states merely
because real email delivery now exists. The integration must preserve current
idempotent lifecycle behavior.

## Data model

Initial Communications database models:

### EmailDomain

- `id`
- `organizationId`
- `provider`
- `providerDomainId`
- `name`
- `region`
- `status`
- `records` JSON
- `verifiedAt`
- `lastCheckedAt`
- `createdAt`
- `updatedAt`
- `deletedAt`

### EmailSender

- `id`
- `organizationId`
- `domainId` nullable for managed sender
- `name`
- `email`
- `replyTo`
- `kind` (`managed`, `custom-domain` initially)
- `isDefault`
- `isActive`
- timestamps / soft delete

### EmailTemplate

- `id`
- `organizationId` nullable for protected system defaults if the service pattern
  supports it cleanly
- `key`
- `name`
- `category`
- `subject`
- `html`
- `text`
- `senderId`
- `isDefault`
- `isSystem`
- `isActive`
- timestamps / soft delete

### EmailDelivery

- `id`
- `organizationId`
- `resourceType`
- `resourceId`
- `templateId`
- `senderId`
- `provider`
- `providerMessageId`
- sender/recipient/subject/body snapshots
- `status`
- lifecycle timestamps (`queuedAt`, `sentAt`, `deliveredAt`, `openedAt`,
  `clickedAt`, `bouncedAt`, `failedAt`)
- failure code/message normalized for internal diagnostics
- `idempotencyKey`
- `createdBy`
- timestamps

### EmailDeliveryEvent

- `id`
- `deliveryId`
- `provider`
- `providerEventId`
- `type`
- `occurredAt`
- bounded provider metadata JSON
- `createdAt`

Physical SQL remains snake_case through Prisma mappings.

## Public contracts / SDK shape

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

Specialized workflow verbs such as domain verification are allowed because they
represent domain intent and are not CRUD aliases.

Billing's resource-facing experience remains resource-oriented. The integration
should expose prepare/send behavior under the Billing invoice/quote resource
surface rather than making UI callers manually orchestrate several services.

## Error catalog

Create one Communications catalog and never hand-write public messages/statuses at
call sites. Initial families:

- `communications/domain-not-found`
- `communications/domain-already-exists`
- `communications/domain-not-verified`
- `communications/sender-not-found`
- `communications/sender-domain-not-verified`
- `communications/default-sender-required`
- `communications/template-not-found`
- `communications/template-render-failed`
- `communications/recipient-required`
- `communications/recipient-invalid`
- `communications/delivery-not-found`
- `communications/delivery-already-sent`
- `communications/provider-unavailable`
- `communications/provider-rejected`
- `communications/invalid-webhook`

Exact catalog helpers and status/message text will follow the nearest service
reference implementation after inspection.

## Execution phases

### Phase 0 — Plan + architecture reconnaissance

- [x] Create branch from `main` per explicit user instruction.
- [x] Re-read `CLAUDE.md` and GPT-Web operating rules.
- [x] Read backend/service/error/naming/SDK rules required for the first slice.
- [x] Verify current Billing invoice-send seam.
- [x] Verify Resend send/domain/idempotency/webhook capabilities against current
      official docs.
- [x] Create this committed run plan before code edits.
- [ ] Inspect reference service scaffolds, auth tiers, Prisma/migration style,
      shared SDK package style, and existing Billing resource clients/tests.

### Phase 1 — Communications service scaffold

- [ ] Add `apps/communications-api` package using the canonical Express 5 service
      assembly and dependency boundaries.
- [ ] Add config parsing, database client, request context, health/readiness,
      response envelope, 404/error middleware, and service auth tier by reusing
      existing platform primitives/patterns.
- [ ] Add Prisma multi-file schema and hand-written initial migration.
- [ ] Add registered Communications error catalog.
- [ ] Add baseline HTTP/contract tests.

### Phase 2 — `@876/communications` bounded SDK

- [ ] Add types/Zod contracts and transport client.
- [ ] Add `service` entrypoint for first-party server-to-server consumers.
- [ ] Add `session` entrypoint only for organization-admin surfaces that are
      actually supported by the API authorization tier.
- [ ] Add resources for domains, senders, templates, and deliveries as each
      backend capability lands.
- [ ] Add SDK contract/error tests.

### Phase 3 — Resend provider + domains/senders

- [ ] Implement Resend transport adapter with provider DTO normalization.
- [ ] Create/retrieve/verify/delete custom domains.
- [ ] Persist DNS records and normalized domain statuses.
- [ ] Create/list/update/delete sender identities.
- [ ] Enforce tenant ownership and verified-domain requirement.
- [ ] Add provider/error/tenant-isolation tests.

### Phase 4 — Templates, rendering, and delivery

- [ ] Implement transactional templates and explicit variable rendering.
- [ ] Implement side-effect-free composition preparation.
- [ ] Implement delivery creation/send with local + Resend idempotency.
- [ ] Persist immutable sender/recipient/subject/body snapshots.
- [ ] Add Resend webhook verification/event normalization.
- [ ] Update delivery aggregate status from events idempotently.
- [ ] Add tests for rendering, idempotency, provider failures, webhook signatures,
      duplicate events, and status transitions.

### Phase 5 — Billing invoice/quote integration

- [ ] Inspect existing Billing API SDK/router/workflow contracts in full.
- [ ] Add one service-to-service Communications client owned by Billing.
- [ ] Add invoice email preparation contract using Billing-owned customer/contact,
      document and payment/public-link information available today.
- [ ] Add invoice real-delivery path without changing financial lifecycle
      precedence.
- [ ] Add quote equivalent using the same integration.
- [ ] Preserve Billing command idempotency and outbox semantics.
- [ ] Add integration tests for first send, resend, lifecycle rejection, delivery
      failure, and tenant isolation.

### Phase 6 — Billing/Invoice host UI

- [ ] Read `app-structure.md`, `app-layout.md`, `shared-product-ui.md`,
      `data-fetching.md`, `app-api-routing.md`, and relevant Next.js local guides.
- [ ] Reuse `@876/billing-ui` where the same composer/history is rendered in both
      hosts.
- [ ] Add invoice/quote email composer shell (From/To/CC/BCC/template/subject/body,
      attach-PDF control when the document renderer provides the artifact).
- [ ] Keep recoverable errors inline and preserve page chrome.
- [ ] Add organization Email settings surface for domains/senders/templates only
      after the session-authorized Communications API exists.

### Phase 7 — Scheduling/reminders (follow-on after direct send is stable)

- [ ] Add scheduled delivery state/worker using existing worker conventions.
- [ ] Add invoice reminder policy integration in Billing.
- [ ] Do not use browser/in-process timers for durable scheduling.

## Test floors for this run

GPT-Web cannot execute tests. Tests added by this run are drafts that must be
counted literally and verified by the orchestrator.

Minimum target before the implemented scope is called complete:

- provider adapter: **8 `it()` cases**
- domain service/repository/routes: **10 `it()` cases**
- sender service/repository/routes: **10 `it()` cases**
- template renderer/service: **10 `it()` cases**
- delivery send + idempotency: **12 `it()` cases**
- webhook normalization/idempotency: **10 `it()` cases**
- SDK resources: **8 `it()` cases**
- Billing integration: **12 `it()` cases**

If a phase is intentionally deferred, its floor is not claimed as met and the
handoff must say so explicitly.

## Verification commands

GPT-Web will not claim these ran. The orchestrator/local environment should run,
adjusted to the package scripts actually created:

```bash
pnpm --filter @876/communications-api typecheck
pnpm --filter @876/communications-api lint
pnpm --filter @876/communications-api boundaries
pnpm --filter @876/communications-api test
pnpm --filter @876/communications-api build

pnpm --filter @876/communications typecheck
pnpm --filter @876/communications test
pnpm --filter @876/communications build

pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api build
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api db:drift
pnpm --filter @876/billing-api api:contract:check

pnpm check:error-contract
pnpm check:service-bundle
```

UI phases additionally require the host-specific typecheck/tests plus the
repository structure/RSC/shared-transpile checks required by the touched apps.

## Dispatched briefs

None. This GPT-Web run is implementing directly through the GitHub connector.

## Execution reports

A final report is required at:

`reports/gpt-web/2026-09-15-transactional-email-platform.md`

It must include the per-phase status, literal `it()` counts, every changed file,
full migration SQL, unverified items, deliberate gaps, risks, and verification
commands.

## Handoff state

Current state:

- branch created from current `main`;
- repository rules re-read;
- architecture corrected from the earlier Core-module draft to a standalone
  shared Communications bounded context;
- existing Billing invoice send seam verified;
- Resend current API capabilities verified;
- code reconnaissance is continuing before the first application file is added.

Exact next step: inspect Work/CRM/Projects service assembly + SDK patterns and the
Billing auth/client seam, then create the Communications service skeleton and
initial schema/migration.

## PR preparation summary

Not ready. Implementation is in progress and no verification has been executed
from GPT-Web.
