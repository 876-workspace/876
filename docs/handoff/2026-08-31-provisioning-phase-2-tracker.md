# Provisioning Phase 2 implementation tracker

Branch: `feature/provisioning-phase-2`

This is the live implementation tracker for Phase 2. Update it as work moves from todo -> in progress -> done. Database migration execution and production data changes remain local-AI/operator work unless explicitly marked otherwise.

## Status legend

- `TODO` — not yet implemented
- `IN PROGRESS` — implementation currently being changed
- `DONE` — code/documentation implemented on this branch
- `LOCAL` — intentionally left for local database/runtime execution

## Resolver and policy

- `DONE` Deterministic DB-backed setup resolver.
- `DONE` Country, subdivision, and jurisdiction routing context.
- `DONE` OR between condition groups; AND within a group.
- `DONE` Specificity -> priority -> lexical deterministic tie-break.
- `DONE` Active + published setups only.
- `DONE` Exactly-one fallback requirement.
- `DONE` Workspace defaults read from published finance manifest v1.
- `DONE` Application, Work service, and Work capability policy helpers.
- `DONE` Work capabilities narrow application-declared Work scopes.
- `DONE` Persist selected setup plus workspace currency/language defaults atomically with the initial routing decision.

## Organization persistence and retry behavior

- `DONE` Organization schema fields for selected setup and routing audit.
- `DONE` Provisioning run schema fields for selection audit.
- `DONE` Central fresh-org routing guard: only an org whose `createdAt` equals the current bootstrap timestamp may be automatically selected.
- `DONE` Admin organization-create reaches the central fresh-org resolver before first provisioning writes.
- `DONE` Business registration/member assignment reaches the central fresh-org resolver before effective app assignment/subscription writes.
- `DONE` Existing-user/bootstrap path resolves and persists before workspace provisioning.
- `DONE` Persisted selections are reused on retry/resume.
- `DONE` Older organizations with no persisted selection are not silently re-resolved when policy changes.
- `IN PROGRESS` Replace remaining generic retry errors with stable provisioning error contracts where needed.

## Signup routing facts

- `TODO` Add canonical `countryCode` to business registration SDK/API contract.
- `TODO` Add optional canonical subdivision/region routing input where available.
- `TODO` Add canonical country selector to business onboarding UI.
- `TODO` Resolve subdivision from canonical Region rows rather than free-form strings.
- `DONE` Organization `countryCode` wins over Region country when both are present; Region country is a fallback only.

## Entitlements and service provisioning

- `DONE` Setup application entitlements drive default subscriptions.
- `DONE` Enterprise remains mandatory.
- `DONE` Explicit source-app signup remains an additional entitlement request.
- `DONE` Billing/Invoice app access stays separate from shared finance infrastructure.
- `IN PROGRESS` Work service gate controls Work tenant provisioning.
- `IN PROGRESS` Work capabilities control granted scopes.
- `DONE` Member app assignment uses effective setup entitlements plus explicit source-app access.

## Finance provisioning

- `TODO` Remove remaining implicit "use current default setup" behavior when an organization has no persisted setup.
- `TODO` Require persisted setup for Phase 2 finance readiness on new/routed organizations.
- `TODO` Copy setup-selection audit fields into every new provisioning run.
- `TODO` Ensure finance retries reuse persisted finance/setup revision context where required.

## Existing-organization backfill

- `TODO` Add explicit backfill command/service for organizations without persisted selection.
- `TODO` Mark backfilled selections as `backfill` rather than `policy`/`fallback`.
- `TODO` Make backfill idempotent and non-overwriting.
- `TODO` Add dry-run/report mode if consistent with existing scripts.

## Tests

- `DONE` Dedicated exhaustive Muse test brief added at `.claude/briefs/muse/2026-08-31-provisioning-phase-2-routing-exhaustive-tests.md`.
- `TODO` Resolver unit matrix.
- `TODO` Specificity/priority/tie-break regression tests.
- `TODO` Fallback invariant tests.
- `TODO` Persistence + retry no-reroute tests.
- `TODO` Signup/admin creation integration tests.
- `TODO` Work gate/capability integration tests.
- `TODO` Finance run-audit tests.
- `TODO` Backfill tests including repeated/concurrent runs.
- `TODO` Express-stack route tests where public/admin HTTP contracts change.

## PR #449 cleanup obligations

- `TODO` Fix Console test environment regression: `React.act is not a function`.
- `TODO` Fix CRM feature-layer sibling import/boundary lint violation documented in the Phase 2 handoff.

## Documentation and handoff

- `TODO` Update `docs/handoff/2026-08-31-provisioning-phase-2-handoff.md` with final implementation and local migration/backfill instructions.
- `TODO` Document final new-org routing sequence and retry invariants.
- `TODO` Document explicit existing-org backfill sequence.

## Local-only completion

- `LOCAL` Review/apply Phase 2 Prisma migration.
- `LOCAL` Regenerate Prisma client if required by repository workflow.
- `LOCAL` Execute Phase 1 one-time provisioning defaults import if not already applied.
- `LOCAL` Run any Phase 2 existing-org selection backfill after code/migration review.
- `LOCAL` Run full `pnpm` typecheck/lint/test/build/DB verification suite.

## Completion definition

Phase 2 is complete when every non-`LOCAL` item above is `DONE`, the Phase 2 handoff reflects the final branch state, and the only remaining work is explicitly database/runtime execution by the local agent/operator.
