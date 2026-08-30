# SDK & Client Conventions

Read this before adding or changing a data-access method in `@876/account`,
`@876/workspace`, `@876/platform`, a product SDK, app data-fetching code, or an
app-local datastore service. It defines how bounded clients are named,
authorized, initialized, and extended. The naming vocabulary applies to every
`<resource>.<verb>()` wrapper on the platform.

## Platform model

876 is **one identity that unlocks many product apps.** The Core API owns
identity, accounts, organizations, OAuth, and platform data. Product services
own their bounded domains and expose them through their own SDK packages.

## Bounded roots and caller authority

The root names the bounded context; the import entrypoint names the caller
principal.

| Root        | Package          | Purpose                                                                 |
| ----------- | ---------------- | ----------------------------------------------------------------------- |
| `$876`      | `@876/account`   | 876 Account: auth, current user, sessions, OAuth grants, mobile numbers |
| `workspace` | `@876/workspace` | organization/B2B control plane over the Core API                        |
| `platform`  | `@876/platform`  | 876-wide operator plane over the Core API                               |
| product     | `@876/<product>` | the product's resources, such as CRM requests or Billing invoices       |

`workspace` and `platform` are different vocabulary projections of the same
Core API. The package split is not a deployment boundary.

Product resources use explicit roots:

```ts
crm.requests.list(...)
work.tasks.list(...)
billing.invoices.create(...)
storage.files.retrieve(...)
couriers.packages.list(...)
widgets.notes.list(...)
```

There is no ecosystem aggregator: no `@876/services`, no product resources on
`$876`, and no replacement container under any other name. Each host composes
only the clients it needs under its own `src/lib/services/`.

| Entrypoint    | Principal                              | Typical credential                 |
| ------------- | -------------------------------------- | ---------------------------------- |
| `session`     | a signed-in human                      | access token plus app credential   |
| `service`     | a first-party 876 app or backend       | scoped server credential/app grant |
| `operator`    | 876 administering the platform         | server-only internal credential    |
| `integration` | an externally connected system for org | OAuth/app credential plus scopes   |

Authority lives in the import, for example `@876/workspace/session`,
`@876/crm/service`, or `@876/crm/operator`. Do not add `.admin` to a resource
call chain. The backing service remains the authorization boundary; the
entrypoint makes caller intent visible and limits the typed surface.

The vocabulary is ahead of credential separation in a few packages. Currently
`@876/billing/service`, `@876/couriers/service`, and `@876/work/service` alias
their integration clients. `@876/storage/service` and
`@876/storage/operator` alias the same client. Do not claim that those
entrypoint pairs use distinct key classes or routes until the owning backend
enforces that distinction.

## Package anatomy: bounded runtime + resource modules

- **`@876/core/client`** owns shared transport primitives such as base-URL
  resolution, query/URL building, and JSON transport.
- **Each bounded package owns its credential headers, error shaping, schemas,
  resources, and public authority entrypoints.** Product packages do not
  aggregate unrelated product packages.
- **Resources are factory modules** composed by a client factory. The selected
  authority entrypoint exposes only its supported resources and operations.
- **The API enforces authorization.** Type availability is a guardrail, not an
  authorization bypass.

`@876/sdk` and `@876/admin` are temporary compatibility shims over
`@876/account` and `@876/platform`. Do not add methods to the shims; migrate
callers to the bounded packages. `@876/client` is deleted and must not be
reintroduced.

A product package may build on `@876/core`; it must not become a convenience aggregator for unrelated product SDKs. If the CRM API internally needs Storage or Work, that dependency belongs in the CRM backend service layer, not in the public `@876/crm` client package.

- **Verbs:** Public resource clients use `create`, `retrieve`, `list`, `search`,
  `update`, and `delete`. Expose only the supported subset. Use `delete`, not
  `del`. Do not add `upsert`; use strict `create` / `update`.
- **Alternate-key lookups use a typed `retrieve()` object, not `retrieveBy*`.**
  Use a discriminated lookup such as `tenants.retrieve({ id })` or
  `tenants.retrieve({ organizationId })`. Do not add `retrieveBySlug`,
  `retrieveByWorkosId`, `retrieveByOrgId`, `get*`, `find*`, `fetch*`, or
  `load*`. Specialized workflow verbs may remain inside an owning service or a
  control-plane family when they describe domain intent.
