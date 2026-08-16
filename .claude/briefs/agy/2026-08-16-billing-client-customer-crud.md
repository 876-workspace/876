# Brief — add customer read/update/delete verbs to `@876/billing`

You are editing the repo at `/root/projects/876`, on branch
`feat/billing-client-customer-crud`. **Do not commit, do not branch, do not
push.** Make the edits only.

## Why

876 Invoice renders its customers page against `$876.customers.*` from
`@876/client`, which composes the tenant-scoped resource in
`packages/billing/src/resources/customers.ts`. That resource today has only
`create`, `account`, and `recordOpeningBalance` — so Invoice cannot list,
retrieve, update, archive, or delete a customer even though `apps/billing-api`
already serves every one of those endpoints. The 876 Billing *app* works around
the gap with a legacy `service.*` HTTP facade that new code must not copy.

Your job is to close that gap in the client package only. No app code.

## Scope — exactly three files

1. `packages/billing/src/types/customer.ts`
2. `packages/billing/src/types/customer.schema.ts`
3. `packages/billing/src/resources/customers.ts`

plus the barrel exports in:

4. `packages/billing/src/types/index.ts`
5. `packages/billing/src/schemas.ts`

Touch nothing else. In particular do not edit `apps/`, `packages/client/`, or
any other resource file.

## The API you are wrapping (source of truth)

From `apps/billing-api/src/modules/customers/customers.routes.ts` — all are
`security: { kind: 'tenant' }`:

| Method | Path                       | Permission        | Response schema         |
| ------ | -------------------------- | ----------------- | ----------------------- |
| GET    | `/customers`               | `customers:read`  | `customerListSchema`    |
| GET    | `/customers/:customerId`   | `customers:read`  | `customerSchema`        |
| PATCH  | `/customers/:customerId`   | `customers:write` | `customerSchema`        |
| DELETE | `/customers/:customerId`   | `customers:write` | `deletedCustomerSchema` |

The client `Request` helper prefixes nothing, so paths in the resource file are
written in full as `/api/v1/customers` (see the existing `create` verb).

The authoritative response shapes are in
`apps/billing-api/src/modules/customers/customers.schemas.ts` —
`customerSchema` (line ~212), `contactSchema` (~199), `deletedCustomerSchema`
(~242), and `customerListQuerySchema` (~62). **Read them and mirror them
exactly.** Field names are camelCase except the pagination cursors, which are
`starting_after` / `ending_before`.

## 1. Types — `packages/billing/src/types/customer.ts`

Append (do not reorder or rewrite the existing exports). Follow the file's
existing JSDoc-per-property style exactly — every property gets a `/** ... */`
comment, phrased the way the neighbouring `CustomerCreateParams` and
`CustomerAccount` properties are.

Add these exported types:

- `CustomerContact` — mirrors `contactSchema`: `object: 'contact'`, `id`,
  `userId`, `salutation`, `firstName`, `lastName`, `email`, `workPhone`,
  `mobilePhone`, `isPrimary: boolean`, `coreSyncedAt: number | null`.
- `CustomerStatus` — `'ACTIVE' | 'ARCHIVED'`.
- `Customer` — mirrors `customerSchema` field for field: `object: 'customer'`,
  `id`, `sourceAppId`, `sourceExternalReference`, `customerType`
  (reuse the existing `CustomerType` import), `customerKind` (`CustomerKind`),
  `organizationId`, `userId`, `externalReference`, `name`, `salutation`,
  `firstName`, `lastName`, `companyName`, `email`, `phone`, `workPhone`,
  `billingAddress: unknown | null`, `metadata: unknown | null`,
  `defaultCurrency`, `language`, `outstandingReceivable: string`,
  `unusedCredits: string`, `coreSyncedAt: number | null`,
  `status: CustomerStatus`, `createdAt: number`, `updatedAt: number`,
  `primaryContact: CustomerContact | null`.
  Nullable string fields are `string | null` (not optional).
- `CustomerList` — `import('./common').List<Customer>`, matching how
  `InvoiceList` is declared in `types/invoice.ts`.
- `CustomerListParams` — `status?: CustomerStatus`, `ids?: string[]`,
  `userId?: string`, `organizationId?: string`, `starting_after?: string`,
  `ending_before?: string`, `limit?: number`.
- `CustomerUpdateParams` — `Partial<CustomerCreateParams> & { status?: CustomerStatus }`.
- `DeletedCustomer` — `object: 'customer'`, `id: string`, `deleted: true`.

