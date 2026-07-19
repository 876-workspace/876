# Implement: billing shared-customer enrichment, status filter, bulk import (server + integration client)

You are gpt-5.6-sol implementing in `/workspaces/876`. **Do not commit** — the
orchestrator reviews and commits. Follow `.agents/rules/code-style.md`,
`.agents/rules/types.md`, `.agents/rules/testing.md`, `.agents/rules/api-backend.md`
(contracts), `.agents/rules/deletions.md`. Read files before editing them.

## Goal

Products across the 876 ecosystem (first consumer: Couriers) need the shared
Billing customer plane to (a) carry a slightly richer commercial customer record,
(b) support server-side status filtering on the cursor-paginated integration list,
and (c) support bulk CSV-driven import with an honest dry-run preview. Everything
in this brief is the **billing side + the `@876/billing` integration client**;
Couriers UI is a separate follow-up task. Your output must leave
`@876/billing-app` and `@876/billing` typecheck- and test-green, with the new
contracts exactly as specified (a follow-up task will compile against them).

## Context you must not re-derive (verified, with citations)

- Customer Prisma model: `apps/billing/prisma/schema/customer.prisma:6-85`
  (normalized `Contact` rows at :88-115 and `Address` rows at :117-146 already exist).
- Service surface: `apps/billing/src/lib/service/customers/` — `create.ts`,
  `update.ts`, `list.ts` (`listCustomers` w/ status, `listCustomerPage` cursor
  pagination WITHOUT status at :65-128), `retrieve.ts`, `ensure.ts`.
- Route Zod contracts: `apps/billing/src/types/customer.ts` (strict objects;
  create at :18-75, update at :85-107).
- Integration routes (files under `apps/billing/src/app/api/billing/integrations/organizations/[organizationId]/customers/`,
  public path `/api/v1/integrations/...` via rewrite `apps/billing/next.config.ts:62-72`):
  collection GET/POST `route.ts:18-117`, member `[customerId]/route.ts:16-83`.
  Auth guard: `requireIntegrationOrganization` (`apps/billing/src/lib/api/integration-route.ts:145-188`),
  scopes `billing.customers.read`/`billing.customers.write`. Product-app POSTs
  require `Idempotency-Key` (`apps/billing/src/lib/api/integration-idempotency.ts:35-107`).
- Serialization projection: `apps/billing/src/lib/api/integration-resource.ts:21-109`
  (BigInt→string via `apps/billing/src/lib/api/billing-route.ts:55-89`).
- Client package: `packages/billing/src/integration/` — `schemas.ts` (STRICT Zod:
  any server field addition without a matching schema change breaks every client
  with `billing/invalid-response` — `packages/billing/src/transport.ts:56-70`),
  `types.ts:80-123` (customer params), `resources/customers.ts`.
- Billing's own tenant UI already threads `?status=` into `service.customers.list`
  (`apps/billing/src/app/(app)/customers/page.tsx:22-49`) — do not touch that page.

## Work item 1 — schema: four new nullable Customer columns

Add to `Customer` (`apps/billing/prisma/schema/customer.prisma`):

- `customerNumber String? @map("customer_number")` + `@@unique([tenantId, customerNumber])`
- `website String?`
- `notes String?` (internal notes — distinct from existing `invoiceNotes`)
- `taxRegistrationNumber String? @map("tax_registration_number")`

Create the Prisma migration using this app's existing migration workflow
(inspect `apps/billing/package.json` scripts + `prisma/migrations/` naming; all
columns nullable/additive so the shared Neon DB stays compatible with the
deployed service). Run the migration against the dev database.

## Work item 2 — service + route contracts for the new fields

- Extend `CustomerCreateSchema`/`CustomerUpdateSchema`
  (`apps/billing/src/types/customer.ts`) with the four fields: trimmed,
  `customerNumber` 1–60, `website` 1–200 (accept bare domains; do not force URL
  scheme), `notes` 1–5000, `taxRegistrationNumber` 1–60; all nullable optional,
  matching the file's existing style.
- `service.customers.create`/`update`: persist them; map a
  `(tenantId, customerNumber)` unique violation to the existing 409 conflict
  pattern (see how SKU-like conflicts are handled in `create.ts:71-140`).
- Serialize them in the integration customer projection
  (`integration-resource.ts`) — plain nullable strings.

## Work item 3 — read-only contacts/addresses on integration retrieve

- Member GET (and the retrieve used after create/update) includes:
  - `contacts`: array of `{ object:'customer_contact', id, salutation, firstName,
lastName, email, workPhone, mobilePhone, isPrimary, createdAt, updatedAt }`
  - `addresses`: array of `{ object:'customer_address', id, type, label,
  attention, line1, line2, city, state, postalCode, countryCode, isDefault,
  createdAt, updatedAt }`
    (omit tenant/customer/source-sync internals; omit latitude/longitude).
- LIST rows must NOT include these arrays (keep lists lean) — model them as
  `.optional()` arrays in the client schema exactly like `counts` is today.
- `service.customers.retrieve` should include the relations (ordered: primary
  first then oldest for contacts; default first then oldest for addresses —
  same ordering precedent as `listDocumentRecipients`, `list.ts:17-63`).

## Work item 4 — status filter on the integration customers list

- `listCustomerPage` accepts `status?: 'ACTIVE' | 'ARCHIVED'` and applies it to
  BOTH the page query and the `total_count` count query (`list.ts:65-128`).
- Collection GET parses `status=active|archived` (case-insensitive is fine, but
  reject unknown values with the existing 400 pattern); absent = no filter.
