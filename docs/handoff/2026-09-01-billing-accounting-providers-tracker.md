# Billing Accounting Providers / Zoho Books — Implementation Tracker

Branch: `feature/billing-accounting-providers-zoho`  
Upstream naming branch to reconcile before completion: `refactor/platform-naming-contract`  
Date: 2026-09-01

This is the live committed tracker for the accounting-provider implementation. The repository's canonical `.claude/tracker/implementation_plan.md` remains intentionally local-only and gitignored; this handoff tracker is the durable branch-visible equivalent for connector-driven work. Update this file after every significant implementation chunk.

## Goal

Add a minimal, provider-agnostic accounting integration layer to 876 Billing with Zoho Books as the first provider. 876 Billing remains the canonical billing/financial data plane; Zoho Books is an external accounting execution/mirror target rather than a replacement domain model. Support organization connection management, secure OAuth, durable canonical-to-provider synchronization, controlled adoption of existing provider data, and typed operator access without expanding into the entirety of Zoho Books.

## Status legend

- `TODO` — not yet implemented
- `IN PROGRESS` — actively being implemented/reconciled
- `DONE` — implementation is present on this branch
- `LOCAL` — requires a mounted checkout, database, live provider credentials, or runtime execution that this GitHub connector cannot perform
- `DEFERRED` — deliberately outside this minimal integration scope

## Fixed design decisions

- `DONE` 876 Billing remains canonical for customers, items, estimates, invoices, recurring invoices/subscriptions, and payments.
- `DONE` Accounting providers live behind a provider-agnostic adapter registry; Zoho Books is the first adapter, not a hard-coded platform-wide dependency.
- `DONE` Initial connection mode defaults to `mirror`; provider-backed/native modes remain represented by the connection model but do not move canonical ownership away from Billing in this implementation.
- `DONE` OAuth refresh tokens are sealed through the shared secure-field abstraction and may use WorkOS Vault; provider tokens are never exposed to browser clients.
- `DONE` Provider synchronization is asynchronous and durable. Canonical Billing writes enqueue a transactional outbox; provider I/O never runs in the Billing write transaction.
- `DONE` Provider references map one canonical Billing resource to one external provider object per connection.
- `DONE` Existing Zoho data is adopted deliberately rather than silently bulk-imported. The operator previews provider rows and explicitly maps them to an existing canonical Billing resource.
- `DONE` Initial adoption/import support is intentionally limited to customers and items. Historical invoices/estimates/payments are not reconstructed automatically because doing so could create duplicate or incorrect financial history.
- `DONE` No PR is opened as part of this branch unless explicitly requested later.

## Schema and migrations

- `DONE` Add `AccountingProvider` provider catalog model.
- `DONE` Add tenant-owned `AccountingProviderConnection` model.
- `DONE` Persist provider organization ID, Zoho accounts/API domains, scopes, connection health timestamps, and last error code.
- `DONE` Persist sealed refresh token ciphertext/key/provider metadata rather than raw OAuth refresh tokens.
- `DONE` Add `AccountingProviderSyncJob` durable coalescing outbox model.
- `DONE` Add generation tracking so an older in-flight provider write cannot overwrite a newer canonical enqueue.
- `DONE` Extend provider references with accounting-provider connection ownership and unique canonical-resource mapping.
- `DONE` Add migration wiring canonical customer/item/estimate/invoice/subscription/payment writes and child-line changes into the accounting outbox.
- `DONE` Add unique external-adoption protection for `(connection, resourceType, externalId)` so a Zoho object cannot be adopted by multiple Billing resources.
- `LOCAL` Apply Billing Prisma migrations to the target development database.
- `LOCAL` Regenerate/validate Prisma client after migration application.

## Provider abstraction and Zoho Books adapter

