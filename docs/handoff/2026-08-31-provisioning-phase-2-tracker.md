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
- `DONE` Stable `provisioning/setup-selection-missing` contract replaces silent rerouting for required Phase 2 operations.

## Signup routing facts

- `DONE` Canonical `countryCode` business registration contract is threaded through Account, API, persistence, and UI.
- `DONE` Subdivision/Region input is deliberately deferred until signup has a definitive Region source; no free-form subdivision is accepted.
- `DONE` Business onboarding uses the shared canonical country selector.
- `DONE` Resolver derives subdivision from canonical organization Region rows when present.
- `DONE` Organization `countryCode` wins over Region country when both are present; Region country is a fallback only.

## Entitlements and service provisioning

- `DONE` Setup application entitlements drive default subscriptions.
- `DONE` Enterprise remains mandatory.
- `DONE` Explicit source-app signup remains an additional entitlement request.
- `DONE` Billing/Invoice app access stays separate from shared finance infrastructure.
- `DONE` Work `service/work` gate controls whether an organization receives a Work tenant.
- `DONE` Work tenant is created independently of CRM/product connections.
- `DONE` Work capabilities narrow each Work-dependent app's declared scopes.
- `DONE` Required Work configuration/tenant/connection failures fail closed with retryable provisioning errors.
- `DONE` Member app assignment uses effective setup entitlements plus explicit source-app access.

## Finance provisioning

- `DONE` Removed implicit runtime assignment of the platform's current default setup from finance provisioning.
- `DONE` Embedded-finance readiness requires an already-persisted organization setup.
- `DONE` Embedded-finance readiness requires the published finance manifest for that exact setup.
- `DONE` New provisioning runs snapshot setup key, selection type, group, priority, and matched fields.
- `DONE` Focused regression tests prove run-audit stamping and no-default fallback across finance paths.

## Existing-organization backfill

- `DONE` Explicit `provisioning:backfill-selections` command/service for organizations without persisted selection.
- `DONE` Backfilled selections are stored as `backfill`, never rewritten as initial `policy`/`fallback` history.
- `DONE` Conditional writes make backfill repeated/concurrent runs non-overwriting.
- `DONE` `--dry-run`, page-size, and maximum-row controls with structured summary output.
- `DONE` Backfill is not a seed/startup hook and uses the same deterministic resolver as signup.

## Tests

- `DONE` Dedicated exhaustive Muse test brief added at `.claude/briefs/muse/2026-08-31-provisioning-phase-2-routing-exhaustive-tests.md`.
- `DONE` Resolver unit matrix covering normalization, OR/AND semantics and empty context.
- `DONE` Specificity/priority/setup-key/group-key deterministic tie-break regression tests including candidate permutations.
- `DONE` Zero/one/multiple fallback invariant tests.
- `DONE` Persistence + retry no-reroute tests.
- `DONE` Signup/admin creation integration tests for canonical country routing.
- `DONE` Work gate/tenant/capability/error/retry orchestration tests updated to Phase 2 semantics.
- `DONE` Finance run-audit tests.
- `DONE` Backfill dry-run/persistence/concurrent-skip/pagination/limit/canonical Region tests.
- `DONE` Express-stack route tests cover required, supported, alias-consistent, and normalized country input.

## PR #449 cleanup obligations

- `DONE` Console Vitest now uses `jsdom`, fixing the environment mismatch behind `React.act is not a function` component-test failures.
- `DONE` CRM `request-customer-option.ts` uses a same-feature relative import instead of violating the `@/features/*` sibling boundary rule.

## Documentation and handoff

- `DONE` Updated `docs/handoff/2026-08-31-provisioning-phase-2-handoff.md` with final implementation and migration/backfill instructions.
- `DONE` Documented final new-org routing sequence and retry invariants.
- `DONE` Documented explicit existing-org backfill sequence and exact dry-run/write commands.

## Local-only completion

- `DONE` Reviewed and applied the Phase 2 Prisma migration to development.
- `DONE` Regenerated the Prisma client through the API workflow.
- `DONE` Verified the Phase 1 provisioning defaults import (`valid: true`).
- `DONE` Ran the selection backfill dry-run; zero organizations required writes.
- `DONE` Ran the Phase 2 typecheck/lint/test/boundary/DB verification suite.

## Completion definition

Phase 2 is complete when every non-`LOCAL` item above is `DONE`, the Phase 2 handoff reflects the final branch state, and the only remaining work is explicitly database/runtime execution by the local agent/operator.
