# Platform Services & Data Boundaries

Read this before deciding **where new data or a new feature should live** — the
identity API, an app's own datastore, or a new shared service — and before
changing how apps authenticate to the 876 API. It defines the boundary model the
whole platform grows along.

## The shape of the platform

876 is **one identity that unlocks many product apps.** That sentence is also the
data-architecture rule: the identity platform is one bounded context, and
everything else is a **separate bounded context that references identity by ID**.
There are exactly three buckets. Every table, feature, and service is in one of
them — decide which before writing code.

| Bucket                       | Owner                               | Examples                                                                                                                                         | Reached via                                     |
| ---------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| **Core identity / platform** | `@876/api` (FastAPI) + its Postgres | users, orgs, memberships, org-roles, features, auth, oauth, geo, legal organization profiles, entitlement plans, `subscriptions`, `audit_events` | `$876` (`@876/sdk` / `@876/admin`)              |
| **App-local operational**    | the app itself, its own datastore   | Console users (access grants), Console roles, staff notes, Console settings (`import { service } from '@/lib/service'`)                          | imported directly, server-only, inside that app |
| **Shared platform services** | each its own bounded context + DB   | Billing finance workspaces, future ticketing/disputes, commerce/orders, messaging                                                                | product SDK `<resource>.<verb>()`, auth-tiered  |

**Concrete instance: org → platform-app provisioning.** `subscriptions` is the entitlement table controlling which orgs can access which 876 platform apps. It lives in the core identity API — not any single app's datastore — because it is cross-cutting: Couriers reads it to gate dashboard access, Console reads and writes it to provision/block orgs, and future apps follow the same pattern. Product access is independent of any app-local tenant row.

**Concrete instance: embedded finance.** A finance-dependent app declares that
dependency and its narrow scopes in its provisioning profile. Billing may then
create a headless finance workspace and app connection for the organization.
That datastore row is infrastructure used by the subscribed product; it does
not grant a trial or paid 876 Billing entitlement. Activating the standalone
Billing product later opens the same workspace without copying financial data.
Product databases keep operational links as opaque Billing IDs; they must not
retain fallback customer, catalog, invoice, payment, account, or ledger tables.

### How to place something

1. **Is it identity or platform-foundational** (who a user/org is, what they can
   sign into, entitlement plans, features, auth)? → **Core identity API.**
