# Application Provisioning Profiles — Implementation Tracker

Branch: `feature/provisioning-app-profiles`  
Base for final comparison: `main` at PR #450 merge `4599ad6b834b897bdf1e98138ba493b838635910`  
Date: 2026-08-31

## Goal

Make per-application provisioning first-class and multi-profile without changing the Phase 2 organization setup-selection contract. Each app may own multiple provisioning profiles with database-driven conditions while every app retains exactly one location-neutral default.

## Final design decisions

- Keep one generic provisioning engine and one Manifest v1 protocol.
- Add first-class `ApplicationProvisioningProfile` rows beneath `App`.
- Application profile conditions use OR-of-AND / specificity / priority / deterministic lexical tie-break semantics.
- Condition fields: `setup`, `country`, `subdivision`, `jurisdiction`, `plan`.
- `setup` consumes the persisted organization setup decision and is the preferred jurisdictional routing field.
- Existing application manifests keep their historical App-ID target during migration; the migrated default profile points at that target.
- New non-default profiles normally use their profile ID as the internal manifest target.
- Existing generic application manifest operations resolve the app's **current default profile** transparently.
- Changing the default atomically swaps manifest target ownership while preserving profile IDs, manifest history, and existing organization selections.
- A variant may become default only after it is conditionless, published, and non-archived; new profiles cannot be created directly as default.
- Profile-aware API operations own list/create/update/policy/manifest operations.
- Persist exactly one profile selection per `(organization, app)`; retries reuse it and never silently re-route.
- Existing active app subscriptions are explicitly backfilled to the sole migrated default profile in the migration.
- No second automatic app-profile reselection runs after the Phase 2 workspace-setup backfill.
- No profile-specific override protocol is added beyond the normal profile Manifest v1.
- The branch is rebased onto the merged Phase 2 implementation from PR #450; Phase 2 auth, test, build-contract, Console, UI, and lockfile fixes remain authoritative.
- No PR is opened as part of this implementation.

## Checklist

### Schema and migration
- [x] Add application provisioning profile model.
- [x] Add application profile condition model.
- [x] Add organization×application persisted profile selection model.
- [x] Add relations on App and Organization.
- [x] Add application profile audit fields to provisioning runs.
- [x] Add ID prefixes.
- [x] Write additive migration that creates one default profile for every existing App while preserving existing application manifest target identity.
- [x] Backfill existing active app subscriptions to the sole migrated default with `selection_type=backfill`.
- [x] Add constraints/indexes enforcing one default profile per app, unique profile keys, and one org×app selection.

### Shared contracts and resolver
- [x] Add shared application-profile condition/selection contracts.
- [x] Implement deterministic pure resolver.
- [x] Implement repository loading only active candidates.
- [x] Implement persisted selection lookup and conditional persist-once write.
- [x] Resolve application profile from persisted organization setup/context.
- [x] Support default-only behavior without conditions.
- [x] Fail closed when zero/multiple eligible defaults exist.
- [x] Normalize setup/country/subdivision/jurisdiction/plan inputs.
- [x] Enforce same priority across every condition in one AND group.
- [x] Emit canonical `matched_fields` ordering independent of condition-row order.
- [x] Reject malformed default candidates even when another policy profile matches.

### Provisioning manifest compatibility
- [x] Make existing generic app manifest endpoints resolve the current default profile transparently.
- [x] Add profile-aware manifest resolution helpers.
- [x] Keep organization/finance manifest behavior unchanged.
- [x] Ensure catalog validation still keys by app slug rather than profile ID.
- [x] Preserve generic compatibility after an operator changes which profile is default.
- [x] Keep profile IDs and historical organization selections stable during a default swap.

### Provisioning runtime
- [x] Select/persist an app profile when an app becomes subscribed/activated.
- [x] Reuse persisted app profile on retries.
- [x] Feed selected profile manifest target into app readiness/provisioning runs.
- [x] Snapshot profile selection audit fields onto provisioning runs.
- [x] Keep finance dependency/scopes based on the selected app profile.
- [x] Keep workspace finance setup selection independently persisted/audited.
- [x] Keep Work scopes as setup policy ∩ app-declared capability contract.
- [x] Fail closed when a required persisted app-profile selection is missing.

