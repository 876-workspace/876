# Brief — Phase 2: `issues`, `labels`, `comments` modules

You are implementing **Phase 2** of 876 Projects: the issue-tracking core of
`apps/projects-api`. Read `plans/2026-09-03-876-projects/plan.md` for context.

**Repository root:** `/root/projects/876`
**Branch:** `feat/876-projects` (already checked out — do NOT create, switch, or
merge any branch, and do NOT commit. The orchestrator commits.)

---

## 0. Read these first

Phase 1 already built `apps/projects-api`: the scaffold, the full Prisma schema
(including `Issue`, `Label`, `IssueLabel`, `Comment`, `IssueEvent`), the
migration, the error catalog, and the `tenants` and `projects` modules.

**Your job is to match what is already there, not to invent a second style.**

| Read this | To learn |
| --- | --- |
| `apps/projects-api/src/modules/projects/*` | the exact module style you must copy: routes, controller, service, repository, schemas, serializers |
| `apps/projects-api/src/modules/tenants/*` | tenant resolution from `organizationId` |
| `apps/projects-api/src/http/errors.ts` | the error catalog — the codes you need are already in it |
| `apps/projects-api/src/http/result.ts` | the result envelope and list envelope helpers |
| `apps/projects-api/src/http/routes.ts` | where to mount your new routers |
| `apps/projects-api/src/platform/ids.ts` | ID generation (`iss_`, `lbl_`, `cmt_`, `isev_`) |
| `apps/projects-api/prisma/schema/issue.prisma`, `label.prisma` | the models you are serving |
| `apps/crm-api/src/modules/requests/*` | a larger reference module if `projects` leaves anything ambiguous |

Where this brief and the existing `projects` module disagree on **style**, the
existing module wins. Where they disagree on **behaviour**, this brief wins.

---

## 1. Files to create

```
apps/projects-api/src/modules/issues/issues.routes.ts
apps/projects-api/src/modules/issues/issues.controller.ts
apps/projects-api/src/modules/issues/issues.service.ts
apps/projects-api/src/modules/issues/issues.repository.ts
apps/projects-api/src/modules/issues/issues.schemas.ts
apps/projects-api/src/modules/issues/issues.serializers.ts
apps/projects-api/src/modules/issues/index.ts
apps/projects-api/src/modules/issues/__tests__/issues.test.ts

apps/projects-api/src/modules/labels/labels.routes.ts
apps/projects-api/src/modules/labels/labels.controller.ts
apps/projects-api/src/modules/labels/labels.service.ts
apps/projects-api/src/modules/labels/labels.repository.ts
apps/projects-api/src/modules/labels/labels.schemas.ts
apps/projects-api/src/modules/labels/labels.serializers.ts
apps/projects-api/src/modules/labels/index.ts
apps/projects-api/src/modules/labels/__tests__/labels.test.ts

apps/projects-api/src/modules/comments/comments.routes.ts
apps/projects-api/src/modules/comments/comments.controller.ts
apps/projects-api/src/modules/comments/comments.service.ts
apps/projects-api/src/modules/comments/comments.repository.ts
apps/projects-api/src/modules/comments/comments.schemas.ts
apps/projects-api/src/modules/comments/comments.serializers.ts
apps/projects-api/src/modules/comments/index.ts
apps/projects-api/src/modules/comments/__tests__/comments.test.ts
```

One file to **edit**: `apps/projects-api/src/http/routes.ts`, to mount the new
routers. Change nothing else in it.

---

## 2. Routes

All mounted under `/v1/organizations/:organizationId`, all guarded **per route**
by the existing internal-key guard (never `router.use`).

