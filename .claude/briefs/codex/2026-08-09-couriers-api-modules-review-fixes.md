# Brief — fix the review findings on `apps/couriers-api` (PR #215)

Working directory: **`/root/projects/876`**, on branch **`feat/couriers-api-modules`**
(already checked out for you). Do **not** create a worktree; do **not** create,
switch, or reset a branch; do **not** commit or push. Leave the work in the tree.

Scope: **`apps/couriers-api/**` only.** Do not touch `apps/couriers/**`,
`packages/**`, any Prisma schema, or any migration. Another agent may be editing
`packages/couriers` concurrently — stay out of it.

Governing rules, binding: `.claude/rules/express-api.md` (layer
responsibilities, contracts, pagination), `.claude/rules/testing.md`,
`.claude/rules/stripe-api-pattern.md`, `.claude/rules/naming.md`.

There are **six** findings. All six were verified against the code before this
brief was written — they are real, not speculative. Fix every one, with tests.

---

## 1 (architectural, highest value) — services must stop querying Prisma

`.claude/rules/express-api.md` is explicit: **only a `*.repository.ts` may
import the Prisma client**, and a service must contain business rules, not
queries. Six repositories currently end with `export { prisma }`, and their
services import it and query models directly:

```
branches.service.ts    2 prisma.* calls
customers.service.ts   9
packages.service.ts    4
settings.service.ts    2
team.service.ts       13
warehouses.service.ts  6
```

The `dependency-cruiser` rule `prisma-only-in-repositories` passes only because
the import is laundered through the repository re-export. That defeats the entire
boundary and is exactly what makes a later extraction a rewrite.

Do this:

- Move **every** `prisma.*` call out of every `*.service.ts` into a named
  function on that module's `*.repository.ts`. The function name says what it
  loads or writes (`findTenantBranchById`, `countActiveMembersForRole`), not how.
- Delete every `export { prisma }` from every repository.
- Tighten `.dependency-cruiser.cjs` with a rule that forbids importing `prisma`
  from anywhere but `src/db/` and a `*.repository.ts` — i.e. make the
  re-export path itself a violation, so this cannot regress. Verify your new
  rule actually fails when you temporarily reintroduce a re-export, then remove
  the temporary change.
- Keep transactions working: where a service composes several writes, the
  **repository** owns the `$transaction`, taking the data it needs as arguments.
  Do not leak a `Prisma.TransactionClient` into a service signature.
- This is a refactor: **no behavior may change.** The existing tests must pass
  untouched except where a mock now targets a different call shape.

## 2 (P1) — cursor pagination is unreachable on customers and packages

`listCustomersQuerySchema` and `listPackagesQuerySchema` accept `limit` and
report `has_more: true`, but accept **no cursor**, so a caller can only ever
fetch the first page. Per `.claude/rules/express-api.md`, list endpoints paginate
by `starting_after` / `ending_before` on item IDs.

- Add `starting_after` and `ending_before` (both optional, mutually exclusive —
  mirror the `.refine(...)` already in `listBranchesQuerySchema`).
- Both lists order by `[createdAt desc, id desc]`. A single-column `id` cursor is
  **wrong** for that ordering. Load the anchor row by id (scoped to the tenant)
  and filter on the **tuple**:

  ```ts
  // starting_after (next page, same desc order)
  OR: [
    { createdAt: { lt: anchor.createdAt } },
    { createdAt: anchor.createdAt, id: { lt: anchor.id } },
  ]
  ```

  and the mirrored `gt` form, ascending, then reverse, for `ending_before`.
- An unknown or cross-tenant anchor id must not leak another tenant's page:
  scope the anchor load by `tenantId` and return an empty page (or a 400 —
  pick one, state which and why) when it does not resolve.
- `src/http/envelope.ts` already exports an unused `paginateByCursor` helper
  built for a single-key cursor. Either extend it to carry a tuple cursor and use
  it in both modules, or delete it and write the tuple logic in the
  repositories — **do not leave a half-used helper behind.** Say which you chose.

## 3 (P2) — the branch cursor predicate contradicts the branch ordering

