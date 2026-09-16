# Brief — Phase 1: `apps/projects-api` foundation

You are implementing **Phase 1** of 876 Projects, a new Express 5 + Prisma 7
backend service in the 876 monorepo. Read `plans/2026-09-03-876-projects/plan.md`
first — it is the authority on scope, naming, ports, and the data model.

**Repository root:** `/root/projects/876`
**Branch:** `feat/876-projects` (already checked out — do NOT create, switch, or
merge any branch, and do NOT commit. The orchestrator commits.)

---

## 0. The single most important instruction

**Copy `apps/crm-api` exactly.** It is the reference implementation for every
convention this service must follow — module layout, error-as-value contract,
result envelopes, internal-key auth, Prisma layout, tsup build, test setup.

Before writing any file, read these and mirror their structure:

| Read this | To learn |
| --- | --- |
| `apps/crm-api/package.json` | dependency set, scripts, tsup/prisma wiring |
| `apps/crm-api/tsconfig.json`, `eslint.config.mjs`, `tsup.config.ts`, `vitest.config.ts` | build/lint/test config |
| `apps/crm-api/scripts/prisma-generate.mjs` | the generate script `typecheck`/`prebuild` call |
| `apps/crm-api/src/server.ts`, `src/application.ts`, `src/index.ts` | server bootstrap |
| `apps/crm-api/src/db/index.ts` | Prisma client + `disconnectDb` |
| `apps/crm-api/src/platform/` (logger, ids, timestamps) | logging, ID generation, Unix seconds |
| `apps/crm-api/src/http/` (errors, error-handler, result, internal-auth, routes, middleware/request-context) | the HTTP spine |
| `apps/crm-api/src/modules/tenants/*` | a complete module, every layer |
| `apps/crm-api/src/modules/teams/*` | a complete CRUD module with list/pagination |
| `apps/crm-api/prisma/schema/*.prisma`, `apps/crm-api/prisma/schema.prisma` | multi-file schema layout |
| `apps/crm-api/prisma/migrations/` (newest one) | migration SQL style |

Where this brief and `apps/crm-api` disagree, **this brief wins**. Where this
brief is silent, **do exactly what `apps/crm-api` does.**

---

## 1. What you are building

`apps/projects-api` — the 876 Projects backend. Port **4030**. Package name
**`@876/projects-api`**.

In Phase 1 you build: the service scaffold, the complete Prisma schema for the
whole domain, the initial migration SQL, and **two modules — `tenants` and
`projects`**. Issues, labels, comments and events are Phase 2; their Prisma
models ship now but their modules do not.

---

## 2. Files to create

Create every file in this table. Paths are relative to the repo root.