### issues — `/issues`

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/` | filters, §3 |
| `POST` | `/` | create, §4 |
| `GET` | `/:issueRef` | **id or identifier**, §5 |
| `PATCH` | `/:issueRef` | update, §6 |
| `DELETE` | `/:issueRef` | soft delete (`deletedAt`); hard only when `DELETION_MODE === 'hard'`. Returns `{ object: 'projects.issue', id, deleted: true }` |
| `GET` | `/:issueRef/events` | the issue's `IssueEvent` rows, newest first |

### comments — `/issues/:issueRef/comments`

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/` | oldest first, cursor paginated |
| `POST` | `/` | body `{ body: string (1..10000), authorUserId?: string }` |
| `PATCH` | `/:commentId` | body `{ body }` |
| `DELETE` | `/:commentId` | soft delete |

Mount the comments router **inside** the issues router (or as a separate mount
that resolves `:issueRef` the same way) so `:issueRef` resolution is shared and
identical. Whichever you choose, an unknown `issueRef` must return
`projects/issue-not-found`.

### labels — `/labels`

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/` | all tenant labels, name ascending |
| `POST` | `/` | body `{ name (1..60), color?, description? }` |
| `PATCH` | `/:labelId` | partial |
| `DELETE` | `/:labelId` | hard delete; the `IssueLabel` join rows cascade |

---

## 3. Issue list filters

Query parameters, all optional, validated with Zod and **coerced from strings**
(they arrive as strings on the query):

| Param | Behaviour |
| --- | --- |
| `project` | project id **or** project key (e.g. `CONSOLE`), case-insensitive on the key |
| `status` | one status, or a comma-separated list — `status=todo,in-progress` |
| `priority` | one priority, or a comma-separated list |
| `assignee` | user id; the literal `none` matches issues with no assignee |
| `label` | label id or label name; repeatable/comma-separated, matching **any** of them |
| `parent` | parent issue id; the literal `none` matches top-level issues only |
| `q` | case-insensitive substring across `title`, `identifier`, and `description` |
| `updated_since` | Unix seconds; returns issues with `updatedAt >= value` |
| `include_deleted` | default `false` — soft-deleted issues are excluded |
| `order` | `manual` (position asc, then createdAt) \| `updated` (updatedAt desc, the **default**) \| `created` (createdAt desc) \| `priority` (urgent→none, then updatedAt desc) |
| `limit` | default 25, **max 100** |
| `starting_after` / `ending_before` | cursor pagination by issue id, matching how the `projects` module already does it |

`updated_since` and `order=updated` exist so an agent can ask "what changed since
I last looked" in one request. Get them right.

**Every query is scoped by `tenantId`.** A query that is not tenant-scoped is a
security defect, not a style issue.

---

## 4. Issue create

Body (Zod strict object):

```ts
{
  projectId?: string,        // project id or key; when absent, the tenant's Triage project
  title: string (1..300),
  description?: string | null,
  status?: 'backlog'|'todo'|'in-progress'|'in-review'|'done'|'canceled',   // default 'todo'
  priority?: 'none'|'low'|'medium'|'high'|'urgent',                        // default 'none'
  assigneeUserId?: string | null,
  creatorUserId?: string | null,
  parentIssueId?: string | null,
  estimate?: number | null,   // integer 0..100
  dueDate?: number | null,    // Unix seconds
  labelIds?: string[],        // label ids or names; unknown names are created
  position?: number,
}
```

### 4.1 Identifier allocation — the part that must be correct

The identifier is `${project.key}-${number}`, where `number` comes from the
project's `nextIssueNumber`.

Allocate it **inside a Prisma interactive transaction**:

1. Read the project row for update.
2. Take `number = project.nextIssueNumber`.
3. Increment the project's `nextIssueNumber` by 1.
4. Create the issue with that `number` and the composed `identifier`.

All four steps in one transaction. Two concurrent creates must never receive the
same number — the `@@unique([projectId, number])` constraint is the backstop, and
if you catch a unique-violation you may retry **once** before returning an error.
Do not allocate the number outside the transaction.

### 4.2 On create, also write an `IssueEvent`

`{ type: 'created', actorUserId: creatorUserId, fromValue: null, toValue: identifier }`,
in the same transaction.

---

## 5. `:issueRef` resolution

`:issueRef` is either an issue **id** (starts with the `iss_` prefix) or an
**identifier** (`CONSOLE-12`). Resolve it as:

- if it matches the issue-id prefix → look up by id, scoped to the tenant;
- otherwise → uppercase it and look up by `(tenantId, identifier)`.

Not found → `projects/issue-not-found`. An issue belonging to a **different**
tenant must also return `projects/issue-not-found`, never a 403 and never the row.

---

## 6. Issue update, and the events it writes

Every field in §4's body is optional on `PATCH`, plus `labelIds` **replaces** the
issue's label set when supplied (absent means leave labels alone; `[]` means
clear them).

Status transitions also maintain the timestamp columns:

| New status | Also set |
| --- | --- |
| `in-progress` | `startedAt` = now, **if it is currently null** |
| `done` | `completedAt` = now; `canceledAt` = null |
| `canceled` | `canceledAt` = now; `completedAt` = null |
| anything else, from `done` or `canceled` | `completedAt` = null, `canceledAt` = null |

Write one `IssueEvent` **per changed field**, in the same transaction as the
update, only when the value actually changed:

| Change | `type` | `fromValue` → `toValue` |
| --- | --- | --- |
| status | `status-changed` | old → new |
| priority | `priority-changed` | old → new |
| assignee set | `assigned` | old assignee (or null) → new |
| assignee cleared | `unassigned` | old → null |
| project changed | `project-changed` | old project id → new |
| label added | `labeled` | null → label id |
| label removed | `unlabeled` | label id → null |
| status → `done` from anything else | also `closed` | old status → `done` |
| status leaves `done`/`canceled` | also `reopened` | old status → new |

A `PATCH` that changes nothing writes no events.

**Moving an issue to another project does not change its identifier.** The
identifier is allocated once, at creation, and is stable for the issue's life.
This is deliberate — do not re-derive it on move.

---

## 7. Serialized shapes

```ts
{
  object: 'projects.issue',
  id, tenantId, projectId, projectKey, number, identifier,
  title, description, status, priority,
  assigneeUserId, creatorUserId, parentIssueId,
  estimate, dueDate, position,
  labels: [{ object: 'projects.label', id, name, color, description, createdAt, updatedAt }],
  commentCount: number,
  subIssueCount: number,
  startedAt, completedAt, canceledAt, createdAt, updatedAt,
}

