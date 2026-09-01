# 021 — Application Provisioning Profiles

**Status:** Accepted / implemented on `feature/provisioning-app-profiles`  
**Date:** 2026-08-31

## Context

Provisioning setup selection answers an organization-wide question: which day-zero platform setup applies to this organization? That decision controls shared defaults such as finance workspace configuration, product entitlements, and service gates.

An application can still need more than one valid set of its own day-zero defaults. CRM, for example, may need one application manifest for a Jamaica organization and another for a United States organization, even though both organizations are subscribed to the same CRM app. Treating `application/<app>` as one permanent manifest singleton cannot express that without duplicating apps or mutating a manifest out from under existing tenants.

The platform therefore needs a second routing layer beneath the persisted organization setup while retaining the permanent Provisioning Manifest v1 protocol.

## Decision

Every registered App has application provisioning profiles. A profile owns routing conditions and one application Manifest v1 target. Each organization/app pair persists exactly one selected profile.

The hierarchy is:

```text
Organization
  -> persisted Provisioning Setup
  -> application entitlement
  -> persisted Application Provisioning Profile
  -> published application Manifest v1 revision
  -> provisioning run/materializer
```

Application profiles do not replace provisioning setups, product entitlements, app memberships, Work service gates, or Manifest v1.

## Data model

### `application_provisioning_profiles`

A profile belongs to one App and contains:

- stable profile ID;
- app ID;
- stable key within the app;
- operator-facing name and description;
- `draft | active | archived` status;
- `is_default`;
- an internal `manifest_target_key`;
- timestamps.

Invariants:

- `(app_id, key)` is unique;
- exactly one profile per app may have `is_default=true`;
- the default is active;
- the default has no routing conditions;
- a variant must already have a published manifest and must not be archived before it can become the default;
- new profiles begin as drafts and cannot be created directly as the default;
- `manifest_target_key` is unique platform-wide;
- a profile ID is stable even when default ownership changes.

### `application_provisioning_profile_conditions`

Routing fields are:

- `setup`
- `country`
- `subdivision`
- `jurisdiction`
- `plan`

`equals` is the only operator in this phase.

`setup` is the preferred jurisdictional discriminator because it references the already-persisted organization provisioning decision. Geography exists for applications that genuinely need finer routing than the platform setup. `plan` identifies the active application product/plan where one can be resolved.

### `organization_application_provisioning`

This table is the durable organization×app decision:

```text
UNIQUE (organization_id, app_id)
```

It stores:

- selected profile ID;
- `policy | default | backfill` selection type;
- matched group;
- match priority;
- matched fields;
- selected timestamp.

This row is routing history, not a cache.

## Selection semantics

The resolver first checks for an existing persisted organization/app selection. If one exists, it returns it without evaluating current profile policy.

Only a previously unselected organization/app pair is resolved.

For active, non-default profiles:

```text
conditions in one group_key = AND
different group_key values = OR
```

Matching groups are ranked by:

1. number of distinct matched fields, descending;
2. group priority, descending;
3. profile key, lexical ascending;
4. group key, lexical ascending.

This makes a more specific rule win before an operator priority tie-break and gives a stable final answer independent of candidate query order.

The profile policy schema requires all conditions in one AND group to use the same priority.

If no non-default group matches, the exactly-one active default profile wins.

If there is no usable default, more than one default, no active candidate set, or a required organization setup selection is absent, routing fails closed.

## Normalization

Routing context is normalized before comparison:

- `setup`: trim + lowercase;
- `country`: trim + uppercase;
- `subdivision`: trim + uppercase;
- `jurisdiction`: trim;
- `plan`: trim + lowercase.

The HTTP policy schema also validates country codes against the shared country catalog and subdivision values as ISO-style subdivision codes.

## Persist once / no silent reroute

The selected profile is persisted once.

Changes to any of the following do **not** silently re-route an existing organization/app pair:

- profile conditions;
- profile priorities;
- the current default profile;
- app plan changes unless a deliberate future migration/reselection workflow is introduced;
- geographic metadata changes.

A unique persistence race is handled by reading and returning the row that won the `(organization_id, app_id)` insert. The losing request does not overwrite it.

This rule is required for retries: a retry must use the profile already selected for that organization/app, not whatever would win under today's policy.

## Default profile and generic manifest compatibility

Manifest v1 is unchanged.

The historical generic application manifest APIs remain valid:

```text
application/<app>
```

Those calls now mean **the current default profile for that App**.

Every generic application manifest read, draft write, publish, and note operation resolves the current default profile's `manifestTargetKey` before touching manifest storage. Catalog validation continues to use the App slug because resource schemas belong to the App, not to the profile ID.

Variant-aware callers use explicit profile routes.

### Initial default

The migration creates one active `default` profile for every existing App. Its internal `manifest_target_key` is the existing App ID, so historical manifest rows are not rewritten merely to introduce profiles.

Phase 1 provisioning import also ensures the default profile exists before importing each application manifest.

Profile management endpoints lazily recognize/ensure the default for apps created after the migration, so an app cannot be managed as a profile-less singleton.

## Changing which profile is default

Promoting another profile is an atomic ownership swap.

Suppose:

```text
old default profile -> manifest target APP_ID
new profile         -> manifest target PROFILE_B_TARGET
```

After promotion:

```text
new default profile -> manifest target APP_ID
old default profile -> manifest target PROFILE_B_TARGET
```

The associated manifest rows move with those target identities inside the same database transaction. A temporary target is used while swapping to satisfy uniqueness constraints.

Consequences:

