# Brief — `@876/couriers` admin tier: warehouses, customers, packages

Working directory: **`/root/projects/876`** — the main checkout, already on
branch `feat/couriers-sdk-resources` (based on `feat/couriers-sdk`) with
dependencies installed. Do **not** create a git worktree, and do **not** create,
switch, or reset any branch.

Another agent is working **in the same checkout at the same time** on `team` and
`settings`. Your file set is listed below and you must not touch a file outside
it — in particular **do not edit `packages/couriers/src/admin/client.ts`**; the
orchestrator registers every new resource there afterwards.

## Context

`docs/couriers-extraction.md` Phase 3 is `packages/couriers`, the typed client
over `apps/couriers-api`. Today it covers only `tenants` (all tiers) and
`branches` (admin). The API already serves `warehouses`, `customers`, and
`packages`. Bring the **admin tier** to parity for those three so Console can
stop reading Postgres directly.

## Read first, in this order

1. `.claude/rules/sdk-conventions.md` — the verb vocabulary and the auth-tier
   gating rule. Non-negotiable verbs: `retrieve`, `retrieveBy<Key>`, `list`,
   `create`, `update`, `delete`, plus state-transition verbs where the route is
   genuinely a transition. **Never** `get*`, `find*`, `fetch*`, `upsert`.
2. `packages/couriers/src/admin/types/branch.schema.ts`,
   `packages/couriers/src/admin/resources/branches.ts`,
   `packages/couriers/src/admin/request.ts`,
   `packages/couriers/src/admin/runtime.ts` — the exact shape to mirror.
3. `packages/couriers/src/client.test.ts` — the testing standard already set.
4. The API modules you are wrapping. Read the **routes** file for the exact
   path, method, operationId and status codes, and the **schemas** file for the
   exact wire shape:
   - `apps/couriers-api/src/modules/warehouses/warehouses.{routes,schemas}.ts`
   - `apps/couriers-api/src/modules/customers/customers.{routes,schemas}.ts`
   - `apps/couriers-api/src/modules/packages/packages.{routes,schemas}.ts`

   Cover **every** route each of those routers actually mounts, including
   sub-resource routes (e.g. customer addresses) — not just the top-level CRUD.

## Your file set (create/modify only these)

- `packages/couriers/src/admin/types/warehouse.schema.ts`
- `packages/couriers/src/admin/types/customer.schema.ts`
- `packages/couriers/src/admin/types/package.schema.ts`
- `packages/couriers/src/admin/resources/warehouses.ts`
- `packages/couriers/src/admin/resources/customers.ts`
- `packages/couriers/src/admin/resources/packages.ts`
- `packages/couriers/src/admin/resources/warehouses.test.ts`
- `packages/couriers/src/admin/resources/customers.test.ts`
- `packages/couriers/src/admin/resources/packages.test.ts`

Naming inside the schema files mirrors `branch.schema.ts` exactly:
`<x>Schema`, `<x>ListSchema`, `type X`, `type XList`. Resource factories mirror
`branches.ts`: `(runtime: AdminRuntime) => ({ ...verbs })`, each verb ~5 lines
over `AdminRequest`.

## Rules that matter more than the boilerplate

- **The client schemas must match the API's response schemas field for field.**
  Both sides are Zod; a drifted client schema turns a successful response into a
  runtime parse failure. Mirror `nullable()` / `optional()` precisely. Do **not**
  widen a field to `z.unknown()` to make it compile — if you cannot determine a
  shape, keep it faithful and flag it in your report.
- `snake_case` on the wire. These types describe the wire resource, not a
  camelCase view model.
- **Contracts and transport only, no behavior.** No defaulting, no derived
  fields, no client-side filtering, no conditionals encoding a courier rule. If
  a rule feels necessary it belongs in the service — say so instead.
- `encodeURIComponent` on **every** interpolated id, as `branches.ts` does.
- Where a route takes query parameters (list filters, pagination), expose them
  as a typed optional params object and build the query string; do not silently
  drop a filter the API supports.
- Prefer a **typed** body parameter derived from the API's request schema where
  that schema is unambiguous, keeping the type in the same `<name>.schema.ts`
  file. Fall back to `Record<string, unknown>` only where typing would require
  guessing, and list which ones and why in your report.
- **Admin tier only.** Do not add anything to `src/resources/` (publishable) or
  `src/integration/`.
- Do **not** add a `mailboxes` resource — that module lands on another branch.
- Source files only: do not touch `pnpm-lock.yaml`, any `package.json`, or any
  config.
- **Do not commit and do not push.** Leave the work in the working tree.

## Tests

One sibling test file per resource, per `.claude/rules/testing.md`. For **every**
verb:

- the happy path asserts the **exact** request — method, full encoded path
  including the tenant id, query string, and body — via `toHaveBeenCalledWith`,
  never bare `toHaveBeenCalled`;
- the parsed result is asserted as a full object shape, **both** `data` and
  `error`;
- a malformed response body is rejected rather than passed through;
- a missing admin credential fails closed **before** `fetch`
  (`expect(fetchMock).not.toHaveBeenCalled()`);
- exact call counts (`toHaveBeenCalledTimes(1)`).

Realistic Jamaican-courier fixtures (Kingston/Montego Bay branches, real-looking
`ten_…`/`wh_…`/`pkg_…` ids), never `'test'` / `'foo'`.

## Verify before reporting (from `/root/projects/876`)

```
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers lint
pnpm --filter @876/couriers test
npx prettier --check "packages/couriers/src/admin/**"
```

## Report

Every resource and verb you added with its exact route; any field whose shape
you could not determine from the API schemas; anywhere the API's routes did not
map cleanly onto the verb vocabulary; every body you left as
`Record<string, unknown>` and why; and the verbatim final line of each command.
