# Application provisioning profiles — mutation and adversarial test extension

## Purpose

This brief extends `2026-08-31-provisioning-phase-2-routing-exhaustive-tests.md` for the per-application provisioning profile layer introduced after Phase 2.

Treat application-profile routing as a second persisted decision engine beneath the organization provisioning setup. The campaign is successful only if it is difficult for a future mutation to change an existing organization's selected profile, use the wrong manifest, or make the generic application manifest compatibility surface drift away from the current default profile.

## Required surfaces

Inspect at minimum:

- `packages/core/src/types/application-provisioning-profile.ts`
- `packages/core/src/types/provisioning.ts`
- `apps/api/prisma/schema/application-provisioning-profile.prisma`
- `apps/api/prisma/schema/organization-application-provisioning.prisma`
- `apps/api/prisma/migrations/20260831020000_application_provisioning_profiles/migration.sql`
- `apps/api/src/modules/provisioning/application-provisioning-profile.*`
- `apps/api/src/modules/provisioning/provisioning.service.ts`
- `apps/api/src/modules/provisioning/provisioning-import.service.ts`
- `apps/api/src/modules/provisioning/provisioning-import-verification.service.ts`
- `apps/api/src/services/finance-provisioning.ts`
- `apps/api/src/services/finance-provisioning.repository.ts`
- `apps/api/src/services/finance-provisioning-readiness.ts`
- `packages/platform/src/resources/provisioning.ts`
- `apps/console/src/app/(app)/apps/[slug]/provisioning/**`
- `apps/console/src/app/api/apps/[appId]/provisioning/profiles/**`

## Invariants to kill mutations against

### 1. Two-layer routing is not interchangeable

Organization setup selection happens first and is persisted independently. Application-profile selection consumes that persisted setup plus optional app-specific context.

Mutations that must fail tests:

- application profile routing re-resolves the organization setup from geography;
- application routing ignores persisted `setup` and prefers IP/geo facts;
- application profile conditions overwrite the organization setup selection;
- profile routing proceeds when an organization that requires routing has no persisted setup.

### 2. Profile resolver semantics

For non-default active candidates:

```text
OR between group_key values
AND inside one group
specificity > priority > profile key > group key
```

Required mutation targets:

- AND changed to OR inside a group;
- a partially matching group is accepted;
- priority is evaluated before specificity;
- candidate input order becomes the final tie-break;
- profile key lexical ordering is removed;
- group lexical ordering is removed;
- lowercase/whitespace normalization is removed;
- `country`/`subdivision` stop canonicalizing to uppercase;
- `setup`/`plan` stop canonicalizing to lowercase;
- the default profile participates in conditional matching;
- zero or multiple defaults silently choose one instead of failing closed.

Keep exact tests for `setup`, `country`, `subdivision`, `jurisdiction`, and `plan`.

### 3. Group priority is a group invariant

The HTTP schema requires every condition in one AND group to have the same priority.

Mutations that must fail:

- mixed priorities are accepted;
- only the first row is validated;
- a reordered request changes whether the group is accepted;
- negative priorities outside the schema bounds are accepted.

### 4. Persist once, never silently re-route

`organization_application_provisioning` is unique on `(organization_id, app_id)`.

Mutations that must fail:

- resolver evaluates candidates before checking persisted selection;
- retry overwrites a persisted profile;
- default-profile changes rewrite existing organization selections;
- policy edits rewrite existing organization selections;
- selection uniqueness is accidentally changed to app-only or organization-only;
- concurrent selection races return the losing decision instead of the row that won persistence;
- a second organization using the same app reads the first organization's selection.

At least one test must resolve two organizations against the same app and prove two independent persisted profile IDs.

### 5. Migration/backfill semantics

The application-profile migration creates exactly one active `default` profile per registered app. Existing application manifest target keys remain intact; migrated defaults point at those existing targets. Existing active subscriptions are explicitly persisted to the migrated default with `selection_type='backfill'`.

Mutations that must fail review/tests:

