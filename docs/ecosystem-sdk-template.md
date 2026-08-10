# Future Product SDK Template

This template follows the 876 ecosystem architecture: one `$876` root, explicit composition, standard verbs, bounded contexts.

## Package shape

```
packages/<product>/
  src/
    client/
    admin/
    integration/
    resources/
    types/
    runtime.ts
    request.ts
```

Only create tiers that the backing API actually supports. Do not create empty tiers for symmetry.

## Client composition

Application composes only what it needs:

```ts
// apps/<product>/src/lib/876/index.ts
import { create876AdminClient } from '@876/admin'
import { create876StorageClient } from '@876/storage'
import { create876BillingAdminClient } from '@876/billing/admin'
import { create876CouriersAdminClient } from '@876/couriers/admin'

export function createProduct876Client(requestId?: string) {
  const platform = create876AdminClient({ internalKey: process.env.API_INTERNAL_KEY, requestId })
  return {
    ...platform,
    billing: create876BillingAdminClient({ internalKey: process.env.BILLING_INTERNAL_KEY, requestId }),
    storage: create876StorageClient({ internalKey: process.env.STORAGE_INTERNAL_KEY, requestId }),
    couriers: create876CouriersAdminClient({ baseUrl: process.env.COURIERS_API_URL, internalKey: process.env.COURIERS_INTERNAL_KEY, requestId }),
  }
}
```

Console control plane composes privileged tiers similarly in `apps/console/src/lib/876/index.ts`.

## Resource verbs

Public resources use only `create`, `retrieve`, `list`, `search`, `update`, `delete` (subset). Alternate keys via typed `retrieve({id}|{slug}|{organizationId})`, filters via `list({organizationId, status})`.

Internal service/repository/provider functions may use specialized names.

## Ownership

- `service.*` owns local DB only (`src/lib/service`).
- `$876.<product>.*` owns cross-service orchestration behind product API via `providers/`.
- Repositories never call remote APIs.

## Request attribution

Pass `requestId` through every client factory for tracing.

See `.agents/rules/sdk-conventions.md` for full vocabulary and composition rules.
