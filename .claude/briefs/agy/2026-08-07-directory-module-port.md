# Brief — port the `directory` module from FastAPI to Express

**Tool:** `agy --model=claude-sonnet-4-6` (do **not** pass `--effort`; the Sonnet
model rejects it and the run dies instantly)
**Scope:** create `apps/api/src/modules/directory/**`. Nothing else.

## Read these first, in this order

1. `/workspaces/876/.claude/rules/express-api.md` — the contract this service is
   built to. Non-negotiable.
2. `/workspaces/876/apps/api/docs/express-migration.md` §4, "The recipe for
   migrating one module" — the ten steps you are executing.
3. `/workspaces/876/apps/api/src/modules/geo/**` — **the worked example. Copy its
   shape exactly.** `geo` is the closest analogue: reference data, list +
   retrieve, cursor pagination, the same serializer style.
4. `/workspaces/876/apps/api/src/modules/addresses/**` — the closest example of a
   module with **admin-gated mutations**, which `geo` does not have.

## The source you are porting

| File | Lines | What it holds |
| --- | --- | --- |
| `apps/api/domains/directory/router.py` | 1,678 | 50 routes |
| `apps/api/domains/directory/schemas/` | 573 | Pydantic contracts, split into 4 files |
| `apps/api/db/repositories/directory.py` | 1,184 | 53 async repository methods |
| `apps/api/db/models/directory.py` | 298 | SQLAlchemy models |

**`apps/api/src/modules/directory/directory.docs.ts` already exists** (all the
OpenAPI prose, already translated and committed). **Import from it. Do not
rewrite it, do not edit it, and do not duplicate any string it contains.**

## The shape of the work

Ten resources, each with the same five verbs — list, retrieve, create, update,
delete. That regularity is the whole reason this is one brief instead of ten:
get the first resource exactly right, then repeat.

| Resource | Path | Prisma model |
| --- | --- | --- |
| Banks | `/directory/banks` | `Bank` |
| Bank branches | `/directory/bank-branches` | `BankBranch` |
| Bank accounts | `/directory/bank-accounts` | `BankAccount` |
| Credit unions | `/directory/credit-unions` | `CreditUnion` |
| Credit union branches | `/directory/credit-union-branches` | `CreditUnionBranch` |
| Ministries | `/directory/ministries` | `Ministry` |
| Ministry departments | `/directory/ministry-departments` | `MinistryDepartment` |
| Schools | `/directory/schools` | `SecondarySchool` |
| Universities | `/directory/universities` | `University` |
| University campuses | `/directory/university-campuses` | `UniversityCampus` |

The Prisma models are already generated — read them under
`apps/api/prisma/schema/` (`bank.prisma`, `bank-branch.prisma`, and so on). Do
**not** add, edit, or generate any `.prisma` file, and do not run any `prisma`
command.

## Files to create

Exactly these, under `apps/api/src/modules/directory/`:

```
directory.schemas.ts
directory.serializers.ts
directory.repository.ts
directory.service.ts
directory.controller.ts
directory.routes.ts
index.ts
__tests__/directory.test.ts
```

If a file grows past roughly 600 lines, split it by resource group — `financial`
(banks, branches, accounts, credit unions), `government` (ministries,
departments), `education` (schools, universities, campuses) — mirroring how the
Python `schemas/` package is already split. A 2,000-line `directory.schemas.ts`
is worse than three files.

**Do not create or edit any of these:**

- `apps/api/src/http/routes.ts` — the orchestrating agent mounts your router.
  Mounting it yourself will conflict. **Leave it alone.**
- `apps/api/src/modules/directory/directory.docs.ts` — already done.
- Anything under `apps/api/src/platform/`, `apps/api/src/providers/`,
  `apps/api/src/db/`, or any other `src/modules/*` directory. Another agent is
  working in `platform/` and `providers/` right now.
- Any Python file. This is a port; the source stays untouched.

## The five rules that will otherwise bite you

These are the specific mistakes this module invites. Each has already cost the
project a debugging session somewhere.

1. **`include_deleted` is privilege-gated, and getting it wrong leaks
   soft-deleted rows.** Every read route accepts `include_deleted`, and the
   Python code does:

   ```python
   actual_include = include_deleted if principal.internal else False
   ```

   A caller holding only an app API key **must never** see a soft-deleted row,
   even when it asks. Reproduce this exactly: resolve the principal, and honour
   `include_deleted` only when the principal is internal. Silently forcing
   `false` for everyone else is correct — do not raise.

