# Stripe → 876 Billing object mapping

Reference for building the 876 Billing financial data plane against Stripe's
object model without depending on Stripe. The normative rules are in
`.claude/rules/billing-data-plane.md`; this file is the field-level companion.

Last reviewed against public Stripe and WorkOS documentation: 2026-08-23.

## Why Stripe is the reference and not the provider

Stripe is not available in Jamaica or most of the Caribbean, so 876 runs its own
subscription, invoicing, and collection engine and integrates local acquirers,
bank transfers, and manual payments through adapters. Stripe's object model is
still the best-documented one in the industry, and mirroring it buys three
things: an integrator who knows Stripe (or Zoho Billing, a subset of the same
concepts) can read 876 Billing immediately; Console can present a
Stripe-dashboard-quality surface over 876's own data; and if a Stripe corridor
ever opens, it is one more adapter rather than a rewrite.

## Object mapping

| Stripe                       | 876 Billing                                  | Notes                                              |
| ---------------------------- | -------------------------------------------- | -------------------------------------------------- |
| Customer                     | `Customer` (`billing_customers`)             | Already the org-customer registry of record.       |
| Product                      | `Product` (`billing_products`)               | What is provisioned.                               |
| Price                        | `Price` (`billing_prices`)                   | How it is charged. Immutable in monetary terms.     |
| Plan (legacy)                | — **not modelled**                           | Product + Price only.                               |
| Subscription                 | `Subscription`                               |                                                     |
| Subscription Item            | `SubscriptionItem`                           |                                                     |
| Subscription Schedule        | `SubscriptionLifecycleSchedule` / amendments | Existing engine covers phases.                      |
| Invoice                      | `Invoice`                                    |                                                     |
| Invoice Line Item            | `InvoiceLine`                                | Tax + discount snapshotted at finalization.         |
| Invoice Item (pending)       | `SubscriptionCharge` / pending invoice item  |                                                     |
| Quote                        | `Quote` / `Estimate`                         | Both already exist.                                 |
| PaymentMethod                | `PaymentMethod`                              | **new** — non-secret metadata only.                 |
| —                            | `PaymentCredential`                          | **new** — 876 addition; Vault or provider token.    |
| SetupIntent                  | `SetupIntent`                                | **new**                                             |
| Mandate                      | `Mandate`                                    | **new**                                             |
| PaymentIntent                | `PaymentIntent`                              | **new**                                             |
| Charge                       | `Payment`                                    | Exists; gains intent/method/snapshot fields.        |
| —                            | `PaymentAttempt`                             | Exists; one processor round trip.                   |
| Refund                       | `Refund`                                     | Exists.                                             |
| Dispute                      | `Dispute`                                    | **new**                                             |
| Coupon                       | `Coupon`                                     | Exists.                                             |
| Promotion Code               | `PromotionCode`                              | Exists.                                             |
| Discount                     | `SubscriptionDiscount` / applied discount    | Exists.                                             |
| Tax Rate                     | `TaxRate`                                    | Exists; GCT is a row, not a special case.           |
| Credit Note                  | `CreditNote`                                 | Exists.                                             |
| Customer Balance Transaction | `CustomerLedgerEntry`                        | Exists.                                             |
| Billing Meter                | `Meter`                                      | later                                               |
| Meter Event                  | `MeterEvent`                                 | later                                               |
| Credit Grant                 | `CreditGrant`                                | later                                               |
| Active Entitlement           | `Entitlement`                                | Core API owns app entitlement; Billing mirrors.     |
| Checkout Session             | `CheckoutSession`                            | later — orchestration, never the accounting truth.  |
| Payment Link                 | `PaymentLink`                                | later                                               |
| Balance Transaction          | `LedgerEntry` + `ProviderReference`          | 876 keeps its own double-entry ledger.              |
| Connect / Radar / test clocks| — **not modelled**                           | Vendor-specific.                                    |

## ID prefixes

```
acct_    billing account          pm_        payment method
cus_     customer                 pcred_     payment credential
addr_    address                  setup_     setup intent
prod_    product                  mandate_   mandate
price_   price                    pi_        payment intent
sub_     subscription             pay_       payment
si_      subscription item        pat_       payment attempt
sch_     subscription schedule    ref_       refund
meter_   billing meter            disp_      dispute
mevt_    meter event              cn_        credit note
inv_     invoice                  coupon_    coupon
il_      invoice line             promo_     promotion code
ii_      pending invoice item     disc_      applied discount
quote_   quote / estimate         tax_       tax rate
cbt_     customer balance txn     taxid_     customer tax id
credit_  credit grant             ent_       entitlement
ledger_  ledger transaction       evt_       normalized provider event
```

## Payment Method — the field split that matters

**Tier 1, plain columns.** `type`, `status`, `allowRedisplay`, `reusable`,
`billingDetails` (name/email/phone/address), and one type-specific block:

