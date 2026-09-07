# CRM module + Efesto support integration plan

**Date:** 2026-09-06  
**Integration branch:** `feature/crm-support-module-integration`  
**Base:** `main` at `776c5aa393d6e379cecadb32baa38e1f18223376`  
**PR policy for this run:** do not open, merge, or comment on pull requests.

## Goal

Make CRM a first-class module seam for 876 Billing and 876 Invoice, and turn the existing CRM navbar support dropdown into one reusable CRM-owned surface that CRM, Billing, and Invoice can mount. Platform-support requests from all three hosts must land in Efesto's CRM workspace rather than the signed-in customer's CRM workspace.

At the same time, bring Invoice onto the same platform feature-flag model already used by CRM, Couriers, and Billing, while preserving the existing PostHog + Core local-catalog synchronization model.

## User requirements captured

1. Treat CRM as a module that can ultimately be surfaced inside Billing and Invoice.
2. Confirm whether the shared Work service is enabled for a newly provisioned organization and whether that happens by default at sign-up.
3. Reuse the CRM navbar support request viewer/creator in Billing and Invoice instead of copying its implementation.
4. Keep using the same shared support surface in the standalone CRM app.
5. Fix support request tenancy: a request created from a customer account must be stored in Efesto/876's CRM workspace, not the customer's own CRM workspace.
6. Make support requests organization-linked so an organization's members and Efesto operators resolve the same support history; preserve the submitting user as the requester.
7. Use server-side environment variables / API credentials for host-to-CRM service calls. No CRM service credential may reach browser code.
8. Make the shared support widget customizable enough for different host apps without forking it.
9. Add Invoice feature flags for the shell affordances used by the other SaaS apps, including at minimum search bar and theme switcher, and synchronize them to PostHog and the local Core `features` catalog.
10. Verify Billing's equivalent feature flags and runtime gating rather than creating a duplicate implementation if they already exist.
11. Create a local-agent handoff explaining all changes, required secrets/seed steps, verification commands, and how to preserve this integrated branch while splitting review into focused PRs locally.

## Verified baseline

### Work provisioning

- `work` is a **service entitlement**, not a product entitlement.
- `PROVISIONING_SERVICE_ENTITLEMENTS` declares `work` with `default_enabled: true`.
- Fresh organization setup selection is persisted before provisioning is applied.
- Organization bootstrap calls `workspace.work.ensure(...)`; that function honors the selected setup's Work service gate and only creates the Work workspace when the gate is enabled.
- Work capabilities for tasks, reminders, calendars, events, alerts, and My Work are default-enabled; calendar sync is default-disabled.
- Legacy organizations without a persisted setup remain on the documented backfill/compatibility path and must not be silently interpreted using today's defaults.

**Conclusion:** for a fresh organization using the current provisioning setup defaults, Work is enabled by default and the shared Work workspace is prepared during organization bootstrap. This does **not** grant a standalone Work product because Work is infrastructure, not a launchable app entitlement.

### Feature flags

- Billing already seeds and evaluates `billing-search-bar`, `billing-theme-switcher`, `billing-global-add`, `billing-app-switcher`, and `billing-org-switcher` through the shared PostHog/Core feature system.
- Billing's shell already gates search, theme, global-add, app-switcher, and org-switcher from those evaluated flags.
- Invoice currently has an experiment resolver but `getFeatures()` returns an empty feature list and its shell always renders its UI affordances.
- `seedAllFeatures()` currently includes Console, Billing, Couriers, and CRM, but not Invoice.

### Support widget defect

The current CRM `/api/support` route resolves the active CRM organization and then:

1. creates/finds the signed-in user as an `INDIVIDUAL` customer in that tenant;
2. creates the support request in that same tenant.

That is the wrong target for platform support. The accepted service-workspace architecture explicitly says:

```text
customer in any 876 product
  -> Contact 876
  -> request in 876/Efesto CRM workspace
```

CRM already supports the correct customer relationship model: a `BUSINESS` customer can link to a Core organization by opaque `organizationId` (`CORE_ORGANIZATION`). No new customer-link table is required.

## Architectural decisions

### A. Platform support is not the embedded CRM module

These are separate concepts and remain separately gated:

- **Support widget** — a platform-support surface available from host chrome. It sends requests into Efesto's CRM workspace.
- **CRM module in Billing/Invoice** — organization-controlled usage of CRM capabilities inside that product. It will eventually expose the organization's own CRM workspace and must never redirect platform-support traffic there.
- **Standalone 876 CRM entitlement** — permission to launch the full CRM product. Enabling an embedded CRM module must not grant this entitlement.

This separation prevents a module toggle or CRM entitlement from changing where “Contact 876” requests are stored.

### B. Source organization is the support customer; source user is the requester

Inside Efesto's CRM workspace:

- each source 876 organization is represented idempotently as one `BUSINESS` / `CORE_ORGANIZATION` CRM customer;
- the source organization's Core ID is the durable identity link;
- the submitting signed-in account is recorded in `requesterUserId`;
- request list lookup for the navbar is scoped to the source organization customer so members of that organization see the same support history;
- Efesto/Console operators see the same records from Efesto's CRM workspace.

