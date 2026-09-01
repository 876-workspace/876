# Billing Accounting Providers / Zoho Books — Detailed Implementation Plan + Live Progress

Branch: `feature/billing-accounting-providers-zoho`  
Upstream naming branch to reconcile before completion: `refactor/platform-naming-contract`  
Date: 2026-09-01

This document is both the detailed implementation plan and the durable branch-visible progress tracker for the accounting-provider work. Update it whenever a meaningful implementation chunk lands so that the plan always describes the code that actually exists.

The repository-local `.claude/tracker/implementation_plan.md` remains intentionally local/gitignored. This file is the committed equivalent for connector-driven work and final handoff.

---

## 1. Objective

Build a minimal, provider-agnostic accounting integration layer owned by **876 Billing**, with **Zoho Books** as the first external accounting provider.

876 Billing remains the canonical financial data plane. Zoho Books is a projection/execution/mirror target, not a replacement domain model. Canonical customers, items, estimates, invoices, subscriptions/recurring invoices, and payments continue to live in Billing. Provider identifiers, credentials, retry state, and provider-specific DTOs remain outside canonical business tables.

The implementation must support:

1. provider catalog + tenant-owned accounting connections;
2. secure Zoho OAuth with sealed refresh tokens;
3. asynchronous durable projection from Billing to Zoho;
4. controlled adoption of existing Zoho customers/items into canonical Billing records;
5. typed operator/secret-service access through `@876/billing`;
6. a minimal Billing management surface for connection lifecycle and sync health;
7. deterministic retry/concurrency semantics that cannot acknowledge stale state;
8. explicit local migration/runtime verification before merge;
9. final reconciliation with the still-moving `refactor/platform-naming-contract` branch.

---

## 2. Status legend

- `DONE` — implemented on this branch.
- `IN PROGRESS` — actively being implemented or reconciled.
- `TODO` — required implementation has not landed yet.
- `LOCAL` — code is present, but verification requires a mounted checkout, database, runtime, or live Zoho credentials unavailable to this connector.
- `DEFERRED` — deliberately outside the minimal release.

---

## 3. Non-negotiable architecture and safety invariants

### Canonical ownership

- `DONE` Billing remains canonical for customers, items, estimates, invoices, subscriptions/recurring invoices, and payments.
- `DONE` No Zoho IDs are added to canonical business tables.
- `DONE` Provider mappings live in `billing_provider_references` and are scoped to an accounting-provider connection.
- `DONE` Import/adoption is mapping-first. Existing provider data never silently overwrites canonical Billing data.

### Provider abstraction

- `DONE` Accounting providers sit behind `apps/billing-api/src/providers/accounting/*`.
- `DONE` Zoho Books is the first adapter, not a platform-wide hard-coded dependency.
- `DONE` Provider capabilities are explicit, runtime-visible data.
- `DONE` Inbound webhooks are **not** advertised until an inbound boundary exists; Zoho currently reports `webhooks: false`.

### Credential safety

- `DONE` Refresh tokens are sealed through the shared secure-field provider and may use WorkOS Vault.
- `DONE` Browser/API serializers never expose access/refresh tokens.
- `DONE` Provider error payloads are not copied into client-safe public error messages.
- `DONE` OAuth state is expiring and atomically single-use before token exchange, preventing concurrent replay.

### Synchronization safety

- `DONE` Provider I/O never occurs inside canonical Billing write transactions.
- `DONE` Canonical writes enqueue a transactional outbox in PostgreSQL.
- `DONE` Jobs coalesce by `(connection, resourceType, resourceId)`.
- `DONE` Every new enqueue increments `generation`.
- `DONE` A worker may mark only the exact generation it claimed as delivered/failed.
- `DONE` Dependency ordering is customer -> item -> estimate -> invoice -> recurring invoice -> payment.
- `DONE` Missing dependency mappings produce retryable dependency-pending behavior rather than broken provider writes.
- `DONE` Provider outages/rate limits are asynchronous retry conditions and do not break normal Billing reads/writes.

### Scope control

- `DONE` Historical financial import is intentionally excluded from the minimal release.
- `DONE` Adoption is limited to customers and items.
- `DEFERRED` Historical estimates/invoices/recurring invoices/payments reconstruction.
- `DEFERRED` Inbound Zoho webhooks.
- `DEFERRED` Independent duplicate management UIs in Console, Invoice, and every consuming app.

