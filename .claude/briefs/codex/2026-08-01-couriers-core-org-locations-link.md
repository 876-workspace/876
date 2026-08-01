# Brief — Couriers sites become organization locations in the 876 core

## The decision this implements, and why

An organization's physical sites — head office, branches, pickup points,
warehouses — are **organization data, not courier data**. Today Couriers owns
them privately in its own `branches` and `warehouses` tables, which means the
organization profile in Enterprise and Console has no idea the org has six
pickup locations, and a future per-location billing or reporting feature would
have nowhere to read them from.

The 876 core already has the right home for this and it is **already built**:
`org_locations` in `apps/api` (`db/models/orgs.py`, the `OrgLocation` model),
with `type`, `status`, `is_primary`, a full address, soft-delete columns, and
session-tier + admin routes in `apps/api/domains/organizations/structure.py`.
The SDK and admin clients already expose `orgs.locations.*`
(`packages/sdk/src/resources/orgs.ts`, `packages/admin/src/resources/orgs.ts`).

So the layering, per `.claude/rules/platform-services.md` (three-bucket
placement) and the Layer-1/Layer-3 pattern in
`.claude/rules/customer-architecture.md`:

| Layer                             | Owns                                                                                                           | Where                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **Core `org_locations`**          | The canonical registry of _which sites this organization has_ — name, address, type, status.                   | `apps/api`, core Postgres |
| **Couriers `Branch`/`Warehouse`** | The _operational profile_ of a site — default pickup routing, assigned customers, staff, mailboxes, manifests. | Couriers' own datastore   |

Couriers keeps its tables. It does **not** move them, and it does **not** stop
using them — package routing, staff assignment and mailbox allocation are
courier concerns that have no business in the identity API. What changes is
that every Couriers site now **references a core organization location by
opaque id**, and Couriers mirrors the site's identity fields up to core so the
organization profile is complete and other apps can read it.

That is the whole foundation. Per-location billing, per-location pickup
reporting and cross-app location pickers are all downstream of it and are
**explicitly out of scope here** — do not build them, do not add hooks for
them.

## Non-negotiable constraints (read before writing anything)

- **Opaque IDs only, no cross-database foreign key.** `orgLocationId` is a
  plain nullable `String` column on the Couriers side. There is no FK, no join,
  and no assumption that the core row still exists.
- **The mirror must never block or fail the local write.** A branch is created
  in Couriers' database first and committed. Only then is core told about it.
  If the platform call fails — and it does; there are already
  `Platform outage: …` issues in Sentry for this app — the branch still exists,
  the user still sees success, and the failure is reported and reconciled
  later. Inverting this would mean a platform blip prevents an organization
  from adding a branch, which is strictly worse than a temporarily
  out-of-date organization profile.
- **Couriers must never set `is_primary` on a core location.** Core's
  `is_primary` clears any previous primary org-wide. A courier branch and a
  courier warehouse would fight over it, and neither has the standing to decide
  what an organization's primary site is — that belongs to the org profile in
  Enterprise/Console. Carry the courier-local meaning in `metadata` instead.
- Nothing outside `src/lib/service/` may import `prisma`
  (`.claude/rules/sdk-conventions.md`).
- No server actions (`.claude/rules/api-access.md`).

## Scope — files you may touch

**In `packages/core/src/platform/`:**

- `resources/orgs.ts` — add a `locations` namespace
- `resources/geo.ts` — only if a lookup helper genuinely belongs there
- `index.test.ts` / a new resource test

**In `apps/api/`:** read-only unless you find a real gap (see Work item 1).

**In `apps/couriers/`:**

- `prisma/schema/branch.prisma`, `prisma/schema/warehouse.prisma`
- NEW `prisma/migrations/<timestamp>_link_org_locations/migration.sql`
- NEW `src/lib/service/org-locations/` (`sync.ts`, `reconcile.ts`, `index.ts`,
  plus tests)
