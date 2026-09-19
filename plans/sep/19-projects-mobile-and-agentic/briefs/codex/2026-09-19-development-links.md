# Brief — Phase 6: development links, so an issue records what was actually built

Branch: `feature/projects-mobile-and-agentic`. Do **not** create a branch. Do
**not** commit — the orchestrator commits. **Do not run `prisma migrate`** —
hand-write the migration SQL to the path named below.

## Why

The user works through AI and often from a phone, and **cannot always reach the
codebase**. Today the record of what a run actually did lives only in
`plans/<month>/<run>/` — a folder in a git repository, invisible from a phone.

A project in 876 Projects *is an application*, so its issues are
software-development issues. They should carry development attributes as
first-class data rather than as prose buried in a comment: which branch, which
pull request, which commit, which deploy.

This does **not** replace the `plans/` process — that stays exactly as it is.
This is a phone-readable projection of it.

## Read first — the shape you are copying

Pick the smallest existing module in `apps/projects-api/src/modules/` that has
the full layer set and mirror it exactly: `labels` is a good reference. Read:

- `apps/projects-api/src/modules/labels/labels.routes.ts`
- `apps/projects-api/src/modules/labels/labels.controller.ts`
- `apps/projects-api/src/modules/labels/labels.service.ts`
- `apps/projects-api/src/modules/labels/labels.repository.ts`
- `apps/projects-api/src/modules/labels/labels.schemas.ts`
- `apps/projects-api/src/modules/labels/labels.serializers.ts`
- `apps/projects-api/src/modules/labels/index.ts`
- `apps/projects-api/prisma/schema/label.prisma` (mapping conventions)
- the newest directory in `apps/projects-api/prisma/migrations/` (SQL style)

Match that structure exactly. Do not invent a new layout.

## 1. The model

New file `apps/projects-api/prisma/schema/development-link.prisma`.

```prisma
model WorkItemDevelopmentLink {
  id           String   @id
  tenantId     String   @map("tenant_id")
  workItemId   String   @map("work_item_id")
  kind         String
  url          String
  label        String?
  externalId   String?  @map("external_id")
  state        String?
  createdAt    DateTime @map("created_at")
  updatedAt    DateTime @map("updated_at")

  @@unique([workItemId, kind, externalId])
  @@index([tenantId, workItemId])
  @@map("work_item_development_links")
}
```

Read `issue.prisma` first and **match its conventions exactly** — how it names
the issue model, whether it uses a relation or a bare id column, its id type,
and its timestamp type (`DateTime` vs `BigInt` Unix seconds). If issues store
timestamps as Unix seconds, do the same here; the platform contract is Unix
seconds (`CLAUDE.md` → Boundaries) and consistency inside the service wins over
this brief's sketch. **Say in your report which convention you followed.**

`kind` and `state` are 876-owned symbolic values, so kebab-case per
`.claude/rules/naming.md`, and durable once persisted:

- `kind`: `branch` · `pull-request` · `commit` · `deploy`
- `state`: `open` · `merged` · `closed` · `succeeded` · `failed` · null

Validate both with a Zod enum in `*.schemas.ts` — not a bare `z.string()`.

Hand-write the migration to
`apps/projects-api/prisma/migrations/<timestamp>_work_item_development_links/migration.sql`,
following the timestamp format the existing directories use. It must be
**additive only** — a `CREATE TABLE` plus indexes, no `ALTER` of an existing
table, no data migration. It must apply cleanly to a database that has already
run all 19 existing migrations.

## 2. The API

A `development-links` module with the standard layer split. Routes, scoped under
the work item that owns them and mirroring how `labels` declares guards **per
route** (never `router.use`):

```
GET    /issues/:issueRef/development-links      list
POST   /issues/:issueRef/development-links      create (upsert on the unique key)
PATCH  /development-links/:id                   update state/label
DELETE /development-links/:id                   remove
```

- Create is **idempotent on `(workItemId, kind, externalId)`** — re-linking the
  same PR updates it rather than creating a duplicate. A run that retries must
  not double-link.
- Tenant isolation is a **filter inside the loading query**
  (`findFirst where { id, tenantId }` → 404), never a load-then-compare 403.
  This is the convention the repo already follows; match it.
- Serialize with an `object` discriminator: `"object": "development-link"`.
- List returns the standard list envelope this service already uses — copy it
  from `labels`, do not restate it.