`listBranches` orders by `[isDefault desc, name asc, id asc]` but filters with a
bare `id > cursor` / `id < cursor`. With generated ids, the "next page" is
neither the next page nor stable. Fix it the same tuple way, on the real sort
keys `(isDefault, name, id)`, anchored on the row loaded by cursor id and scoped
to the tenant. Keep the display ordering — it is intentional that the default
branch sorts first.

## 4 (P2) — `?is_active=false` is parsed as `true`

`listBranchesQuerySchema` uses `z.coerce.boolean()`, and `Boolean("false")` is
`true`, so inactive branches are unrequestable. Accept the literal strings and
transform:

```ts
is_active: z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional()
```

Grep the whole service for other `z.coerce.boolean()` uses on a query or param
schema and fix each the same way. `z.coerce.number()` on `limit` is fine — leave
it.

## 5 (P1) — cross-tenant ids are accepted on package and customer writes

`createPackage` / `updatePackage` write `customer_id`, `branch_id` and
`mailbox_id` straight through, and Prisma's relations are keyed on globally
unique ids, so an id belonging to **another tenant** is accepted and the package
is then listed under this tenant. The same applies to `branch_id` on customer
create/update.

Validate every referenced id belongs to the acting tenant before the write, and
reject with a stable namespaced code and a 4xx status consistent with the rest of
the service (`404` for "not found in this tenant" — do not invent a new shape).
Do it in the **service**, over repository lookups scoped by `tenantId`; do not
push the check into a Prisma `connect`. Batch the lookups (one query per
referenced resource, not one per field per call) and skip a lookup entirely when
the field is absent or explicitly `null`.

## 6 (P2) — an omitted `branch_id` on customer create ignores the tenant default

`createCustomerProfile` writes `branchId: null` when `branch_id` is omitted. The
Next app's own flow resolves the tenant's default branch first, so a profile
created through this API has no routing destination while one created through the
app does — the same tenant, two behaviors.

**Read `apps/couriers/src/lib/service/customers/**` first and match what it
actually does** (it is the behavior being ported; do not invent a third rule).
If it resolves the default branch, resolve it here the same way — omitted means
"tenant default", explicit `null` means "deliberately none". Say plainly in your
report what the Next flow does and what you implemented.

---

## Tests

Per `.claude/rules/testing.md`, and note that `customers`, `packages`, `team`,
`settings` and `warehouses` have **no `__tests__/` directory at all** today —
`branches` and `tenants` are the only tested modules. You are adding behavior to
untested modules; cover the behavior you touch:

- pagination: first page, `starting_after` page, `ending_before` page, the
  tuple predicate asserted **at the repository call** with
  `toHaveBeenCalledWith`, an unresolvable cursor, and `has_more` in both states;
- `?is_active=false` returning inactive rows, asserted at the query;
- a cross-tenant `customer_id` / `branch_id` / `mailbox_id` rejected with the
  exact code and status, asserting the **write never happened**
  (`expect(prisma.package.create).not.toHaveBeenCalled()`);
- an omitted `branch_id` resolving to the tenant default, and an explicit `null`
  staying null;
- for the refactor: the existing suites still pass.

Assert both sides of every `{ data, error }` envelope, exact codes, exact call
counts. Realistic Jamaican-courier fixtures. Follow the mocking style already in
`apps/couriers-api/src/modules/branches/__tests__/branches.test.ts` (the
`vi.hoisted` + `vi.mock('@/db/client')` pattern) — supertest through the real
middleware chain, not a controller called directly.

Extend the OpenAPI snapshot in
`src/modules/tenants/__tests__/__snapshots__/tenants.test.ts.snap` for the new
query parameters.

## Verify (all foreground, all must pass)

```
pnpm --filter @876/couriers-api typecheck
pnpm --filter @876/couriers-api lint
pnpm --filter @876/couriers-api test
pnpm --filter @876/couriers-api boundaries
pnpm --filter @876/couriers-api build
npx prettier --check "apps/couriers-api/**/*.ts"
```

## Report

For each of the six findings: what you changed, and the decision you made where
this brief offered a choice (anchor-not-found behavior, `paginateByCursor`
extended vs deleted, the default-branch rule you found in the Next service).
Then: anything you believe is still wrong in `apps/couriers-api` that you did not
change, and the verbatim final line of every command above.
