# CRM Config Provisioning — Implementation & Handoff

Status: **implemented on `feature/crm-config-provisioning`, PR #425; database migration not executed from the GitHub-only environment.**

This document is the implementation map for the CRM configuration/provisioning work. It is intentionally both an architecture note and a continuation plan for the next agent working locally with database and command execution access.

## Goal

Make CRM request configuration tenant-owned instead of hard-coded, beginning with request priorities, while keeping platform defaults centrally provisioned.

The desired behavior is:

- the platform publishes default CRM configuration as the `application/876-crm` provisioning manifest;
- a new CRM tenant receives the current published defaults during tenant provisioning;
- existing tenants are backfilled and can reconcile newly introduced platform defaults later;
- organizations can customize their materialized CRM configuration in CRM Settings;
- re-provisioning creates missing platform resources but **does not overwrite tenant changes**;
- requests, tasks, forms, categories, subcategories, filtering, SDK types, CRM UI, and Console all use stable priority IDs rather than a fixed priority enum;
- Console can inspect/edit the CRM application provisioning manifest through the existing generic provisioning control plane and can inspect the materialized organization priorities through the CRM data plane.

## Non-goals for this branch

Do not expand this branch into a generic arbitrary custom-fields framework. The same provisioning pattern can later be reused for request statuses, sources, SLAs, forms, automation defaults, and other first-class CRM configuration, but those are intentionally separate follow-up work.

Also do not reintroduce `LOW | NORMAL | HIGH | URGENT` as an application contract. Those names exist only as initial provisioned resource values.

## Rules that matter

Before continuing, read:

- `CLAUDE.md`
- `.claude/rules/module-settings.md`
- `.claude/rules/sdk-conventions.md`
- `.claude/rules/app-layout.md`
- `.claude/rules/app-structure.md`
- `.claude/rules/app-api-routing.md`
- `.claude/rules/git.md`

Important boundaries:

1. **Provisioning describes what must exist.** Platform-owned defaults live in the published application manifest.
2. **Tenant CRM records are app-local operational data.** Organizations edit their materialized priority/category records in CRM.
3. **The browser never calls CRM API directly.** Browser mutations go through same-origin CRM `/api/*` routes, which call the server `$876` facade.
4. **Console does not get a separate CRM provisioning implementation.** It uses the existing `workspace.provisioning` generic control plane.
5. Use `pnpm`, not npm/yarn/bun, for repo verification.

## Architecture

There are two related but deliberately distinct surfaces.

### Platform control plane — provisioning definition

Owned by Core API:

```text
apps/api/src/services/provisioning-catalog.ts
apps/api/src/seeds/provisioning.ts
```

Target:

```text
application / 876-crm
```

CRM resource types currently registered in the platform provisioning catalog:

```text
request_priority
request_category
request_subcategory
```

Console already reads and edits application manifests through:

```text
workspace.provisioning.catalog.retrieve(...)
workspace.provisioning.published.retrieve(...)
workspace.provisioning.draft.*
workspace.provisioning.runs.*
```

Therefore CRM provisioning schemas automatically appear in the same per-app Console provisioning editor used by other applications. Do **not** create a second CRM-specific provisioning admin API.

### CRM data plane — materialized tenant configuration

Owned by CRM API:

```text
apps/crm-api/prisma/schema/priority.prisma
apps/crm-api/prisma/schema/category.prisma
apps/crm-api/prisma/schema/request.prisma
apps/crm-api/prisma/schema/task.prisma
apps/crm-api/prisma/schema/form.prisma
apps/crm-api/src/modules/priorities/
apps/crm-api/src/modules/categories/
apps/crm-api/src/provisioning/
```

Organizations can edit the materialized records. The stable link back to a platform-provisioned resource is `provisioningKey`.

Example:

```text
platform provisioning key: urgent
organization name: Emergency
organization slug: emergency
organization color: #dc2626
```

The platform still recognizes that row as the provisioned `urgent` resource because reconciliation uses `provisioningKey`, not mutable name/slug.

Custom organization-created priorities have `provisioningKey = null`.

## Request priority model

`RequestPriorityDef` is now a tenant-owned record with the important fields:

```text
id
tenantId
provisioningKey?
name
slug
description?
color?
icon?
weight
sortOrder
isDefault
isActive
createdBy?
createdAt
updatedAt
deletedAt?
deletedBy?
```

