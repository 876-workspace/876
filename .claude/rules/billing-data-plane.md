# 876 Billing Data Plane

Read this before modelling, storing, or exposing **any** money-adjacent record —
a customer's payment method, a card credential, a payment attempt, an invoice, a
subscription, a price, a refund, a dispute, a credit, or a tax line — in
`apps/billing-api`, `apps/api`, `apps/billing`, `apps/invoice`, `apps/console`,
or any future product app.

Companion to `.claude/rules/platform-services.md` (bounded contexts),
`.claude/rules/customer-architecture.md` (who a customer is),
`.claude/rules/stripe-api-pattern.md` (resource shape), and
`.claude/rules/express-api.md` (module shape). The Stripe field catalogues and
the object-by-object mapping live in
`docs/billing/stripe-object-mapping.md`.

## The position, in one line

**876 owns the canonical billing objects. Stripe is a reference model, never a
dependency, and every processor — Stripe, a Caribbean acquirer, a bank, a manual
cash receipt — is an adapter behind the same interface.**

Stripe is not available in Jamaica, which is why 876 runs its own subscription
and invoicing engine. Stripe's *object model* is nevertheless the most mature one
in the industry, so 876 deliberately mirrors its **shapes, names, statuses, and
lifecycle transitions** — closely enough that an integrator who knows Stripe (or
Zoho Billing, which is a subset of the same ideas) can read 876 Billing without a
translation table, and closely enough that Console reads like a Stripe dashboard
over 876's own data.

Mirroring the model is not the same as adopting the vendor. Concretely:

- 876 IDs are the primary keys. A provider id is a **reference**, never an
  identity.
- No table is named after a processor, and no table gets a `stripe_*` /
  `fygaro_*` column per provider. Provider links go in `billing_provider_references`.
- Where Stripe's model is US-specific (ACH routing semantics, Connect, Radar,
  test clocks, legacy `Source`/`Plan`), 876 does **not** copy it.

## Placement — the financial plane is `apps/billing-api`

| Concern                                                                     | Owner                            |
| --------------------------------------------------------------------------- | -------------------------------- |
| Who a user/org is; which app an org is entitled to (`subscriptions` table)  | `apps/api` (core identity)       |
| Customers, products, prices, subscriptions, invoices, payments, credits, tax | `apps/billing-api`               |
| Payment methods, credentials, intents, attempts, refunds, disputes, mandates | `apps/billing-api`               |
| Rendering, admin action, oversight                                          | `apps/console`, `apps/billing`   |

Core's `subscriptions` table is an **entitlement** record (org → platform app).
The money behind it — the customer, the price actually charged, the invoice, the
payment method — lives in Billing and is referenced from core by opaque id only,
with no cross-database foreign key. Console resolves both sides through `$876`
and presents them as one screen; that composition is a Console concern, not a
schema one.

## The canonical hierarchy

```
Organization
  └── Customer  (billing_customers — the org-customer registry)
        ├── Billing profile · addresses · tax ids · balance · credits
        ├── Payment Method ──> Payment Credential ──> Vault ref | provider token
        ├── Subscription
        │     └── Subscription Item ──> Price ──> Product
        ├── Invoice
        │     └── Invoice Line   (tax + discount snapshotted at finalization)
        ├── Payment Intent
        │     └── Payment
        │           ├── Payment Attempt
        │           ├── Refund
        │           └── Dispute
        ├── Credit Note · Customer Balance Transaction · Credit Grant
        └── Entitlement

Every provider object      ──> Provider Reference   (never a canonical id)
Every financial movement   ──> Ledger Entry
```

## Vocabulary — fixed, do not invent synonyms

