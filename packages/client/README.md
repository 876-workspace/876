# @876/client

The unified JavaScript client for 876 applications. Feature transports remain
in their owning packages, while application code branches from one `$876`
root.

```ts
import { create876Client } from '@876/client'

const $876 = create876Client({
  baseUrl: '/api',
  billing: { baseUrl: '/api/billing' },
})

const { data, error } = await $876.auth.login({
  identifier: 'user@example.com',
  password: 'example-password',
})
```

Product servers use the guarded server entry point:

```ts
import 'server-only'
import { create876ServerClient } from '@876/client/server'

export const $876 = create876ServerClient({
  apiKey: process.env.API_876_KEY,
  storage: { internalKey: process.env.STORAGE_INTERNAL_KEY },
  widgets: {
    baseUrl: process.env.WIDGETS_API_URL,
    serviceKey: process.env.WIDGETS_SERVICE_KEY,
  },
})

await $876.storage.uploads.create(params)
await $876.widgets.notes.list({ userId })
```

Product applications compose additional product namespaces under their local `$876` root. For example, the Couriers app adds `couriers` inside `apps/couriers/src/lib/876/index.ts`:

```ts
import 'server-only'
import { create876ServerClient } from '@876/client/server'
import { create876CouriersAdminClient } from '@876/couriers/admin'

function createCouriers876Client(requestId?: string) {
  const ecosystem = create876ServerClient({
    apiKey: process.env.API_876_KEY,
    requestId /* ... */,
  })
  return {
    ...ecosystem,
    couriers: create876CouriersAdminClient({
      baseUrl: process.env.COURIERS_API_URL,
      apiKey: process.env.COURIERS_API_KEY,
      internalKey: process.env.API_INTERNAL_KEY,
      requestId,
    }),
  }
}

export const $876 = createCouriers876Client()
```

`@876/client` itself does not import `@876/couriers` — the Couriers namespace is composed locally so only the Couriers app has `$876.couriers` and other apps do not. The `$` prefix is reserved for the `$876` ecosystem root; do not create `$couriers`, `$billing`, etc. as separate application roots.

Privileged platform administration remains isolated in `@876/admin` and is
available only to Console.

Both factories expose resource-first operations:

```ts
await $876.organizations.retrieve(organizationId)
await $876.memberships.list({ status: 'active' })
```

The factory determines privilege. An admin client can expose
`$876.users.create(...)`; the ordinary client cannot.
