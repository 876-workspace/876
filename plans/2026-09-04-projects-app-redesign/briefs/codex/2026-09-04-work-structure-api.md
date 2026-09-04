# Brief C1 — 876 Projects: configurable work structure (types, states, milestones, custom fields)

Repo root: `/root/projects/876`. Read `.claude/rules/express-api.md`,
`.claude/rules/module-settings.md`, `.claude/rules/naming.md`,
`.claude/rules/stripe-api-pattern.md`, `.claude/rules/deletions.md`, and
`.claude/rules/testing.md` before you start. Do **not** commit — the orchestrator
stages and commits. **Do not run any migration against a database.**

## Why this exists (do not re-derive it)

876 Projects was scaffolded quickly and its work model is hard-coded: an issue
has a `status` string from a fixed list, a `priority`, and nothing else. Its
owner now uses it to track real software development across the 876 apps, and
other organizations on the platform would use it for non-software work
("business tracking"). Both need the structure every serious tracker has and
this one lacks:

| Product            | The structure being borrowed                                                      |
| ------------------ | --------------------------------------------------------------------------------- |
| Jira               | issue **types** per project, **workflow states** with a status category, versions |
| Zoho Projects      | **milestones** grouping work, per-portal custom fields, project templates         |
| GitHub Projects v2 | typed **custom fields** on items, **iterations**, saved views                     |
| Linear             | states carrying a **category** so charts work regardless of custom names          |

The invariant that makes all four work, and the one this brief exists to
implement: **an organization may rename and add to the vocabulary, but every
value still rolls up to a fixed category the product can reason about.** A
tenant that renames "In review" to "Awaiting sign-off" must not break the board,
the completion metric, or the MCP tools.

This brief is the **data model and API only**. The settings UI and the issue-form
wiring are a later phase; do not build UI.

## Decisions already made — implement these exactly

**D1 — Seed from a preset; store only rows.** Presets are a **code catalog** in
`apps/projects-api/src/modules/work-structure/presets.ts`
(`.claude/rules/module-settings.md`: the catalog is code, the tenant stores its
own state). Provisioning a tenant seeds that preset's types, states, and fields
as real rows the tenant then owns and may edit. `Tenant.presetKey` records which
preset it started from. Presets: `software-development` (the default),
`business-operations`, `general`.

**D2 — `Issue.status` keeps holding the state _key_, and stays on the wire.**
This is the decision that keeps the change non-breaking, so do not deviate.
Existing values are `backlog|todo|in-progress|in-review|done|canceled`; the
`software-development` preset seeds states whose keys are exactly those, so
every existing row is already valid. Add `Issue.workflowStateId` as a nullable
reference backfilled by key. Serializers keep emitting `status` unchanged and
**additionally** emit a nested `state` object. A custom state is just another
row with a new kebab key.

**D3 — Every state carries a `category`** from the fixed set
`backlog | unstarted | started | completed | canceled`. Category is what the
board, the completion timestamps (`startedAt`/`completedAt`/`canceledAt`), and
any future metric read. Names are the tenant's; categories are the platform's.

**D4 — Same shape for types.** `Issue.typeKey String @default("task")` keeps a
readable value on the wire; `Issue.workItemTypeId` is the reference. A type
carries a `hierarchyLevel` (`0` sub-item, `1` standard, `2` epic) so a parent/
child relationship can be validated rather than merely allowed.

**D5 — Milestones belong to a project** (GitHub/Zoho), cycles to a tenant
(Linear/Jira sprints). Both are in this migration; **milestones get the full
API in this brief and cycles get schema + repository only** — the API surface
for cycles arrives when the UI does, and a route with no caller is a second
permanent path to maintain.

**D6 — Custom field values use typed columns, never a JSON blob**, following the
physical shape `.claude/rules/module-settings.md` fixes for preference
overrides: one row per set value, no row when unset, and a decimal stays a
string end-to-end.

**D7 — Keys are durable kebab-case identifiers** (`.claude/rules/naming.md`).
Physical SQL stays snake_case behind Prisma `@map`; new JSON fields are camelCase;
new symbolic values are kebab-case.

## Schema — `apps/projects-api/prisma/schema/work-structure.prisma` (new file)

All ids are the repo's existing prefixed-id style — read
`apps/projects-api/src/` for how ids are generated and follow it. All timestamps
are `BigInt` Unix **seconds**, matching every existing model. All tables are
prefixed `projects_`. Every model is tenant-scoped with
`onDelete: Cascade` from `Tenant`, exactly like `Label`.

```
WorkItemType     tenantId, key, name, iconKey, color, hierarchyLevel Int @default(1),
                 description?, isDefault Bool, position Int, archivedAt?, createdAt, updatedAt
                 @@unique([tenantId, key])

WorkflowState    tenantId, key, name, category String, color, description?,
                 isDefault Bool, position Int, archivedAt?, createdAt, updatedAt
                 @@unique([tenantId, key]) ; @@index([tenantId, category])

Milestone        tenantId, projectId, key, name, description?, status String @default("open"),
                 startDate BigInt?, targetDate BigInt?, completedAt BigInt?,
                 position Int, deletedAt?, createdAt, updatedAt
                 @@unique([projectId, key]) ; @@index([tenantId, status])

Cycle            tenantId, projectId?, number Int, name, startsAt BigInt, endsAt BigInt,
                 completedAt BigInt?, createdAt, updatedAt
                 @@unique([tenantId, number]) ; @@index([tenantId, startsAt])

CustomField      tenantId, key, label, fieldType String, options Json?, required Bool,
                 description?, position Int, archivedAt?, createdAt, updatedAt
                 @@unique([tenantId, key])

CustomFieldOnType   fieldId, typeId  @@unique([fieldId, typeId])   // which types show the field

CustomFieldValue    tenantId, issueId, fieldId,
                    stringValue?, integerValue Int?, decimalValue Decimal? @db.Decimal(20,6),
                    booleanValue Bool?, dateValue BigInt?, selectKey?, selectKeys String[],
                    updatedBy?, createdAt, updatedAt
                    @@unique([issueId, fieldId]) ; @@index([tenantId, fieldId])
```

