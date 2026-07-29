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

Privileged platform administration remains isolated in `@876/admin` and is
available only to Console.

Both factories expose resource-first operations:

```ts
await $876.organizations.retrieve(organizationId)
await $876.memberships.list({ status: 'active' })
```

The factory determines privilege. An admin client can expose
`$876.users.create(...)`; the ordinary client cannot.
