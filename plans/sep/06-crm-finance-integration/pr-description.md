## What this does

Turns the CRM navbar support dropdown into one CRM-owned surface that CRM,
876 Billing, and 876 Invoice all mount, fixes where those requests are stored,
brings Invoice onto the platform feature-flag model, and adds a `crm` module
seam to the shared finance catalog.

### The bug this fixes

A support request raised from one account landed in **that customer's own CRM
workspace**, so a colleague in the same organization never saw it and Efesto
never received it. The route was resolving the signed-in user's active CRM
organization and writing there.

Now the destination is server-owned: `CRM_SUPPORT_ORGANIZATION_ID` names
Efesto's CRM workspace, and the source 876 organization is represented there
idempotently as one `BUSINESS` / `CORE_ORGANIZATION` customer. The submitting
account is recorded as `requesterUserId`, so members of an organization share
one support history and Efesto operators see the same records.

### How the hosts reach CRM

A support-only service credential, deliberately narrower than
`CRM_INTERNAL_KEY`:

- CRM API holds `CRM_SUPPORT_SERVICE_KEYS={"876-crm":"…","876-billing":"…","876-invoice":"…"}`
- each host holds only its own `CRM_SUPPORT_SERVICE_KEY` plus `CRM_API_URL`
- the key is validated in constant time against the presented app slug, and is
  accepted only under `/v1/service/support` — it cannot reach the operator
  `/v1` data plane

No credential reaches the browser. Each host's `/api/support` route derives the
organization and requester itself; the browser body carries only `subject`,
`description`, and `categoryId`, and the schema is strict so it cannot inject
routing identity.

### The shared widget

`@876/crm-ui/support-widget` — one React implementation, taking a typed
`transport` prop, customizable labels, and an optional request-href builder.
It imports no host client, credential, route, or auth state. Each host adds a
six-line adapter. CRM's own layout-level category fetch is gone; the popover
loads its data on open.

### Invoice feature flags

Seeds `invoice-search-bar`, `invoice-theme-switcher`, `invoice-global-add`,
`invoice-app-switcher`, `invoice-org-switcher` through the existing
PostHog + Core catalog path, enabled by default so introducing rollout control
does not remove UI that is live today. The Invoice shell now gates each
affordance on its evaluated flag, matching Billing.

### CRM module seam

One `crm` entry in the shared Billing/Invoice module catalog,
`optional: true`, `enabledByDefault: false`. It is the future embedded-CRM
seam only. Platform support stays independent of it, and it grants no
standalone CRM entitlement.

## Deploy steps

1. Set `CRM_SUPPORT_ORGANIZATION_ID` and `CRM_SUPPORT_SERVICE_KEYS` on CRM API.
2. Set `CRM_API_URL` + `CRM_SUPPORT_SERVICE_KEY` on CRM, Billing, and Invoice.
3. Run the feature seed so the five Invoice flags reach PostHog and Core.

No migration.

## Verification

`typecheck`, `test`, and `lint` pass across `@876/crm-api`, `@876/crm`,
`@876/crm-ui`, `@876/api`, `@876/crm-app`, `@876/billing-app`, and
`@876/invoice-app`, plus `check-app-structure` and `check:transpile`.

⚠️ Two failures reproduce on `origin/main` and are **not** from this branch:
Billing's `contract-baseline` test (PR #491 documented the customer-contacts
paths without registering them in the route manifest) and a `prefer-const`
lint error in `packages/crm/src/client.advanced.test.ts`. Both need a
separate fix on main.
