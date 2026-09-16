# Brief — Couriers: make datastore writes survive a cold Neon endpoint

## Why this exists

In production (Cloudflare Workers + Neon), creating a branch from
`/org/[orgSlug]/settings/branches/new` intermittently fails with the message
**"Failed to create branch."** That exact string is produced in exactly one
place: the `catch` block of `apps/couriers/src/lib/service/branches/create.ts`.
It is therefore **not** a validation failure — a thrown database error is being
swallowed into a generic 500.

The cause is the interactive transaction:

```ts
const branch = await prisma.$transaction(async (tx) => { ... })
```

Prisma's **interactive** transactions take an options object whose defaults are
`maxWait: 2000` (how long to wait to acquire a connection) and `timeout: 5000`
(how long the transaction body may run). Neon's serverless compute **scales to
zero after ~5 minutes of inactivity and takes 500 ms to several seconds to wake
up**. When the first write after an idle period opens a transaction, connection
acquisition routinely exceeds 2000 ms and Prisma throws (`P2024`/`P2028`), so
the whole create fails. This is exactly the intermittent behaviour the user
reports ("sometimes the databases time out").

The second defect is that none of these `catch` blocks report to Sentry. The
`@876/core/db` layer reports pool errors and query-guard timeouts, but a
transaction-orchestration failure only reaches `console.error`, which is
invisible on Workers. That is why this failure has been undiagnosable.

Fix both: bound the transaction generously, retry the specific "database is
waking up" class of failure once, and make every service failure reportable.

## Scope — files you may touch

Only inside `apps/couriers/`:

- NEW `src/lib/service/transaction.ts`
- NEW `src/lib/service/transaction.test.ts`
- NEW `src/lib/service/report.ts`
- NEW `src/lib/service/report.test.ts`
- `src/lib/errors/generic.ts` (add one error code)
- `src/lib/service/branches/create.ts`
- `src/lib/service/branches/update.ts`
- `src/lib/service/warehouses/create.ts`
- `src/lib/service/warehouses/update.ts`
- `src/lib/service/customer-addresses/create.ts`
- `src/lib/service/customer-addresses/update.ts`
- `src/lib/service/customer-addresses/delete.ts`
- `src/lib/service/customer-profiles/ensure.ts`
- `src/lib/service/preferences/update.ts`
- NEW `src/lib/service/branches/create.test.ts`
- existing `*.test.ts` files under those directories, where a mock needs
  updating for the new call shape

**Do not** touch anything under `src/app/`, `packages/`, `apps/api/`, or the
Prisma schema. Another task owns those. Do not commit.

## Work item 1 — `src/lib/service/transaction.ts`

Export a single helper that every service uses in place of a bare
`prisma.$transaction(callback)`:

```ts
export async function runTransaction<T>(
  label: string,
  run: (tx: PrismaTransactionClient) => Promise<T>
): Promise<T>
```

Requirements, each of which must be justified by a comment in the code
explaining the consequence of getting it wrong (match the existing commenting
voice in `apps/couriers/src/lib/db/index.ts` and `packages/core/src/db/worker-client.ts`
— explain the _consequence_, never restate the code):

1. Pass explicit options: `{ maxWait: 15_000, timeout: 20_000 }`. Export these
   as named constants (`TRANSACTION_MAX_WAIT_MS`, `TRANSACTION_TIMEOUT_MS`) so
   the test can assert them and so the numbers are documented in one place.
   `maxWait` must comfortably exceed a Neon cold start; `timeout` must exceed
   `maxWait` plus the body's work. Keep both under Cloudflare's invocation
   budget and under the Neon 30-second request timeout.
2. **Retry exactly once** when the first attempt fails with a
   _connection-acquisition_ error — the cold-start class. Detect it narrowly:
   a `PrismaClientKnownRequestError` with code `P2024` (timed out fetching a
   connection from the pool) or `P2028` (transaction API error), or an error
   whose message contains `Timed out fetching a new connection`. Everything
   else — unique-constraint violations, validation errors, the
   `DatabaseConnectionReusedError` and `DatabaseQueryTimeoutError` from
   `@876/core/db` — must **not** be retried and must rethrow immediately.
   Retrying a unique-constraint failure would turn a clean 409 into a slow one;
   retrying cross-request I/O can never succeed.
3. The retry is a plain immediate second attempt (no backoff timer). The first
   attempt has already spent up to 15 seconds, which is more than enough time
   for Neon to have woken; adding a sleep only burns Worker wall-clock.
4. Reuse `isUniqueConstraintError` from `./prisma-errors` if useful, but do not
   change that module's exports.
5. Export a type guard `isColdStartError(error: unknown): boolean` so the test
   can exercise the classification directly and so callers can distinguish the
   case.

Read `apps/couriers/src/lib/db/index.ts` for the exported
`PrismaTransactionClient` type — use it, do not re-derive it.

## Work item 2 — `src/lib/service/report.ts`

Export:

```ts
export function reportServiceFailure(
  error: unknown,
  context: {
    operation: string
    consequence: string
    extra?: Record<string, unknown>
  }
): void
```

