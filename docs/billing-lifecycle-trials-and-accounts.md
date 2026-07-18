# Billing Lifecycle: Trials, Runs, Accounts, Items

Commercial subscription lifecycle inside 876 Billing (money plane). Core
entitlement statuses remain separate — see
[plan-and-subscription-model](plan-and-subscription-model.md). Integration
context: [console-billing-integration](plans/console-billing-integration.md).

---

## Subscription statuses (Billing)

`SubscriptionStatus` (`apps/billing/prisma/schema/enums.prisma`):

| Status     | Role                                             |
| ---------- | ------------------------------------------------ |
| `DRAFT`    | Not yet live; `nextBillingAt` null               |
| `TRIALING` | Free trial; billed when `nextBillingAt` due      |
| `ACTIVE`   | Live paid/recurring agreement                    |
| `PAUSED`   | Temporarily suspended; not due for cycle billing |
| `CANCELED` | Terminated                                       |
| `ENDED`    | Terminal after cancel/lifecycle completion       |

Core→Billing status mapping during mirror is documented in
[catalog sync](billing-catalog-sync.md).

---

## Trials (Zoho / Lago style — not Stripe)

### Behavior

On create with `status: 'TRIALING'` (`apps/billing/src/lib/service/subscriptions/create.ts`):

- `trialDays` = max plan `trialDays` across selected prices
- `trialEndsAt = startAt + trialDays * 86400` when `trialDays > 0`
- **Billing anchor shifts to trial end**: `naturalBillingAnchor = trialEndsAt`
- `nextBillingAt` for non-draft/non-paused follows normal in-advance /
  in-arrears rules from that anchor — **first bill at trial end**, not at start
- **No invoice is generated at trial start**

The sweep (`processDueSubscriptions`) selects:

```ts
status: { in: ['TRIALING', 'ACTIVE'] }
nextBillingAt: { lte: asOf }
```

So a trialing subscription is invoiced when its first period becomes due
(typically trial end).

### Explicit comparison: Stripe vs 876 Billing

|                    | Stripe (typical)                                          | 876 Billing                                                                                                   |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| At trial start     | Issues a **$0 invoice** (and often a payment intent)      | **No invoice**                                                                                                |
| First real invoice | After trial, first paid cycle                             | At trial end via sweep (`billSubscription`)                                                                   |
| Why                | Stripe model ties trials to Invoice/PaymentIntent objects | Cleaner ledger: no noise `$0` documents during trial; AR and statements only move when a real cycle is billed |

Deliberate design (D7 in the
[implementation plan](plans/console-billing-integration.md)).

---

## Billing runs

### Mechanics

| Piece        | Detail                                                                          |
| ------------ | ------------------------------------------------------------------------------- |
| Engine entry | `billSubscription` — one idempotent invoice for a due period                    |
| Idempotency  | `SubscriptionBillingRun` unique on `(subscriptionId, periodStart, periodEnd)`   |
| Sweep        | `processDueSubscriptions` / `processAllDueSubscriptions` in `sweep.ts`          |
| Admin HTTP   | `POST /api/v1/admin/billing/run` (`requireInternalService`)                     |
| Core trigger | `trigger_billing_run_once` → same endpoint every `BILLING_RUN_INTERVAL_SECONDS` |

`SubscriptionBillingRun` columns (abbrev.): `periodStart`, `periodEnd`,
`scheduledFor`, `status`, `attemptCount`, `invoiceId`, `isAdvanceBilling`,
errors, timestamps — `apps/billing/prisma/schema/billing-run.prisma`.

Re-running the sweep or admin endpoint is safe: existing run rows short-circuit
duplicate invoices for the same period.

### Core cadence

`apps/api/services/billing_customer_dispatch.py` worker loop:

1. Drain customer outbox
2. If `billing_run_interval_seconds > 0` and interval elapsed since last run →
   `POST {BILLING_URL}/api/v1/admin/billing/run` with `x-internal-key`
3. Sleep `finance_provisioning_poll_seconds`

Default interval: **3600** seconds. Set `BILLING_RUN_INTERVAL_SECONDS=0` to
disable automatic runs (manual admin run still works).

---

## `$0` invoice auto-PAID rule

In `billSubscription` (`bill.ts`) and one-time charge paths (`charges.ts`):

```ts
status: totalAmount === 0n ? 'PAID' : invoiceMode === 'DRAFT' ? 'DRAFT' : 'OPEN'
paidAt: totalAmount === 0n ? asOf : null
```

A computed zero-total cycle invoice is finalized as **PAID** immediately (no
collection step). Non-zero invoices open (or draft) and create ledger /
AR as usual. This covers free plans and pure trial-end $0 edge cases without
manual settlement.

---

## Customer accounts

### Ledger — `CustomerLedgerEntry`

Append-only subledger (`apps/billing/prisma/schema/ledger-entry.prisma`).

| Field            | Notes                                                                           |
| ---------------- | ------------------------------------------------------------------------------- |
| `type`           | `LedgerEntryType`                                                               |
| `direction`      | `DEBIT` \| `CREDIT`                                                             |
| `amount`         | Minor units                                                                     |
| `currency`       | ISO 4217                                                                        |
| `idempotencyKey` | Unique per tenant                                                               |
| Links            | Optional `invoiceId`, `paymentId`, `creditNoteId`, `refundId`, `subscriptionId` |

#### Entry types

| Type                 | Typical direction | Event                          |
| -------------------- | ----------------- | ------------------------------ |
| `INVOICE_FINALIZED`  | DEBIT             | Invoice opens customer balance |
| `INVOICE_VOIDED`     | CREDIT            | Reverse finalized invoice      |
| `PAYMENT_RECEIVED`   | CREDIT            | Cash applied / received        |
| `PAYMENT_REVERSED`   | DEBIT             | Undo payment                   |
| `CREDIT_NOTE_ISSUED` | CREDIT            | Credit available / applied     |
| `CREDIT_NOTE_VOIDED` | DEBIT             | Reverse credit note            |
| `REFUND_ISSUED`      | DEBIT             | Cash returned                  |
| `WRITE_OFF`          | CREDIT            | Write off receivable           |
| `OPENING_BALANCE`    | DEBIT or CREDIT   | Migration / opening AR         |

### AR denormalization

`recomputeCustomerAr` (`apps/billing/src/lib/service/customers/ar.ts`) —
recompute (not delta) inside mutating transactions:

```
outstandingReceivable = Σ amountDue on OPEN | SENT | PARTIALLY_PAID | OVERDUE
unusedCredits         = Σ unapplied SUCCEEDED payments + Σ OPEN credit-note balances
```

### Account / statement view

`service.customers.account` builds `object: 'customer_account'` with lifetime
billed/paid, `outstandingReceivable`, `availableCredit`, `netPosition`, and up
to 100 ledger lines (`object: 'customer_ledger_entry'`). UI:
`apps/billing/src/app/(app)/customers/[customerId]/statement/page.tsx`.

---

## Items — `sourceAppId` filter

Single tenant item pool; optional attribution for multi-product catalog views
(Zoho-style filters, not separate silos).

```http
GET /api/v1/items?sourceAppId=<core_app_id>
```

- Route: `apps/billing/src/app/api/billing/items/route.ts`
- Service: `list(tenantId, isActive?, sourceAppId?)` —
  `apps/billing/src/lib/service/items/list.ts`
- Query validation: non-empty string max 80 chars

Omit `sourceAppId` to list the full tenant pool.