---

# Phase 0 — Repository/rule alignment and branch discipline

**Goal:** ensure the feature follows 876 repository conventions and remains mergeable while the naming refactor is still moving.

### Implementation

- `DONE` Work only on `feature/billing-accounting-providers-zoho`.
- `DONE` Do not open a PR until explicitly requested.
- `DONE` Follow root `CLAUDE.md`, `AGENTS.md`, `.claude/rules/*`, Billing API/SDK conventions, app structure/layout rules, and error-source-of-truth rules.
- `DONE` Keep the accounting integration provider-agnostic rather than building Zoho semantics into Billing domain tables.
- `IN PROGRESS` Keep implementation independent of the still-moving `refactor/platform-naming-contract` branch.
- `TODO` Reconcile the **latest** naming-branch head only after core implementation is complete.

### Completion criteria

- No provider-specific IDs leak into canonical Billing resource models.
- No PR exists before explicit instruction.
- Final naming reconciliation is a last-mile task, not an excuse to stop implementation.

---

# Phase 1 — Database schema, migration foundation, and provider catalog

**Goal:** establish provider/connection/outbox persistence without changing canonical business ownership.

### Schema files

Primary model files:

- `apps/billing-api/prisma/schema/accounting-provider.prisma`
- `apps/billing-api/prisma/schema/provider-reference.prisma`
- `apps/billing-api/prisma/schema/tenant.prisma`

### Migration sequence

- `DONE` `20260901080000_accounting_provider_foundation`
  - create `billing_accounting_providers`;
  - create `billing_accounting_provider_connections`;
  - create initial sync-job table;
  - add accounting connection scope to provider references;
  - seed Zoho Books provider catalog row.
- `DONE` `20260901081500_accounting_provider_oauth_state`
  - add OAuth state hash + expiry persistence.
- `DONE` `20260901100000_accounting_provider_outbox`
  - finalize durable coalescing outbox;
  - add generation semantics;
  - wire canonical resource changes and child-line/allocation changes into enqueue triggers;
  - add provider-reference uniqueness needed for adoption.
- `DONE` additive capability-correction migration
  - update existing seeded Zoho provider capability JSON so `webhooks=false` without rewriting already-applied migration history.

### Required data model behavior

- `DONE` `AccountingProvider` owns key/name/adapter/capabilities/activity.
- `DONE` `AccountingProviderConnection` is tenant-owned and stores environment, mode, status, provider organization, data-center domains, scopes, sealed credential metadata, health timestamps, and last error code.
- `DONE` `AccountingProviderSyncJob` stores latest canonical projection intent and delivery/retry state.
- `DONE` Provider references support accounting-provider connection ownership.
- `DONE` Unique external adoption protection prevents one remote object from mapping to multiple local resources on one connection.
- `DONE` Connection modes include `mirror`, `native`, and `provider-backed`; minimal release defaults to `mirror` and does not transfer canonical ownership.

### Local gates

- `LOCAL` Apply migrations to a non-production Billing database.
- `LOCAL` Run Prisma generate/validate.
- `LOCAL` Inspect constraints, indexes, triggers, and seeded provider row.
- `LOCAL` Verify capability correction leaves Zoho `webhooks=false` in an already-migrated DB.

### Acceptance criteria

- Applying migrations in order creates all provider infrastructure additively.
- Canonical Billing tables remain provider-neutral.
- A previously migrated DB can receive the capability correction without migration-history edits.

---

# Phase 2 — Provider abstraction and Zoho Books adapter

**Goal:** expose one stable internal accounting-provider contract and implement Zoho behind it.

### Provider contract

Files:

- `apps/billing-api/src/providers/accounting/types.ts`
- `apps/billing-api/src/providers/accounting/registry.ts`
- `apps/billing-api/src/providers/accounting/index.ts`

Status:

- `DONE` provider key registry;
- `DONE` resource-type registry;
- `DONE` capability contract;
- `DONE` provider execution context;
- `DONE` common write/page/resource contracts;
- `DONE` adapter contract for customers, items, estimates, invoices, recurring invoices, and payments.

