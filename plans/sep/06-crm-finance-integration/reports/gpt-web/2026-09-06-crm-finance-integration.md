# GPT Web implementation report — CRM support + finance integration

**Date:** 2026-09-06 / 2026-09-07 execution window  
**Branch:** `feature/crm-support-module-integration`  
**Base:** `main` at `776c5aa393d6e379cecadb32baa38e1f18223376`  
**Current implementation head before this report:** `dcc38556d260ab2608b9b7b7b008df1185a3a2e7`  
**PR policy:** no PR was opened, merged, or commented on.

## Executive summary

This branch implements the first reusable cross-product CRM support surface for
876 CRM, 876 Billing, and 876 Invoice without turning platform support into an
organization-owned CRM module.

The original defect was tenancy, not presentation. The existing CRM navbar
support widget wrote requests into the signed-in customer's active CRM tenant.
That meant a support request raised by a customer organization lived in the
customer's own CRM workspace rather than Efesto's support workspace.

The branch now uses this model:

```text
CRM / Billing / Invoice browser
  -> same-origin /api/support
  -> authenticated host BFF derives org + requester
  -> @876/crm/support with host-specific service key
  -> CRM API /v1/service/support
  -> fixed Efesto CRM workspace
       customer = source 876 organization
       requester = source signed-in user
       request = platform support request
```

The same branch also:

- moves the React support popover into `@876/crm-ui/support-widget`;
- makes support history organization-wide while preserving requester identity;
- adds a disabled-by-default `crm` module seam shared by Billing and Invoice;
- adds five PostHog/Core-backed Invoice shell feature flags;
- preserves Billing's existing feature-flag implementation instead of cloning it;
- documents that Work is already default-enabled infrastructure for fresh
  organization provisioning;
- updates Billing/Invoice Cloudflare secret preflight for the new support key.

No database schema change or migration was required.

## Architectural result

### Platform support is now distinct from embedded CRM

There are three separate concepts:

1. **Platform support** — always targets Efesto's CRM workspace and is available
   from host chrome.
2. **Embedded CRM module** — future organization-owned CRM functionality inside
   Billing/Invoice. The catalog seam exists, but runtime module persistence and
   embedded CRM resources do not.
3. **Standalone `876-crm` product entitlement** — grants access to the full CRM
   application. The finance module catalog does not create this entitlement.

This separation is deliberate. Disabling the future finance `crm` module must
never remove "Contact 876" support or redirect support traffic into the customer
organization's own CRM workspace.

### Efesto is the server-owned destination

CRM API owns:

```text
CRM_SUPPORT_ORGANIZATION_ID=<Efesto Core organization ID>
CRM_SUPPORT_SERVICE_KEYS={"876-crm":"...","876-billing":"...","876-invoice":"..."}
```

Hosts own only:

```text
CRM_API_URL=<CRM API origin>
CRM_SUPPORT_SERVICE_KEY=<that host's service key>
```

The service credential is accepted only by the narrow support routes. Billing,
Invoice, and standalone CRM do not receive `CRM_INTERNAL_KEY` for this feature.

### Customer and requester identity

Inside Efesto's CRM workspace, the source organization is represented as a
`BUSINESS` customer linked by the existing opaque Core `organizationId`. The
submitting account is kept in `requesterUserId`.

The support service first looks up the source-organization customer and creates
it idempotently only when missing. History then filters by that CRM customer, so
members of the same source organization resolve the same support list.

No new customer-link model was needed.

## Work provisioning conclusion

The existing provisioning baseline was reviewed before implementation.

`work` is a **service entitlement**, not a standalone product entitlement. For a
fresh organization using the current default provisioning setup, Work is enabled
by default and organization bootstrap ensures the Work workspace idempotently.

That means this CRM/support integration did **not** need to add Work provisioning
or create a Work product subscription. Legacy organizations without persisted
setup state remain subject to the repository's existing compatibility/backfill
rules rather than being silently assigned today's defaults.

## Implementation details

### 1. CRM API support service boundary

Added:

- `apps/crm-api/src/http/support-service-auth.ts`
- `apps/crm-api/src/http/support-service-auth.test.ts`
- `apps/crm-api/src/modules/support/index.ts`
- `apps/crm-api/src/modules/support/support.schemas.ts`
- `apps/crm-api/src/modules/support/support.controller.ts`
- `apps/crm-api/src/modules/support/support.routes.ts`
- `apps/crm-api/src/modules/support/support.service.ts`
- `apps/crm-api/src/modules/support/support.service.test.ts`

Mounted:

```text
GET  /v1/service/support/categories
GET  /v1/service/support/requests
POST /v1/service/support/requests
```