| # | Path | Contents |
| --- | --- | --- |
| 1 | `apps/projects-api/package.json` | Copy `apps/crm-api/package.json`. Change `name` → `@876/projects-api`, `description` → `876 Projects Express API`. Dependencies: **keep** `@876/core`, `@prisma/adapter-pg`, `@prisma/client`, `compression`, `cors`, `express`, `helmet`, `pino`, `pg`, `zod` at the **same versions**. **Remove** `@876/billing`, `@876/crm`, `@876/work`. Keep all devDependencies at the same versions. Keep every script identical. |
| 2 | `apps/projects-api/tsconfig.json` | Copy from crm-api verbatim. |
| 3 | `apps/projects-api/eslint.config.mjs` | Copy from crm-api verbatim. |
| 4 | `apps/projects-api/tsup.config.ts` | Copy from crm-api verbatim. |
| 5 | `apps/projects-api/vitest.config.ts` | Copy from crm-api verbatim. |
| 6 | `apps/projects-api/scripts/prisma-generate.mjs` | Copy from crm-api verbatim. |
| 7 | `apps/projects-api/.gitignore` | Copy from crm-api verbatim. |
| 8 | `apps/projects-api/.env.example` | See §5. |
| 9 | `apps/projects-api/prisma/schema.prisma` | datasource + generator, mirroring crm-api's. `provider = "postgresql"`, `url = env("PROJECTS_DATABASE_URL")`, `directUrl = env("PROJECTS_DIRECT_DATABASE_URL")`. Generator output must match crm-api's convention (`../src/db/generated`). |
| 10 | `apps/projects-api/prisma/schema/tenant.prisma` | §3 |
| 11 | `apps/projects-api/prisma/schema/project.prisma` | §3 |
| 12 | `apps/projects-api/prisma/schema/issue.prisma` | §3 |
| 13 | `apps/projects-api/prisma/schema/label.prisma` | §3 |
| 14 | `apps/projects-api/prisma/migrations/20260903000000_init/migration.sql` | §4 — hand-written SQL. Do NOT run `prisma migrate dev`; there is no database. |
| 15 | `apps/projects-api/prisma/migrations/migration_lock.toml` | Copy crm-api's verbatim. |
| 16 | `apps/projects-api/src/server.ts` | Copy crm-api's. Change default port `4010` → `4030`, service name → `projects-api`. |
| 17 | `apps/projects-api/src/application.ts` | Copy crm-api's. `/health` returns `{ data: { status: 'ok', service: 'projects-api' } }`. |
| 18 | `apps/projects-api/src/index.ts` | Copy crm-api's. |
| 19 | `apps/projects-api/src/db/index.ts` | Copy crm-api's, reading `PROJECTS_DATABASE_URL`. |
| 20 | `apps/projects-api/src/platform/logger.ts` | Copy crm-api's. |
| 21 | `apps/projects-api/src/platform/ids.ts` | Copy crm-api's, then set the ID prefix map to §6. |
| 22 | `apps/projects-api/src/platform/timestamps.ts` | Copy crm-api's verbatim. |
| 23 | `apps/projects-api/src/http/errors.ts` | Copy crm-api's structure; replace the CRM error catalog with §7's. |
| 24 | `apps/projects-api/src/http/error-handler.ts` | Copy crm-api's verbatim (adjust imports). |
| 25 | `apps/projects-api/src/http/result.ts` | Copy crm-api's verbatim (adjust imports). |
| 26 | `apps/projects-api/src/http/internal-auth.ts` | Copy crm-api's; read `PROJECTS_INTERNAL_KEY`. |
| 27 | `apps/projects-api/src/http/middleware/request-context.ts` | Copy crm-api's verbatim. |
| 28 | `apps/projects-api/src/http/routes.ts` | Mount `/v1/tenants` and `/v1/organizations/:organizationId/projects`. |
| 29 | `apps/projects-api/src/modules/tenants/tenants.{routes,controller,service,repository,schemas,serializers}.ts` + `index.ts` | §8 |
| 30 | `apps/projects-api/src/modules/projects/projects.{routes,controller,service,repository,schemas,serializers}.ts` + `index.ts` | §9 |
| 31 | `apps/projects-api/src/modules/tenants/__tests__/tenants.test.ts` | §11 |
| 32 | `apps/projects-api/src/modules/projects/__tests__/projects.test.ts` | §11 |
| 33 | `apps/projects-api/src/test/setup.ts` | Copy crm-api's if it exists; otherwise omit and match crm-api's vitest config. |

---

## 3. Prisma schema

All tables prefixed `projects_`. Physical columns snake_case via `@map`;
application fields camelCase. **All timestamps are `BigInt` Unix seconds** —
never `DateTime`. IDs are `String` (application-generated, see §6).

Enum-like columns are `String` in Prisma (Postgres `TEXT` + CHECK constraint in
the migration SQL) — **do not use Prisma `enum`**.

### `tenant.prisma`
```prisma
model Tenant {
  id              String   @id
  organizationId  String   @unique @map("organization_id")
  triageProjectId String?  @map("triage_project_id")
  createdAt       BigInt   @map("created_at")
  updatedAt       BigInt   @map("updated_at")

  projects Project[]
  issues   Issue[]
  labels   Label[]
  comments Comment[]
  events   IssueEvent[]

  @@map("projects_tenants")
}
```

