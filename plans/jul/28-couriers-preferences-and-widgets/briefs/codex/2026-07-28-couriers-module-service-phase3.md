# Phase 3 — couriers modules & preferences service layer and route handlers

## Goal

Make the module settings from Phase 2 readable and writable: a `service` layer over
Prisma, plus thin permission-checked route handlers so client components can save
changes. No UI in this phase.

Phases 1 and 2 are already merged into this branch. **Read these first** and build on
them — do not redefine anything they already provide:

- `packages/settings/src/` — `resolveModulePreferences`, `resolveCatalogPreferences`,
  `diffPreferences`, `moduleUpdateSchema`, `findModule`, `encodePreference`.
- `apps/couriers/src/lib/modules/catalog.ts` — `COURIERS_MODULE_CATALOG`,
  `isCourierModuleKey`.
- `apps/couriers/src/types/module-settings.ts` — the param types.

## Scope — files

**Create:**

```
apps/couriers/src/lib/service/modules/list.ts
apps/couriers/src/lib/service/modules/toggle.ts
apps/couriers/src/lib/service/modules/index.ts
apps/couriers/src/lib/service/modules/toggle.test.ts
apps/couriers/src/lib/service/preferences/retrieve.ts
apps/couriers/src/lib/service/preferences/update.ts
apps/couriers/src/lib/service/preferences/index.ts
apps/couriers/src/lib/service/preferences/update.test.ts
apps/couriers/src/app/api/manage/settings/modules/route.ts
apps/couriers/src/app/api/manage/settings/modules/[moduleKey]/route.ts
```

**Modify:**

```
apps/couriers/src/lib/service/index.ts   (register the two new resources only)
```

Do not modify anything else. **Do not commit.** Do not touch
`src/lib/service/branches/` or `src/lib/service/tenants/` — another change is in
those files concurrently and you will conflict.

## Study the existing conventions before writing

- `apps/couriers/src/lib/service/warehouses/list.ts` — a read verb returns a plain
  value, no envelope.
- `apps/couriers/src/lib/service/tenants/create.ts` — a mutation returns
  `ServiceResult<T>` via `ok()` / `err()` from `../result`, and maps unique-constraint
  failures with `isUniqueConstraintError` from `../prisma-errors`.
- `apps/couriers/src/lib/service/warehouses/list.test.ts` — the required Prisma
  mocking pattern (`vi.hoisted` + `mockPrismaRef` + a getter in `vi.mock('@/lib/db')`).
  Use exactly this pattern; do not invent another.
- An existing route handler under `apps/couriers/src/app/api/manage/` — copy its
  session/tenant resolution and permission-check shape verbatim rather than inventing
  one. Find one that already calls `requireManagePermission` or the equivalent guard
  and follow it exactly.

## 1. `service.modules`

### `list(params: ModuleStateListParams)`

Returns every module in `COURIERS_MODULE_CATALOG` with its **effective** enabled
state, as `{ module, label, optional, isEnabled }[]` in catalog order.

Read the tenant's `organizationModule` rows once, build a `Map` keyed by module, then
for each catalog module resolve `row?.isEnabled ?? module.enabledByDefault`.

**A missing row means "use `enabledByDefault`", never "disabled".** Do not filter the
catalog by what rows exist.

### `toggle(params: ModuleToggleParams): ServiceResult<{ module: string; isEnabled: boolean }>`

- Reject an unknown module key with `err('Unknown module.', 404)` — validate with
  `isCourierModuleKey` **and** `findModule`, never by trusting the caller.
- Reject disabling a module whose catalog entry has `optional: false` with
  `err('That module cannot be turned off.', 409)`. Structural modules are not
  optional and the API must enforce that, not just the UI.
- Otherwise upsert the row. Prisma's `upsert` is fine **here** — the vocabulary ban on
  `upsert` in `sdk-conventions.md` is about the exposed verb name; the service verb is
  called `toggle`, which is a state transition. Use the
  `organization_modules_tenant_id_module_key` unique index.
- Set `createdAt`/`updatedAt` with `nowUnixSeconds()` from `@876/core/timestamps`.

## 2. `service.preferences`

### `retrieve(params: ModulePreferenceListParams)`

