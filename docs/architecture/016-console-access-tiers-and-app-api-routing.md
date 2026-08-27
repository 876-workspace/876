# 016 — Console access tiers and app API routing

Status: accepted (2026-08-27)

## Context

Two questions kept being re-decided per feature, and the answers were drifting.

**1. How should Console reach another 876 service?** Console began as the admin
surface for the identity platform. It is now the surface through which 876 runs
every product: it already administers Billing plans and prices, Couriers
packages and branches, Storage files, and Widgets notes, and it is about to
absorb 876 CRM's requests/tasks/reminders and 876 Invoice's documents. At the
same time, Billing publishes a formal **integration** boundary
(`/integrations/organizations/:organizationId/<resource>`, app key plus a
scoped finance connection) which 876 Invoice already consumes and which will be
offered to third parties building on 876.

The tempting simplification was to route Console through that same integration
boundary — one path, dogfooded by the platform's own admin tool.

**2. Do an app's own `/api` routes duplicate the `$876` facade?** We want every
876 app to feel like an ordinary full-stack Next.js application whose client
talks to its own `/api` routes. But each app's server half reaches its data
through the `$876` facade, which makes an outbound call to the owning service.
That looked like two transports for one job, and the repo had grown two
incompatible route shapes: explicit typed handlers (Console, CRM) and
`[[...path]]` byte-forwarding proxies (Billing, Invoice).

## Decision

### Console holds the operator tier and never an integration credential

Three tiers are named and fixed: **operator** (876 itself, secret internal key,
cross-organization, no grant required), **integration** (one app acting for one
organization that granted a scoped connection), and **session** (a signed-in
user).

Console is operator, always. Routing it through the integration boundary fails
on three counts:

- **Consent.** The integration tier exists because an organization granted it.
  Console acts without that grant — suspending a workspace, purging an
  organization, forcing a reconcile, revoking a key. Pushing Console through
  integration leaves two outcomes: those operations do not exist there and
  Console cannot do its job, or we add them and **every third party inherits
  operator powers**. The second cannot be quietly reversed once a partner has
  built against the contract.
- **Scope.** Integration is org-scoped by construction; Console's work is
  cross-org by definition.
- **Availability.** A customer can revoke a connection. 876's ability to support
  that customer must not depend on a grant the customer can withdraw.

### But Console reuses the capability, not a second implementation

The counterpart rule is what keeps this from becoming two codebases:

> A capability is implemented once by the service that owns it, and exposed at
> as many tiers as it has legitimate callers. The tier changes the guard and the
> scope check — never the logic.

`listRequests(organizationId, filters)` is one function in `crm-api`, routed at
operator, integration, and session paths against the same controller. Adding a
tier is a routing change, never a rewrite. Console therefore dogfoods the
_shape_ of the integration surface without holding its _credential_.

Operator access remains audited: the Console route handler still enforces a
Console permission before the facade is touched, and reads of
customer-identifying data and all mutations still write audit events. Skipping
organizational consent is not the same as skipping accountability.

### First-party apps use the integration tier on the same terms as third parties

Invoice reaches Billing customers through the published integration boundary
with its own app key, not by a private shortcut. The first-party app is the
integration surface's first customer; a capability only reachable through a
private path is one nobody has proven is usable from outside.

### The app `/api` route and the facade are different layers

They do not compete and nothing is duplicated:

```
browser  ──►  /api/<resource>            same origin, product vocabulary
              route handler              authorize + adapt transport, no logic
              $876.<resource>.<verb>()   server-only facade
              owning service             at the tier above
```

The route is the **browser contract** — it exists so the client never learns a
service origin, never holds a credential, and does not change when the backend
is re-homed. The facade is **server-to-server transport** — it exists so the
server half never hand-rolls a `fetch` or restates a response shape. A route
handler calling `$876` is exactly a traditional Next.js handler calling a data
client; `$876` is that client. The invariant holds only while the handler
carries no business logic — the moment it decides something the service should
have decided, the app has a second implementation and the facade is decoration.

Two handler shapes are sanctioned. **Pattern A**, the typed resource route, is
the default and is mandatory whenever the response composes several services or
the app applies its own decision. **Pattern B**, the registered resource proxy,
is permitted for a large faithfully-mirrored resource family owned wholly by one
service, provided the top-level resource is a literal in server code and is
listed in the app's proxy manifest. A catch-all whose first segment comes from
the request URL is a generic gateway and is forbidden — it delegates an
authorization decision to whoever crafts the URL.

## Consequences

- Console gains a required `crm` service client and surfaces
  `requests`/`requestTasks`/`requestReminders`/`requestNotes`/`requestCategories`
  on its `$876`, reusing `crm-api`'s existing org-scoped operator routes with no
  new domain code. It deliberately does **not** surface CRM `teams` or
  `customerProfiles`: Console already has org members and finance customers, and
  a second vocabulary for the same thing is exactly the drift being avoided.
- Console's browser routes for this are named after what the operator acts on —
  `/api/organizations/:id/requests` — never `/api/crm/requests`.
- Billing's and Invoice's proxied resources become a declared manifest with a
  drift test, so the exposed surface is enumerable rather than implied by the
  file tree.
- Embedding a further product in Console (Invoice documents next) is now a
  known, repeatable sequence: find or write the one service function, route it
  at operator tier beside its existing routes, expose it on the operator client,
  compose it onto Console's facade, and add a Pattern A handler.

## References

- `.claude/rules/access-tiers.md`
- `.claude/rules/app-api-routing.md`
- `.claude/rules/platform-services.md` — which bounded context owns what
- `docs/architecture/product-api-boundaries.md`
