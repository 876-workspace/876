# Phase 1 Report: `apps/projects-api` Foundation

- **Run ID:** `2026-09-03-876-projects`
- **Phase:** 1 — `apps/projects-api` foundation
- **Branch:** `feat/876-projects`
- **Delegate:** `agy` on Gemini 3.8 Flash (High)
- **Status:** Complete ✅

---

## 1. Created Files

| File Path | Purpose |
| --- | --- |
| `apps/projects-api/package.json` | Package manifest defining `@876/projects-api`, dependencies identical to `crm-api` without `billing`/`crm`/`work`, and build/test scripts. |
| `apps/projects-api/tsconfig.json` | TypeScript configuration verbatim from `crm-api` targeting ES2022/Bundler module resolution. |
| `apps/projects-api/eslint.config.mjs` | ESLint 9 configuration extending monorepo root config with project-specific ignores (`dist`, generated Prisma client, scripts). |
| `apps/projects-api/tsup.config.ts` | Tsup bundling configuration verbatim from `crm-api` configured for node22/ESM output. |
| `apps/projects-api/vitest.config.ts` | Vitest testing configuration verbatim from `crm-api` with `server-only` alias stub and node test environment. |
| `apps/projects-api/scripts/prisma-generate.mjs` | Prisma Client generator script providing placeholder connection URL and fallback module resolution when run prior to workspace linking. |
| `apps/projects-api/.gitignore` | Service-level gitignore ignoring `.vercel` and `.env*`. |
| `apps/projects-api/.env.example` | Example environment variable template for port, database URLs, internal auth key, log level, and deletion mode. |
| `apps/projects-api/prisma.config.ts` | Prisma 7 configuration file defining multi-file schema path and pooled/direct datasource endpoints. |
| `apps/projects-api/prisma/schema.prisma` | Root schema configuration with client generator output to `src/db/generated/prisma`. |
| `apps/projects-api/prisma/schema/schema.prisma` | Multi-file schema root with client generator and postgresql datasource definition. |
| `apps/projects-api/prisma/schema/tenant.prisma` | Prisma model for `Tenant` (`projects_tenants`) with BigInt Unix second timestamps and relation definitions. |
| `apps/projects-api/prisma/schema/project.prisma` | Prisma models for `Project` (`projects_projects`) and `ProjectMember` (`projects_project_members`). |
| `apps/projects-api/prisma/schema/issue.prisma` | Prisma models for `Issue` (`projects_issues`), `Comment` (`projects_comments`), and `IssueEvent` (`projects_issue_events`). |
| `apps/projects-api/prisma/schema/label.prisma` | Prisma models for `Label` (`projects_labels`) and `IssueLabel` (`projects_issue_labels`). |
| `apps/projects-api/prisma/migrations/20260903000000_init/migration.sql` | Hand-crafted initial PostgreSQL DDL migration creating all tables, indexes, unique constraints, foreign keys, and CHECK constraints. |
| `apps/projects-api/prisma/migrations/migration_lock.toml` | Migration lock file declaring the `postgresql` provider. |
| `apps/projects-api/src/server.ts` | Service entrypoint starting Express on port 4030 with graceful SIGTERM/SIGINT shutdown and database disconnection. |
| `apps/projects-api/src/application.ts` | Express application factory with middleware stack (helmet, cors, json parser, compression, request context), health route, and terminal error handlers. |
| `apps/projects-api/src/index.ts` | Export of configured Express application instance. |
| `apps/projects-api/src/db/index.ts` | Database connection pool and Prisma Client instance initialization via `@prisma/adapter-pg` reading `PROJECTS_DATABASE_URL`. |
| `apps/projects-api/src/platform/logger.ts` | Pino logger configuration with AsyncLocalStorage request context tracking and sensitive credential redaction. |
| `apps/projects-api/src/platform/ids.ts` | Prefixed random ID generator using `randomUUID` with entity prefix registry (`prjten_`, `prj_`, `prjmem_`, `iss_`, `lbl_`, `cmt_`, `isev_`). |
| `apps/projects-api/src/platform/timestamps.ts` | Unix second timestamp helpers supporting conversions between BigInt database representations and client numbers. |
| `apps/projects-api/src/http/errors.ts` | Error catalog with namespaced error codes, HTTP status mappings, user-safe messages, and type predicates. |
| `apps/projects-api/src/http/error-handler.ts` | Terminal Express error and 404 middlewares translating unexpected exceptions and Zod validation errors to standardized envelopes. |
| `apps/projects-api/src/http/result.ts` | Envelope response helpers (`sendProjectsResult`, `sendProjectsList`, `sendProjectsError`) ensuring error-as-value handling and stripping HTTP statuses from payloads. |
| `apps/projects-api/src/http/internal-auth.ts` | Constant-time timingSafeEqual authentication guard verifying `x-internal-key` against `PROJECTS_INTERNAL_KEY`. |
| `apps/projects-api/src/http/middleware/request-context.ts` | Express request context middleware assigning `x-request-id` and logging request lifecycle durations. |
| `apps/projects-api/src/http/routes.ts` | HTTP router mounting `/v1/tenants` and `/v1/organizations/:organizationId/projects`. |
| `apps/projects-api/src/modules/tenants/tenants.schemas.ts` | Zod validation schemas for tenant ensure input and parameter validation. |
| `apps/projects-api/src/modules/tenants/tenants.serializers.ts` | Serializers mapping database rows to `projects.tenant` contract shapes with numeric timestamps. |
| `apps/projects-api/src/modules/tenants/tenants.repository.ts` | Prisma database repository for tenants module (the only layer in module interacting with Prisma). |
| `apps/projects-api/src/modules/tenants/tenants.service.ts` | Business logic service for tenant retrieval and atomic provisioning with Triage project. |
| `apps/projects-api/src/modules/tenants/tenants.controller.ts` | HTTP request controller parsing parameters and formatting responses for tenants. |
| `apps/projects-api/src/modules/tenants/tenants.routes.ts` | Express router attaching per-route `requireInternalKey` guards for tenant endpoints. |
| `apps/projects-api/src/modules/tenants/index.ts` | Module barrel re-exporting tenants router, service, schemas, and serializers. |
| `apps/projects-api/src/modules/projects/projects.schemas.ts` | Zod validation schemas for project creation, updates, queries, and member management. |
| `apps/projects-api/src/modules/projects/projects.serializers.ts` | Serializers mapping project and project member rows to contract shapes. |
| `apps/projects-api/src/modules/projects/projects.repository.ts` | Prisma database repository for projects module (all queries scoped by tenantId). |
| `apps/projects-api/src/modules/projects/projects.service.ts` | Business logic service for projects CRUD, key derivation/uniquification, slug generation, archiving, and member operations. |
| `apps/projects-api/src/modules/projects/projects.controller.ts` | HTTP request controller parsing parameters and formatting responses for projects and project members. |
| `apps/projects-api/src/modules/projects/projects.routes.ts` | Express router attaching per-route `requireInternalKey` guards for project endpoints. |
| `apps/projects-api/src/modules/projects/index.ts` | Module barrel re-exporting projects router, service, schemas, and serializers. |
| `apps/projects-api/src/modules/tenants/__tests__/tenants.test.ts` | Vitest test suite for tenants module covering provisioning, idempotency, triage creation, retrieval, serializer conversion, and error handling. |
| `apps/projects-api/src/modules/projects/__tests__/projects.test.ts` | Vitest test suite for projects module covering key derivation, collision uniquification, validation, scoping, pagination, updates, archiving, hard deletion, and member management. |
| `apps/projects-api/src/test/server-only.ts` | Vitest test stub module for `server-only`. |
| `apps/projects-api/src/test/expect-value.ts` | Test assertion helper narrowing success results and failing on error values. |
| `apps/projects-api/src/test/setup.ts` | Vitest setup stub file. |

