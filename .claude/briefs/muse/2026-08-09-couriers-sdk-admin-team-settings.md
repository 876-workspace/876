# Brief — `@876/couriers` admin tier: roles/team and settings

Working directory: **`/root/projects/876`** — the main checkout, already on
branch `feat/couriers-sdk-resources` with dependencies installed. Do **not**
create a git worktree, and do **not** create, switch, or reset any branch. Do
**not** commit or push; leave the work in the working tree.

**You cannot run commands in this container** (the sandbox cannot create a
namespace, so every `pnpm`/`npx` invocation fails). Write the code as carefully
as if it were unverifiable — because for you it is. The orchestrator runs
`typecheck`, `lint`, `test` and `prettier` and will review every line. Say
plainly in your report which claims you could not verify.

Another agent is editing the **same checkout** concurrently, on `warehouses`,
`customers` and `packages`. Touch only your own file set below. In particular
**do not edit `packages/couriers/src/admin/client.ts`** — the orchestrator
registers every new resource there afterwards.

## Context

`docs/couriers-extraction.md` Phase 3 is `packages/couriers`, the typed client
over `apps/couriers-api`. It covers only `tenants` (all tiers) and `branches`
(admin). Your job is the **admin tier** for the two remaining modules you own:
`team` (which mounts **both** a `roles` router and a `team` router) and
`settings`.

## Read first, in this order

1. `.claude/rules/sdk-conventions.md` — the verb vocabulary. Non-negotiable:
   `retrieve`, `retrieveBy<Key>`, `list`, `create`, `update`, `delete`.
   **Never** `get*`, `find*`, `fetch*`, `upsert`.
2. `packages/couriers/src/admin/types/branch.schema.ts`,
   `packages/couriers/src/admin/resources/branches.ts`,
   `packages/couriers/src/admin/request.ts`,
   `packages/couriers/src/admin/runtime.ts` — the exact shape to mirror.
3. `packages/couriers/src/client.test.ts` — the testing standard already set.
4. The API modules you are wrapping — the **routes** file for the exact path,
   method, operationId and status codes, and the **schemas** file for the exact
   wire shape:
   - `apps/couriers-api/src/modules/team/team.{routes,schemas}.ts`
   - `apps/couriers-api/src/modules/settings/settings.{routes,schemas}.ts`

   `team.routes.ts` returns an **array of two routers** — one at
   `/v1/tenants/:tenantId/roles` (list, create, update, delete) and one at
   `/v1/tenants/:tenantId/team` (list, create, update). Cover **every** route
   both actually mount. Model them as **two SDK resources**, `roles` and `team`,
   because they are two different wire resources — do not fold roles into team.

## Your file set (create/modify only these)

- `packages/couriers/src/admin/types/role.schema.ts`
- `packages/couriers/src/admin/types/team.schema.ts`
- `packages/couriers/src/admin/types/settings.schema.ts`
- `packages/couriers/src/admin/resources/roles.ts`
- `packages/couriers/src/admin/resources/team.ts`
- `packages/couriers/src/admin/resources/settings.ts`
- `packages/couriers/src/admin/resources/roles.test.ts`
- `packages/couriers/src/admin/resources/team.test.ts`
- `packages/couriers/src/admin/resources/settings.test.ts`

Schema-file naming mirrors `branch.schema.ts` exactly: `<x>Schema`,
`<x>ListSchema`, `type X`, `type XList`. Resource factories mirror
`branches.ts`: `(runtime: AdminRuntime) => ({ ...verbs })`, each verb ~5 lines
over `AdminRequest`.

## Rules that matter more than the boilerplate

- **The client schemas must match the API's response schemas field for field.**
  Both sides are Zod; a drifted client schema turns a successful response into a
  runtime parse failure. Mirror `nullable()` / `optional()` precisely. Do **not**
  widen a field to `z.unknown()` to make it compile — keep it faithful and flag
  anything you could not determine.
- `snake_case` on the wire. These describe the wire resource, not a view model.
- **Contracts and transport only, no behavior.** No defaulting, no derived
  fields, no client-side filtering. A rule that feels necessary belongs in the
  service — say so instead of encoding it here.
- `encodeURIComponent` on **every** interpolated id, as `branches.ts` does.
- A `delete` route returning a tombstone (`{ object, id, deleted: true }`) needs
  a schema for that tombstone; do not reuse the resource schema for it.
- Prefer a **typed** body parameter derived from the API's request schema where
  that schema is unambiguous, keeping the type in the same `<name>.schema.ts`
  file. Fall back to `Record<string, unknown>` only where typing would require
  guessing, and say which ones and why.
- Settings preferences carry `decimal` values as **strings** end-to-end
  (`.claude/rules/module-settings.md`) — never widen one to `z.number()`.
- **Admin tier only.** Nothing in `src/resources/` or `src/integration/`.
- Source files only: no `pnpm-lock.yaml`, no `package.json`, no config.

## Tests

One sibling test file per resource, per `.claude/rules/testing.md`. For **every**
verb:

- the happy path asserts the **exact** request — method, full encoded path
  including the tenant id, and the body — via `toHaveBeenCalledWith`, never bare
  `toHaveBeenCalled`;
- the parsed result is asserted as a full object shape, **both** `data` and
  `error`;
- a malformed response body is rejected rather than passed through;
- a missing admin credential fails closed **before** `fetch`
  (`expect(fetchMock).not.toHaveBeenCalled()`);
- exact call counts (`toHaveBeenCalledTimes(1)`).

Realistic Jamaican-courier fixtures (a Kingston tenant, `ten_…`/`role_…` ids,
role names a courier would actually use), never `'test'` / `'foo'`.

## Report

Every resource and verb you added with its exact route and HTTP method; every
field whose shape you could not determine; anywhere the API routes did not map
cleanly onto the verb vocabulary; every body left as `Record<string, unknown>`
and why; and an explicit list of what you could not verify.
