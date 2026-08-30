# Shared Product UI Surfaces

A product screen rendered by more than one host lives once in `@876/<product>-ui`. Hosts adapt it; they do not reimplement it.

`@876/ui` owns generic design primitives. `@876/<product>-ui` owns product presentation/composition. Host apps own routes, session/authorization, bounded service clients, same-origin browser transport, mutations, and host chrome.

Shared product UI never imports `$876`, a session/service/operator SDK, raw `fetch`, host auth, service URLs, or another app. It receives typed data, href builders, callbacks, and resolved affordances as props.

Hosts load through their app-local bounded client at the correct principal:

```ts
import { sharedTranspilePackages } from '../../scripts/shared-ui-packages.mjs'

const nextConfig: NextConfig = {
  transpilePackages: sharedTranspilePackages(['@876/account', '@876/core']),
}
```

Do not load product UI through the retired global `$876` facade; `$876` is Account-only.

Interactive shared UI calls host-supplied callbacks. The host's browser client calls same-origin `/api`, the route authorizes, then invokes the owning bounded server client. Domain business logic stays in the owning API.

All Next.js apps use `sharedTranspilePackages()`; the central shared UI list stays in `scripts/shared-ui-packages.mjs`. App-local arguments contain only additional non-UI workspace packages needed by that host.

Existing one-line `@876/ui` compatibility delegates for product-UI moves may remain when required by the UI migration. That policy does not authorize compatibility facades for `@876/client`/generic SDK/admin.

```ts
export { WorkTaskList, type WorkTaskListProps } from '@876/work-ui/task-list'
```

There is then still exactly one implementation, and no caller has to be updated
in the same change as the move.

## Adding a new host to an existing surface

1. Add the `@876/<product>-ui` dependency to the host's `package.json`.
2. Write a **thin adapter** in `apps/<host>/src/features/<domain>/components/`
   that supplies the host's `baseHref`, its tab subset, and its permitted
   actions.
3. Load the data in the host, through its own bounded service client at its
   caller authority, and pass plain props.
4. Authorize in the host's route guard and route handlers — never in the
   package.
5. If the host needs a variation the package cannot express, **add a prop to
   the package**. Forking the component is the failure mode this rule forbids.

## Creating a new product app

Beyond `.claude/rules/new-app-guide.md`: the new app inherits every shared
surface through `sharedTranspilePackages()` and needs no UI of its own for a
domain that already has a `<product>-ui` package. Build genuinely new screens in
`features/<domain>/` first, and promote them to a package only when a second
host renders them.

## Do not

- Do not copy a product screen into a second host.
- Do not put a route path, a data call, a session read, or a permission check in
  a `<product>-ui` package.
- Do not branch on the host inside a shared component.
- Do not import `apps/` from `packages/`.
- Do not hand-write `transpilePackages` in an app's `next.config.ts`.
- Do not delete a moved `@876/ui` entry point; leave a delegate.
- Do not promote a surface to a package before a second host needs it.