---

## 2. Test Case Counts

- `apps/projects-api/src/modules/tenants/__tests__/tenants.test.ts`: **10 `it()` cases**
- `apps/projects-api/src/modules/projects/__tests__/projects.test.ts`: **24 `it()` cases**
- **Total:** **34 `it()` cases** (all passing; exceeds the minimum required 24 cases)

All required test cases specified in §11 are covered:
- tenants: ensure creates tenant & Triage project, idempotency, triageProjectId assignment, retrieval shape, 404 tenant-not-found full error object, BigInt to number conversion.
- projects: key derivation from name, key uniquification on collision, rejection of invalid explicit key, rejection of colliding explicit key, default status/health, complete serialized shape with memberCount, tenant scoping on list, status filter and default exclusion of archived projects, inclusion of archived projects when requested, limit capping at 100, 404 for unknown id, 404 for cross-tenant id, partial field updates, 404 on update unknown id, archive by default returning tombstone, hard delete when DELETION_MODE === 'hard', duplicate member 409 member-exists, absent member removal 404 member-not-found.

---

## 3. Verification Command Output

### Command 1: `npx prisma validate --schema apps/projects-api/prisma/schema`
```
✘ [CLI.UNKNOWN_COMMAND] No command registered for `validate`
→ List every command: prisma --help
```
*Note:* `npx prisma` runs the latest global Prisma CLI (the Prisma Platform CLI), which does not have a `validate` command. When executed using the local Prisma 7 ORM CLI binary at `./apps/crm-api/node_modules/.bin/prisma validate --schema apps/projects-api/prisma/schema`, the output is:
```
Prisma schema loaded from apps/projects-api/prisma/schema.
The schemas at apps/projects-api/prisma/schema are valid 🚀
```