### Zoho adapter

Files:

- `apps/billing-api/src/providers/accounting/zoho-books/adapter.ts`
- `client.ts`
- `errors.ts`
- `mappers.ts`
- `resources.ts`
- `types.ts`
- `oauth.ts`
- `oauth-internal.ts`

Status:

- `DONE` contacts/customer adapter;
- `DONE` items adapter;
- `DONE` estimates adapter;
- `DONE` invoices adapter;
- `DONE` recurring invoices from Billing subscriptions;
- `DONE` customer payments + invoice allocations;
- `DONE` create/update/retrieve/list/remove operations;
- `DONE` active/inactive lifecycle for contacts/items where supported;
- `DONE` Zod validation of provider response shapes;
- `DONE` provider 401/403 -> authorization-required;
- `DONE` provider 429 -> retryable rate-limit;
- `DONE` provider 5xx/network -> retryable unavailable;
- `DONE` provider 404 -> terminal mapped-resource-not-found path;
- `DONE` generic provider rejection -> bounded client-safe message with no raw provider text;
- `DONE` `webhooks=false` until an inbound implementation exists.

### Acceptance criteria

- Core sync logic can address a provider only through the adapter contract.
- Zoho DTOs do not leak into generic synchronization contracts.
- Client-visible errors contain stable 876 codes/messages rather than raw Zoho payloads.

---

# Phase 3 — OAuth and accounting connection lifecycle

**Goal:** let an operator create, authorize, validate, update, and disable a tenant-owned Zoho Books connection safely.

### API/module files

- `apps/billing-api/src/modules/accounting-providers/accounting-providers.repository.ts`
- `accounting-providers.service.ts`
- `accounting-providers.controller.ts`
- `accounting-providers.schemas.ts`
- `accounting-providers.serializers.ts`
- `accounting-providers.routes.ts`
- `accounting-providers.docs.ts`
- `index.ts`

### Connection lifecycle

- `DONE` list provider catalog;
- `DONE` list tenant connections;
- `DONE` create connection;
- `DONE` retrieve connection;
- `DONE` update connection metadata/mode/status contract;
- `DONE` disable connection and clear credential/state material;
- `DONE` start Zoho authorization and persist hashed expiring state;
- `DONE` public OAuth callback;
- `DONE` code exchange + offline refresh token requirement;
- `DONE` Zoho data-center/accounts-domain normalization;
- `DONE` select default/active Zoho Books organization;
- `DONE` seal refresh token with connection-bound secure-field context;
- `DONE` persist organization/API domains/scopes and activate connection;
- `DONE` validate connection health by refreshing auth and checking provider organization visibility;
- `DONE` update connection health/error state.

### OAuth replay hardening

- `DONE` state hash stored instead of raw nonce;
- `DONE` state expires after the bounded authorization window;
- `DONE` callback verifies state using constant-time hash comparison;
- `DONE` callback atomically consumes matching state before outbound token exchange;
- `DONE` concurrent/replayed callback cannot consume the same state twice;
- `DONE` a token-exchange failure after state consumption requires a fresh authorization attempt rather than preserving reusable state.

### Configuration

- `DONE` `ZOHO_BOOKS_CLIENT_ID`;
- `DONE` `ZOHO_BOOKS_CLIENT_SECRET`;
- `DONE` `ZOHO_BOOKS_REDIRECT_URI`;
- `DONE` `ZOHO_BOOKS_ACCOUNTS_DOMAIN`;
- `DONE` safe examples in `apps/billing-api/.env.example`.

### Local gates

- `LOCAL` Register the exact callback URI in Zoho.
- `LOCAL` Run full consent flow against intended Zoho data center.
- `LOCAL` Verify restart/reconnect after intentionally failed exchange.

### Acceptance criteria

- No provider token reaches browser JSON.
- Replay/tamper/expired state is rejected before provider token exchange.
- Disabled connections cannot refresh or sync.

---

# Phase 4 — Durable canonical-to-provider synchronization

**Goal:** project canonical Billing state to accounting providers asynchronously and safely.

### Core files

- `apps/billing-api/src/modules/accounting-providers/accounting-sync.repository.ts`
- `accounting-sync.service.ts`
- `accounting-sync.controller.ts`
- `accounting-sync.routes.ts`