### API and Console
- [x] Export and mount application-profile router in assembled Express app.
- [x] Add application-profile CRUD/list/default-policy API.
- [x] Add profile condition replace/read API.
- [x] Add profile-aware Manifest v1 retrieve/published/draft/validate/publish API.
- [x] Add Platform operator client methods under `provisioning.applicationProfiles`.
- [x] Add Console application-profile list surface.
- [x] Add Console profile creation/copy flow.
- [x] Add Console profile metadata/routing editor.
- [x] Reuse existing application provisioning editor for per-profile manifests.
- [x] Add same-origin Console profile API routes guarded by `console:apps`.
- [x] Prevent existing default demotion/archive; profile deletion is not exposed.
- [x] Clear routing conditions before Console promotes a variant to default.
- [x] Require a variant to be published and non-archived before default promotion.
- [x] Reject creating a brand-new draft directly as default.

### Bootstrap/import/backfill
- [x] Extend Phase 1 one-time import to ensure the default app profile before generic app manifest import.
- [x] Extend verification to require/recognize every imported app's default profile.
- [x] Keep verification read-only.
- [x] Persist existing active org×app selections through the additive migration; no separate automatic runtime backfill is required.
- [x] Preserve published application revisions and existing manifest targets during migration/import.
- [x] Document deliberate future reselection as a separate migration/workflow rather than implicit routing.

### Tests
- [x] Resolver AND/OR semantics.
- [x] Specificity > priority > deterministic tie-break.
- [x] Default fallback and invalid default states.
- [x] Candidate permutation determinism.
- [x] Condition normalization.
- [x] Canonical matched-field audit ordering.
- [x] Mixed-priority group validation.
- [x] Persist-once / no re-route on retry.
- [x] Concurrent persistence race winner.
- [x] Different profiles for two organizations using the same app.
- [x] Existing/current-default generic app manifest compatibility.
- [x] Default-change generic manifest compatibility regression.
- [x] Default promotion lifecycle: draft/default rejection, publish requirement, archived rejection.
- [x] Finance dependency/manifest target uses selected app profile.
- [x] Preserve Phase 2 finance readiness/revision fixture fixes after rebase.
- [x] Provisioning-run profile audit serializer/schema snapshot.
- [x] API route/validation tests through assembled Express stack.
- [x] Phase 1 import handling for default profiles.
- [x] Phase 1 verification tests for profile missing/inactive/invalid/manifest mismatch.
- [x] Platform SDK request path/body tests.
- [x] Console route authorization/forwarding tests.
- [x] Console default-promotion ordering test.
- [x] Migration/backfill behavior documented for local validation.

### Documentation / verification
- [x] Add `docs/architecture/021-application-provisioning-profiles.md`.
- [x] Write final implementation handoff including migration order and local commands.
- [x] Add Muse mutation-test extension for application profiles.
- [x] Update `provisioning:verify` help/coverage for default application profiles.
- [x] Perform final static branch consistency sweep across routing, finance, run audit, import, SDK, and Console boundaries.
- [x] Correct the remaining raw-App-ID generic application manifest assumption.
- [x] Tighten shared ProvisioningRun selection-type unions.
- [x] Rebase onto the merged/final Phase 2 tree from PR #450 and preserve its fixes.
- [x] Resolve the finance-provisioning overlap with both Phase 2 fixture fixes and app-profile routing assertions intact.
- [x] Sync ADR/default-promotion documentation with the hardened backend contract.
- [x] Mark implementation tracker complete.

## Environment validation still required before merge

These are execution gates, not deferred implementation items. They cannot be run from the repository-editing connector environment because there is no mounted checkout/database runtime.

- [ ] `pnpm --filter @876/api db:generate`
- [ ] `pnpm --filter @876/api db:validate`
- [ ] apply migrations in a local/dev database using the repository-approved process
- [ ] run `provisioning:import -- --dry-run`, then apply if appropriate
- [ ] run `provisioning:verify`
- [ ] inspect `provisioning:backfill-selections -- --dry-run` before legacy workspace-setup backfill
- [ ] focused API/Platform/Console typecheck + lint + tests
- [ ] root `pnpm format:check`
- [ ] root `pnpm lint`
- [ ] root `pnpm check:structure`
- [ ] root `pnpm typecheck`
- [ ] root `pnpm boundaries`
- [ ] root `pnpm test`
- [ ] root `pnpm check` when the full environment is configured

## Current status

**IMPLEMENTATION COMPLETE — CLEANLY BASED ON MERGED PHASE 2 / CURRENT MAIN; LOCAL DATABASE/TYPE/LINT/TEST VALIDATION REQUIRED BEFORE MERGE.**

No PR has been opened.
