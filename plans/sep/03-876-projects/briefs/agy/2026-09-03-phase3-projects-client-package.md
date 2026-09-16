# Brief — Phase 3: `packages/projects` (the typed client)

You are building **`@876/projects`**, the typed contract + client package for the
876 Projects service. Read `plans/2026-09-03-876-projects/plan.md` for context.

**Repository root:** `/root/projects/876`
**Branch:** `feat/876-projects` (already checked out — do NOT create, switch, or
merge any branch, and do NOT commit. The orchestrator commits.)

---

## 0. Copy `packages/crm`

`packages/crm` is the reference implementation. **Mirror it exactly** — the
runtime, the request helper, the resource-factory shape, the Zod schemas, the
entrypoint files, the package exports map.

| Read this | To learn |
| --- | --- |
| `packages/crm/package.json` | the exports map, deps, scripts |
| `packages/crm/src/runtime.ts` | `buildRuntime`, base URL + internal key resolution |
| `packages/crm/src/request.ts` | the fetch helper and `{ data, error }` handling |
| `packages/crm/src/client.ts` | the client factory composing resources |
| `packages/crm/src/types.ts` | Zod schemas + inferred types + list envelopes |
| `packages/crm/src/resources/teams.ts` | a complete resource module with list/retrieve/create/update/delete |
| `packages/crm/src/service-client.ts`, `src/operator.ts`, `src/index.ts` | the caller-authority entrypoints |
| `packages/crm/src/contracts.ts` | what a `contracts` subpath exports |
| `packages/crm/tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts` | config |

The **server contract you are typing** is defined by
`apps/projects-api/src/modules/*/{schemas,serializers}.ts` — read those files and
match them exactly. If the API and this brief disagree, **the API wins**; say so
in your report.

---

## 1. Files to create

```
packages/projects/package.json
packages/projects/tsconfig.json
packages/projects/eslint.config.mjs
packages/projects/vitest.config.ts
packages/projects/src/types.ts            Zod schemas + inferred types
packages/projects/src/runtime.ts          copy crm's
packages/projects/src/request.ts          copy crm's
packages/projects/src/client.ts           the factory
packages/projects/src/index.ts            session-tier entrypoint
packages/projects/src/service-client.ts   /service entrypoint
packages/projects/src/operator.ts         /operator entrypoint
packages/projects/src/contracts.ts        /contracts entrypoint — types & schemas only
packages/projects/src/resources/tenants.ts
packages/projects/src/resources/projects.ts
packages/projects/src/resources/issues.ts
packages/projects/src/resources/labels.ts
packages/projects/src/resources/comments.ts
packages/projects/src/types.test.ts
packages/projects/src/client.test.ts
packages/projects/src/resources/issues.test.ts
packages/projects/src/resources/projects.test.ts
```

### `package.json`

Copy `packages/crm/package.json`. Change `name` → `@876/projects`,
`description` → `876 Projects product client and contracts.` Keep the same
`exports` map shape:

```json
{
  ".":          { "types": "./src/index.ts",          "default": "./src/index.ts" },
  "./contracts":{ "types": "./src/contracts.ts",      "default": "./src/contracts.ts" },
  "./service":  { "types": "./src/service-client.ts", "default": "./src/service-client.ts" },
  "./operator": { "types": "./src/operator.ts",       "default": "./src/operator.ts" }
}
```

Dependencies: `@876/core` (workspace:*), `server-only` (0.0.1), `zod` (4.4.3) —
**exact same versions as `packages/crm`**. Drop `@876/settings`. Same
devDependencies and scripts as `packages/crm`.

---

## 2. Client shape

```ts
export function create876ProjectsClient(options: ClientOptions = {}) {
  const runtime = buildRuntime(options)
  return {
    tenants:  createTenantsResource(runtime),
    projects: createProjectsResource(runtime),
    issues:   createIssuesResource(runtime),
    labels:   createLabelsResource(runtime),
    comments: createCommentsResource(runtime),
  }
}
```

Entrypoints, mirroring `packages/crm` exactly:

- `src/index.ts` → exports `create876ProjectsClient`, its type, and re-exports
  the public types from `./types`.
