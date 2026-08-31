# End-to-end Billing service contract type fixes

Date: 2026-08-31
Branch: `fix/end-to-end-service-contract-types`
Base: current `main` at branch creation (`ba8a9494c1bad1bef42cb0a1e8bfb5d41db9ddc6`)
Status at report creation: branch is ahead of `main` and `0` commits behind.

## Goal

Remove the reconstructive typing workarounds that remained after the bounded-service-client migration and make the Billing tenant contract usable end to end:

1. authoritative Billing data model / serializers,
2. public `@876/billing` TypeScript contracts,
3. runtime Zod validation,
4. Billing resource methods,
5. Invoice application consumers.

The primary symptom was application code such as:

```ts
const value = resource as unknown as Record<string, unknown>
```

followed by `String(...)`, invented defaults, and property-existence checks. Those casts were not the real problem. The producer contract was too weak.

## Root causes found

### 1. Tenant commercial-document DTOs exposed unknown-key bags

The ordinary tenant Billing client modeled invoices, quotes, and estimates as little more than:

```ts
{ object: 'invoice'; id: string } & Record<string, unknown>
```

The runtime schemas mirrored that design with `{ object, id }.passthrough()`.

That forced every application consumer to reconstruct the actual resource shape itself and defeated the value of runtime validation.

The Billing integration client was already substantially stronger, which confirmed the weakness was isolated to the ordinary tenant contract rather than the request transport itself.

### 2. `InvoiceListParams.status` used the wrong domain enum

The SDK was using the quote/estimate lifecycle for invoice list filtering.

The authoritative Billing Prisma model and Express route use:

- `DRAFT`
- `OPEN`
- `SENT`
- `PARTIALLY_PAID`
- `OVERDUE`
- `PAID`
- `UNCOLLECTIBLE`
- `VOID`

Quotes and estimates instead use:

- `DRAFT`
- `SENT`
- `ACCEPTED`
- `DECLINED`
- `EXPIRED`
- `CANCELED`

The backend route was correct. The drift existed in `@876/billing`.

### 3. Invoice and Quote UI filters were cosmetic

The Invoice application parsed status query parameters but did not pass the selected status to `billing.invoices.list()` / `billing.quotes.list()`.

The UI therefore appeared filtered while the resource request still returned the unfiltered collection.

### 4. Payment status typing had drifted from the data model

The public Payment contract accepted only:

- `PENDING`
- `SUCCEEDED`
- `FAILED`
- `CANCELED`

The authoritative Billing `PaymentStatus` also includes:

- `REQUIRES_ACTION`
- `AUTHORIZED`
- `PROCESSING`
- `PARTIALLY_REFUNDED`
- `REFUNDED`
- `DISPUTED`

A valid provider-driven or refund/dispute payment could therefore be rejected by the SDK's Zod parser.

### 5. Some aggregate serializers intentionally include internal Prisma fields

Commercial-document serializers and the Payment serializer begin with full Prisma rows, convert BigInt/Decimal values, then add public discriminators / expanded relations.

That means a strict public schema can incorrectly reject a valid API response merely because the serializer also contains fields such as `tenantId`, relation foreign keys, revision fields, or internal source metadata.

The correct boundary is not `passthrough()` and not an unknown-key TypeScript bag. It is:

- validate all public fields,
- return a stable public DTO,
- strip backend-only extras at runtime.

Zod `z.object(...)` is used for those aggregate projections.

### 6. Payment Mode had the same serializer/schema mismatch

`serializePaymentMode()` starts from the full Prisma row, which contains `tenantId`, while the public Payment Mode schema was strict.

That could reject valid list/retrieve responses.

### 7. Standalone Banking resources are different

The Banking module explicitly serializes standalone Bank Accounts and Bank Transactions into their exact public resource shapes.

Those schemas should remain strict. The Payment aggregate therefore owns a bounded nested Bank Transaction projection rather than weakening the standalone Banking contract.

## Implemented contract changes

### `packages/billing/src/types/invoice.ts`

Replaced the unknown-key document types with stable explicit contracts.

