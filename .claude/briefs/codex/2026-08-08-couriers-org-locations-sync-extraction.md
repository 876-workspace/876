# Brief — lift the org-locations mirror out of the couriers service layer

## Why

`apps/couriers/src/lib/service/**` is being kept pure so it can move into a
standalone `apps/couriers-api` unchanged. A boundary gate now enforces that
(`apps/couriers/.dependency-cruiser.cjs`, `pnpm --filter @876/couriers boundaries`).

Exactly one module violates it, and it is currently an explicit, commented
exception in that config:

- `src/lib/service/org-locations/sync.ts` imports `next/server` (`after`) and
  `@/lib/876/platform-client`.
- `src/lib/service/org-locations/reconcile.ts` imports `sync` and so inherits it.
- `branches.create`, `branches.update`, `warehouses.create`, and
  `warehouses.update` each call `scheduleSync(...)` from inside the service verb.

The mirror is **orchestration**: it composes a couriers write with a call to the
core identity API. It does not belong in the layer that owns table access. Your
job is to move it out and delete the exception.

## Read first

- `.claude/rules/sdk-conventions.md` — app-local datastore layering.
- `.claude/rules/express-api.md` — the shape the service layer is being kept for.
- `apps/couriers/.dependency-cruiser.cjs` — the rules and the exception to remove.
- `apps/couriers/src/lib/manage/customers.ts` — the reference for what an
  orchestration module looks like in this app (server-only, composes `service`
  with an 876 client, returns the app's `ServiceResult`).
- Every file listed under "Scope" below, in full, before editing any of them.

## Scope — the complete list of files you may touch

```
apps/couriers/src/lib/manage/org-locations.ts                (create)
apps/couriers/src/lib/manage/org-locations.test.ts           (create)
apps/couriers/src/lib/service/org-locations/sync.ts          (move out / delete)
apps/couriers/src/lib/service/org-locations/sync.test.ts     (move with it)
apps/couriers/src/lib/service/org-locations/reconcile.ts     (rework)
apps/couriers/src/lib/service/org-locations/reconcile.test.ts
apps/couriers/src/lib/service/org-locations/index.ts
apps/couriers/src/lib/service/branches/create.ts
apps/couriers/src/lib/service/branches/update.ts
apps/couriers/src/lib/service/branches/create.test.ts
apps/couriers/src/lib/service/warehouses/create.ts
apps/couriers/src/lib/service/warehouses/update.ts
apps/couriers/src/app/api/manage/branches/route.ts
apps/couriers/src/app/api/manage/branches/[id]/route.ts
apps/couriers/src/app/api/manage/warehouses/route.ts
apps/couriers/src/app/api/manage/warehouses/[id]/route.ts
apps/couriers/.dependency-cruiser.cjs
```

**Do not touch `src/lib/service/customer-profiles/`, `src/lib/manage/customers.ts`,
`src/app/[orgSlug]/customers/`, or `src/app/api/manage/customers/`.** Another
task is editing those concurrently and a conflict there will be thrown away.

## What to build

### 1. `src/lib/manage/org-locations.ts`

Move `SyncSite`, `sync`, and `scheduleSync` here verbatim — same behaviour, same
"never throws" contract, same `after()` scheduling, same Sentry reporting. Keep
the existing doc comments; they explain why the mirror is off the request path
and that is still true.

Add two mappers so a caller does not hand-assemble the payload at four sites:

```ts
export function branchSyncSite(view: BranchView): SyncSite
export function warehouseSyncSite(view: WarehouseView): SyncSite
```

Each builds exactly the object the corresponding `scheduleSync(orgId, {...})`
call site builds today — copy those four object literals rather than inventing
fields, and check that `create` and `update` for the same kind really do build
the same shape before collapsing them into one mapper.

### 2. The four service verbs

Remove the `scheduleSync` import and call from `branches/create.ts`,
`branches/update.ts`, `warehouses/create.ts`, `warehouses/update.ts`. They keep
returning the same `ServiceResult<...>` they return now. Nothing else changes —
in particular the transaction bounds and error mapping stay exactly as they are.

Update `branches/create.test.ts` (and any other test that mocks
`../org-locations/sync`) to drop that mock, and assert instead that the verb no
longer schedules anything.

### 3. The four route handlers

After a successful result, schedule the mirror:

```ts
if (result.error) return apiJson(/* unchanged */)

scheduleSync(ctx.tenant.orgId, branchSyncSite(result.data))

return apiJson({ data: result.data }, { status: 201 })
```

`scheduleSync` uses `after()`, so it must be called from the request scope —
that is precisely why it belongs here and not in the service layer.

### 4. `reconcile.ts`

`reconcile` legitimately reads couriers tables **and** drives the mirror, so it
is orchestration too, not a service verb. Move the orchestration half into
`src/lib/manage/org-locations.ts` and leave in `service/org-locations/` only the
plain reads it needs (a `listSites`-style verb returning the branches and
warehouses it iterates). `service.orgLocations` then exposes that read; the
manage module composes read + `sync`.

Keep `reconcile`'s existing semantics exactly: same ordering, same
never-throw-per-site behaviour, same reporting. Update every caller — grep for
`orgLocations.reconcile` across `src/` and fix all of them.

### 5. Delete the exception

Remove both `pathNot: '^src/lib/service/org-locations/'` carve-outs from
`apps/couriers/.dependency-cruiser.cjs`, along with the KNOWN EXCEPTION comment
block above the first one, and the "Same exception, same reason" comment above
the second. The rules then apply to the whole service layer with no holes.

## Tests

- `src/lib/manage/org-locations.test.ts`: `scheduleSync` defers via `after`;
  `sync` never throws when the platform call fails and reports once;
  `branchSyncSite` / `warehouseSyncSite` map every field of a realistic view.
- Route tests, where they exist, assert the mirror is scheduled **once** on
  success and **not at all** when the service verb returns an error. That second
  assertion is the one that matters: a failed write must not mirror.
- Keep `reconcile`'s existing test coverage green, adapted to its new home.

Follow `.claude/rules/testing.md`: exact arguments, exact call counts, both sides
of every `{ data, error }`.

## Verify — all must pass

```bash
cd /workspaces/876/apps/couriers
pnpm exec tsc --noEmit
pnpm exec eslint src
pnpm exec depcruise src --config .dependency-cruiser.cjs
pnpm exec vitest run src/lib/service/branches src/lib/service/warehouses src/lib/service/org-locations src/lib/manage "src/app/api/manage/branches" "src/app/api/manage/warehouses"
```

`depcruise` must report **no violations with no exception in the config**. That
is the whole point of the task; if it still needs the carve-out, the move is not
finished.

Do not commit, branch, or push.
