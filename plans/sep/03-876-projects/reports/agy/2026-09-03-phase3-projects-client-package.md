# Phase 3 Report: `packages/projects` (the typed client)

- **Date:** 2026-09-03
- **Agent:** `agy` on Gemini 3.8 Flash (High)
- **Branch:** `feat/876-projects`
- **Package:** `@876/projects`

---

## 1. Files Created

| File Path | Purpose |
| --- | --- |
| `packages/projects/package.json` | Package manifest defining `@876/projects`, exports map (`.`, `./contracts`, `./service`, `./operator`), dependencies (`@876/core`, `server-only`, `zod`), and scripts. |
| `packages/projects/tsconfig.json` | TypeScript compiler configuration targeting ES2022/ESNext with Bundler module resolution and strict mode. |
| `packages/projects/eslint.config.mjs` | ESLint configuration inheriting repository root configuration with ignore rules for dist, coverage, and node_modules. |
| `packages/projects/vitest.config.ts` | Vitest test configuration specifying Node test environment and `src/**/*.test.ts` include patterns. |
| `packages/projects/src/types.ts` | Zod schemas (`tenantSchema`, `projectSchema`, `projectMemberSchema`, `issueSchema`, `labelSchema`, `commentSchema`, `issueEventSchema`, list envelopes, `deletedSchema`), inferred types, enum constants (`ISSUE_STATUSES`, `ISSUE_PRIORITIES`, `ISSUE_ORDERS`, `PROJECT_STATUSES`, `PROJECT_HEALTHS`, `PROJECT_MEMBER_ROLES`), and request/input interfaces. |
| `packages/projects/src/runtime.ts` | Client runtime constructor resolving base URL (`PROJECTS_API_URL` env fallback with default `http://localhost:4030`) and internal key (`PROJECTS_INTERNAL_KEY` fallback). |
| `packages/projects/src/request.ts` | HTTP request helper executing transport requests via `@876/core/client`, injecting `x-internal-key`, and returning `{ data, error }` results validated against Zod schemas. |
| `packages/projects/src/client.ts` | Primary client factory `create876ProjectsClient` with `server-only` guard composing `tenants`, `projects`, `issues`, `labels`, and `comments` resources. |
| `packages/projects/src/service-client.ts` | Service caller entrypoint `create876ProjectsServiceClient` with `server-only` guard for first-party 876 service authorization. |
| `packages/projects/src/operator.ts` | Operator entrypoint `create876ProjectsOperatorClient` with `server-only` guard for Console and MCP server callers. |
| `packages/projects/src/contracts.ts` | Pure contracts entrypoint re-exporting Zod schemas, enum constants, and TypeScript types with no client factories and no `server-only` import. |
| `packages/projects/src/index.ts` | Root session-tier entrypoint re-exporting `create876ProjectsClient` factory alongside all public contracts and types. |
| `packages/projects/src/resources/tenants.ts` | Tenants resource implementing `ensure` (`POST /v1/tenants/ensure`) and `retrieve` (`GET /v1/tenants/:organizationId`). |
| `packages/projects/src/resources/projects.ts` | Projects resource implementing project CRUD, `members` sub-resource (`list`, `create`, `delete`), and query serialization (`includeArchived` -> `include_archived`). |
| `packages/projects/src/resources/issues.ts` | Issues resource implementing issue CRUD, `events.list`, and camelCase to snake_case query serialization with comma-separated list filters. |
| `packages/projects/src/resources/labels.ts` | Labels resource implementing labels CRUD operations against `/v1/organizations/:organizationId/labels`. |
| `packages/projects/src/resources/comments.ts` | Comments resource implementing issue comments CRUD operations against `/v1/organizations/:organizationId/issues/:issueRef/comments`. |
| `packages/projects/src/types.test.ts` | Vitest test suite for Zod validation schemas, enum constants, tombstones, and list envelope null total count handling. |
| `packages/projects/src/client.test.ts` | Vitest test suite for client factory resource surfaces, runtime base URL/internal key resolution, environment fallbacks, and header injection. |
| `packages/projects/src/resources/issues.test.ts` | Vitest test suite for issues resource URL encoding, query serialization, request methods, body preservation, tombstone parsing, and error values. |
| `packages/projects/src/resources/projects.test.ts` | Vitest test suite for projects resource CRUD, member operations, URL encoding, tombstone shapes, labels, and comments. |