- generic `application/<app>` callers immediately see the new default;
- both profiles keep their manifest history;
- profile IDs do not change;
- `organization_application_provisioning` rows do not change;
- an organization already persisted to the old default remains on that old profile and therefore follows the old profile's moved manifest target.

The promoted profile must be location-neutral (no routing conditions), already have a published manifest, and must not be archived. New profiles cannot be created directly as default. Console clears a variant's routing policy before issuing the default mutation; the backend independently enforces every promotion invariant.

## Existing organizations

The application-profile migration introduces exactly one profile per existing app. Therefore existing active subscriptions have an unambiguous historical answer.

The migration explicitly inserts `organization_application_provisioning` rows for those active subscriptions with:

```text
selection_type = 'backfill'
profile = migrated default profile
```

It uses `ON CONFLICT (organization_id, app_id) DO NOTHING` so an existing explicit decision is never replaced.

This avoids routing an existing active tenant for the first time during an arbitrary retry or page load.

## New organization/app activation

Organization setup selection is resolved and persisted first.

When application subscriptions are provisioned, the platform resolves and persists one application profile for every resulting app entitlement before readiness/materialization work continues.

The source application explicitly requested during signup can be added to the setup-defined applications, but shared finance infrastructure still does not imply Billing or Invoice product entitlement.

## Finance and application readiness

Runtime provisioning resolves the application revision from the persisted selected profile's `manifestTargetKey`.

It must not use:

- raw app ID;
- current default profile when another profile was persisted;
- fresh routing policy during a retry.

The selected profile's manifest supplies the application's finance dependency, finance scopes, resources, and application steps.

Two organizations using the same app can therefore have different application manifests and finance behavior without duplicating the App or mutating each other's routing state.

## Provisioning run audit

`provisioning_runs` snapshots both routing layers.

Workspace setup audit:

- `provisioning_setup_key`
- `provisioning_selection_type`
- `provisioning_match_group_key`
- `provisioning_match_priority`
- `provisioning_matched_fields`

Application profile audit:

- `application_provisioning_profile_id`
- `application_provisioning_profile_key`
- `application_provisioning_selection_type`
- `application_provisioning_match_group_key`
- `application_provisioning_match_priority`
- `application_provisioning_matched_fields`

Run history must explain the decisions captured when the run was created. Operators should not have to reconstruct history from today's routing policies.

## Operator API

The Core operator plane exposes:

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

The router is mounted in the assembled Express application and uses the existing admin/integration authorization tier.

## Platform SDK

The bounded operator client exposes:

```text
platform.provisioning.applicationProfiles.list(...)
platform.provisioning.applicationProfiles.retrieve(...)
platform.provisioning.applicationProfiles.create(...)
platform.provisioning.applicationProfiles.update(...)
platform.provisioning.applicationProfiles.retrievePolicy(...)
platform.provisioning.applicationProfiles.replacePolicy(...)
platform.provisioning.applicationProfiles.retrieveManifest(...)
platform.provisioning.applicationProfiles.retrievePublished(...)
platform.provisioning.applicationProfiles.replaceDraft(...)
platform.provisioning.applicationProfiles.validate(...)
platform.provisioning.applicationProfiles.publish(...)
```

These methods belong in `@876/platform`; they are not added to compatibility shims.

## Console

Console manages profiles under an App:

```text
/apps/:slug/provisioning
/apps/:slug/provisioning/new
/apps/:slug/provisioning/:profileKey
```

The index lists profiles and their routing/default state. Creation can seed a new draft from another profile's published manifest. The detail page owns profile metadata, routing conditions, and the existing Manifest v1 editor scoped to that profile.

Browser mutations use same-origin routes under:

```text
/api/apps/:appId/provisioning/profiles/...
```

Those routes require `console:apps` and call `platform.provisioning.applicationProfiles`. Browser code never receives Core API origins or internal keys.

## Import and verification

The one-time provisioning importer:

1. ensures an application's default profile;
2. imports/preserves the generic application Manifest v1 through that default compatibility target.

Verification is read-only and reports:

- missing default app profile;
- invalid/non-default row returned as default;
- inactive default;
- unpublished/missing generic app manifest;
- mismatch between the generic app manifest target and the current default profile target.

`provisioning:verify` never repairs these states.

## Testing requirements

The implementation carries focused coverage for:

- pure OR-of-AND resolution;
- normalization;
- specificity, priority, and lexical tie-breaks;
- invalid/default fallback states;
- candidate ordering determinism;
- persistence-once behavior;
- concurrent insert race behavior;
- retry no-reroute behavior;
- two organizations on the same app selecting different profiles;
- selected profile manifest use in finance/readiness;
- generic app-manifest compatibility after a default change;
- assembled Express routes;
- Phase 1 import and verification;
- provisioning-run audit serialization/schema;
- Platform SDK request paths;
- Console permission/transport boundary;
- Console default-promotion ordering.

See `.claude/briefs/muse/2026-08-31-application-provisioning-profile-mutations.md` for the adversarial mutation campaign.

## Non-goals

This decision does not introduce:

- Provisioning Manifest v2;
- automatic re-selection of existing organizations;
- app-owned user/role/permission systems;
- a second finance data plane;
- an implicit Billing/Invoice entitlement;
- Work as a product App;
- browser access to Core internal APIs.

## Consequences

Applications can evolve jurisdictional, plan-specific, or other day-zero configuration without duplicating app registrations or mutating one global app manifest. The cost is an additional persisted routing layer and stricter operational invariants around default promotion and historical selection. That cost is intentional: routing history becomes explicit, retry-safe, and auditable.
