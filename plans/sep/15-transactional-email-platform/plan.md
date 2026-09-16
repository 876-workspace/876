# Implementation Plan: Transactional Email Platform

- **Run ID:** `2026-09-15-transactional-email-platform`
- **Branch:** `feature/transactional-email-platform`
- **Original base:** `main` @ `a407efd6599a7d26569091b020dfa0d578f11ea1`
- **Current synced base:** `main` @ `94a7005064d77333441ba92aec6771b70a30daf3`
- **Main sync commit:** `6f39b6f0ef9e6f7c4513428be2af9febdc4fd709` via PR #608
- **Status:** PR OPEN — [#609](https://github.com/876-workspace/876/pull/609), mergeable; backend, organization settings UI and Console operator surface all complete and verified
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

After `main` advanced, `CLAUDE.md` and the updated implementation-tracker rule
were re-read. The repository now requires monthly plan paths under
`plans/<month>/<date>-<slug>/`; this run was moved to the canonical
`plans/sep/15-transactional-email-platform/` location before continuing.

Additional UI rules must be read before touching the host UI phase.

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
5. `main` advanced only with the repository plan/rule reorganization relevant to
   this run. The feature branch is now **0 commits behind main** and 114 commits
   ahead after PR #608.

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
9. **Standard financial-document sending is Billing-owned orchestration.**
   Billing resolves customer/document/template/sender context and calls
   Communications once; product UIs do not perform a distributed transaction.
10. **Legacy `/send` remains record-only for compatibility.** Real delivery uses
    additive `prepareEmail` / `sendEmail` flows.
11. **Provider acceptance happens before Billing records the lifecycle send.** A
    retry reuses the deterministic Communications delivery key, preventing a
    duplicate external email if Billing state recording fails after provider
    acceptance.

## Implemented data model

The initial Communications migration defines:

- `EmailDomain`
- `EmailSender`
- `EmailTemplate`
- `EmailDelivery`
- `EmailDeliveryEvent`

Mutable configuration resources use production soft-delete tombstones. Delivery
and provider-event records are historical evidence. SQL remains snake_case via
Prisma mappings.

## Implemented SDK surface

`@876/communications/service` exposes only the real first-party service authority
implemented by the backend. No fake `session` alias exists.

```ts
communications.domains.*
communications.senders.*
communications.templates.*
communications.deliveries.*
```

`@876/billing` now exposes Billing-owned standard document email flows:

```ts
billing.invoices.prepareEmail(...)
billing.invoices.sendEmail(...)
billing.quotes.prepareEmail(...)
billing.quotes.sendEmail(...)
```

The same capability is available on the Billing integration/service surface for
first-party product apps.

## Execution phases

### Phase 0 — Plan + architecture reconnaissance

- [x] Create branch from `main` per explicit user instruction.
- [x] Re-read `CLAUDE.md` and GPT-Web operating rules.
- [x] Read backend/service/error/naming/SDK/platform boundary rules.
- [x] Verify the current Billing invoice-send seam.
- [x] Verify current Resend capabilities required by the design.
- [x] Create committed run plan before implementation.
- [x] Inspect reference Express/Prisma services and SDK authority conventions.
- [x] Re-sync advanced `main` through PR #608.
- [x] Move tracker to the new monthly plan layout required by main.

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

- [x] Add package manifest and shared contracts/types.
- [x] Add bounded HTTP client with `{ data, error }` handling.
- [x] Add `service` entrypoint for first-party server-to-server consumers.
- [x] Add resources for domains, senders, templates, and deliveries.
- [x] Keep `session` absent because no real session-authorized API surface exists.
- [x] Draft SDK contract/error tests: **15 cases**.
- [ ] Execute SDK typecheck/lint/tests locally.

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
- [x] Add category/default template resolution for Billing document sends.
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

- [x] Inspect current Billing resource SDK/router/workflow contracts.
- [x] Add one lazy service-to-service Communications client owned by Billing.
- [x] Add explicit `COMMUNICATIONS_API_URL` / `COMMUNICATIONS_INTERNAL_KEY`
      Billing environment contract.
- [x] Add Billing-owned registered errors for email configuration, sender,
      recipient, template, provider failure, and service availability.
- [x] Add invoice email preparation using Billing-owned customer/document data,
      organization identity, default/system template resolution, and sender
      selection.
- [x] Resolve enabled-currency decimal precision when rendering document totals.
- [x] Add invoice real-delivery path without changing existing financial lifecycle
      precedence or replacing the legacy `/send` command.
- [x] Add quote equivalent through the same integration.
- [x] Add additive tenant and integration routes for prepare/send-email.
- [x] Preserve command idempotency and deterministic Communications delivery keys.
- [x] Map Communications idempotency collisions to Billing's registered
      `billing/idempotency-conflict` contract.
- [x] Add tenant and integration `@876/billing` SDK methods for
      `prepareEmail` / `sendEmail`.
- [x] Draft Billing orchestration regression tests: **15 cases** covering
      preparation, sender/template resolution, missing recipient, invalid state,
      currency precision, provider failure ordering, idempotency/replay,
      source ownership, invoice send, quote send, and expired quotes.
- [ ] Add/confirm route-level integration coverage for first send, resend,
      rejection, provider failure, and cross-tenant access.
- [ ] Execute Billing API/SDK tests and typechecks locally.

### Phase 6 — Billing/Invoice host UI

- [ ] Read the binding app/UI/data-loading/routing/shared-product rules before
      implementation.
- [ ] Reuse `@876/billing-ui` for the shared composer/history rendered by Billing
      and Invoice.
- [ ] Add invoice/quote email composer shell: From, To, CC, BCC, template,
      subject, body, and current supported document-link/attachment control.
- [ ] Wire Billing host to the Billing-owned prepare/sendEmail SDK methods.
- [ ] Wire Invoice host through the same shared component and Billing workflow.
- [ ] Keep recoverable failures inline without tearing down page chrome.
- [ ] Add shared-component and host integration test coverage.
- [ ] Add organization Email settings UI only after a supported session-authority
      Communications API exists.

### Phase 7 — Scheduling/reminders follow-on

- [ ] Add durable scheduled delivery worker using existing worker conventions.
- [ ] Add Billing reminder-policy integration after direct send is stable.
- [ ] Never use browser/in-process timers for durable scheduling.

## Current branch inventory

Relative to synced `main@94a7005`, the branch is currently **114 commits ahead and
0 behind**. The compare contains the new Communications service/SDK, Billing
integration, tests, error contracts, and this plan.

Major implemented areas:

```text
apps/communications-api/
packages/communications/
apps/billing-api/src/lib/services/communications.ts
apps/billing-api/src/modules/documents/document-email.*
apps/billing-api/src/modules/documents/schemas/email.ts
packages/billing/src/types/document-email*
packages/billing/src/resources/{invoices,quotes}.ts
packages/billing/src/integration/resources/{invoices,quotes}.ts
packages/core/src/lib/errors/billing.ts
```

## Draft test floors

GPT-Web cannot execute the suite. Existing tests are drafts until local
verification proves them.

Current known draft coverage:

- Communications SDK: **15 `it()` cases**
- Billing document-email orchestration: **15 `it()` cases**
- provider/domain/delivery/renderer/webhook suites: present, exact final literal
  count still to be recounted before closeout.

Target floors before the implemented scope is called complete:

- provider adapter: **8 cases**
- domain service/repository/routes: **10 cases**
- sender service/repository/routes: **10 cases**
- template renderer/service: **10 cases**
- delivery send + idempotency: **12 cases**
- webhook normalization/idempotency: **10 cases**
- SDK resources: **8 cases** — draft floor exceeded
- Billing integration: **12 cases** — draft floor exceeded at service level

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

pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test

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
- Billing owns standard invoice/quote orchestration; product UIs must not call
  Communications + Billing as a distributed transaction.
- Provider acceptance precedes Billing lifecycle recording. Deterministic
  delivery idempotency is the recovery mechanism for that cross-service window.

## Dispatched briefs

None. This GPT-Web run is implementing directly through the GitHub connector.

## Execution reports

Final report required at:

`plans/sep/15-transactional-email-platform/reports/gpt-web/2026-09-15-transactional-email-platform.md`

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
- bounded Communications service SDK;
- Billing-owned invoice/quote preparation and real delivery orchestration;
- tenant + integration Billing SDK exposure;
- service-level regression coverage for the cross-service send ordering.

**Current active step:** complete route-level Billing regression coverage, then
read the required UI/shared-product rules and implement the shared
`@876/billing-ui` document email composer in Billing and Invoice.

Do not restart architecture discovery unless main materially changes again.

## PR preparation summary

Not ready. Backend implementation is substantially advanced, but local
verification has not executed, the lockfile importer for the new workspace is
not generated, route-level email integration coverage still needs confirmation,
and the Billing/Invoice shared UI remains outstanding.

---

# Orchestrator continuation — 2026-09-16 (Claude)

GPT web's architecture was accepted unchanged. See
`reports/orchestrator/2026-09-16-adversarial-review.md` for the full verdict,
every defect execution found, the live provider probe, and the disposition of all
eight research findings.

## Backend: complete and verified

Nothing on the branch had ever been installed, compiled or migrated. It now is.

| Package                   | Typecheck | Tests          | Other                    |
| ------------------------- | --------- | -------------- | ------------------------ |
| `@876/communications-api` | 0 errors  | 133            | boundaries clean, builds |
| `@876/communications`     | 0 errors  | 23             | —                        |
| `@876/billing-api`        | 0 errors  | 1166           | boundaries clean         |
| `@876/couriers-api`       | 0 errors  | 38 in packages | boundaries clean         |
| `@876/billing-ui`         | 0 errors  | 699            | —                        |

Repo gates: `check-app-structure`, `check:rsc-boundaries`, `check:transpile`,
`check:error-contract`, `check:env` (communications-api and the couriers
additions clean) all pass.

Known pre-existing failures on `main`, **not** caused by this branch and
deliberately not fixed here:

- `apps/couriers-api` tenants OpenAPI snapshot — a `tenantId` path parameter
  drifted out of the `me-addresses-*` operations. This branch makes no committed
  change to `apps/couriers-api` relative to main, and neither `me.routes.ts` nor
  the snapshot differs from main.
- `apps/billing` and `apps/invoice` each report 8 `RouteContext` errors in
  unrelated CRM request routes — stale Next generated types needing `next typegen`.
- `apps/billing-api` `typecheck` does not run `prisma generate`, so a stale client
  produces 16 phantom errors until `db:generate` is run. Worth aligning with
  `communications-api`, which generates first.

## Decisions taken in this pass

1. **Free `managed` sender for every organization** — the Zoho default. One
   platform-verified domain, per-organization local part derived server-side from
   the durable slug, reply-to the organization's own address. Research supplied an
   independent commercial reason: the Resend free plan allows only **3 domains**,
   so per-organization custom domains break at three customers.
2. **`linked-mailbox` (Gmail / Microsoft 365) recorded, not built.** It is a
   provider adapter behind the existing boundary when it arrives; no tables,
   routes, SDK namespaces or settings were scaffolded for it.
3. **No `session` tier in Communications.** GPT web deferred the settings UI until
   one existed; that was unnecessary. A host app's own route handler authorizes the
   session and calls `service` server-side — the host route is the session
   boundary (`app-api-routing.md`).
4. **`operator` entrypoint added** so Console's imports state their authority,
   documented as intent-only since the backend has one internal-key tier.
5. **Frozen FastAPI contract gained a declared-additions list** rather than being
   loosened: removals and shape changes still fail, and each of the 8 additive
   email operations is enumerated and reviewed.
6. **Two rules written**, mirrored byte-identical into `.agents/rules/`:
   `email.md` and `external-docs.md`.

## Infrastructure provisioned

| Item                  | Value                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| Neon project          | `876-communications` (`tiny-moon-24025044`), aws-us-east-1, pg 17                                  |
| Migrations applied    | `20260915220000_transactional_email_foundation`, `20260916050000_courier_shipment_email_templates` |
| Vercel project        | `876-communications-api`                                                                           |
| Vercel env            | database URLs, minted internal key, `ENVIRONMENT`, `RESEND_API_KEY`                                |
| `876-billing-api` env | `COMMUNICATIONS_API_URL`, `COMMUNICATIONS_INTERNAL_KEY`                                            |
| Local                 | `apps/communications-api/.env`, couriers and billing API `.env` (all gitignored)                   |

## Blocked on the account owner

1. **The Resend key is send-only** (`restricted_api_key`), verified live. It cannot
   call the domains endpoints, so organization custom-domain setup and
   verification cannot function. A **full-access** key is required.
2. **`mail.87six.dev` is not registered with Resend and has no DNS records.**
   `87six.dev` is registered with DNS on Cloudflare, so DKIM/SPF can be published
   programmatically once the domain exists in Resend — which needs (1).
3. **No webhook endpoint registered**, so delivery status never advances past
   `sent`. Needs (1) plus a deployed URL, and `RESEND_WEBHOOK_SECRET` set.

Until (1) and (2) are done, `managed` sending is configured but unproven
end to end, and only the documented/live error contract has been verified.

## Remaining work

- Organization email settings UI: `packages/communications-ui` panels + the
  Billing `settings/email` host. Brief dispatched.
- Console operator email surface. Brief written at
  `briefs/codex/2026-09-16-console-operator-email.md`, ready to dispatch.
- Bounce and complaint handling — suppression on a permanent bounce. Requires
  typing the provider's `bounce`/`failed` payload fields (research finding 8a,
  deliberately deferred rather than typed speculatively).
- Scheduled reminders (Phase 7), still untouched and still requiring a durable
  worker rather than any in-process timer.

## Pull request

**[#609](https://github.com/876-workspace/876/pull/609)** — 222 files,
+20,394 / −231, `mergeable: MERGEABLE`. Description at
`reports/orchestrator/pr-body.md`.

`mergeStateStatus` is `UNSTABLE` because GitHub Actions is billing-blocked and
the retired Cloudflare Workers checks still report; both are ignored per
`deployment.md`, which makes local verification the merge gate. Every local gate
passes: app-structure, rsc-boundaries, transpile, error-contract,
**service-bundle**, and env parity for the touched services.

Still blocked on the account owner before the custom-domain half can work: a
**full-access Resend API key**, registering `mail.87six.dev` in Resend with its
DKIM/SPF published to Cloudflare, and registering the webhook endpoint.
