# Brief — port the startup seeds as a CLI, plus the feature-flag migration

**Tool:** `muse exec` (Muse Code), reasoning effort `high`.
**Working directory:** `/workspaces/876/apps/api`
**Type:** implementation. TypeScript only.

## The goal

Port the FastAPI service's startup seeds and its remaining background job:

| Source                               | Lines | Target                                  |
| ------------------------------------ | ----- | --------------------------------------- |
| `services/feature_seeds.py`          | 547   | `src/seeds/features.ts`                 |
| `services/provisioning_seeds.py`     | 361   | `src/seeds/provisioning.ts`             |
| `services/plan_seeds.py`             | 186   | `src/seeds/plans.ts`                    |
| `services/geo_seeds.py`              | 184   | `src/seeds/geo.ts`                      |
| `services/bootstrap.py`              | 167   | `src/seeds/bootstrap.ts`                |
| `services/feature_flag_migration.py` | 204   | `src/workers/feature-flag-migration.ts` |

## The rule that shapes all of this

**The Express service must not run seeds or DDL at startup**
(`.claude/rules/express-api.md`). The FastAPI app replays these on boot; this
port must not. Instead:

- Each seed module exports a plain async function that takes no implicit
  environment and returns a summary of what it created or updated.
- `src/seeds/index.ts` exposes a single `runSeeds(options)` composing them in
  the order `main.py` runs them, and `src/seeds/cli.ts` is an entry point
  runnable as `pnpm node:seed`. Add that script to `package.json`.
- **Nothing under `src/seeds/` may be imported by `src/app.ts` or
  `src/server.ts`.** Say so in a comment at the top of `src/seeds/index.ts`.

`services/feature_flag_migration.py` is a background job, not a seed — it goes
in `src/workers/`, exports a `…Once()` entry point plus its loop, and is
likewise **not** wired into the boot path.

## The parts that must be exact

- **Seeds are idempotent.** Re-running must not duplicate a row or clobber a
  value an operator changed. Where the Python only creates an absent row, the
  port only creates an absent row.
- **Feature-flag keys follow `.claude/rules/feature-flags.md`**: app-prefixed
  `<app>_<group>_<child>`, snake_case, never unscoped. Parent/child is modelled
  with `parent_feature_id`, which the grouped seeds set automatically. Read that
  rule before touching `feature_seeds.py`.
- **The default org-role permission arrays carry a deliberate asymmetry** —
  `owner` and `admin` are sorted, `billing_manager` and `member` are in
  declaration order. They are seeded into `organization_roles.permissions`, so
  "fixing" the ordering rewrites the rows every existing organization already
  has. `src/platform/permissions.ts` already holds them; use it.
- **`_seed_platform_apps` in `main.py`** is part of the bootstrap seed. Include
  it, with the same slugs.
- **Only `config/` may read `process.env`.** If a seed needs an environment
  value `src/config/index.ts` does not expose, say so in your report rather than
  reading `process.env` yourself.
- **Timestamps are Unix seconds as Prisma `BigInt`.**
- Every seed's database access lives in a `*.repository.ts` beside it — the only
  file allowed to import `@/db/client`.

## Files you may create

```
src/seeds/{features,provisioning,plans,geo,bootstrap}.ts
src/seeds/{features,provisioning,plans,geo,bootstrap}.repository.ts
src/seeds/index.ts
src/seeds/cli.ts
src/seeds/__tests__/*.test.ts
src/workers/feature-flag-migration.ts
src/workers/feature-flag-migration.repository.ts
src/workers/__tests__/feature-flag-migration.test.ts
```

## Files you may edit

`package.json` — add the `node:seed` script and nothing else.

**Nothing else.** `src/modules/users/**` and `src/modules/auth/**` are being
written concurrently; `src/app.ts`, `src/server.ts`, `src/http/**`,
`src/services/**`, `src/platform/**`, `prisma/**` and every `.py` file are out
of scope.

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
