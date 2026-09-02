# Couriers API preference module port

## Objective

Port the app-local Couriers module-preference read/update behavior to the
Couriers API and the privileged `@876/couriers/admin` client. This is a bounded
module port only; do not migrate Next.js call sites in this task.

## Read first

- `.agents/rules/api-backend.md`
- `.agents/rules/stripe-api-pattern.md`
- `.agents/rules/types.md`
- `.agents/rules/code-style.md`
- `apps/couriers/src/lib/service/preferences/retrieve.ts`
- `apps/couriers/src/lib/service/preferences/update.ts`
- `apps/couriers/src/lib/service/modules/list.ts`
- `apps/couriers-api/src/modules/settings/{settings.routes.ts,settings.schemas.ts,settings.service.ts,settings.repository.ts}`
- `packages/couriers/src/admin/resources/settings.ts`

## Required behavior

1. Add narrowly scoped admin endpoints under the existing tenant modules
   surface for resolved preferences of one known module:
   - `GET /v1/tenants/:tenantId/modules/:module/preferences`
   - `PATCH /v1/tenants/:tenantId/modules/:module/preferences`
2. Keep the existing module toggle routes unchanged. The preference routes must
   use the same module catalog as the app-local service (`@876/settings` and
   the Couriers catalog), validate one known module, and preserve the legacy
   semantic that submitted default values are removed from storage.
3. API contracts must use the standard `{ data, error }` envelope, Unix-second
   timestamps where a timestamp is exposed, machine-readable client-safe
   errors, strict request bodies, and generated OpenAPI operation IDs/docs.
   Do not expose the database storage-row shape as the public API. Return the
   resolved module preferences shape used by the current app service.
4. Put all Prisma access in the settings repository. Do not import
   `@/db/client` outside a repository. Preserve transaction/error behavior and
   use `AppHttpError` codes appropriate to the API (`module/not-found`,
   `request/invalid`, `error/database-unavailable`, etc.).
5. Add corresponding typed admin methods as `settings.preferences.retrieve`
   and `settings.preferences.update`, including Zod response/request schemas
   and public exports. Mirror the API wire shape rather than app-local
   camelCase types.
6. Add focused API and admin-client tests in **new, module-specific files**.
   Tests must mock database/provider edges and cover success, unknown module,
   invalid body, default-value removal behavior, and tenant isolation.

## Allowed file scope

- `apps/couriers-api/src/modules/settings/**`
- `apps/couriers-api/src/http/routes.ts` only if route registration requires it
- `apps/couriers-api/package.json` only if an existing workspace dependency is
  needed
- `packages/couriers/src/admin/{client.ts,index.ts,resources/settings.ts,types/settings.schema.ts}`
- New module-specific test files under those allowed paths

## Do not touch

- Any file below `apps/couriers-api/src/__tests__/`
- Any existing file below `apps/couriers-api/src/modules/tenants/__tests__/`
  including its OpenAPI snapshot
- Any other API module, generated Prisma output, Prisma schemas/migrations,
  or Next.js application files
- `.claude/settings.local.json`
- Existing uncommitted address/customer-address, tenant, portal, or user/Muse
  API-test changes

## Constraints

- Do not run commands; this environment prevents Muse from doing so.
- Do not commit, stage, reset, or discard changes.
- Report every changed file and any assumptions. The orchestrator will review,
  update the OpenAPI snapshot if necessary, and run all checks.

## Verification for the orchestrator

`pnpm --filter @876/couriers-api typecheck && pnpm --filter @876/couriers-api lint && pnpm --filter @876/couriers-api boundaries && pnpm --filter @876/couriers-api test && pnpm --filter @876/couriers typecheck && pnpm --filter @876/couriers test`