- Cursor validation must respect the status filter the same way it respects the
  identity filters (a cursor row outside the filtered set → invalid cursor).

## Work item 5 — bulk import endpoint

New route: `POST apps/billing/src/app/api/billing/integrations/organizations/[organizationId]/customers/import/route.ts`
(public: `POST /api/v1/integrations/organizations/{orgId}/customers/import`).

- Auth: `billing.customers.write`; product apps require `Idempotency-Key`
  **only for non-dry-run requests**; reuse the existing idempotency helper if it
  fits, otherwise persist a replay receipt keyed per tenant/app/key that returns
  the stored import result on replay (look at `integration-idempotency.ts` and
  the finance-connection inbox receipt for precedent; choose the smaller honest
  design and note it in your summary).
- Request body (strict Zod in `apps/billing/src/types/customer.ts` or a new
  focused `apps/billing/src/types/customer-import.ts`):

```ts
{
  dryRun?: boolean            // default false
  duplicateStrategy: 'skip' | 'update'
  rows: Array<{               // 1..500 rows
    rowNumber: number         // caller's CSV row ref, int >= 1, unique in payload
    // same validation rules as CustomerCreateSchema for all shared fields:
    name: string
    customerKind?: 'INDIVIDUAL' | 'BUSINESS'
    salutation?; firstName?; lastName?; companyName?;
    email?; phone?; workPhone?;
    currency?; language?;
    customerNumber?; website?; notes?; taxRegistrationNumber?;
    billingAddress?: { label?, attention?, line1?, line2?, city?, state?, postalCode?, countryCode? }
    shippingAddress?: { same shape }
    contact?: { salutation?, firstName?, lastName?, email?, workPhone?, mobilePhone? }
  }>
}
```

All rows are EXTERNAL customer type — reject any core-identity fields.

- Matching (per row, within the tenant), in order: exact `customerNumber` →
  normalized (trim+lowercase) `email` when it matches exactly one existing
  customer → exact case-insensitive `name`. Multiple email/name matches →
  action `failed`, code `billing/import-ambiguous-match`.
- Actions: no match → `created`. Match + `skip` → `skipped` (include matched
  `customerId`). Match + `update` → patch ONLY supplied non-undefined fields
  via the existing update service semantics → `updated`.
- Address/contact handling on `created` rows: create Address rows
  (`type:'billing'` / `type:'shipping'`, `isDefault:true` per type) and one
  Contact row (`isPrimary:true`) when provided. On `updated` rows, do NOT touch
  existing addresses/contacts in v1 (note this in the route docs).
- Per-row atomicity: each row (customer + its addresses/contact) in its own
  transaction; a failing row must not abort the batch. Currency/language/etc.
  validation failures surface as that row's `failed` result with the service
  error code, never as a batch 4xx (batch-level 400 only for envelope/Zod
  failures).
- `dryRun:true`: run matching + validation, return planned actions, write
  nothing (assert in tests: no DB writes).
- Response 200:

```ts
{
  object: 'customer_import'
  dryRun: boolean
  duplicateStrategy: 'skip' | 'update'
  summary: {
    created: number
    updated: number
    skipped: number
    failed: number
  }
  results: Array<{
    rowNumber: number
    action: 'created' | 'updated' | 'skipped' | 'failed'
    customerId: string | null
    error: { code: string; message: string } | null
  }>
}
```

- Service logic lives in `apps/billing/src/lib/service/customers/import.ts`
  exported as `service.customers.import` (register in the customers service
  index) — the route stays thin per the app's route/service split.

## Work item 6 — `@876/billing` integration client (atomic with 2–5)

In `packages/billing/src/integration/`:

- `schemas.ts`: add the four scalar fields to `BillingCustomerSchema`; add
  optional `contacts`/`addresses` strict array schemas; add
  `BillingCustomerImportResultSchema` for the import response.
- `types.ts`: extend `BillingCustomer`, `BillingCustomerCreateParams`,
  `BillingCustomerUpdateParams` with the four fields; add
  `status?: 'active' | 'archived'` to `BillingCustomerListParams`; add
  `BillingCustomerImportParams` / result types mirroring the wire contract
  (rows typed, `dryRun`, `duplicateStrategy`).
- `resources/customers.ts`: map `status` onto the list query; add
  `import(organizationId, params, options?: IntegrationCreateOptions)` — POST to
  `/customers/import`, `Idempotency-Key` header only when `options` provided;
  JSDoc in the file's existing style noting dry-run needs no idempotency key.

## Tests (follow `.agents/rules/testing.md` — mutation-resistant, negative space)

- Billing service: status filtering on `listCustomerPage` (incl. cursor +
  status interaction and total_count), customerNumber 409, new-field
  persistence, and `import` — every action, both strategies, ambiguous match,
  per-row failure isolation, dry-run writes nothing, address/contact creation.
- Route: import happy path, strict-body 400, missing idempotency key (non-dry-run,
  product app), scope denial.
- Package client: new list param serialization, import request/response parsing,
  strict-schema acceptance of customers with and without the optional arrays.
- Match existing test files' style/placement (`*.test.ts` beside sources; see
  existing customer service tests for factories/mocking patterns).

## Verification (must all pass before you finish)

```
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
```

## Hard constraints

- Server serialization and package schemas change together — never leave a
  field exposed server-side that the strict client schema rejects.
- Tenant scoping on every query (`access.tenant.id` only, never caller IDs).
- No commits. No changes outside `apps/billing/` and `packages/billing/`.
- Do not rename existing fields/params; additive only.
- End with a summary: files touched, contract decisions made where the brief
  gave latitude (idempotency design), anything intentionally deferred.
