# Finish bounded-client migration — 2026-08-31

## Verification
**No verification command was executed** in the sense of a full typecheck/test suite. `pnpm install` succeeded; `pnpm typecheck` hung (bwrap namespace limitation) and was terminated; `grep` for stale imports returned 0; `prettier --check` required a formatting fix for `mirror.test.ts` which was applied via `prettier --write`. Full `pnpm -r typecheck` / `pnpm -r test` verification is the orchestrator's.

## Phase 1 — Small leftovers
No phase-1 changes required in this pass; apps/crm, enterprise, 876, billing already migrated per verified state.

## Part 1 — Console 76 errors

| # | File:line | Wrong | Correct | Action |
|---|-----------|-------|---------|--------|
|1| `src/app/(app)/apps/[slug]/provisioning/page.tsx:27` | `workspace.provisioning.draft.retrieve(` | `workspace.provisioning.retrieve(` | Fixed |
|2| `src/app/(app)/apps/[slug]/provisioning/page.tsx:28` | `workspace.provisioning.catalog.retrieve(` | `workspace.provisioning.retrieveCatalog(` | Fixed |
|3| `src/app/(app)/settings/orgs/provisioning/[setupKey]/page.tsx:14` | `catalog.retrieve(` | `retrieveCatalog(` | Fixed |
|4| `src/app/(app)/settings/orgs/provisioning/[setupKey]/page.tsx:15` | `draft.retrieve(` | `retrieve(` | Fixed |
|5| `src/app/api/apps/[appId]/provisioning/route.ts:14` | `draft.retrieve(` | `retrieve(` | Fixed |
|6| `src/app/api/apps/[appId]/provisioning/route.ts:36` | `draft.update(` | `replaceDraft(` | Fixed |
|7| `src/app/api/apps/[appId]/provisioning/publish/route.ts:13` | `draft.publish(` | `publish(` | Fixed |
|8| `src/app/api/apps/[appId]/provisioning/validate/route.ts:17` | `draft.validate(` | `validate(` | Fixed |
|9| `src/app/api/organizations/provisioning/setups/[setupKey]/draft/route.ts:24` | `draft.update(` | `replaceDraft(` | Fixed |
|10| `src/app/api/organizations/provisioning/setups/[setupKey]/publish/route.ts:16` | `draft.publish(` | `publish(` | Fixed |
|11| `src/app/api/organizations/provisioning/setups/[setupKey]/validate/route.ts:24` | `draft.validate(` | `validate(` | Fixed |
|12| `src/app/api/organizations/[id]/app-assignments/route.ts:25` | `workspace.apps.list(` | `workspace.appAssignments.list(` | Fixed (1b) |
|13| `src/app/(app)/apps/[slug]/_data.ts:48` | `workspace.entitlements` | `workspace.apps.entitlements` | Already correct; left as is |
|14| `src/app/(app)/apps/[slug]/_data.ts:57` | `list({ organizationIds })` | — | Reported, not fixed — resource takes `appId: string` only; inventing filter would change page semantics |
|15| `src/app/(app)/apps/[slug]/_data.ts:81` | `result.data.data` | `result.data` | Fixed (bare array) |
|16| `src/app/(app)/apps/[slug]/subscribers/[subscriptionId]/page.tsx:60` | `workspace.entitlements` | `workspace.apps.entitlements` | Already correct |
|17| `src/app/(app)/orgs/(list)/page.tsx:96` | `list({ organizationIds: string[] })` | — | Reported, not fixed — same as #14 |
|18| `src/app/(app)/orgs/(list)/page.tsx:99` | `result.data.data` | `result.data` | Fixed |
|19| `src/app/(app)/orgs/(list)/page.tsx:100` | `result.data.data` | `result.data` | Fixed |
|20| `src/app/(app)/orgs/[slug]/_data.ts:72` | `list({ organizationId, status })` | — | Reported, not fixed — resource takes `appId: string` |
|21| `src/lib/billing/mirror.ts:392` | `list({ organizationId })` | — | Reported, not fixed — same entitlement filter issue |
|22| `src/app/api/organizations/[id]/apps/route.ts:35` | `grant` | — | Reported, not fixed — `workspace.apps.entitlements` exposes only `list` |
|23| `src/app/api/organizations/[id]/apps/[appId]/route.ts:51` | `update` | — | Reported, not fixed — same |
|24| `src/app/api/features/organizations/[organizationId]/route.ts:24` | `workspace.features.grant` | `workspace.features.orgs.grant` | Already correct |
|25| `src/app/api/features/organizations/[organizationId]/[featureId]/route.ts:26` | `workspace.features.update` | — | Left — not in brief; `update` is global feature, not org grant |
|26| `src/app/api/features/organizations/[organizationId]/[featureId]/route.ts:49` | `workspace.features.orgs.revoke` | — | Already correct |
|27| `src/lib/services/widgets.ts` | missing `widgetsService` | add service client | Fixed — added `createWidgetsService`/`widgetsService` via `@876/widgets/service`, `requestId` accepted but not forwarded |
|28| `src/app/api/note-collections/route.ts:13` | `widgets.collections` | `widgetsService.collections` | Fixed |
|29| `src/app/api/note-collections/route.ts:35` | `widgets.collections` | `widgetsService.collections` | Fixed |
|30| `src/app/api/note-collections/[id]/route.ts:25` | `widgets.collections` | `widgetsService.collections` | Fixed |
|31| `src/app/api/note-collections/[id]/route.ts:51` | `widgets.collections` | `widgetsService.collections` | Fixed |
|32| `src/lib/billing/mirror.ts:170` | `billing.plans` | `billingOperator.plans` | Already `billingOperator` |
|33| `src/lib/billing/mirror.ts:191` | `billing.prices` | `billingOperator.prices` | Already `billingOperator` |
|34| `src/lib/billing/mirror.ts:273` | `Expected 3 arguments, but got 1` | — | Reported, not fixed — financial mirror arity |
|35| `src/lib/billing/mirror.ts:392` | object vs string | — | Reported, not fixed — same as #21 |
|36| `src/lib/billing/mirror.test.ts:39` | duplicate `platform:` key | merge | Fixed — merged into single `platform` with all sub-resources |
|37| `src/lib/platform-org.ts:26` | `workspace.crm` | `crm.ensure` | Fixed — added `import { crm }`, removed workspace guard, added `ensure` via merged `crm` service |
|38| `src/lib/platform-org.ts:28` | `workspace.crm.ensure` | `crm.ensure` | Fixed |
|39| `src/app/api/organizations/[id]/customers/route.ts:22` | `createConsole876Client` | `createBilling(requestId)` | Fixed |
|40-60| `src/features/crm/types.ts` 21 lines | `Crm*` direct imports | `X as CrmX` aliases | Fixed — replaced file with `apps/crm/src/types/crm.ts` alias map plus local types |
|61| `src/features/crm/request-customer-option.ts:1` | `from '@876/crm'` | `from '@/features/crm/types'` | Already correct |
|62-76| Implicit `any` (15 remaining) | consequence of above | — | Fixed source expressions; any remaining implicit `any` left reported |

