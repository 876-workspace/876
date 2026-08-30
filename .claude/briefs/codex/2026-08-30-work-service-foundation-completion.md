# Work service foundation — completion pass

You are completing the `feature/work-service-foundation` branch in the 876 monorepo.
The Work service (`apps/work-api` + `packages/work`) was extracted from CRM so that
tasks and reminders live in their own bounded context. The extraction already works
end to end and every check below is currently green:

```
pnpm --filter @876/core        typecheck test
pnpm --filter @876/work        typecheck lint test
pnpm --filter @876/work-api    typecheck lint test
pnpm --filter @876/crm-api     typecheck lint test
pnpm check:service-bundle
```

Do not regress any of them. Four defects remain. Fix all four.

## Context you must read first

- `.claude/rules/express-api.md` — module shape, layer responsibilities, list envelope.
- `.claude/rules/sdk-conventions.md` — the `<resource>.<verb>()` vocabulary.
- `.claude/rules/testing.md` — the assertion standard. Read it; the tests you write
  are judged against it.
- `apps/crm-api/src/**` — the sibling service. `apps/work-api` deliberately mirrors
  its conventions (Zod schemas per module, `sendCrmResult`-style helpers, no OpenAPI
  registry, no dependency-cruiser). **Match the sibling. Do not introduce a new
  pattern that CRM does not already have**, and do not add OpenAPI generation or a
  boundaries script — that is platform-wide debt tracked separately.

## Defect 1 — Work has no `retrieve` verb

`apps/crm-api/src/modules/tasks/tasks.service.ts` and its reminders twin implement
`findWorkTask` / `findWorkReminder` by calling `workClient().tasks.list(...)` for the
whole request and scanning the array for one id. That is an unbounded fetch on every
update and every delete, and `retrieve` is a required verb in `sdk-conventions.md`.

Do:

1. Add `GET /:taskId` and `GET /:reminderId` to `apps/work-api/src/modules/*/`,
   following the existing routes/controller/service/repository split exactly. The
   service must resolve the tenant first (`requireTenant`) and return `null` when the
   row is absent or soft-deleted, so the controller answers `work/task-not-found` /
   `work/reminder-not-found`.
2. Add `retrieve(organizationId, id)` to `packages/work/src/resources/tasks.ts` and
   `reminders.ts`.