- migration rewrites historical application manifest identities to new profile IDs;
- existing active subscriptions are left unselected and first runtime access silently routes them;
- backfill overwrites an existing organization/app selection;
- more than one default is created for an app;
- default profile is created inactive or with routing conditions.

### 6. Default-profile compatibility

Generic manifest-v1 operations under `application/<app>` are compatibility operations for the **current default profile**. They must resolve the current default's `manifestTargetKey` for every request.

Mutations that must fail:

- generic read/write/publish/notes hardcode `app.id` as storage key;
- changing the default leaves generic operations attached to the old default;
- generic catalog validation uses profile ID instead of app slug;
- variant profile operations accidentally use the generic default target;
- generic compatibility creates manifest-v2 data.

Exercise a default change and make a second generic read. The second read must use the new default target.

### 7. Atomic default promotion

Promoting a profile to default must preserve profile IDs and existing organization selections while moving the legacy manifest target ownership atomically.

Mutation targets:

- two profiles are default during or after the transaction;
- the old default retains the legacy app target;
- the promoted variant loses its manifest/history;
- the old default loses its manifest/history;
- existing persisted org selections are rewritten;
- a profile with routing conditions can become default;
- an archived profile can become default;
- the current default can be cleared without another profile becoming default.

### 8. Selected manifest drives provisioning

Finance/readiness and application provisioning must load the published revision by the persisted selected profile's `manifestTargetKey`, not by app ID or current default.

Mutations that must fail:

- readiness uses `app.id`;
- reconciliation uses current default instead of persisted profile;
- a missing persisted selection falls back silently;
- profile A's finance dependency/scopes are used for an org persisted to profile B;
- changing current default changes a retry's application revision.

Use two orgs on one app with profiles that have observably different finance dependencies or scopes.

### 9. Run audit must explain both decisions

Every relevant run snapshots workspace-setup provenance and application-profile provenance.

Pin these response fields:

- `provisioning_setup_key`
- `provisioning_selection_type`
- `provisioning_match_group_key`
- `provisioning_match_priority`
- `provisioning_matched_fields`
- `application_provisioning_profile_id`
- `application_provisioning_profile_key`
- `application_provisioning_selection_type`
- `application_provisioning_match_group_key`
- `application_provisioning_match_priority`
- `application_provisioning_matched_fields`

Mutations removing, renaming, nulling, or sourcing these fields from current policy rather than the run snapshot must fail.

### 10. Phase 1 import and verification

The one-time provisioning importer must ensure a default application profile before importing an application's generic manifest. Verification remains read-only.

Mutation targets:

- importer writes app manifest before ensuring the default profile;
- importer creates multiple defaults on rerun;
- verification creates/repairs missing profiles;
- verification ignores inactive/invalid defaults;
- verification ignores a mismatch between generic manifest target and default profile target;
- rerunning import replaces an operator-authored published profile manifest or non-empty draft.

### 11. Platform SDK and Console boundary

Platform operator methods live under `provisioning.applicationProfiles`. Console browser code uses same-origin `/api/apps/:appId/provisioning/profiles/...` routes.

Mutation targets:

- browser calls the Core API origin directly;
- Console leaks internal keys/service URLs;
- route loses `console:apps` authorization;
- route forwards malformed transport without backend validation;
- SDK forgets URL encoding of app/profile keys;
- SDK variant manifest calls fall back to generic manifest routes;
- Console default promotion updates `is_default` before clearing routing conditions.

## Minimum suites expected

- pure resolver suite;
- persisted selection/race/no-reroute suite;
- two-org/same-app suite;
- default compatibility suite;
- finance/readiness selected-manifest suite;
- provisioning-run audit serializer/schema suite;
- assembled Express route suite;
- Phase 1 import + verification suites;
- Platform SDK request-path suite;
- Console route-boundary suite;
- Console default-promotion component suite.

## Completion standard

Do not report this campaign complete merely because existing tests pass. Deliberately apply representative mutations from every numbered section and confirm the relevant test fails for the intended behavioral reason. Restore production code after each mutation. Record any surviving mutation as a missing test or missing invariant.
