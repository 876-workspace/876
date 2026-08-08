# Brief — port the `features` module to Express (rewrite)

**Tool:** `muse exec` (Muse Code), reasoning effort `high`.
**Working directory:** `/workspaces/876/apps/api`
**Type:** implementation. TypeScript only.

## Why this is a rewrite

A previous delegate produced a `features` module that did not use this
service's router API at all — it invented `api.get({ path, validate, handler })`
with `security: string[]`, wrote prose inline instead of importing the module's
`docs.ts`, read `req.principal` (which does not exist), and returned through
`res.status().json()` instead of returning the resource. All of it was deleted.
**Do not reconstruct it. Read the reference module and copy its shape exactly.**

## The goal

Port `domains/features/` (16 routes, 1,189 lines) to `src/modules/features/`,
behaviour-identical.

Mounted in `api/v1.py` on `protected_router` (which carries `require_api_key`).
Read each route's dependencies for its tier: `AdminDep` -> `admin`, `SessionDep`
-> `session`, neither -> `apiKey`.

`src/services/features.ts` and `src/services/features.repository.ts` are
**already ported and green**. Call them; do not reimplement or modify them, and
do not re-export them from the module (a one-line re-export file is a barrel and
is banned).

## Read these BEFORE writing anything

1. `src/modules/products/**` — a module of comparable size and mixed tiers.
   **Copy its router call shape, its controller shape, and its file split.**
2. `src/http/api-router.ts` — the real `createApiRouter` / route-spec contract.
   `security` is a single string per route, not an array. `resolveGuards` is
   typed `GuardResolver` (import the type, never re-declare it).
3. `src/http/routes.ts` — how a module is mounted, and what `GuardResolver` is.
4. `src/http/middleware/validate.ts` — how validated input reaches a controller.
   The principal is read with `getPrincipal(req)` from `@/http/auth`; it lives in
   a `WeakMap`, and `req.principal` does not exist and must never be introduced.

## The source to port

- `domains/features/router.py` (16 routes), `schemas.py`
- whichever `db/repositories/*.py` the router touches — find them by reading it
- the matching models under `db/models/`

## Files you may create

Exactly these, under `src/modules/features/`:

```
features.schemas.ts
features.serializers.ts
features.repository.ts
features.service.ts
features.controller.ts
features.routes.ts
index.ts
__tests__/features.test.ts
```

`features.docs.ts` **already exists** — it is the translated OpenAPI prose.
Import every summary, description and response map from it. Do not rewrite it,
do not edit it, and do not put prose in `features.routes.ts`.

`index.ts` exports `createFeaturesRouter` and nothing else. **No `export *`.**

## Files you may edit

**None.** Only create the eight files above. Do not edit `src/http/routes.ts` —
the orchestrating agent mounts the module itself.

## Cross-module reads

If a route needs membership data, call the owning module's service through
`@/modules/memberships`, and **check what that module's `index.ts` actually
exports first**. Do not import a name on the assumption that another agent will
add it.

## Feature-flag rules that apply here

Read `.claude/rules/feature-flags.md`. The parts that constrain this port:

- Keys are `<app>_<feature>`, `<app>_<group>`, or `<app>_<group>_<child>`,
  snake_case and lowercase. Never validate or generate an unscoped key.
- Parent/child is modelled with `parent_feature_id`; effective child state is
  master enabled **AND** child enabled.
- Precedence is `feature.enabled` -> app scope -> `OrgFeature` -> `UserFeature`.
  An override can never revive a disabled flag: resolution ANDs
  `feature.enabled` into the result regardless of any grant. Reproduce exactly.

## Read these first, in this order

1. `.claude/rules/express-api.md` — the contract this service is built to. Not
   optional: it fixes the module shape, the layer responsibilities, the error
   model, and the Prisma conventions.