### Enqueue behavior

- `DONE` transactional database trigger enqueue for canonical writes;
- `DONE` child estimate/invoice lines re-enqueue the parent document;
- `DONE` subscription item changes re-enqueue recurring invoice projection;
- `DONE` payment allocation changes re-enqueue payment projection;
- `DONE` coalesce latest desired state per connection/resource;
- `DONE` increment generation on every newer intent;
- `DONE` explicit reconciliation can enqueue all or selected resource types.

### Claim/delivery behavior

- `DONE` bounded batch claims;
- `DONE` `FOR UPDATE SKIP LOCKED` claim semantics;
- `DONE` stale processing-lock recovery;
- `DONE` dependency-prioritized ordering;
- `DONE` generation-aware delivered writes;
- `DONE` generation-aware failed writes;
- `DONE` older worker completion cannot acknowledge newer generation;
- `DONE` retry backoff;
- `DONE` terminal blocked state for non-retryable projection/provider errors;
- `DONE` connection success/failure health timestamps and last error code.

### Resource projection rules

- `DONE` create/update provider customer and map reference;
- `DONE` create/update provider item and map reference;
- `DONE` archive/reactivate customer/item through provider lifecycle where available;
- `DONE` estimates require provider customer mapping;
- `DONE` invoices require provider customer mapping;
- `DONE` recurring invoices require active/trialing Billing subscription + recurring cadence;
- `DONE` payments require provider customer and allocated provider invoice mappings;
- `DONE` missing dependencies remain retryable rather than sending invalid provider payloads;
- `DONE` mapped remote 404 removes stale mapping and recreates from canonical state where safe;
- `DONE` local deletion removes remote object where adapter semantics permit.

### Scheduler boundary

- `DONE` internal scheduler-only `/accounting-sync` route;
- `DONE` `ACCOUNTING_PROVIDER_SYNC_ENABLED=false` default;
- `DONE` bounded configurable batch size;
- `DONE` scheduler auth uses `BILLING_SCHEDULER_KEY`.

### Local gates

- `LOCAL` exercise sync against migrated DB + live Zoho connection;
- `LOCAL` verify concurrent workers do not double-acknowledge or regress generation;
- `LOCAL` force 429/5xx/provider auth expiry and inspect retry/connection state.

### Acceptance criteria

- Normal Billing writes remain successful while Zoho is unavailable.
- A stale worker cannot overwrite/acknowledge newer canonical intent.
- Invoices/payments never project with missing required provider references.

---

# Phase 5 — Existing-provider data adoption

**Goal:** let an operator map selected existing Zoho customers/items to existing canonical Billing resources without silently importing financial history.

### Files

- `apps/billing-api/src/modules/accounting-providers/accounting-import.repository.ts`
- `accounting-import.service.ts`
- routes/schemas/controller entries in accounting-providers module.

### Behavior

- `DONE` paginated provider preview for `customer` and `item` only;
- `DONE` expose remote ID, display name, secondary label/status, and existing mapped Billing resource;
- `DONE` validate target canonical Billing resource exists in the tenant;
- `DONE` retrieve remote object before adoption;
- `DONE` reject mapping one external object to two canonical resources;
- `DONE` explicit adopt endpoint;
- `DONE` explicit release/unmap endpoint;
- `DONE` adoption does not mutate canonical Billing fields;
- `DONE` adoption does not mutate remote object by itself;
- `DONE` reconciliation remains the explicit point at which canonical state begins projecting to the adopted remote object.

### Deliberate minimal-release decision

- `DEFERRED` historical invoice/estimate/payment/subscription import because canonical numbering, taxes, allocations, ledgers, and state reconstruction are too risky for implicit migration.

### UI decision gate

- `TODO` inspect existing Billing customer/item selection patterns.
- `TODO` if a clean selector can be reused without new cross-feature coupling, add minimal customer/item adoption preview UI.
- `TODO` otherwise keep adoption API/operator-only for this release and document that explicitly in the final handoff.

### Acceptance criteria

- Adoption is explicit and reversible.
- No historical financial record is silently synthesized.

---

# Phase 6 — Billing operator SDK

**Goal:** expose the accounting-provider administration surface through the existing `@876/billing` operator/secret-service client.

