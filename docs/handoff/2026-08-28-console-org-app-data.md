# Handoff — Console org app data: two axes, one flexible UI

Written 2026-08-28, end of the `feature/console-crm` session (PR #413).
Read this before touching `/orgs/[slug]/*` in Console.

## The insight this session ended on

Console has been conflating **two different questions** about an organization,
and the current tab strip answers them as if they were one:

| Axis                | Question                                 | Whose tenant the data lives in |
| ------------------- | ---------------------------------------- | ------------------------------ |
| **Org-as-customer** | "What does this org have **with us**?"   | **876's own** (`efesto`)       |
| **Org-as-tenant**   | "What is this org **doing in the app**?" | **that organization's**        |

`/orgs/<slug>/requests` today resolves **that org's own** CRM tenant
(`requireTenant(organizationId)`, `apps/crm-api/src/modules/requests/requests.service.ts:15`),
so it answers the second question while its label reads like the first. That
ambiguity is the bug — it misled the author of this session and the reviewer
within minutes of each other.

The same split exists for every app, and gets worse as apps are added:

- Billing: the invoices **we send them** vs the invoices **they send their own
  customers**. Both are "invoices for org X". They are completely different data
  in different tenants.
- Couriers: their subscription with us vs their packages and branches.
- CRM: their support tickets with us vs their customers' tickets.

## The decision

**Top-level org tabs answer "org-as-customer". A separate Workspace section
answers "org-as-tenant".**

```
/orgs/<slug>
  Overview · Members · Customers · Support · Billing · Subscriptions · Activity · Notes
                                   ↑          ↑         ↑
                                   └── all org-as-customer: their relationship with 876

  Workspace ▸                     ← org-as-tenant, one section per entitled app
    ├── CRM       → their requests, their CRM customers
    ├── Billing   → their invoices, quotes, payments
    └── Couriers  → their packages, branches
```

### Route shape

```
/orgs/<slug>/support                        their tickets with us
/orgs/<slug>/workspace/crm/requests         their own CRM requests
/orgs/<slug>/workspace/crm/customers
/orgs/<slug>/workspace/billing/invoices
/orgs/<slug>/workspace/billing/quotes
/orgs/<slug>/workspace/couriers/packages
```

`/orgs/<slug>/requests` **flips meaning** to org-as-customer, or is retired in
favour of `/orgs/<slug>/support`. Retiring it is cleaner: a route whose meaning
inverted is a trap for anyone holding an old link or an old mental model.

## Work item 1 — flip the semantics

"Requests this org has with us" is a query against **876's own tenant**, filtered
to the customer that represents that org:

```ts
const platformOrg = await getPlatformOrganization() // efesto
const customer =
  /* the CRM customer profile for org.id */
  await $876.requests.list(platformOrg.id, { customerId: customer.id })
```

`requests.list` already supports a `customerId` filter
(`ListRequestsFilter.customerId`, `apps/crm-api/src/types/request.ts:44`), so no
API change is needed for the filter itself.

**The missing primitive is org → CRM customer profile.** `customers.retrieve`
takes a profile id only (`packages/crm/src/resources/customers.ts:28`). Add an
alternate-key lookup, per `.claude/rules/sdk-conventions.md` ("alternate-key
lookups use a typed `retrieve()` object, not `retrieveBy*`"):

```ts
$876.customers.retrieve(orgId, { organizationId }) // or { userId }
```

The data is already there: the registry holds every 876 organization as a
`CORE_ORGANIZATION` customer via Core's `customer.ensure` outbox. Verified this
session — efesto's CRM workspace contains `Test Org`
(`crm_cus_17ad4b71e49f4ecaba6f3838ec07632c`).

Do **not** resolve it by listing all customers and scanning in Console; that is
an N+1 waiting to happen and puts a lookup in the wrong layer.

## Work item 2 — the Workspace section, driven by the registry

`apps/console/src/features/orgs/app-tabs.ts` already gates tabs on entitlements
and carries position as data. Extend the same registry to describe workspace
sections, so adding an app stays one entry:

```ts
export const APP_WORKSPACES = [
  {
    appSlug: '876-crm',
    label: 'CRM',
    sections: [
      { label: 'Requests', segment: 'requests' },
      { label: 'Customers', segment: 'customers' },
    ],
  },
  {
    appSlug: '876-billing',
    label: 'Billing',
    sections: [
      { label: 'Invoices', segment: 'invoices' },
      { label: 'Quotes', segment: 'quotes' },
      { label: 'Payments', segment: 'payments' },
    ],
  },
]
```

Rules that must hold, all already established:

- Plain data only — no icon components, no functions. It crosses the RSC → client
  boundary (`.claude/rules/app-layout.md`).
- Entitlement-gated: a section renders only on an `active`/`trialing`
  entitlement for its app.
- The nav renders immediately; only the data region suspends
  (`.claude/rules/data-loading.md`).
- Each section reads through `$876.<resource>.<verb>(org.id)` at the **operator
  tier** — one capability, implemented once in the owning service, routed again
  (`docs/architecture/017-console-app-data-management.md`).

## Traps this session hit — do not rediscover them

1. **`$876.organizationMembers.list` vs `.admin.list`.** The session-tier method
   resolves nothing from Console, which holds an internal key and has no session.
   It type-checks identically and lints clean, and fails only as a missing name
   and avatar in a rendered thread. **Copying a page between apps copies its tier
   assumptions with its markup** — check every `$876.*` call in ported code.
   Regression test: `apps/console/src/features/support/request-data.test.ts`.

2. **A missing workspace is a state, not a failure.** `crm/tenant-not-found`
   renders an empty state; everything else still reaches the error boundary.
   Never widen that catch — rendering a CRM outage as "no requests" would report
   every organization as empty at once. Pinned by
   `apps/console/src/features/support/tenant-state.test.ts`.

3. **A detail layout awaits `params` and nothing else.** Anything else it awaits
   suspends into the _parent_ segment's boundary and the click lands back on the
   list (`.claude/rules/navigation-performance.md` Rule 2). The workspace shell
   will be a detail layout — this applies directly.

4. **Delegation must be verified, not trusted.** Codex died on a usage limit
   before running any of its own checks; running them here found a real defect.
   Both `agy` runs needed correction. Also: `agy` cannot be isolated in a git
   worktree (it resolves absolute paths into the main tree), and a `pgrep` on a
   binary name can match an unrelated stale process and falsely report "still
   running".

## Current state — what is already done

Branch `feature/console-crm`, PR #413, 15 commits, all green:
console 89 files / 849 tests, crm-api 184, `@876/crm` 75, typecheck and lint
clean, `check-app-structure` OK.

- Requests record who raised them (`requester_user_id` / `requester_contact_id`),
  with the migration `20260828030000_request_requester` — **applied to CRM dev,
  not to production.**
- A CRM customer can link to an 876 account or organization, not just `EXTERNAL`.
- `/support` — 876's own desk, bound to the platform org, with the CRM app's
  tabbed record layout.
- Org tabs are entitlement-driven from a registry where position is data.
- `docs/architecture/017-console-app-data-management.md` — the five-joint
  pathway for reaching any org's data in any app.

## Open questions for the next session

- Retire `/orgs/<slug>/requests` or flip it? Retiring is cleaner; flipping keeps
  old links working but silently changes what they show.
- Does `Customers` on the org page mean their customers (registry) or them as our
  customer? It has the same ambiguity and is not yet resolved.
- Should `/support` grow a per-customer filter, making "their tickets with us"
  a view of the support queue rather than a tab on the org page? Both are
  defensible; the org page is likelier what an operator reaches for.