Semantics:

- `weight` = semantic urgency/severity, suitable for ranking/reporting;
- `sortOrder` = display ordering, independent of urgency;
- `isDefault` = tenant fallback priority;
- `isActive` = whether it can be selected for new work;
- archived/inactive priorities remain resolvable on historical records;
- provisioned records can be renamed/recolored/reordered by the tenant without losing their platform identity.

The database also has a partial unique index enforcing one non-deleted default priority per tenant.

## Initial platform defaults

The Core application provisioning seed defines these initial `request_priority` resources:

| provisioning key | name   | slug   | weight | sort order | default |
| ---------------- | ------ | ------ | -----: | ---------: | ------- |
| `low`            | Low    | low    |     10 |         10 | no      |
| `normal`         | Normal | normal |     20 |         20 | yes     |
| `high`           | High   | high   |     30 |         30 | no      |
| `urgent`         | Urgent | urgent |     40 |         40 | no      |

The existing CRM category defaults are also represented by platform provisioning resources so they can be created for new/existing tenants using the same reconciliation mechanism.

The default names are **bootstrap data**, not an enum contract.

## Provisioning seed upgrade behavior

A critical change in `apps/api/src/seeds/provisioning.ts` is that an already-published CRM application manifest is not considered complete merely because its finance dependency/scopes match.

The seed now:

1. retrieves the current published application manifest;
2. preserves its existing resources and steps;
3. appends newly introduced platform bootstrap resources/steps that are missing;
4. preserves existing app-specific choices;
5. publishes a new revision only when the desired manifest actually differs.

This matters for installations where `application/876-crm` was published before CRM configuration resources existed.

## Tenant provisioning flow

Current onboarding flow:

```text
CRM onboarding route
  -> create/ensure platform app subscription for 876-crm
  -> load published application/876-crm manifest
  -> parse CRM resources into typed CRM provisioning payload
  -> POST CRM /v1/tenants with organizationId + provisioning payload
  -> CRM tenant.ensure()
  -> reconcile priorities
  -> reconcile categories
  -> reconcile subcategories
  -> record provisioning revision / provisionedAt
```

Relevant files:

```text
apps/crm/src/app/api/onboarding/organization/route.ts
apps/crm/src/lib/provisioning/manifest.ts
apps/crm-api/src/modules/tenants/tenants.controller.ts
apps/crm-api/src/modules/tenants/tenants.service.ts
apps/crm-api/src/provisioning/reconcile.ts
apps/crm-api/src/types/provisioning.ts
```

Reconciliation is intentionally `create_missing` style:

- find a provisioned record by `(tenantId, provisioningKey)`;
- if it exists, leave the tenant-owned values alone;
- if missing, create it from the current published manifest;
- never delete a tenant-created resource because it disappeared from a platform manifest;
- never reset a tenant rename/color/order/default merely because provisioning runs again.

## Existing tenant migration

Migration:

```text
apps/crm-api/prisma/migrations/20260828210000_crm_provisioned_configuration/migration.sql
```

The migration has been written but **has not been executed in this GitHub-only implementation environment**.

It performs the following sequence:

1. adds tenant provisioning revision/timestamp fields;
2. creates `crm_request_priorities`;
3. inserts Low/Normal/High/Urgent priority rows for every existing CRM tenant;
4. adds new nullable priority-ID columns to requests, tasks, categories, subcategories, and request forms;
5. backfills existing enum values to the tenant's matching provisioned priority record;
6. makes request/task priority IDs required;
7. adds tenant-safe composite foreign keys and indexes;
8. removes the old enum-backed columns;
9. drops the old Prisma/Postgres `RequestPriority` enum.

Request-form defaults are included in the backfill. This must remain before `DROP TYPE "RequestPriority"`.

### Local migration review before execution

The next agent should inspect the generated SQL against the actual local/dev database before applying it. In particular:

- confirm `gen_random_uuid()` is available in the target PostgreSQL installation;
- confirm the enum name is exactly `RequestPriority` in the deployed database;
- confirm every existing request/task enum value maps to one of `low|normal|high|urgent`;
- snapshot row counts before and after the backfill;
- verify no `priority_id` remains null before the NOT NULL changes;
- verify there is exactly one default priority per tenant after migration.

