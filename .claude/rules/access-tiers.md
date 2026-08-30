# Access Principals — who is calling, and through what

Read this before one 876 surface reaches data owned by another. The client entrypoint must state **whose authority** is being exercised.

Companion rules: `platform-services.md`, `sdk-conventions.md`, and `app-api-routing.md`.

## Four principals

| Principal | Caller | Typical credential | Scope |
| --- | --- | --- | --- |
| **session** | signed-in human | session cookie / bearer access token | what that user may do in the active organization |
| **service** | first-party 876 app/service | scoped app/service credential | declared first-party capability, usually organization-scoped |
| **operator** | 876 itself / Console | internal operator credential | privileged platform/product administration |
| **integration** | external third party/provider | OAuth/app integration credential + scopes | granted external connection scope |

These are authority statements, not style labels.

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

Examples:

- Console → CRM operator;
- Console → Billing operator;
- Console → Work operator;
- Console → platform-wide users/organizations;
- support/repair/reconcile actions requiring 876 authority.

Console must not authenticate as a customer integration. A customer revoking an external integration cannot revoke 876's ability to operate/support its own platform.

Operator authority still requires accountability. Console route handlers perform Console permission checks before calling an operator client, and sensitive reads/mutations remain audited according to the product's audit rules.

Do not put unrelated product operator methods into one generic admin package. Privilege follows ownership: `crm/operator`, `billing/operator`, `storage/operator`, etc. Genuinely global operator capabilities belong in `@876/platform`.

## Integration

Reserve `integration` for **external** connected systems and published third-party contracts.

Examples:

- Salesforce → CRM;
- Google Calendar / Microsoft Outlook ↔ Work;
- customer/partner application → Billing/CRM through a documented OAuth/app integration.

Integration is scope/consent gated and versioned as an external contract. Never add operator-only powers to it for Console convenience.

## Decision procedure

```text
Who is the principal?
├─ signed-in human/user-delegated authority       → session
├─ first-party 876 app/service                    → service
├─ 876/Console administering the platform/product→ operator
└─ external provider/customer/partner system      → integration
```

Then:

1. identify the owning service;
2. find or implement the one domain service function;
3. expose the legitimate guarded route for the principal;
4. expose that route from the owning package entrypoint;
5. construct the bounded client in the host's `src/lib/services` layer;
6. authorize browser-originated requests in the host route before invoking it.

Do **not** compose the capability onto a global `$876` facade.

## First-party product composition is not integration

Console embedding CRM `/requests`, Invoice rendering Billing invoices, or CRM using Work are first-party product/service composition. Name them service/operator relationships according to authority, not “integrations.”

The term integration is reserved for external systems so architecture and security reviews can infer the trust boundary from the name.

## Shared business logic, different serializers

The same capability may legitimately return different fields at different principals. Field visibility is an API route/serializer concern, not SDK-side filtering.

For example, a session user, service caller, operator, and external integration may all retrieve the same customer domain record while receiving appropriately scoped representations. Keep the domain operation shared and the disclosure policy at the API boundary.

## Do not

- do not give Console a service/integration credential instead of operator authority;
- do not give a first-party service caller operator-wide authority for convenience;
- do not call first-party service access an external integration;
- do not add operator-only capabilities to external integration routes;
- do not implement the same capability separately for each principal;
- do not move domain business logic into a Next.js route handler to bridge a missing principal;
- do not treat an `operator` client as permission/audit bypass;
- do not create a global admin/mega-client that aggregates unrelated domains.