### Files

- `packages/billing/src/admin/accounting-providers.ts`
- `packages/billing/src/admin/resources/accounting-providers.ts`
- `packages/billing/src/admin/client.ts`
- `packages/billing/src/admin/index.ts`
- `packages/billing/src/operator.ts`
- `packages/billing/src/admin/accounting-providers.test.ts`

### Methods

- `DONE` `billing.accountingProviders.list()`;
- `DONE` connections `list/create/retrieve/update/delete`;
- `DONE` connections `authorize/validate/reconcile`;
- `DONE` imports `list/adopt/release`;
- `DONE` typed schemas/contracts re-exported from package entrypoints;
- `DONE` request path/body tests.

### Acceptance criteria

- Product/server code does not construct accounting admin URLs manually when the operator client is appropriate.
- The SDK preserves server-only internal key boundaries.

---

# Phase 7 — HTTP contract and failure-mode hardening

**Goal:** prove the new routes work through the assembled Express stack and harden high-risk failure paths.

### Assembled HTTP coverage

- `DONE` provider catalog requires admin credential and returns normal `{data,error}` envelope;
- `DONE` import resource type rejects unsupported values before controller execution;
- `DONE` OAuth callback is genuinely public but still validates required query parameters;
- `DONE` scheduler endpoint rejects missing scheduler credentials;
- `DONE` scheduler endpoint accepts configured scheduler key and preserves envelope shape;
- `DONE` frozen route-auth matrix filters public OpenAPI operations rather than incorrectly assuming every operation is protected.

### OAuth tests

- `DONE` tampered state rejected;
- `DONE` expired state rejected;
- `DONE` state replay rejected;
- `DONE` consume-before-exchange behavior encoded in repository/service tests.

### Sync regression tests

- `DONE` generation guard is present in delivered/failed update predicates;
- `DONE` stale worker completion cannot match a newer generation;
- `DONE` invoice missing provider customer mapping becomes retryable `billing/accounting-dependency-pending`;
- `DONE` dependency failure does not call provider invoice creation;
- `DONE` connection failure audit is updated consistently.

### Provider error tests

- `DONE` 401/403 authorization classification;
- `DONE` 429 retryable rate limit;
- `DONE` 5xx retryable unavailable;
- `DONE` network failure normalization;
- `DONE` generic 4xx terminal invalid-request classification;
- `DONE` raw provider detail does not leak through the client-safe message.

### Remaining hardening

- `IN PROGRESS` review all newly introduced accounting-provider error codes against Billing error conventions/source-of-truth.
- `TODO` add any missing route/service tests discovered during UI integration.
- `LOCAL` run the full Billing API test suite and fix compile/runtime issues impossible to detect through connector-only edits.

### Acceptance criteria

- Public OAuth is the only intentionally unguarded accounting-provider route.
- Error envelopes are stable and provider-safe.
- Critical state/concurrency invariants have regression coverage.

---

# Phase 8 — Minimal Billing management surface

**Goal:** provide one canonical operator UI in 876 Billing instead of duplicating provider management across apps.

### Placement

Preferred host: **Billing settings**, following `.claude/rules/app-structure.md` and `.claude/rules/app-layout.md`.

Planned route shape:

- `/settings/accounting-providers` — provider catalog + connection list/health;
- `/settings/accounting-providers/new` — connection creation if a multi-field create flow is needed;
- detail/actions may use a dedicated detail route if the existing settings architecture supports it cleanly.

Do **not** place a multi-field connection form in a dialog.

### Server/client boundary

- `TODO` add Billing-app server service wrapper around the server-only operator client/internal Billing API path.
- `TODO` ensure `BILLING_INTERNAL_KEY` or equivalent secret remains server-only.
- `TODO` add same-origin mutation route/actions only where the current Billing app convention requires them.
- `TODO` never return refresh/access token material to client components.

### List/status surface

- `TODO` surface provider name + connection name;
- `TODO` environment;
- `TODO` mode;
- `TODO` status (`pending`, `active`, `error`, `disabled`);
- `TODO` connected Zoho organization identifier where useful;
- `TODO` last sync;
- `TODO` last successful sync;
- `TODO` last error code;
- `TODO` provider capability summary only where it helps operator decisions.

