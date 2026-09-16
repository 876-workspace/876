# Brief — review PR #361, the billing Stripe data-plane remodel

You are **reviewing**, not implementing. Do not edit a single file. Produce a
findings report. If you find nothing in a section, say so explicitly rather than
inventing something.

## The change under review

Branch `feature/billing-stripe-data-plane`, 33 commits, 144 files,
~16.8k insertions. Diff it with:

```
git diff origin/main...HEAD
git log --oneline origin/main..HEAD
```

It does five things:

1. **Instrument plane** in `apps/billing-api`: new Prisma models
   `PaymentMethod`, `PaymentCredential`, `SetupIntent`, `Mandate`,
   `PaymentIntent`, `Dispute`, `ProviderReference`; new fields on `Payment` and
   `PaymentAttempt`; one additive migration; two new modules
   (`payment-methods`, `payment-intents`).
2. **WorkOS Vault sealing**: providers extracted to
   `packages/core/src/crypto/secure-field.ts`, bound per-service in
   `apps/api/src/platform/secure-field.ts` and
   `apps/billing-api/src/platform/secure-field.ts`, with
   `apps/billing-api/src/providers/workos/vault.ts`.
3. **A new permission pair** `payment_methods:read` / `payment_methods:write`
   with a backfill migration.
4. **Price authoring**: `apps/api` products module now persists the full
   Stripe-shaped price; `packages/admin` types widened; Console gains
   `/pricing/new` and `/pricing/[priceId]/edit` pages and `src/lib/money.ts`.
5. **Client + Console**: `$876.paymentMethods.*` / `paymentIntents.*` across the
   tenant/admin/integration tiers, Console route handlers under
   `/api/payment-methods`, and a billing summary on the subscription panel.
6. **Parking**: `BILLING_LATE_FEES_ENABLED` / `_DUNNING_` / `_PAYOUTS_`,
   defaulting off, gating late-fee assessment in the documents service.

## Rules it must obey — read these first, they are the review criteria

- `.claude/rules/billing-data-plane.md` — **normative**. Its "Do not" list is a
  checklist; verify each one.
- `docs/billing/stripe-object-mapping.md`
- `.claude/rules/express-api.md` — module shape, layer responsibilities,
  boundaries, auth tiers, error handling.
- `.claude/rules/stripe-api-pattern.md` — `object` discriminators,
  `{data,error}`, list envelopes, cursor pagination, no `httpStatus` in a
  client-facing error body.
- `.claude/rules/sdk-conventions.md` — verb vocabulary, tier gating.
- `.claude/rules/api-access.md`, `.claude/rules/product-api-boundary.md` —
  Console URLs name Console resources, never a service namespace; route handlers
  are pure transport.
- `.claude/rules/deletions.md` — no hard delete of financial records.
- `.claude/rules/testing.md` — every test must be able to fail.
- `.claude/rules/app-structure.md`, `.claude/rules/app-layout.md`,
  `.claude/rules/data-loading.md` for the Console changes.
- `.claude/rules/naming.md` — table/column/env/error-code names are contracts.

## What I want you to look for, specifically

Work through these. For each, either name a concrete defect or state it is clean.

### A. Security — the highest-value section, spend the most time here

1. **Is there any path by which a full PAN, a full bank account number, or a
   sealed ciphertext can reach a response body, a log line, a Sentry breadcrumb,
   an analytics event, a queue payload, a `metadata` JSON blob, or a thrown
   error message?** Trace `credential.value` from the request schema through the
   service to the database and confirm it dies at the `seal()` call.
2. **Is `unseal` called anywhere?** It should be called from nowhere. If it is,
   that is a finding.
3. **Does any schema, fixture, test, or migration contain a `cvc`, `cvv`, `cid`,
   `pin`, `pin_block`, or track-data *value* field?** A `checks.cvc` *result*
   (`pass|fail|unavailable|unchecked`) is allowed and expected.
4. **Is the authenticated associated data correct and total?** See
   `credentialContext` in `apps/billing-api/src/platform/secure-field.ts`. Can a
   ciphertext be replayed onto another payment method, another tenant, or under
   another credential type and still decrypt?
5. **Is the key context per-tenant, and is that actually threaded through?**
6. **Are the payment-method and payment-intent routes correctly auth-gated?**
   Every route should be tenant-tier; reads on `payment_methods:read`, every
   mutation on `payment_methods:write` (payment-intents still uses
   `payments:*` — is that the right call, or should intents split too? Give me
   your opinion).
7. **Does the permission backfill migration actually prevent an access
   regression?** Read
   `prisma/migrations/20260823120000_billing_payment_method_permissions/migration.sql`.
   Is it idempotent? Does it miss any role shape? What happens to a role created
   between deploy and migration?
8. **Can a caller act on an organization it did not name?** Check the admin and
   integration client resources and the tenant guard.
9. **Console route handlers**: are they pure transport, permission-checked, and
   free of a service namespace in the URL?

### B. Correctness

1. **The payment-intent state machine** in
   `apps/billing-api/src/modules/payment-intents/payment-intents.service.ts`.
   Enumerate every state and every transition. Is any illegal transition
   reachable? Is any legal one blocked? Is `confirm` on a non-manual method
   leaving the intent in `PROCESSING` while throwing a 503 — is that the right
   behaviour, and is it recoverable?
2. **Money.** Is any amount, rate, or percentage carried as a JS `number`
   anywhere it is stored, compared, or round-tripped? Check
   `apps/console/src/lib/money.ts`, the price schemas in
   `apps/api/src/modules/products/products.schemas.ts`, and the billing
   serializers.
