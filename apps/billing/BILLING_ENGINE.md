# 876 Billing Engine

## Core decision

876 Billing is the system of record for catalog, subscriptions, invoices,
accounts receivable, credits, and payments. An external processor only moves
money and reports results; it never decides what a customer owes, when an
invoice is generated, or the commercial state of a subscription.

Stripe, Amber Pay, WiPay, and future processors connect through adapters. Core
models do not contain provider-specific names or lifecycle states.

## Research conclusions

- A subscription is a recurring agreement and billing schedule. An invoice is
  the collectible document generated for a subscription period.
- Finalizing or posting an invoice creates accounts receivable. A draft invoice
  does not increase the customer's open balance.
- An applied payment or credit note reduces receivables. Voiding or writing off
  an invoice removes it from open receivables without deleting history.
- A payment can exist without an invoice. Its unallocated portion is a customer
  advance or overpayment that can be applied later or refunded.
- An opening balance is a dated migration adjustment, not lifetime spending.
- Payment terms determine an invoice due date (`Due on receipt`, `Net 15`,
  `Net 30`, and so on). They do not determine subscription renewal dates; the
  subscription billing-cycle anchor does that.
- Prices remain necessary. A plan describes the offer and entitlements; an
  immutable price versions its money, currency, cadence, and calculation model.
- Gifting a paid plan should use a direct 100% discount with duration and audit
  metadata, not a duplicate plan. A genuinely free offer can use a zero price.
- Invoice lines need service periods so billing, collection, and future revenue
  recognition reports remain separate.
- Schedulers and provider webhooks can deliver duplicate or out-of-order work.
  Billing runs must be idempotent by subscription and period, and provider
  events must be deduplicated by external event ID.
- Invoice preferences resolve from workspace defaults and customer-specific
  defaults when a draft is created. The resolved customer identity, address,
  tax display, notes, and terms are snapshotted so later profile changes do not
  rewrite a historical invoice.
- Late fees are separate invoices backed by immutable assessment evidence. A
  run re-reads the current amount due inside the creation transaction, skips
  exempt customers and previously assessed invoices, and processes at most 500
  eligible invoices so retries remain safe and bounded.

Primary sources:

