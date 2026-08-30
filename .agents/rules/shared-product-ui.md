# Shared Product UI Surfaces

A product screen rendered by more than one host lives once in `@876/<product>-ui`. Hosts adapt it; they do not reimplement it.

`@876/ui` owns generic design primitives. `@876/<product>-ui` owns product presentation/composition. Host apps own routes, session/authorization, bounded service clients, same-origin browser transport, mutations, and host chrome.

Shared product UI never imports `$876`, a session/service/operator SDK, raw `fetch`, host auth, service URLs, or another app. It receives typed data, href builders, callbacks, and resolved affordances as props.

Hosts load through their app-local bounded client at the correct principal:

```ts
import { crm } from '@/lib/services/crm'
const result = await crm.requests.retrieve(orgId, requestId)
```

Do not load product UI through the retired global `$876` facade; `$876` is Account-only.

Interactive shared UI calls host-supplied callbacks. The host's browser client calls same-origin `/api`, the route authorizes, then invokes the owning bounded server client. Domain business logic stays in the owning API.

All Next.js apps use `sharedTranspilePackages()`; the central shared UI list stays in `scripts/shared-ui-packages.mjs`. App-local arguments contain only additional non-UI workspace packages needed by that host.

Existing one-line `@876/ui` compatibility delegates for product-UI moves may remain when required by the UI migration. That policy does not authorize compatibility facades for `@876/client`/generic SDK/admin.

Console retains Console-owned workspace/sidebar chrome around shared product surfaces. Shared UI never owns host shell or host permissions.