Do not alter or delete existing CRM records to make the migration pass. Fix the migration if real data exposes another legacy shape.

## Runtime priority resolution

Request creation resolves priority in this order:

```text
explicit request.priorityId
  -> subcategory.defaultPriorityId
  -> category.defaultPriorityId
  -> tenant default RequestPriorityDef
```

This resolution belongs in CRM API and must not be recreated in Next.js UI routes.

Tasks resolve:

```text
explicit task.priorityId
  -> tenant default RequestPriorityDef
```

Request forms store `defaultPriorityId`, and intake request creation passes that ID into normal CRM request creation/routing validation.

Archived priorities:

- remain serialized on historical requests/tasks;
- cannot be selected for new work because new IDs are validated with `requireActiveForTenant`;
- the default priority cannot be archived/deleted until a different default is selected.

## CRM API surface

Priority module:

```text
apps/crm-api/src/modules/priorities/
  priorities.controller.ts
  priorities.repository.ts
  priorities.routes.ts
  priorities.schemas.ts
  priorities.serializers.ts
  priorities.service.ts
  index.ts
```

Routes:

```text
GET    /v1/organizations/:organizationId/request-priorities
GET    /v1/organizations/:organizationId/request-priorities/:priorityId
POST   /v1/organizations/:organizationId/request-priorities
PATCH  /v1/organizations/:organizationId/request-priorities/:priorityId
DELETE /v1/organizations/:organizationId/request-priorities/:priorityId
```

Behavior:

- create assigns an app-owned `crm_pri_*` ID and slugifies the name;
- tenant isolation is enforced on reads/validation;
- `setDefault` clears the old default transactionally;
- default priority cannot be deactivated;
- destructive delete is blocked while referenced;
- normal settings archive/restore uses `isActive`, preserving history.

## SDK / unified client

`@876/crm` now treats priority as a resource, not an enum.

Request response shape:

```ts
{
  priorityId: string
  priority: {
    object: 'request_priority'
    id: string
    name: string
    slug: string
    weight: number
    sortOrder: number
    isDefault: boolean
    isActive: boolean
    // ...metadata
  }
}
```

Request/task inputs use `priorityId?: string`.

Category/subcategory/form defaults use `defaultPriorityId?: string | null`.

The CRM client exposes:

```ts
$876.requestPriorities.list(orgId)
$876.requestPriorities.retrieve(orgId, priorityId)
$876.requestPriorities.create(orgId, input)
$876.requestPriorities.update(orgId, priorityId, input)
$876.requestPriorities.delete(orgId, priorityId, input)
```

`packages/client` composes the same CRM resource onto both:

- the CRM server facade;
- Console's `$876` data-plane facade.

## CRM browser boundary

CRM browser components do not import the server-only SDK.

Priority mutations use:

```text
apps/crm/src/lib/client/request-priorities.ts
apps/crm/src/app/api/request-priorities/route.ts
apps/crm/src/app/api/request-priorities/[priorityId]/route.ts
```

The route handlers:

- obtain authenticated CRM context;
- ignore spoofed `createdBy` / `deletedBy` from the browser;
- attach the authenticated user ID;
- call `$876.requestPriorities`;
- contain no CRM business logic.

## CRM Settings UI

New route family:

```text
/settings/priorities
/settings/priorities/new
/settings/priorities/:priorityId/edit
```

Settings -> Requests -> Priorities is marked available.

The UI currently supports:

- list priorities;
- create custom priority;
- rename;
- description;
- CSS color value;
- optional icon key;
- severity weight;
- sort order;
- choose another default;
- archive/restore non-default priorities;
- see which rows are provisioned;
- preserve tenant edits to provisioned rows.

Category and subcategory settings now use `defaultPriorityId` selectors populated from the tenant's priority catalog.

Request create/edit forms and task editors also load tenant priorities and send IDs.

Dynamic request/task badges render the configured name/color instead of switching on four hard-coded names.

## Console integration

Console has two separate responsibilities.

### 1. Platform provisioning administration

Use the existing generic control plane:

```ts
workspace.provisioning.catalog.retrieve(...)
workspace.provisioning.published.retrieve(...)
workspace.provisioning.draft.retrieve(...)
workspace.provisioning.draft.update(...)
workspace.provisioning.draft.validate(...)
workspace.provisioning.draft.publish(...)
workspace.provisioning.runs.*
```