### Actions

- `TODO` Connect/Reconnect Zoho Books using server-returned authorization URL;
- `TODO` Validate connection;
- `TODO` Disable connection;
- `TODO` Manual reconcile;
- `TODO` edit connection name/mode only if current product semantics require it;
- `TODO` keep provider credentials inaccessible to browser JS beyond the normal redirect URL.

### Adoption UI decision

- `TODO` inspect existing customer/item selectors and route ownership rules.
- `TODO` add customer/item adoption preview only if it is clean and narrow.
- `DEFERRED` do not invent a bespoke cross-domain selector system solely for this release.

### Navigation

- `TODO` add the settings navigation entry in the canonical Billing settings grouping without duplicating stale app-name prefixes.
- `TODO` re-check path/name after final naming-branch reconciliation.

### UI tests

- `TODO` server-page/service tests for catalog + connections loading;
- `TODO` mutation/action tests for authorize/validate/reconcile/disable;
- `TODO` ensure error state renders without breaking the whole settings page where existing Billing error patterns allow graceful degradation;
- `LOCAL` Billing app typecheck/lint/tests.

### Acceptance criteria

An operator can, from Billing:

1. see available accounting providers;
2. create a Zoho Books connection;
3. start/restart OAuth;
4. see connection status/health;
5. validate the connection;
6. trigger reconciliation;
7. disable the connection;
8. see sync timestamps/error code without any provider secret exposure.

---

# Phase 9 — Documentation and operational handoff

**Goal:** leave a complete operator/local-agent runbook for migration, configuration, verification, and rollout.

### Existing docs

- `DONE` `docs/billing/accounting-providers.md` explains ownership, data model, OAuth, projection, reconciliation, adoption, and failure rules.
- `DONE` environment variables documented.
- `DONE` migration order documented.
- `DONE` worker disabled-by-default rule documented.

### Required final additions

- `TODO` update migration list to include the additive webhook-capability correction migration.
- `TODO` document atomic single-use OAuth state behavior and fresh-authorization requirement after failed token exchange.
- `TODO` document whether adoption UI shipped or remains operator/API-only.
- `TODO` document final Billing settings route and operator workflow.
- `TODO` append exact local migration + validation commands.
- `TODO` append final branch SHA after naming reconciliation.

---

# Phase 10 — Final naming-branch reconciliation

**Goal:** bring the complete feature onto the latest platform naming contract only after functionality is finished.

Current state when this plan was expanded: the branches are materially diverged, so an early manual copy/rebase would cause repeated churn.

### Required work

- `TODO` fetch latest `refactor/platform-naming-contract` head immediately before reconciliation.
- `TODO` compare it with `feature/billing-accounting-providers-zoho`.
- `TODO` reconcile naming/type/path changes affecting Billing API, Billing app, Invoice, Console, shared SDKs, schema names, and service wrappers.
- `TODO` preserve accounting-provider behavior/tests while adopting canonical naming.
- `TODO` re-check old/camelCase/snake_case/public API contract compatibility according to the final naming ADR/rules.
- `TODO` update docs and this plan to final names.
- `TODO` do not silently discard either branch's unrelated changes.

### Acceptance criteria

- Feature branch is based on/reconciled with the latest naming-contract state.
- No accounting-provider tests or invariants are lost in conflict resolution.
- Billing/Invoice/Console references use final canonical names.

---

# Phase 11 — Local verification and live-provider validation

These are mandatory execution gates before merge/deploy. They are not substitutes for implementation and cannot be completed by the GitHub connector environment alone.

### Prisma/database

- `LOCAL` `pnpm --filter @876/billing-api db:generate`
- `LOCAL` `pnpm --filter @876/billing-api db:validate`
- `LOCAL` `pnpm --filter @876/billing-api db:drift`
- `LOCAL` apply accounting-provider migrations to non-production DB;
- `LOCAL` inspect provider catalog seed/capability correction;
- `LOCAL` inspect outbox triggers and indexes;
- `LOCAL` verify provider-reference uniqueness and connection foreign keys.

### Billing API