Authentication uses:

```text
x-876-service-app
x-876-service-key
```

`CRM_SUPPORT_SERVICE_KEYS` is parsed as an app-slug-to-secret map and credentials
are compared using the existing constant-time secret comparison helper.

The support service always resolves `CRM_SUPPORT_ORGANIZATION_ID`; callers do not
supply a target organization.

Existing bounded CRM services remain the business-logic owners:

- categories service for support categories;
- customers service for source-organization customer lookup/create;
- requests service for request validation/create/list.

Public module indices were widened only enough for this new bounded module to call
those existing service interfaces. There is no cross-module Prisma access.

### 2. Typed `@876/crm/support` client

Added the server-only CRM support client with service authority.

Key files:

- `packages/crm/src/support-client.ts`
- `packages/crm/src/support-client.test.ts`
- `packages/crm/src/support-types.ts`
- `packages/crm/src/runtime.ts`
- `packages/crm/src/request.ts`
- `packages/crm/package.json`

The shared user-authored draft contract is strict:

```ts
{
  subject
  description?
  categoryId?
}
```

Source organization, organization name, requester user, and target tenant are not
browser-authored fields.

The existing CRM response envelope/parser is reused. The original internal-key
client keeps its existing authority; the support client sends only the dedicated
service headers.

### 3. Shared CRM support widget

Added one reusable React implementation:

```text
@876/crm-ui/support-widget
```

The shared UI owns presentation, loading/error/empty states, the create form,
category picker, open-status list filtering, configurable copy, and an optional
request-detail href callback.

Hosts own transport/auth. The component receives a typed transport object and has
no knowledge of `CRM_API_URL`, service keys, tenant IDs, or host auth state.

Support history and categories load only when the popover is opened. The old CRM
layout-time category read was removed so support data no longer delays app shell
rendering.

### 4. CRM host migration

Standalone CRM now uses the same platform-support service as Billing and Invoice:

- server service adapter under `src/lib/services/crm-support.ts`;
- browser support resource under `src/lib/client/support.ts`;
- same-origin `/api/support` and `/api/support/categories` BFFs;
- thin shell adapter to `@876/crm-ui/support-widget`.

CRM supplies `/requests/:id` as its optional detail href because it owns that
workspace route.

### 5. Billing host integration

Billing now mounts the shared support widget and exposes same-origin support BFFs.
Its authenticated workspace context supplies source organization and requester
identity.

Billing already had its five shell feature flags and shell gating, so no duplicate
feature system was created.

### 6. Invoice host integration + feature parity

Invoice now mounts the same shared support widget and gets the same host BFF
pattern.

Invoice also gained five canonical feature flags:

```text
invoice-search-bar
invoice-theme-switcher
invoice-global-add
invoice-app-switcher
invoice-org-switcher
```

They are evaluated through the same Core feature API and PostHog-backed catalog as
other product apps. Because those controls were previously unconditional, these
new seeds default to enabled so rollout control does not silently remove existing
UI.

No underscore aliases were invented because no historical Invoice feature keys
were found.

The shell gates each affordance separately and the feature resolver fails closed
for optional UI if evaluation is unavailable.

### 7. Shared finance CRM module seam

`packages/billing/src/settings-catalog.ts` now includes shared module:

```text
key: crm
optional: true
enabledByDefault: false
```

Because Invoice derives its module catalog from the shared finance subset, both
finance apps receive exactly the same definition without duplicating it.

This is only a module catalog seam. It does not persist module enablement, create
a CRM workspace, create a CRM service connection, or grant `876-crm` entitlement.

### 8. Deployment/preflight updates

Billing and Invoice environment examples include `CRM_API_URL` and
`CRM_SUPPORT_SERVICE_KEY`.

Their parked Cloudflare Worker descriptors and the shared Cloudflare release
contract now require `CRM_SUPPORT_SERVICE_KEY`.

CRM and CRM API themselves are Vercel-configured in this repository, so they were
not added to the Cloudflare Worker inventory.

The repository contains no canonical production CRM API URL that can be safely
hard-coded into the Cloudflare config. `CRM_API_URL` therefore remains a
production runtime variable that must be set to the actual deployed CRM API
origin.

## Source regression coverage added

Source tests now cover:

- malformed/missing support key configuration;
- cross-app support-key rejection;
- successful app-bound support authentication;
- missing Efesto support destination fails closed;
- active Efesto category filtering;
- source organization customer lookup/reuse;
- idempotent source organization customer create parameters;
- support history scoped by source organization customer;
- requester attribution on support create;
- typed service headers and no `x-internal-key` leakage;
- URL encoding of source organization in the typed support client;
- unconfigured service client failing before transport;
- shared widget lazy loading and customizable copy;
- organization-wide widget empty state;
- signed-out host BFF rejection in CRM/Billing/Invoice;
- server-derived source organization/requester in all three hosts;
- strict rejection of browser routing-identity injection;
- all five Invoice feature mappings;
- Invoice foreign-app flags ignored;
- Invoice feature provider outage fail-closed behavior;
- Invoice feature seed catalog and default-on state;
- finance `crm` module present, optional, and default-disabled.

**These tests were added as source code but were not executed by GPT Web.**

## Commits on the integration branch

In implementation order:

1. `1ddd8f0d6a58a2ce228f1dff2b3add18949dcf81` — `docs(plan): define crm finance support integration`
2. `5aa33e69570954d69df9537d943a1cee1290c3cd` — `feat(crm): add platform support service boundary`
3. `de6b64389c0d7c4ed3fa1bddcd86bad6824f6c5e` — `feat(crm): add typed support service client`
4. `60f23e97018f960f6c2c03424b517a59b87444e6` — `feat(crm-ui): share support request widget`
5. `18d916a9354df2864127120ecce3f5216211ef28` — `feat(finance): embed shared CRM support intake`
6. `dd8940e5426ccd2b5bb66a1f5c97dd3a29e37481` — `feat(invoice): add shell feature flags`
7. `9c6158681bb9e74c631d482338a83ebe9599d19a` — `feat(finance): add shared crm module seam`
8. `58f75c91abc5c7a155c052ab9e636077c23edd0c` — `feat(features): seed invoice shell flags`
9. `a341bd37359c08aa5b61ae0e28618a5ee194b5b7` — `test(features): cover invoice shell seeds`
10. `d69ce83f8854cf97fd504c7fc804f14cebfd0ec2` — `test(support): cover host identity boundaries`
11. `82d565dab86ad310c0a62b700c1de7a350ec90e4` — `docs(crm): document platform support service boundary`
12. `6d42c531f43604f56ada2e8132f25d0d1767e1db` — `chore(billing): require crm support service secret`
13. `ed1b56761792c59615641daf6532b49f728353a0` — `chore(invoice): require crm support service secret`
14. `dcc38556d260ab2608b9b7b7b008df1185a3a2e7` — `chore(cloudflare): include crm support host secrets`

This report is the next commit after that sequence.

## Local setup required before verification

### 1. Regenerate the pnpm lockfile

`apps/billing/package.json` and `apps/invoice/package.json` now correctly declare
`@876/crm` and `@876/crm-ui` as direct workspace dependencies. The GitHub
connector available to GPT Web can replace files but cannot apply a safe small
patch to the very large generated `pnpm-lock.yaml`; rewriting that file wholesale
through the connector would be riskier than regenerating it with pnpm.

Run from the repository root:

```bash
pnpm install --lockfile-only
```

Review the resulting lock diff. It should only add the two workspace links to the
Billing and Invoice importer sections; no package resolution should otherwise
change.

Do this before any frozen-lockfile install/CI verification.

### 2. Configure CRM API support destination and host keys

On CRM API set:

```text
CRM_SUPPORT_ORGANIZATION_ID=<Efesto Core organization ID>
CRM_SUPPORT_SERVICE_KEYS={"876-crm":"<crm-key>","876-billing":"<billing-key>","876-invoice":"<invoice-key>"}
```

Ensure the configured Efesto organization already has an active CRM tenant. If
not, run the existing authorized CRM workspace ensure lifecycle for that Efesto
organization; do not add a special support-only tenant.

### 3. Configure each host

CRM:

```text
CRM_API_URL=<CRM API URL>
CRM_SUPPORT_SERVICE_KEY=<crm-key>
```

Billing:

```text
CRM_API_URL=<CRM API URL>
CRM_SUPPORT_SERVICE_KEY=<billing-key>
```

Invoice:

```text
CRM_API_URL=<CRM API URL>
CRM_SUPPORT_SERVICE_KEY=<invoice-key>
```

Never use the same service key across hosts. Never expose these through a
`NEXT_PUBLIC_*` variable.

### 4. Seed/synchronize Invoice feature flags

After PostHog admin credentials and the Core database are configured for the API:

```bash
pnpm --filter @876/api node:seed --only=features
```

Expected Invoice catalog:

```text
invoice-theme-switcher     enabled by default
invoice-global-add         enabled by default
invoice-app-switcher       enabled by default
invoice-search-bar         enabled by default
invoice-org-switcher       enabled by default
```

