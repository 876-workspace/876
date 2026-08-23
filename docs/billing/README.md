# 876 Billing — the financial data plane

876 runs its own subscription, invoicing, and collection engine. Stripe is not
available in Jamaica or most of the Caribbean, so the platform integrates local
acquirers, bank transfers, and manual payments through adapters — while
mirroring Stripe's _object model_, because it is the most mature one in the
industry and it makes both Console and any future integration legible.

| Document                                                 | What it is                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| `.claude/rules/billing-data-plane.md`                    | **Normative.** Read before touching anything money-adjacent. |
| [`stripe-object-mapping.md`](./stripe-object-mapping.md) | Object-by-object mapping, ID prefixes, field catalogues.     |
| [`payment-instruments.md`](./payment-instruments.md)     | How a payment method is created, sealed, and charged.        |

## Where things live

- **`apps/api`** — identity, and the org→app entitlement `subscriptions` table
  with its `billing_accounts`, `products`, and `prices`.
- **`apps/billing-api`** — the money: customers, catalog, subscriptions,
  invoices, payments, payment methods and their credentials, refunds, credits,
  tax, and the ledger.
- **`apps/console`** — the admin surface over both, composed at the UI layer.
- **`apps/billing`** — the organization-facing finance app.

Cross-boundary references are opaque ids with no cross-database foreign key.

## Deliberately parked

The subscription engine carries features that are ahead of where the platform
actually is. Every organization is currently on a free plan and **no money is
collected**, so a feature that can only act on real money must not act at all.

These stay in the tree, stay compiling, stay tested, and stay **off** behind an
explicit setting that defaults to disabled:

| Parked                               | Setting                     | Why                                                       |
| ------------------------------------ | --------------------------- | --------------------------------------------------------- |
| Late fees and their assessment sweep | `BILLING_LATE_FEES_ENABLED` | Nothing is overdue when nothing is charged.               |
| Dunning beyond a simple retry        | `BILLING_DUNNING_ENABLED`   | No processor is wired, so there is nothing to retry into. |
| Payout / settlement reconciliation   | `BILLING_PAYOUTS_ENABLED`   | No settlement exists yet.                                 |
| Revenue recognition                  | —                           | Depends on real recognised revenue.                       |

Parking is a setting and a written decision, never a half-deleted code path.
Configuration UI for a parked feature may remain visible — an operator setting a
late-fee policy that will apply later is fine; a sweep that charges someone is
not.

## The remodel, in order

1. **Sealing** — shared secure-field providers, WorkOS Vault, per-tenant key
   context. _Done._
2. **The instrument plane** — payment methods, credentials, setup intents,
   mandates, payment intents, disputes, provider references. _In progress._
3. **Price authoring** — the full Stripe price model writable from Console:
   tiered, metered, trials, tax behavior. _In progress._
4. **Client surface** — `$876.paymentMethods.*` / `$876.paymentIntents.*` and
   the Console billing panel on a subscription.
5. **Parking** — the settings that switch off late fees, dunning, and payouts.
6. **Later** — meters and meter events, credit grants, checkout sessions,
   payment links, reconciliation runs, and the first real processor adapter.