- **`create()` is a domain operation, not a row insert.** Required cross-service
  effects belong behind the owning backend boundary. A browser or BFF does not
  assemble a transaction from several services.
- **Resource namespaces are plural:** `users`, `organizations`, `memberships`,
  `requests`, `invoices`, `files`.
- **No bespoke flat wrappers.** Call `crm.requests.list()` or
  `workspace.organizations.retrieve()` rather than adding `listRequests()` or
  `getOrganization()` helpers.
- **The vocabulary also governs app-local datastore services**, such as
  `service.<resource>.<verb>()`; using Prisma does not exempt a method from it.
- **App-local datastore layering has two layers:** a request-scoped `prisma`
  resolver under `src/lib/db`, and `service.<resource>.<verb>()` under
  `src/lib/service`, the only layer allowed to query Prisma. The service layer
  owns business logic, authorization, validation, and datastore/provider error
  mapping.
- **Cloudflare Prisma clients are request-scoped.** Keep
  `createRequestScopedResolver` and `createQueryGuard`; a Neon WebSocket pool
  cannot be reused across workerd requests.

## Client initialization and lifetime

Each host defines one explicit module per domain under `src/lib/services/` and
imports those roots at call sites. Do not construct SDK clients ad hoc in pages,
components, or route handlers.

Use a module singleton only when its credential and configuration are static
for the runtime, and initialize it lazily on first use. OpenNext imports route
modules at build time, when runtime secrets are unavailable. A static client
module may expose resource getters backed by a private initializer, as
`apps/crm/src/lib/services/crm.ts` does.

Use a request-scoped factory when an access token, active organization, or any
other authority belongs to one request. Resolve the session first and pass its
token into the authority-specific factory, as
`apps/crm/src/lib/services/workspace.ts` does.

Never use a lazy `Proxy` to conceal the wrong lifetime. Never combine unrelated
domains into a convenience aggregator.

- `create`
- `retrieve`
- `list`
- `search`
- `update`
- `delete`

Server Components call the host's bounded server client directly. Mutations
triggered from client components use a thin pure-transport route handler and
the host's typed browser client:

- The route authorizes first; Console calls `requireConsolePermission` before
  any operator client and performs the required audit write.
- The route adapts transport, calls one owning-domain operation, and returns the
  standard envelope. It contains no business logic.
- Browser code uses `client` from `@/lib/client`; it never receives a service
  origin, server credential, integration path, or backend API version.
- No-JS forms may post to the same route-handler boundary.

Do not use Next.js server actions for backend mutations.

Likewise, organization configuration belongs under `workspace`, while globally privileged registries/operations belong under `platform`.

1. Add or reuse the capability in the owning backend service. Implement the
   capability once; expose additional principals with routes, guards, and scope
   checks rather than copying business logic.
2. Add the typed resource method to the owning bounded package at the entrypoint
   for the actual caller principal. Match the standard verb vocabulary and the
   service's response schema.
3. Add or update only the host's domain module under `src/lib/services/`.
4. Call the named bounded root directly. Never raw-fetch the service and never
   register the resource in a cross-product aggregator.

A bounded package exposes the caller principals it actually supports:

Resource schemas and types live with the owning package and category, not
inline in a composition module. Shared transport types may live in
`@876/core`; domain contracts do not move there merely to avoid an import.

## Future product apps and SDKs

- A rich product domain gets its own backend boundary and `@876/<product>` SDK.
- A second host for the same product UI may justify `@876/<product>-ui`; UI
  packages remain presentation-only and never import service clients.
- A new host imports only the account, workspace, platform, and product
  entrypoints it needs. Existing apps and packages require no central registry
  update.
- Native and non-Next.js clients consume the account client plus the relevant
  product clients; identity is not reimplemented per product.

## Do not

- Do not put product resources under `$876`.
- Do not add an ecosystem client, service registry, or replacement aggregator.
- Do not add new methods to compatibility shims.
- Do not hide caller authority behind `.admin` resource segments.
- Do not imply separate credentials or routes where an entrypoint is currently
  only an intent-named alias.
- Do not construct a static-credential client eagerly at module import time or
  a request-owned client outside its request.
- Do not use a lazy `Proxy`.