---

## 2. Test Case Counts

Every test file runs Vitest with isolated fetch mocks and no external network calls:

| Test File | Counted `it()` Cases |
| --- | --- |
| `packages/projects/src/types.test.ts` | **17** |
| `packages/projects/src/client.test.ts` | **9** |
| `packages/projects/src/resources/issues.test.ts` | **11** |
| `packages/projects/src/resources/projects.test.ts` | **10** |
| **Total Test Suite** | **47** |

(Exceeds the required minimum of 26 `it()` cases across the test suite).

---

## 3. Discrepancies Between API Contract and Brief

1. **Delete Request Bodies:**
   - *Brief:* Referenced `packages/crm/src/resources/teams.ts` as a structural reference where `delete` accepts `{ deletedBy: string }`.
   - *API:* `apps/projects-api` delete routes (`projects.controller.ts`, `issues.controller.ts`, `labels.controller.ts`, `comments.controller.ts`, `projects.service.ts`) take no body on DELETE requests; only URL path parameters (`projectId`, `issueRef`, `labelId`, `commentId`, `userId`) are parsed by the router and controller schemas.
   - *Resolution:* **The API wins.** All `delete` methods in `packages/projects` take only path identifiers and optional `RequestOptions` (`options?: RequestOptions`), sending no request body.

2. **`tenants.ensure` Endpoint Structure:**
   - *Brief:* Specifies `tenants.ensure(organizationId)` without specifying whether `organizationId` is a path parameter or request body.
   - *API:* `apps/projects-api/src/modules/tenants/tenants.routes.ts` mounts `POST /v1/tenants/ensure` which parses `ensureTenantBodySchema` expecting `{ organizationId: string }` in the JSON request body, and `GET /v1/tenants/:organizationId` which parses `organizationId` from route parameters.
   - *Resolution:* **The API wins.** `tenants.ensure(organizationId)` sends `POST /v1/tenants/ensure` with `{ organizationId }` in the request body.

3. **Query Parameter Naming & Serialization:**
   - *Brief & API Alignment:* The brief noted that query parameter names are snake_case on the wire where existing services use them (`updated_since`, `starting_after`, `ending_before`, `include_deleted`, `include_archived`), whereas TypeScript input properties are camelCase. The API schemas (`listProjectsQuerySchema`, `listIssuesQuerySchema`, `listCommentsQuerySchema`) expect snake_case strings/values on the wire. The client resources map camelCase input properties to snake_case wire parameters with comma-separated list values and preserve unencoded commas (`replace(/%2C/g, ',')`).

4. **Default Base Port:**
   - *API:* `apps/projects-api/src/server.ts` defaults to port `4030` (`process.env.PORT ?? 4030`).
   - *Runtime:* `packages/projects/src/runtime.ts` falls back to `http://localhost:4030` when neither explicit options nor environment variables (`PROJECTS_API_URL`, `PROJECTS_URL`, etc.) are provided.

---

## 4. Verification Command Outputs (§8)