- [Stripe subscription billing cycles](https://docs.stripe.com/billing/subscriptions/billing-cycle)
- [Stripe subscription invoices](https://docs.stripe.com/billing/invoices/subscription)
- [Stripe partial invoice payments](https://docs.stripe.com/invoicing/partial-payments)
- [Stripe customer credit balances](https://docs.stripe.com/invoicing/customer/balance)
- [Chargebee excess payments](https://www.chargebee.com/docs/payments/2.0/kb/billing/how-to-remove-excess-payments-for-a-customer)
- [Chargebee proration](https://www.chargebee.com/docs/billing/2.0/subscriptions/proration)
- [Zoho Books payment terms](https://www.zoho.com/in/books/help/settings/payment-terms.html)
- [Zoho Books customer opening balances](https://www.zoho.com/uk/books/help/contacts/opening-balances-for-customers.html)
- [Zoho Books invoice preferences](https://www.zoho.com/us/books/help/invoice/invoice-preferences.html)
- [Zoho Books late fees](https://www.zoho.com/us/books/help/invoice/late-fees.html)
- [QuickBooks invoice and accounts-receivable behavior](https://quickbooks.intuit.com/learn-support/en-us/help-article/invoicing/understand-invoices-quickbooks-online/L52ENtVfF_US_en_US)
- [IFRS 15 receivables and contract liabilities](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2024/issued/part-a/ifrs-15-revenue-from-contracts-with-customers.pdf?bypass=on)
- [Amber Pay Jamaica](https://myamberpay.com/)
- [WiPay Caribbean API](https://wipaycaribbean.com/developers/apis)

## Sources of truth and customer balances

Customer totals are projections, not editable balance fields:

```text
lifetime billed   = finalized invoices excluding void invoices
lifetime paid     = successful payments minus refunds
accounts receivable = sum of open invoice balances
available credit  = unapplied payments + unapplied credit notes
net position      = accounts receivable - available credit
```

`outstandingReceivable` and `unusedCredits` remain reconcilable caches for
fast list pages. Invoices, allocations, credit notes, refunds, and subledger
entries are the auditable evidence.

## Invoice lifecycle

```text
DRAFT -> OPEN -> PARTIALLY_PAID -> PAID
             \-> OVERDUE
             \-> UNCOLLECTIBLE
        OPEN/OVERDUE (unsettled) -> VOID
```

- `DRAFT`: editable and has no receivable impact.
- `OPEN`: finalized/posted and increases accounts receivable.
- `SENT`: legacy-compatible open status.
- `PARTIALLY_PAID`: some value is settled but a positive balance remains.
- `OVERDUE`: open after its due date.
- `PAID`: the balance is zero through payment or credit allocations.
- `UNCOLLECTIBLE`: reserved for the explicit write-off workflow.
- `VOID`: canceled while preserving its audit history.

Sending is a communication action recorded with `sentAt`; it is not the only
way to post an invoice.

Invoice header discounts, shipping charges, and signed adjustments participate
in the draft total. Posted amount fields remain locked; an optional workspace
preference permits only non-financial header edits on a sent invoice.

## Late-fee lifecycle

`InvoicePreference` owns the workspace policy: fixed or percentage calculation,
grace days, draft-versus-open generation, and safe disabled defaults. A customer
may be explicitly exempt. Each source invoice can have at most one
`LateFeeAssessment`, which snapshots the source balance, calculation policy,
assessed amount, and generated late-fee invoice. Open late-fee invoices post to
the same customer subledger as other finalized invoices; draft late-fee invoices
remain non-posting until finalized.

## Subscription lifecycle and recurring billing

Each subscription records:

- billing-cycle anchor and next billing time;
- current service period;
- billing in advance or in arrears;
- send-invoice or automatic-collection method;
- payment term;
- proration behavior;
- automatic credit-application policy;
- billed cycle count and an optional plan cycle limit.

A periodic sweep selects `TRIALING` or `ACTIVE` subscriptions whose
`nextBillingAt` is due. For each service period it creates one unique
`SubscriptionBillingRun`, generates and finalizes the invoice, advances the
period, and ends finite subscriptions after their contracted cycle count.
Repeating a delivered job returns the same run instead of creating a duplicate
invoice.

Railway cron, a queue, or another scheduler may trigger the sweep. Recurrence,
catch-up, and idempotency remain owned by 876 Billing.

## Proration

Mid-period changes use UTC seconds:

```text
unused credit  = old price * old quantity * remaining seconds / period seconds
remaining charge = new price * new quantity * remaining seconds / period seconds
net adjustment = remaining charge - unused credit
```

Rounding happens once in minor currency units. The current preview classifies a
positive net as a future invoice adjustment and a negative net as a future
credit-note adjustment. Applying that amendment is phase-five work; it must
snapshot prices, quantities, service period, and policy so the result remains
reproducible.

## Discounts, coupons, and gifts

- `Coupon` defines a percentage or amount, applicable currency, and duration.
- `PromotionCode` is the customer-facing code with limits and expiration.
- `SubscriptionDiscount` is the immutable redemption attached to an agreement.
- Discounts are calculated before tax and snapshotted on invoice lines.
- The schema supports a direct 100% gift snapshot with grant reason, granting
  user, and expiration. Until the direct-grant endpoint is added, the supported
  API path is a 100% coupon/promotion code; neither approach clones the plan.

## Provider-neutral payment integrations

The adapter boundary has four concepts:

1. `PaymentProvider`: presentation and adapter catalog (`amber_pay`, `wipay`,
   `stripe`, or `custom`) with name, logo, and capabilities.
2. `PaymentProviderConnection`: tenant-owned merchant connection, environment,
   account reference, and references to externally stored secrets.
3. `PaymentAttempt`: normalized, idempotent attempt to collect an invoice.
4. `PaymentProviderEvent`: durable webhook/callback inbox deduplicated by
   connection and external event ID before business logic runs.

`PaymentMode` still means cash, card, transfer, and similar rails. It is not the
processor. Manual payments need no provider connection; electronic payments can
reference a connection and external transaction ID.

Full card numbers, CVVs, API keys, and webhook secrets are never stored. A
`credentialsReference` points to an external secret manager.

## Reporting foundation

The customer subledger stores immutable events with currency, amount,
direction, source, effective time, and idempotency key. It supports future:

- customer statements and receivables aging;
- billed, collected, credited, refunded, and written-off totals;
- MRR/ARR from active recurring subscription prices;
- upcoming-invoice forecasts from `nextBillingAt`;
- deferred-revenue schedules from invoice-line service periods;
- reconciliation by provider, bank account, and external reference.

MRR is normalized from active subscription prices, not payments or overdue
invoices. Cash forecasting uses invoices and payment terms; revenue forecasting
uses service periods.

## Delivery phases

1. AR subledger, invoice finalization/voiding, balances, and unapplied payments.
2. Subscription schedule, preview, and idempotent recurring invoice generation.
3. Payment terms, salespeople, coupons, promotion codes, and redeemed discounts.
4. Provider catalog/connections, normalized attempts, and durable events.
5. Subscription amendments, proration, adapter collection, and payment recovery.
6. Full UI, communications, reconciliation, and double-entry general ledger.

The initial engine migration is additive. It does not rename or drop tables,
does not run against a live database automatically, and preserves all existing
IDs and commercial documents.
