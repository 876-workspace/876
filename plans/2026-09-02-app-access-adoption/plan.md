# Implementation Plan: App Access Profiles — CRM, Billing, Invoice adoption

- **Run ID:** `2026-09-02-app-access-adoption`
- **Integration branch:** `feature/app-access-adoption` (cut from `origin/main` @ `0db66bc0`)
- **Status:** IN_PROGRESS

## Overview

The app-access platform layer is already merged on `main` (schema, `apps/api/src/modules/app-access/`,
seeds, `workspace.apps.*`, `$876.appMemberships.me`). This run is an **adoption** project in three
Next apps — CRM, Billing, Invoice — plus the two platform gaps that make adoption possible.

Objectives:

1. Wire entitlement → app-role materialization so a provisioned org actually has app roles.
2. Give Billing and Invoice canonical permission catalogs in `@876/core/access`.
3. Promote the CRM settings hub to a shared `@876/ui` pattern; adopt it in Billing and Invoice.
4. Build a shared `@876/access-ui` package: member list rows + app-access panel.
5. Ship `/settings/users` (Console's list/detail split) in CRM, Invoice, then Billing.
6. Migrate Billing off its duplicate `billing_roles` / `billing_members` plane.
7. Surface ERM employment data (position, employee profile) in the member list and detail.

## Architectural scope

| Area          | Packages / apps                                               |
| ------------- | ------------------------------------------------------------- |
| Platform gaps | `apps/api`, `packages/core`                                   |
| Shared UI     | `packages/ui`, new `packages/access-ui`                       |
| Adoption      | `apps/crm`, `apps/invoice`, `apps/billing`                    |
| Follow-on     | `apps/console` (adopt shared panel, retire `member-apps.tsx`) |

Invariants:

- App access profiles live in **Core**, never in a product datastore (`.claude/rules/app-access.md`).
- `@876/access-ui` is presentation only — no clients, no session, no routing (`shared-product-ui.md`).
- Mutations go through thin per-app `/api/...` route handlers; no server actions (`app-api-routing.md`).
- Effective permissions resolve fail-closed in Core; apps never recompute them.

## Key design decisions

### D1 — No new database for Invoice

App-access data is Core-owned, so it motivates no per-app datastore. CRM (`CRM_DATABASE_URL`) and
Billing (`BILLING_DATABASE_URL`) already have their own provisioned databases. Invoice is a BFF over
Billing's integration boundary; invoices/customers/items are the _shared financial plane_ and must
stay in `billing-api` (`product-api-boundary.md`). Genuinely invoice-local config goes through the
`@876/settings` module/preference plane. Revisit only when a concrete invoice-owned entity appears —
and then as a Console-style app-local Prisma datastore, not a new `invoice-api` service.

### D2 — Billing migrates, it does not layer

`billing_roles` / `billing_members` are a second source of authorization truth, which
`.claude/rules/app-access.md` forbids. Billing moves onto Core app-access with a data migration and a
deprecation of `service.roles` / `service.members`. This is the highest-risk phase; it runs last.

### D3 — Shared `@876/access-ui`

All three apps plus Console need the identical app-role / grant / deny / effective-permission panel.
One implementation in a shared package, hosts pass data and callbacks.

### D4 — CRM hub is the standard, after two fixes

`apps/crm/.../settings/page.tsx` carries a description paragraph under its `<h1>` and uses
`text-lg font-semibold` instead of `876-page-title` — both violate `CLAUDE.md` → UI Copy and
`app-layout.md` §10b. The grid must become `sm:columns-2 lg:columns-3` + `break-inside-avoid`
(`app-layout.md` §10c). Fixed on promotion, not after.

## Verified premises (checked on `origin/main`, 2026-09-02)

| Premise                                               | Evidence                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| Core owns app access                                  | `apps/api/prisma/schema/app-{assignment,role,permission}.prisma`         |
| 22 routes exist incl. session `/members/me`           | `apps/api/src/modules/app-access/app-access.routes.ts:373`               |
| Seed registers crm/billing/invoice/couriers catalogs  | `apps/api/src/seeds/app-access.ts:89-112`                                |
| **`materializeEntitledAppRoles` has zero call sites** | grep: only its own definition + `index.ts` re-export                     |
| **`appPermissionCatalogs` lacks billing + invoice**   | `packages/core/src/access/catalogs.ts:203-207`                           |
| Billing has a duplicate plane                         | `apps/billing-api/prisma/schema/{role,member}.prisma`                    |
| CRM has no permission plane                           | `apps/crm/src/lib/auth/roles.ts` — org role only                         |
| Invoice has no permission plane                       | `apps/invoice/src/lib/auth/guards.ts` — session only                     |
| Invoice has no datastore                              | no `apps/invoice/prisma`, no `INVOICE_DATABASE_URL`                      |
| ERM data exists                                       | `apps/api/prisma/schema/employee-profile.prisma`, `memberships.position` |

## Phases

| #   | Phase                                                                           | Delegate                   | Status |
| --- | ------------------------------------------------------------------------------- | -------------------------- | ------ |
| 0   | Wire `materializeEntitledAppRoles`; add billing + invoice catalogs + drift test | orchestrator (Fable tier)  | [ ]    |
| 1   | Promote settings hub to `@876/ui`; adopt in Billing + Invoice                   | codex `gpt-5.6-terra` high | [ ]    |
| 2   | `@876/access-ui` — member rows, access panel, effective-permission preview      | codex `gpt-5.6-terra` high | [ ]    |
| 3   | CRM `/settings/users` split view + route handlers                               | codex `gpt-5.6-terra` high | [ ]    |
| 4   | Invoice `/settings/users` + hub                                                 | codex `gpt-5.6-terra` high | [ ]    |
| 5   | Billing migration off `billing_roles`/`billing_members`                         | orchestrator + codex       | [ ]    |
| 6   | ERM employment section + batch profile read                                     | codex `gpt-5.6-terra` high | [ ]    |
| 7   | Console adopts `@876/access-ui`, retires `member-apps.tsx`                      | codex `gpt-5.6-terra` high | [ ]    |

## Dispatched briefs

| Phase | Tool | Brief |
| ----- | ---- | ----- |

## Execution reports

| Phase | Tool | Report |
| ----- | ---- | ------ |

## Verification commands

```bash
pnpm --filter @876/api typecheck && pnpm --filter @876/api test && pnpm --filter @876/api boundaries
pnpm --filter @876/core typecheck && pnpm --filter @876/core test
pnpm --filter @876/ui typecheck
pnpm --filter @876/crm typecheck && pnpm --filter @876/crm test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
node scripts/check-app-structure.mjs
```

## Handoff state

Phases 0 and 0b are committed and green (`231948cc`, `5d91ea92`, `eed32cc8`,
`20414b58`, `75f697e6`, `e3442fe7`). Phase 1 is running under Codex
`gpt-5.6-terra` at high effort. Phase 2's brief is written and ready to dispatch.

Known pre-existing failure, **not** from this run: `packages/core/src/lib/phone.test.ts`
expects 32 dial codes and gets 41. Confirmed on `origin/main` by stashing. Out of
scope here.

`pnpm --filter @876/api boundaries` reports 25 violations on `origin/main` before
this run and 25 after it — the gate was already red; this run adds none.

## Open risk

Production migration state is unverified: Actions checks have been failing and prod may lag `main`,
so `app_permissions` / `app_roles` may not exist in production yet. Confirm before deploy.