- `src/lib/service/index.ts`
- `src/lib/service/branches/create.ts`, `branches/update.ts`
- `src/lib/service/warehouses/create.ts`, `warehouses/update.ts`
- `src/lib/geo/resolve-region.ts`
- `src/types/branch.ts`, `src/types/warehouse.ts`
- `src/app/org/[orgSlug]/settings/locations/**` — **only** the one `after()`
  call described in Work item 6
- tests for all of the above

**Do not** touch `src/lib/service/transaction.ts`, `src/lib/service/report.ts`,
`src/lib/errors/**`, or any file under `src/app/` other than the single
locations page — concurrent tasks own those. Both of those modules **will
already exist** when you run; use them (see Work item 4). Do not commit.

## Work item 1 — verify the core accepts what we intend to send

Before writing client code, read `apps/api/domains/organizations/structure.py`
and `apps/api/domains/organizations/schemas.py` and confirm:

- `POST /organizations/{org_id}/locations` and
  `PATCH /organizations/{org_id}/locations/{location_id}` accept the fields in
  `OrgLocationCreate` / `OrgLocationUpdate` — notably `type`, `status`, `code`,
  `region_id`, `country_code`, `metadata`.
- Whether `type` is validated against a fixed set. If it is, and `'branch'` /
  `'warehouse'` are not members, add them **there** with a matching test in
  `apps/api/tests/` — do not work around it by sending `'office'`.
- Whether `code` is unique per organization (the model has
  `UniqueConstraint("organization_id", "code")` — it is). We rely on that; see
  Work item 3.
- That the internal-key admin tier bypasses the session/membership guard, since
  Couriers calls these through its server-only platform client.

Report anything you find that contradicts this brief rather than silently
adapting.

## Work item 2 — platform client: `orgs.locations.*`

In `packages/core/src/platform/resources/orgs.ts`, add a `locations` namespace
alongside the existing `invites` and `subscriptions` namespaces. Match their
style exactly — same request helper, same JSDoc voice, same `@see METHOD /path`
lines.

Verbs, named per `.claude/rules/sdk-conventions.md` (`create`, `retrieve`,
`update`, `list` — never `get`/`find`/`findBy*`):

- `create(orgId, params)` → `POST /organizations/{orgId}/locations`
- `list(orgId)` → `GET /organizations/{orgId}/locations`
- `retrieve(orgId, locationId)` → `GET /organizations/{orgId}/locations/{id}`
- `update(orgId, locationId, params)` → `PATCH …/{id}`

Types go in `packages/core/src/platform/types.ts` next to the existing platform
types — an `OrgLocation` shape and the create/update param shapes, derived from
the FastAPI `OrgLocationResponse`. `encodeURIComponent` every path segment, as
the existing methods do.

## Work item 3 — the Couriers-side link

Add to **both** `Branch` and `Warehouse` in the Prisma schema:

```prisma
  /// The core 876 organization location this site is mirrored to. Opaque id,
  /// no cross-database foreign key. Null when the mirror has not yet
  /// succeeded — the site is fully usable either way.
  orgLocationId String? @unique @map("org_location_id")
```

Write the migration SQL by hand under
`prisma/migrations/<UTC timestamp>_link_org_locations/migration.sql`, matching
the style and timestamp format of the existing migrations in that directory
(look at `20260730000000_expand_addresses`). It must be additive only:
`ALTER TABLE … ADD COLUMN … NULL` plus a unique index. No backfill, no
`NOT NULL`, no default. Migrations run in GitHub Actions, never in the Worker
(`CLAUDE.md` → Cloudflare Deployment) — so the migration must be safe to apply
while the old code is still serving traffic, which additive-nullable is.

Regenerate the Prisma client and export the new field through
`src/lib/db/index.ts` if that file's type re-exports require it.

