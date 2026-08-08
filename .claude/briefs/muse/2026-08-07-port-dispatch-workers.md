# Brief — port the two outbox dispatch workers to Express

**Tool:** `muse exec` (Muse Code), reasoning effort `high`.
**Working directory:** `/workspaces/876/apps/api`
**Type:** implementation. TypeScript only.

## The goal

Port two background dispatch loops from FastAPI to the Express service:

| Source                                      | Lines | Target                                         |
| ------------------------------------------- | ----- | ---------------------------------------------- |
| `services/billing_customer_dispatch.py`     | 205   | `src/workers/billing-customer-dispatch.ts`     |
| `services/finance_provisioning_dispatch.py` | 226   | `src/workers/finance-provisioning-dispatch.ts` |

These are **not modules** — they have no routes. Each exports a
`dispatch<X>Once()` returning the summary shape its FastAPI counterpart
returns (`{ claimed, delivered, failed, configured }`), plus whatever the
continuous loop needs. `src/modules/billing/**` calls the `…Once()` functions
from its admin dispatch routes, so those exact names and shapes are a contract.

`src/services/billing-customer-sync.ts` and
`src/services/finance-provisioning.ts` are **already ported and green** — call
them (e.g. `customerEventPayload`), do not reimplement or modify them.

## Read these first

1. `.claude/rules/express-api.md` — in particular the `workers/` directory in
   the module map, and the "Do not run DDL at startup" rule.
2. `src/services/billing-customer-sync.ts` and
   `src/services/finance-provisioning.ts` — the already-ported services these
   loops drive. Match their naming and their repository split.
3. `src/services/finance-provisioning.repository.ts` — the pattern for a
   non-module repository: it is the only file that may import `@/db/client`.

## Files you may create

```
src/workers/billing-customer-dispatch.ts
src/workers/billing-customer-dispatch.repository.ts
src/workers/finance-provisioning-dispatch.ts
src/workers/finance-provisioning-dispatch.repository.ts
src/workers/__tests__/billing-customer-dispatch.test.ts
src/workers/__tests__/finance-provisioning-dispatch.test.ts
```

## Files you may edit

**None.** Do not touch `src/modules/**`, `src/services/**`, `src/http/**`,
`src/app.ts`, `src/server.ts`, `prisma/**`, or any `.py` file. Another agent is
writing `src/modules/features/**` concurrently. Do not wire the loops into the
boot path — the orchestrating agent decides where they start.

## The parts that must be exact

- **The claim query is the concurrency control.** `SELECT … FOR UPDATE SKIP
LOCKED`, the retryable predicate (`pending`/`failed`, plus `processing` rows
  whose `locked_at` is older than the lock timeout), the `available_at <= now`
  filter, and the ordering. Getting this wrong means two workers deliver the
  same event twice, or a crashed worker's rows are stranded forever. Prisma
  cannot express `FOR UPDATE SKIP LOCKED` through the query builder — use
  `$queryRaw` for the claim and keep the raw SQL in the repository file.
- **Attempt counting, backoff, and the terminal state** must match the Python
  exactly, including the error-message truncation length.
- **A delivery failure must not throw out of the loop** — it marks the row and
  the loop continues. One bad event must not stop the queue.
- **`configured` is false when the destination is not configured**, and the loop
  does no work rather than failing.
- **Only `config/` may read `process.env`.** If the Python reads an environment
  variable these loops need and `src/config/index.ts` does not expose it, say so
  in your report rather than reading `process.env` yourself.
- **Timestamps are Unix seconds as Prisma `BigInt`.**

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