- `DONE` Add provider registry and accounting provider capability contract.
- `DONE` Add resource adapter contracts for customers, items, estimates, invoices, recurring invoices, and payments received.
- `DONE` Add Zoho Books adapter entry with capabilities for the six supported resource families.
- `DONE` Add Zoho Books HTTP client and centralized provider error normalization.
- `DONE` Add Zoho contact mapping for Billing customers.
- `DONE` Add Zoho item mapping for Billing items.
- `DONE` Add Zoho estimate mapping.
- `DONE` Add Zoho invoice mapping.
- `DONE` Add Zoho recurring-invoice mapping from canonical Billing subscription state.
- `DONE` Add Zoho customer-payment mapping and invoice allocations.
- `DONE` Support provider create/update/retrieve/list/remove operations and active/inactive state where Zoho exposes it.
- `DONE` Do not advertise inbound webhook support before an inbound Zoho webhook boundary exists; `webhooks` is explicitly `false` for the minimal adapter.
- `DEFERRED` Inbound Zoho webhook ingestion. Outbound synchronization and explicit reconciliation are the supported minimal release mechanisms.

## OAuth and connection lifecycle

- `DONE` Add Zoho Books OAuth scopes and authorization URL builder.
- `DONE` Add code exchange and refresh-token flow.
- `DONE` Normalize Zoho data-center accounts domains.
- `DONE` Add replay-resistant, expiring OAuth state hash verification.
- `DONE` Resolve the connected Zoho Books organization after OAuth and persist its organization ID.
- `DONE` Seal the offline refresh token using the shared secure-field provider.
- `DONE` Add connection create/retrieve/list/update/disable operations.
- `DONE` Add authorization-start endpoint.
- `DONE` Add public Zoho OAuth callback endpoint.
- `DONE` Add connection validation/health endpoint.
- `DONE` Add accounting provider catalog endpoint.
- `DONE` Add environment variables and safe defaults in `apps/billing-api/.env.example`.
- `LOCAL` Configure a real Zoho OAuth client/redirect URI and exercise the consent flow against the intended Zoho data center.

## Durable synchronization

- `DONE` Add transactional enqueue behavior for canonical resource writes.
- `DONE` Coalesce repeated writes to the same `(connection, resourceType, resourceId)` into latest desired state.
- `DONE` Prioritize dependency order: customer -> item -> estimate -> invoice -> recurring invoice -> payment.
- `DONE` Add stale processing-lock recovery.
- `DONE` Add retryable failure backoff and terminal blocked state.
- `DONE` Add generation-aware delivered/failed completion writes.
- `DONE` Resolve or create provider references while synchronizing resources.
- `DONE` Remove provider references on provider-side delete.
- `DONE` Track connection sync success/failure timestamps and error code.
- `DONE` Add bounded scheduler-only `/accounting-sync` sweep endpoint.
- `DONE` Add explicit organization/connection reconciliation endpoint to enqueue canonical resources.
- `DONE` Add sync worker configuration flags/batch size with synchronization disabled by default.
- `LOCAL` Run the worker against a migrated database and a real Zoho connection with synchronization enabled.

## Existing-provider data adoption

- `DONE` Add paginated provider import-preview endpoint for `customer` and `item`.
- `DONE` Return existing provider-reference mapping state in import candidates.
- `DONE` Verify the selected canonical Billing customer/item exists before adoption.
- `DONE` Retrieve the remote Zoho object before committing an adoption mapping.
- `DONE` Prevent adopting one external Zoho object into two canonical Billing resources.
- `DONE` Add explicit adoption endpoint.
- `DONE` Add explicit release/unmap endpoint.
- `DONE` Keep adoption mapping-only; do not silently overwrite canonical Billing fields from remote provider data.
- `DEFERRED` Historical estimates/invoices/recurring invoices/payments import or migration tooling.

## Billing operator SDK

- `DONE` Add accounting-provider schemas/types to `@876/billing` secret-service/operator surface.
- `DONE` Add `billing.accountingProviders.list()`.
- `DONE` Add connection `list/create/retrieve/update/delete` methods.
- `DONE` Add connection `authorize/validate/reconcile` methods.
- `DONE` Add import-candidate list method.
- `DONE` Add provider-resource adopt/release methods.
- `DONE` Re-export operator accounting-provider contracts from the package entrypoint.
- `DONE` Add SDK request/path coverage for the accounting-provider operator client.

## API tests and hardening

