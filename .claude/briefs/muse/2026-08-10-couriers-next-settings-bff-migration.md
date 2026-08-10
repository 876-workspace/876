# Couriers Next settings BFF migration

## Objective

Replace the remaining app-local settings service calls in the two management
route handlers with the Couriers admin client. The API and SDK now expose both
module state and preference endpoints. Keep the routes as authorization plus
transport only; do not move business logic back into Next.

## Allowed files

- `apps/couriers/src/app/api/manage/settings/modules/route.ts`
- `apps/couriers/src/app/api/manage/settings/modules/[moduleKey]/route.ts`
- The existing tests for exactly those routes, if their mocks/assertions need
  updating.

## Do not touch

- `apps/couriers/src/lib/couriers.ts`
- Any `apps/couriers-api/**` or `packages/couriers/**` file
- Any customer, role, team, portal, Prisma, tracker, or unrelated app file
- `.claude/settings.local.json`
- Do not stage, commit, reset, or discard changes.

## Required implementation

1. Import `$couriers` and `couriersErrorStatus` from `@/lib/couriers`; remove
   `@/lib/service` imports.
2. In `modules/route.ts`, replace `service.modules.list` with
   `$couriers.settings.list(ctx.tenant.id)` and unwrap `{ data, error }`.
   Preserve the existing browser payload exactly. Replace `service.modules.toggle`
   with `$couriers.settings.update(ctx.tenant.id, moduleKey, { is_enabled })`.
3. In `[moduleKey]/route.ts`, replace `service.preferences.retrieve/update` with
   `$couriers.settings.preferences.retrieve/update`. Preserve the local response
   shape expected by existing UI code: `{ module, preferences, updatedAt }`;
   translate `updated_at` to `updatedAt`.
4. For all Couriers errors, respond with `error.message`, `couriersErrorStatus`,
   and the client-safe `error.code`. Do not expose an HTTP status or service
   error object to the browser.
5. Update only existing tests in scope to mock `@/lib/couriers` and assert the
   exact client calls, including module key and preference body.

## Verification for the orchestrator

`pnpm --filter @876/couriers-app typecheck && pnpm --filter @876/couriers-app test`

Do not run commands or claim verification. Report changed files only.
