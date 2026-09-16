# Couriers Next roles and team call-site migration

## Objective

Migrate the remaining role/team Next.js callers from `@/lib/service` to the
Couriers admin client. The API client already has (or is concurrently gaining)
role retrieve, team list status filtering, team update/delete, and role
create/update/delete. Keep local app DTOs only at the app boundary.

## Allowed files

- `apps/couriers/src/lib/couriers.ts`
- `apps/couriers/src/app/api/manage/roles/route.ts`
- `apps/couriers/src/app/api/manage/roles/[id]/route.ts`
- `apps/couriers/src/app/api/manage/team/[id]/route.ts`
- `apps/couriers/src/app/api/manage/team/invites/route.ts`
- `apps/couriers/src/app/[orgSlug]/settings/users/roles/(list)/page.tsx`
- `apps/couriers/src/app/[orgSlug]/settings/users/roles/[roleId]/page.tsx`
- `apps/couriers/src/app/[orgSlug]/settings/users/_lib/team-roles.ts`
- `apps/couriers/src/app/[orgSlug]/settings/users/(list)/page.tsx`
- Existing tests only for the named app API routes

## Do not touch

- Any `apps/couriers-api/**` or `packages/couriers/**` file
- Any other app file, Prisma/database files, generated output, tracker, or
  `.claude/settings.local.json`
- Do not commit, stage, reset, or discard changes.

## Required behavior

1. Add wire-to-local adapters in `lib/couriers.ts`:
   - `toRoleView(Role): RoleView` maps snake_case fields to the existing
     camelCase `RoleView` exactly.
   - `toTeamMemberView(TeamMember): TeamMemberView` maps snake_case fields to
     existing camelCase DTOs exactly.
2. Migrate role BFF create/update/delete calls to `$couriers.roles`; retain
   app BFF responses in local camelCase and map errors with
   `couriersErrorStatus` plus client-safe code/message.
3. Migrate team member PATCH/DELETE to `$couriers.team.update/delete`, mapping
   `roleId` to `role_id`, local views through `toTeamMemberView`, and tombstone
   output to the app's existing `{ id, deleted: true }` shape.
4. Migrate team invites to `$couriers.roles.retrieve`, mapping only actual
   role-not-found to the existing 404 and other client errors via
   `couriersErrorStatus`.
5. Migrate role pages and cached `listTeamRoles` to `$couriers.roles` with
   `requireCouriersData`; use `isCouriersNotFound` before `notFound()` for a
   requested role. Remove local `ensureDefaults`: new tenant creation now
   provisions default roles atomically in the API.
6. Migrate the users settings page team list to `$couriers.team.list(tenantId,
{ status })`, map members and roles through the adapters, and remove direct
   `service.team.ensure`. Tenant creation now atomically creates the owner
   membership. Preserve all platform identity/invite behavior and React cache.
7. Update existing route tests so they mock `@/lib/couriers` and use wire
   fixtures. Preserve existing auth, validation, conflict, and tombstone tests.

## Verification for orchestrator

`pnpm --filter @876/couriers-app typecheck && pnpm --filter @876/couriers-app test`

Do not run commands or claim verification. Report changed files only.
