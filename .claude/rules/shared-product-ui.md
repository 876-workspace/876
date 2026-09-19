# Shared Product UI Surfaces

Read this before building a product screen that more than one 876 surface will render — a CRM customer record shown in both 876 CRM and Console, a Work task list shown in CRM and another app, or an invoice document shown in Invoice and Billing.

Companion to `app-structure.md`, `access-tiers.md`, `sdk-conventions.md`, and `app-layout.md`.

## The rule

> **A product screen that more than one host renders is defined once in a `@876/<product>-ui` package. Hosts adapt it; they never re-implement it.**

```text
packages/ui         design-system primitives — no domain knowledge
packages/<p>-ui     one product's screens — no host knowledge
apps/<host>         routing, data, authorization, mutations, host chrome
```

Existing packages include `@876/crm-ui`, `@876/work-ui`, `@876/access-ui`, and `@876/billing-ui`. A domain with one host stays app-local until a second host needs the same product surface.

## Product UI owns presentation, hosts own authority and transport

A `<product>-ui` package owns presentation and product composition: record chrome, tab sets, list/detail composition, domain forms, empty/loading states, and display of typed product objects.

It must not own or import:

- routing assumptions — hosts pass href/base-href builders;
- data loading — no `$876`, no session/service/operator client, no raw `fetch`;
- authorization/session resolution;
- host API route calls;
- another host's app code.

It may depend on `@876/ui`, `@876/core`, and its own product contract package for types (`@876/crm`, `@876/work`, etc.).

Host-only affordances are explicit props, never branches on a host name.

## Host data loading

The host loads product data through its **app-local bounded client** at the correct caller principal and passes plain data/actions into shared UI.

Examples:

```ts
// Console host
import { crm } from '@/lib/clients/crm'
const result = await crm.requests.retrieve(organizationId, requestId)

// standalone product session host
const crm = await getCrm()
const result = await crm.requests.retrieve(organizationId, requestId)
```

Do not route shared UI through a global `$876` facade. `$876` is the Account root; CRM/Work/etc. remain explicit bounded roots.

The shared package must not care whether the host used `session`, `service`, or `operator`; the host resolves that authority before rendering.

## Browser mutations

Interactive shared UI receives callbacks. The host callback uses its own typed browser client to call the host's same-origin `/api/...` route. The shared package never knows the internal service URL or server credential.

The host route authorizes and invokes the owning bounded service client. Business logic remains in the owning API/service.

## Shared transpilation list

Shared product UI packages ship raw TS/TSX, so all Next.js apps consume the central shared list:

```ts
import { sharedTranspilePackages } from '../../scripts/shared-ui-packages.mjs'

const nextConfig: NextConfig = {
  transpilePackages: sharedTranspilePackages(['@876/account', '@876/core']),
}
```

Only app-specific **non-UI** workspace packages belong in that local argument. The product-UI package list itself lives in `scripts/shared-ui-packages.mjs`. `pnpm check:transpile` enforces the shared list.

## Compatibility delegates for UI moves

When a React surface moves out of generic `@876/ui` into `@876/<product>-ui`, an existing `@876/ui/<name>` entrypoint may remain as a one-line compatibility re-export where the shared-product-UI migration explicitly requires it. That compatibility policy is specific to UI package moves and does **not** authorize compatibility aliases for the retired global service-client facade.

There must still be exactly one React implementation.

## Adding a host to an existing product surface

1. Add `@876/<product>-ui` to the host.
2. Write a thin host adapter in the approved `features/<domain>/components` location.
3. Load data through the host's app-local bounded client (`crm`, `work`, etc.) at the correct principal.
4. Pass plain props, hrefs, and callbacks into shared UI.
5. Authorize in host guards/route handlers, never in the product UI package.
6. If a legitimate variation is missing, add a typed prop rather than forking the product component.

## Console host invariant

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

A new product app reuses existing shared product surfaces rather than copying them. Build new one-host screens app-locally first and promote them into a `<product>-ui` package only when another host needs them.

The app declares only the bounded service packages it actually uses; shared UI does not imply access to every backend service.

## Do not

- do not copy a product screen into a second host;
- do not put routes, data calls, sessions, credentials, or permission checks in `<product>-ui`;
- do not import a bounded server client from `<product>-ui`;
- do not branch on the host name inside shared components;
- do not import `apps/` from `packages/`;
- do not hand-copy the shared UI transpile list into each app;
- do not use the old `$876` mega-facade as the host data source;
- do not confuse UI compatibility delegates with permission to retain service-client compatibility facades.