- `src/service-client.ts` → `create876ProjectsServiceClient` (first-party 876
  service caller).
- `src/operator.ts` → `create876ProjectsOperatorClient` (876 operator: Console
  and the MCP server).
- `src/contracts.ts` → **types and Zod schemas only, no client, and no
  `server-only` import.** This is the subpath a non-server consumer imports.

`service-client.ts` and `operator.ts` may currently delegate to
`create876ProjectsClient`, exactly as `packages/crm` does — the entrypoint names
caller intent, and the backend is the authorization boundary. Document that in a
one-line comment, as `packages/crm/src/operator.ts` does.

`ClientOptions`: `{ baseUrl?: string; internalKey?: string; requestId?: string }`.
`baseUrl` falls back to `process.env.PROJECTS_API_URL`, `internalKey` to
`process.env.PROJECTS_INTERNAL_KEY` — matching how `packages/crm`'s runtime does it.

---

## 3. Resource methods

Use the platform verb vocabulary — `create`, `retrieve`, `list`, `update`,
`delete`. **No `get*`, `find*`, `fetch*`, or `retrieveBy*`.**

```ts
tenants.ensure(organizationId)
tenants.retrieve(organizationId)

projects.list(organizationId, query?)
projects.create(organizationId, input)
projects.retrieve(organizationId, projectId)
projects.update(organizationId, projectId, input)
projects.delete(organizationId, projectId)
projects.members.list(organizationId, projectId)
projects.members.create(organizationId, projectId, input)
projects.members.delete(organizationId, projectId, userId)

issues.list(organizationId, query?)
issues.create(organizationId, input)
issues.retrieve(organizationId, issueRef)     // id or identifier, e.g. 'CONSOLE-12'
issues.update(organizationId, issueRef, input)
issues.delete(organizationId, issueRef)
issues.events.list(organizationId, issueRef)

labels.list(organizationId)
labels.create(organizationId, input)
labels.update(organizationId, labelId, input)
labels.delete(organizationId, labelId)

comments.list(organizationId, issueRef, query?)
comments.create(organizationId, issueRef, input)
comments.update(organizationId, issueRef, commentId, input)
comments.delete(organizationId, issueRef, commentId)
```

Every path segment goes through `encodeURIComponent`, exactly as
`packages/crm/src/resources/teams.ts` does.

### Query serialization

`issues.list` accepts a typed query object and serializes it to the API's query
string. The API's parameter names are **snake_case on the wire** where the
existing service uses them (`starting_after`, `ending_before`, `updated_since`,
`include_deleted`, `include_archived`); the TypeScript input properties are
**camelCase** (`startingAfter`, `updatedSince`, `includeDeleted`). Map between
them in the resource — that boundary translation is the resource's job.

Array-valued filters (`status`, `priority`, `label`) accept `string | string[]`
and serialize a list as a comma-separated value. Omit any undefined parameter
entirely; never emit `?status=undefined`.

---

## 4. Types

`src/types.ts` holds the Zod schemas and their inferred types, mirroring
`packages/crm/src/types.ts`. Derive every shape from
`apps/projects-api/src/modules/*/*.serializers.ts` — read them, do not guess.

Required schemas: `tenantSchema`, `projectSchema`, `projectMemberSchema`,
`issueSchema`, `labelSchema`, `commentSchema`, `issueEventSchema`, their list
envelopes, and a `deletedSchema` tombstone. Plus the input types for every method
in §3.

Rules:

- Timestamps are `z.number()` (Unix seconds), never `z.date()`.
- Each resource schema carries its literal `object` discriminator
  (`z.literal('projects.issue')` and so on) matching the serializers exactly.
- List envelopes match the API's:
  `{ object: 'list', data: T[], has_more: boolean, url: string, total_count: number | null }`.
- Status/priority/health values are `z.enum([...])` with the exact kebab-case
  values (`'in-progress'`, `'on-track'`, …).
- Export a const array for each enumeration (`ISSUE_STATUSES`,
  `ISSUE_PRIORITIES`, `PROJECT_STATUSES`, `PROJECT_HEALTHS`) so UI code can
  render them without restating the list.

---

## 5. Non-negotiable rules