Added/exported:

- `InvoiceStatus`
- `QuoteStatus`
- `EstimateStatus`
- `InvoiceBillingReason`
- `DocumentCustomer`
- `InvoiceLine`
- `ProposalLine`
- explicit `Invoice`
- explicit `Quote`
- explicit `Estimate`

Invoice money fields are represented as strings at the SDK boundary, matching the Billing serializer's BigInt conversion.

`InvoiceListParams.status` now uses `InvoiceStatus`.

Quote and Estimate list parameters remain bound to their proposal lifecycle.

### `packages/billing/src/types/invoice.schema.ts`

Replaced `{object,id}.passthrough()` with runtime-validated public projections for Invoice, Quote, and Estimate.

The schemas validate the fields applications are allowed to consume while stripping backend-only Prisma fields.

Nested customer, line, and converted-invoice projections are also bounded.

### `packages/billing/src/resources/invoices.ts`

Removed the query-object assertion. The list request now builds the typed query directly:

```ts
query: { status: params.status }
```

### `packages/billing/src/resources/quotes.ts`

Applied the same typed query construction to Quotes and Estimates.

### Payment contracts

`packages/billing/src/types/payment.ts` now exposes the complete authoritative `PaymentStatus` union.

`packages/billing/src/types/payment.schema.ts` now:

- accepts all valid payment states,
- validates the public Payment DTO,
- strips internal top-level Payment fields,
- strips internal expanded Payment Mode / Bank Account fields,
- strips internal Payment Allocation and expanded Invoice fields,
- uses a Payment-owned bounded Bank Transaction projection for nested aggregate data.

### Payment Mode contract

`packages/billing/src/types/payment-mode.schema.ts` now validates and returns the stable Payment Mode DTO while stripping backend-only serializer fields such as `tenantId`.

### Standalone Bank Transaction contract

`packages/billing/src/types/bank-transaction.schema.ts` remains strict for the standalone Banking resource because `banking.serializers.ts` emits its exact public shape.

This intentionally differs from the nested Bank Transaction inside a Payment aggregate.

## Invoice application changes

### Invoices page

`apps/invoice/src/app/(app)/invoices/page.tsx`

- removed `as unknown as Record<string, unknown>` reconstruction,
- removed invented `JMD`, `DRAFT`, amount, and customer fallbacks from validated data,
- maps directly from the typed Billing Invoice contract,
- exposes the complete supported invoice filter set,
- converts UI filter values to `InvoiceStatus`,
- passes the real status to `billing.invoices.list(...)`,
- preserves the existing `{data,error}` handling and Sentry diagnostics.

### Quotes page

`apps/invoice/src/app/(app)/quotes/page.tsx`

- removed unknown-record reconstruction,
- uses the typed Quote DTO directly,
- passes the selected `QuoteStatus` to the Billing request,
- renders service failures separately from a legitimately empty list.

### Payments page

`apps/invoice/src/app/(app)/payments/page.tsx`

- removed fake `.catch()` result construction,
- removed the cast to a hand-written result shape,
- removed `Record<string, unknown>` row parsing,
- removed invented `RECEIVED`, currency, date, and deposit-account defaults,
- maps directly from the typed Payment contract,
- renders service failure separately from empty state,
- removed dead status-query state because the page currently exposes only the `All` filter.

### Sales Receipts page

`apps/invoice/src/app/(app)/sales-receipts/page.tsx`

- removed fake catch/result casts,
- removed record reconstruction and invented defaults,
- removed the arbitrary five-row slice,
- uses real Invoice fields directly,
- sends the selected invoice-family status to Billing,
- renders errors separately from genuine emptiness.

This page still has a domain limitation described under **Intentional residual work** below.

### Customer edit page

`apps/invoice/src/app/(app)/customers/[customerId]/edit/page.tsx`

Removed property-existence checks and the status assertion. The Billing Customer contract already guarantees `companyName` and `status`, so the form receives those fields directly.

## Regression tests added

### `packages/billing/src/types/__tests__/invoice.schema.test.ts`

Covers:

