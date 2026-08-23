# Brief — 876 Billing: the Stripe-shaped payment instrument plane

## Read first, in this order

1. `.claude/rules/billing-data-plane.md` — **normative**. Every "do not" in it is a
   review gate for this work.
2. `docs/billing/stripe-object-mapping.md` — the field-level companion.
3. `.claude/rules/express-api.md` — module shape, layer responsibilities, boundaries.
4. `.claude/rules/stripe-api-pattern.md` — `object` discriminators, `{data,error}`,
   list envelopes, cursor pagination.
5. `.claude/rules/deletions.md`, `.claude/rules/naming.md`, `.claude/rules/types.md`.

## Context

`apps/billing-api` already owns customers, products, prices, subscriptions,
invoices, payments, refunds, credit notes, coupons, tax rates, ledger entries,
payment modes, payment provider connections and provider events. What it does
**not** have is the instrument plane: there is no way to store a customer's card
or bank account, no stateful collection attempt, no mandate, and no dispute.
Core (`apps/api`) already carries a `subscriptions.default_payment_method_id`
column pointing at a payment method that does not exist anywhere.

This brief closes that gap, Stripe-shaped, provider-agnostic.

**Out of scope for this brief** (do not start them): the `@876/billing` client
package, the `@876/client` facade, any Console or Next.js UI, meters, credit
grants, checkout sessions, payment links, reconciliation runs, dunning.

## Already done — do not redo or modify

Phase 1 landed on this branch:

- `packages/core/src/crypto/secure-field.ts` — the sealing providers.
- `apps/billing-api/src/platform/secure-field.ts` — `getSecureFieldProvider(tenantId, vaultClient?)`,
  `credentialContext({ tenantId, paymentMethodId, type })`, `SealedCredentialType`.
- `apps/billing-api/src/providers/workos/vault.ts` — `getVaultClient()`.
- Settings: `WORKOS_API_KEY`, `WORKOS_VAULT_ENABLED`, `WORKOS_VAULT_KEY_CONTEXT`,
  `SECURE_FIELD_KEY` on `getSettings()` as `settings.workos.*` and
  `settings.secureFieldKey`.

**Use these. Do not write a second sealing path, a second vault client, or a
second context builder.**

## Task 1 — Prisma models

New files under `apps/billing-api/prisma/schema/`, one model per file, matching
the conventions already in that directory exactly: `String @id`, `tenantId
String @map("tenant_id")`, Unix-second `Int` timestamps (`createdAt`,
`updatedAt`), `@@map("billing_<plural>")`, explicit `map:` names on every FK,
index and unique constraint, and a `///` docstring on the model saying what it
is and why — in the voice of the files already there.

Add every new enum to `enums.prisma`, each with `@@map("Billing<Name>")` as the
existing ones do.

### 1.1 `payment-method.prisma` — `PaymentMethod` → `billing_payment_methods`

Non-secret instrument metadata belonging to a customer.

```
id · tenantId · customerId · type (PaymentMethodType)
status (PaymentMethodStatus) · allowRedisplay (PaymentMethodRedisplay)
reusable Boolean @default(false)
isDefault Boolean @default(false) @map("is_default")
billingDetails Json?   // name/email/phone/address snapshot
card Json?             // see below — display metadata ONLY
bankAccount Json? @map("bank_account")
wallet Json?
manual Json?
fingerprint String?    // dedupe within a tenant, never across tenants
displayLabel String? @map("display_label")   // "Visa •••• 4242"
expMonth Int? @map("exp_month") · expYear Int? @map("exp_year")
provider String? · providerPaymentMethodId String? @map("provider_payment_method_id")
providerConnectionId String? @map("provider_connection_id")
detachedAt Int? @map("detached_at")
metadata Json? · createdAt · updatedAt
```

Relations: `tenant`, `customer` (by `[tenantId, customerId]`, `onDelete: Restrict`),
`providerConnection` (`PaymentProviderConnection`, by `[tenantId, providerConnectionId]`,
`onDelete: Restrict`), plus back-relations added in Task 1.9.

