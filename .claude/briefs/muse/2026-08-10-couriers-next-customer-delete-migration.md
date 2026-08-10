# Couriers Next customer-delete BFF migration

## Objective

Replace the app-local customer profile deletion call with the Couriers admin
client. The Couriers API/SDK now support a tenant-scoped customer delete with
an optional audit body. Keep the Next route an authorization-plus-transport
adapter.

## Allowed files

- `apps/couriers/src/app/api/manage/customers/[id]/route.ts`
- `apps/couriers/src/app/api/manage/customers/[id]/route.test.ts`

## Do not touch

- Any other `apps/couriers` file, including `lib/couriers.ts` and
  `lib/manage/customers.ts`
- Any `apps/couriers-api/**`, `packages/couriers/**`, Prisma, tracker, or
  `.claude/settings.local.json` file
- Do not stage, commit, reset, or discard changes.

## Required implementation

1. Replace `@/lib/service` with `$couriers` and `couriersErrorStatus` from
   `@/lib/couriers`.
2. Preserve the current request validation and manage-context authorization.
3. Call `$couriers.customers.delete(ctx.tenant.id, id, body)` with the existing
   parsed audit fields. The body may be omitted when empty if that preserves
   current behavior.
4. Preserve the browser response shape `{ data: { id, deleted: true } }` even
   though the wire response includes an `object` discriminator.
5. For a Couriers error, return its client-safe `message` and `code`, mapping
   status with `couriersErrorStatus`. Do not return the SDK envelope or a local
   database error.
6. Update the existing test file to mock `@/lib/couriers`, use a wire tombstone,
   and assert exact client arguments. Preserve all existing auth, validation,
   not-found, and success coverage.

## Verification for the orchestrator

`pnpm --filter @876/couriers-app typecheck && pnpm --filter @876/couriers-app test`

Do not run commands or claim verification. Report changed files only.
