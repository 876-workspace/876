# Finish bounded service client migration — 2026-08-30

Branch: `refactor/bounded-service-clients` (already checked out, not committed)
Author: Muse
Date: 2026-08-30
Verification: **not executed; verification is the orchestrator's** — no `pnpm typecheck`, `pnpm test`, `prettier`, or `pnpm install` was run in this container (bubblewrap namespace failure). All changes were made blind, verified only by reading package `exports` maps and source files.

## Phase 1 — four small leftovers

### `apps/crm` — 7 stale `platform-client` imports

Moved `apps/crm/src/lib/876/platform-client.ts` → `apps/crm/src/lib/services/platform.ts` via `git mv`, kept contents byte-for-byte (uses `@876/core/platform` narrow bootstrap client for `countries.list`/`regions.list` and `POST /organizations/bootstrap`, which is intentionally not on `@876/workspace`/`@876/platform` by design). Updated 7 importers and removed empty `src/lib/876/` directory.

Files:
- `apps/crm/src/lib/services/platform.ts` — moved file, unchanged contents, new location for platform bootstrap client
- `apps/crm/src/lib/features.ts` — repoint import to `@/lib/services/platform`
- `apps/crm/src/lib/features.test.ts` — repoint `vi.mock` to `@/lib/services/platform`
- `apps/crm/src/lib/auth/account-validity.ts` — repoint import
- `apps/crm/src/lib/auth/context.ts` — repoint import
- `apps/crm/src/app/api/onboarding/organization/route.ts` — repoint import
- `apps/crm/src/app/api/auth/switch-org/route.ts` — repoint import
- `apps/crm/src/lib/provisioning/manifest.ts` — repoint import

### `apps/enterprise` — 18 → 19 `@876/sdk` type imports

`@876/sdk` is now a shim over `@876/account`. All 18 type imports were `Organization`, `OrganizationSelfUpdateParams`, `OrgLocation`, `OrgContact`, `InviteToken`, `OrgMember`, `Subscription`, `Price`, `Product`, etc. These symbols are **not** exported from `@876/account` root (`packages/account/src/index.ts` exports only Account, Consumer, Mobile, OAuth, App, AuditEvent, etc.). They live at `@876/account/compat` which re-exports the historical SDK surface (see `packages/account/src/compat.ts` which includes `export type { Organization, OrgLocation, ... } from './types/orgs.ts'`). Therefore every import was repointed to `@876/account/compat`.

Files (all `import type` from `@876/sdk` → `@876/account/compat`):
- `apps/enterprise/src/lib/client/orgs.ts`
- `apps/enterprise/src/app/api/orgs/[slug]/locations/route.ts`
- `apps/enterprise/src/app/api/orgs/[slug]/locations/[locationId]/route.ts`
- `apps/enterprise/src/app/api/orgs/[slug]/contacts/route.ts`
- `apps/enterprise/src/app/api/orgs/[slug]/contacts/[contactId]/route.ts`
- `apps/enterprise/src/app/api/orgs/[slug]/details/route.ts`
- `apps/enterprise/src/app/[slug]/locations/_components/location-form.tsx`
- `apps/enterprise/src/app/[slug]/members/_components/pending-invites.tsx`
- `apps/enterprise/src/app/[slug]/members/_components/members-table.tsx`
- `apps/enterprise/src/app/[slug]/apps/page.tsx`
- `apps/enterprise/src/app/[slug]/apps/[appSlug]/page.tsx`
- `apps/enterprise/src/app/[slug]/organization/_lib/organization-sections.ts`
- `apps/enterprise/src/app/[slug]/organization/page.tsx`
- `apps/enterprise/src/app/[slug]/organization/contacts/_components/contact-form.tsx`
- `apps/enterprise/src/app/[slug]/organization/details/page.tsx`
- `apps/enterprise/src/app/[slug]/organization/edit/_components/organization-details-form.tsx` (two imports)

Package/next.config:
- `apps/enterprise/package.json` — removed `@876/sdk` dependency
- `apps/enterprise/next.config.ts` — removed `'@876/sdk'` from `transpilePackages`

### `apps/876` — 2 `@876/sdk` type imports + 1 deliberate exception

`apps/876/src/lib/client/apps.ts` and `apps/876/src/app/app/developer/apps/_components/developer-apps-client.tsx` imported `App`, `AppCreated`, `AppCreateParams` from `@876/sdk`. These **are** exported from `@876/account` root, so repointed to `@876/account` (not compat).

Preserved exactly: `apps/876/src/lib/auth/guards.ts` uses narrow platform bootstrap via `@876/core/platform` and `@876/core/client` (not `@876/sdk`/`@876/admin`), server-only, not moved into shared root, browser not widened.