Constraints: `@@unique([tenantId, id])`;
`@@unique([providerConnectionId, providerPaymentMethodId])`;
indexes on `[tenantId, customerId]`, `[tenantId, status]`, `[tenantId, type]`,
`[tenantId, customerId, isDefault]`, `[tenantId, fingerprint]`.

Enums:

```
PaymentMethodType   CARD | BANK_ACCOUNT | WALLET | MANUAL
PaymentMethodStatus PENDING | ACTIVE | REQUIRES_ACTION | EXPIRED | DETACHED | FAILED
PaymentMethodRedisplay ALWAYS | LIMITED | UNSPECIFIED
```

**The `card` JSON is display metadata only** — brand, displayBrand, network,
funding, issuerCountry, last4, expMonth, expYear, fingerprint, cardholderName,
`checks` (addressLine1/postalCode/cvc each `pass|fail|unavailable|unchecked`),
`networks`, `threeDSecureUsage.supported`, wallet. **No `cvc`, `cvv`, `cid`,
`pin`, `pinBlock` or `trackData` key may appear in it, in the Zod schema, in a
fixture, or in a test.** Validate the JSON with a strict Zod schema so an unknown
key is rejected rather than persisted.

`bankAccount` JSON: accountHolderType, accountType, bankName, country, currency,
last4, fingerprint, `routing { type, masked }`, status. Do **not** model US
routing-number semantics; `routing.type` is an open string
(`branch_or_routing` etc.) with a masked value.

`manual` JSON: `method` (`bank_transfer|cash|cheque|wire|mobile_money|point_of_sale|cash_deposit|other`),
displayName, instructions.

### 1.2 `payment-credential.prisma` — `PaymentCredential` → `billing_payment_credentials`

The pointer to the secret. **Never the secret.**

```
id · tenantId · paymentMethodId (unique per tenant)
type (PaymentCredentialType: CARD_PAN | BANK_ACCOUNT_NUMBER | PROVIDER_TOKEN)
storage (PaymentCredentialStorage: WORKOS_VAULT | LOCAL_KEY | PROVIDER_TOKEN)
sealedValue String? @map("sealed_value") @db.Text   // prefixed ciphertext
keyId String? @map("key_id")
vaultProvider String? @map("vault_provider")
providerToken String? @map("provider_token")
provider String?
status (PaymentCredentialStatus: ACTIVE | ROTATED | REVOKED)
createdAt · rotatedAt Int? · revokedAt Int?
```

`@@unique([tenantId, paymentMethodId])`, `@@unique([tenantId, id])`, index on
`[tenantId, status]`.

**This table has no CVV/CVC/CID/PIN/track-data column and must never gain one.**

### 1.3 `setup-intent.prisma` — `SetupIntent` → `billing_setup_intents`

```
id · tenantId · customerId · status (SetupIntentStatus)
usage (SetupIntentUsage: ON_SESSION | OFF_SESSION)
paymentMethodId? · mandateId? · paymentMethodTypes String[]
provider? · providerConnectionId? · providerSetupId?
lastError Json? @map("last_error") · nextAction Json? @map("next_action")
cancellationReason String? · canceledAt Int? · succeededAt Int?
metadata · createdAt · updatedAt
```

`SetupIntentStatus`: `REQUIRES_PAYMENT_METHOD | REQUIRES_CONFIRMATION |
REQUIRES_ACTION | PROCESSING | SUCCEEDED | CANCELED`.

### 1.4 `mandate.prisma` — `Mandate` → `billing_mandates`

```
id · tenantId · customerId · paymentMethodId
type (MandateType: SINGLE_USE | MULTI_USE) · status (MandateStatus: PENDING | ACTIVE | INACTIVE | REVOKED)
acceptanceType (MandateAcceptanceType: ONLINE | OFFLINE)
acceptedAt Int? · acceptanceIp String? @map("acceptance_ip") · acceptanceUserAgent String? @db.Text
provider? · providerMandateId? · reference String?
revokedAt Int? · metadata · createdAt · updatedAt
```

