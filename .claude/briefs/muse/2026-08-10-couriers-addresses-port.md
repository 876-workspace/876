# Couriers API address and customer-address port

## Scope

Implement the legacy Couriers address and customer-address persistence APIs in
`apps/couriers-api` on the current branch. This is a mechanical extraction
task; do not change authentication, SDK code, Next app call sites, deployment,
or unrelated files. Do **not** run tests, formatters, Prisma CLI commands, or
commit.

## Sources of truth

- `apps/couriers/src/lib/service/addresses/**`
- `apps/couriers/src/lib/service/customer-addresses/**`
- `apps/couriers/src/types/address.ts`
- `apps/couriers/src/types/customer-address.ts`
- Existing Couriers API module patterns (especially `branches`, `customers`,
  and `warehouses`).

## Required implementation

1. Add the missing `CustomerAddress` Prisma model to the API schema, with the
   existing tenant-safe composite relations and indexes. Add the necessary
   relation fields to API `Address`, `CourierCustomerProfile`, and `Tenant`.
   The physical table already exists from the shared transition database: do
   not create or apply a database migration.
2. Add an admin-only `addresses` module with tenant-scoped list, create,
   retrieve, update, and delete routes. Preserve the legacy geo-region
   resolution and address-in-use protection. Use the API's provider adapter,
   repositories for all Prisma access, Stripe-style serialization/envelopes,
   and current route/schema conventions.
3. Add admin-only customer-address routes under
   `/v1/tenants/:tenantId/customers/:customerId/addresses`, with collection
   list/create and item retrieve/update/delete operations. Preserve every
   existing invariant: tenant-scoped customer lookup, typed roles, one default
   per customer and role, promote the oldest successor when deleting/moving a
   default, and delete an underlying address only when no branch, warehouse, or
   customer-address relation still uses it.
4. Register both routers in `src/http/routes.ts`, add focused Vitest coverage,
   and update the existing OpenAPI snapshot only if the test fixture convention
   requires it.

## Constraints

- Keep database access in repository files and keep the API module independent
  of Next.js and `apps/couriers/src` imports.
- Never relax admin route auth or create a public/session route in this task.
- Do not edit generated Prisma files; the primary agent will generate them.
- Treat this as a port, not an opportunity to change resource semantics.
