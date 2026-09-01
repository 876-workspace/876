# Application provisioning profiles — implementation handoff

**Date:** 2026-08-31  
**Branch:** `feature/provisioning-app-profiles`  
**PR:** intentionally not opened  
**Architecture:** `docs/architecture/021-application-provisioning-profiles.md`

## Status

Implementation is complete in the branch from the repository-editing environment's perspective. The branch is cleanly based on current `main` after Phase 2 was merged through PR #450 (`4599ad6b834b897bdf1e98138ba493b838635910`). The local agent's Phase 2 auth, provisioning, test, Console, UI, build-contract, and lockfile fixes are therefore inherited as the authoritative base rather than reimplemented or overwritten here.

The repository-editing environment does not have a mounted checkout, Node runtime, database, or pnpm execution surface. Therefore the code in this branch has **not** been locally typechecked, linted, migrated, or test-executed here. The commands in the validation section are mandatory before merge.

Do not interpret that environment limitation as missing implementation. The code, migration, API, runtime routing, tests, SDK, Console UI, architecture, mutation brief, and tracker are all present on this branch.

## What this adds

The platform now has a second persisted provisioning decision beneath the organization provisioning setup:

```text
Organization
  -> persisted provisioning setup
  -> app entitlement
  -> persisted application provisioning profile
  -> application Manifest v1
```

One App may therefore expose several provisioning profiles while two organizations subscribed to that same App can safely use different application defaults.

Manifest v1 remains the only provisioning manifest protocol.

## Database

Migration:

```text
apps/api/prisma/migrations/20260831020000_application_provisioning_profiles/migration.sql
```

Adds:

- `application_provisioning_profiles`
- `application_provisioning_profile_conditions`
- `organization_application_provisioning`
- application-profile audit columns on `provisioning_runs`

The migration also:

1. creates one active `default` profile for every registered App;
2. points that profile at the App's existing application manifest target (`app.id`), preserving historical Manifest v1 identity;
3. backfills every existing **active** app subscription to that sole default profile using `selection_type='backfill'`;
4. uses conflict-safe writes so an already-persisted org/app selection is not replaced.

It does **not** rewrite existing application manifests to profile IDs.

Variant profiles created after migration normally use their profile ID as their internal manifest target.

## Core contracts

New shared contract:

```text
packages/core/src/types/application-provisioning-profile.ts
```

It defines:

- profile status;
- condition fields;
- policy inputs;
- resolver context/candidate/selection types;
- persisted selection types.

`packages/core/src/types/provisioning.ts` now exposes both setup-routing and app-profile-routing audit fields on `ProvisioningRun`, using the same stored selection unions enforced by the API schema.

## Resolver

The pure resolver lives in:

```text
apps/api/src/modules/provisioning/application-provisioning-profile.service.ts
```

Conditions support:

- `setup`
- `country`
- `subdivision`
- `jurisdiction`
- `plan`

Semantics:

```text
same group_key: AND
different group_key: OR
ranking: specificity DESC, priority DESC, profile key ASC, group key ASC
```

The default profile is excluded from policy matching and is used only when no active non-default group matches.

The policy API rejects mixed priorities inside one AND group.

Normalization is deterministic:

- setup/plan -> lowercase
- country/subdivision -> uppercase
- jurisdiction -> trimmed

## Persist once / retry safety

`organization_application_provisioning` is unique on:

```text
(organization_id, app_id)
```

Runtime resolution first checks that row. A persisted selection is returned without reevaluating current policy.

Concurrent inserts use first-writer-wins semantics. If persistence loses the unique race, the resolver reads and returns the winning row rather than overwriting it.

Tests cover:

- persisted retry no-reroute;
- concurrent race winner;
- organization isolation;
- two organizations on the same app selecting different profiles.

## Default profile compatibility

Historical generic application manifest operations remain supported.

Generic:

```text
application/<app>
```

now means:

```text
the current default application provisioning profile
```

`apps/api/src/modules/provisioning/provisioning.service.ts` resolves the current default profile's `manifestTargetKey` for generic application manifest reads, draft writes, publishes, and notes instead of hardcoding `app.id`.

A focused regression test changes the mocked current default between two generic manifest reads and proves the second read follows the new target.

## Atomic default changes

`application-provisioning-profile.repository.ts` performs default promotion inside one Prisma transaction.

When a variant becomes default:

