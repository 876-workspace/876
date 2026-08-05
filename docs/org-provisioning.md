# Org Provisioning

When an organization is created through `services/auth.py: register_business`,
`provision_organization` runs synchronously and subscribes the org to its
initial set of platform apps.

---

## What an organization gets on creation

Every org is subscribed to `DEFAULT_ORG_APP_SLUGS` plus the app it signed up
through.

| Slug             | What it is                                                                             | Why it is a default                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `876-enterprise` | The directory where an org manages itself — account details, users, teams, departments | Membership in the org is what admits users; the subscription backs the entitlement check.                                        |
| `876-billing`    | The org's financial plane — invoices, payment methods, the customer registry           | An org has a billing identity from the moment it exists, the same way a Google account reaches Drive without a separate sign-up. |

In addition, the app the signup came through (the _source app_) is subscribed if
it is not already in the default set.

---

## How the source app is determined

`provision_org_apps` receives `source_app_id` threaded from
`domains/auth/router.py → services/auth.py: register_business`:

```python
source_app_id=getattr(request.state, "app_id", None)
```

`request.state.app_id` is set by the `require_api_key` dependency in
`apps/api/core/security.py` when it validates the request's API key. It is **not** a client-supplied
parameter. This means an app cannot claim to be a different app by sending a
different value — the identity of the originating app is established by the key,
not by anything in the request body.

---

## Idempotence and partial environments

`provision_org_apps` is safe to call more than once on the same org:

- If a subscription already exists for an app, it is left in place and not
  re-created.
- If an app row is missing (e.g. a partially seeded environment), the function
  logs `provisioning.default_app_missing` at `error` level and continues rather
  than failing the signup. The org is still created; it simply lacks that one
  entitlement until the app row is seeded and provisioning is re-run.

---

## Adding an app to the default set

Add the slug to `DEFAULT_ORG_APP_SLUGS` in
`apps/api/services/provisioning.py`:

```python
DEFAULT_ORG_APP_SLUGS: tuple[str, ...] = (ENTERPRISE_APP_SLUG, BILLING_APP_SLUG, "your-new-slug")
```

> **Caution:** this grants the app to every _new_ org from that point forward.
> It does **not** backfill existing orgs. See below.

---

## Backfilling an existing org

There is no automated script for this yet. Options:

1. **Console provisioning controls** — use the admin UI under the org's
   subscription management to manually add the app entitlement.
2. **One-off call to `provision_org_apps`** — call the function directly (e.g.
   from a Django shell or a one-off task) passing the org id and the relevant
   `source_app_id`.

Do not assume backfill is automatic when a new slug is added to
`DEFAULT_ORG_APP_SLUGS`.
