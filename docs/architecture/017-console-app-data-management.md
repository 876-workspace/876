# 017 — Managing an organization's app data from Console

**Status:** accepted, updated 2026-08-29.
**Builds on:** ADR-016, ADR-018, `.claude/rules/access-tiers.md`, and
`.claude/rules/platform-services.md`.

## The problem

876 runs multiple product apps and shared services. Console must let authorized
876 staff inspect and operate customer data without reimplementing each product
or giving Console customer-owned integration credentials.

## The rule

> **One capability, implemented once by the owning service, routed at as many
> tiers as it has legitimate callers. Console is always the operator tier.**

Adding an owning service to Console is a registration/composition exercise, not
a second implementation.

## The pathway

Every product/service capability reaches Console through the same joints:

```text
1. capability      owning service function                     write once
2. operator route  /v1/organizations/:organizationId/resource  route again
3. tier client     owning package's operator/admin client
4. facade          compose onto Console's server $876
5. surface         Console route over that capability
```

A second route may use another guard, but it points at the same controller and
service function.

## Access tier

Console authenticates as the **operator**, never as an integration.

Integration means an application is acting for one organization under a grant
that organization can revoke. Console acts as 876 across organizations and must
not depend on customer consent for platform administration/support.

Operator access still requires Console permission checks and auditability.

## Product entitlement versus service access

ADR-018 separates standalone product entitlement from service workspace access.
That changes an important distinction in Console:

- A **standalone product workspace surface** for an organization may be shown
  only when that organization is entitled to the product.
- A **service capability embedded in another legitimate Console workflow** does
  not imply or grant that standalone product entitlement.

For example, the existence of an organization's CRM tenant is not proof that the
organization can launch 876 CRM. Product launch remains controlled by the Core
`876-crm` entitlement.

Do not hide a legitimate operator capability merely because the customer lacks
the standalone product if that capability exists for another authorized service
relationship. Do not use service-workspace existence to manufacture a product
tab either.

## Console's own requests

Console's top-level `/requests` surface is the operator view over **876's own CRM
service workspace**.

There is no Console-local request database and no special internal CRM. The
route calls the same CRM request capability that other tiers use, with 876's
organization id bound as the target.

This is intentionally different from:

```text
/orgs/[slug]/support
```

which asks what that customer organization has raised **with 876**, and from:

```text
/workspace/[orgSlug]/crm/...
```

which opens records in that organization's **own CRM workspace**.

The tenant direction must remain explicit because all three can call a request
resource and still return plausible-looking data if wired to the wrong org.

## Future first-party product integrations

When another product later embeds CRM or another shared service, that product
uses the **integration tier**, not Console's operator credential. The first-party
product must prove the same published integration boundary a third party would
use.

See `docs/service-workspace-integration-guide.md`.

## Registering a new service capability in Console

1. Confirm the capability exists in its owning service.
2. Add/verify an operator route pointing at that same service function.
3. Add the typed operator method to the owning package.
4. Compose it into Console's canonical `$876` server facade.
5. Add the Console route/surface using Console resource vocabulary.
6. Authorize client mutations in a thin same-origin route handler before calling
   the facade.
7. Add audit and tenant-direction regression coverage.

If this requires duplicating business logic in Console, the capability is in the
wrong layer.

## Do not

- Do not give Console an integration credential or customer app connection.
- Do not implement a capability twice because Console needs it.
- Do not add operator-only powers to an integration route.
- Do not put product/service business logic in a Console route handler.
- Do not infer standalone product entitlement from a service workspace row.
- Do not infer service-workspace existence from a product tab.
- Do not collapse `/requests`, `/orgs/[slug]/support`, and an org CRM workspace
  into one tenant direction.