Add `orgLocationId: z.string().nullable()` to `branchViewSchema` and
`warehouseViewSchema` in `src/types/`. It is **not** a create or update
parameter — a client must never be able to set it; only the sync writes it.
Say so in a comment, matching the existing
`/** `tenantId`and`addressId` are never client-controlled. */` note.

**Set `code` to the Couriers-local site id** (`brn_…` / `whs_…`) on every core
location Couriers creates. Because core enforces `(organization_id, code)`
uniqueness, that makes the mirror idempotent and — critically — recoverable: if
`orgLocationId` is ever lost, the link can be rebuilt by matching on `code`
alone. Without it, a failed mirror followed by a retry silently creates
duplicate locations on the organization profile.

## Work item 4 — the sync service

New `src/lib/service/org-locations/sync.ts`, exposed as
`service.orgLocations.sync(...)` from `src/lib/service/index.ts`.

```ts
export async function sync(
  orgId: string,
  site: {
    kind: 'branch' | 'warehouse'
    id: string
    orgLocationId: string | null
    name: string
    phone?: string | null
    isActive: boolean
    isDefaultForKind: boolean
    address: AddressView
  }
): Promise<void>
```

Behaviour:

1. Build the core payload:
   - `name` — the site name
   - `code` — the Couriers site id (Work item 3)
   - `type` — `'branch'` or `'warehouse'`
   - `status` — `'active'` when `isActive`, otherwise `'inactive'` (confirm the
     values core accepts in Work item 1)
   - `line1`, `line2`, `city`, `postal_code`, `country_code` from the address
   - `region_id` — resolved from the address's `regionCode`; see below
   - `phone`
   - `metadata` — `{ source_app: '876-couriers', source_id: site.id, is_default: site.isDefaultForKind }`
   - **never** `is_primary`
2. If `orgLocationId` is set → `update`. Otherwise → `create`, then persist the
   returned id onto the Couriers row (`branch` or `warehouse`, by `id`).
3. On a `create` that fails because the `code` already exists in core (the
   `(organization_id, code)` unique violation — check what the API returns for
   this and match on it), fall back to `list` + find-by-`code` and adopt that
   id. This is the race/retry path and it is why `code` exists.
4. **Never throw.** Every failure path calls `reportServiceFailure` from
   `src/lib/service/report.ts` (it exists — a concurrent task adds it) with an
   `operation` of `orgLocations.sync` and a `consequence` naming what the user
   actually loses: _"The branch exists in Couriers but is missing from the
   organization's locations in the 876 profile until the next reconcile."_
   The function returns `void` and swallows everything.

**Region mapping.** Core stores `region_id` (a `regions.id` FK); Couriers
stores `regionCode`. `src/lib/geo/resolve-region.ts` already has
`resolveRegionById` (id → code). Add its inverse, `resolveRegionIdByCode(
countryCode, regionCode)`, next to it, reusing the same `cache()`-wrapped
`listRegions` so a page syncing several sites issues one catalog call, not one
per site. Return `null` when it cannot be resolved and send no `region_id` —
the rest of the address is still worth mirroring, and inventing a region id
would corrupt core data.

## Work item 5 — call the sync from create and update

In `branches/create.ts`, `branches/update.ts`, `warehouses/create.ts`,
`warehouses/update.ts`, **after** the transaction has committed and `ok(...)`
is about to be returned:

```ts
await service.orgLocations.sync(orgId, { ... })
```

The service functions currently take `(tenantId, params)`. They need the core
`orgId` too. Thread it as an explicit parameter from the route handler, which
already has it on `ctx.orgId` (`src/lib/auth/manage-context.ts`) — do **not**
look it up from the tenant row inside the service, which would add a database
read to every write. Update the route handlers under
`src/app/api/manage/branches/` and `src/app/api/manage/warehouses/`
accordingly, and update every existing caller and test.

Because `sync` never throws, no `try` is needed around it and the create's
result is unaffected. Add a one-line comment saying exactly that, so a future
reader does not "helpfully" wrap it in error handling that changes the
contract.