### Command 2: `pnpm --filter @876/projects-api typecheck`
```
$ node scripts/prisma-generate.mjs && tsc --noEmit
◇ injected env (0) from .env.development.local,.env.development,.env // tip: ◈ encrypted .env [www.dotenvx.com]
Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma/schema.

✔ Generated Prisma Client (7.9.1) to ./src/db/generated/prisma in 196ms
```
Exit code: 0.

### Command 3: `pnpm --filter @876/projects-api lint`
```
$ eslint src
Pages directory cannot be found at /root/projects/876/apps/projects-api/pages or /root/projects/876/apps/projects-api/src/pages. If using a custom path, please configure with the `no-html-link-for-pages` rule in your eslint config file.
```
Exit code: 0 (0 errors, 0 warnings).

### Command 4: `pnpm --filter @876/projects-api test`
```
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/projects-api


 Test Files  2 passed (2)
      Tests  34 passed (34)
   Start at  01:50:14
   Duration  1.18s (transform 477ms, setup 0ms, import 1.37s, tests 345ms, environment 0ms)
```
Exit code: 0.

### Invariant & Build Audit
- `grep -rn "eslint-disable\|as any\| any\b" apps/projects-api/src --exclude-dir=generated`: **0 matches**.
- `grep -rn "@ts-ignore\|@ts-expect-error" apps/projects-api/src --exclude-dir=generated`: **0 matches**.
- `grep -rn "DateTime" apps/projects-api/src --exclude-dir=generated apps/projects-api/prisma`: **0 matches**.
- `pnpm --filter @876/projects-api build`: `tsup` compiled successfully in 95ms.

---

## 4. Decisions Chosen

1. **Prisma 7 Multi-File Schema & Connection Configuration**:
   Prisma 7 rejects `url` and `directUrl` within `.prisma` schema datasource blocks when using `prisma.config.ts` (throwing `P1012: The datasource property url is no longer supported in schema files`). We mirrored `crm-api` by declaring the datasource provider in `prisma/schema/schema.prisma` and specifying `PROJECTS_DATABASE_URL` / `PROJECTS_DIRECT_DATABASE_URL` in `prisma.config.ts`.
2. **Offline Prisma Generation Prior to `pnpm install`**:
   Because `pnpm install` is reserved for the orchestrator, `scripts/prisma-generate.mjs` was augmented with a fallback search path resolving `prisma` from `crm-api` if not directly present in `projects-api/node_modules`. This allows `scripts/prisma-generate.mjs` and `typecheck` to run cleanly immediately without workspace link failure.
3. **Key and Slug Collision Handling**:
   When deriving a project key when none is supplied, names are uppercased and stripped of non-alphanumeric characters, taking up to the first 6 characters (falling back to pad `PRJ` if fewer than 2 characters). If that key exists in the tenant, suffixes `2`, `3`, etc. are appended (truncating the base prefix to strictly satisfy the 10 character maximum). Slugs are kebab-cased and appended with `-2`, `-3`, etc. on collision.
4. **Soft Delete vs Hard Delete**:
   `DELETE /:projectId` archives by setting `archivedAt = nowUnixSeconds()`, unless `process.env.DELETION_MODE === 'hard'`, in which case it issues a database row deletion. Both return the tombstone `{ object: 'projects.project', id: projectId, deleted: true }`.

---

## 5. Anything Not Done

Nothing within the scope of Phase 1 was left undone. All required 33 files were created, all 24 required test cases (and 10 additional cases, totaling 34) passed, schemas validated, TypeScript typechecks clean, ESLint passed without warnings or disables, and all architectural rules strictly followed.
