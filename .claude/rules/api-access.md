# API Access Rules

Read this file before writing or modifying data access in `apps/876` or `apps/console`.

## Core Rule

**Next.js feature code talks through the host's bounded server clients and product-owned API surface. Backend/service topology is not a browser contract.**

- Do not access databases or external providers from Next.js feature code.
- Do not call dedicated service origins directly from browser code.
- Do not construct package clients in pages, feature components, or route
  handlers. Import the host-owned domain module under `src/lib/clients/`.
- Client-initiated mutations use thin route handlers under the application's own `/api/<resource>` vocabulary. Do not use Server Actions for backend mutations.
- Route handlers authorize and adapt transport only. Business/domain logic remains in the owning backend service.
- Browser components call the typed app client under `src/lib/client`; they do not know service URLs, internal keys, integration paths, or backend API versions.

Protocol adapters such as auth callbacks/bridges and Uploadthing may keep protocol-specific routes when the protocol itself requires them. They still must not absorb domain business logic.

## Consumer app (`apps/876`)

Server-side Account data goes through the app's Account module. `$876` names
the Account client surface; Workspace and product data use their own bounded
roots. Browser auth/data operations use the approved typed clients and
same-origin bridge routes where required.

```ts
import { getAccount } from '@/lib/clients/account'

const account = getAccount()
const result = await account.apps.retrieve(appId)
```

Do not bypass the core API with direct provider or database access from the Next.js application.

## Console (`apps/console`)

Console is intentionally broader than a normal product app. Its server boundary spans the services Console administrates.

**The canonical composition points are the eight explicit modules in
`apps/console/src/lib/clients/`.** They export `billing`, `couriers`, `crm`,
`platform`, `storage`, `widgets`, `work`, and `workspace` operator roots.
Feature code imports only the root it needs.

```ts
import { platform } from '@/lib/clients/platform'
import { billing } from '@/lib/clients/billing'

const user = await platform.users.retrieve({ id: userId })
const plan = await billing.plans.create(params)
```

When request metadata must be propagated, use that domain module's named
factory, such as `createCrm(requestId)`, inside the thin route adapter. Do not
compose unrelated roots around the request ID.

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

The internal handler may still call Billing, Storage, Widgets, Couriers, or the platform API through the approved Console server boundary.

Shared browser packages may expose host-route configuration when the same UI runs in several products. The host application owns the final same-origin URL. Package defaults must not force Console to reveal a service namespace.

## Client-initiated mutations

1. Add or reuse the canonical backend capability in the service that owns the domain.
2. Expose that capability through the package entrypoint for the caller's
   authority and the host's matching domain module.
3. Add a thin, permission-checked app route under the product-owned resource path.
4. Call the route from the typed browser client.
5. Add boundary/authorization regression coverage.

For Console, a typical route is:

```ts
export async function POST(request: NextRequest) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const crm = createCrm(requestId)
  // Parse transport input, write the required audit event, call one CRM operation.
}
```

Keep route handlers free of database queries, provider SDKs, and duplicated domain rules.

## Authentication Boundary

- Server-side guards (`requireSession`, `requireConsoleAccount`, `requireConsolePermission`, etc.) are authoritative.
- Client state is display state, never an authorization boundary.
- Service credentials/internal keys remain server-only inside the host's
  approved domain modules.
- Never expose internal keys or service base URLs through `NEXT_PUBLIC_*` merely to let browser code call a backend directly.

## Adding a New Cross-Service Console Capability

1. Add/verify the canonical operation in the owning backend.
2. Add the typed operation to the owning package's `operator` entrypoint.
3. Add or update only the matching Console module under `src/lib/clients/`.
4. Choose a Console resource URL based on what the administrator is acting on, not which service receives the request.
5. Add the thin route and typed browser call only when client-side interaction is needed.
6. Add tests proving permissions, canonical envelopes, and the absence of a leaked service namespace.

See `product-api-boundary.md` and `sdk-conventions.md` for the broader bounded-client conventions.