## Work item 6 — reconcile the stragglers

New `src/lib/service/org-locations/reconcile.ts`:

```ts
export async function reconcile(tenantId: string, orgId: string): Promise<void>
```

It selects branches and warehouses for the tenant where `orgLocationId is null`,
**capped at 25 rows**, and calls `sync` for each **sequentially** (not
`Promise.all` — a burst of platform calls from a Worker is how you turn a
degraded API into a down one). It never throws.

Call it from the Locations settings page (`settings/locations/page.tsx`, which
a concurrent task creates) using `after()` from `next/server`, so it runs
**after the response is sent** and never delays the render — see
`.claude/rules/performance-server-side.md` §3.10. One call, guarded by
`ctx.orgId && ctx.tenant`.

This is the whole repair story: a mirror that failed during an outage is fixed
the next time an admin opens the locations page. That is sufficient because the
data is not latency-sensitive; do not build a queue, a cron, or an outbox.

## Work item 7 — tests

`.claude/rules/testing.md` is in force and this is shared/organization data, so
the bar is high. Read `src/lib/service/branches/ensure-default.test.ts` and
`packages/core/src/platform/index.test.ts` first and match their style.

`org-locations/sync.test.ts` — with the platform client and `prisma` mocked:

- creates a core location when `orgLocationId` is null, asserting the **exact**
  payload object passed to `locations.create`, including `code`, `type`,
  `status`, `metadata`
- **asserts `is_primary` is absent from the payload** — this is the constraint
  most likely to regress and it must have a dedicated test
- persists the returned location id onto the correct Couriers row, asserting
  the exact `where` and `data`
- updates instead of creating when `orgLocationId` is set, and does not write
  the id again
- maps `isActive: false` to the inactive status
- omits `region_id` when the region cannot be resolved, and still sends the
  rest of the address
- resolves `region_id` correctly when the code is in the catalog
- adopts the existing location id on a duplicate-`code` conflict, via list +
  find-by-code, and persists it
- does not throw, and calls `reportServiceFailure` exactly once, when
  `locations.create` rejects
- does not throw when the platform client itself fails to construct
- does not throw when persisting the id fails

`org-locations/reconcile.test.ts`:

- syncs only rows with a null `orgLocationId` — assert the exact `where`
- caps at 25 rows
- calls `sync` sequentially, not concurrently (assert ordering, e.g. by
  resolving mocks in a recorded order)
- continues past a failing row and still syncs the rest
- does not throw when the query itself fails

`resolve-region.test.ts` — extend the existing tests (or add them) for
`resolveRegionIdByCode`: resolves a known code; returns null for an unknown
code; returns null when the catalog call errors; issues **one** catalog request
for repeated lookups in the same request (the `cache()` behaviour).

Platform client tests: assert the exact method, path (including
`encodeURIComponent` of an id containing a slash or space), and body for each
new verb.

Extend the existing `branches/create` and `warehouses/create` tests to assert
that `sync` is called once with the committed site's real id, and that a
throwing `sync` — which cannot happen by contract, but assert the guarantee
anyway — does not change the returned result.

If Work item 1 required an `apps/api` change, add the matching test under
`apps/api/tests/` and run the Python checks too.

## Verification (run these; all must pass, and report the real output)

```
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers test
pnpm --filter @876/couriers lint
pnpm --filter @876/core typecheck
pnpm --filter @876/core test
```

If `apps/api` changed, additionally:

```
pnpm --filter @876/api typecheck
pnpm --filter @876/api test
pnpm --filter @876/api lint
```

Do not run `prisma migrate deploy` or touch any live database.

## Constraints

- Do not build per-location billing, pickup selection, or any cross-app
  location picker. Foundation only.
- Do not move `Branch` or `Warehouse` into core.
- Do not add a cross-database foreign key.
- Do not set `is_primary` from Couriers.
- Do not let the mirror block, delay, or fail a local write.
- Do not run git commands. Do not commit.