{ object: 'projects.label',   id, tenantId, name, color, description, createdAt, updatedAt }
{ object: 'projects.comment', id, tenantId, issueId, authorUserId, body, createdAt, updatedAt }
{ object: 'projects.issue_event', id, issueId, actorUserId, type, fromValue, toValue, createdAt }
```

Every `BigInt` becomes a JSON `number`. `deletedAt` is **not** serialized.

List responses use the same list envelope the `projects` module already uses:
`{ object: 'list', data, has_more, url, total_count }`.

**Do not issue one query per issue to compute `labels`, `commentCount`, or
`subIssueCount`.** Batch them: one grouped query for counts across the page, one
query for the labels of the whole page. A per-row query is an N+1 and will be
rejected in review.

---

## 8. Non-negotiable rules

1. **Errors are values, not throws.** Services return
   `{ data, error: null } | { data: null, error }`. Never `throw` for an expected
   failure. Match the `projects` module exactly.
2. **`httpStatus` never reaches client JSON.**
3. **Only `*.repository.ts` imports Prisma.**
4. **Controllers contain no business rules; services import no Express types.**
5. **Guards attach per route**, never `router.use`.
6. **Every query is tenant-scoped.**
7. **No `as any`, `eslint-disable`, `@ts-ignore`, `@ts-expect-error`.**
8. **Unix seconds as `BigInt` in the DB, `number` in JSON.** No `DateTime`.
9. **No comment that restates the code.** Comments explain *why* only.
10. Do not change any file in `modules/tenants/` or `modules/projects/`, other
    than `http/routes.ts` to mount your routers.

---

## 9. Tests

Vitest, colocated in `__tests__/`, matching the style Phase 1 established. Mock
the repository layer; do **not** connect to a database.

**Minimum 34 `it()` cases total.** Required coverage:

*issues (minimum 22)*
- create allocates `identifier` as `KEY-N` from the project's `nextIssueNumber`
- create increments `nextIssueNumber` and does both inside one transaction
  (assert the transaction callback was used, not two loose calls)
- create falls back to the tenant's Triage project when `projectId` is absent
- create accepts a project **key** as well as a project id
- create writes a `created` IssueEvent
- create defaults status to `todo` and priority to `none`
- create returns `projects/project-not-found` for an unknown project
- retrieve resolves an `iss_`-prefixed ref by id
- retrieve resolves `CONSOLE-12` by identifier, case-insensitively
- retrieve returns `projects/issue-not-found` for an issue in another tenant
  (assert the complete error object)
- list defaults `order` to `updated` and `limit` to 25
- list caps `limit` at 100
- list applies `updated_since` as `updatedAt >= value`
- list parses a comma-separated `status` into an `in` filter
- list treats `assignee=none` as "no assignee"
- list treats `parent=none` as "top level only"
- list excludes soft-deleted issues by default
- list scopes by `tenantId` (assert the exact repository call arguments)
- update to `in-progress` sets `startedAt` only when it was null
- update to `done` sets `completedAt` and clears `canceledAt`
- update writes one event per changed field and **no** events when nothing changed
- moving an issue to another project leaves `identifier` unchanged
- delete soft-deletes by default and hard-deletes when `DELETION_MODE === 'hard'`

*labels (minimum 6)*
- create rejects a duplicate name with `projects/label-name-taken` (complete error object)
- create defaults the colour
- list is tenant-scoped and name-ascending
- update applies only supplied fields
- update of an unknown label returns `projects/label-not-found`
- delete removes the label

*comments (minimum 6)*
- create attaches to the resolved issue and returns the complete serialized shape
- create against an unknown issue returns `projects/issue-not-found` and does
  **not** call the comment repository (`not.toHaveBeenCalled()`)
- list is issue-scoped, oldest first
- update of an unknown comment returns `projects/comment-not-found`
- delete soft-deletes
- a soft-deleted comment does not appear in the list

Assertion quality — requirements, not suggestions:
- assert **both** `data` and `error` on every result;
- assert the **complete** error object (`code`, `message`, `httpStatus`);
- use `toHaveBeenCalledWith(...)` with exact arguments, never bare
  `toHaveBeenCalled()`;
- assert `not.toHaveBeenCalled()` wherever a guard should stop work;
- `expect(x).toBeDefined()` as a test's only assertion is a failed test.

---

## 10. Do NOT

- Do NOT create, switch, rebase, merge, or delete any git branch.
- Do NOT run `git commit`, `git add`, or `git push`.
- Do NOT modify any file outside `apps/projects-api/`, and inside it modify only
  the files listed in §1 plus `src/http/routes.ts`.
- Do NOT change the Prisma schema or add a migration. The schema is already
  correct; if you believe it is not, **say so in your report** rather than
  editing it.
- Do NOT run `prisma migrate dev`, `prisma db push`, or anything needing a live
  database.
- Do NOT run `pnpm install` or add dependencies.
- Do NOT write `eslint-disable`, `as any`, `@ts-ignore`, or `@ts-expect-error`.
- Do NOT write documentation files.

---

## 11. Verify before you report

```bash
cd /root/projects/876
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test
```

Report the real output. If you could not run a command, say so plainly rather
than claiming it passed.

---

## 12. Report

Write to
`plans/2026-09-03-876-projects/reports/agy/2026-09-03-phase2-issues-labels-comments.md`:

1. Every file created or changed, with a one-line reason.
2. The **counted** number of `it()` cases per test file.
3. How you implemented identifier allocation, and why it is race-safe.
4. How you avoided an N+1 for labels and counts on the issue list.
5. The exact output of each command in §11, or an explicit statement that you
   could not run it.
6. Anything you could not do, and why.