It calls `Sentry.captureException` with `level: 'error'`, a
`tags: { category: 'service', service_operation: context.operation }` block,
and `extra` carrying the consequence sentence plus any supplied extras. Mirror
the shape and tone of `reportDbFailure` in `src/lib/db/index.ts` — the
`consequence` field must say what the _user_ experiences, e.g.
`'The branch was not created and the form shows a generic failure.'`

It must never throw: wrap the Sentry call so a reporting failure cannot take
down the request.

Keep the existing `console.error` calls alongside it — they are useful in
`next dev`.

## Work item 3 — a distinguishable error for the cold-start case

Add to `src/lib/errors/generic.ts` (follow the existing `ErrorDef` shape and
the surrounding code exactly):

```
'database/unavailable': {
  message: 'The database is waking up. Please try again in a moment.',
  httpStatus: 503,
}
```

Check the existing key naming convention in that file and in the sibling error
modules before choosing the key — if the file's keys are all prefixed with a
domain such as `error/…`, match that prefix instead of inventing `database/…`.
Consistency with the existing registry wins over the literal key proposed here.

When a create/update fails and `isColdStartError(error)` is true, return
`errFrom('<that code>')` instead of the generic 500 string. A user who sees
"try again in a moment" retries and succeeds; a user who sees
"Failed to create branch." files a bug.

## Work item 4 — convert every `$transaction` call site

For each of the files listed in Scope that currently calls
`prisma.$transaction(async (tx) => …)`:

- Replace with `runTransaction('<resource>.<verb>', async (tx) => …)`.
- In the `catch`, keep the existing unique-constraint branch first (it must
  still return the existing 409 and the existing message — **do not change any
  existing user-facing message**), then add the cold-start branch returning the
  new 503 code, then fall through to the existing generic 500.
- Add a `reportServiceFailure` call in the generic branch **and** the
  cold-start branch. Do not report unique-constraint violations — those are
  expected user errors, not incidents, and reporting them makes Sentry useless.

Preserve the existing comments in those files where they are still accurate;
update any comment that the change makes untrue.

## Work item 5 — tests

Follow `.claude/rules/testing.md` strictly. Read an existing sibling test first
(`src/lib/service/branches/ensure-default.test.ts`,
`src/lib/service/customer-addresses/create.test.ts`) and match its mocking
style, factory style, and `describe`/`it` naming exactly.

`transaction.test.ts` must cover, at minimum:

- passes `{ maxWait: TRANSACTION_MAX_WAIT_MS, timeout: TRANSACTION_TIMEOUT_MS }`
  to `prisma.$transaction` — assert the exact object, not just that it was
  called
- returns the callback's value on first success, with `$transaction` called
  exactly once
- retries exactly once on a `P2024` error and returns the second attempt's value
- retries exactly once on a `P2028` error
- retries on an error whose message contains `Timed out fetching a new connection`
- does **not** retry a unique-constraint error, and rethrows it unchanged
- does **not** retry `DatabaseConnectionReusedError`
- does **not** retry a plain `Error`, and rethrows it unchanged
- rethrows the **second** failure when both attempts fail with `P2024`
- `isColdStartError` returns false for `null`, `undefined`, a string, and a
  plain object carrying a `code` property (a non-Error value must never be
  classified as retryable)

`report.test.ts` must cover: the exact `captureException` arguments including
tags and extra; that a throwing Sentry mock does not propagate.

`branches/create.test.ts` must cover the service contract end to end with
`prisma` and `buildAddressData` mocked:

- success returns `{ data: <BranchView>, error: null }` and the address write
  happens inside the transaction
- the first branch for a tenant is forced `isDefault: true` even when the caller
  passed `isDefault: false`
- a subsequent branch created with `isDefault: true` demotes the previous
  default (assert the `updateMany` arguments exactly)
- a unique-constraint failure returns status 409 with the existing message and
  **does not** call `reportServiceFailure`
- a `P2024` failure on both attempts returns the new 503 code and **does** call
  `reportServiceFailure` exactly once
- a geography failure from `buildAddressData` returns that result unchanged and
  never opens a transaction (assert `prisma.$transaction` not called)

Assert exact call counts and exact argument objects, both halves of every
`{ data, error }` result, and use `vi.clearAllMocks()` in `beforeEach`.

## Verification (run these; all must pass)

```
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers test
pnpm --filter @876/couriers lint
```

## Constraints

- Read `.claude/rules/code-style.md` and follow Rule 1 (drop braces on
  single-statement `if`), Rule 2 (blank line between concern groups) and Rule 3
  — these files are under `src/lib/`, so the rules are in force.
- Read `.claude/rules/sdk-conventions.md` — the two-layer app-local datastore
  rule. Nothing outside `src/lib/service/` may import `prisma`.
- Read `.claude/rules/types.md` — shared types go in `src/types/`, not inline
  in service files.
- Do not change any existing user-facing error message.
- Do not run git commands. Do not commit.
