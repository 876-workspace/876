# Phase 2 Report: `issues`, `labels`, `comments` Modules

- **Run ID:** `2026-09-03-876-projects`
- **Phase:** 2 — `issues`, `labels`, `comments` modules
- **Branch:** `feat/876-projects`
- **Delegate:** `agy` on Gemini 3.8 Flash (High)
- **Status:** Complete ✅

---

## 1. Created and Changed Files

### Files Created

| File Path | Purpose |
| --- | --- |
| `apps/projects-api/src/modules/issues/issues.routes.ts` | Express router mounting issue CRUD endpoints (`/`, `/:issueRef`, `/:issueRef/events`) and delegating nested comments router (`/:issueRef/comments`) with per-route `requireInternalKey` guards. |
| `apps/projects-api/src/modules/issues/issues.controller.ts` | HTTP controller parsing params, query filters, and bodies using Zod schemas and dispatching to issues service. |
| `apps/projects-api/src/modules/issues/issues.service.ts` | Core issue business logic implementing tenant-scoped filtering, atomic identifier allocation within interactive transactions, audit events, status transition timestamps, moving issues across projects, and deletion. |
| `apps/projects-api/src/modules/issues/issues.repository.ts` | Database repository isolating Prisma queries for issues, transaction execution with row-level locks, audit event creation, soft/hard deletion, and batch enrichment. |
| `apps/projects-api/src/modules/issues/issues.schemas.ts` | Zod validation schemas for issue parameters, query filters, creation, and update payloads. |
| `apps/projects-api/src/modules/issues/issues.serializers.ts` | Serializers converting issue, issue event, and tombstone records to contract shapes with numeric timestamps and stripping internal fields. |
| `apps/projects-api/src/modules/issues/index.ts` | Module barrel re-exporting issue routes, services, schemas, and serializers. |
| `apps/projects-api/src/modules/issues/__tests__/issues.test.ts` | Vitest test suite for issues module covering identifier allocation, transaction callback execution, triage fallback, key lookup, status/priority defaults, `:issueRef` resolution, all list filters, status transition timestamps, event generation, move stability, and deletion. |
| `apps/projects-api/src/modules/labels/labels.routes.ts` | Express router mounting label endpoints (`/`, `/:labelId`) with per-route `requireInternalKey` guards. |
| `apps/projects-api/src/modules/labels/labels.controller.ts` | HTTP controller parsing label request params and bodies and dispatching to labels service. |
| `apps/projects-api/src/modules/labels/labels.service.ts` | Business logic for label retrieval, duplicate name prevention (`projects/label-name-taken`), default color `#6b7280` assignment, partial updates, and deletion. |
| `apps/projects-api/src/modules/labels/labels.repository.ts` | Database repository isolating Prisma queries for labels CRUD operations. |
| `apps/projects-api/src/modules/labels/labels.schemas.ts` | Zod validation schemas for label parameters, creation, and update payloads. |
| `apps/projects-api/src/modules/labels/labels.serializers.ts` | Serializers converting label and tombstone records to contract shapes with numeric timestamps. |
| `apps/projects-api/src/modules/labels/index.ts` | Module barrel re-exporting label routes, services, schemas, and serializers. |
| `apps/projects-api/src/modules/labels/__tests__/labels.test.ts` | Vitest test suite for labels module covering duplicate name rejection, default color, tenant scoping, partial updates, and deletion. |
| `apps/projects-api/src/modules/comments/comments.routes.ts` | Express router mounting comment endpoints (`/`, `/:commentId`) with per-route `requireInternalKey` guards. |
| `apps/projects-api/src/modules/comments/comments.controller.ts` | HTTP controller parsing comment request params and bodies and dispatching to comments service. |
| `apps/projects-api/src/modules/comments/comments.service.ts` | Business logic for issue-scoped comments creation, oldest-first cursor-paginated listing, updates, and soft deletion. |
| `apps/projects-api/src/modules/comments/comments.repository.ts` | Database repository isolating Prisma queries for comment pagination, retrieval, creation, updates, and soft deletion. |
| `apps/projects-api/src/modules/comments/comments.schemas.ts` | Zod validation schemas for comment parameters, cursor pagination queries, creation, and update payloads. |
| `apps/projects-api/src/modules/comments/comments.serializers.ts` | Serializers converting comment and tombstone records to contract shapes with numeric timestamps. |
| `apps/projects-api/src/modules/comments/index.ts` | Module barrel re-exporting comment routes, services, schemas, and serializers. |
| `apps/projects-api/src/modules/comments/__tests__/comments.test.ts` | Vitest test suite for comments module covering issue attachment, unknown issue handling, oldest-first listing, update, and soft deletion. |

### Files Changed

| File Path | Purpose |
| --- | --- |
| `apps/projects-api/src/http/routes.ts` | Mounted `createIssuesRouter()` at `/v1/organizations/:organizationId/issues` and `createLabelsRouter()` at `/v1/organizations/:organizationId/labels`. |

---

## 2. Test Case Counts

Every test file runs Vitest with isolated repository mocks and zero external database connections:

