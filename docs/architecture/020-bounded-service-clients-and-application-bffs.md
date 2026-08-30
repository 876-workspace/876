# 020 — Bounded Service Clients and Application BFFs

## Status

Accepted. This decision supersedes the application-facing facade rules in
`011-unified-facade-namespace-invariants.md` and the three-principal client model
recorded in `016-console-access-tiers-and-app-api-routing.md`. Historical files
remain useful for understanding how the platform arrived here, but new code
follows this document and the current `.claude/rules/` contract.

## Context

The original `$876` facade gave every 876 application one typed resource plane.
It successfully hid backend URLs and credentials, but it also forced unrelated
bounded contexts into one global vocabulary: CRM requests, Work tasks, Billing
invoices, Storage files, Courier packages, and Core identity all appeared as
siblings on one object. As the product family grew, the facade became a central
registry that every new app and resource had to modify. It also made ordinary
nouns such as `customers`, `packages`, `roles`, and `tasks` globally scarce even
though they have legitimate meanings in more than one product.

The repository already has independently owned SDK packages (`@876/crm`,
`@876/work`, `@876/billing`, `@876/storage`, `@876/couriers`, `@876/widgets`) and
shared product UI packages (`@876/crm-ui`, `@876/work-ui`). The application
client model now follows those same bounded contexts instead of flattening them
back into `@876/client`.

## Decision

### `$876` means the 876 Account

`$876` is retained as the account/identity root, not as an ecosystem mega-client.
It owns signed-in account concerns such as authentication, the current user,
sessions, OAuth grants, and verified mobile numbers.

```ts
$876.auth.login(...)
$876.users.me.retrieve()
$876.sessions.me.list()
$876.oauthGrants.list()
```

Product resources never live under `$876`, either flat or nested.

### Workspace and platform are separate Core API projections

`workspace` is the organization/B2B control plane: organizations, memberships,
member directory, app assignments and roles, modules, features, entitlements,
and provisioning.

`platform` is the 876 operator plane: cross-organization user and organization
administration, API keys, auth attempts, devices, app registry/catalog controls,
and other genuinely platform-wide operations.

The package split does not require splitting the Core Express process or its
database. Package/API vocabulary and deployment boundaries are independent
choices.

### Product SDKs are explicit roots

Application server code imports only the bounded contexts it uses:

```ts
crm.requests.list(...)
work.tasks.list(...)
billing.invoices.create(...)
storage.files.retrieve(...)
couriers.packages.list(...)
widgets.notes.list(...)
```

The common DX is `<domain>.<resource>.<verb>()`, using the standard verbs
`create`, `retrieve`, `list`, `search`, `update`, and `delete`. Resource names
need only be unambiguous inside their owning domain.

There is no replacement `@876/services` package and no `$876.crm.*` container.
Each host owns its composition modules under `src/lib/` and declares only the
SDK packages it actually needs.

## Four caller principals

A client entrypoint says whose authority the call uses.

| Principal | Meaning | Typical credential | Example |
| --- | --- | --- | --- |
| `session` | a signed-in human | session/access token | CRM user → Work |
| `service` | a first-party 876 app/service | scoped server credential/app grant | Invoice → Billing |
| `operator` | 876 itself administering the platform | server-only internal credential | Console → CRM |
| `integration` | an externally connected system | OAuth/app credential + scopes | Google Calendar ↔ Work |

A capability is still implemented once by its owning backend. Multiple tiers
change guards and scope checks, never the business implementation.

Some existing services predate this vocabulary and currently share one internal
route between first-party and operator callers. Their SDK entrypoints are named
for the caller immediately; backend credential/route separation is tightened
only when the owning service has a real distinct authorization contract. We do
not create fake session/service routes that merely rename an internal-key route.

## Console is an operator host, not an integration

Console embeds product surfaces for support and administration, but remains a
first-party 876 operator. A Console CRM screen therefore uses the CRM operator
client and the same CRM domain capability as other tiers. It does not acquire an
organization integration grant and must not gain operator powers through a
public integration contract.

Console still performs its local permission check and required auditing before
calling a product operator client.

## Browser boundary: app-owned BFF

Every Next.js app is a full-stack product from the browser's perspective:

```text
browser -> same-origin /api/<product-resource>
        -> thin route handler (authenticate/authorize/adapt transport)
        -> host-owned bounded client
        -> owning backend service
```

Browser URLs use the host product's vocabulary, not service topology. Service
origins, `/v1`, operator paths, integration paths, and server credentials never
reach browser code. Client components use the host's typed browser transport.
Server Components call the host's server client directly and never HTTP-loop
through their own `/api` routes.

PostHog browser analytics and feature-flag evaluation remain direct provider
connections; they are not 876 domain data and are not proxied through the BFF.

## Cross-service workflows

The UI/BFF may render independent data from several domains, but it must not
implement one business transaction by orchestrating several backend services.
The backend that owns the domain operation coordinates its dependencies.

For example, if attaching a file to a CRM request requires Storage, the public
operation remains a CRM operation. CRM may call the Storage service internally;
the browser does not create a Storage object and then attempt to repair CRM if
the second call fails.

## Shared product UI

`@876/crm-ui`, `@876/work-ui`, and future `@876/<product>-ui` packages remain
presentation/product-composition only. They receive plain data, hrefs, actions,
and callbacks from their host. They never import a service client, read a
session, authorize, mutate through a route, or branch on the host application.

The host may be the standalone product app, Console, Enterprise, or a future
mobile/web surface; domain presentation remains one implementation.

## Client lifetime

Use a module singleton only when its authority/configuration is static and safe
for the runtime. Use a request-scoped factory when an access token, active
organization, or other authority belongs to one request. Never hide lifecycle
mistakes behind a lazy Proxy, and never construct product SDKs ad hoc throughout
page/component code.

## Package direction

Application-facing packages are bounded contexts over shared `@876/core`
transport and primitives. Product SDK packages must not aggregate unrelated
product SDKs. Backend applications may consume another product's `service`
client when implementing an owned cross-service workflow.

The old aggregation packages are removed as their responsibilities move:

- `@876/client` — deleted; hosts compose explicit clients.
- `@876/sdk` — replaced by `@876/account` plus `@876/workspace` session access.
- `@876/admin` — replaced by `@876/platform` and `@876/workspace` operator access.

No compatibility aliases preserve the old flat product facade.

## Adding a future product

A new product supplies its own SDK and backend boundary, for example
`@876/careers` + `apps/careers-api`. If a second host needs the same product UI,
add `@876/careers-ui`. Existing apps are unaffected until they intentionally add
`@876/careers` to their own dependency/composition root. No central app switch
or global resource manifest is updated.

## Consequences

This adds an explicit domain prefix to many calls, but ownership becomes visible
at the call site, resource-name collisions cease to be a platform problem, apps
carry fewer unrelated dependencies, native clients can consume only relevant
SDKs, and backend topology remains hidden where it matters: behind the owning
domain operation and the host's BFF.
