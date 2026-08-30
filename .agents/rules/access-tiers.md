# Access Principals — who is calling, and through what

The client entrypoint states whose authority is exercised.

Companion to `.claude/rules/platform-services.md` (which bounded context owns
what), `.claude/rules/sdk-conventions.md` (the client surface), and
`.claude/rules/app-api-routing.md` (the browser-facing half).

## The four tiers

Use `session` for a human principal and keep bearer authority request-scoped.

| Tier            | Principal                                     | Typical credential                  | Scope                                   | Consent                   |
| --------------- | --------------------------------------------- | ----------------------------------- | --------------------------------------- | ------------------------- |
| **operator**    | 876 itself, acting as platform                | secret internal key, server-only    | every organization, including none      | none required — it is 876 |
| **service**     | a first-party 876 app or backend              | scoped server credential/app grant  | the service contract's granted scope    | first-party trust/grant   |
| **integration** | an externally connected system acting for org | OAuth/app credential + named scopes | exactly one organization, scope-limited | the org granted it        |
| **session**     | one signed-in user                            | session cookie / access token       | what that user may do in that org       | the user is present       |

Use `operator` for 876/Console administration. Console performs its own permission/audit checks before invoking product operator clients. Privilege remains bounded by domain (`crm/operator`, `billing/operator`, etc.); global-only capabilities belong to `@876/platform`.

Reserve `integration` for external providers, partners, and customer applications. External integration routes are consent/scope gated and must never gain operator powers for Console convenience.

Decision: signed-in human → session; first-party 876 app/service → service; 876/Console → operator; external system → integration.

`listRequests(organizationId, filters)` is written once, in `crm-api`, in one
service function. It is then routed three times:

```
/v1/organizations/:organizationId/requests             guard: operator
/integrations/organizations/:organizationId/requests   guard: integration + scope crm.requests.read
/organizations/:organizationId/requests                guard: session + membership
```

Three routes, three guards, one service function, one repository. A second
implementation for a second caller is the defect this rule exists to prevent:
the two drift, and the drift is discovered as a support ticket where Console
and the customer's own screen disagree about the same record.

Adding a tier is therefore a **routing** change, never a rewrite. If exposing a
capability at a new tier requires new business logic, the logic was in the
wrong layer — move it into the service first.

## Console uses the operator tier, and only the operator tier

**Console must never authenticate as an integration.** It holds the secret
internal key and calls the operator tier of every service it administers. This
is settled; do not revisit it per feature.

Three reasons, in order of how expensive they are to get wrong:

1. **Consent.** The integration tier exists _because_ an organization granted a
   connection with named scopes. Console acts without that grant — suspending a
   workspace, purging an organization, forcing a reconcile, revoking a key.
   Routing Console through the integration surface leaves two options, both
   bad: those operations do not exist there and Console breaks, or we add
   operator powers to the integration contract and **every third party
   inherits them**. The second is a security regression that cannot be quietly
   walked back once a partner has built against it.
2. **Scope.** Integration is org-scoped by construction. Console's job is
   cross-org: list every tenant, search every customer, reconcile the whole
   finance plane. There is no organization to scope those to.
3. **Availability.** A customer can revoke a connection. 876's ability to
   support and oversee that customer must not depend on a grant the customer
   can withdraw.

### What Console does share with the integration tier

Console must not get a **second implementation** of a product feature. When
Console embeds org-scoped product data — an org's CRM requests, its invoices,
its customers — it calls the operator route of **the same capability** the
integration tier exposes. Console dogfoods the _shape_, never the _credential_.

The practical test when adding a Console screen over another service's data:

- Is there already a service function for this? → route it at operator tier and
  call it. Done.
- Is there only an integration route? → add the operator route beside it,
  pointing at the same controller. Do **not** give Console an app connection.
- Is there no service function at all? → write it in the owning service, then
  route it. Do **not** write it in Console.

### Operator access is audited access

The operator tier skips _organizational_ consent. It does not skip
accountability. Every Console call still:

- passes a Console permission check in the Console route handler
  (`requireConsolePermission`) before the operator client is touched, and
- writes an audit event for any read of customer-identifying data and any
  mutation.

"876 staff may do it" is a different statement from "876 staff may do it
unobserved". Only the first is true.

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

```
Who is the principal?
├─ 876 the platform, across orgs, without a grant        → operator
├─ a first-party 876 app or backend                      → service
├─ an external system acting for one consenting org      → integration
└─ a signed-in user acting for themselves                → session
```

Then, before writing anything:

1. Find the owning service (`platform-services.md`).
2. Find or write the **one** service function.
3. Route it at the tier you need, beside any existing routes.
4. Expose it at the owning package's caller-named entrypoint: `operator`,
   `service`, `integration`, or `session`.
5. Add or update only the calling host's matching domain module under
   `src/lib/services/`.
6. For browser-initiated work, call it from a route handler that authorizes
   first.

## The Console-facing shape of all this

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