| Term                   | Meaning                                                                                     | Never call it                       |
| ---------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Product**            | What is provisioned/sold.                                                                   | "plan" in new code                  |
| **Price**              | How a product is charged: currency, amount, interval, scheme, tiers.                        | "plan", "rate card"                 |
| **Subscription**       | A customer's recurring agreement. Holds items, never an amount of its own.                  | "plan"                              |
| **Subscription Item**  | One price on a subscription, with a quantity.                                                | "line"                              |
| **Invoice**            | A finalized, immutable-by-default demand for money.                                         | "bill" (UI copy may say bill)       |
| **Payment Intent**     | A stateful attempt to collect a specific amount.                                            | "charge"                            |
| **Payment**            | The durable record of money actually moving.                                                | "charge", "transaction"             |
| **Payment Attempt**    | One processor round trip inside an intent. Preserved even after a later attempt succeeds.   | "retry"                             |
| **Payment Method**     | Reusable, **non-secret** instrument metadata belonging to a customer.                       | "card" (a card is one type)         |
| **Payment Credential** | The pointer to the secret behind a payment method — a Vault object or a provider token.     | "the card number"                   |
| **Mandate**            | Recorded customer authorization to charge a method again.                                   | "consent" alone                     |
| **Provider Reference** | The link between an 876 record and a processor's id for it.                                 | "external id" on the record itself  |
| **Ledger Entry**       | A double-entry line describing one financial movement.                                      | "transaction"                       |

**Stripe's legacy `Plan` object must not be reproduced.** Product + Price is the
model. Where a customer-facing tier name is genuinely a marketing concept, it is
a `Product` attribute — never a third pricing table. Console's existing
"plans" UI is a `Product` view and its URLs stay as they are (they are contracts,
per `.claude/rules/naming.md`).

## The security boundary — three tiers, decided per field

This is the part that is not a matter of taste.

### Tier 1 — plain columns in the Billing database

Non-secret instrument metadata, safe to read, index, log, and render:

card brand · display brand · funding · issuer country · last4 · expiry month ·
expiry year · cardholder name · fingerprint · network · wallet type ·
3DS support · AVS/CVC **check results** · bank name · bank account last4 ·
masked routing/branch reference · account type · verification status ·
provider token reference · mandate id · authorization code · processor
reference · billing name/email/phone/address.

### Tier 2 — the Vault, referenced from the database

Values that must exist but must never sit in a normal column:

full PAN · full bank account number · provider refresh tokens and API
credentials · sensitive tax identifiers.

The row stores `{ storage, vaultProvider, vaultObjectId, vaultVersionId }`.
It never stores the value. See "Vault" below.

### Tier 3 — never persisted, at all, even encrypted

**CVV / CVC / CID, PIN and PIN blocks, and full magnetic-stripe or
chip-equivalent track data must never be written to any store after
authorization.** This is a PCI DSS prohibition, not a policy preference, and
encryption does not lift it.

Therefore: **no schema in this repo may contain a `cvc`, `cvv`, `cid`, `pin`,
`pin_block`, or `track_data` column, in any table, in any app, ever.** A
verification *result* (`checks.cvc = "pass"`) is a Tier‑1 value and is fine; the
digits the cardholder typed are not.

### And a fourth rule that spans all three

A full PAN must never reach a log line, a Sentry breadcrumb, a PostHog event, an
analytics payload, an HTTP access log, a job/queue payload, a `metadata` JSON
blob, a provider-event archive, or a debug print. Truncate to last4 at the
boundary where the value enters the process, not at the boundary where it leaves.

## Vault

`@876/core/crypto/secure-field` is the one abstraction. Two providers behind it:
**WorkOS Vault** in deployed environments, **AES‑256‑GCM under a local key** for
development and tests, chosen by settings. A missing configuration raises on
seal — it must never silently fall through to plaintext.

- The context map is **authenticated associated data**, never metadata. For a
  payment credential it is `{ tenant_id, payment_method_id, type }`, which binds
  the ciphertext to the row that owns it: a value copied onto another tenant's
  record fails to decrypt instead of disclosing.
- Ciphertext carries a provider prefix (`wv1:` / `la1:`) so a later migration can
  tell the formats apart without guessing.
- Decryption happens **only** on the path that hands the value to a processor.
  Nothing else in Billing may call `unseal` on a card credential, and no route
  returns one.

**A vault is not a processor.** WorkOS Vault gives 876 encryption, key custody,
and access isolation. It does not authorize a card, route to a scheme, run 3DS,
settle, or handle a chargeback — that still requires an acquirer or gateway.
Using a PCI-attested vault also does not make 876 PCI compliant on its own: any
system that receives, transmits, or decrypts a PAN is in scope. **Prefer a
processor's own token over a Vault-stored PAN whenever the processor offers
tokenization**; the Vault path exists for processors that do not.