2. `apps/api/docs/express-migration.md` §4 ("The recipe for migrating one
   module", a numbered 10-step procedure — follow it exactly) and §6 ("Traps
   already hit").
3. `src/modules/geo/**` — the simplest worked example.
4. `src/modules/devices/**` — a module with sub-resources and a cross-module read.
5. `src/modules/directory/**` — the example for a **large** module: several
   resource groups sharing one prefix, split as
   `<group>.{schemas,serializers,repository,service,controller,routes}.ts` with
   `<module>.{schemas,serializers,repository,service}.ts` holding what they
   share. Do not use a `schemas/` subdirectory and do not add barrels.

## Conventions you must not get wrong

These have each caused a real defect in this migration:

- **Wire fields are `snake_case`; TypeScript is `camelCase`.** The serializer is
  the only place the two meet. A Prisma field name must never reach a client.
- **Timestamps are Unix seconds.** Every timestamp column is Prisma `BigInt`;
  one reaching `JSON.stringify` throws at runtime. Convert in the serializer
  with `fromDbUnixSeconds` / `nullableFromDbUnixSeconds` from
  `@/platform/timestamps`.
- **Only `*.repository.ts` may import `@/db/client`.** Enforced by
  `dependency-cruiser`; anything else fails the build.
- **A repository type belongs in the repository file.** Declaring `XRepository`
  in `x.ts` and importing it from `x.repository.ts`, while `x.ts` imports the
  factory back, is a circular dependency `node:boundaries` fails on.
- **Error `code` strings are the contract** — clients branch on them. Use the
  exact string the Python raises, character for character. Throw `AppHttpError`
  from `@/http/errors`. `httpStatus` is server-only and is stripped from the body.
- **Sub-resource routes are declared before `/:id`**, or Express matches the
  literal segment as an id.
- **`security` is declared once per route** on the route spec; it drives both
  the OpenAPI security block and the middleware chain.
- **Preserve `operationId`** exactly as `<tag-slug>-<python_function_name>`.
- **`z.coerce.boolean()` is `Boolean(value)`**, so the query string `'false'`
  becomes `true`. Use `z.stringbool()` for boolean query parameters.
- **Python's `int()`/`float()` raise where JavaScript coerces.** `Number(' ')`
  is `0` but `float(' ')` raises — add an explicit blank check.
- **Request bodies are `z.strictObject`** wherever the Pydantic model set
  `extra="forbid"`. Response schemas are plain `z.object`.
- **A cleared Json column is `Prisma.DbNull`**, not `null`.
- **A stale or unknown pagination cursor returns an empty page, never an error.**
- **Cross-module data goes through the owning module's service**, unwrapped
  (`{ data, hasMore }`), so the calling module owns its own list URL. Never
  query another module's tables.
- **Every serialized resource carries its literal `object` discriminator**, and
  lists use the shared list object (`{ object: 'list', data, has_more, url,
total_count }`) with `starting_after` / `ending_before` cursor pagination.

## Tests

`__tests__/<module>.test.ts`, following `src/modules/devices/__tests__/`:
Prisma mocked via `vi.hoisted` + `vi.mock('@/db/client', …)`, then
`const { createApp } = await import('@/app')`, driven through `supertest` so the
real middleware chain runs.

**Type every mock with `Mocked<T>` from `@/test/mocked`.** Do not hand-roll
`T & Record<string, ReturnType<typeof vi.fn>>` — TypeScript resolves a named
property from the declared member and ignores the index signature, so
`repo.findX.mockResolvedValue(...)` fails to compile. This single mistake
produced 232 of 240 typecheck errors in the last delegate batch.

**Freeze the clock** with `vi.useFakeTimers({ toFake: ['Date'] })` whenever a
fixture carries a relative timestamp — faking timers wholesale stalls supertest,
which drives real sockets. Against the real clock every `expiresAt: NOW + 600`
fixture is already expired.

**Do not stack `mockResolvedValueOnce` values you never consume.** `clearMocks`
does not drain that queue, so a leftover leaks into the next test and silently
overrides its stub.

Per route, at minimum:

- the happy path, with a **full body assertion** (`expect(response.body).toEqual(…)`
  against the complete `{ data, error }` envelope — never `toBeDefined()`);
- one validation failure;
- one authorization failure asserting the **exact** error code;
- where a route is scoped to a caller, one cross-tenant/cross-user attempt
  asserting the row is invisible (404, not 403 — a 403 discloses that the id
  exists). Filter by the caller's id **inside** the loading query, never load
  then compare.

## Verification

```bash
pnpm node:typecheck     # tsc --noEmit — must be clean
pnpm node:lint          # eslint src — must be clean
pnpm node:test          # every test must pass, none skipped
pnpm node:boundaries    # 0 errors (warnings about *.docs.ts are expected)
npx prettier --write "src/modules/<module>/**/*.ts"
```

**You cannot run any command in this container** — the sandbox cannot create a
namespace, so every one of these will fail for you. Write the code to satisfy
them and say plainly that you could not run them. **Do not claim you ran a check
you did not run.** The orchestrating agent runs all of them.

**Do not run `git commit`.** The orchestrating agent stages and commits.

## When you are done

Report: the routes you ported, any place the Python behaviour was ambiguous and
what you chose, and anything you could not do — rather than inventing a
substitute.