- old default loses `isDefault`;
- new default becomes active/default;
- the legacy App-ID manifest target moves to the new default;
- the old default receives the variant's previous target;
- manifest rows move with the profiles;
- profile IDs remain unchanged;
- persisted organization/app selections remain unchanged.

A variant can be promoted only after it has no routing conditions, already has a published manifest, and is not archived. Brand-new profiles always begin as drafts and cannot be created directly as default. Console clears a variant's routing conditions before asking Core to promote it, but Core independently enforces every promotion invariant, so the UI is not the invariant boundary.

## API

The application-profile router is exported and mounted in the assembled Express application.

Operator routes:

```text
GET    /provisioning/apps/:appKey/profiles
POST   /provisioning/apps/:appKey/profiles
GET    /provisioning/apps/:appKey/profiles/:profileKey
PATCH  /provisioning/apps/:appKey/profiles/:profileKey
GET    /provisioning/apps/:appKey/profiles/:profileKey/policy
PUT    /provisioning/apps/:appKey/profiles/:profileKey/policy
GET    /provisioning/apps/:appKey/profiles/:profileKey/manifest
GET    /provisioning/apps/:appKey/profiles/:profileKey/published
PUT    /provisioning/apps/:appKey/profiles/:profileKey/draft
POST   /provisioning/apps/:appKey/profiles/:profileKey/validate
POST   /provisioning/apps/:appKey/profiles/:profileKey/publish
```

The assembled Express tests cover:

- collection listing;
- create normalization;
- invalid profile keys;
- retrieval;
- OR-of-AND policy normalization;
- mixed-priority rejection;
- profile-specific manifest validation;
- profile-specific publish;
- missing credentials.

## Finance/readiness integration

Finance provisioning now resolves application behavior through the persisted selected profile.

The repository contract exposes a selected profile plus its internal manifest target. Reconciliation/readiness loads the published application revision by that target, not by raw App ID and not by today's default.

This makes it possible for two organizations to use different finance dependency/scopes and application materialization for the same App.

Finance tests/mocks were updated to provide the new selection contract. Focused cases cover:

- missing persisted profile selection failing closed;
- selected variant manifest target use;
- existing finance regression behavior through the shared fixture;
- the Phase 2 finance-revision readiness fixtures introduced by the local agent remain intact after the rebase.

## Provisioning run audit

Run schema/serializer/Core response now includes:

```text
provisioning_setup_key
provisioning_selection_type
provisioning_match_group_key
provisioning_match_priority
provisioning_matched_fields
application_provisioning_profile_id
application_provisioning_profile_key
application_provisioning_selection_type
application_provisioning_match_group_key
application_provisioning_match_priority
application_provisioning_matched_fields
```

A direct serializer/schema test pins both routing layers in one run response.

## Phase 1 import/bootstrap compatibility

The one-time provisioning importer now ensures the application's default profile before importing/preserving its generic application manifest.

The import result includes the number of application profiles ensured.

The migration covers apps already present in the database. Profile management APIs also ensure/recognize a default profile for an App, covering post-migration app registrations when provisioning is first configured.

No manifest v2 behavior was introduced.

## Provisioning verification

`provisioning:verify` remains read-only.

Verification now checks for every application in the import specification:

- default profile exists;
- returned profile is actually default;
- default is active;
- generic application manifest exists/published;
- generic manifest target agrees with the current default profile target.

Tests cover valid, missing, inactive/invalid, and manifest-target mismatch states.

The CLI help was updated to describe the expanded verification scope.

## Platform operator SDK

`@876/platform` exposes profile operations under:

```text
platform.provisioning.applicationProfiles
```

Methods:

- `list`
- `retrieve`
- `create`
- `update`
- `retrievePolicy`
- `replacePolicy`
- `retrieveManifest`
- `retrievePublished`
- `replaceDraft`
- `validate`
- `publish`

No methods were added to the legacy compatibility facade.

SDK tests pin encoded URLs and request bodies for metadata, policy, and Manifest v1 operations.

## Console

App provisioning is now profile-oriented.

Routes:

```text
/apps/:slug/provisioning
/apps/:slug/provisioning/new
/apps/:slug/provisioning/:profileKey
```

Implemented UI:

- profile index;
- default/active/draft/archived visibility;
- profile creation;
- optional copy-from-published-profile;
- profile metadata editing;
- routing-condition editing;
- default promotion;
- existing Manifest v1 resource editor scoped to the selected profile;
- links back to provisioning runs/shared finance setup.

The existing finance/application manifest editor was reused instead of forked. It accepts an optional profile key and switches its application mutation client accordingly.