`@@unique([tenantId, id])`, index `[tenantId, paymentMethodId]`,
`@@unique([providerConnectionId, providerMandateId])` if you carry the
connection; otherwise `@@unique([provider, providerMandateId])`.

### 1.5 `payment-intent.prisma` — `PaymentIntent` → `billing_payment_intents`

The stateful attempt to collect one amount.

```
id · tenantId · customerId · invoiceId? · subscriptionId?
amount BigInt · amountCapturable BigInt @default(0) · amountReceived BigInt @default(0)
currency String @db.Char(3)
status (PaymentIntentStatus)
captureMethod (CaptureMethod: AUTOMATIC | MANUAL)
confirmationMethod (ConfirmationMethod: AUTOMATIC | MANUAL)
paymentMethodId? · mandateId? · paymentMethodTypes String[]
setupFutureUsage (SetupFutureUsage: NONE | ON_SESSION | OFF_SESSION) @default(NONE)
description? · receiptEmail? · statementDescriptor? · statementDescriptorSuffix?
lastPaymentError Json? · nextAction Json? · processing Json?
attemptCount Int @default(0) · latestPaymentId? · latestAttemptId?
canceledAt? · cancellationReason?
provider? · providerConnectionId? · providerIntentId?
idempotencyKey String? @map("idempotency_key")
metadata · createdAt · updatedAt
```

`PaymentIntentStatus`: `REQUIRES_PAYMENT_METHOD | REQUIRES_CONFIRMATION |
REQUIRES_ACTION | PROCESSING | REQUIRES_CAPTURE | SUCCEEDED | CANCELED`.

`@@unique([tenantId, id])`, `@@unique([tenantId, idempotencyKey])`,
`@@unique([providerConnectionId, providerIntentId])`, indexes on
`[tenantId, customerId]`, `[tenantId, status]`, `[tenantId, invoiceId]`.

**No `clientSecret` column.** A provider client secret is short-lived transport,
returned in a response if a provider needs it, never persisted.

### 1.6 `dispute.prisma` — `Dispute` → `billing_disputes`

```
id · tenantId · paymentId · customerId
amount BigInt · currency
reason String? · status (DisputeStatus)
isPaymentRefundable Boolean @default(true)
evidence Json? · evidenceDetails Json? · dueBy Int?
provider? · providerConnectionId? · providerDisputeId?
openedAt Int? · resolvedAt Int? · metadata · createdAt · updatedAt
```

`DisputeStatus`: `WARNING_NEEDS_RESPONSE | WARNING_UNDER_REVIEW | WARNING_CLOSED |
NEEDS_RESPONSE | UNDER_REVIEW | WON | LOST`.

### 1.7 `provider-reference.prisma` — `ProviderReference` → `billing_provider_references`

The one place a processor id may live.

```
id · tenantId · provider String · providerConnectionId?
resourceType String @map("resource_type") · resourceId String @map("resource_id")
externalType String @map("external_type") · externalId String @map("external_id")
metadata Json? · createdAt
```

`@@unique([provider, externalType, externalId])`,
index `[tenantId, resourceType, resourceId]`.

### 1.8 Extend `Payment` (`payment.prisma`)

Add, without removing or renaming anything:

```
paymentIntentId String? @map("payment_intent_id")
paymentMethodId String? @map("payment_method_id")
billingDetailsSnapshot Json? @map("billing_details_snapshot")
paymentMethodSnapshot Json? @map("payment_method_snapshot")
providerStatus String? @map("provider_status")
failureCode String? @map("failure_code") · failureMessage String? @db.Text @map("failure_message")
authorizationCode String? @map("authorization_code")
receiptUrl String? @map("receipt_url")
risk Json?
amountRefunded BigInt @default(0) @map("amount_refunded")
disputed Boolean @default(false)
```