- `card`: brand, displayBrand, network, funding, issuerCountry, last4,
  expMonth, expYear, fingerprint, cardholderName, `checks`
  (addressLine1/postalCode/cvc → pass|fail|unavailable|unchecked),
  `networks` (available/preferred), `threeDSecureUsage.supported`, wallet.
- `bankAccount`: accountHolderType, accountType, bankName, country, currency,
  last4, fingerprint, `routing` (type + masked — **not** US-routing-shaped),
  status.
- `wallet`: type (apple_pay | google_pay | paypal | cash_app | link | other),
  provider, dynamicLast4.
- `manual`: method (bank_transfer | cash | cheque | wire | mobile_money |
  point_of_sale | cash_deposit | other), displayName, instructions.

**Tier 2, `PaymentCredential` row → Vault / provider token.** Full PAN, full
bank account number, provider refresh tokens. Shape:

```
{ paymentMethodId, type: card_pan | bank_account | provider_token,
  storage: workos_vault | provider_token,
  vaultProvider, vaultObjectId, vaultVersionId,
  providerToken, status, createdAt, rotatedAt, revokedAt }
```

**Tier 3, never stored.** CVV/CVC/CID, PIN, PIN block, track data. No column,
ever, in any app. Only the *check result* is kept.

## Payment Intent statuses

```
requires_payment_method → requires_confirmation → requires_action
                        → processing → requires_capture → succeeded
                        → canceled
```

## Canonical payment statuses and failure codes

Statuses: `pending`, `requires_action`, `authorized`, `processing`,
`succeeded`, `failed`, `canceled`, `partially_refunded`, `refunded`,
`disputed`. Store the processor's own string beside it as `providerStatus`.

Failure codes: `payment/declined`, `payment/insufficient-funds`,
`payment/expired-card`, `payment/incorrect-card-number`,
`payment/invalid-expiry`, `payment/invalid-cvc`,
`payment/authentication-required`, `payment/processing-error`,
`payment/provider-unavailable`, `payment/duplicate`, `payment/canceled`,
`payment/payment-method-unavailable`, `payment/currency-not-supported`,
`payment/amount-invalid`. Each carries the provider's raw code and a
`retryable` flag; the raw message never reaches a user.

## Subscription statuses

Stripe-compatible base set, and nothing beyond it without a written reason:
`incomplete`, `incomplete_expired`, `trialing`, `active`, `past_due`,
`canceled`, `unpaid`, `paused`.

## Invoice statuses

`draft → open → (paid | uncollectible | void)`. Finalized invoices are never
hard-deleted and their amounts are never edited in place.

## Provider abstraction

```ts
interface PaymentProviderAdapter {
  readonly provider: string
  readonly capabilities: {
    card: boolean; bankTransfer: boolean; recurring: boolean
    refunds: boolean; partialRefunds: boolean
    webhooks: boolean; tokenization: boolean
  }
  customers?: { create(...): Promise<ProviderCustomer>; update(...): Promise<ProviderCustomer> }
  paymentMethods: { create(...); attach?(...); detach?(...) }
  payments: { create(...); confirm?(...); capture?(...); cancel?(...); retrieve(...) }
  refunds: { create(...) }
  mandates?: { create(...) }
  webhooks?: { verify(...): Promise<ProviderEvent> }
}
```

Provider links live in `billing_provider_references`
(`UNIQUE (provider, external_type, external_id)`, indexed by
`(resource_type, resource_id)`), never as a per-provider column on each table.

## What 876 adds that Stripe does not emphasise

`organizationId` / `sourceAppId` on financial records (a Couriers delivery can
produce a first-class Billing invoice that still remembers where it came from);
a first-class **manual** payment method family for Caribbean operations; the
`PaymentCredential`/Vault split; a provider **capability registry**; an internal
double-entry ledger; and an explicit reconciliation layer
(`pending | matched | mismatch | missing_internal | missing_provider |
manual_review`).

## Sources

Stripe API object references for Customer, Product, Price, Plan (legacy),
Subscription, Subscription Item, Subscription Schedule, Invoice, Invoice Line
Item, Invoice Item, Quote, PaymentMethod, SetupIntent, Mandate, PaymentIntent,
Charge, Refund, Dispute, Coupon, Promotion Code, Tax Rate, Credit Note, Customer
Balance Transaction, Billing Meter, Meter Event, Credit Grant, Active
Entitlement, Payment Link, Checkout Session — `https://docs.stripe.com/api`.

WorkOS Vault — `https://workos.com/docs/vault`, BYOK PCI example
`https://workos.com/docs/vault/byok`, PCI DSS SAQ-D attestation announced
December 2025.

PCI SSC on card verification codes: may not be retained after authorization,
even encrypted — `https://www.pcisecuritystandards.org/faqs/1280/`.
