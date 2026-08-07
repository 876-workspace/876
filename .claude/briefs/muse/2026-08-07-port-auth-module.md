# Brief — port the `auth` module to Express

**Tool:** `muse exec` (Muse Code), reasoning effort `high`.
**Working directory:** `/workspaces/876/apps/api`
**Type:** implementation. TypeScript only.

## The goal

Port `domains/auth/` (22 routes, ~2,000 lines) to `src/modules/auth/`,
behaviour-identical.

Mounted in `api/v1.py` as
`protected_router.include_router(auth_router, prefix="/auth")`, so every path is
under `/auth` and every route sits behind the app API key. Read each route's
dependencies for its tier on top of that: `SessionDep` -> `session`,
`AdminDep` -> `admin`, neither -> `apiKey`.

**`src/services/auth.ts` is already ported, tested, and green.** It owns login,
registration, business registration, OTP, recovery, email verification, code
exchange, refresh, and the WorkOS authorization URL. **Call it. Do not
reimplement any of it, and do not modify it.** Build the service with
`createAuthService()` from `@/services/auth`.

The module owns only what the FastAPI *router* owns: reading the request,
sealing and setting the session cookie, choosing status codes, serializing, and
the session-state endpoints in `domains/auth/session_state.py`.

## Read these first, in this order

1. `.claude/rules/express-api.md`
2. `apps/api/docs/express-migration.md` §4 (the 10-step recipe) and §6 (traps)
3. `src/services/auth.ts` — the service you are wrapping. Its result type is
   `ServiceAuthResult`, a discriminated union: `{ status: 'ok', session }` means
   authenticated, `{ status: 'pending', event }` means a further step is
   required. **A pending result is not an error** and must not be reported as
   one — a user who needs to verify their email would be told their password was
   wrong.
4. `src/platform/session.ts` — HMAC-SHA256 cookie sealing. **Not iron-session.**
   The wire format is a contract with `@876/core`'s `verifySession876`, which
   every 876 app reads. Use it exactly; a divergence logs every user out at
   cutover.
5. `src/modules/oauth/**` — the closest precedent for a module with public
   routes and its own credential rules.
6. `src/http/auth/` — `getPrincipal(req)`. The principal lives in a `WeakMap`;
   `req.principal` does not exist.

## The parts that must be exact

- **Cookie attributes.** Name, `httpOnly`, `secure`, `sameSite`, `path`,
  `domain`, and max-age must match `domains/auth/router.py` field for field. A
  wrong `sameSite` or `domain` silently breaks sign-in on a real deployment
  while passing every test.
- **Logout clears the cookie with the same attributes it was set with**, or the
  browser keeps it.
- **Realm handling.** `X-876-Realm` selects which user population is accepted
  (`consumer` vs `enterprise`). Port the guard exactly; never infer the realm
  from anything the client can otherwise control.
- **`X-876-Origin`** is forwarded by each app's auth bridge and is how the
  WorkOS callback URL is derived when no production URL is configured. The
  service already implements the precedence in `resolveWorkosRedirectUri` —
  pass the header through, do not re-derive it.
- **Error `code` strings are the contract.** Character for character.
- **Rate limiting** on login, OTP, and PIN endpoints where the Python has it —
  `src/platform/rate-limit.ts` is already ported.
- **`services/auth_telemetry.py` is ported** as `src/services/auth-telemetry.ts`;
  emit the same events the router emits.

## Files you may create

Under `src/modules/auth/` only, following the recipe. Split `session_state.py`
into its own group (`session-state.{schemas,serializers,repository,service,controller,routes}.ts`)
if it is large enough to warrant it.

`auth.docs.ts` **already exists** — the translated OpenAPI prose. Import from
it; do not rewrite it and do not put prose in a routes file.

## Files you may edit

**None** outside `src/modules/auth/`. Do not edit `src/http/routes.ts` — the
orchestrating agent mounts it. `src/modules/users/**` is being written
concurrently by another agent; `src/services/**` (including `auth.ts`),
`src/platform/**`, `src/providers/**`, `prisma/**` and every `.py` file are out
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
