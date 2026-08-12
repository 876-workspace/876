# @876/client — Unified 876 Object Model

One `$876` for the entire ecosystem. Application code describes business objects, not service topology.

```ts
import { create876Client } from '@876/client'

export const $876 = create876Client({
  app: 'enterprise',
  apiKey: process.env.API_876_KEY,
})

await $876.auth.login({ identifier: 'user@example.com', password: '...' })

await $876.users.me.retrieve()
await $876.organizations.retrieve({ id: orgId })
await $876.apps.list()

await $876.customers.create({ name: 'John Brown', email: 'john@example.com' })
await $876.invoices.create({ customerId, currency: 'JMD', lines: [] })
await $876.invoices.finalize(invoiceId)
await $876.payments.create({ customerId, amount: 1000 })

await $876.packages.create({ customerId, weight: 10.5, weightUnit: 'kg', branchId })
await $876.packages.list()
await $876.branches.list()
await $876.warehouses.list()

await $876.files.retrieve(fileId, { sourceAppId: '876-couriers', actorUserId })
await $876.notes.list({ userId })
```

Product servers use the guarded server entry:

```ts
import 'server-only'
import { create876ServerClient } from '@876/client/server'

export const $876 = create876ServerClient({
  app: 'couriers',
  apiKey: process.env.API_876_KEY,
  services: {
    billing: { baseUrl: process.env.BILLING_API_URL, apiKey: process.env.API_876_KEY },
    couriers: { baseUrl: process.env.COURIERS_API_URL, apiKey: process.env.COURIERS_API_KEY, internalKey: process.env.COURIERS_INTERNAL_KEY },
    storage: { internalKey: process.env.STORAGE_INTERNAL_KEY },
    widgets: { baseUrl: process.env.WIDGETS_API_URL, serviceKey: process.env.WIDGETS_SERVICE_KEY },
  },
})

await $876.customers.create({ name: 'John', email: 'john@example.com' })
await $876.packages.create({ customerId, weight: 8.5, weightUnit: 'kg', branchId })

// Console (platform-wide)
export const $876 = create876ServerClient({
  app: 'console',
  apiKey: process.env.API_876_KEY,
  internalKey: process.env.API_INTERNAL_KEY,
  services: {
    billing: { baseUrl: process.env.BILLING_API_URL, internalKey: process.env.BILLING_INTERNAL_KEY },
    couriers: { baseUrl: process.env.COURIERS_API_URL, internalKey: process.env.COURIERS_INTERNAL_KEY },
    storage: { internalKey: process.env.STORAGE_INTERNAL_KEY },
    widgets: { baseUrl: process.env.WIDGETS_API_URL, serviceKey: process.env.WIDGETS_SERVICE_KEY },
  },
})

await $876.users.admin.list()
await $876.apps.admin.list()
await $876.customers.admin.list()
await $876.packages.admin.list({ tenantId })
```

**Rules:**

- `$876.<resource>.<verb>()` — resources are plural (`users`, `customers`, `packages`, `invoices`, `payments`, `files`, `notes`).
- Normal operations are root (`$876.apps.list()`); platform-wide admin is `.admin` (`$876.apps.admin.list()`).
- Service packages (`@876/sdk`, `@876/admin`, `@876/billing`, `@876/couriers`, `@876/storage`, `@876/widgets`) remain bounded contexts. Only `@876/client` knows the topology.
- `app: 'couriers' | 'billing' | 'console' | 'enterprise' | '876'` is routing metadata, never authorization — backend principal is authority.
- No `$876.billing`, `$876.couriers`, `$876.storage`, `$876.widgets` — those are internal.
- Cross-service workflows live in the owning backend, never in the SDK.

See `docs/platform-object-model.md` for the canonical ontology.