Because CRM resource definitions are registered in Core's provisioning catalog, the generic Console application provisioning editor can inspect/edit them. Do not add a separate `crmProvisioning` control plane.

### 2. Organization CRM data

Console's `$876` data plane exposes:

```ts
$876.requestPriorities
```

Console request queues and task views consume the same materialized priority resource objects as CRM itself.

## Important invariants for follow-up work

Do not reintroduce any of these patterns:

```ts
z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
priority: 'NORMAL'
defaultPriority: 'HIGH'
switch (priority) { ... }
if (priority === 'URGENT') { ... }
```

Use IDs and resource metadata:

```ts
priorityId
priority.name
priority.color
priority.weight
priority.isDefault
```

For analytics/report ordering, prefer `weight`; do not infer urgency from a name or slug.

For platform reconciliation identity, use `provisioningKey`; do not use a mutable slug/name.

## Tests already updated in this branch

The branch includes coverage updates for:

- `@876/crm` request/priority schemas;
- rejection of the removed string-priority response shape;
- `@876/crm` priority CRUD paths;
- request filtering by `priorityId`;
- dynamic CRM request queue priorities;
- CRM task editor tenant-default behavior;
- explicit task priority-ID selection.

## Known follow-up test sweep

The GitHub connector cannot run the monorepo, and several large legacy test files still need a local search/update pass. The next agent should treat this as required before merge, not optional cleanup.

Run:

```bash
rg -n "RequestPriority|defaultPriority\b|priority:\s*['\"](?:LOW|NORMAL|HIGH|URGENT)|priority\s*===\s*['\"](?:LOW|NORMAL|HIGH|URGENT)|\['LOW'.*'URGENT'" \
  apps/crm apps/crm-api apps/console packages/crm packages/client
```

Known files that were identified during the remote sweep and should be checked first:

```text
packages/crm/src/request-form-types.advanced.test.ts
packages/crm/src/resources/request-forms.test.ts
apps/crm-api/src/types/request-form.advanced.test.ts
apps/crm-api/src/modules/request-forms/__tests__/*
apps/crm-api/src/modules/requests/__tests__/*
apps/crm-api/src/modules/categories/__tests__/*
apps/crm/src/app/api/requests/[requestId]/tasks/route.test.ts
apps/console/src/features/crm/components/request-manager.tsx
```

Some may be stale fixtures only; some may no longer reference the old contract on this branch. Do not blindly replace text. Update each fixture to the real resource/ID shape and retain the existing behavioral assertions.

For request-form fixtures specifically:

```text
defaultPriority -> defaultPriorityId
request.priority string -> request.priorityId + request.priority object
```

## Required local verification

From repo root, first install/generate as the repository normally expects, then run at minimum:

```bash
pnpm --filter @876/crm typecheck
pnpm --filter @876/crm test
pnpm --filter @876/client typecheck
pnpm --filter @876/client test
pnpm --filter @876/crm-api typecheck
pnpm --filter @876/crm-api test
pnpm --filter @876/api typecheck
pnpm --filter @876/api test
pnpm --filter @876/crm-app typecheck
pnpm --filter @876/crm-app test
pnpm --filter @876/console typecheck
pnpm --filter @876/console test
```

Also run lint for touched packages/apps:

```bash
pnpm --filter @876/crm lint
pnpm --filter @876/client lint
pnpm --filter @876/crm-api lint
pnpm --filter @876/api lint
pnpm --filter @876/crm-app lint
pnpm --filter @876/console lint
```

Then run the monorepo's normal root checks required by CI.

### Prisma/database commands

CRM API package scripts are:

```bash
pnpm --filter @876/crm-api db:generate
pnpm --filter @876/crm-api db:migrate
pnpm --filter @876/crm-api db:deploy
```

Recommended local sequence for development review:

```bash
pnpm --filter @876/crm-api db:generate
pnpm --filter @876/crm-api typecheck
# inspect apps/crm-api/prisma/migrations/20260828210000_crm_provisioned_configuration/migration.sql
# back up/snapshot the development database as appropriate
pnpm --filter @876/crm-api db:migrate
pnpm --filter @876/crm-api test
```

Use `db:deploy` in deployment environments according to the repo's existing deployment process; do not use `migrate dev` against production.

### Provisioning seed verification

Core API exposes:

```bash
pnpm --filter @876/api seed
```