Loads the tenant's `modulePreference` rows (filtered to `params.module` when given),
maps each Prisma row to the package's `StoredPreferenceRow` shape, and returns:

- when `params.module` is set — `resolveModulePreferences(module, rows)`, i.e. a fully
  defaulted `ResolvedModulePreferences` for that one module;
- when it is absent — `resolveCatalogPreferences(COURIERS_MODULE_CATALOG, rows)`.

Return `null` when `params.module` is set but is not a known module key.

Every declared key must be present in the result even with zero stored rows.

### `update(params: ModulePreferenceUpdateParams): ServiceResult<ResolvedModulePreferences>`

Order of operations matters — follow it exactly:

1. Resolve the module from the catalog; unknown ⇒ `err('Unknown module.', 404)`.
2. Validate `params.values` with `moduleUpdateSchema(module).safeParse(...)`. On
   failure return `err(<first issue message>, 400)`. This is what rejects unknown keys
   and read-only keys, so it must run **before** any write.
3. Load current rows and resolve them to current values.
4. Compute `diffPreferences(module, current, parsedValues)`.
5. In a single `prisma.$transaction`, for each diffed row **upsert** it on
   `module_preferences_tenant_id_module_key_key`, writing `updatedBy` and timestamps.
6. **Delete** the stored row for any patched key whose new value equals the catalog
   default, so a value reverted to its default goes back to being absent. This is the
   rule that keeps defaults changeable later — do not skip it.
7. Return `ok(resolveModulePreferences(module, rowsAfterWrite))`.

Never write a row whose value equals the catalog default.

## 3. Route handlers — thin, and authorized first

Both handlers are **pure transport**: resolve the session and tenant, check the
permission, call `service`, return `{ data }` or `{ error }`. **No business logic.**

- `GET /api/manage/settings/modules` → `service.modules.list`. Requires the
  `settings.view` permission.
- `PATCH /api/manage/settings/modules` → `service.modules.toggle`. Requires
  `settings.edit`.
- `GET /api/manage/settings/modules/[moduleKey]` → `service.preferences.retrieve` for
  that module. Requires `settings.view`. 404 when it returns null.
- `PATCH /api/manage/settings/modules/[moduleKey]` → `service.preferences.update`.
  Requires `settings.edit`.

Hard requirements:

- **`tenantId` comes from the resolved session/tenant context, never from the request
  body or a query param.** A caller must not be able to name another tenant. This is
  the single most important line in this brief.
- `updatedBy` is the authenticated user id from the session, never from the body.
- Return the app's existing error envelope shape; do not invent a new one.
- No `console.log`. Errors already surface through the service layer.

## Testing

Per `.claude/rules/testing.md`, using the `mockPrismaRef` pattern:

`toggle.test.ts`

- Enabling a module with no existing row creates one.
- Disabling a module with `optional: false` returns a 409 and **writes nothing**
  (assert `not.toHaveBeenCalled()` on the write).
- An unknown module key returns 404 and writes nothing.

`update.test.ts`

- An unknown preference key is rejected 400 and **writes nothing**.
- A value that differs from the default is written.
- A value **equal to the default deletes** the stored row rather than writing it.
- An out-of-range integer (e.g. `packages.volumetric_divisor = 50`) is rejected 400.
- A decimal is written as a **string**, asserted on the actual write argument.
- A successful update returns every declared key of the module, not just the patched
  ones.

Assert full shapes and exact call arguments, not `toBeDefined()`.

## Verification (must pass before reporting done)

```
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers test
```

If typecheck reports errors in `src/lib/service/branches/**` or
`src/lib/service/tenants/**`, ignore them — those files are owned by a concurrent
change. Report them rather than editing them.

## Rules

`.claude/rules/module-settings.md` (read this first — it is the rule this phase
implements), `.claude/rules/api-access.md` (no server actions; route handlers are pure
transport), `.claude/rules/sdk-conventions.md` (only `src/lib/service/` may touch
`prisma`), `.claude/rules/types.md`, `.claude/rules/code-style.md`.

Prettier: single quotes, no semicolons.

## Out of scope

- No UI, pages, or components.
- No changes to `packages/settings`, `apps/api`, the Prisma schema, or the catalog.
- No git commits.