- `DONE` Add accounting-provider adoption service tests.
- `DONE` Add operator SDK accounting-provider tests.
- `IN PROGRESS` Add assembled Express/Supertest coverage for provider catalog, connection validation, import/adoption route validation, scheduler security, and response envelopes.
- `TODO` Add focused OAuth state/replay/expiry tests if existing service tests do not already cover all three cases.
- `TODO` Add sync concurrency/generation regression tests proving an old worker cannot mark a newer generation delivered.
- `TODO` Add dependency-order test proving invoices/payments remain blocked or retry safely when their customer/item/provider references are not ready.
- `TODO` Add provider error mapping tests for Zoho 401/429/5xx and retryability.
- `TODO` Review all new error codes against the Billing error/source-of-truth conventions and remove any one-off inconsistencies.

## Product/operator surface

- `TODO` Add the minimal management surface in an existing 876 product/admin UI (prefer the Billing settings/integrations surface unless the current naming branch establishes a different canonical location).
- `TODO` Surface provider catalog and connected-account status.
- `TODO` Add Connect Zoho Books action using the authorize URL returned by Billing.
- `TODO` Add reconnect/validate/disable actions.
- `TODO` Surface last sync / last successful sync / last error state.
- `TODO` Add manual reconcile control.
- `TODO` Add customer/item adoption preview UI only if it can reuse existing Billing customer/item selectors cleanly; otherwise keep adoption API/operator-only for this minimal release and document the decision.
- `DEFERRED` Replicate the same management UI independently in Console, Invoice, and every consuming app. The provider capability is owned once by Billing and other hosts can route to it later.

## Documentation

- `DONE` Add `docs/billing/accounting-providers.md` describing architecture, setup, synchronization, and adoption semantics.
- `DONE` Document required Zoho OAuth and worker environment variables.
- `DONE` Document that 876 Billing stays canonical and provider writes are projections.
- `DONE` Document import/adoption as explicit mapping rather than blind import.
- `IN PROGRESS` Keep this implementation tracker current after every significant change.
- `TODO` Add final handoff section with exact local migration/verification commands and final branch SHA.

## Branch reconciliation

- `IN PROGRESS` Continue implementation on `feature/billing-accounting-providers-zoho` without opening a PR.
- `TODO` Reconcile the latest `refactor/platform-naming-contract` head before declaring implementation complete.
- `TODO` Re-check all Billing/Invoice/Console paths touched by the naming branch after reconciliation.
- `TODO` Refresh this tracker after reconciliation so it reflects the final actual branch state.

## Environment validation required before merge

These are execution gates, not substitutes for implementation. They cannot currently be executed from the GitHub connector because there is no mounted repository/database runtime.

- `LOCAL` `pnpm --filter @876/billing-api db:generate`
- `LOCAL` `pnpm --filter @876/billing-api db:validate`
- `LOCAL` `pnpm --filter @876/billing-api db:drift`
- `LOCAL` `pnpm --filter @876/billing-api api:contract:check`
- `LOCAL` `pnpm --filter @876/billing-api typecheck`
- `LOCAL` `pnpm --filter @876/billing-api lint`
- `LOCAL` `pnpm --filter @876/billing-api boundaries`
- `LOCAL` `pnpm --filter @876/billing-api test`
- `LOCAL` `pnpm --filter @876/billing-api build`
- `LOCAL` `pnpm --filter @876/billing typecheck`
- `LOCAL` `pnpm --filter @876/billing test`
- `LOCAL` run the affected host-app typecheck/lint/tests once the management UI is added
- `LOCAL` apply accounting-provider migrations to a non-production database and inspect generated constraints/triggers
- `LOCAL` test a real Zoho OAuth authorization, refresh, customer sync, item sync, invoice sync, recurring invoice sync, payment sync, retry, disable, and reconcile cycle

## Current status

**IN PROGRESS — BACKEND FOUNDATION, DURABLE ZOHO PROJECTION, ADOPTION API, DOCS, OPERATOR SDK, AND CAPABILITY REPORTING ARE IMPLEMENTED. REMAINING IMPLEMENTATION IS HTTP-STACK HARDENING, MINIMAL MANAGEMENT UI, FINAL NAMING-BRANCH RECONCILIATION, AND FINAL HANDOFF. LOCAL DATABASE/RUNTIME VALIDATION REMAINS REQUIRED BEFORE MERGE.**

Current branch head at this tracker update: `2e9529f486ff6f38a7d70a929737bacf6bc6bc9a`.