The existing seed path synchronizes the PostHog flag and the local Core feature
catalog. Do not manually create a second local feature registry.

## Verification commands to run locally

First regenerate the lockfile, then run the applicable workspace checks.

```bash
pnpm --filter @876/crm-api typecheck
pnpm --filter @876/crm-api lint
pnpm --filter @876/crm-api test
pnpm --filter @876/crm-api build

pnpm --filter @876/crm typecheck
pnpm --filter @876/crm lint
pnpm --filter @876/crm test

pnpm --filter @876/crm-ui typecheck
pnpm --filter @876/crm-ui test

pnpm --filter @876/crm-app typecheck
pnpm --filter @876/crm-app lint
pnpm --filter @876/crm-app test
pnpm --filter @876/crm-app build

pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test
pnpm --filter @876/billing-app build

pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
pnpm --filter @876/invoice-app test
pnpm --filter @876/invoice-app build

pnpm --filter @876/api typecheck
pnpm --filter @876/api lint
pnpm --filter @876/api boundaries
pnpm --filter @876/api test
pnpm --filter @876/api build
```

The repository's API rules say affected Express services should run a
`boundaries` command. `@876/crm-api` currently has **no** `boundaries` script or
dependency-cruiser config in its package. That is a pre-existing verification
infrastructure gap, not something this feature silently claims to have run. If a
CRM API boundary checker is added separately, run it against this branch.

## Manual acceptance matrix

### Support destination and identity

Use at least two customer organizations and two users in one of them.

1. User A in organization A creates a support request from CRM.
2. Confirm the request is stored under Efesto's CRM tenant.
3. Confirm its CRM customer links to organization A, not to user A.
4. Confirm `requesterUserId` is user A.
5. User B in organization A opens support from Billing and sees the request.
6. User B creates another request from Billing; verify the same organization-A
   customer is reused and requester is user B.
7. User in organization B must not see organization A's support history.
8. Create from Invoice and verify the same routing semantics.
9. Confirm Efesto operator/Console request surfaces resolve the created records.

### Credential isolation

1. Use Billing's support key while presenting `876-invoice`: expect 401.
2. Try a support key on normal CRM internal/operator routes: it must not grant
   access.
3. Remove `CRM_SUPPORT_ORGANIZATION_ID`: support calls must fail safely.
4. Inspect browser network requests: the browser should see only same-origin
   `/api/support*` requests and no CRM service key.

### Widget behavior

For CRM, Billing, and Invoice:

1. initial shell renders without waiting for support data;
2. opening support loads history/categories;
3. service failure produces widget-local error UI rather than breaking the shell;
4. creating a request returns to organization history;
5. CRM can navigate to its request detail route; Billing/Invoice do not fabricate
   a local CRM detail route.

### Invoice features

Toggle each PostHog/Core feature separately and verify only its shell affordance
changes:

- search bar;
- theme switcher;
- global add;
- app switcher;
- organization switcher.

Support must remain independent of all five flags.

### Work provisioning

For a fresh organization using current default provisioning:

1. confirm setup state stores Work enabled;
2. confirm bootstrap ensures the Work workspace;
3. confirm no standalone Work product entitlement appears;
4. separately verify a deliberately Work-disabled setup does not ensure/enable
   Work merely because Work capability defaults exist.

## No migration required

There is no CRM schema migration in this branch. The implementation deliberately
reuses:

- existing CRM tenant/workspace lifecycle;
- existing source organization identity link on shared customers;
- existing CRM customer profiles;
- existing request requester identity;
- existing request channel `WIDGET`;
- existing PostHog/Core feature catalog machinery.

Do not create a migration merely because this report has a setup section.

## Suggested focused review split

Keep `feature/crm-support-module-integration` intact as the integration source of
truth until focused reviews land. A sensible local split is:

1. CRM support service/auth + `@876/crm/support` typed client.
2. Shared `@876/crm-ui` support widget + standalone CRM migration.
3. Billing/Invoice support host BFFs and shell adapters.
4. Invoice feature-flag parity + feature seeds.
5. Shared finance `crm` module seam + docs/deployment contract.

Preserve commit dependencies while splitting. In particular, the host apps depend
on both the support client and the shared UI package, and Invoice shell gating
depends on the feature seed contract.

## Verification honesty

GPT Web did **not** execute pnpm, TypeScript, ESLint, Vitest, a build, a seed,
Prisma, a database migration, or a live service request. The connector was used
to inspect and modify repository source and Git objects only.

The branch is based on the current `main` commit above and, immediately before
this report, GitHub comparison reported it ahead of `main` and not behind it.
All executable verification remains for the local/orchestrating agent using the
commands in this report.