3. Replace `findWorkTask` / `findWorkReminder` in CRM with the new `retrieve` call.
   Preserve the existing CRM behaviour precisely: a Work not-found still returns
   `null` (so the route answers CRM's own 404), any other Work failure still returns
   `getError('crm/work-unavailable')`, and the CRM request context is still validated
   before Work is touched.
4. **The retrieved task must still belong to this CRM request.** The old list-scan
   gave that for free because the list was context-filtered. `retrieve` does not.
   After retrieving, verify `task.context` equals
   `{ service: 'crm', resource: 'request', id: requestId }` and return `null` when it
   does not. A task belonging to another request must not be updatable or deletable
   through that request's URL. Write a test for exactly that.

## Defect 2 — list endpoints are unpaginated

`apps/work-api/src/http/result.ts` `sendWorkList` hardcodes `has_more: false` and
`total_count: result.length`, and the repositories have no `take`. A general-purpose
work service cannot return every task an organization has ever created.

Do:

1. Add cursor pagination to the Work task and reminder list endpoints, following the
   platform contract: `limit` (default 25, maximum 100), `starting_after`,
   `ending_before`, all item-id based. Never offset pagination.
2. Repositories fetch `limit + 1` rows to compute a truthful `has_more`, and return
   only `limit`. Keep the existing `orderBy` (`sortOrder asc, createdAt asc` for
   tasks) and make it deterministic by appending `id: 'asc'` as the final tiebreak —
   two rows with the same sortOrder and createdAt currently order nondeterministically,
   which makes cursor pagination skip or repeat rows.
3. `total_count` becomes `null` (the platform contract allows it, and counting every
   row per page is the wrong default). Do not run a second count query.
4. Thread `limit` / `starting_after` / `ending_before` through
   `WorkTaskListFilter` / `WorkReminderListFilter` and the `@876/work` resources.
5. CRM's task and reminder lists must keep returning the whole set for a request.
   Page through Work from CRM until `has_more` is false, with a hard safety bound
   (e.g. stop after 20 pages) so a Work bug cannot spin CRM forever.

## Defect 3 — `packages/core/src/lib/errors/work.ts` has no catalog test

Every other error catalog in that directory has an exhaustive contract test.
`crm.catalog.advanced.test.ts` is the model. Add `work.catalog.advanced.test.ts`
asserting the same properties for `WORK_ERRORS`: exact code count, `work/` +
kebab-case prefix on every code, messages non-empty/trimmed/period-terminated with no
stack or provider leakage, message length between 10 and 200, valid HTTP statuses, no
duplicate codes, alphabetical ordering if the sibling asserts it, no placeholder text,
and that every code round-trips through `getError` / `isErrorCode` / `toAppError` with
`httpStatus` stripped from the client-facing shape.

## Defect 4 — `apps/work-api` has no route-level tests

`supertest` is already a devDependency and is unused. `testing.md` requires HTTP
behaviour to be exercised through the assembled Express middleware, not by calling
controllers directly.

Add `apps/work-api/src/**/__tests__/*.routes.test.ts` covering, for tasks, reminders,
and tenants:

- a missing `x-internal-key` returns 401 with the exact `work/unauthorized` code;
- a wrong `x-internal-key` returns 401 (and prove `secretsMatch` rejects a value that
  is merely a prefix of the configured key);
- an unknown path 404s rather than 401ing (guards attach per route, never via
  `router.use`);
- a valid request returns the full `{ data, error: null }` envelope with the real
  resource shape asserted field by field — not `toBeDefined()`;
- each validation failure returns `work/invalid-request` with the right status;
- an unknown-organization request returns `work/tenant-not-found`, and a suspended
  tenant returns `work/tenant-inactive`;
- a client-facing error body never contains `httpStatus`;
- the list envelope is `{ object: 'list', data, has_more, total_count, url }` and
  `has_more` is genuinely `true` when more rows exist than the page size.

Mock the repository layer (or the prisma client) — these tests must not need a
database. `apps/crm-api` has route tests you can copy the mocking approach from. If
`apps/work-api/src/db/index.ts` throwing at module load makes that awkward, make the
prisma client resolve lazily behind a getter so importing the module without
`WORK_DATABASE_URL` is safe; keep the fail-fast error for the first actual query.

## Rules that are not negotiable

- Never add `eslint-disable` or `as any` to satisfy a gate. Use `as unknown as T`
  where an intentional type violation is genuinely needed in a test.
- Do not weaken an existing assertion or delete a test to make the suite pass.
- Do not commit. Leave every change in the working tree.
- Do not touch `pnpm-lock.yaml`, any `.env*` file, or anything under
  `apps/*/prisma/migrations/` except by adding a new Work migration if a schema
  change is genuinely required (it should not be — none of the four defects needs
  one).
- Wire time deterministically in tests (`vi.useFakeTimers` + `vi.setSystemTime`, with
  `vi.useRealTimers()` in `afterEach`) wherever a timestamp is asserted.

## Verification you must run before reporting

```
pnpm --filter @876/work     typecheck && pnpm --filter @876/work     lint && pnpm --filter @876/work     test
pnpm --filter @876/work-api typecheck && pnpm --filter @876/work-api lint && pnpm --filter @876/work-api test
pnpm --filter @876/crm-api  typecheck && pnpm --filter @876/crm-api  lint && pnpm --filter @876/crm-api  test
pnpm --filter @876/core     test
pnpm check:service-bundle
```

Report the **counted** number of `it()` cases you added per file, every file changed
with the reason, anything you could not verify, and anything you deliberately left
out. A truthful "not done" is worth more than a confident claim.