Amounts stay **strings** (decimal), never numbers — money through a JS number
loses precision. Timestamps are Unix **seconds** integers.

## 2. Schemas — `packages/billing/src/types/customer.schema.ts`

Append, mirroring the existing `CustomerAccountSchema` style. Use the helpers
already imported/available from `./common.schema`: `listSchema(...)` and
`deletedResourceSchema('customer')`.

- `CustomerContactSchema` — `z.object({...})` matching `CustomerContact`, with
  `satisfies z.ZodType<CustomerContact>`.
- `CustomerSchema` — `z.object({...})` matching `Customer`, with
  `satisfies z.ZodType<Customer>`. Use `z.unknown().nullable()` for
  `billingAddress` and `metadata`, `z.number().int()` for timestamps, and
  `z.enum([...])` for `customerType`, `customerKind`, and `status`.
  **Use `z.object`, not `z.strictObject`** — this parses a server-owned
  response and must tolerate fields added later without breaking older clients.
- `CustomerListSchema` — `listSchema(CustomerSchema) satisfies z.ZodType<CustomerList>`.
- `DeletedCustomerSchema` — `deletedResourceSchema('customer') satisfies z.ZodType<DeletedCustomer>`.

## 3. Resource — `packages/billing/src/resources/customers.ts`

Add four verbs to the object returned by `createCustomersResource`, keeping the
existing three untouched. Copy the exact call shape used by
`createInvoicesResource` in `packages/billing/src/resources/invoices.ts` —
`Request<T>(runtime, { method, path, query?, body?, signal: options?.signal }, Schema)`.

- `list(params: CustomerListParams = {}, options?: RequestOptions)` →
  `GET /api/v1/customers`, `CustomerListSchema`.
  **`ids` is an array and the query builder takes scalars**, so serialize it as
  a comma-joined string (the API's `customerListQuerySchema` splits on commas).
  Build the query object explicitly rather than casting `params` wholesale, so
  the `ids` handling is visible.
- `retrieve(customerId: string, options?: RequestOptions)` →
  `GET /api/v1/customers/{id}`, `CustomerSchema`.
- `update(customerId: string, params: CustomerUpdateParams, options?: RequestOptions)` →
  `PATCH /api/v1/customers/{id}`, `CustomerSchema`.
- `delete(customerId: string, options?: RequestOptions)` →
  `DELETE /api/v1/customers/{id}`, `DeletedCustomerSchema`.
  Name it `delete`, not `del` — `.claude/rules/sdk-conventions.md` fixes the
  verb vocabulary as `create | retrieve | list | search | update | delete`.

Always `encodeURIComponent(customerId)` in the path, as the existing `account`
verb does. Every verb gets a one-line JSDoc summary in the style of its
neighbours.

## 4. Barrels

- `packages/billing/src/types/index.ts` — extend the existing `// Customer`
  block: add the new types to the `export type { ... } from './customer'` list
  and the new schemas to the `export { ... } from './customer.schema'` list.
- `packages/billing/src/schemas.ts` — add `CustomerSchema`,
  `CustomerListSchema`, `CustomerContactSchema`, and `DeletedCustomerSchema`
  alongside the existing `CustomerAccountSchema` / `CustomerCreatedSchema`
  entries, keeping alphabetical order if the file is ordered.

## Rules that apply

- `.claude/rules/sdk-conventions.md` — verb vocabulary, no bespoke wrappers.
- `.claude/rules/stripe-api-pattern.md` — `object` discriminators, list
  containers, JSDoc style, `interface` for object shapes and `type` for
  unions/aliases.
- `.claude/rules/types.md` — schema names are camelCase ending in `Schema`
  **only** in the API; this package's existing convention is PascalCase
  `XxxSchema`, so match the package, not the API.
- Single quotes, no semicolons where the file omits them — just match the file.

## Verification (run these; report the output)

```bash
cd /root/projects/876
pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
pnpm --filter @876/billing lint
npx prettier --check packages/billing/src/types/customer.ts packages/billing/src/types/customer.schema.ts packages/billing/src/resources/customers.ts
```

`packages/client/src/surface-contract.test.ts` asserts the composed client
surface; if it fails, read it and report what it expects — do **not** edit it
without saying so.

## Report back

State exactly which files you changed, paste the verification output, and call
out anything in this brief that turned out to be wrong about the codebase.
