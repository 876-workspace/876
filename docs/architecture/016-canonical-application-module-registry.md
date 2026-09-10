# ADR-016: Canonical application module identity with separate projections

## Status

Accepted

## Context

876 had grown three independent declarations of substantially the same product
module identity:

1. Core commercial `application_modules`, seeded for plan entitlements;
2. product settings catalogs, used for organization module state/preferences;
3. permission catalogs, used for user and finance-role access.

The planes answer different questions, but each repeated keys, labels and
descriptions. That allowed one plane to advance without the others. In
particular, 876 Invoice had a complete finance settings catalog and app-access
permission catalog while Core had no Invoice `application_modules`. Console plan
creation reads the Core module list, so a new Invoice plan could have nothing to
select even though Invoice itself knew about invoices, quotes, payments and
other functional areas.

The duplication also made a naive cleanup dangerous. Billing already uses
aggregate commercial modules such as `sales` and `documents` as feature
entitlement gates. `billing-sales` is the master rollout/entitlement gate for
sales children including quotes and invoices, while `billing-documents` gates
the existing documents feature. Those aggregates are not semantic aliases for
one granular module key.

## Decision

### One owner for stable module identity

`@876/core/modules` owns first-party application module identity when a module is
shared across more than one architectural plane.

A canonical module definition contains only stable identity metadata:

```ts
type AppModuleDefinition = {
  key: string
  label: string
  description: string
}
```

App registries declare which definitions belong to a product application. Module
keys are durable 876-owned kebab-case contracts.

The registry deliberately does **not** own routes, React components, prices,
plan composition, organization state, preferences, permission actions,
provisioning records or feature-flag state. Those concerns remain at their
existing owners and reference canonical module identity where their semantics
match.

### Finance registry

The initial shared Finance identity is:

- `invoices`
- `quotes`
- `payments`
- `expenses`
- `items`
- `sales-receipts`
- `time-tracking`
- `customers`

876 Billing additionally declares:

- `subscriptions`
- `banking`
- `purchases`
- `payroll`

Invoice reuses the same shared definition objects Billing consumes; it does not
copy their labels/descriptions into another catalog.

Settings-only identities (`crm`, `credit-notes`, `price-lists`, and `discounts`)
remain declared in `packages/billing/src/settings-catalog.ts`. They do not need
a cross-plane registry entry until another architectural plane consumes them.

### Settings remain a projection

`@876/settings` continues to own shared settings types, validation and
resolution only. `packages/billing` combines canonical identity with
settings-specific properties such as:

- `optional`;
- `enabledByDefault`;
- preference definitions.

Organization module state and preference overrides remain tenant-scoped in the
owning product datastore. Core commercial entitlement does not replace or own
that operational state.

### Permissions remain separate contracts

Permission catalogs reuse canonical key/label metadata only when the permission
module has the same semantics as the product module.

For example, `customers`, `payments`, `subscriptions`, `purchases` and `banking`
can reuse canonical Finance identity. Permission-only or aggregate concepts such
as `dashboard`, `settings`, `catalog`, `sales`, `members`, `roles` and Work
resources remain explicit.

Existing persisted permission identifiers are unchanged. In particular, the
finance role plane continues to use durable colon-delimited keys such as
`customers:read`, `sales:write` and the historical `payment_methods:*` contract.
This ADR does not rename permission data.

### Commercial rows are a materialized projection

Core `application_modules` remains the runtime/persisted representation used by
commercial plan entitlements. The plan seed materializes only the subset of a
canonical app registry whose keys already have real commercial semantics.

For registry-backed rows:

- code owns `key`, `name` and `description` identity;
- the seed creates missing rows;
- the seed repairs stale `name`/`description` values;
- the seed does not rewrite operator-owned position, lifecycle state, rollout
  feature association or plan composition on existing rows.

`plan_modules` remains Console/operator-controlled plan composition. A default
plan grant is added only when the module relationship is first bootstrapped;
later seed runs must not restore a grant an operator intentionally removed.
Creation uses one nested database write for the new module and its initial
grants. A failed grant therefore cannot leave behind a module that a retry
mistakes for an operator-edited record.

Canonical identity does not by itself make a module commercially selectable.
A module belongs in the commercial projection only when a plan grant to that
exact key has an effective entitlement meaning at runtime.

### Invoice commercial materialization

876 Invoice materializes these commercial modules:

- `invoices`
- `quotes`
- `payments`
- `expenses`
- `items`
- `sales-receipts`
- `time-tracking`
- `customers`