2. **Is it internal to exactly one app** and meaningless to the rest of the
   platform (admin notes, a Console user roster (access grants), one app's settings)? →
   **That app's own datastore.** It must not duplicate identity tables and must
   reference identity by opaque ID.
3. **Does it span multiple surfaces** — created on one app, acted on by another,
   overseen in Console (a ticket, an order, a dispute)? → **A new shared
   platform service**, its own bounded context and DB, exposed through the `$876`
   surface. **Not** the identity API (it isn't identity) and **not** any single
   app's datastore (it isn't local to one app).

> Watch for the trap: "only Console touches it today" does **not** make
> something Console-local. `vendors`, `org_customers`, and `org_locations` are only
> surfaced in Console today but are **org-owned business data** — they stay in core
> until an org-facing service owns them. Admin-console-internal means _no other
> surface could ever own it_, like the Console user roster (access grants).

## The cross-service contract: reference by ID, resolve through the client

Bounded contexts **never share a database or a foreign key.** A service stores
the opaque 876 identifiers it needs (`user_…`, `org_…`, `app_…`) as plain
columns — no FK, no join across databases — and resolves the human details
(name, email, org slug, avatar) at read time through `$876`.

- Precedent already in the codebase: `org_customers.customer_id` is a
  polymorphic ID with **no** FK constraint. Every cross-service reference follows
  that shape.
- Console's in-app Prisma datastore is the first instance: the `team` resource (Console members, keyed by the opaque 876 user ID) holds
  a core 876 user ID; Console authorizes off its own access grants and role catalog, then
  calls `$876` to read or mutate the actual identity record.
- Every app-local datastore follows the same `<resource>.<verb>()` naming vocabulary as `$876`, in two layers: the `prisma` singleton (`@/lib/db`) and the `service.<resource>.<verb>()` layer (`@/lib/service`, the only caller allowed to query `prisma`) — see "App-local datastore layering" in `.claude/rules/sdk-conventions.md`.
- This is what lets a service be extracted, replaced, or scaled independently —
  and what keeps the identity API from accreting every app's concerns.

## Authentication tiers: publishable vs secret

The most important security rule on the platform:

> **An exposable (publishable) key may never carry privileged scope. Privileged
> platform mutations require a secret key that never reaches the browser.**

This is the Stripe model, and the codebase already implements it — do not erode
it by trying to collapse to "one key for everything."

| Tier              | Credential                                                          | Where it lives         | Can it do privileged ops?                           |
| ----------------- | ------------------------------------------------------------------- | ---------------------- | --------------------------------------------------- |
| App / publishable | app API key (`876_app_secret_*`) + session cookie                   | browser **and** server | **No** — only self-scoped, non-`AdminDep` endpoints |
| Secret service    | `API_876_SERVICE_KEY` (`x-internal-key`; legacy `API_INTERNAL_KEY`) | **server only**        | **Yes** — every `AdminDep` operation                |

Because privileged operations need a server-side secret, a browser cannot call
them directly. That is exactly why each app's **thin route handlers
(`app/api/...`) exist**: they are the boundary that holds the secret key
server-side. In Console the route handler does three things in order —
(1) verify the 876 session, (2) **authorize against Console-local user/role permissions** (via `service`), (3) call `$876` with the secret service key. The
handler is the authorization boundary, not incidental boilerplate; keep it.

### Is HTTPS + a key enough?

For a **secret key sent server-to-server over TLS, never exposed to the browser,
hashed at rest** — yes, that is the industry-standard baseline and is sufficient.
Layer these as the surface grows (do not block the baseline on them):

- **Scoped, prefixed keys** — per-app and per-permission, not one omnipotent key.
- **Rotation & per-environment keys** — short-lived where practical; never share a
  key across prod/staging.
- **mTLS** between the Next.js servers and the API for the privileged tier.
- **IP allow-listing** for the secret-service tier.
- **HMAC request signing** (webhook-style body signature) so a leaked key alone is
  insufficient to forge a call.
- **Rate limiting** + the existing `audit_events` trail on privileged calls.

## Worked example (DESIGN ONLY — not implemented): cross-surface ticketing

A customer raises a dispute on `@876/app`; the org responds in `@876/enterprise`;
876 staff oversee and can step in from Console. This touches every
surface, so by rule #3 it is a **shared platform service**, not identity and not
Console-local. The pattern it would follow:

- **Own bounded context + DB.** A `tickets` service (its own schema/datastore),
  storing `requester_id`, `org_id`, `app_id`, `assignee_id` as **opaque 876 IDs**
  — no FK to the identity DB.
- **One client surface, auth-tiered.** Exposed as `$876.tickets.*` with the same
  `<resource>.<verb>()` shape, gated by auth tier:
  - consumer (session/app key): `tickets.create()`, `tickets.list()` /
    `tickets.retrieve()` **scoped to their own** tickets;
  - org member (org-scoped): list/respond to tickets **for their org**;
  - Console (`AdminDep`): list/search/moderate **all** tickets.
- **Field visibility is an API serializer concern**, never client-side filtering —
  the same rule as `.claude/rules/sdk-conventions.md`.
- **Identity stays resolved through `$876`** — the ticket service never reads the
  users/orgs tables directly.

The infrastructure that makes this "not hard later" is what this rule plus
Console's in-app datastore put in place now: the three-bucket placement decision, the
ID-reference contract, the tiered `$876` surface, and the secret-key boundary.
When ticketing is built, it slots into all four without rework.

## Checklist for new work

- [ ] Placed in the right bucket (identity / app-local / shared service) per the
      decision steps above — and not misfiled because "only Console sees it today."
- [ ] Cross-context references are **opaque IDs, no cross-DB FKs**; identity
      resolved through `$876`.
- [ ] No privileged scope on any publishable/exposable key; secret key stays
      server-side behind a route handler that authorizes first.
- [ ] If a new shared service: exposed through `$876.<resource>.<verb>()`,
      auth-tiered, with per-tier serializers — not bespoke wrappers.
- [ ] If gating an app to specific orgs: use the Core `subscriptions` /
      entitlement pattern (not `OrgFeature`); gate in the app's private layout
      through the canonical platform client and provision through the app's
      authenticated onboarding flow.
- [ ] If the app needs money operations: declare an embedded finance dependency,
      grant only required scopes, and keep paid Billing access as a separate Core
      entitlement.