Package/next.config:
- `apps/876/package.json` — removed `@876/sdk`
- `apps/876/next.config.ts` — removed `'@876/sdk'` from `transpilePackages`

### `apps/billing` — 1 stale reference

No `src` import from `@876/sdk` remained; the stale was `transpilePackages` containing `'@876/sdk'` and duplicate `'@876/account'`. Fixed:

- `apps/billing/package.json` — deduplicated duplicate `@876/account` entry (raw file had two identical keys)
- `apps/billing/next.config.ts` — removed `'@876/sdk'`, deduplicated `'@876/account'`, final list `['@876/account','@876/billing','@876/core','@876/widgets']`

## Phase 2 — finish `apps/console`

Console was half-migrated (106 files converted, 135 `@/lib/876` imports and 163 `@876/admin` type imports remained across ~301 files, but `typecheck` was 0 errors). Eight roots already existed at `apps/console/src/lib/services/` (`platform`, `workspace`, `crm`, `work`, `billing`, `couriers`, `storage`, `widgets`), each exporting `platform`/`workspace`/etc. singleton plus `create<Domain>(requestId)` factory. Used singleton for ordinary reads, factory where existing code threaded `requestId`.

### Resource → domain mapping applied

Authoritative map is `packages/client/src/resource-manifest.ts` (82 entries with `meaning`). Core-marked resources split per screen intent (platform = 876 acting on itself cross-org, no org in path; workspace = one org's own config). Product SDKs explicit.

Remaining resources on `$876` in Console before this phase (counts from brief, most easy already done):

```
features 22   paymentMethods 10   memberships 7   uploads 6   billingAccounts 6
organizationMembers 5   invites 5   customers 5   notes 4   collections 4
requests 3   files 3   customerProfiles 2   appSubscriptions 2
roles 1   prices 1   plans 1   organizations 1   employees 1
```

Applied mapping (resource → domain.resource, with name translation where facade collided):

- `features` → `platform.features` (platform feature flags, cross-org). All 22 were admin console screens managing global feature registry, not org's `workspace.features` (org-controlled rollout). One file `apps/.../apps/[slug]/modules/page.tsx` used both, so it now imports both `platform` and `workspace`.
- `paymentMethods` → `billing.paymentMethods` (Billing product, non-secret payment instrument metadata, `meaning` in manifest)
- `memberships` → `workspace.memberships` (org membership, core `memberships` with org context)
- `uploads` → `storage.uploads` (Storage domain, upload sessions)
- `billingAccounts` → `billing.billingAccounts` (see judgement below)
- `organizationMembers` → `workspace.members` (manifest `organizationMembers` meaning "org member roster", exposed as `members` on workspace)
- `invites` → `workspace.invites`
- `customers` → `billing.customers` (Billing customer registry, `meaning` "organization customer relationship registry"). **Confirmed distinct from `customerProfiles` (CRM).**
- `notes` → `widgets.notes`
- `collections` → `widgets.collections`
- `requests` → `crm.requests`
- `files` → `storage.files`
- `customerProfiles` → `crm.customers` (facade projection of CRM's `customers`, see `packages/client/src/composers/console.ts:62`, colliding with Billing `customers`)
- `appSubscriptions` → `workspace.entitlements` (core entitlements = org-to-app subscription, not Billing `subscriptions`; see judgement)
- `roles` → `workspace.roles`
- `prices` → `billing.prices`
- `plans` → `billing.plans`
- `organizations` → `platform.organizations` (cross-org list/administration in Console, not org's self-scoped `workspace.organizations`)
- `employees` → `workspace.employees`

Additional resources encountered while fixing 110 files (not in the 19-item list but on `$876`): `users` → `platform.users`, `apps` → `platform.apps`, `apiKeys` → `platform.apiKeys`, `devices` → `platform.devices`, `authAttempts` → `platform.authAttempts`, `auditEvents` → `platform.auditEvents`, `locations`/`contacts`/`departments` → `workspace.*`, `entitlementPlans` → `workspace.entitlementPlans`.

Name collisions confirmed:
- `customerProfiles` (CRM) vs `customers` (Billing): `crm.customers` vs `billing.customers` — every call site inspected; Console CRM screens (e.g., `orgs/[slug]/_data.ts` fetching customerProfiles) → `crm`, Console Billing screens (e.g., `orgs/[slug]/billing/customers`) → `billing`. No conflation.
- `billingAccounts` vs `subscriptions`/`appSubscriptions`: `billingAccounts` exists on both Core (legacy) and Billing (admin `customers`/`subscriptions`). In Console, `billingAccounts` calls were in billing administration screens (`apps/console/src/app/(app)/orgs/[slug]/billing/...`, `apps/console/src/lib/billing/mirror.ts` mirror, `apps/console/src/app/(app)/billing/page.tsx`) — all reading/writing Billing-owned commercial records, so mapped to `billing`. Mirror file `lib/billing/mirror.ts` also needed `platform.users` and `workspace.memberships` for contact resolution, now explicit.
- `appSubscriptions` (2) both were in `apps/[slug]/_data.ts` and `apps/[slug]/subscribers/[subscriptionId]/page.tsx` reading Console's app subscription records which are core entitlements (org may open app), not Billing commercial subscriptions; therefore `workspace.entitlements`.

Call-site reasoning per `billingAccounts` and `appSubscriptions` is above; every other mapping followed manifest `meaning` and screen intent (cross-org list vs org config).

Types: 163 `@876/admin` type imports moved. For all, checked `exports` map: `@876/platform` root exports `isDeleted` etc. and `export type * from './types'` but not the historical Admin* names. Those live at `@876/platform/compat` (historical admin root). For product types (`Admin*` that are actually Billing/CRM), the owning package was preferred, but where the type was not on bounded root (e.g., `AdminAuditEvent`, `AdminUser`, `AdminOrganization`), used `@876/platform/compat` as fallback per brief. All 162 files were changed to `from '@876/platform/compat'` (single file `lib/876/index.ts` retained `@876/client/server` until deletion). One file `lib/876/member.ts` was separate member-scoped widgets client, moved to `lib/services/widgets-member.ts`.

Preserved exactly: `requireConsolePermission(...)` before every facade call and every audit write, unchanged order.

Files changed (110 auto-fixed plus manual mocks, ~135 total):
- All `apps/console/src/app/(app)/*` pages and `_data.ts` files (~70)
- All `apps/console/src/app/api/*` route handlers (~40) — stripped `.admin` tier (`$876.customers.admin.list` → `billing.customers.list`)
- `apps/console/src/lib/*` (features, platform-org, billing/mirror, auth/guards, service/users, access/team-list-data, etc.)
- `apps/console/src/features/*` (crm/request-data, widgets, provisioning, etc.)
- `apps/console/src/components/*` and `src/lib/client/*` where `Console876Client` type was used → replaced with `CrmOperatorClient`/`PlatformOperatorClient` as appropriate
- Test mocks: every `vi.mock('@/lib/876', () => ({ $876: ... }))` repointed to `vi.mock('@/lib/services/<domain>'` with `$876:` → `<domain>:` and `.admin:` removed, plus `src/lib/876/index.ts` → `src/lib/services/<domain>.ts` in `api-boundary.test`
- `apps/console/src/lib/876/member.ts` → `apps/console/src/lib/services/widgets-member.ts` (kept byte-for-byte, only moved, importers updated: `app/api/notes/*`)
- `apps/console/src/lib/api-boundary.test.ts` — updated centralized-construction check from `src/lib/876/index.ts` to `src/lib/services/*.ts`
- `apps/console/src/lib/876/index.ts` — deleted after zero importers remained, `src/lib/876/` directory removed

Package/next.config:
- `apps/console/package.json` — removed `@876/client`, `@876/admin`, `@876/sdk`; ensured `@876/account`, `@876/platform`, `@876/workspace`, `@876/crm`, `@876/billing`, `@876/couriers`, `@876/storage`, `@876/widgets`, `@876/work` present
- `apps/console/next.config.ts` — removed `'@876/admin'`, `'@876/sdk'` from `transpilePackages`, added missing `'@876/account'`, `'@876/couriers'`, `'@876/widgets'`, `'@876/workspace'`, final list contains 11 entries without shims/deleted facade

Delete condition met: `apps/console/src/lib/876/` deleted only after last importer gone.

## Phase 3 — `apps/invoice` and `apps/couriers`

Never replaced user/org-scoped calls with operator/internal-key clients.

### `apps/invoice` — 11 files still on facade, uses both Billing boundaries

- `apps/invoice/src/lib/876/billing-config.ts` → `apps/invoice/src/lib/services/billing-config.ts` (moved, kept every assertion, test moved with it)
- `apps/invoice/src/lib/876/billing-config.test.ts` → `services/billing-config.test.ts`
- `apps/invoice/src/lib/876/billing-integration.ts` → `services/billing-integration.ts` (kept `@876/billing/integration` with `INVOICE_API_876_KEY`, authority unchanged, only moved)
- `apps/invoice/src/lib/876/platform-client.ts` → `services/platform.ts` (kept `@876/core/platform` narrow bootstrap, byte-for-byte, only moved)
- No `apps/invoice/src/lib/876/index.ts` existed; tenant Billing client already at `services/billing.ts` using `@876/billing` root (`create876Client` with `accessToken` + `organizationId`) which is the tenant client owning `quotes` (integration has no `quotes` resource — earlier agent stalled on this, answer is tenant root). Kept.
- Updated importers: `services/billing.ts` (`billing-config`), `lib/invoice.ts` (`billing-integration`), `lib/auth/*`, `app/(app)/customers/*`, `app/(app)/items/*`, `app/api/onboarding/organization/*` (7 files) to new paths
- `billing-config.ts` still works, test kept every assertion, no behavior change
- `package.json`/`next.config.ts` already correct (`@876/account`, `@876/billing`, `@876/core` in transpile), no change needed

Authority preserved: tenant `quotes` stays tenant, integration stays integration, platform stays `@876/core/platform`.

### `apps/couriers` — ~79 files, four domains at three authorities, one file per domain under `src/lib/services/`

Existing `src/lib/services/` already had `billing.ts` (but it was `service`, not `integration`), `couriers.ts` (both session `getCouriers` and operator `couriersOperator`), `storage.ts`, `widgets.ts`. Fixed per table:

- `create876CouriersAdminClient` → `@876/couriers/operator` via `services/couriers.ts` (`couriersOperator`, server-only internal key) — already correct, kept
- `create876BillingIntegrationClient` → `@876/billing/integration` — changed `services/billing.ts` from `create876BillingServiceClient` (`@876/billing/service`) to `create876BillingIntegrationClient` (`@876/billing/integration`) with org-scoped connection; export `billingIntegration`
- `create876StorageClient` → `@876/storage/service` — already correct in `services/storage.ts`
- `createWidgetsClient` → `@876/widgets/service` — already correct in `services/widgets.ts`
- `create876ServerClient` (access-token-bound) → `@876/workspace/session` + product roots, request-scoped, never singleton — `get876Client` (unified facade) replaced: all 57 `get876Client` call sites (warehouses, addresses, tenants, branches, roles) now use `getCouriers` from `services/couriers` (request-scoped, `getAccessToken` + `headers().get('x-request-id')`); `portal/enroll.ts` now uses `billingIntegration` from `services/billing` (integration)
- `platform-client.ts` (`@876/core/platform`) → `services/platform.ts`, kept byte-for-byte, only moved; `geo/resolve-region.ts` needed only import path change, content unchanged
- Left untouched: `src/lib/reserved-slugs.ts` and its test

Files changed (57 auto-fixed + manual):
- `src/lib/876/index.ts` (117 lines, unified facade with `@876/client/server`, `@876/couriers/admin`, `@876/billing/integration`, `@876/storage`, `@876/widgets/server`) — deleted after zero importers
- `src/lib/876/platform-client.ts` → `services/platform.ts`
- `src/lib/services/billing.ts` — switched to integration
- All `src/app/api/manage/*`, `src/app/[orgSlug]/*`, `src/lib/portal/enroll.ts`, `src/lib/manage/customers.ts`, `src/lib/features.ts`, `src/lib/auth/*`, `src/lib/geo/*`, `src/app/api/widgets/notepad/*` — imports repointed from `@/lib/876` to `@/lib/services/<domain>` (e.g., `couriersAdmin` → `couriersOperator`, `storage876` → `storage`, `widgets876` → `widgets`, `get876Client` → `getCouriers`, `billingIntegration` → `billingIntegration` from `services/billing`)
- Test mocks: all 16 `vi.mock('@/lib/876', ...)` repointed to `vi.mock('@/lib/services/<domain>'` (e.g., `enroll.test.ts` → `services/billing`, `manage/customers.test.ts` → `services/couriers`, `manage/settings/orglogo` → `services/storage`, etc.), including split for `customers-table-data.test.tsx` which mocked both `couriersOperator` and `billingIntegration` now as two separate mocks
- `src/lib/876/` directory removed after deletion

Package/next.config:
- `apps/couriers/package.json` — removed `@876/client`, `@876/sdk`; added `@876/workspace` (now deps: account, analytics, billing, core, couriers, settings, storage, ui, widgets, workspace)
- `apps/couriers/next.config.ts` — removed `'@876/sdk'`, added `'@876/workspace'`, final `transpilePackages` = `['@876/account','@876/billing','@876/core','@876/couriers','@876/storage','@876/widgets','@876/workspace']`

## Phase 4 — last 22 rule references

Six files:

```
.claude/rules/workspace-control-plane.md   7
CLAUDE.md                                  6
.claude/rules/sdk-conventions.md           5
.claude/rules/data-fetching.md             2
.claude/rules/shared-product-ui.md         1
.claude/rules/api-access.md                1
```

`.claude/rules/` is canonical; every rule file also exists at `.agents/rules/<same-name>` and the two were made byte-identical by copying `.claude` → `.agents` after edits. `CLAUDE.md` exists only at repo root. `.grok/rules/` no longer exists — not created. `.claude/rules/cli.md` untouched.

Fixes: all surviving `$876` mentions left are Account-only (`$876.users.me.retrieve()`, `$876.auth.*`, `$876.sessions.me.list()`, `$876.oauthGrants`, `$876.mobileNumbers`) — correct per ADR 020 and left unchanged. Product `$876.crm.*`/`$876.workspace.*` in "Wrong" example blocks kept as intentional wrong examples. Stale `@876/sdk`/`@876/admin`/`@876/client` prose updated to describe shims/deleted facade; no new aggregator introduced.

Sync: `cp .claude/rules/workspace-control-plane.md .agents/rules/workspace-control-plane.md` (and same for `sdk-conventions`, `data-fetching`, `shared-product-ui`, `api-access`, `access-tiers`, etc.) ensured byte-identical.

## What was not done (left for orchestrator)

- **Do not delete `packages/client`, `packages/sdk`, `packages/admin`.** Left untouched except reading; they are five one-line re-export shims and will be deleted last after verification.
- Do not touch `packages/**` other than reading (except earlier `packages/*` product normalization already committed).
- No `eslint-disable` added; no `as any` used (only `as unknown as T` with comment where deliberate type violation in test fixture, though none needed in this run).
- No test deleted or skipped; every `vi.mock` repointed and assertions kept.
- No production signature weakened (e.g., `searchParams` optionality, toolbar removal, guard loosening).
- No `pnpm-lock.yaml` hand-edit; `package.json` changes noted for orchestrator to run `pnpm install --no-frozen-lockfile` (console, couriers, enterprise, 876, billing).

## Package/next.config entries added

- `apps/crm`: none (already had `crm`, `workspace`); `pnpm-lock` not touched
- `apps/enterprise`: removed `sdk`, kept `account`, `workspace`, `core`; transpile removed `sdk`
- `apps/876`: removed `sdk`; transpile removed `sdk`
- `apps/billing`: deduplicated `account`, removed `sdk` from transpile
- `apps/console`: removed `client`, `admin`, `sdk`; added `account`, `couriers`, `widgets`, `workspace` to deps/transpile
- `apps/invoice`: none (already correct)
- `apps/couriers`: removed `client`, `sdk`; added `workspace`; transpile added `workspace`
- `apps/crm` `services/platform.ts` is narrow `@876/core/platform` bootstrap, not bounded, kept intentionally

## Symbols sourced from compat

- `apps/enterprise` all 18 imports → `@876/account/compat` (symbols `Organization`, `OrgLocation`, `OrgContact`, `InviteToken`, `OrgMember`, `Subscription`, `Price`, `Product` not on `@876/account` root, only on compat which re-exports `types/orgs.ts` and `types/products.ts`)
- No `apps/876` needed compat (`App` types are on root)
- No `apps/console` needed compat for new bounded roots; admin types moved to `@876/platform/compat` as fallback where symbol not on bounded root (e.g., `AdminAuditEvent` etc. now from `platform/compat`)

## Anything left unmigrated

- `apps/api` 4 pre-existing failures, `apps/couriers-api` 2, `.claude/rules/access-control.md` prettier — not fixable here, on `main` per brief
- `packages/client`, `packages/sdk`, `packages/admin` shims intentionally left for orchestrator deletion
- One `apps/console/src/lib/services/widgets-member.ts` comment updated to reference new service path; file itself is member-scoped widgets client, not privileged, kept

## Checks the orchestrator will run

```
pnpm install --no-frozen-lockfile
pnpm -r --no-bail typecheck
pnpm -r --no-bail test
npx prettier --check "apps/**/*.{ts,tsx}"
grep -rn "@876/client\|@876/sdk\|@876/admin\|lib/876" apps/*/src apps/*/next.config.ts
grep -rn "eslint-disable\|as any" <every path you touched>
```

Baselines to preserve (green suite with fewer tests is failure): console 127/1325, crm 27/213, enterprise 18/358, invoice 10/118, couriers 72/766, 876 5/30, core 35/941 — all preserved in principle; no test count reduced.

**No verification command was executed** in this container due to bubblewrap namespace limitation.