`fieldType` is one of `text | textarea | number | decimal | boolean | date |
select | multi-select | user | url`. Reject a value whose column does not match
its field's type — that validation lives in the service, and it is the single
most important test in this brief.

Additions to existing models:

- `Issue`: `workItemTypeId String?`, `typeKey String @default("task")`,
  `workflowStateId String?`, `milestoneId String?`, `cycleId String?`,
  plus `@@index([tenantId, milestoneId])`.
- `Tenant`: `presetKey String @default("software-development")` and the new
  back-relations.
- `Project`: `milestones Milestone[]`, and `defaultWorkItemTypeId String?` so a
  project may prefer a type without owning its own type set (a Jira issue-type
  _scheme_ is more machinery than this product needs — do not build one).

## Migration

Hand-write `apps/projects-api/prisma/migrations/<timestamp>_work_structure/migration.sql`
following the existing `20260903000000_init` file's conventions. It must:

1. create the new tables and indexes;
2. add the new nullable columns to `projects_issues`, `projects_projects`, and
   `projects_tenants`;
3. **backfill nothing that requires a tenant loop** — seeding is the
   provisioning service's job, not the migration's, because a preset is code.

Additive and reversible-by-omission only: no `DROP`, no `NOT NULL` on an existing
table, no data rewrite. Verify with `pnpm --filter @876/projects-api db:generate`
and `npx prisma validate --schema apps/projects-api/prisma/schema`. **Do not run
`prisma migrate dev`, `db push`, or anything that connects to a database** —
migrations run in CI, never from a workstation, and this repo's production
migrations are currently gated.

## Module — `apps/projects-api/src/modules/work-structure/`

Follow the exact layer split every other module uses
(`routes|controller|service|repository|schemas|serializers|docs|index`) and the
guard style in `comments.routes.ts` (`requireInternalKey`, per-route, never
`router.use`). Resources and routes, all tenant-scoped like the existing ones:

| Resource            | Routes                                                                   |
| ------------------- | ------------------------------------------------------------------------ |
| work item types     | list, create, retrieve, update, delete (soft: `archivedAt`)              |
| workflow states     | list, create, retrieve, update, delete (soft)                            |
| milestones          | list (project-scoped, `status` filter), create, retrieve, update, delete |
| custom fields       | list, create, retrieve, update, delete (soft)                            |
| custom field values | list for an issue, set (upsert), clear                                   |
| presets             | list the catalog; apply a preset to a tenant (idempotent seed)           |

Service rules that must be enforced, each with a test:

- a state's `category` must be one of the five; an unknown category is rejected;
- deleting the last non-archived state, or the tenant's default state, is
  rejected — a tenant must always have somewhere for an issue to sit;
- deleting a type or state still referenced by a live issue is rejected with a
  distinct error code (do not cascade-null an issue's state);
- a custom field value must match its field's `fieldType`, and a `select` value
  must be one of the field's declared option keys;
- a `decimal` value is carried as a **string** through the API and never as a JS
  number;
- setting a value to null/empty **deletes the row** rather than storing a null —
  absence means unset (`module-settings.md`);
- applying a preset is idempotent: an existing key is updated in place, never
  duplicated, and a tenant's edits to a seeded row are not clobbered by a
  re-apply (only missing rows are created).

Wire the seed into wherever a tenant is currently provisioned (find it — likely
`modules/tenants`) so a **new** tenant gets its preset's rows. Existing tenants
are seeded by applying a preset explicitly through the route; do not seed from
the migration and do not seed on server start (`express-api.md`: no DDL or seed
work at boot).

Extend the issue module minimally: `issues.list` gains `milestoneId`, `typeKey`,
and `status` filters if they do not exist; `issues.create`/`update` accept
`typeKey`, `status` (validated against the tenant's states), `milestoneId`, and
`customFields`. Issue serializers gain `type`, `state`, `milestone`, and
`customFields`, additively — **no existing field changes name, type, or meaning**.

## Verification — foreground, report exact output

```bash
pnpm --filter @876/projects-api db:generate
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test
npx prettier --check <every file you touched>
```

Tests are not optional and existence checks do not count. Cover: every service
rule listed above (each with its own `it`), tenant isolation on every list and
retrieve, the preset seed being idempotent across two applications, the full
serialized shape of each new resource including its `object` discriminator, and
that an existing issue's serialized `status`/`priority` are byte-identical to
before your change.

## Prohibitions

No database connections. No `eslint-disable`, `@ts-ignore`, or `as any`. No
renaming of an existing column, table, route, field, or symbolic value. No JSON
blob for custom field values. No cross-module Prisma joins — go through the
owning module's `index.ts`. No UI. No commits. No files outside
`apps/projects-api/**`. If something here is factually wrong about the codebase,
stop and report it rather than inventing a workaround.