### `project.prisma`
```prisma
model Project {
  id              String  @id
  tenantId        String  @map("tenant_id")
  name            String
  key             String                       // issue prefix, e.g. "CONSOLE"
  slug            String
  description     String?
  leadUserId      String? @map("lead_user_id")
  status          String  @default("planned")  // planned|active|paused|completed|canceled
  health          String  @default("on-track") // on-track|at-risk|off-track
  startDate       BigInt? @map("start_date")
  targetDate      BigInt? @map("target_date")
  nextIssueNumber Int     @default(1) @map("next_issue_number")
  customerId      String? @map("customer_id")  // opaque billing customer registry id
  position        Int     @default(0)
  archivedAt      BigInt? @map("archived_at")
  createdAt       BigInt  @map("created_at")
  updatedAt       BigInt  @map("updated_at")

  tenant  Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  members ProjectMember[]
  issues  Issue[]

  @@unique([tenantId, key])
  @@unique([tenantId, slug])
  @@index([tenantId, status])
  @@map("projects_projects")
}

model ProjectMember {
  id        String @id
  projectId String @map("project_id")
  userId    String @map("user_id")
  role      String @default("member")  // lead|member|viewer
  createdAt BigInt @map("created_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@index([userId])
  @@map("projects_project_members")
}
```

### `issue.prisma`
```prisma
model Issue {
  id             String  @id
  tenantId       String  @map("tenant_id")
  projectId      String  @map("project_id")
  number         Int
  identifier     String                        // "CONSOLE-12"
  title          String
  description    String?
  status         String  @default("todo")      // backlog|todo|in-progress|in-review|done|canceled
  priority       String  @default("none")      // none|low|medium|high|urgent
  assigneeUserId String? @map("assignee_user_id")
  creatorUserId  String? @map("creator_user_id")
  parentIssueId  String? @map("parent_issue_id")
  estimate       Int?
  dueDate        BigInt? @map("due_date")
  position       Int     @default(0)
  startedAt      BigInt? @map("started_at")
  completedAt    BigInt? @map("completed_at")
  canceledAt     BigInt? @map("canceled_at")
  deletedAt      BigInt? @map("deleted_at")
  createdAt      BigInt  @map("created_at")
  updatedAt      BigInt  @map("updated_at")

  tenant   Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  project  Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parent   Issue?       @relation("IssueSubIssues", fields: [parentIssueId], references: [id], onDelete: SetNull)
  children Issue[]      @relation("IssueSubIssues")
  labels   IssueLabel[]
  comments Comment[]
  events   IssueEvent[]

  @@unique([tenantId, identifier])
  @@unique([projectId, number])
  @@index([tenantId, status])
  @@index([tenantId, assigneeUserId])
  @@index([tenantId, updatedAt])
  @@index([projectId, status])
  @@map("projects_issues")
}

model Comment {
  id           String  @id
  tenantId     String  @map("tenant_id")
  issueId      String  @map("issue_id")
  authorUserId String? @map("author_user_id")
  body         String
  deletedAt    BigInt? @map("deleted_at")
  createdAt    BigInt  @map("created_at")
  updatedAt    BigInt  @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  issue  Issue  @relation(fields: [issueId], references: [id], onDelete: Cascade)

  @@index([issueId, createdAt])
  @@map("projects_comments")
}

model IssueEvent {
  id          String  @id
  tenantId    String  @map("tenant_id")
  issueId     String  @map("issue_id")
  actorUserId String? @map("actor_user_id")
  type        String
  fromValue   String? @map("from_value")
  toValue     String? @map("to_value")
  createdAt   BigInt  @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  issue  Issue  @relation(fields: [issueId], references: [id], onDelete: Cascade)

  @@index([issueId, createdAt])
  @@map("projects_issue_events")
}
```

### `label.prisma`
```prisma
model Label {
  id          String  @id
  tenantId    String  @map("tenant_id")
  name        String
  color       String  @default("#6b7280")
  description String?
  createdAt   BigInt  @map("created_at")
  updatedAt   BigInt  @map("updated_at")

  tenant Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  issues IssueLabel[]

  @@unique([tenantId, name])
  @@map("projects_labels")
}

model IssueLabel {
  issueId String @map("issue_id")
  labelId String @map("label_id")

  issue Issue @relation(fields: [issueId], references: [id], onDelete: Cascade)
  label Label @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@id([issueId, labelId])
  @@index([labelId])
  @@map("projects_issue_labels")
}
```