- `LOCAL` `pnpm --filter @876/billing-api api:contract:check`
- `LOCAL` `pnpm --filter @876/billing-api typecheck`
- `LOCAL` `pnpm --filter @876/billing-api lint`
- `LOCAL` `pnpm --filter @876/billing-api boundaries`
- `LOCAL` `pnpm --filter @876/billing-api test`
- `LOCAL` `pnpm --filter @876/billing-api build`

### SDK/app

- `LOCAL` `pnpm --filter @876/billing typecheck`
- `LOCAL` `pnpm --filter @876/billing test`
- `LOCAL` run affected Billing app typecheck/lint/tests after UI lands;
- `LOCAL` run root structure/boundary checks required by the repository.

### Live Zoho validation

Using a disposable/non-production Billing organization + Zoho Books org:

- `LOCAL` create pending connection;
- `LOCAL` authorize and complete OAuth;
- `LOCAL` refresh access token;
- `LOCAL` validate provider organization;
- `LOCAL` project customer;
- `LOCAL` project item;
- `LOCAL` project estimate;
- `LOCAL` project invoice;
- `LOCAL` project recurring invoice/subscription;
- `LOCAL` project payment + allocation;
- `LOCAL` archive/reactivate customer/item;
- `LOCAL` force provider 429 and confirm retry;
- `LOCAL` force provider outage and confirm Billing request path stays healthy;
- `LOCAL` expire/revoke authorization and confirm connection enters error/reconnect state;
- `LOCAL` queue multiple generations during an in-flight worker and confirm only newest intent remains pending/deliverable;
- `LOCAL` validate manual reconciliation;
- `LOCAL` preview + adopt a pre-existing Zoho customer/item;
- `LOCAL` release an adoption mapping;
- `LOCAL` disable connection and confirm sealed credential material is cleared and sync stops.

---

# Phase 12 — Completion definition

Implementation is complete only when:

- all non-`LOCAL`, non-`DEFERRED` items above are `DONE`;
- the minimal Billing management UI is present and follows app structure/layout conventions;
- provider error/OAuth/concurrency safety tests are present;
- the feature is reconciled with the latest naming branch;
- docs describe the final code and operational sequence;
- only database/runtime/live-Zoho execution gates remain for the local agent/operator.

No PR should be opened until explicitly requested.

---

# Current progress snapshot

_Last updated 2026-09-01 after the local execution gates were run for the first
time. Everything above this line is the plan as written; this section is the
state of the code that actually exists._

## Completed implementation

- provider/connection/outbox schema and migrations;
- provider-reference accounting ownership;
- Zoho provider adapter and supported resource mappers;
- secure OAuth and data-center support;
- atomically single-use OAuth state;
- connection CRUD/authorize/validate/disable;
- durable coalescing synchronization with generation safety;
- scheduler route and manual reconciliation;
- explicit customer/item adoption API;
- operator SDK and SDK tests;
- assembled HTTP route/security/envelope coverage;
- OAuth tamper/expiry/replay tests;
- provider error-classification tests with raw-provider-message leak prevention;
- dependency-pending sync regression tests;
- generation-guard repository regression tests;
- webhook capability corrected to `false` in adapter and persisted provider catalog migration;
- Billing accounting-provider management surface (list/detail/create, connection
  actions, adoption preview and release);
- adoption UI — `DONE`, not deferred. The decision recorded in Phase 8 was to add
  it only if a clean, narrow selector was possible; it was, so it landed at
  `/settings/accounting-providers/[connectionId]/imports`;
- naming-branch reconciliation — `DONE`. `refactor/platform-naming-contract` is
  now a strict ancestor of this branch, so no manual reconciliation remains.

## Phase 11 local verification — executed 2026-09-01

These are the gates the connector environment could not run. All were executed
locally against the development Neon database and all now pass.

| Gate                                             | Result                                        |
| ------------------------------------------------ | --------------------------------------------- |
| `@876/billing-api` `db:generate` / `db:validate` | pass                                          |
| `@876/billing-api` `db:migration:check`          | 36 migrations applied, schema up to date      |
| `@876/billing-api` `db:drift`                    | no accounting-provider drift (see note below) |
| `@876/billing-api` `typecheck`                   | pass                                          |
| `@876/billing-api` `lint`                        | pass, 0 errors                                |
| `@876/billing-api` `boundaries`                  | pass, 0 violations                            |
| `@876/billing-api` `test`                        | 560 passed                                    |
| `@876/billing-api` `build`                       | pass                                          |
| `@876/billing-api` `api:contract:check`          | 213 frozen == 213 Express, 0 mismatches       |
| `@876/billing` SDK `typecheck` / `test`          | pass, 213 tests                               |
| `@876/billing-app` `typecheck` / `lint` / `test` | pass, 723 tests                               |
| `scripts/check-app-structure.mjs`                | pass                                          |

