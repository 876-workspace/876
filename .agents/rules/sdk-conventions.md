# SDK & Client Conventions

Read this before adding or changing any 876 client, service SDK method, app-local service composition, or data-access call site.

## Platform model

876 is one account and identity system with multiple bounded products and services. Core owns account and shared workspace/platform concerns; CRM, Work, Billing, Couriers, Storage, Widgets, and future products own their own domains.

The JavaScript architecture mirrors that ownership. **876 does not expose one global product mega-facade.**

Canonical application-facing roots are:

```ts
$876.users.me.retrieve()
workspace.memberships.list(...)
platform.users.list(...)

crm.requests.list(...)
work.tasks.list(...)
billing.invoices.list(...)
couriers.packages.list(...)
storage.files.retrieve(...)
widgets.notes.list(...)
```

`$876` is reserved for the **876 Account client**. It is not a container for every product SDK, and product roots must not be nested below it (`$876.crm`, `$876.billing`, etc. are forbidden).

## Bounded packages

The primary ownership packages are:

- `@876/account` — account/self identity and auth vocabulary;
- `@876/workspace` — organization/workspace capabilities;
- `@876/platform` — genuinely platform-wide operator capabilities;
- `@876/crm` — CRM domain;
- `@876/work` — productivity domain;
- `@876/billing` — Billing domain;
- `@876/couriers` — Couriers domain;
- `@876/storage` — Storage domain;
- `@876/widgets` — Widgets domain;
- `@876/core` — shared transport/runtime/errors/ids/types that are truly cross-domain.

A product package may build on `@876/core`; it must not become a convenience aggregator for unrelated product SDKs. If the CRM API internally needs Storage or Work, that dependency belongs in the CRM backend service layer, not in the public `@876/crm` client package.

Do not introduce a replacement global package such as `@876/services`, `@876/platform-client`, or another object that statically depends on every product SDK.

## Client grammar

All bounded clients use the same developer grammar:

```text
<domain>.<resource>.<verb>()
```

Public CRUD verbs are deliberately small:

- `create`
- `retrieve`
- `list`
- `search`
- `update`
- `delete`

Expose only the subset the backend actually supports. `upsert` is forbidden. Alternate-key retrieval uses a typed `retrieve()` lookup object rather than `retrieveBy*`. Do not add ordinary public CRUD synonyms such as `get`, `find`, `fetch`, or `load`.

Domain-specific non-CRUD operations may exist when they represent a real capability, but do not leak repository/provider implementation verbs into the public client.

Resource namespaces are plural (`users`, `requests`, `tasks`, `invoices`, `packages`, `files`). Resource names only need to be unique **inside their bounded context**. `billing.customers` and `couriers.customers` may both exist; the domain root provides the meaning.

## Account, Workspace, and Platform are different scopes

Do not collapse these into one `users`/`organizations` namespace.

```ts
$876.users.me.retrieve()       // the signed-in 876 Account
workspace.members.list(...)    // members of one organization/workspace
platform.users.list(...)       // 876 operator administering users globally
```

Likewise, organization configuration belongs under `workspace`, while globally privileged registries/operations belong under `platform`.

## Access entrypoints

A bounded package exposes the caller principals it actually supports:

- `session` — signed-in human/user-delegated authority;
- `service` — first-party 876 application/service calling another 876 service;
- `operator` — privileged 876 platform administration;
- `integration` — externally connected third-party system.

Examples:

```ts
import { create876CrmOperatorClient } from '@876/crm/operator'
import { create876BillingServiceClient } from '@876/billing/service'
import { create876WorkSessionClient } from '@876/work/session'
```

Do not create an entrypoint merely for symmetry when the backing API has no such authority boundary. Do not claim a new package name has strengthened authorization if it still maps to an existing route/credential; package naming communicates caller intent while the service guard remains the enforcement boundary.

See `access-tiers.md` for the complete principal rules.

## Host-owned composition

Each application explicitly declares the bounded clients it uses through small server-only modules under its approved `src/lib/` structure, normally `src/lib/services/<domain>.ts`.

Examples:

```ts
import { crm } from '@/lib/services/crm'
import { workspace } from '@/lib/services/workspace'
```

The composition root is **app-local**. It may construct several independent clients, but it must not merge their resources into a new all-services object.

A future product should be addable by adding its package dependency and one host-local service module. Adding a product must not require editing a central `create876ServerClient({ app: ... })` switch or a global resource-ownership manifest.

## Client lifecycle

Use a module singleton when credentials are process/static-safe, for example a server-only operator/service client with a static internal credential.

Use a request-scoped factory when authority belongs to the request, for example a session bearer token or active organization context.

Never put a request-bound bearer token in a module singleton. Never use a lazy `Proxy` to hide an unsafe lifecycle. Feature/page code imports the host composition module rather than constructing SDK clients arbitrarily.

## Browser and BFF boundary

The browser does not import internal service clients or know service origins/credentials. Client components call the host application's typed browser transport, which targets same-origin product URLs such as `/api/requests` or `/api/invoices`.

A route handler authorizes and then invokes the correct bounded server client. It does not become the owner of domain business logic.

Server Components do **not** HTTP-loop through their own `/api` routes. They call the same host-owned server service/client modules directly.

No server actions. Browser-triggered mutations use route handlers plus typed browser clients.

## Cross-service workflows

`create()` describes a domain operation, not a database insert. Cross-service side effects belong behind the backend API that owns the business operation. A page may independently read several domains for display; that is not the same as implementing a distributed business transaction in the host.

## Shared product UI

`@876/<product>-ui` packages own reusable presentation, not transport. They receive plain typed data, callbacks, href builders, and resolved capability information from their host. They never import a session/service/operator SDK, host auth module, or service URL.

The host loads data through its bounded app-local clients and passes props into shared product UI.

## App-local datastores

An application-owned Prisma datastore remains separate from remote 876 service clients. The approved two-layer pattern remains: request-safe database runtime in `src/lib/db`, then `service.<resource>.<verb>()` in `src/lib/service`, which is the only layer allowed to query that app database.

## Adding a product/resource

1. Put business logic and persistence in the owning API/service.
2. Add the route(s) with the legitimate caller guard(s).
3. Add the typed method to the owning bounded SDK entrypoint(s).
4. Add only that package to hosts that actually use it.
5. Add/adjust the host's server composition module.
6. Keep browser calls behind the host's same-origin route handlers.
7. Reuse product UI packages across hosts when appropriate.

## Migration policy

`@876/client`, generic `@876/sdk`, and generic `@876/admin` are legacy migration surfaces. Do not add new production call sites to them. Move existing responsibilities to bounded packages and remove the legacy packages once no production consumers remain. Do not add compatibility aliases for migrated product resources.
