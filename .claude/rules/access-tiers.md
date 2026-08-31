# Access Principals — who is calling, and through what

Read this before one 876 surface reaches data owned by another. The client entrypoint must state **whose authority** is being exercised.

Companion rules: `platform-services.md`, `sdk-conventions.md`, and `app-api-routing.md`.

## The four tiers

| Principal | Caller | Typical credential | Scope |
| --- | --- | --- | --- |
| **session** | signed-in human | session cookie / bearer access token | what that user may do in the active organization |
| **service** | first-party 876 app/service | scoped app/service credential | declared first-party capability, usually organization-scoped |
| **operator** | 876 itself / Console | internal operator credential | privileged platform/product administration |
| **integration** | external third party/provider | OAuth/app integration credential + scopes | granted external connection scope |

| Tier            | Principal                                     | Typical credential                  | Scope                                   | Consent                   |
| --------------- | --------------------------------------------- | ----------------------------------- | --------------------------------------- | ------------------------- |
| **operator**    | 876 itself, acting as platform                | secret internal key, server-only    | every organization, including none      | none required — it is 876 |
| **service**     | a first-party 876 app or backend              | scoped server credential/app grant  | the service contract's granted scope    | first-party trust/grant   |
| **integration** | an externally connected system acting for org | OAuth/app credential + named scopes | exactly one organization, scope-limited | the org granted it        |
| **session**     | one signed-in user                            | session cookie / access token       | what that user may do in that org       | the user is present       |

## Capability implementation rule

> A capability is implemented once by the service that owns it and may be routed at multiple legitimate principals. Principal-specific routes change authentication, scope checks, serializers, and auditing — not the underlying business implementation.

If CRM has one `listRequests()` service function, session/service/operator/integration routes may all call it with different guards. A second implementation because another caller needs the capability is a defect.

Adding a principal is primarily a routing/security-contract change. If a new caller requires new domain business logic, move that logic into the owning service first.

## Session

Use `session` when a signed-in human is the principal. The bearer/session must remain request-scoped. The API decides membership, permissions, and field visibility.

Examples:

- CRM member reading requests;
- Work user updating a task;
- Billing member reading invoices;
- Workspace member reading their organization directory.

Do not replace a user bearer with an internal key merely because the call originates from a Server Component.

## Service

Use `service` when one **first-party 876 application/service** calls another 876 service as part of the 876 product ecosystem.

Examples:

- Invoice → Billing;
- CRM API → Storage;
- CRM API → Work;
- Couriers → Billing/Storage;
- another first-party host invoking an organization-scoped capability without pretending to be a human session.

A service credential is not operator authority. It should be scoped, auditable, organization-aware where applicable, and limited to the declared caller/capability. Never introduce one universal internal key that gives every product unrestricted access to every other product.

Historical first-party entrypoints named `integration` should migrate to `service` when they are not externally published integration contracts. If the backing route is still shared during migration, the rename does not by itself strengthen authorization; service hardening must happen in the owning API.

## Operator

Use `operator` when 876 itself administers a product/platform capability. Console is the primary operator host.

- passes a Console permission check in the Console route handler
  (`requireConsolePermission`) before the operator client is touched, and
- writes an audit event for any read of customer-identifying data and any
  mutation.

- Console → CRM operator;
- Console → Billing operator;
- Console → Work operator;
- Console → platform-wide users/organizations;
- support/repair/reconcile actions requiring 876 authority.

## First-party services name service authority

A first-party app or backend imports the owning product's `service` entrypoint.
That import records caller intent even when the current backend reuses an
existing credential or route. It does not authorize a private reimplementation:
the capability still belongs to the owning service and is implemented once.

Current enforcement is not uniform. Billing, Couriers, and Work currently
alias their `service` entrypoints to their integration clients. Storage's
`service` and `operator` entrypoints currently name the same client. Treat the
names as intent; do not state that those pairs have distinct key classes until
their backends enforce them.

## Third parties get the integration tier, and nothing else

The integration surface is the published product. It is org-scoped, scope-gated,
versioned, and documented in the owning service's OpenAPI. An external system
never receives an operator or first-party service credential.

## Decision procedure

```text
Who is the principal?
├─ 876 the platform, across orgs, without a grant        → operator
├─ a first-party 876 app or backend                      → service
├─ an external system acting for one consenting org      → integration
└─ a signed-in user acting for themselves                → session
```

Then:

1. Find the owning service (`platform-services.md`).
2. Find or write the **one** service function.
3. Route it at the tier you need, beside any existing routes.
4. Expose it at the owning package's caller-named entrypoint: `operator`,
   `service`, `integration`, or `session`.
5. Add or update only the calling host's matching domain module under
   `src/lib/services/`.
6. For browser-initiated work, call it from a route handler that authorizes
   first.

Do **not** compose the capability onto a global `$876` facade.

`docs/architecture/017-console-app-data-management.md` records how these tiers
turn into a repeatable pathway for reaching **any** organization's data in **any**
app from Console: five fixed joints (capability → operator route → tier client →
bounded client → entitlement-gated surface), so adding an app is a registration rather
than a rewrite. Read it before wiring a new app into Console's org view.

## Do not

- Do not give Console an integration credential or an app connection.
- Do not add an operator-only capability to an integration route.
- Do not implement a capability twice because a second tier needed it.
- Do not let an app reach another service by an ad hoc private path when the
  owning package exposes a named `service` or `integration` entrypoint.
- Do not infer distinct credentials or backend routes from an intent-named
  entrypoint when the code still aliases clients.
- Do not hide authority in a resource-level `.admin` namespace; select it in
  the package import.
- Do not treat operator tier as exempt from Console permission checks or audit.
- Do not put business logic in a Next.js route handler to bridge a tier gap —
  the gap belongs in the owning service.