3. **`unappliedAmount`** on the payment written by manual settlement — is
   setting it to the full amount right? Should the intent's `invoiceId` cause an
   allocation instead? Is the customer's AR left stale because
   `recomputeCustomerAr` is not called?
4. **Idempotency** on payment-intent create: is the pre-check plus
   unique-constraint race handling actually correct? What if two requests race
   with the same key?
5. **The single-default invariant**: can two payment methods for one customer
   end up with `isDefault = true`? Is the transaction sufficient under
   concurrency?
6. **Detach**: does it revoke the credential, clear the sealed value, and drop
   default status atomically? Is a double-detach safe?
7. **The price cross-field validation** in `products.schemas.ts` — is every
   contradiction caught, and is any *valid* combination wrongly rejected?
   Specifically confirm a recurring price with no interval and a per-unit price
   with no amount both still pass, because both have always been accepted.
8. **The used-price immutability check** — can it be bypassed? Does it write
   anything before refusing?
9. **The late-fee gate** — does every caller reach it? Is the precedence
   (platform AND tenant) right? Does the neutral return shape match the existing
   disabled-preference return exactly?

### C. Schema and migration

1. **Is the migration genuinely additive?** Any `DROP`, `ALTER COLUMN`,
   `RENAME`, or data mutation is a finding.
2. **`ALTER TYPE ... ADD VALUE` inside a transaction** — safe on the Postgres
   version Neon runs? Is any added value *used* in the same migration?
3. **Indexes**: is every foreign key and every common filter indexed? Is any
   index redundant?
4. **Uniqueness**: are the unique constraints right? Can two payment methods
   collide on `(providerConnectionId, providerPaymentMethodId)` when both are
   null?
5. **Cross-database foreign keys** — there must be none into the identity DB.
6. **Nullability**: any column that should be `NOT NULL` and is not, or vice
   versa?
7. Do the back-relations added to `Tenant`, `Customer`, `Invoice`,
   `PaymentProviderConnection`, `Payment` change any existing cascade behaviour?

### D. Contracts

1. Does every serialized resource carry its `object` discriminator?
2. Do lists use `{object:'list', data, has_more, total_count, url}` with
   **cursor** pagination? The payment-method and payment-intent `list` compute
   `has_more` as `rows.length === limit` — is that acceptable or a defect?
3. Does any client-facing error body leak `httpStatus`?
4. Are the new error codes namespaced and registered appropriately? Note that
   `apps/billing-api/src/platform/errors.ts` currently allows unregistered codes
   with an explicit status — is that being abused here?
5. Is the published `apps/billing/contracts/v1/openapi.json` consistent with the
   live routes?

### E. Tests — apply `.claude/rules/testing.md` strictly

1. **Find every test that cannot fail.** Tautologies, assertions on mocks
   rather than behaviour, `expect(x).toBeDefined()` as the only assertion,
   fixtures that duplicate implementation instead of importing it.
2. Are both sides of `{data, error}` asserted?
3. Are call counts exact rather than `toHaveBeenCalled()`?
4. Is there a negative-space test for every guard?
5. **Is any important behaviour untested?** Name it. I care most about: a PAN
   never appearing in a response, the AAD replay refusals, the single-default
   invariant, every illegal state transition, and the late-fee gate precedence.

### F. Structure and style

1. Layer violations: a controller touching Prisma, a service touching
   `req`/`res`, a repository reading settings, a cross-module table join.
2. Console: is `features/billing/` placement right? Any route importing another
   route's `_components/`? Any `<p>` explainer under a heading? Any green button?
3. Dead code, duplicated helpers, or a second way to do something the codebase
   already does once.
4. Anything that will be expensive to change later — a name that is really a
   contract, an abstraction that leaks, a shape that will need a migration.

## Output format

A markdown report. For each finding:

```
### <short title>
- **Severity**: critical | high | medium | low
- **Where**: path/to/file.ts:LINE
- **What**: one sentence stating the defect.
- **How it fails**: concrete inputs or sequence → wrong outcome.
- **Fix**: what you would change, specifically.
```

Then a section **"Checked and clean"** listing every item above you verified and
found no problem with, so I know what you actually looked at.

Then **"Judgement calls I would make differently"** — design opinions, not
defects, clearly separated.

## Do not flag these — they are pre-existing on `main`, not this change

- `packages/core/src/fetch/bridge.ts:154` — `Headers.entries` typecheck error.
- 18 failing tests in `apps/api`: `src/http/auth/__tests__/guards.test.ts` (6),
  `src/providers/workos/__tests__/workos.test.ts` (7),
  `src/services/__tests__/auth.test.ts` (1),
  `src/modules/memberships/__tests__/memberships.test.ts` (2),
  `src/modules/sessions/__tests__/sessions.test.ts` (2).
- Console lint errors in `src/components/shell/nav-config.ts` and
  `src/app/(app)/orgs/[slug]/members/_components/add-member-dialog.tsx`.
- The 2 app-structure violations reported by
  `node scripts/check-app-structure.mjs`.
- `findCustomerRow` unused warning in `apps/billing-api`.

## Constraints

- **Read-only. Change nothing, commit nothing.**
- Cite `file:line` for every claim. If you assert something is missing, say
  where you looked.
- Prefer a small number of real findings over a long list of nitpicks, but do
  not stay silent about a security or correctness defect to keep the list short.