with the matching relations and indexes. `PaymentStatus` gains
`REQUIRES_ACTION`, `AUTHORIZED`, `PROCESSING`, `PARTIALLY_REFUNDED`,
`REFUNDED`, `DISPUTED` alongside the existing four. **Adding enum values only —
never remove or rename one**; every existing `switch` over `PaymentStatus` must
still compile and still handle its cases, so audit them.

`PaymentAttempt` gains `paymentIntentId?`, `paymentMethodId?`,
`providerStatus?`, `threeDSecure Json?` and `authorizationCode?` if not present.

### 1.9 Back-relations

Add the corresponding relation arrays to `Tenant`, `Customer`,
`PaymentProviderConnection`, `Payment`, and `Invoice` so `prisma validate`
passes. Do not change any existing field.

### 1.10 Migration

One migration directory,
`apps/billing-api/prisma/migrations/<UTC yyyymmddhhmmss>_billing_payment_instrument_plane/migration.sql`,
generated with

```
pnpm --filter @876/billing-api exec prisma migrate diff \
  --from-migrations prisma/migrations --to-schema-datamodel prisma/schema \
  --shadow-database-url "$SHADOW" --script
```

or hand-written to match exactly if no shadow database is reachable. It must be
**additive only**: `CREATE TABLE`, `CREATE INDEX`, `ALTER TABLE … ADD COLUMN`,
`ALTER TYPE … ADD VALUE`. No `DROP`, no `ALTER COLUMN … TYPE`, no data
backfill. `pnpm --filter @876/billing-api db:validate` must pass.

## Task 2 — Module `apps/billing-api/src/modules/payment-methods/`

Follow `modules/payments/` for structure and `payments.routes.ts` for the route
declaration style (`createApiRouter`, `security: { kind: 'tenant', permission }`,
`successEnvelopeSchema`, `resource('...')`, `list('...')`).

Files: `payment-methods.routes.ts`, `.controller.ts`, `.service.ts`,
`.serializers.ts`, `.docs.ts`, `index.ts`, `repositories/`, `schemas/`,
`__tests__/`.

Permissions: reuse `payments:read` / `payments:write`.

Routes, all under the tenant tier at `/api/v1`:

```
GET    /organizations/:organizationId/payment-methods          list (cursor, filter customerId, type, status)
POST   /organizations/:organizationId/payment-methods          create
GET    /organizations/:organizationId/payment-methods/:paymentMethodId
PATCH  /organizations/:organizationId/payment-methods/:paymentMethodId   billingDetails, metadata, allowRedisplay only
POST   /organizations/:organizationId/payment-methods/:paymentMethodId/default   set as the customer's default
DELETE /organizations/:organizationId/payment-methods/:paymentMethodId   detach
GET    /organizations/:organizationId/customers/:customerId/payment-methods
```

Serialized object discriminator: `"payment_method"`. Detach returns the tombstone
`{ object: 'payment_method', id, deleted: true }` and sets `status = DETACHED`
plus `detachedAt` — it is **never** a row delete, and it revokes the credential
(`status = REVOKED`, `sealedValue = null`, `revokedAt`).

### The create contract — this is the part that must be right

`POST` accepts exactly one of three mutually exclusive credential shapes,
modelled as a discriminated union on `credential.storage`:

1. `{ storage: 'provider_token', provider, providerConnectionId, providerToken }`
   — **preferred**. The processor already tokenised; store the token, seal
   nothing.
2. `{ storage: 'vault', value }` — the raw PAN or bank account number, for
   processors with no tokenisation. Seal it immediately through
   `getSecureFieldProvider(tenantId, getVaultClient())` under
   `credentialContext(...)`, write `sealedValue`, and **never** hold the
   plaintext beyond that call.
3. `{ storage: 'none' }` — a `MANUAL` method, which has no credential at all.

Non-negotiable in the service:

- The request Zod schema is `z.strictObject`, so a `cvc` field is a **validation
  error**, not silently dropped.
- Derive `last4`, `brand`, `expMonth`, `expYear` and `displayLabel` from the
  supplied metadata, never from the sealed value.
- **Never log, return, or put in `metadata` any part of `credential.value`.**
  Add a test that asserts the created response body, serialized, contains
  neither the PAN nor the sealed ciphertext.