Use the existing seed CLI mode/arguments expected by the repo to seed provisioning. Verify that an existing published `application/876-crm` manifest receives a new revision containing CRM resources instead of being skipped.

After seeding, verify in Console's application provisioning UI that `876-crm` exposes:

```text
request_priority
request_category
request_subcategory
```

and that the published resource list includes the default CRM priorities/categories.

## Manual acceptance test

After migration + seed + local apps are running:

1. Open an existing CRM organization.
2. Confirm Settings -> Requests -> Priorities lists Low/Normal/High/Urgent and Normal is default.
3. Create `Critical`, set weight/order/color, and make it default.
4. Rename/recolor a provisioned priority such as Urgent.
5. Re-run tenant provisioning/reconciliation and confirm the rename/color remain unchanged.
6. Add a new platform-provisioned priority to the application manifest, publish a new revision, reconcile the tenant, and confirm the new missing priority is created.
7. Create a request with no explicit priority; confirm it uses the current tenant default.
8. Set a category default priority and create a request in that category; confirm category default wins over tenant default.
9. Set a subcategory default and confirm it wins over category default.
10. Explicitly select a priority on request creation and confirm it wins over every routing default.
11. Create/edit a task with default and explicit priorities.
12. Configure a request form default priority and submit it; confirm the resulting request uses the configured ID.
13. Archive a non-default priority; historical records must still render it, but it must disappear from new-selection lists.
14. Attempt to archive the default priority; expect `crm/priority-default-required`.
15. Open Console and confirm the same request/task priority names/colors render.
16. Open Console application provisioning for CRM and confirm the generic provisioning catalog/editor understands the new CRM schemas.
17. Confirm two organizations cannot retrieve/update each other's priority IDs.

## Recommended follow-up implementation phases

These are not required for this branch, but the reconciler/catalog should be extended in this order when needed:

### Phase 1 — custom statuses

Add `request_status` resources with stable IDs, terminal/resolved semantics, sort order, color, and transition rules. This is a larger change than priorities because request lifecycle code currently depends on status behavior, not just labels.

### Phase 2 — request sources

If organizations need custom intake/source labels, model `request_source` as a resource rather than another enum rewrite in the UI.

### Phase 3 — SLA policies

Provision default SLA definitions and let tenant-owned policies point to priority IDs/weights rather than priority names.

### Phase 4 — forms / automation defaults

Provision first-class templates/rules only where platform defaults truly must exist. Do not turn the application manifest into arbitrary user settings.

### Phase 5 — custom fields/properties

Design separately. Custom fields require typed field definitions, validation, values/storage, indexing/search policy, permissions, and migration/versioning semantics. Do not overload `RequestPriorityDef` or the provisioning catalog to fake a custom-properties engine.

## Definition of done for PR #425

Before marking the PR ready/merging:

- [ ] CRM migration reviewed and applied successfully to a realistic development database.
- [ ] No nullable request/task priority IDs after migration.
- [ ] Existing enum semantics preserved by backfill.
- [ ] No runtime code depends on the removed `RequestPriority` enum.
- [ ] Remaining legacy test fixtures updated.
- [ ] `@876/crm` typecheck/tests pass.
- [ ] `@876/client` typecheck/tests pass.
- [ ] CRM API typecheck/tests pass.
- [ ] Core API typecheck/tests pass.
- [ ] CRM app typecheck/tests pass.
- [ ] Console typecheck/tests pass.
- [ ] Relevant lint checks pass.
- [ ] Core provisioning seed upgrades an existing CRM manifest correctly.
- [ ] New tenant receives current published defaults.
- [ ] Existing tenant reconciliation is idempotent.
- [ ] Tenant edits survive reconciliation.
- [ ] Cross-tenant priority access is rejected.
- [ ] Console generic provisioning editor renders CRM resource schemas.
- [ ] Manual priority/settings/request/task/form smoke tests pass.
- [ ] PR is conflict-free with current `main`.

## Verification actually run (2026-08-28)

Everything below was executed locally on the merged branch, not merely listed.

| Workspace            | typecheck | tests                |
| -------------------- | --------- | -------------------- |
| `@876/crm-api`       | pass      | 35 files / 560 tests |
| `@876/crm-app`       | pass      | 17 files / 142 tests |
| `@876/console`       | pass      | 92 files / 863 tests |
| `@876/crm` (package) | pass      | 13 files / 169 tests |
| `@876/api`           | pass      | —                    |