---

## 4. Migration SQL

Write `apps/projects-api/prisma/migrations/20260903000000_init/migration.sql` by
hand. It must create every table above with exactly the mapped physical names,
plus every unique index, index, and foreign key. In addition, add a **CHECK
constraint** for each enum-like column, so an invalid value cannot be stored:

```sql
ALTER TABLE "projects_projects" ADD CONSTRAINT "projects_projects_status_check"
  CHECK ("status" IN ('planned','active','paused','completed','canceled'));
ALTER TABLE "projects_projects" ADD CONSTRAINT "projects_projects_health_check"
  CHECK ("health" IN ('on-track','at-risk','off-track'));
ALTER TABLE "projects_project_members" ADD CONSTRAINT "projects_project_members_role_check"
  CHECK ("role" IN ('lead','member','viewer'));
ALTER TABLE "projects_issues" ADD CONSTRAINT "projects_issues_status_check"
  CHECK ("status" IN ('backlog','todo','in-progress','in-review','done','canceled'));
ALTER TABLE "projects_issues" ADD CONSTRAINT "projects_issues_priority_check"
  CHECK ("priority" IN ('none','low','medium','high','urgent'));
```

`BigInt` columns are `BIGINT NOT NULL` (or nullable where the model says `?`).
`Int` columns are `INTEGER`. `String` is `TEXT`.

**Do not run any prisma CLI command that needs a database connection.**

---

## 5. `.env.example`

```
PORT=4030  # optional — defaults to 4030; the host sets it in production
ENVIRONMENT=development
LOG_LEVEL=info

# Neon pooled connection for the 876 Projects database.
PROJECTS_DATABASE_URL=

# Neon direct (non-pooled) endpoint — migrations only, used by CI.
PROJECTS_DIRECT_DATABASE_URL=

# Operator/service credential. Every /v1 route requires it as x-internal-key.
# When empty, every /v1 route rejects — the service fails closed.
PROJECTS_INTERNAL_KEY=

# optional — 'hard' allows destructive deletes in development only
DELETION_MODE=
```

---

## 6. ID prefixes

Follow crm-api's `platform/ids.ts` generator exactly; only the prefix map changes:

| Entity | Prefix |
| --- | --- |
| tenant | `prjten_` |
| project | `prj_` |
| projectMember | `prjmem_` |
| issue | `iss_` |
| label | `lbl_` |
| comment | `cmt_` |
| issueEvent | `isev_` |

---

## 7. Error catalog (`src/http/errors.ts`)

Namespaced kebab-case codes, mirroring crm-api's registry shape. Each entry has
a `code`, a user-safe `message`, and an `httpStatus`.

| code | httpStatus | message |
| --- | --- | --- |
| `projects/tenant-not-found` | 404 | This organization does not have a 876 Projects workspace. |
| `projects/project-not-found` | 404 | The project could not be found. |
| `projects/project-key-taken` | 409 | Another project already uses that key. |
| `projects/project-slug-taken` | 409 | Another project already uses that name. |
| `projects/invalid-project-key` | 400 | A project key must be 2 to 10 uppercase letters or digits. |
| `projects/issue-not-found` | 404 | The issue could not be found. |
| `projects/label-not-found` | 404 | The label could not be found. |
| `projects/label-name-taken` | 409 | Another label already uses that name. |
| `projects/comment-not-found` | 404 | The comment could not be found. |
| `projects/member-not-found` | 404 | That person is not a member of this project. |
| `projects/member-exists` | 409 | That person is already a member of this project. |
| `projects/invalid-request` | 400 | The request could not be processed. |
| `projects/unauthorized` | 401 | This request is missing valid credentials. |
| `projects/internal-error` | 500 | Something went wrong. Please try again. |

Also add the four issue/label/comment/member codes even though their modules
arrive in Phase 2 — the catalog is one file and adding them now avoids a second
edit.

---

## 8. `tenants` module

Routes, all guarded per-route by the internal-key guard (never `router.use`):