- Setting a default is one transaction: clear the previous default for that
  customer, then set the new one. Two rows with `isDefault = true` for one
  customer is a bug the test suite must catch.
- A `MANUAL` method with a `credential` block, or a `CARD` with
  `storage: 'none'`, is a 4xx with a registered error code.

**No route ever returns a sealed value or a decrypted credential.** There is no
"reveal" endpoint in this brief. The only consumer of `unseal` is a processor
call path that does not exist yet — so `unseal` is called from **nowhere** in
this change, and that is correct.

Error codes go through the existing `appError` registry (see
`.claude/rules/express-api.md`); add new codes there, namespaced
`payment-method/...`.

## Task 3 — Module `apps/billing-api/src/modules/payment-intents/`

Same shape. Discriminator `"payment_intent"`.

```
GET    /organizations/:organizationId/payment-intents
POST   /organizations/:organizationId/payment-intents
GET    /organizations/:organizationId/payment-intents/:paymentIntentId
POST   /organizations/:organizationId/payment-intents/:paymentIntentId/confirm
POST   /organizations/:organizationId/payment-intents/:paymentIntentId/capture
POST   /organizations/:organizationId/payment-intents/:paymentIntentId/cancel
```

There is no processor behind them yet, so the service implements the **state
machine and the records**, not a network call:

- `create` → `REQUIRES_PAYMENT_METHOD`, or `REQUIRES_CONFIRMATION` when a
  payment method is supplied.
- `confirm` → for a `MANUAL` payment method, settle immediately: write a
  `PaymentAttempt`, a `Payment` (snapshotting the method's display metadata),
  and move the intent to `SUCCEEDED`. For any other type, `PROCESSING` and a
  registered `payment/provider-unavailable` error, because no adapter is wired.
- `capture` → only legal from `REQUIRES_CAPTURE`.
- `cancel` → illegal from `SUCCEEDED`; legal from the earlier states.
- Every illegal transition is a registered 4xx error naming the current status,
  never a silent no-op. **Test every legal transition and at least one illegal
  transition per state.**
- `create` honours an `Idempotency-Key` through the existing
  `src/platform/idempotency.ts`; a replay returns the original intent rather
  than creating a second one.

## Task 4 — Wire and document

- Register both routers in `src/http/routes.ts` beside the existing ones.
- Regenerate the API contract manifest:
  `pnpm --filter @876/billing-api api:contract:generate`.
- Add `docs/billing/payment-instruments.md`: the create-a-payment-method flow,
  the three credential storages and when each applies, the intent state machine
  as a diagram, and a plain statement of what is never stored.

## Verification — run every one, in the foreground, and report real output

```
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api generate
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api api:contract:check
npx prettier --check <every file you touched>
```

`pnpm --filter @876/billing-api typecheck` currently fails on
`packages/core/src/fetch/bridge.ts(154,50)` on `main`, before this change. That
one error is pre-existing and not yours to fix — but **no new error may appear**,
so run it and compare.

Also grep the whole repo before you finish and paste the result:

```
grep -rniE "\b(cvc|cvv|cid|pin_block|pinBlock|track_data|trackData)\b" \
  apps/billing-api/src apps/billing-api/prisma docs/billing
```

The only acceptable hits are the *check-result* field (`checks.cvc`) and prose
in the rule/docs saying the value is never stored.

## Constraints

- Do not commit. The orchestrating agent stages and commits.
- Do not touch `apps/console`, `apps/billing`, `apps/invoice`, `packages/billing`,
  `packages/client`, or anything under `apps/api`.
- Do not modify `packages/core/src/crypto/secure-field.ts` or
  `apps/billing-api/src/platform/secure-field.ts`.
- Do not remove or rename an existing column, table, enum value, route, or error
  code — they are contracts.
- Do not add a per-provider id column to any table.
- Follow `.claude/rules/testing.md`: assert full shapes and both sides of
  `{ data, error }`, exact call counts, and a negative-space test for every guard.