- every authoritative Invoice status,
- rejection of quote-only `ACCEPTED` as an Invoice status,
- stripping internal top-level and nested fields,
- Invoice list envelope validation,
- Quote projection validation including converted Invoice metadata,
- Estimate projection validation.

### `packages/billing/src/types/__tests__/payment.schema.test.ts`

Covers:

- every authoritative Payment status,
- rejection of invented `RECEIVED`,
- stripping internal Payment fields,
- stripping internal expanded relation fields,
- Payment list envelope validation.

### `packages/billing/src/types/__tests__/payment-mode.schema.test.ts`

Covers:

- parsing a Payment Mode row containing backend-only `tenantId`,
- stripping that backend-only field,
- Payment Mode list envelope validation.

The new fixture helpers avoid `Record<string, unknown>` override bags so tests do not reintroduce the pattern this change removes.

## Error semantics

Expected service errors continue to flow as `{ data, error }` values.

The application changes do not turn expected Billing failures into thrown page-level exceptions. List pages now distinguish:

- service error,
- successful response containing zero resources.

Previously some pages collapsed both states into the same empty-state UI.

## Stable DTO strategy

The boundary implemented here is deliberately narrower than a direct Prisma mirror.

The database model is authoritative for domain state and serializer behavior, but the public SDK should not automatically expose every database column.

For serializers that emit expanded/full database rows:

1. the API can continue carrying internal implementation fields,
2. the SDK validates required public fields,
3. Zod strips unknown backend fields,
4. the resulting TypeScript value is the stable public DTO,
5. application code consumes that DTO without assertions.

For serializers that already emit an exact public shape, schemas remain strict.

This avoids both failure modes:

- leaking Prisma through `Record<string, unknown>` / `.passthrough()`,
- rejecting valid aggregate responses merely because the server included internal fields.

## Intentional residual work

### Dedicated Sales Receipt resource

Sales Receipts still do not have a dedicated Billing resource/discriminator. The Invoice application therefore reads from the Invoice family.

This branch makes that usage type-safe and truthful; it does **not** invent a `sales_receipt` type or pretend ordinary invoices are semantically distinct receipts.

A future Billing feature should add a real receipt model/resource or an authoritative discriminator/query so this page can request only cash-sale receipts.

### Billing API response/OpenAPI document schemas

The Billing Express document routes still describe commercial-document responses through a generic backend response helper based on `{ object, id }.passthrough()`.

This branch does not make `@876/billing-api` depend on the `@876/billing` client package merely to reuse the client schema. That would reverse the desired authority/dependency direction.

If the OpenAPI response model is tightened later, the preferred architecture is a backend-owned or neutral shared contract boundary that both API documentation and clients can derive from, not an API -> SDK dependency.

### Invoice integration organization binder

`apps/invoice/src/lib/invoice.ts` still contains a generic organization-binding utility that uses a mapped type and an assertion around `Object.fromEntries`/`Reflect.apply`.

That mechanism is not DTO reconstruction and its current consumer remains typed through the Billing integration SDK. Replacing it would be a service-facade redesign, so it is intentionally outside this focused contract branch.

## Verification status

At report creation GitHub compare reports the branch is **0 commits behind `main`**.

ChatGPT Web does not have the repository mounted at `/root/projects/876`, so no claim is made that `pnpm` commands were executed locally in this environment.

No GitHub Actions workflow was triggered by the plain branch push at the time checked.

The package configuration was inspected and `packages/billing/tsconfig.json` uses strict TypeScript and includes `src/**/*.ts`, so the new contract tests are part of the package typecheck/test source tree. They still need to be executed in a repository checkout or by CI before merge.

Recommended local verification after pulling:

```bash
pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
pnpm --filter @876/invoice typecheck
pnpm --filter @876/invoice test
pnpm format:check
```

Run the repository's required root verification commands from `CLAUDE.md` as well before merge.

## Branch handoff

Branch:

```text
fix/end-to-end-service-contract-types
```

This branch was intentionally not merged. It is ready for local checkout, executable verification, and any database/runtime validation the local agent can perform.