- `POST /v1/tenants/ensure` — body `{ organizationId: string }`. **Idempotent.**
  If a tenant exists for that organization, return it unchanged (200). If not,
  create the tenant **and its Triage project** in one transaction, set
  `tenant.triageProjectId`, and return 201. The Triage project is
  `{ name: 'Triage', key: 'TRI', slug: 'triage', status: 'active' }`.
- `GET /v1/tenants/:organizationId` — retrieve, or `projects/tenant-not-found`.

Serialized shape:
```ts
{ object: 'projects.tenant', id, organizationId, triageProjectId, createdAt, updatedAt }
```

---

## 9. `projects` module

Mounted at `/v1/organizations/:organizationId/projects`. Every handler resolves
the tenant from `organizationId` first and scopes every query by `tenantId` —
**a query that is not tenant-scoped is a security defect.**

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/` | filters: `status`, `lead`, `q` (name contains, case-insensitive), `include_archived` (default false). Cursor pagination `limit` (default 25, max 100), `starting_after`, `ending_before`. |
| `POST` | `/` | body §9.1 |
| `GET` | `/:projectId` | |
| `PATCH` | `/:projectId` | partial; every field in §9.1 optional |
| `DELETE` | `/:projectId` | **archive** — sets `archivedAt`; returns `{ object: 'projects.project', id, deleted: true }`. Hard-delete only when `DELETION_MODE === 'hard'`. |
| `GET` | `/:projectId/members` | list |
| `POST` | `/:projectId/members` | body `{ userId, role? }`; `projects/member-exists` on conflict |
| `DELETE` | `/:projectId/members/:userId` | `projects/member-not-found` when absent |

### 9.1 Create/update body (Zod, strict object)

```ts
{
  name: string (1..120),
  key?: string,            // uppercase A-Z0-9, 2..10; derived from name when absent
  description?: string | null,
  leadUserId?: string | null,
  status?: 'planned'|'active'|'paused'|'completed'|'canceled',
  health?: 'on-track'|'at-risk'|'off-track',
  startDate?: number | null,   // Unix seconds
  targetDate?: number | null,
  customerId?: string | null,
  position?: number,
}
```

Key derivation when `key` is absent: uppercase the name, strip non-alphanumerics,
take the first 6 characters; if that collides with an existing key in the tenant,
append `2`, `3`, … until free. Reject an explicitly supplied key that fails the
pattern with `projects/invalid-project-key`; reject a colliding explicit key with
`projects/project-key-taken`.

Slug: kebab-case of the name, uniquified the same way.

### 9.2 Serialized shape

```ts
{
  object: 'projects.project',
  id, tenantId, name, key, slug, description,
  leadUserId, status, health, startDate, targetDate,
  nextIssueNumber, customerId, position, archivedAt, createdAt, updatedAt,
  memberCount: number,
}
```

List responses use the platform list envelope:
`{ object: 'list', data: [...], has_more: boolean, url: string, total_count: number | null }`.

Member shape: `{ object: 'projects.project-member', id, projectId, userId, role, createdAt }`.

---

## 10. Non-negotiable rules

1. **Errors are values, not throws.** Services return
   `{ data, error: null } | { data: null, error }`. Controllers translate to HTTP.
   Copy `apps/crm-api`'s value contract exactly. Never `throw` for an expected
   failure such as not-found or a conflict.
2. **`httpStatus` never reaches client JSON.** It selects the HTTP status only.
3. **Only `*.repository.ts` imports Prisma.** Controllers must not; services must not.
4. **Controllers never import Prisma and never contain business rules.**
5. **Services never import Express types.**
6. **Guards attach per route.** Never `router.use(requireInternalKey)`.
7. **No `as any`, no `eslint-disable`, no `@ts-ignore`, no `@ts-expect-error`.**
   If types do not fit, fix the types.
8. **No `DateTime` anywhere.** Unix seconds as `BigInt` in the DB, `number` in JSON.
   Convert `BigInt → Number` in serializers.
9. **Zod is the single contract source** for request validation and response types.
10. **No comment that restates the code.** Comments explain *why* only.

---

## 11. Tests

Vitest, colocated in `__tests__/`, following `apps/crm-api`'s existing test style.
Mock the repository layer; do **not** connect to a database.

**Minimum 24 `it()` cases across the two module test files.** Required coverage:

*tenants*
- ensure creates a tenant and a Triage project when none exists
- ensure is idempotent — an existing tenant is returned unchanged and nothing is created
- ensure sets `triageProjectId` to the created Triage project's id
- retrieve returns the serialized tenant with the exact full shape
- retrieve returns `projects/tenant-not-found` (asserting the complete error object) when absent
- the serializer converts every `BigInt` timestamp to `number`

*projects*
- create derives a key from the name when none is supplied
- create uniquifies a derived key that collides
- create rejects an explicit invalid key with `projects/invalid-project-key`
- create rejects an explicit colliding key with `projects/project-key-taken`
- create defaults `status` to `planned` and `health` to `on-track`
- create returns the complete serialized shape including `memberCount: 0`
- list scopes the query by `tenantId` (assert the repository was called with it)
- list applies the `status` filter and omits archived projects by default
- list includes archived projects when `include_archived` is true
- list caps `limit` at 100
- retrieve returns `projects/project-not-found` for an unknown id
- retrieve returns `projects/project-not-found` for a project belonging to another tenant
- update applies only the supplied fields
- update returns `projects/project-not-found` for an unknown id
- delete archives by default and returns the tombstone shape
- delete hard-deletes when `DELETION_MODE === 'hard'`
- adding a member returns `projects/member-exists` on a duplicate
- removing an absent member returns `projects/member-not-found`

Assertion quality — these are requirements, not suggestions:
- Assert **both** `data` and `error` on every result.
- Assert the **complete** error object (`code`, `message`, `httpStatus`), never
  just the code.
- Assert exact call arguments with `toHaveBeenCalledWith(...)`, not
  `toHaveBeenCalled()`.
- Where a guard should stop work, assert the downstream repository was
  `not.toHaveBeenCalled()`.
- `expect(x).toBeDefined()` as a test's only assertion is a failed test. Do not write one.

---

## 12. Do NOT

- Do NOT create, switch, rebase, merge, or delete any git branch.
- Do NOT run `git commit`, `git add`, or `git push`.
- Do NOT open a pull request.
- Do NOT modify **any** file outside `apps/projects-api/`. In particular do not
  touch `pnpm-workspace.yaml`, the root `package.json`, `apps/crm-api/`,
  `packages/`, or any other app. The orchestrator handles workspace wiring.
- Do NOT run `prisma migrate dev`, `prisma db push`, or anything else needing a
  live database. Write the migration SQL by hand.
- Do NOT run `pnpm install`.
- Do NOT add dependencies beyond those listed in §2 row 1.
- Do NOT write `eslint-disable`, `as any`, `@ts-ignore`, or `@ts-expect-error`.
- Do NOT implement issues, labels, comments, or issue events modules. Their
  Prisma models and error codes ship in this phase; their HTTP modules do not.
- Do NOT write a `README.md` or any documentation file.

---

## 13. Verify before you report

Run these and report the real output. If a command is unavailable to you, say so
plainly rather than claiming it passed.

```bash
cd /root/projects/876
npx prisma validate --schema apps/projects-api/prisma/schema   # schema is well-formed
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test
```

`typecheck` will need the Prisma client generated; the `typecheck` script already
calls `scripts/prisma-generate.mjs`, which does not need a database.

If `pnpm --filter` fails because the workspace has not picked the package up yet,
report that as a known orchestrator step rather than editing `pnpm-workspace.yaml`.

---

## 14. Report

Write your report to
`plans/2026-09-03-876-projects/reports/agy/2026-09-03-phase1-projects-api-foundation.md`
containing:

1. A table of every file you created, with a one-line reason.
2. The **counted** number of `it()` cases you wrote, per test file.
3. The exact output of each verification command in §13, or an explicit statement
   that you could not run it.
4. Any decision the brief did not settle, and what you chose.
5. Anything you could not do, and why. A truthful "not done" is worth far more
   than a confident claim that turns out to be false.
