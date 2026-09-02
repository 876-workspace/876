# Brief — port the `mobile-numbers` module from FastAPI to Express

**Tool:** `muse exec` (Muse Code, Meta), reasoning effort `high`.
**Working directory:** `/workspaces/876/apps/api`
**Type:** implementation. TypeScript only.

This is the first task delegated to Muse in this repo. The output will be
reviewed line by line before it is committed, and the review decides whether
Muse is added to `.claude/rules/cli.md` as a routing option.

## The goal

Port `domains/mobile_numbers/` (FastAPI, Python) to `src/modules/mobile-numbers/`
(Express 5, TypeScript). All 8 routes, behaviour-identical.

## Read these first, in this order

1. `.claude/rules/express-api.md` — the contract this service is built to. Not
   optional: it fixes the module shape, the layer responsibilities, the error
   model, and the Prisma conventions.
2. `apps/api/docs/express-migration.md` §4 — "The recipe for migrating one
   module", a numbered 10-step procedure. Follow it exactly.
3. `src/modules/devices/**` — the reference implementation. It is the closest
   existing module: sub-resources under an id, and a cross-module read. Copy its
   shape, its file split, and its comment density.
4. `src/modules/onboarding/**` — the reference for a module whose routes are
   **session-tier** rather than admin.

## The source to port

- `domains/mobile_numbers/router.py` (206 lines) — the 8 routes
- `domains/mobile_numbers/schemas.py` (88) — request/response contracts
- `domains/mobile_numbers/service.py` (356) — the business rules
- `db/repositories/` — whichever repositories the service touches; find them by
  reading it
- `db/models/users.py` — the `UserMobileNumber` model
- `db/models/auth.py` — the `Verification` model

Mounted in `api/v1.py` under `protected_router` (which carries
`require_api_key`), and every route additionally takes `SessionDep`. That means
the Express tier is **`session`**, not `admin` and not `apiKey`.

## Files you may create

Exactly these, all under `src/modules/mobile-numbers/`:

```
mobile-numbers.schemas.ts
mobile-numbers.serializers.ts
mobile-numbers.repository.ts
mobile-numbers.service.ts
mobile-numbers.controller.ts
mobile-numbers.routes.ts
index.ts
__tests__/mobile-numbers.test.ts
```

`mobile-numbers.docs.ts` **already exists** — it is the translated OpenAPI prose.
Import from it; do not rewrite it, and do not add prose to the route file.

## Files you may edit

- `src/http/routes.ts` — add exactly two lines: the import, and the
  `root.use(createMobileNumbersRouter(resolveGuards))` call. This is the only
  shared file in the service; nothing is reachable until you edit it, and a
  forgotten mount shows up as every test returning 404.

## Files you must NOT touch

Anything else. In particular: `src/modules/communications/**` and
`src/modules/products/**` are being written concurrently by another agent, and
`src/platform/**`, `src/providers/**`, `src/http/**` (other than `routes.ts`),
`prisma/**`, and every `.py` file are out of scope. Do not run `git commit` —
the orchestrating agent commits.

## Conventions you must not get wrong

These are the ones that have actually caused defects in this migration:

- **Wire fields are `snake_case`; TypeScript is `camelCase`.** The serializer is
  the only place the two meet. A Prisma field name must never reach a client.
- **Timestamps are Unix seconds.** Every timestamp column is Prisma `BigInt`;
  one reaching `JSON.stringify` throws at runtime. Convert in the serializer
  with `fromDbUnixSeconds` / `nullableFromDbUnixSeconds` from
  `@/platform/timestamps`.
- **Only `*.repository.ts` may import `@/db/client`.** This is enforced by
  `dependency-cruiser` and will fail the build.
- **Error `code` strings are the contract** — clients branch on them. Use the
  exact same string the Python raises, character for character. Throw
  `AppHttpError` from `@/http/errors`.
- **Sub-resource routes are declared before `/:id`**, or Express matches the
  literal segment as an id.
- **`security` is declared once per route** on the route spec, and drives both
  the OpenAPI document and the middleware chain.
- **Preserve `operationId`** as `<tag-slug>-<python_function_name>` — e.g.
  `mobile-numbers-create_mobile_number`. A consumer reading the spec must see no
  change across the cutover.
- **No barrel re-exports** beyond the module's own `index.ts`.
- **`z.coerce.boolean()` is `Boolean(value)`**, so the query string `'false'`
  becomes `true`. Use `z.stringbool()` for boolean query parameters.

## Authorization — the part that matters most

Every route is scoped to the calling user. The user id comes from the session
principal (`getPrincipal(req).userId`), **never** from the request body, a query
parameter, or a path parameter.

A mobile number belonging to another user must be **404, not 403** — a 403 tells
the caller the id exists, which is a disclosure. Every read, update, delete,
verification create, and approve must filter by the session user's id in the
same query that loads the row, not by loading it and comparing afterwards.

Write a test for each of these that asserts another user's row is invisible.

## Tests

`__tests__/mobile-numbers.test.ts`, following the pattern in
`src/modules/devices/__tests__/` and `src/modules/modules/__tests__/`:
Prisma mocked via `vi.hoisted` + `vi.mock('@/db/client', …)`, then
`const { createApp } = await import('@/app')`, driven through `supertest` so the
real middleware chain runs.

Per route, at minimum:

- the happy path, with a **full body assertion** (`expect(response.body).toEqual(…)`
  against the complete `{ data, error }` envelope — not `toBeDefined()`);
- one validation failure;
- one authorization failure asserting the **exact** error code;
- one cross-user access attempt asserting 404.

## Verification — all four must pass, run from `apps/api`

```bash
pnpm node:typecheck     # tsc --noEmit — must be clean
pnpm node:lint          # eslint src — must be clean
pnpm node:test          # every test must pass, none skipped
pnpm node:boundaries    # must report 0 errors (warnings about *.docs.ts are expected)
npx prettier --write "src/modules/mobile-numbers/**/*.ts"
```

Run every one of these in the foreground and read the output. Do not report done
until all four are green.

## When you are done

Report: the routes you ported, any place the Python behaviour was ambiguous and
what you chose, and the final output of all four verification commands. If you
could not do something, say which and why rather than inventing a substitute.