| Test File | Count of `it()` Cases |
| --- | --- |
| `apps/projects-api/src/modules/issues/__tests__/issues.test.ts` | **28** |
| `apps/projects-api/src/modules/labels/__tests__/labels.test.ts` | **10** |
| `apps/projects-api/src/modules/comments/__tests__/comments.test.ts` | **10** |
| `apps/projects-api/src/modules/projects/__tests__/projects.test.ts` | **21** |
| `apps/projects-api/src/modules/tenants/__tests__/tenants.test.ts` | **13** |
| **Total Projects API Test Suite** | **82** |

Phase 2 module tests count: **48** (exceeds the required minimum of 34).

---

## 3. Identifier Allocation and Race Safety

Issue identifier allocation (`${project.key}-${number}`) is implemented strictly inside a Prisma interactive transaction (`repository.transaction(async (tx) => { ... })`):

1. **Exclusive Row Lock:** `tx.getProjectForUpdate(projectId)` executes `SELECT * FROM projects_projects WHERE id = $1 FOR UPDATE`. This forces any concurrent transaction attempting to read or allocate against the same project row to wait until this transaction completes.
2. **Read Issue Counter:** Reads `number = project.nextIssueNumber` while holding the lock.
3. **Increment Counter:** Calls `tx.incrementProjectNextIssueNumber(projectId)` to advance `next_issue_number` by 1.
4. **Issue Insertion:** Creates the issue with `number` and composed `identifier = `${project.key}-${number}``.
5. **Audit Event:** Creates the initial `created` `IssueEvent` (`{ type: 'created', actorUserId, fromValue: null, toValue: identifier }`) in the same atomic transaction.
6. **Join Table:** Links any resolved labels via `tx.setLabels(issue.id, labelIds)` within the same transaction.

**Why this is race-safe:**
- The PostgreSQL `FOR UPDATE` row lock serializes concurrent transactions at the database level.
- Two concurrent transactions cannot read the same `nextIssueNumber` because the second transaction cannot acquire the row lock until the first transaction commits its increment.
- As an ultimate guarantee, the composite database constraints `@@unique([projectId, number])` and `@@unique([tenantId, identifier])` in the Prisma schema ensure that duplicate identifiers or numbers are rejected by PostgreSQL.

---

## 4. Avoiding N+1 Queries on Issue Listing

To compute `labels`, `commentCount`, and `subIssueCount` on issue list queries without N+1 overhead:

1. The list page of issues is retrieved in a single `prisma.issue.findMany` call with relation `project: { select: { key: true } }` (a single SQL join).
2. The extracted issue IDs (`issueIds = pagedRows.map(r => r.id)`) are passed to `repository.getBatchEnrichment(issueIds)`.
3. `getBatchEnrichment` executes exactly **3 batch queries** across the entire page, regardless of whether there are 1, 25, or 100 issues:
   - **Comment Counts:** `prisma.comment.groupBy({ by: ['issueId'], where: { issueId: { in: issueIds }, deletedAt: null }, _count: { id: true } })`
   - **Sub-issue Counts:** `prisma.issue.groupBy({ by: ['parentIssueId'], where: { parentIssueId: { in: issueIds }, deletedAt: null }, _count: { id: true } })`
   - **Labels:** `prisma.issueLabel.findMany({ where: { issueId: { in: issueIds } }, include: { label: true }, orderBy: { label: { name: 'asc' } } })`
4. The aggregated results are collated in memory into a map keyed by `issueId`.
5. Each issue is serialized with its pre-aggregated counts and labels in `O(1)` map lookups.

---

## 5. Verification Outputs

### Command 1: `pnpm --filter @876/projects-api typecheck`

```
$ node scripts/prisma-generate.mjs && tsc --noEmit
Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma/schema.

✔ Generated Prisma Client (7.9.1) to ./src/db/generated/prisma in 168ms
```
Exit code: `0`

### Command 2: `pnpm --filter @876/projects-api lint`

```
$ eslint src
Pages directory cannot be found at /root/projects/876/apps/projects-api/pages or /root/projects/876/apps/projects-api/src/pages. If using a custom path, please configure with the `no-html-link-for-pages` rule in your eslint config file.
```
Exit code: `0`

### Command 3: `pnpm --filter @876/projects-api test`

```
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/projects-api

 Test Files  5 passed (5)
      Tests  82 passed (82)
   Start at  02:04:18
   Duration  1.37s (transform 718ms, setup 0ms, import 1.85s, tests 638ms, environment 1ms)
```
Exit code: `0`

### Audit Check: Prohibited Keywords

Command:
```bash
grep -rn "eslint-disable\|@ts-ignore\|@ts-expect-error\|as any" apps/projects-api/src/modules apps/projects-api/src/http
```
Output:
No matches found (0 occurrences in handwritten code).

---

## 6. Exceptions or Incomplete Items

None. All 24 files across `issues`, `labels`, and `comments` plus `routes.ts` were created and verified. All 82 tests in `@876/projects-api` pass cleanly with full TypeScript and ESLint compliance.