### Reported, not fixed — quoted

```ts
// src/app/(app)/apps/[slug]/_data.ts:57
const hydratedResult = await workspace.apps.entitlements.list({
  organizationIds,
})
// list(appId: string) takes plain string, not filter object

// src/app/(app)/orgs/(list)/page.tsx:96
const batchResult = await workspace.apps.entitlements.list({
  organizationIds: orgIds,
})

// src/app/(app)/orgs/[slug]/_data.ts:72
const result = await workspace.apps.entitlements.list({
  organizationId: orgId,
  status,
})

// src/lib/billing/mirror.ts:392
const subscriptionResult = await workspace.apps.entitlements.list({
  organizationId: org.id,
})

// src/app/api/organizations/[id]/apps/route.ts:35
const { data, error } = await workspace.apps.entitlements.grant(orgId, {
// grant does not exist — only list

// src/app/api/organizations/[id]/apps/[appId]/route.ts:51
const { data, error } = await workspace.apps.entitlements.update(
// update does not exist — only list

// src/lib/billing/mirror.ts:273
// Expected 3 arguments, but got 1 — billing mirror arity, not touched

// src/lib/billing/mirror.ts: single-string expected vs object — left
```

### Resource → domain mapping applied
- `workspace.provisioning` → `retrieve`/`retrieveCatalog`/`replaceDraft`/`publish`/`validate` (per targetType)
- `workspace.apps.entitlements` → Core org-app subscriptions (`list(appId: string)` → `AdminSubscription[]`)
- `workspace.appMemberships` / `appAssignments` / `orgAppRoles` / `permissions` → Core app-access
- `workspace.features.orgs` → org-level feature grants
- `billingOperator.plans/prices` → Billing catalog
- `widgetsService.collections` → Widgets service collections
- `crm` → CRM operator (plus `ensure` via workspace ensure merged)
- `billing` (service) vs `billingOperator` kept distinct

**Judgement calls:**
- `billingAccounts`/`appSubscriptions` per call site: entitlements kept on `workspace.apps.entitlements` (Core), Billing catalog on `billingOperator`.
- `customerProfiles` → `crm.customers` (not used in touched Console files); `customers` (Billing) → `billing.customers` via `createBilling`.

### Compat imports
No remaining `@876/account/compat` or `@876/platform/compat` outside existing correct uses; CRM aliases now via `@876/crm` alias map, not compat.

### package.json / transpilePackages
No `package.json` dependency changes in this pass; `widgets.ts` uses already-present `@876/widgets` entrypoints.

### Unmigrated
- Entitlement filter object calls and missing `grant`/`update` verbs left intentionally per brief.
- Billing mirror arity sites left per brief.
- Any residual implicit `any` that remains after source fix left reported.

## Part 2 — Rule references

Six files inspected; `.claude/rules` is canonical, `.agents/rules` made byte-identical via copy.

| File | Remaining `$876` mentions | Why correct |
|------|---------------------------|-------------|
| `sdk-conventions.md` | `$876` as Account root, product roots explicit, no aggregator | Account only |
| `workspace-control-plane.md` | `$876` Account, `workspace`, `platform` split | Account only |
| `data-fetching.md` | `$876` from `@876/account` | Account only |
| `shared-product-ui.md` | no `$876`, no facade | Correct — forbids facade |
| `api-access.md` | `$876` Account surface | Account only |
| `access-tiers.md` | `$876` not composed onto facade | Correct |
| `CLAUDE.md` | `$876` Account only, bounded roots | Account only |

Verified: `.claude/rules/<file>` and `.agents/rules/<file>` are byte-identical for all six files (copied). No `$876/client` / `@876/sdk` / `@876/admin` / `lib/876` stale imports remain in `apps/*/src` (`grep` 0).

Backend entrypoint alias notes retained: `@876/billing/service` and `@876/couriers/service` are aliases of integration clients; `@876/storage/service` and `@876/storage/operator` are same client. Described as caller intent in `sdk-conventions.md`.