2. **Reads are the apiKey tier; mutations are the admin tier.** The Python
   router is mounted on `protected_router` (so every route requires an app API
   key), and each `create`/`update`/`delete` handler additionally takes
   `_admin: AdminDep`. In Express that is `security: 'apiKey'` on reads and
   `security: 'admin'` on mutations. Tiers stack — `admin` already implies
   apiKey, so do not try to list both.

3. **Declare sub-resource and literal paths before `/:id`.** Express matches in
   declaration order, so a route declared after `/:id` is unreachable — the
   literal segment is captured as an id.

4. **Every timestamp column is Prisma `BigInt` and must be converted in the
   serializer** with `fromDbUnixSeconds`. A `BigInt` that reaches
   `JSON.stringify` throws at runtime, and the test that catches it is the one
   asserting a full response body.

5. **Preserve every error `code` string exactly** as the Python raises it —
   `bank/not-found`, `bank/duplicate-code`, and the equivalents for all ten
   resources. Clients branch on these strings, so a "tidier" code is a breaking
   change. Grep the Python router for `code="` and match every one, including the
   HTTP status that accompanies it (`404` for not-found, `409` for a duplicate).

Also carry over the duplicate-code check on create: the Python looks the record
up with `include_deleted=True` first and raises `409` if one exists, so a
soft-deleted row still reserves its code.

## Contract rules (from `express-api.md` — do not deviate)

- **Wire fields are `snake_case`; TypeScript is `camelCase`.** The serializer is
  the only place the two meet. A Prisma field name must never reach a client.
- Every serialized resource carries its literal `object` discriminator
  (`object: 'bank'`, `object: 'bank_branch'`, …). Match the exact values the
  Python serializers stamp — grep `"object":` and `object=` in the Python.
- Lists return the platform list object: `{ object: 'list', data, has_more, url,
  total_count }`, with `url` set to that resource's own path exactly as the
  Python sets it (e.g. `/directory/banks`).
- Cursor pagination via `starting_after` / `ending_before` on item IDs; reuse
  `paginationQuerySchema`. A stale or unknown cursor returns an **empty page**,
  never an error.
- Request bodies are `z.strictObject` wherever the Pydantic model forbids extras;
  response schemas are plain `z.object`.
- Timestamps are Unix seconds, `z.number().int()` — never `Date`, never ISO.
- Preserve each `operationId` as `<tag-slug>-<python_function_name>`, e.g.
  `directory-list_banks`.
- Only `directory.repository.ts` may import `@/db/client`. A controller that
  touches Prisma, or a service that touches `req`/`res`, is a boundary error the
  build will reject.

## Tests

`__tests__/directory.test.ts`, following the existing module tests exactly:
Prisma mocked via `vi.hoisted` + `vi.mock('@/db/client', …)`, then
`const { createApp } = await import('@/app')`, driven through **supertest** so
the real middleware chain runs.

Per resource, at minimum:

- the list happy path, asserting the **full** `{ data, error }` body
- the retrieve 404, asserting the exact error `code`
- one create validation failure (a missing required field)
- one authorization failure on a mutation, asserting the exact `code`
- **one test proving a non-internal caller cannot see a soft-deleted row even
  when it passes `include_deleted=true`** — this is rule 1, and it is the single
  most important test in the file

`expect(res.body.data).toBeDefined()` is not an assertion — it passes for a
catastrophic error object. Assert both sides of the envelope.

## Verification — the bar

Run all four from `/workspaces/876/apps/api`, in the **foreground**, and do not
report done until every one is clean:

```bash
pnpm node:typecheck
pnpm node:lint
pnpm node:test
pnpm node:boundaries          # 0 errors — warnings about *.docs.ts are expected
npx prettier --write "src/modules/directory/**/*.ts"
```

`pnpm node:boundaries` reporting **0 errors** is a hard gate. Warnings naming
`*.docs.ts` files are pre-existing and fine.

Your tests will 404 until the router is mounted in `src/http/routes.ts`, which
you must not edit. Write the tests anyway, note in your final report that the
suite needs the mount, and leave them. The orchestrating agent will mount the
router and run the suite.

## Do not

- Do not commit. The orchestrating agent stages and commits.
- Do not run `pnpm install`, or touch `pnpm-lock.yaml`. A stray install
  re-resolves optional peers and rewrites ~140 unrelated lines.
- Do not edit `src/http/routes.ts`.
- Do not invent an endpoint, a field, or an error code that is not in the Python.
- Do not rename a database table or column; the Prisma `@@map`/`@map` attributes
  already handle the snake_case mapping.

## Report back

State: which files you created and their line counts; the result of each of the
four verification commands; every error code you carried over; and anything in
the Python you could not faithfully reproduce. If you ran out of time, say
exactly which resources are complete and which are not — a half-finished port
reported as complete is worse than an honest partial one.
