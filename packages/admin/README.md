# @876/admin

The server-only 876 administration client. Console is the sole application
allowed to depend on this package.

```ts
import 'server-only'
import { create876AdminClient } from '@876/admin'

const $876 = create876AdminClient({
  platform: {
    internalKey: process.env.API_INTERNAL_KEY,
    apiKey: process.env.API_876_KEY,
  },
  billing: {
    baseUrl: process.env.BILLING_API_URL,
    internalKey: process.env.BILLING_INTERNAL_KEY,
  },
  widgets: {
    baseUrl: process.env.WIDGETS_API_URL,
    serviceKey: process.env.WIDGETS_SERVICE_KEY,
    host: 'console',
  },
})

const { data, error } = await $876.auth.admin.createUser({
  email: 'user@example.com',
  first_name: 'Yoda',
  last_name: 'Jedi',
})

await $876.billing.subscriptions.ensure(params)
await $876.widgets.admin.notes.list({ userId })
```

User authentication lifecycle operations live under `$876.auth.admin`.
Platform profile, contact, address, feature, and application records remain
under `$876.users` because they are not authentication-provider operations.

Every owned service keeps its implementation in its existing package. This
package only composes those clients under the single branded root; it does not
change their resources, result envelopes, or data types.
