# `@876/communications`

Typed client and wire contracts for the 876 Communications service.

## Entrypoints

| Import | Caller | Credential |
| --- | --- | --- |
| `@876/communications` | base server client | supplied by caller |
| `@876/communications/service` | first-party 876 app/backend | Communications internal service key |
| `@876/communications/operator` | 876 itself, via Console | Communications internal service key |
| `@876/communications/contracts` | types and Zod schemas only | none |

`operator` records caller intent so Console's imports state the authority they
exercise. It does **not** currently carry a distinct credential class: the service
exposes one internal-key tier, so `operator` and `service` build the same client,
as `@876/storage`'s equivalents do. Do not describe them as separate key classes
or separate routes until the backend enforces that.

There is intentionally no `session` entrypoint. A signed-in user reaches
Communications through its host app's own route handler, which authorizes the
session and then calls `service` server-side — the host route is the session
boundary (`app-api-routing.md`). Adding a `session` client without matching
backend authorization would misrepresent caller authority.

## Usage

```ts
import { create876CommunicationsServiceClient } from '@876/communications/service'

const communications = create876CommunicationsServiceClient({
  baseUrl: process.env.COMMUNICATIONS_API_URL,
  internalKey: process.env.COMMUNICATIONS_INTERNAL_KEY,
})

const result = await communications.deliveries.create(organizationId, {
  senderId: 'esnd_...',
  to: [{ email: 'customer@example.com' }],
  subject: 'Invoice INV-0042',
  html: '<p>Your invoice is ready.</p>',
  resourceType: 'invoice',
  resourceId: 'inv_...',
  idempotencyKey: 'invoice:inv_...:send:1',
})
```

## Conventions

- Resources are plural: `domains`, `senders`, `templates`, `deliveries`.
- CRUD verbs follow the platform vocabulary; domain `verify`/`refresh` and
  template `render` are explicit workflow verbs.
- Every request returns `{ data, error }`; expected service failures are values.
- Timestamps are Unix seconds as `number`.
- The client does not default to localhost. A missing base URL or internal key
  returns `communications/not-configured` before making a network request.
- Resend credentials and provider-specific objects never cross this package
  boundary.
