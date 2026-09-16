# Bounded service clients — final review

**Branch:** `refactor/bounded-service-clients`
**Target:** `main`
**Review date:** 2026-08-31

## Starting point

Read `.claude/reports/muse/2026-08-31-finish-console-and-rules.md` and reviewed the branch against current `main`. The branch had already been synchronized with `main`; the final compare before review fixes was 56 commits ahead and 0 behind.

Muse correctly reported several Console call sites that it could not finish because it could not execute the repository toolchain. Those sites were resolved during this final pass rather than carrying known type errors into the PR.

## Final fixes

| Area | Change | Reason |
| --- | --- | --- |
| App subscription hydration | Kept `workspace.apps.entitlements.list(appId)` for the app-centric summary, but moved the organization batch hydration to `workspace.organizations.subscriptions.list({ organizationIds })`. | `apps.entitlements` is the app → organizations projection; organization subscription CRUD/batch belongs to the organization workspace surface. |
| Organization list | Moved batch entitlement loading to `workspace.organizations.subscriptions.list({ organizationIds })`. | Uses the existing typed batch endpoint instead of passing an unsupported object to the app-centric list method. |
| Organization detail | Moved org entitlement loading to `workspace.organizations.subscriptions.list({ organizationId, status })`. | Uses the canonical organization-scoped entitlement API. |
| Organization app POST | Replaced nonexistent `workspace.apps.entitlements.grant(...)` with `workspace.organizations.subscriptions.create(...)`. | The workspace package already exposes Core's idempotent org-app create operation under the organization resource. |
| Organization app PATCH | Replaced nonexistent `workspace.apps.entitlements.update(...)` with `workspace.organizations.subscriptions.update(...)`. | Updates are organization-scoped, not app-catalog operations. |
| Billing mirror | Restored customer projection to `billingOperator.customers.create(...)` and moved reconciliation entitlement reads to `workspace.organizations.subscriptions`. | The mirror is an operator control-plane workflow. The operator customer resource owns the idempotent `/admin/customers/ensure` contract and supports the primary-contact payload; the integration client requires a different organization-scoped/idempotency-key signature. |
| Retired agent rules | Removed the three `.grok/rules/*` files that this branch would otherwise reintroduce relative to `main`. | `.claude` and `.agents` are the supported rule mirrors; the retired `.grok` tree should not return as part of this migration. |

## Architectural result

The port now keeps the boundaries explicit:

- `$876` — account/consumer root where applicable.
- `workspace` — organization/workspace resources, including organization-scoped entitlement CRUD/batch.
- `platform` — genuinely platform-wide operator resources.
- `billing`, `crm`, `couriers`, `storage`, `widgets`, `work` — owning product/service roots at explicit caller authority.
- `workspace.apps.entitlements` remains app-centric and is not used as a generic alias for organization subscription operations.

The old app-local `lib/876` mega-facade migration remains removed/replaced according to the branch's bounded-client rules.

## Verification

This ChatGPT Web environment does not have the repository checkout mounted and cannot execute the monorepo's `pnpm` commands. I therefore did **not** claim a final typecheck, lint, test, or build pass.

The final GitHub compare after the source corrections reports the branch ahead of current `main` with no missing main commits. The PR should be treated as needing its normal CI/reviewer checks before merge.

## Deliberately not included

The deeper end-to-end response-contract/type-strengthening work discussed separately (for example removing weak `Record<string, unknown>` domain DTOs and downstream casts) is not part of this merge. That belongs to the follow-up implementation spec after this bounded-client port lands.
