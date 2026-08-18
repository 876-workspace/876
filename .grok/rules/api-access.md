# API Access Rules

Read this file before writing or modifying data access in `apps/876` or `apps/console`.

## Core Rule

**Next.js feature code talks through the application's approved server facade and product-owned API surface. Backend/service topology is not a browser contract.**

- Do not access databases or external providers from Next.js feature code.
- Do not call dedicated service origins directly from browser code.
- Do not create dedicated service clients in pages, feature components, or route handlers when the application facade already owns that integration.
- Client-initiated mutations use thin route handlers under the application's own `/api/<resource>` vocabulary. Do not use Server Actions for backend mutations.
- Route handlers authorize and adapt transport only. Business/domain logic remains in the owning backend service.
- Browser components call the typed app client under `src/lib/client`; they do not know service URLs, internal keys, integration paths, or backend API versions.

Protocol adapters such as auth callbacks/bridges and Uploadthing may keep protocol-specific routes when the protocol itself requires them. They still must not absorb domain business logic.

## Consumer app (`apps/876`)

Server-side platform data goes through the app's `$876` facade and the canonical 876 API. Browser auth/data operations use the approved typed clients and same-origin bridge routes where required.

```ts
import { $876 } from '@/lib/876'

const result = await $876.apps.retrieve(appId)
```

Do not bypass the core API with direct provider or database access from the Next.js application.

## Console (`apps/console`)

Console is intentionally broader than a normal product app. Its server facade spans the services Console administrates.

**The canonical server boundary is `createConsole876Client()` / `$876` in `apps/console/src/lib/876`.** It may compose the platform admin client plus approved Billing, Couriers, Storage, and Widgets service clients. That fan-out belongs in `src/lib`; feature code consumes the unified Console facade.

```ts
import { $876 } from '@/lib/876'

const users = await $876.users.admin.list()
const billingStats = await $876.billing.stats.apps.list()
const notes = await $876.widgets.admin.notes.list()
```

When request metadata must be propagated, construct the request-scoped facade through `createConsole876Client(requestId)` inside the thin route adapter. Do not construct the underlying Billing/Widgets/etc. client directly in the route.

### Console browser routes

Console browser URLs describe **Console resources**, not the service that owns the data. Examples:

```text
/api/users/:id/image
/api/organizations/:id/customers
/api/billing-accounts
/api/billing-subscriptions
/api/widget-features/:id
/api/notes
/api/note-collections
/api/finance/reconcile
```

Do not introduce service namespaces such as:

```text
/api/billing/*
/api/storage/*
/api/widgets/*
/api/integrations/*
/api/v1/*
```

The internal handler may still call Billing, Storage, Widgets, Couriers, or the platform API through `$876`.

Shared browser packages may expose host-route configuration when the same UI runs in several products. The host application owns the final same-origin URL. Package defaults must not force Console to reveal a service namespace.

## Client-initiated mutations

1. Add or reuse the canonical backend capability in the service that owns the domain.
2. Expose that capability through the app's server facade/package client.
3. Add a thin, permission-checked app route under the product-owned resource path.
4. Call the route from the typed browser client.
5. Add boundary/authorization regression coverage.

For Console, a typical route is:

```ts
export async function POST(request: NextRequest) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const $876 = createConsole876Client(requestId)
  // Parse transport input, call one approved facade operation, return envelope.
}
```

Keep route handlers free of database queries, provider SDKs, and duplicated domain rules.

## Authentication Boundary

- Server-side guards (`requireSession`, `requireConsoleAccount`, `requireConsolePermission`, etc.) are authoritative.
- Client state is display state, never an authorization boundary.
- Service credentials/internal keys remain server-only inside approved facade construction.
- Never expose internal keys or service base URLs through `NEXT_PUBLIC_*` merely to let browser code call a backend directly.

## Adding a New Cross-Service Console Capability

1. Add/verify the canonical operation in the owning backend.
2. Add the typed operation to the appropriate server package/facade tier.
3. Wire it into `createConsole876Client()` if Console does not already expose it.
4. Choose a Console resource URL based on what the administrator is acting on, not which service receives the request.
5. Add the thin route and typed browser call only when client-side interaction is needed.
6. Add tests proving permissions, canonical envelopes, and the absence of a leaked service namespace.

See `product-api-boundary.md` and `sdk-conventions.md` for the broader resource/facade conventions.
