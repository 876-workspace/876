# Couriers Next role call-site migration

## Objective

Mechanically migrate the remaining **role-only** Couriers Next.js call sites
from `@/lib/service` to the existing `@876/couriers/admin` client. Keep the
app's established local view DTOs at the BFF/UI boundary by adding a narrow
wire-to-view adapter. Do not work on team-membership deletion or settings
preferences in this task.

## Read first

- `.agents/rules/types.md`
- `.agents/rules/code-style.md`
- `.agents/rules/data-fetching.md`
- `.agents/rules/api-access.md`
- `apps/couriers/src/lib/couriers.ts`
- `packages/couriers/src/admin/resources/roles.ts`
- `packages/couriers/src/admin/types/role.schema.ts`
- `apps/couriers/src/types/role.ts`
- Existing migrated BFF example: `apps/couriers/src/app/api/manage/branches/route.ts`

## Exact allowed files

- `apps/couriers/src/lib/couriers.ts`
- `apps/couriers/src/app/api/manage/roles/route.ts`
- `apps/couriers/src/app/api/manage/roles/[id]/route.ts`
- `apps/couriers/src/app/[orgSlug]/settings/users/roles/(list)/page.tsx`
- `apps/couriers/src/app/[orgSlug]/settings/users/_lib/team-roles.ts`
- Tests only for the two role BFF routes named above, if they already exist.

## Do not touch

- Any `apps/couriers-api/**` file (another Muse task owns API work)
- Any `packages/couriers/**` file
- Any other `apps/couriers/**` file, generated Prisma code, Prisma schema,
  `.claude/settings.local.json`, tracker, or unrelated tests
- Do not commit, stage, reset, or discard changes.

## Required implementation

1. In `apps/couriers/src/lib/couriers.ts`, import `Role` from
   `@876/couriers/admin` and `RoleView` from `@/types/role`. Add exactly this
   boundary adapter (following the existing tenant/address/branch adapters):

```ts
export function toRoleView(role: Role): RoleView {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    isDefault: role.is_default,
    systemKey: role.system_key,
    memberCount: role.member_count,
    createdAt: role.created_at,
    updatedAt: role.updated_at,
  }
}
```

2. Migrate the role create/update/delete BFF routes to `$couriers.roles`:
   - preserve existing request Zod validation and same-origin response DTOs;
   - call `toRoleView` for successful create/update responses;
   - preserve role tombstones as `{ id, deleted: true }` (do not leak the
     SDK's `object: 'role'` discriminator through this existing app BFF);
   - map client errors with `couriersErrorStatus(error)` and return
     `error.message` plus `error.code`, exactly like the existing migrated
     branch/address BFF routes.

3. Migrate team invite's tenant-role lookup to `$couriers.roles.retrieve`.
4. Migrate the roles-list page and `listTeamRoles` helper to `$couriers.roles`.
   - `list` results are `List<Role>`: map `result.data.data` through
     `toRoleView` after `requireCouriersData`.
   - Remove `service.roles.ensureDefaults` from the roles list page. Tenant
     creation now provisions Admin and Staff atomically in the Couriers API;
     this page must not directly mutate the retired local database.
   - Preserve `React.cache` in `listTeamRoles`.

5. Do not change `apps/couriers/src/app/api/manage/team/invites/route.ts` or
   `apps/couriers/src/app/[orgSlug]/settings/users/roles/[roleId]/page.tsx`.
   The Couriers API has no role-retrieve route yet, so they must remain on the
   local service until that API capability is ported separately.

6. Update the existing BFF route tests so they mock `@/lib/couriers`, not
   `@/lib/service`. Use actual snake_case Couriers wire fixtures and check the
   local camelCase response DTO mapping at the route boundary. Keep all
   existing authorization, validation, conflict, and tombstone assertions.

## Verification (run if possible; report failures plainly)

`pnpm --filter @876/couriers-app typecheck`

`pnpm --filter @876/couriers-app exec vitest run src/app/api/manage/roles/route.test.ts src/app/api/manage/roles/[id]/route.test.ts --reporter=dot`

## Return

Report changed files, tests attempted/not attempted, and anything that blocked
the specified migration.
