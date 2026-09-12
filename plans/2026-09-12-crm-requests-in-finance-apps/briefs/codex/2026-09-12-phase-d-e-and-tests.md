# Brief 2: finish Phases D and E, and write every missing test

Same branch, same rules, same prohibitions as
`2026-09-12-crm-requests-in-finance-apps.md`. Read that brief again first — this
one only resolves its three blockers and adds the test debt. Do not commit, do
not branch, do not open a PR.

## Your three blockers, resolved

### 1. Cloudflare config — you were right, drop the requirement

`wrangler.jsonc` and `scripts/cloudflare-release-contract.mjs` genuinely do not
exist. **This repo deploys to Vercel now**; the Cloudflare copies under
`parked/cloudflare/` are dead and the docs never caught up. My brief was wrong.

Declare the new variables in each app's `.env.example` only — you have already
done this. **The orchestrator has already minted every key and set it on Vercel**
for production, preview, and development:

| Project                      | Variables                                                       |
| ---------------------------- | --------------------------------------------------------------- |
| `876-crm-api`                | `CRM_SERVICE_KEYS`, `CRM_SUPPORT_SERVICE_KEYS`                  |
| `876-invoice`, `876-billing` | `CRM_SERVICE_APP`, `CRM_SERVICE_KEY`, `CRM_SUPPORT_SERVICE_KEY` |
| `876-crm`, `876-console`     | `CRM_SERVICE_APP`, `CRM_SERVICE_KEY`                            |

Do not create a deployment-contract system, and do not touch any `.env` file.

### 2. The one-operation rule — add the capability to the owning service

Your objection is correct and the fix belongs in CRM, not in the finance app.
`access-tiers.md`: a capability is implemented once by the service that owns it.

Add org-scoped request routes addressable **by billing customer id**, so a
finance handler is genuinely one call:

```
GET  /v1/organizations/:organizationId/billing-customers/:billingCustomerId/requests
POST /v1/organizations/:organizationId/billing-customers/:billingCustomerId/requests
```

The service resolves (and `ensure`s) the `CustomerProfile` for that billing id,
then lists or creates. Reuse the resolution you already wrote for the
`billingCustomerId` filter — do not write it twice. Expose both on `@876/crm` as
`requests.listForBillingCustomer(orgId, billingCustomerId, …)` and
`requests.createForBillingCustomer(orgId, billingCustomerId, input)`; the input
then omits `customerId`.

The finance route handler now authorizes, parses, and calls exactly one CRM
operation, as required.

### 3. Role grants — they already exist, you missed the file

`apps/api/src/seeds/app-access.ts` derives role permissions **from the catalog**:
`invoicePermissions = fromCatalog(invoicePermissionCatalog)`, and `standardRoles`
gives `super-admin` `keysFor(permissions)` — every key — while the viewer/staff
role gets every `view` action.

So the `requests.view` / `requests.create` keys you added to
`packages/core/src/access/catalogs.ts` are **already granted**: `super-admin`
holds both, `staff` holds `requests.view`. Nothing to add. Prove it with a test
asserting exactly that for both `876-invoice` and `876-billing`, so a future
catalog change cannot silently orphan the permission.

## Now finish the work

Implement **Phase D and Phase E in full**, exactly as the first brief specifies,
with the blockers above resolved. Nothing in those phases is optional any more.

## Test debt — this is the largest part of this brief

You added **zero** `it()` cases. Write them all now, to the standard in
`.claude/rules/testing.md`: exact values, complete `{ data, error }` shapes,
exact call counts and arguments, negative space for every guard, and no
`toBeDefined()`-only assertions.

| Area                                                                          | Minimum `it()` cases |
| ----------------------------------------------------------------------------- | -------------------: |
| `apps/crm-api` service-app guard                                              |                   10 |
| `apps/crm-api` customers filter, related resource, by-billing-customer routes |                   24 |
| `packages/crm` contracts and resources                                        |                   14 |
| `packages/crm-ui` three panels                                                |                   20 |
| `apps/invoice` + `apps/billing`                                               |                   30 |
| `apps/crm` + `apps/console`                                                   |                   12 |
| catalog role-grant binding                                                    |                    4 |

Specific cases that must exist, because they are the ones that break in
production:

- a support key is **rejected** on an org-scoped route, and a service key is
  rejected on a support route;
- an internal-key request persists `sourceApp = null`, never a guessed slug;
- `sourceApp` in the request body is ignored in favour of the credential;
- a related resource of an undeclared type is rejected at the Zod boundary;
- money in a related-resource snapshot is never a JS `number`;
- a request for tenant A is not visible to tenant B through any new filter or
  route;
- an org with no CRM tenant renders the activation empty state rather than an
  empty list or a crash;
- every route handler you added is covered by the guard-coverage test.

Check `packages/crm-ui/vitest.config.ts` for the test environment before writing
component tests — a suite written for the wrong environment never runs.

## Report

Append to the existing report. Give the **counted** `it()` total per area, name
anything still not done, and state plainly what you could not verify.
