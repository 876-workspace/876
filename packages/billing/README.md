# @876/billing

Typed clients for the standalone 876 Billing service. Billing owns commercial
customers, catalogue records, invoices, quotes, and subscriptions in its own
datastore; core 876 identity records are referenced only by opaque IDs.

## Tenant client

The root export is safe for browser or server use and calls the versioned,
tenant-scoped API. Today it uses the authenticated 876 Billing session and
exposes the first integration slice needed by product applications:

```ts
import { create876Client } from '@876/billing'

const $billing = create876Client({
  baseUrl: 'https://billing.example.com',
  credentials: 'include',
})

const result = await $billing.invoices.create({
  customerId: 'cus_...',
  currency: 'JMD',
  lines: [{ description: 'Table 12', unitAmount: 850000 }],
})
```

Native/public clients must authenticate through 876 identity. Never embed a
secret service key in a browser, tablet, or mobile application.

## Administration client

The `/admin` export is server-only. Console uses it to project core catalogue
and subscription records into the 876 platform Billing tenant:

```ts
import 'server-only'
import { create876BillingAdminClient } from '@876/billing/admin'

export const $billing = create876BillingAdminClient({
  baseUrl: process.env.BILLING_URL,
  internalKey: process.env.BILLING_INTERNAL_KEY,
})

await $billing.subscriptions.ensure({
  externalReference: 'sub_...',
  sourceAppId: 'rap_...',
  customerId: 'cus_...',
  items: [{ priceEntitlementReferenceId: 'prc_...', quantity: 1 }],
})
```

Every `ensure` operation is idempotent on an opaque core reference. Callers may
replay failed projections, and the Console subscription mirror repairs its
catalogue dependencies before ensuring the agreement.

## API contract

- Canonical base path: `/api/v1`
- Result envelope: `{ data, error }`
- Resources include a literal `object` discriminator
- Money uses integer minor units
- Timestamps use Unix seconds
- OpenAPI document: `GET /api/v1/openapi`

Tenant resources use shallow, resource-first facades such as
`$billing.bankAccounts.*`, `$billing.bankTransactions.*`,
`$billing.paymentModes.*`, and `$billing.payments.*`.
