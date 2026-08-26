# Org Provisioning

When an organization is created, the Express core's
`apps/api/src/services/provisioning.ts` runs `provisionOrganization` to seed
its roles, initial app entitlements, and shared financial registry record.

---

## What an organization gets on creation

Every org is subscribed to `DEFAULT_ORG_APP_SLUGS` plus the app it signed up
through.

| Slug             | What it is                                                                             | Why it is a default                                                                       |
| ---------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `876-enterprise` | The directory where an org manages itself — account details, users, teams, departments | Membership in the org is what admits users; the subscription backs the entitlement check. |

In addition, the app the signup came through (the _source app_) is subscribed if
it is not already in the default set.

---

## App entitlements and the shared financial data plane

An entitlement is per application. `876-billing` and `876-invoice` are activated
explicitly; neither is a default org entitlement.

This default-set change is prospective. Existing `876-billing` subscriptions are
left in place.

The shared financial data plane is automatic and separate: every organization
enqueues a `customer.ensure` record for the central customer registry, and a
dependent product can open its embedded finance workspace through
`financeDependency: 'embedded'`. Neither action grants access to the standalone
876 Billing application. When Billing is activated later, it opens the same
financial data without a copy or migration.

---

## How the source app is determined

`ensureOrgAppSubscriptions` receives `sourceAppId` from the Express
authentication or organization-bootstrap flow:

```ts
await provisionOrganization(organizationId, now, {
  sourceAppId: request.principal.appId,
})
```

The validated API key establishes `request.principal.appId`; it is **not** a client-supplied
parameter. This means an app cannot claim to be a different app by sending a
different value — the identity of the originating app is established by the key,
not by anything in the request body.

---

## Idempotence and partial environments

`ensureOrgAppSubscriptions` is safe to call more than once on the same org:

- If a subscription already exists for an app, it is left in place and not
  re-created.
- If an app row is missing (e.g. a partially seeded environment), the function
  logs `provisioning.default_app_missing` at `error` level and continues rather
  than failing the signup. The org is still created; it simply lacks that one
  entitlement until the app row is seeded and provisioning is re-run.

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
> It does **not** backfill existing orgs. See below.

---

## Backfilling an existing org

There is no automated script for this yet. Options:

1. **Console provisioning controls** — use the admin UI under the org's
   subscription management to manually add the app entitlement.
2. **One-off API or service operation** — explicitly create the relevant
   organization/app subscription through the platform's typed admin surface.

Do not assume backfill is automatic when a new slug is added to
`DEFAULT_ORG_APP_SLUGS`.