### Command 1: `pnpm --filter @876/projects typecheck`
```
$ pnpm --filter @876/projects typecheck
Scope: all 41 workspace projects
[ERR_PNPM_OUTDATED_LOCKFILE] Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with <ROOT>/packages/projects/package.json

Note that in CI environments this setting is true by default. If you still need to run install in such cases, use "pnpm install --no-frozen-lockfile"

  Failure reason:
  specifiers in the lockfile don't match specifiers in package.json:
* 6 dependencies were added: @types/node@26.2.0, typescript@5.9.3, vitest@4.1.11, @876/core@workspace:*, server-only@0.0.1, zod@4.4.3
[ERROR] Command failed with exit code 1: /root/.local/share/fnm/node-versions/v22.23.2/installation/bin/node /root/.cache/node/corepack/v1/pnpm/11.3.0/bin/pnpm.mjs install

pnpm: Command failed with exit code 1: /root/.local/share/fnm/node-versions/v22.23.2/installation/bin/node /root/.cache/node/corepack/v1/pnpm/11.3.0/bin/pnpm.mjs install
    at getFinalError (file:///root/.cache/node/corepack/v1/pnpm/11.3.0/dist/pnpm.mjs:29514:14)
    at makeError (file:///root/.cache/node/corepack/v1/pnpm/11.3.0/dist/pnpm.mjs:31821:21)
    at getSyncResult (file:///root/.cache/node/corepack/v1/pnpm/11.3.0/dist/pnpm.mjs:33665:10)
    at spawnSubprocessSync (file:///root/.cache/node/corepack/v1/pnpm/11.3.0/dist/pnpm.mjs:33625:14)
    at execaCoreSync (file:///root/.cache/node/corepack/v1/pnpm/11.3.0/dist/pnpm.mjs:33555:23)
    at callBoundExeca (file:///root/.cache/node/corepack/v1/pnpm/11.3.0/dist/pnpm.mjs:36083:23)
    at boundExeca (file:///root/.cache/node/corepack/v1/pnpm/11.3.0/dist/pnpm.mjs:36060:49)
    at sync (file:///root/.cache/node/corepack/v1/pnpm/11.3.0/dist/pnpm.mjs:36219:10)
    at runPnpmCli (file:///root/.cache/node/corepack/v1/pnpm/11.3.0/dist/pnpm.mjs:213566:5)
    at runDepsStatusCheck (file:///root/.cache/node/corepack/v1/pnpm/11.3.0/dist/pnpm.mjs:215280:7)
```
Exit status: `1`

**Direct package verification:**
```bash
cd /root/projects/876/packages/projects && ./node_modules/.bin/tsc --noEmit
```
Output: (clean, 0 errors)
Exit status: `0`

### Command 2: `pnpm --filter @876/projects lint`
```
$ pnpm --filter @876/projects lint
Scope: all 41 workspace projects
[ERR_PNPM_OUTDATED_LOCKFILE] Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with <ROOT>/packages/projects/package.json
...
[ERROR] Command failed with exit code 1
```
Exit status: `1`

**Direct package verification:**
```bash
cd /root/projects/876/packages/projects && ./node_modules/.bin/eslint .
```
Output:
```
Pages directory cannot be found at /root/projects/876/packages/projects/pages or /root/projects/876/packages/projects/src/pages. If using a custom path, please configure with the `no-html-link-for-pages` rule in your eslint config file.
```
Exit status: `0` (0 errors, 0 warnings)

### Command 3: `pnpm --filter @876/projects test`
```
$ pnpm --filter @876/projects test
Scope: all 41 workspace projects
[ERR_PNPM_OUTDATED_LOCKFILE] Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with <ROOT>/packages/projects/package.json
...
[ERROR] Command failed with exit code 1
```
Exit status: `1`

**Direct package verification:**
```bash
cd /root/projects/876/packages/projects && ./node_modules/.bin/vitest run
```
Output:
```
 RUN  v4.1.11 /root/projects/876/packages/projects

 Test Files  4 passed (4)
      Tests  47 passed (47)
   Start at  02:18:22
   Duration  849ms (transform 613ms, setup 0ms, import 1.08s, tests 178ms, environment 1ms)
```
Exit status: `0`

### Keyword Audit Check
Command:
```bash
grep -rn "eslint-disable\|@ts-ignore\|@ts-expect-error\|as any" /root/projects/876/packages/projects/src
```
Output:
0 matches found.

---

## 5. Items Not Possible and Rationale

- Running `pnpm --filter @876/projects <command>` failed at the workspace level because `pnpm-workspace.yaml` specifies `frozenLockfile: true` and the root `pnpm-lock.yaml` does not yet contain `@876/projects`. In adherence to instruction §7 ("Do NOT run pnpm install" and "Do NOT modify any file outside packages/projects/"), `pnpm install` was not run and `pnpm-lock.yaml` was not updated. Instead, the package was bootstrapped with the exact dependencies and shims from `packages/crm`, and all scripts (`typecheck`, `lint`, and `test`) were verified directly using the local binaries (`tsc --noEmit`, `eslint .`, `vitest run`), all passing with 100% success.