The initial `876-invoice-free` plan grants:

- `invoices`
- `quotes`
- `payments`
- `items`
- `customers`

The other active Invoice modules remain available for Console to compose into
other plans.

The full seed creates default app products/prices before first-time module grants.
This ordering is required because module seeding deliberately refuses to
re-grant removed plan entitlements on later runs.

### Billing commercial materialization remains intentionally coarse

Billing's canonical registry is broader than its current commercial projection.
Registry adoption must not make a plan option selectable merely because settings
or permissions use the same word.

During this adoption, only canonical Billing keys that exactly match existing
commercial gates are materialized from the new registry:

- `subscriptions`
- `purchases`
- `banking`
- `payroll`

The existing aggregate commercial modules remain alongside them:

- `sales` → `billing-sales`;
- `documents` → `billing-documents`.

Granular Billing identities such as `invoices`, `quotes`, `payments`,
`customers`, `items`, `credit-notes`, `price-lists`, `discounts`, and the other
shared Finance settings modules are **not** materialized as Billing plan options
yet. Doing so would create inert or misleading entitlements: Console could sell
a key that Billing's runtime still authorizes through a different aggregate
feature/module gate.

### Billing legacy aggregate modules remain transitional

Do not rename or delete Billing `sales` or `documents` as part of registry
adoption.

They remain explicit transitional commercial modules because:

- `sales` links to `billing-sales`, the master gate used before child
  `billing-sales-quotes` and `billing-sales-invoices` checks;
- `documents` links to `billing-documents`, which Billing evaluates directly;
- Core feature evaluation derives module entitlement through linked
  `application_modules` and live plan/subscription grants.

Removing either row before a coordinated feature/entitlement migration could
turn a globally enabled feature dark or broaden access incorrectly.

A future migration must be additive first: define the effective granular
entitlement semantics, create target module grants, prove equivalent access for
every affected plan/subscription, move or redesign the feature-gate relationship,
and archive the legacy aggregate only after every environment is verified.

### Console ownership

For first-party apps with a canonical registry, Console treats key/name/
description as registry-managed identity:

- manual `Add module` is hidden;
- key/name/description are read-only;
- rollout feature association and display position remain operator-managed;
- plan composition remains operator-managed.

The current Core modules service has not yet migrated its expected failures from
throws to the platform `{ data, error }` value contract. This change therefore
does not add a new half-migrated API error solely to reject direct operator API
attempts to create registry-owned identity. Seed synchronization repairs canonical
identity, and the normal Console path prevents drift. Hard API mutation
enforcement should land with the whole modules-service error-contract migration,
not as a one-off incompatible throw.

## Consequences

- Invoice plan creation and the Invoice product/settings/access surfaces derive
  from the same stable module vocabulary.
- Shared labels/descriptions have one code owner.
- Plans, settings, permissions and rollout flags stay independent systems with
  independent lifecycles.
- Existing commercial and permission data do not require a schema migration for
  this adoption.
- New first-party apps should declare reusable module identity once before
  projecting it into settings/access/commercial planes.
- Not every permission group or navigation group is a module; semantic equality
  is required before identity is reused.
- Not every canonical settings module is commercially sellable.
- A commercial projection is intentionally allowed to be narrower than its app
  registry while runtime entitlement semantics catch up.
- Legacy aggregate Billing gates remain visible technical debt with a defined
  migration condition rather than hidden compatibility aliases.

## Rejected alternatives

### One giant product manifest

Rejected. Putting routes, UI, prices, preferences, permissions, flags and module
state into one object would remove textual duplication by creating a god-manifest
with multiple unrelated lifecycles and owners.

### Keep three independent catalogs and test them for drift

Rejected. Drift tests can detect disagreement but still require humans to repeat
identity changes correctly in several places. Stable identity should be shared by
construction.

### Make `@876/settings` the canonical owner

Rejected. Settings is a shared mechanism package and organization module state is
product-owned. Core commercial materialization and access packages must not
depend on a product-settings declaration to learn what a first-party module is.

### Materialize every Billing registry key immediately

Rejected. Billing's runtime still gates several capabilities through aggregate
commercial modules and feature masters. A selectable plan grant with no matching
runtime entitlement effect is worse than leaving that module out of the
commercial projection until enforcement exists.

### Rename Billing `sales` directly to `invoices`

Rejected. `sales` is an aggregate entitlement/feature concept. A one-to-one key
rename would silently discard its quotes/invoices grouping semantics and would
not migrate feature entitlement safely.
