# Brief: Map the couriers app's customer/consumer-account model and import work

## Why

We are designing the platform-standard customer architecture (org customers,
optional 876 consumer-account linkage, per-app profiles like mailbox numbers,
entitlement-gated PII like TRN). The couriers app (`apps/couriers`) is the app
whose domain most stresses this design (consumers sign up themselves, get a
mailbox number per courier org, TRN needed for imports). We need an exact map of
what it already has, including any customer-import work.

## Questions to answer (with file:line citations for every claim)

1. **Prisma schema** (`apps/couriers/prisma/schema.prisma`): every model relevant
   to customers/consumers — `CustomerProfile`(?), `Mailbox`(?), `Tenant`,
   `Warehouse`, `Package` — with all fields. Which fields reference core 876 IDs
   (user_id, org_id) and are they opaque strings (no FK)?
2. **Service layer** (`apps/couriers/src/lib/service/customer-profiles/`,
   `mailboxes/`, `tenants/`): every verb exposed, its signature, and what it does.
   Does anything create/link 876 consumer accounts?
3. **Any customer import feature** in couriers (search for "import" across
   `apps/couriers/src`): pages, routes, services, parsing. Say "not found" if
   absent.
4. **Auth/realm**: how do consumer users authenticate into couriers (realm
   headers, guards in `src/lib/auth/`)? Is there a consumer-facing surface today
   or only org-member surfaces? How does a consumer get associated with a tenant
   (the "request access to a courier org" flow, if any)?
5. **TRN or tax-ID handling**: does the couriers schema or UI reference TRN /
   tax registration anywhere? Where is it stored?
6. **Tenant↔core-org mapping**: how does a couriers tenant map to a core 876
   organization (field names, provisioning flow)?

## Scope

In: `apps/couriers` only (plus quick references into `packages/core/platform` if
couriers calls it). Out: billing, console, API internals.

## Return shape

Organized findings per question with exact model/field lists and signatures,
file:line for every claim, explicit "not found" for anything absent. Search
exhaustively — check every service directory listed above.
