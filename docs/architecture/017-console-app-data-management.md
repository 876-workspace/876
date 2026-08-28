# 017 — Managing an organization's app data from Console

**Status:** accepted, 2026-08-28.
**Supersedes:** nothing. **Builds on:** [016](016-console-access-tiers-and-app-api-routing.md),
`.claude/rules/access-tiers.md`, `.claude/rules/platform-services.md`.

## The problem

876 now runs several product apps — CRM, Couriers, Billing, Invoice, Widgets,
Storage — each owning its own bounded context and database. Console has to let
876 staff open any organization and work with that organization's data in **any**
app it is entitled to, and the set of apps keeps growing.

The failure mode this document exists to prevent is the obvious one: each new app
arrives with its own bespoke Console integration, its own credential story, and a
second implementation of capabilities the owning service already has. Six apps
in, Console becomes the place where every product's logic is quietly reimplemented
and slowly drifts from the product itself.

## The rule

> **One capability, implemented once by the owning service, routed at as many
> tiers as it has legitimate callers. Console is always the operator tier.
> Adding an app to Console is a registration, never a rewrite.**

## The pathway

Every app plugs into Console through the same five joints. Nothing else is
negotiable, and nothing else is required.

```
1. capability      the owning service's service function        (write once)
2. operator route  /v1/organizations/:organizationId/<resource>  (route again)
3. tier client     packages/<app> operator/admin client method
4. facade          composed onto Console's $876 in src/lib/876
5. surface         /orgs/[slug]/<resource>, gated by entitlement
```

### 1. The capability lives in the owning service

`listRequests(organizationId, filters)` is written once, in `crm-api`, in one
service function over one repository. If exposing it to Console needs new
business logic, the logic was in the wrong layer — move it into the service
first. Console never gets a private shortcut.

### 2. The operator route sits beside the others

```
/v1/organizations/:organizationId/requests             operator   ← Console
/integrations/organizations/:organizationId/requests   integration ← other apps, third parties
/organizations/:organizationId/requests                session     ← the org's own members
```

Three routes, three guards, **one controller and one service function**. Adding a
tier is a routing change. A second implementation for a second caller is the
defect this rule exists to prevent: the two drift, and the drift surfaces as a
support ticket where Console and the customer's own screen disagree about the
same record.

### 3. Console authenticates as the operator, never as an integration

Console holds the secret internal key and calls the operator tier. This is
settled; do not revisit it per app. The integration tier exists _because_ an
organization granted a connection with named scopes — and a customer can revoke
that connection. 876's ability to support and oversee a customer must not depend
on a grant the customer can withdraw, and Console's cross-org work has no single
organization to scope to.

Operator access skips _organizational consent_. It does not skip accountability:
every Console call still passes `requireConsolePermission` in the route handler
before the facade is touched, and still writes an audit event for any read of
customer-identifying data and any mutation. "876 staff may do it" and "876 staff
may do it unobserved" are different claims, and only the first is true.

### 4. The surface is entitlement-driven

An organization's tab strip is derived from the apps it is actually entitled to.
An org with no CRM entitlement gets no Requests tab; adding a future app is one
row in the app-owned tab registry, not a layout change.

The tab strip must still render **immediately** — the always-present tabs are the
Suspense fallback, so the header never flashes a skeleton and no tab appears and
then vanishes (`.claude/rules/navigation-performance.md` Rule 2).

## We are the first customer of this pathway

Console's own support desk at `/support` is the same operator routes with 876's
own organization id bound instead of a URL segment. There is no "internal" CRM
and no second data layer — 876 uses the product it sells, through the surface it
sells it through.

This is deliberate, and it is the cheapest possible test of the pathway: a
capability that is awkward to reach from Console is a capability that will be
awkward for a customer to reach too, and we find that out ourselves first.

The same holds one level out. When a support widget later appears inside the
other 876 apps, it will create requests in 876's CRM tenant through the
**integration** tier — the published product surface — using an app key, exactly
as a third party would. A first-party app that reaches a capability by a private
path is a capability nobody has proven is usable from outside.

## Who a request belongs to

A request belongs to a **Customer**, which is already the party abstraction that
spans both of 876's identity entities:

|                                    | `customerKind = INDIVIDUAL` | `customerKind = BUSINESS` |
| ---------------------------------- | --------------------------- | ------------------------- |
| `customerType = EXTERNAL`          | hand-entered person         | hand-entered company      |
| `customerType = CORE_USER`         | **an 876 account**          | —                         |
| `customerType = CORE_ORGANIZATION` | —                           | **an 876 organization**   |

Users and organizations stay separate Core entities. The registry customer
_references_ one by opaque id; a customer is the **relationship**, not the
identity. That is precisely why an organization's forty members do not all become
contacts — only the people who actually transact do, which is Zoho's Account +
Contact model arrived at from the other direction.

Two consequences worth stating plainly:

- **A free 876 account is not a customer.** It becomes one when an app enrols it,
  and raising a support request _is_ that enrolment. So the answer to "is every
  user our customer?" is no — not until they need us.
- **A request records who raised it** (`requesterUserId` / `requesterContactId`).
  Without that, an organization's request cannot distinguish "the company has a
  problem" from "this member has a problem", and a future invoice emailed to one
  named person has nowhere to record that person.

## Registering a new app in Console

1. Confirm the capability exists as a service function in the owning service.
2. Add the operator route beside the existing tiers, pointing at the same
   controller.
3. Add the method to that app's operator/admin client package.
4. Compose the client onto Console's `$876` in `apps/console/src/lib/876`.
5. Add one row to the app-owned tab registry.
6. Add the Console route under `/orgs/[slug]/<resource>`, reading through `$876`
   behind a Suspense boundary, mutating through a permission-checked route
   handler.

If a step needs more than this, the capability is in the wrong place. Fix that
rather than widening Console.

## Do not

- Do not implement a capability twice because a second tier needed it.
- Do not give Console an integration credential or an app connection.
- Do not add an operator-only capability to an integration route.
- Do not put business logic in a Console route handler to bridge a tier gap.
- Do not hardcode an app's tab for organizations that are not entitled to it.
- Do not treat operator tier as exempt from Console permission checks or audit.
