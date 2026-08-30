# SDK & Client Conventions

876 uses bounded-context clients, not a global product mega-facade.

Canonical roots are `$876` for the 876 Account, `workspace` for organization/workspace capabilities, `platform` for genuinely global operator capabilities, and explicit product roots such as `crm`, `work`, `billing`, `couriers`, `storage`, and `widgets`.

Never introduce `$876.crm.*`, `$876.billing.*`, or another global object/package that statically aggregates every product.

All public clients use `<domain>.<resource>.<verb>()`. CRUD vocabulary is `create`, `retrieve`, `list`, `search`, `update`, `delete`; expose only supported verbs and do not use `upsert` or ordinary CRUD synonyms.

Product packages build on `@876/core` and own only their bounded context. Cross-service business workflows belong behind the API that owns the operation, not in React/Next call sites or public SDK aggregation.

Access entrypoints are `session` (signed-in human), `service` (first-party 876 app/service), `operator` (876 administration), and `integration` (external third party), only where the backing API supports them.

Each Next.js host owns small server-only `src/lib/services/<domain>.ts` composition modules and imports the explicit client it needs. Request-bound bearer clients are request-scoped; static server credentials may use module singletons.

Browser code talks only to the host's same-origin API/BFF. Server Components call host-owned typed server clients directly and do not HTTP-loop through their own `/api`. No server actions.

`@876/<product>-ui` packages are transport-free presentation packages. Hosts load through bounded clients and pass data/actions as props.

`@876/client`, generic `@876/sdk`, and generic `@876/admin` are legacy migration surfaces. Do not add new production call sites or compatibility aliases; migrate responsibilities to `@876/account`, `@876/workspace`, `@876/platform`, or the owning product package and remove the legacy packages when consumers reach zero.
