# Organization Workspace Provisioning

An 876 organization owns one **876 Workspace**: the shared environment in which
its members, enabled apps, organization configuration, customer relationships,
and shared finance capability are prepared. Product apps operate inside that
environment; they do not each manufacture a separate copy of the platform.

The Express Core exposes the high-level orchestration surface from
`apps/api/src/services/workspace.ts`. Normal callers should express intent with
`workspace.*`; the lower-level provisioning, outbox, reconciliation, repository,
and provider helpers remain in their owning modules.

```ts
await workspace.setup(organizationId, {
  sourceAppId,
  finance: 'defer',
})

// after the durable owner membership exists
await workspace.finance.ensure({ organizationId })
```

The durable/finance split is deliberate: a finance outage must not interrupt
bootstrap before the owner membership exists, because the workspace must remain
discoverable and retryable.

---

## Workspace versus `$876`

The workspace facade is a **control plane**, not another resource SDK.

```ts
// prepare or govern the environment
await workspace.apps.ensure(organizationId, { sourceAppId })
await workspace.roles.ensure(organizationId)
await workspace.finance.ensure({ organizationId })

// operate on resources inside the environment
await $876.invoices.create(...)
await $876.customers.list(...)
await $876.packages.create(...)
```

Do not introduce `workspace.finance.invoices.create()` or similar nested resource
CRUD. `$876` intentionally hides which bounded context physically owns the
resource.

---

## What an organization gets on creation

Every org is subscribed to `DEFAULT_ORG_APP_SLUGS` plus the app it signed up
through.

| Slug             | What it is                                                                             | Why it is a default                                                                       |
| ---------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `876-enterprise` | The directory where an org manages itself — account details, users, teams, departments | Membership in the org is what admits users; the subscription backs the entitlement check. |

In addition, the app the signup came through (the _source app_) is subscribed if
it is not already in the default set.

At the workspace layer this is:

```ts
await workspace.apps.ensure(organizationId, { sourceAppId })
```

Internally that delegates to the idempotent subscription provisioning logic in
`services/provisioning.ts`.

---

## App entitlements and the shared financial data plane

An entitlement is per application. `876-billing` and `876-invoice` are activated
explicitly; neither is a default org entitlement.

The shared financial data plane is automatic and separate: every organization
is synchronized into the central customer registry, and a dependent product can
open the organization's shared finance capability through
`financeDependency: 'embedded'`. Neither action grants access to the standalone
876 Billing application.

When Billing is activated later, it opens the **same organization finance
workspace** without copying or migrating financial data. This is the important
mental model:

```text
876 Workspace
└── Organization
    ├── 876 Invoice ──┐
    ├── 876 Couriers ─┼── shared finance capability
    ├── 876 CRM ──────┤
    └── 876 Billing ──┘
```

876 Billing is therefore a product with broad access to the shared finance data
plane; it is not the parent product that Invoice, Couriers, and CRM belong to.

---

## Registry synchronization

System-level customer synchronization is workspace lifecycle, not ordinary
customer CRUD.

High-level orchestration uses:

```ts
await workspace.customers.ensure(organization)
await workspace.customers.archive(organization)
```

Internally those calls still use the durable `billing_customer_outbox` and the
explicit helpers such as `enqueueCustomerEnsureForOrganization`. Keeping the
implementation names inside the subsystem is useful for debugging; callers do
not need to understand the outbox mechanics just to understand workspace
bootstrap.

This is separate from user/business operations such as:

```ts
await $876.customers.create(...)
await $876.customers.list(...)
```

---

## Provisioning setups

The day-zero finance configuration an organization is provisioned from is a
named **setup**: `jamaica` today, with room for `united-states` and further
Caribbean markets. A setup owns the finance manifest stored at
`finance/<key>`, and exactly one setup is the platform default.

```ts
await workspace.provisioning.setups.list()
await workspace.provisioning.setups.create({
  key: 'united-states',
  name: 'United States',
  country_code: 'US',
  currency_code: 'USD',
  copy_from: 'jamaica',
})
await workspace.provisioning.setups.update('united-states', {
  is_default: true,
})
```

Rules worth knowing before touching this:

- **New organizations get the default setup**, which is Jamaica unless an
  operator changes it in Console (Settings → Organizations → Provisioning
  setups).
- **An organization keeps the setup it was provisioned with**
  (`organizations.provisioning_setup_key`). Changing the platform default never
  re-points an organization that has already been provisioned.
- **A new setup is created by copying a published one**, so it can provision
  from the moment it exists.
- **A setup key is permanent.** Renaming one orphans its finance manifest.
- **The default setup cannot be archived**, and neither can a setup that
  organizations are already provisioned with.

See ADR-015 for the reasoning.

---

## Finance readiness

A subscribed app with a published `financeDependency: 'embedded'` profile is not
ready until its finance connection has been reconciled and the provisioning event
has been delivered.

High-level callers use:

```ts
await workspace.finance.ensure({
  organizationId,
  appId,
  expected: 'embedded',
})
```

The facade delegates to the existing readiness/reconciliation implementation,
which remains responsible for provisioning revisions, lifecycle versions,
outbox delivery, idempotency, and failure semantics.

For a whole organization after durable bootstrap:

```ts
await workspace.finance.ensure({ organizationId })
```

This derives the organization's subscribed apps and makes each one ready
according to its published profile.

---

## How the source app is determined

The source app comes from the authenticated app identity, not a client-supplied
field. The validated API key establishes the originating `appId`, which is then
passed into workspace setup:

```ts
await workspace.setup(organizationId, {
  sourceAppId: request.principal.appId,
})
```

A client therefore cannot claim to be a different app simply by sending another
identifier in the request body.

---

## Idempotence and partial environments

The underlying workspace operations remain idempotent:

- Existing app subscriptions are reused rather than recreated.
- Existing subscriptions missing a default price item can be repaired when a
  default price becomes available.
- Existing finance connection events are reused when they already describe the
  desired state.
- Registry synchronization deduplicates unchanged customer snapshots.
- A missing default app row logs `provisioning.default_app_missing` and does not
  destroy the organization bootstrap.

The facade changes how orchestration is **read**, not those durability rules.

---

## Adding an app to the default set

Add the slug to `DEFAULT_ORG_APP_SLUGS` in
`apps/api/src/services/provisioning.ts`:

```ts
export const DEFAULT_ORG_APP_SLUGS = [
  ENTERPRISE_APP_SLUG,
  'your-new-slug',
] as const
```

> **Caution:** this grants the app to every _new_ org from that point forward.
> It does **not** backfill existing orgs.

---

## Backfilling an existing org

There is no automated script for this yet. Options:

1. **Console workspace controls** — use the org/app entitlement management UI.
2. **One-off service operation** — deliberately grant the relevant org/app
   entitlement through the authorized control path.

Do not assume backfill is automatic when a new slug is added to
`DEFAULT_ORG_APP_SLUGS`.

See `.claude/rules/workspace-control-plane.md` for the `$876` / `workspace` /
`platform` placement rule.