1. **Do not throw for an expected failure.** Every method returns
   `{ data, error }`, exactly as `packages/crm` does.
2. **Client-safe errors carry no `httpStatus`.**
3. A malformed server response must be rejected by the schema and surfaced as an
   error value, not crash — copy `packages/crm/src/request.ts`'s behaviour.
4. **`src/contracts.ts` must not import `server-only`** and must not import the
   client. It is the subpath a non-server consumer uses.
5. **No `as any`, `eslint-disable`, `@ts-ignore`, `@ts-expect-error`.**
6. No barrel that re-exports a whole directory beyond the declared entrypoints.
7. No comment that restates the code.

---

## 6. Tests

Vitest, mirroring `packages/crm`'s test style. Mock `fetch`; never hit a network.

**Minimum 26 `it()` cases.** Required coverage:

*types*
- `issueSchema` accepts a complete valid payload and infers the expected type
- `issueSchema` rejects a payload with the wrong `object` discriminator
- `issueSchema` rejects a non-numeric timestamp
- `issueSchema` rejects an unknown status value
- the list envelope schema accepts `total_count: null`
- `ISSUE_STATUSES` contains exactly the six kebab-case values in order
- `ISSUE_PRIORITIES` contains exactly the five values in order

*client / runtime*
- `create876ProjectsClient` exposes exactly the five resource namespaces
- the runtime falls back to `PROJECTS_API_URL` when `baseUrl` is absent
- the runtime falls back to `PROJECTS_INTERNAL_KEY` when `internalKey` is absent
- an explicit `baseUrl` overrides the environment variable
- the request sends `x-internal-key` with the resolved key
- `create876ProjectsOperatorClient` and `create876ProjectsServiceClient` both
  return the same resource surface

*resources — issues*
- `list` builds `/v1/organizations/:org/issues` with the org id encoded
- `list` maps `updatedSince` → `updated_since` and `startingAfter` → `starting_after`
- `list` serializes `status: ['todo','in-progress']` as `status=todo,in-progress`
- `list` omits undefined parameters entirely (assert the exact final URL)
- `retrieve` accepts an identifier such as `CONSOLE-12` and encodes it
- `create` POSTs the body unchanged and parses the response with `issueSchema`
- `update` issues a `PATCH`
- `delete` issues a `DELETE` and parses the tombstone
- a 404 response is returned as an error value, not thrown
- a response failing schema validation is returned as an error value, not thrown
- `events.list` targets `/issues/:ref/events`

*resources — projects*
- `list` maps `includeArchived` → `include_archived`
- `members.create` targets `/projects/:id/members`
- `members.delete` targets `/projects/:id/members/:userId` with the user id encoded
- `delete` parses the tombstone shape

Assertion quality: assert the **exact** URL and the **exact** request init
(method, headers, body) with `toHaveBeenCalledWith(...)`. Assert both `data` and
`error` on every result. `expect(x).toBeDefined()` as a test's only assertion is
a failed test.

---

## 7. Do NOT

- Do NOT create, switch, rebase, merge, or delete any git branch.
- Do NOT run `git commit`, `git add`, or `git push`.
- Do NOT modify any file outside `packages/projects/`. In particular do not touch
  `apps/projects-api/`, `apps/console/`, `packages/crm/`, `pnpm-workspace.yaml`,
  or the root `package.json`.
- Do NOT change the API to fit the client. If the API contract is wrong, report it.
- Do NOT run `pnpm install`.
- Do NOT add dependencies beyond `@876/core`, `server-only`, `zod`.
- Do NOT write `eslint-disable`, `as any`, `@ts-ignore`, or `@ts-expect-error`.
- Do NOT write documentation files.

---

## 8. Verify

```bash
cd /root/projects/876
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects lint
pnpm --filter @876/projects test
```

Report the real output, or say plainly that you could not run a command.

---

## 9. Report

Write to
`plans/2026-09-03-876-projects/reports/agy/2026-09-03-phase3-projects-client-package.md`:

1. Every file created, with a one-line reason.
2. The **counted** number of `it()` cases per test file.
3. Every place the API contract differed from this brief, and which you followed.
4. The exact output of each command in §8, or an explicit statement that you
   could not run it.
5. Anything you could not do, and why.
