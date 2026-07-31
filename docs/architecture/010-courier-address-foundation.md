# 010 — Courier address foundation

**Status:** accepted
**Date:** 2026-07-31

## Context

Every operational table in the courier app carried its own copy of postal
columns: `branches.street_1/street_2/city/parish/country`,
`warehouses.street_1/.../state/postal_code`, and
`customer_addresses.label/street_1/.../parish`. Each new location-bearing
resource meant another set of near-identical columns and another place for the
same address to drift.

The columns were also Jamaica-shaped. `parish` is meaningful in Jamaica and
meaningless in the US, where courier warehouses actually are, and the values
were free text with no relationship to the platform geo catalog that already
owns countries and their subdivisions.

## Decision

A first-class, tenant-owned `Address` entity in the courier datastore, which
operational entities reference.

### Address is an entity, not a column set or a JSON blob

`addresses` is a real table. Branches, warehouses and customer addresses point
at it. Adding a location-bearing resource later means adding one relation, not
five columns.

An address holds geography only. Phone, opening hours, recipient instructions,
gate codes and future branch capabilities belong to the entity or relationship
using the address, not to the address itself — those are properties of the
operation, and two operations can share one physical address.

### Branch and warehouse remain independent entities

A branch is not an address. It keeps its name, phone, default and active state,
settings, assigned customers, routed packages and staff; the address is one
property of it. The same holds for a warehouse and its receiving, consolidation
and manifest behaviour. This is what lets a later phase add typed branch
capabilities without touching the address model.

### Ownership is explicit relations, not polymorphism

No `ownerType`/`ownerId` pair. Each owner declares its own relation
(`Branch.addressId`, `Warehouse.addressId`, `CustomerAddress.addressId`), so the
foreign keys still hold and the database can enforce them. A polymorphic owner
would have traded that away for a generality nothing needed.

Every relation is on the composite `(id, tenant_id)` key, so an owner
structurally cannot reference another tenant's address.

### Roles live on the relationship

There is no `type` column on `Address`. One physical address can be a customer's
home and their billing address at once, and two customers can share an address
with different roles — a role is a fact about the relationship, not the place.
`CustomerAddress.type` carries it.

### Region is neutral, canonical, and snapshotted

`regionCode` plus `regionName`, never `parish`. The interface labels the control
using the catalog's own region type — Parish in Jamaica, State in the US,
Province in Canada.

Both are stored deliberately. `regionCode` is the stable machine value; the
platform geo catalog is the source of truth and the server resolves it on every
write, never trusting a client-supplied name. `regionName` is a display snapshot
so rendering an address does not require a platform round trip.

### Geography comes from the core catalog

Couriers ships no country or parish list of its own. `apps/api/data/geo/`
holds the versioned catalog, validated before seeding, and the app reads it
through the server-only platform client. The browser reaches it through thin
courier route handlers, which is what keeps the secret internal key server-side.

A catalog outage is reported as unavailable rather than silently accepted, so a
bad region can never be written just because the platform was unreachable.

## Migration

Expand → backfill → contract, in two migrations.

**Expand** (`20260730000000_expand_addresses`) creates `addresses`, adds nullable
`address_id` columns, and backfills one address per existing branch, warehouse
and customer address. Backfilled ids are the canonical `adr_` prefix applied to
the owning row's id, so the mapping is reproducible, re-running cannot create a
second address for the same owner, and the link-back is an exact id match rather
than a fuzzy match on name or street. Every legacy column is retained. The
migration raises rather than completing a partial or cross-tenant backfill.

**Contract** (`20260730000001_contract_addresses`) makes the relations required,
adds the partial unique indexes for defaults, and drops the legacy columns. It
asserts its preconditions first — every owner has an address in its own tenant,
and no scope already holds two defaults — and raises rather than dropping a
column whose data was not migrated.

### Deployment order

1. Deploy the core geo catalog and platform country client.
2. Apply the expand migration.
3. Deploy the address services and relation-aware application code.
4. Verify every operational row has an `address_id`.
5. Apply the contract migration.

Both migrations ship together here, so a deployment that runs migrations before
releasing satisfies this ordering; splitting them across two releases is only
required if the old application version must keep serving traffic against the
new schema.

### Legacy regions

Rows migrated from the free-text columns have a `regionName` with no
`regionCode` — the migration deliberately does not guess a code from a display
name. They read fine, `formatAddressLine` falls back to whichever it has, and
the settings UI badges them as needing review. Editing an address's geography
requires picking a canonical region.

## Invariants

| Invariant                                         | Enforced by                                          |
| ------------------------------------------------- | ---------------------------------------------------- |
| At most one default branch per tenant             | `branches_one_default_per_tenant_idx`                |
| A tenant with branches always has one             | service layer (clearing the default is refused)      |
| At most one primary warehouse per tenant          | `warehouses_one_primary_per_tenant_idx`              |
| At most one default address per customer and role | `customer_addresses_one_default_per_type_idx`        |
| An owner's address is in the owner's tenant       | composite `(id, tenant_id)` foreign keys             |
| A linked address cannot be deleted                | service layer, checked inside the delete transaction |

A branch's default flag may not be cleared directly — another branch must be
promoted — because packages route to the default and clearing it would leave
them nowhere to go. A warehouse's primary flag has no such rule and may be
cleared, since receiving does not depend on one.

## Deferred

Recorded so later work does not assume these were overlooked.

**Transactional snapshots.** Deliveries, shipping labels, customs documents and
completed shipments will need immutable address snapshots — a historical
shipment must not repoint when a customer edits their address. Not built; when
delivery work lands, those records must capture the address, not just reference
it.

**Tracking locations.** A tracking event may reference a branch, a warehouse, an
airport, a seaport, a carrier facility, a city, free text, or coordinates.
Creating a fake `Address` row per scan would be wrong. Out of scope.

**Branch capabilities.** Pickup, delivery, customs processing and consolidation
belong in a typed `BranchCapability` relation, not in untyped address metadata.
Branch staying an independent entity is what keeps that cheap to add.

**Generic facilities.** No `Facility` model until one physical location
routinely needs several independently managed operational profiles.

**Region reconciliation tooling.** A maintenance script to match legacy
`regionName` values against the catalog — exact and explicitly-aliased matches
only, dry-run by default, never fuzzy. The UI review badge covers the gap today.

## Consequences

- Postal data lives in exactly one table; a new location-bearing resource adds
  one relation.
- Country and region values are canonical and shared with the rest of the
  platform, so an address means the same thing in couriers as in billing.
- An address can be reused across owners, and deleting one is refused while
  anything references it.
- Reads cost one relation query; a list never issues a query per row.
- Courier depends on the platform geo catalog being reachable for address
  writes. That is deliberate: the alternative is writing geography the platform
  cannot recognise.