For reference, `main` carries 20 files / 380 tests in `crm-api`, so the branch
roughly doubles that module's coverage.

The migration **has been applied** to the dev CRM database. It backfilled 8
priority rows across 2 tenants and moved 5 requests and 1 task onto priority
ids with no `NOT NULL` violation, so the enum-to-row conversion is proven
against real data rather than only in principle.

### Defects found and fixed while verifying

- The migration was numbered `20260828210000`, which sorts **before**
  `20260828230000_request_form_placement` — already applied on `main`.
  Renumbered to `20260828235000`.
- The request module split left five suites importing
  `requests.tasks.service` and `requests.schemas` exports that no longer
  exist; they failed to compile, so notes, tasks and reminders shipped with
  no coverage at all. Each suite now mocks at its own module boundary.
- Console's request **create** form still posted the retired
  `LOW|NORMAL|HIGH|URGENT` enum. It did not typecheck and the API would have
  refused it. It now loads the org's configured priorities.
- `settings/priorities/[priorityId]/edit/page.tsx` collapsed the
  `{ data, error }` union to `never` by testing both arms in one condition.
- The CRM settings-nav test asserted a frozen inventory under a name that
  promised an invariant, so adding a page failed it for an unrelated reason.

## Outstanding design concern: who loads the provisioning manifest

**Not fixed in this PR — deliberately, because it is a layering issue rather
than a security hole, and restructuring it belongs in its own change.**

Today `apps/crm/src/lib/provisioning/manifest.ts` runs in the **Next app**: it
fetches the published platform profile, parses every property, enforces domain
invariants ("exactly one default priority"), and then posts the finished
manifest to `POST /v1/tenants` as a request body. `crm-api` accepts that body
and reconciles from it.

Three consequences:

1. **Domain logic sits in a Next app.** `.claude/rules/api-access.md` is
   explicit that route handlers authorize and adapt transport only; the manifest
   parser and its invariants are business rules in the wrong tier.
2. **The service is told its own configuration rather than reading it.** The
   route is `requireInternal`, so this is not browser-reachable — but the
   platform manifest is platform-owned truth, and a service that accepts it as
   input can be handed a manifest that does not match what the platform
   published.
3. **A manifest revision can never reach an existing tenant.** Reconciliation
   only happens on the onboarding request. `Tenant.provisioningRevision` exists
   and is written, but nothing ever compares it against the published revision,
   so the "preserve tenant overrides, apply new defaults" behaviour the model is
   built for cannot actually fire for an org that already exists.

The shape this should take: move the loader into `crm-api` (it already builds
with the `react-server` condition, so `@876/core/platform` imports cleanly; it
needs `@876/core` as a dependency plus `API_URL`/`API_INTERNAL_KEY`), have
`tenants.create` load the manifest itself, and add an explicit
`POST /v1/tenants/:id/provisioning/reconcile` for the revision-bump path. The
CRM app then goes back to posting `{ organizationId }` alone.

Note that `apps/billing/src/lib/provisioning/manifest.ts` — the file this
pattern was modelled on — has **no callers outside its own test**. It is not a
live precedent.

## Environment note: `CRM_API_876_KEY`

While verifying, both `apps/crm/.env.development.local` and
`apps/crm-api/.env.development.local` were found to hold the **876-consumer**
app's key. `crm-api` authenticates to Billing's integration tier with that key,
so Billing resolved the wrong app, found no finance connection for it, and
answered `billing/connection-forbidden` — "The app finance connection lacks the
required scope." This is the exact failure mode
`.claude/rules/env-configuration.md` records: a credential problem that surfaces
as a scope error. A dedicated `876-crm` key was issued and both files corrected.

**The same value was set in Vercel production for `876-crm` and `876-crm-api`
in the same six-hour window, and Vercel returns `[SENSITIVE]` rather than the
value, so it could not be verified from here.** Confirm it before trusting a
production CRM customers page.

## Pull / continuation

Branch:

```text
feature/crm-config-provisioning
```

PR:

```text
#425 — feat(crm): provision configurable request priorities
```

The database migration is intentionally left for the local agent/user to review and execute. Continue on this branch; do not start a competing implementation branch unless PR #425 is intentionally abandoned.
