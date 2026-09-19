# Brief — Phase 4c: idea capture and the triage inbox

Branch: `feature/projects-mobile-and-agentic`. Do **not** create a branch. Do
**not** commit — the orchestrator commits. **Do not run `prisma migrate`** —
hand-write the migration SQL to the path named below. Dev and production share
databases here, so a stray migrate is destructive.

## Why

An idea arrives without a project, without a work-item type, and without a
status. Today 876 Projects can only accept it as an *issue*, which demands all
three up front — so ideas either get forced into the wrong project or never get
captured at all.

The user's pattern: he is thinking out loud in GPT web or Muse against the
`876-projects` MCP server, on a phone, and wants to drop the thought somewhere
it will not be lost, then triage it properly later.

**A capture is not an issue and must not be modelled as one.** It is
deliberately a separate, lighter record that is later *promoted* into an issue.
Do not add a "captured" workflow state to the issue table — workflow states are
org-configured and a capture has no project to draw a state from.

## Read first — the shape you are copying

Pick the smallest existing module in `apps/projects-api/src/modules/` with the
full layer set — `labels` is a good reference — and mirror it exactly:

- `apps/projects-api/src/modules/labels/labels.{routes,controller,service,repository,schemas,serializers}.ts`
- `apps/projects-api/src/modules/labels/index.ts`
- `apps/projects-api/prisma/schema/label.prisma` (mapping conventions)
- the newest directory in `apps/projects-api/prisma/migrations/` (SQL + naming style)

Match that structure. Do not invent a new layout.

## 1. The model

New file `apps/projects-api/prisma/schema/capture.prisma`.

```prisma
model Capture {
  id           String   @id
  tenantId     String   @map("tenant_id")
  title        String
  body         String?
  status       String              // inbox | promoted | discarded
  source       String?             // mcp | web | mobile
  createdBy    String   @map("created_by")
  projectId    String?  @map("project_id")       // an optional hint, not a requirement
  promotedIssueId String? @map("promoted_issue_id")
  createdAt    DateTime @map("created_at")
  updatedAt    DateTime @map("updated_at")

  @@index([tenantId, status])
  @@map("captures")
}
```

Read `label.prisma` and `issue.prisma` **first** and match their conventions
exactly — id type, timestamp type (`DateTime` vs `BigInt` Unix seconds), and
whether relations are modelled or ids are bare columns. The platform contract is
Unix seconds (`CLAUDE.md` → Boundaries); if issues store them that way, do the
same. **State in your report which convention you matched.**

`status` and `source` are 876-owned symbolic values — kebab-case per
`.claude/rules/naming.md`, durable once persisted, validated by a Zod enum in
`*.schemas.ts`, never a bare `z.string()`.

`promotedIssueId` references an issue **by opaque id**; do not add a foreign key
that would make a capture undeletable after its issue is removed.

Hand-write the migration to
`apps/projects-api/prisma/migrations/<timestamp>_captures/migration.sql` in the
existing timestamp format. **Additive only** — `CREATE TABLE` plus indexes. It
must apply cleanly on a database that has already run every existing migration.

## 2. The API

A `captures` module with the standard layer split:

```
GET    /captures                 list, filterable by status (default: inbox)
POST   /captures                 create
PATCH  /captures/:id             edit title/body/projectId hint
POST   /captures/:id/promote     create an issue from it, mark promoted
POST   /captures/:id/discard     mark discarded
DELETE /captures/:id             remove
```

Promotion rules — this is the part worth getting right:

- promote takes the target `projectId` and whatever the issue contract requires
  (type, status) and creates the issue **through the issues module's public
  service API** (`apps/projects-api/src/modules/issues/index.ts`), never by
  reaching into the issues repository. Cross-module access goes through
  `index.ts` only (`.claude/rules/express-api.md`).
- the capture's title and body become the issue's title and description;
- on success set `status = 'promoted'` and `promotedIssueId`, **in the same
  transaction as the issue create** where the module's transaction seam allows
  it. A capture marked promoted whose issue rolled back is a lie.
- promoting an already-promoted capture is a **conflict**, not a second issue.
  Return the registered conflict value and the existing `promotedIssueId`.
- tenant isolation is a filter inside the loading query
  (`findFirst where { id, tenantId }` → 404), never load-then-compare 403.

Serialize with an `object` discriminator: `"object": "capture"`. Use the
standard list envelope this service already uses — copy it from `labels`.