- Expected failures are **returned as values**, not thrown, if that is what the
  surrounding module does. `apps/projects-api` is mid-migration on this
  (`.claude/rules/error-handling.md`); **match the module you copied from
  exactly** and do not introduce a second pattern.

## 3. The client

Add the resource to `packages/projects/src/resources/development-links.ts`,
following `packages/projects/src/resources/labels.ts` exactly. Wire it into the
same entrypoints `labels` is wired into (`operator`, and `session` if labels has
one — check, do not assume).

Verbs are the standard vocabulary only: `list`, `create`, `update`, `delete`
(`.claude/rules/sdk-conventions.md`). No `getByPr`, no `linkBranch`.

## 4. MCP

One new tool in `apps/projects-mcp/src/`, mirroring the existing tool shape
(`tool-definitions.ts` + `handlers.ts` + `schemas.ts`, `withToolErrorBoundary`):

```
issue_development_link(ref, kind, url, label?, externalId?, state?) -> the link
```

Description:

> Record what was built for an issue: a branch, pull request, commit or
> deployment. Idempotent on the external id, so re-recording the same pull
> request updates it instead of duplicating it. Use this at the end of an
> implementation run so the issue itself shows the work, for someone reading it
> away from the codebase.

Annotations: this one **writes**, so use the same create/update annotations the
existing write tools use — not `READ_ONLY_ANNOTATIONS`.

Also add a read tool `issue_development_links(ref)` returning the list, and
include the links in the `issue_brief` output **if and only if** the
`agent-brief` formatter already exists in `packages/projects/src/agent-brief.ts`
by the time you run. If it does not exist yet, skip that integration and say so
in your report — another phase owns that file.

## 5. The UI

A section on the issue record listing the links: kind icon, label or a shortened
URL, state badge, opening in a new tab.

> **Concurrency — read before touching the issue page.** Other delegates have
> been rewriting `packages/projects-ui/src/issue-detail.tsx` and
> `apps/projects/src/app/(app)/issues/[issueRef]/_components/issue-detail-data.tsx`.
> Re-read both immediately before editing. **Integrate into whatever structure
> you find; never restore an older version.** If integrating is not
> straightforward, ship the API + client + MCP complete, skip the UI, and say so
> in the report — the orchestrator will wire it.

Render it inside the content column, behind its own `<Suspense>` like the
existing streamed sections, with `DataTableSkeleton`-equivalent or a small text
fallback matching what the neighbouring sections do.

## Hard constraints

- No `prisma migrate`, no `prisma generate` against a live database. Hand-write
  the SQL. **Dev and production share databases here**, so a stray migrate is
  destructive.
- Only a `*.repository.ts` may import Prisma. Controllers do not touch it.
  Services do not import Express types. Cross-module access goes through
  `index.ts` (`.claude/rules/express-api.md`).
- No function props across the RSC boundary.
- No `eslint-disable`, no `@ts-ignore`, no `as any`.
- No green. No explanatory `<p>` under a heading.
- **Do not touch** `packages/projects-ui/src/project-detail.tsx`,
  `packages/projects-ui/src/mobile-list.tsx`,
  `packages/ui/src/components/markdown*.tsx`, `packages/ui/src/876.css`,
  `issue-filter-bar.tsx`, `issues-data.tsx`, `issues/(list)/page.tsx`,
  `board/page.tsx` — other delegates own them.

## Tests — floor is 18 new `it()` cases

- repository: tenant isolation on every verb; the unique-key upsert path (4+);
- service: create is idempotent; update rejects an unknown state; delete of a
  missing id returns the expected value/error (4+);
- routes: each of the four, plus an unauthorized case and a cross-tenant case
  that must 404 not 403 (6+);
- serializer: the `object` discriminator and the full field set (2+);
- MCP handler: a successful link, a duplicate link updating in place (2+).

Assert exact shapes and both branches. `toBeDefined()` alone is not a test
(`.claude/rules/testing.md`).

## Verify yourself, one command at a time, never in parallel

```bash
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test
pnpm --filter @876/projects-api exec prisma validate
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-mcp test
```

`prisma validate` only — never `migrate`.

## Report

`plans/sep/19-projects-mobile-and-agentic/reports/codex/2026-09-19-development-links.md`
— files changed and why, **the full migration SQL inline**, which timestamp/id
convention you matched and why, the **counted** number of `it()` cases added,
real command output, whether you wired the UI or skipped it, what you could not
verify, and anything left undone.