## Money

- Integer **minor units** everywhere by default (`amount: 150000` = JMD 1,500.00),
  respecting each currency's real minor-unit count.
- A price that needs sub-minor precision carries `unitAmountDecimal` as a
  **string**. A rate or percentage is a `Decimal`/string end-to-end — never a JS
  number. `15.00` GCT that becomes `15.000000001` is a billing defect.
- Currency is explicit on customer, price, invoice, payment, refund, credit, and
  ledger entry. A conversion is recorded with source amount, settlement amount,
  rate, rate source, and rate timestamp. **Never re-derive a historical
  conversion from today's rate.**

## Snapshots — history renders from the document, not from live rows

When an invoice is finalized, it snapshots the customer identity and address,
the seller identity, the tax ids, and for each line the description, price,
quantity, unit amount, tax rate and amount, and discount. When a payment
succeeds, it snapshots the payment method's non-secret display metadata.

A finalized document must render identically after the customer renames itself,
the price changes, the tax rate is superseded, or the card is deleted. Reading a
live `Price` row to display a two-year-old invoice is a defect.

## Immutability

Finalized invoices and issued credit notes are **never hard-deleted**, and their
amounts are never edited in place. Money is corrected by a **new** record — a
void, a credit note, a refund, a reversal, a balance transaction — so that the
history explains itself. `deletedAt` belongs on drafts and mutable catalog rows,
not on accounting records.

Prices are immutable in their monetary terms once used. Changing an amount,
currency, interval, or scheme means creating a new `Price`; only presentational
fields (nickname, active, metadata) may be updated.

## Provider abstraction

One interface (`customers?`, `paymentMethods`, `payments`, `refunds`,
`mandates?`, `webhooks?`), one adapter per processor, and a registry that
declares each connection's **capabilities**. Nothing above the adapter knows
which processor is in play.

- Every provider write is **idempotent**, keyed through the shared idempotency
  layer.
- Every inbound webhook is idempotent and auditable:
  `UNIQUE (provider, provider_event_id)` and a stored normalized event.
- Provider statuses and errors are **normalized** before they cross the Billing
  service boundary. Store the raw provider status alongside the canonical one;
  never surface a raw processor message to a user.

Canonical payment statuses: `pending` · `requires_action` · `authorized` ·
`processing` · `succeeded` · `failed` · `canceled` · `partially_refunded` ·
`refunded` · `disputed`.

Canonical failure codes are namespaced (`payment/insufficient-funds`,
`payment/authentication-required`, …) and carry the provider's own code beside
them plus a `retryable` flag.

## Parked, deliberately

The subscription engine carries features that are ahead of where the platform
actually is. These stay in the tree, stay compiling, stay tested — and stay
**off** behind an explicit setting, defaulting to disabled:

- late fees and their assessment sweep,
- dunning/collections escalation beyond simple retry,
- revenue recognition and settlement/payout reconciliation.

Every organization is currently on a free plan and no money is collected, so a
feature that can only fire against real money must not fire at all. Parking is a
setting and a documented decision — never a half-deleted code path.

## Do not

- Do not store a CVV/CVC/CID, PIN, PIN block, or track data anywhere, encrypted
  or not, in any app.
- Do not let a full PAN reach a log, trace, analytics event, queue payload, or
  `metadata` blob.
- Do not make a provider id a primary key, or add a per-provider id column.
- Do not name a table, column, module, or canonical status after a processor.
- Do not hard-delete a finalized invoice, issued credit note, payment, or refund.
- Do not edit the monetary terms of a used price — create a new one.
- Do not render a historical document from live customer/price/tax/method rows.
- Do not carry money or a rate as a JS `number`.
- Do not reintroduce Stripe's legacy `Plan` as a separate pricing table.
- Do not copy Stripe Connect, Radar, test clocks, or US routing semantics.
- Do not call a processor without an idempotency key.
- Do not process a webhook without a uniqueness guard on the provider event id.
- Do not surface a raw provider error message or status to an end user.
- Do not decrypt a payment credential anywhere but the processor call path.
- Do not ship a late-fee, dunning, or payout feature enabled by default.