Expected failures are **returned as values, not thrown, if that is what the
module you copied does**. `apps/projects-api` is mid-migration on this
(`.claude/rules/error-handling.md`); match the neighbouring module exactly and
do not introduce a second pattern.

## 3. The client

`packages/projects/src/resources/captures.ts`, following
`packages/projects/src/resources/labels.ts` exactly, wired into the same
entrypoints `labels` uses (check which — `operator`, and `session` if labels has
one; do not assume).

Verbs: `list`, `create`, `update`, `delete` are the standard vocabulary.
`promote` and `discard` are **workflow verbs** and are permitted here because
they describe domain intent rather than generic CRUD
(`.claude/rules/sdk-conventions.md`). Do not add `getInbox` or `findPending`.

## 4. MCP — the point of the whole phase

```
capture_create(title, body?, projectKey?) -> the capture
captures_list(status?)                    -> the inbox
capture_promote(id, projectKey, ...)      -> the created issue
```

Mirror the existing tool shape exactly (`tool-definitions.ts` registers,
`handlers.ts` implements, `schemas.ts` holds the zod contracts,
`withToolErrorBoundary` wraps). `capture_create` and `capture_promote` **write**,
so use the same create/update annotations the existing write tools use, not
`READ_ONLY_ANNOTATIONS`.

`capture_create` description — use this wording:

> Capture a raw idea without choosing a project, type or status. Use this when
> the user is thinking out loud and the thought is not yet a work item; it lands
> in the inbox for triage later. Prefer this over issue_create when no project
> has been named.

Set `source` to `mcp` for captures created through these tools.

## 5. The inbox UI

`apps/projects/src/app/(app)/inbox/` — a list page following the app's existing
conventions:

- `ResourceToolbar` with the title as a `StatusFilterHeading` over
  `inbox | promoted | discarded | all` (`.claude/rules/app-layout.md` §5 — the
  title *is* the filter; do **not** build a filter card);
- rows rendered with `MobileList` on phone and a table above `sm`, copying
  `packages/projects-ui/src/project-list.tsx` exactly as the reference;
- each row opens a detail/promote view where the user picks a project and
  promotes;
- add the route to the app's navigation registry the way the existing entries
  are declared, including whatever permission the neighbouring entries require.

Chrome renders before data: toolbar and filter above the `<Suspense>`, only the
rows inside it (`.claude/rules/data-loading.md`).

## Hard constraints

- No `prisma migrate` / `prisma generate` against a live database — hand-write
  the SQL.
- Only a `*.repository.ts` may import Prisma. Controllers never touch it.
  Services never import Express types.
- No function props across the RSC boundary
  (`.claude/rules/production-render-errors.md` Rule 1).
- No `eslint-disable`, no `@ts-ignore`, no `as any`.
- No green. No explanatory `<p>` under a heading — including on the empty inbox
  state, which is a short title only.
- **Do not touch** — other delegates own these:
  `packages/projects-ui/src/{issue-detail,project-detail,mobile-list,issue-list,phase-list,time-entry-list,timesheet-summary}.tsx`,
  `packages/ui/src/components/{resource-toolbar,markdown,markdown-editor}.tsx`,
  `packages/ui/src/876.css`,
  `apps/projects/src/features/projects/components/{issue-filter-bar,issues-data,board-data}.tsx`,
  `apps/projects/src/app/(app)/issues/**`, `apps/projects/src/app/(app)/board/**`.
  You may **read** any of them.

## Tests — floor is 20 new `it()` cases

- repository: tenant isolation on every verb (4+);
- service: promote creates an issue and marks the capture; promote of an
  already-promoted capture conflicts and does not create a second issue;
  discard; promote of a missing capture (5+);
- routes: each of the six, plus unauthorized and a cross-tenant case that must
  404 not 403 (8+);
- serializer: `object` discriminator and full field set (2+);
- MCP: `capture_create` with no project, `captures_list` default filter,
  `capture_promote` returning the issue (3+).

Assert exact shapes and both branches. `toBeDefined()` alone is not a test
(`.claude/rules/testing.md`).

## Verify yourself, one command at a time, never in parallel

```bash
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test
pnpm --filter @876/projects-api exec prisma validate
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test
pnpm --filter @876/projects-mcp test
```

`prisma validate` only — never `migrate`.

## Report

`plans/sep/19-projects-mobile-and-agentic/reports/codex/2026-09-19-idea-capture-inbox.md`
— files changed and why, **the full migration SQL inline**, which id/timestamp
convention you matched, the **counted** number of `it()` cases added, real
command output, what you could not verify, and anything left undone.
