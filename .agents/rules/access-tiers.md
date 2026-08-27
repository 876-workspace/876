# Access Tiers — who is calling, and through what

Read this before deciding how one 876 surface reaches data owned by another —
Console reading an organization's CRM requests, Invoice reading Billing
customers, a third party building against 876, or a product app reading Core.
It fixes the tier vocabulary, the rule that a capability is implemented once,
and the decision procedure for picking a tier.

Companion to `.agents/rules/platform-services.md` (which bounded context owns
what), `.agents/rules/sdk-conventions.md` (the client surface), and
`.agents/rules/app-api-routing.md` (the browser-facing half).

## The three tiers

Every call into a service answers one question: **on whose authority?**

| Tier            | Principal                               | Credential                           | Scope                                   | Consent                   |
| --------------- | --------------------------------------- | ------------------------------------ | --------------------------------------- | ------------------------- |
| **operator**    | 876 itself, acting as platform          | secret internal key, server-only     | every organization, including none      | none required — it is 876 |
| **integration** | one app acting **for** one organization | app API key + finance/app connection | exactly one organization, scope-limited | the org granted it        |
| **session**     | one signed-in user                      | session cookie / access token        | what that user may do in that org       | the user is present       |

The tier is not a style choice. It is a statement about authority, and it is
what a security review reads first.

## The rule that makes this work

> **A capability is implemented once by the service that owns it, and exposed
> at as many tiers as it has legitimate callers. The tier changes the guard and
> the scope check — never the logic.**

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
  (`requireConsolePermission`) before the facade is touched, and
- writes an audit event for any read of customer-identifying data and any
  mutation.

"876 staff may do it" is a different statement from "876 staff may do it
unobserved". Only the first is true.

## Third parties get the integration tier, and nothing else

The integration surface is the published product. It is org-scoped, scope-gated,
versioned, and documented in the owning service's OpenAPI. First-party apps use
it on exactly the same terms — Invoice reaches Billing customers through
`/integrations/organizations/:organizationId/customers` with its own app key,
not through an internal key.

That is deliberate: **the first-party app is the integration surface's first
customer.** A capability a first-party app reaches by a private shortcut is a
capability nobody has proven is usable from outside.

## Decision procedure

```
Who is the principal?
├─ 876 the platform, across orgs, without a grant        → operator
├─ an app acting for one org that granted a connection   → integration
└─ a signed-in user acting for themselves                → session
```

Then, before writing anything:

1. Find the owning service (`platform-services.md`).
2. Find or write the **one** service function.
3. Route it at the tier you need, beside any existing routes.
4. Expose it on the tier's client (`@876/admin` / product admin client for
   operator; the product integration client for integration; `@876/sdk` for
   session).
5. Compose it onto the calling app's `$876` facade.
6. Call it from a route handler that authorizes first.

## Do not

- Do not give Console an integration credential or an app connection.
- Do not add an operator-only capability to an integration route.
- Do not implement a capability twice because a second tier needed it.
- Do not let an app reach another service by a private path when an integration
  route exists for the same thing.
- Do not treat operator tier as exempt from Console permission checks or audit.
- Do not put business logic in a Next.js route handler to bridge a tier gap —
  the gap belongs in the owning service.
