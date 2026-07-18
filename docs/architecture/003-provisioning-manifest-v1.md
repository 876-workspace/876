# ADR-003: Standardize provisioning on manifest v1

## Status

Accepted

## Context

Provisioning was stored per registered app and used one integer both as the
wire-contract version and as the content revision. Billing had reached version
3 while other apps used different numbers. Shared finance defaults were shown
under Billing even though the data belongs to the organization-wide finance
plane. Console edited raw rows and had to guess their shapes.

This made ordinary default changes look like protocol upgrades, fixed the UI to
an app-centric hierarchy, and provided no safe draft/publish boundary.

## Decision

- Adopt one permanent protocol, `manifest_version = 1`, with no compatibility
  parsing for earlier manifest numbers.
- Model stable manifests and immutable content revisions separately.
- Support `organization`, `finance`, and `application` targets so shared data is
  not attributed to a product subscription.
- Store typed values relationally and define resource/property schemas in code.
  Console consumes the catalog; it does not infer executable forms from the
  database.
- Allow one mutable draft and one current published revision. Publishing
  archives the prior revision atomically.
- Keep changes prospective and preserve tenant overrides. Existing tenant
  reconciliation is an explicit create-missing operation.
- Move Billing's existing day-zero defaults to `finance/shared`; application
  manifests retain app-specific defaults and embedded-finance scopes.
- Hard-delete the old `app_provisioning_*` schema and endpoints after migrating
  active values.

## Consequences

- Every API response can state protocol version 1 while content revisions grow
  independently.
- Console can render accordions and add/edit forms from a stable, code-reviewed
  catalog while row counts remain dynamic.
- Shared finance configuration has one control-plane home even when several apps
  consume or update the same underlying Billing data plane.
- Publishing is auditable and recoverable; draft mistakes do not affect new
  organizations.
- Adding a new provisionable resource requires a catalog definition and an app
  data-plane reconciler. Database introspection alone cannot make it executable.

## Rejected alternatives

### Continue incrementing the manifest version

Rejected because a payment-mode edit is content history, not a new protocol.

### Generate forms from database tables

Rejected because storage schemas include internal fields and cannot express the
ownership, validation, references, or tenant-safety policy required by a public
control-plane form.

### Keep shared finance defaults under Billing's app page

Rejected because embedded consumers use the same organization finance workspace
without necessarily subscribing to Billing's UI product.