This fixes the current account/tenant split without duplicating CRM request data.

### C. The support destination is server-owned configuration

Hosts do **not** receive the Efesto CRM tenant ID and cannot choose a target CRM organization.

The CRM service owns:

```text
CRM_SUPPORT_ORGANIZATION_ID=<Efesto Core organization id>
```

The dedicated support service route always resolves that configured target.

### D. First-party support calls get a narrow service credential

Billing, Invoice, and standalone CRM must not receive `CRM_INTERNAL_KEY`, because that key authorizes the CRM operator/internal `/v1` data plane.

Add a support-only first-party credential map on CRM API:

```text
CRM_SUPPORT_SERVICE_KEYS={"876-crm":"...","876-billing":"...","876-invoice":"..."}
```

Each host receives only its own secret as:

```text
CRM_SUPPORT_SERVICE_KEY=...
CRM_API_URL=...
```

The typed CRM support client sends the compile-time host app slug plus the service key using dedicated service headers. The CRM API validates the app-specific key in constant time. The credential is accepted only by the support service routes, so it cannot call normal operator CRM resources.

This is intentionally narrower than building the future general CRM integration plane. The future embedded CRM module will use explicit organization-scoped CRM connections/scopes; platform support does not require or imply such a connection.

### E. Shared UI lives in `@876/crm-ui`; hosts own transport

Promote the visual widget to `@876/crm-ui/support-widget`.

The shared component owns:

- popover/list/create presentation;
- loading/empty/error states;
- open-status filtering;
- support category display;
- configurable labels/copy;
- optional request href builder for hosts that can navigate to a request detail route.

It must not import a host client, a service credential, a host route, or auth state.

Each host gets a tiny client adapter in `components/shell/` that passes its own typed browser support resource into the shared widget. Browser requests stay same-origin under `/api/support`.

### F. Support data is loaded on demand

Do not block the protected app layout on request categories. Categories and request history are decorative/popover data, so load them when the support popover opens through the host BFF route. This removes the current CRM layout-level category I/O and keeps app chrome fast.

### G. CRM becomes a finance-host module without pretending support is that module

Add a canonical `crm` module to the shared Billing/Invoice module catalog:

```text
key: crm
optional: true
enabledByDefault: false
```

The module is a future embedded-CRM seam. It is disabled by default until the organization-owned CRM surface and module-state persistence are wired. The support dropdown remains independent and available regardless of this module's state.

No standalone `876-crm` subscription is created by this catalog entry.

### H. Invoice feature parity follows existing platform flag infrastructure

Seed canonical Invoice UI flags:

```text
invoice-search-bar
invoice-theme-switcher
invoice-global-add
invoice-app-switcher
invoice-org-switcher
```

They use the same PostHog provider + local Core `features` mirror as other apps. Because these controls are already visible unconditionally in Invoice today, seed them enabled by default so introducing rollout control does not remove current UI by default.

Do not invent legacy underscore aliases for Invoice flags because no historical Invoice flag keys were found.

## Implementation phases

### Phase 1 — CRM support service boundary

Files/areas:

- `apps/crm-api/src/http/`
- `apps/crm-api/src/modules/support/`
- `apps/crm-api/src/modules/customers/index.ts`
- `apps/crm-api/src/modules/requests/index.ts`
- `apps/crm-api/src/modules/categories/index.ts`
- `apps/crm-api/src/http/routes.ts`

Implement:

1. support-only service auth from `CRM_SUPPORT_SERVICE_KEYS`;
2. support service schemas for source org/requester input;
3. fixed Efesto destination from `CRM_SUPPORT_ORGANIZATION_ID`;
4. source-org customer lookup/create using the existing customer service;
5. category listing from Efesto's CRM tenant;
6. source-org support request listing;
7. support request creation using existing request business logic;
8. no operator key access and no customer-selected target organization.

Tests must cover missing/malformed configuration, wrong app/key, cross-app key mismatch, correct source-org customer reuse/create, fixed destination, request requester linkage, and list scoping.

### Phase 2 — Typed CRM support service client

Files/areas:

- `packages/crm/src/runtime.ts`
- `packages/crm/src/request.ts`
- `packages/crm/src/support-*.ts`
- `packages/crm/package.json`

Implement a dedicated `@876/crm/support` server entrypoint. Reuse the existing request parser/error envelope rather than cloning transport code. The support client exposes only support categories and support requests.

### Phase 3 — Shared CRM support widget

Files/areas:

- `packages/crm-ui/src/support-widget.tsx`
- `packages/crm-ui/src/support-widget.test.tsx`
- `packages/crm-ui/package.json`

Promote the current navbar widget implementation. Replace host-client imports with a typed callback/transport prop. Add optional copy/href customization. Keep exactly one React implementation.

### Phase 4 — Standalone CRM migration

Files/areas:

