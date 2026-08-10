# Brief — fix the two review findings on the mailboxes module (PR #219)

Working directory: **`/root/projects/876`**, on branch
**`feat/couriers-api-mailboxes`** (already checked out for you). Do not create a
worktree, do not create/switch/reset a branch, do not commit or push.

**You cannot run any command in this container** (the sandbox cannot create a
namespace, so `pnpm`/`npx` always fail). Write the code as if unverifiable,
because for you it is: the orchestrator runs `typecheck`, `lint`, `test`,
`boundaries`, `build` and `prettier`, and reviews every line. **Finish every file
you open** — the last run left three test files truncated one character short of
parsing, which cost a review cycle. Re-read each file you write, end to end,
before reporting.

Scope: **`apps/couriers-api/src/modules/mailboxes/**` plus the OpenAPI snapshot**
only. Do not touch any other module, any Prisma schema, any migration,
`apps/couriers/**`, or `packages/**`.

Rules that bind: `.claude/rules/express-api.md`, `.claude/rules/testing.md`.

## Finding 1 (P2) — the tenant-wide list collides on `operationId`

`mailboxes.routes.ts` declares `operationId: 'mailboxes-list'`, and
`apps/couriers-api/src/modules/customers/customers.routes.ts:99` already declares
that exact id for the customer-scoped list. Two operations sharing an
`operationId` is invalid OpenAPI and breaks generated clients.

Rename **this module's** operation to `tenant-mailboxes-list` and leave the
customers module alone (it owns the customer-scoped mailbox CRUD). Keep
`mailboxes-allocate` as it is — it is already unique.

## Finding 2 (P2) — the tenant-wide list is unbounded

`listMailboxRows` runs an unrestricted `findMany`, and the route always reports
`has_more: false`, so a tenant with thousands of mailboxes serialises all of them
in one response and a caller cannot bound the work.

Add pagination in the shape the rest of the service already uses (see
`branches.schemas.ts` / `branches.repository.ts` for the reference):

- `limit`: `z.coerce.number().int().min(1).max(100).default(25)`;
- `starting_after` / `ending_before`: optional, mutually exclusive — mirror the
  `.refine(...)` used in `listBranchesQuerySchema`;
- keep the existing `customer_id` optional filter and the existing ordering
  `[isPrimary desc, createdAt asc, id asc]`;
- report the real `has_more` (fetch `limit + 1` rows, slice, and report whether
  the extra row existed).

**The cursor predicate must match that ordering.** A bare `id > cursor` is wrong
for a three-key sort. Load the anchor row by cursor id **scoped to the tenant**,
then filter on the tuple `(isPrimary, createdAt, id)`:

```ts
// starting_after — the page after the anchor, in the same order
OR: [
  { isPrimary: { lt: anchor.isPrimary } },               // false sorts after true
  { isPrimary: anchor.isPrimary, createdAt: { gt: anchor.createdAt } },
  {
    isPrimary: anchor.isPrimary,
    createdAt: anchor.createdAt,
    id: { gt: anchor.id },
  },
]
```

and the mirrored form for `ending_before` (fetch in reversed order, then reverse
the rows back). If the anchor id does not resolve **within the tenant**, return
an empty page — never fall through to an unfiltered first page, and never leak
another tenant's rows.

Keep the layering: the query belongs in `mailboxes.repository.ts` (the only file
allowed to import `@/db/client`), the service stays free of `req`/`res`, the
controller stays logic-free, and the response keeps the standard
`listObject({ data, hasMore, url })` envelope.

Leave the allocation endpoint's behaviour and its JSDoc exactly as they are.

## Tests

Extend `src/modules/mailboxes/__tests__/mailboxes.test.ts` in the style already
there (supertest through `createApp()`, `vi.hoisted` + `vi.mock('@/db/client')`).
Add, at minimum:

- the default first page: `take` is `limit + 1`, `has_more` false with fewer rows;
- `has_more: true` when an extra row comes back, and that the extra row is **not**
  serialised in `data`;
- a `starting_after` page: the anchor load asserted with `toHaveBeenCalledWith`
  (scoped by `tenantId`), and the tuple `OR` predicate asserted exactly on the
  `findMany` call;
- an `ending_before` page: reversed order asserted, rows reversed back;
- an unresolvable / cross-tenant cursor returning an empty page with
  `has_more: false`;
- both cursors together rejected as a validation error;
- `customer_id` still filtering, still with the ordering intact.

Assert both sides of every `{ data, error }` envelope, exact codes, exact call
counts. Keep the existing tests passing.

Also update the OpenAPI snapshot at
`src/modules/tenants/__tests__/__snapshots__/tenants.test.ts.snap` for the
renamed `operationId` and the new query parameters — write the exact expected
snapshot text; do not assume the orchestrator will regenerate it.

## Report

What you changed per finding, the exact tuple predicate you wrote for each cursor
direction, the empty-page decision you implemented for an unresolvable cursor,
and an explicit list of what you could not verify.
