# Couriers SDK addresses and customer-addresses admin port

## Scope

Add the typed **admin-tier** SDK surface for the completed Couriers API
`addresses` and `customer-addresses` modules in `packages/couriers`. This is a
mechanical transport-contract port. Do not alter API code or app call sites.

## Read first

- `.claude/rules/sdk-conventions.md`
- `.claude/rules/stripe-api-pattern.md`
- `packages/couriers/src/admin/{client,request,runtime,index}.ts`
- Existing resource/type/test patterns in
  `packages/couriers/src/admin/resources/{customers,warehouses,packages}.ts`
  and their matching tests
- The completed contracts in
  `apps/couriers-api/src/modules/addresses/` and
  `apps/couriers-api/src/modules/customer-addresses/`

The API modules are the source of truth for exact paths, HTTP verbs, parameter
names, request shapes, response schemas, resource discriminators, and delete
tombstones. Do not invent a field or route.

## Required work

1. Add focused Zod schemas and inferred TypeScript types under
   `packages/couriers/src/admin/types/` for each API resource and list/delete
   response used by this SDK surface. Use the package's existing list schema
   conventions and strict schemas for app-owned API contracts.
2. Add `addresses` to the admin client with the API's tenant-scoped list,
   retrieve, create, update, and deletion methods. Use the SDK vocabulary
   (`del`, not `delete`) for a deletion method.
3. Add customer-address methods nested under the existing `customers` resource
   (for example `customers.addresses`) when that matches the API's nested
   routes. Include its list, retrieve, create, update, and deletion methods.
4. Compose `addresses` into `create876CouriersAdminClient`, and export all
   public types and schemas from `packages/couriers/src/admin/index.ts`.
5. Add focused Vitest tests that follow the existing resource test style:
   assert exact encoded URLs, credential headers, method/body, success
   envelopes, malformed-response rejection, and fail-closed behavior when the
   admin credential is absent.

## Constraints

- Work only in `packages/couriers/src/admin/**` and this brief if an amendment
  is needed. Do not modify `apps/couriers-api`, `apps/couriers`, runtime/auth
  layers, package metadata, lockfiles, or unrelated files.
- Keep resource methods as direct declarations over `AdminRequest`; no courier
  business logic belongs in this package.
- Reuse the existing `AdminRequest`, `AdminRuntime`, transport, and typed
  resource patterns. Do not add an abstraction layer.
- Do not run any shell checks, tests, formatter, Prisma command, git command,
  commit, or push. The primary agent will verify every change.

## Expected verification (primary agent only)

```bash
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers lint
pnpm --filter @876/couriers test
```