### Defects the gates found, and how each was resolved

1. **Prisma compound-key name.** `accounting-import.repository` queried
   `billing_provider_references_external_key`, which is the `map:` (database
   constraint) name. Prisma generates the client key from the field list, so the
   correct key is `provider_externalType_externalId`.
2. **Half-applied uniqueness hardening.** `findAccountingReferenceByExternalId`
   had been replaced by `findAccountingReferenceByProviderExternal` without
   updating its caller or test. The rewrite was the right call — the unique index
   is `(provider, externalType, externalId)`, so a conflict on a sibling
   connection is just as real as one on this connection — so the caller was moved
   onto it and now also rejects a cross-connection conflict, with a test.
3. **`accountingResourceTypes` exported as a type.** `providers/accounting/index.ts`
   used `export type *`, so the runtime array was not exported as a value.
4. **Provider layer imported HTTP errors.** `providers/accounting/registry.ts`
   threw `AppHttpError`, violating the `providers-are-leaf` boundary. Extracted
   `AccountingProviderError` as the provider-layer error; `ZohoBooksError` now
   extends it and the module-layer mapper normalizes the base class.
5. **Service queried Prisma directly.** `accounting-sync.service.ts` ran six
   `prisma.*.findFirst` reads, violating `prisma-only-in-repositories`. The
   queries moved to `accounting-sync.repository.ts` as `findProjectable*`
   loaders; the mapping stayed in the service.
6. **Role migration violated a CHECK constraint.** `billing_roles_slug_check` was
   `^[a-z0-9_]{2,50}$` — no hyphen — so the canonical `super_admin` →
   `super-admin` rewrite could not have applied. The migration now widens the
   constraint first. Verified against the live database: the constraint is now
   `^[a-z0-9_-]{2,50}$` and all role slugs are `super-admin`/`admin`/`staff`.
7. **Truncated index identifier.** The foundation migration declares a 64-byte
   index name; Postgres truncates at 63. The schema now declares the truncated
   form so drift stays clean, with a comment so it is not "fixed" back.
8. **New operations could not boot.** `v1Operation` threw for any route absent
   from the frozen contract, so a new endpoint could never start the app that
   generates the contract. It now returns `undefined` and the route falls back to
   its inline spec; `api:contract:check` still fails an unregistered route as an
   extra operation, so parity is unchanged.
9. **`<Button asChild>` in the Billing UI.** `@876/ui`'s Button wraps Base UI, not
   Radix, and has no `asChild`. Converted to the platform pattern —
   `className={buttonVariants({ … })}` on the `<Link>`.
10. **Unregistered surfaces.** The app's anti-drift tests correctly caught the new
    resource client, settings nav entry, route manifest, and contract inventory.
    All four were registered rather than relaxed. The proxied-resource test was
    additionally corrected to detect real proxy routes by their use of
    `createBillingResourceRoute`, so the hand-written accounting dispatcher can
    never be mistaken for a generic passthrough.

### Known, out of scope

- `db:drift` reports three index renames and one orphan `BillingInterval` enum.
  Every schema file involved is byte-identical to `main`; this drift pre-dates the
  branch and is not touched here.
- `packages/core` `phone.test.ts` expects 32 dial codes and receives 41. Its
  inputs are byte-identical to `main`; pre-existing and out of scope.

## Remaining — live Zoho validation only

The Phase 11 "Live Zoho validation" list is unchanged and still outstanding. It
needs a disposable Billing organization plus a real Zoho Books sandbox
organization and credentials, which this environment does not have. Nothing in
the code path is blocked on it; it is an operator acceptance gate before the
feature is enabled for a real tenant.

`ACCOUNTING_PROVIDER_SYNC_ENABLED` defaults to `false`, so merging this branch
enables no projection anywhere until an operator turns it on.
