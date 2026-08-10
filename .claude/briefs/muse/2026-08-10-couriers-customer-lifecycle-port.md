# Couriers customer lifecycle API/SDK port

## Objective

Port the remaining app-local customer profile fields and soft-delete operation
to the Couriers API/admin SDK so Next.js can retire customer-profile service
access. The Couriers API Prisma schema already has `trn`, `deletedAt`,
`deletedBy`, and `deletionReason`; do not modify Prisma schema or migrations.

## Read first

- `.agents/rules/api-backend.md`
- `.agents/rules/stripe-api-pattern.md`
- `apps/couriers/src/lib/service/customer-profiles/{retrieve.ts,update.ts,delete.ts}`
- `apps/couriers-api/src/modules/customers/**`
- `packages/couriers/src/admin/{resources/customers.ts,types/customer.schema.ts}`

## Allowed files

- `apps/couriers-api/src/modules/customers/**` except `__tests__/**`
- `packages/couriers/src/admin/resources/customers.ts`
- `packages/couriers/src/admin/types/customer.schema.ts`

## Do not touch

- Any test file, snapshot, generated Prisma output, Prisma schema/migrations,
  `apps/couriers/src/**`, `packages/couriers/src/admin/{index.ts,client.ts}`,
  or `.claude/settings.local.json`
- Do not commit, stage, reset, or discard changes.

## Required behavior

1. Add `trn` to the customer wire resource and to create/update request bodies,
   preserving nullable/optional semantics used by the current local service.
2. Add admin `DELETE /v1/tenants/:tenantId/customers/:id` that performs the
   app-local soft-delete behavior, scoped by tenant, setting timestamp, optional
   audit `deleted_by`, and optional deletion `reason`. It must return the
   standard customer tombstone resource and never hard-delete.
3. Use strict request validation, Stripe-style envelopes, Unix seconds, named
   repository methods only, and client-safe `AppHttpError` codes. Retain tenant
   isolation and 404 behavior.
4. Add `$couriers.customers.delete` and wire request/response Zod schemas in
   the existing SDK resource/type files. Do not edit package index/client files.
5. Do not add or edit tests: a separate user-owned Muse test task is working on
   Couriers API tests. The orchestrator will update/add verification afterward.

## Verification for orchestrator

`pnpm --filter @876/couriers-api typecheck && pnpm --filter @876/couriers-api test && pnpm --filter @876/couriers typecheck && pnpm --filter @876/couriers test`

Do not run commands or claim verification. Report changed files and blockers.