Console browser API routes live under:

```text
/api/apps/:appId/provisioning/profiles/...
```

They require `console:apps` and call the bounded Platform service client. They do not expose Core API URLs or internal credentials to the browser.

Tests cover:

- Console collection route authorization/list/create forwarding;
- default-promotion routing clear before the default mutation;
- default profile non-demotion/location-neutral UI behavior.

## Muse mutation extension

Added:

```text
.claude/briefs/muse/2026-08-31-application-provisioning-profile-mutations.md
```

It extends the Phase 2 routing campaign with mutation targets for:

- resolver semantics;
- persistence races;
- two-org isolation;
- migration/backfill;
- default compatibility;
- atomic default swapping;
- selected-manifest finance behavior;
- run audit;
- Phase 1 import/verify;
- SDK/Console boundaries.

## Required local migration/import order

Use the repository's normal database safety process. Do not hand-edit production tables.

Recommended sequence after pulling the branch:

```bash
pnpm --filter @876/api db:generate
pnpm --filter @876/api db:validate
pnpm --filter @876/api db:deploy
```

`db:deploy` applies the additive Phase 2 setup-selection migration and the application-profile migration in timestamp order when they have not already been applied.

Then verify/import the canonical provisioning bootstrap as appropriate for that database:

```bash
pnpm --filter @876/api provisioning:import -- --dry-run
pnpm --filter @876/api provisioning:import -- --apply
pnpm --filter @876/api provisioning:verify
```

For organizations that predate Phase 2 and still lack a persisted organization setup, inspect first:

```bash
pnpm --filter @876/api provisioning:backfill-selections -- --dry-run
```

Only after reviewing the output, persist that explicit workspace-setup backfill:

```bash
pnpm --filter @876/api provisioning:backfill-selections
```

The application-profile migration already backfills existing active app subscriptions to the sole migrated default profile. Do not write a second automatic profile reselection after the workspace setup backfill; that would violate the no-silent-reroute rule.

## Required local validation

Run focused checks first:

```bash
pnpm --filter @876/api typecheck
pnpm --filter @876/api lint
pnpm --filter @876/api boundaries
pnpm --filter @876/api test
pnpm --filter @876/platform test
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
```

Then run the repository-wide gates:

```bash
pnpm format:check
pnpm lint
pnpm check:structure
pnpm typecheck
pnpm boundaries
pnpm test
```

If the environment is configured for the full gate, finish with:

```bash
pnpm check
```

Also run:

```bash
pnpm --filter @876/api provisioning:verify
```

against the migrated/imported database.

## Focused tests added or materially expanded

Key suites include:

```text
apps/api/src/modules/provisioning/application-provisioning-profile.service.test.ts
apps/api/src/modules/provisioning/__tests__/application-provisioning-profile.routes.test.ts
apps/api/src/modules/provisioning/__tests__/provisioning-application-default-compat.test.ts
apps/api/src/modules/provisioning/__tests__/provisioning-import-verification.service.test.ts
apps/api/src/modules/provisioning/__tests__/provisioning-run-audit.test.ts
apps/api/src/services/__tests__/finance-provisioning.test.ts
packages/platform/src/resources/provisioning-application-profiles.test.ts
apps/console/src/app/api/apps/[appId]/provisioning/profiles/route.test.ts
apps/console/src/app/(app)/apps/[slug]/provisioning/_components/profile-settings-form.test.tsx
```

## Operational rules after merge

1. Do not manually edit an existing org/app selection to make new policy take effect.
2. Do not make generic application manifest calls point directly to a variant target; change the profile default through the profile API if generic callers should follow it.
3. Do not attach conditions to the default profile.
4. A profile must be published, conditionless, and non-archived before promoting it to default; new drafts cannot become default directly.
5. Treat run audit fields as historical snapshots.
6. Keep Manifest v1 as the protocol until a separately approved architecture decision introduces a successor.
7. Any future profile reselection/migration for existing tenants must be explicit, auditable, and independently reviewed.

## Remaining environment work

There is no intentionally deferred application-profile feature item in this handoff. Remaining work is execution/validation in a real checkout and database:

- generate Prisma client;
- apply migrations;
- run import/verify as appropriate;
- inspect Phase 2 setup-selection dry-run before applying it to legacy organizations;
- execute focused and repository-wide checks;
- fix any concrete compiler/lint/test failures those commands reveal before opening a PR.

No PR was opened from this branch.