- `apps/crm/src/lib/services/crm-support.ts`
- `apps/crm/src/lib/client/support.ts`
- `apps/crm/src/app/api/support/**`
- `apps/crm/src/components/shell/support-widget.tsx`
- `apps/crm/src/components/shell/shell.tsx`
- `apps/crm/src/app/(app)/layout.tsx`
- `apps/crm/.env.example`

Change CRM itself to consume the same support service and shared widget as Billing/Invoice. Remove the layout-level current-org request-category load. CRM's adapter may supply `/requests/:id` as its request detail href; Billing/Invoice do not need to pretend they own that route.

### Phase 5 — Billing + Invoice support hosts

Files/areas in each host:

- `src/lib/services/crm-support.ts`
- `src/lib/client/support.ts` and root client composition
- `src/app/api/support/**`
- `src/components/shell/support-widget.tsx`
- shell/topbar integration
- `.env.example` / production-secret example where present
- package dependency on `@876/crm` and `@876/crm-ui` if not already present

Each `/api/support` route resolves the signed-in host organization/user itself and sends only server-derived identity to CRM. Browser bodies may contain only user-authored request fields (`subject`, `description`, `categoryId`).

### Phase 6 — Invoice feature flags

Files/areas:

- `apps/api/src/seeds/features.ts`
- feature seed tests
- `apps/invoice/src/lib/features.ts`
- `apps/invoice/src/types/features.ts`
- `apps/invoice/src/app/(app)/layout.tsx`
- `apps/invoice/src/components/shell/shell.tsx`
- `apps/invoice/src/components/shell/topbar-actions.tsx`
- `apps/invoice/src/components/shell/user-menu.tsx` only if needed to accept the existing flag prop
- Invoice feature tests

Billing receives regression coverage only where needed because its flags and shell gating already exist.

### Phase 7 — CRM module catalog seam

Files/areas:

- `packages/billing/src/settings-catalog.ts`
- Billing/Invoice module catalog tests

Add one `crm` module definition to the shared Billing/Invoice catalog. Do not add module-state persistence in this change because the current finance module settings implementation explicitly documents persistence as a later phase. Do not grant a CRM product entitlement or create a source-organization CRM workspace merely because the catalog contains the module.

### Phase 8 — documentation + local handoff

Update the service-workspace integration documentation to record that platform support is now the first non-Console cross-app CRM surface while the general embedded CRM integration plane remains a follow-up.

Write a local-agent handoff that includes:

- the exact branch and commits;
- environment variables to configure;
- feature seed command/expectations;
- no migration requirement unless implementation discovers a real schema need;
- test/typecheck/lint/build commands to run locally;
- manual validation matrix across CRM, Billing, Invoice, Efesto Console;
- instruction to preserve all integrated changes when splitting review into focused PRs;
- suggested focused PR boundaries.

## Required verification matrix for the local/orchestrating agent

### CRM API / client

- support service key for `876-crm` cannot impersonate `876-billing` or `876-invoice`;
- support key cannot call normal CRM `/v1/organizations/...` routes;
- missing `CRM_SUPPORT_ORGANIZATION_ID` fails safely;
- source org is created/reused as exactly one Efesto CRM customer;
- same source org + two different users produces one customer and two requester identities;
- another source org cannot see the first org's widget list;
- Efesto operator request list sees the created request.

### Host apps

For each of CRM, Billing, and Invoice:

- signed-out `/api/support` is rejected;
- opening the widget loads categories/request history without blocking initial shell render;
- create submits only host-derived source org/user identity plus user-authored request fields;
- request lands in Efesto CRM workspace;
- no CRM secret is present in browser JS/network request headers;
- service outage shows a local widget error and does not break app shell.

### Feature flags

- seed creates/syncs all five Invoice flags in PostHog and Core;
- Invoice search/theme/global-add/app-switcher/org-switcher each follow the evaluated flag;
- a PostHog/provider outage fails closed for optional UI flags but does not remove authorization permissions;
- Billing's existing flags still evaluate and gate the same controls.

### Provisioning

- fresh default setup includes `service/work = enabled`;
- bootstrap ensures Work when enabled;
- a setup with Work disabled does not create/enable Work even if Work capability rows are enabled;
- no Work product entitlement is invented.

## Suggested focused PR split for the local reviewer

This branch is intentionally an integrated implementation branch. When the local agent pulls it for review, preserve every change and split review into focused PRs without dropping cross-phase dependencies:

1. **CRM support service/auth + typed client**
2. **Shared `@876/crm-ui` support widget + standalone CRM migration**
3. **Billing/Invoice support host adapters**
4. **Invoice feature-flag parity**
5. **Billing/Invoice CRM module catalog + docs/handoff**

Do not squash away architectural commits while other focused branches depend on them; rebase/split from this integration branch and keep the integrated branch as the source of truth until all focused reviews have landed.

## Verification status from GPT Web

No tests, typecheck, lint, build, database migration, seed, or running-service verification can be executed from GPT Web. All executable verification is the local/orchestrating agent's responsibility. The implementation must still include regression tests as source code and this plan must list the commands that should be run.