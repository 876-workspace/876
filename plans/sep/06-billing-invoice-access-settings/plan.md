# Implementation Plan: Billing & Invoice access settings (roles + users)

Run ID: `2026-09-06-billing-invoice-access-settings`
Branch: `feature/customer-sidebar-icons` (cut a feature branch before Phase 1)
Status: COMPLETED ✅

## Objective

Give 876 Billing and 876 Invoice a complete Settings surface for **roles and
users** — full CRUD, shared UI, and per-app default role provisioning — without
introducing a second implementation of anything.

## What already exists (verified, do not rebuild)

| Capability | Where | State |
| --- | --- | --- |
| Per-app permission catalogs for `876-billing` and `876-invoice` | `packages/core/src/access/catalogs.ts:218-256` | **complete and already separate** — Invoice's catalog has no `subscriptions`/`banking`/`purchases`/`vendors` modules |
| Per-app default app-role templates (super-admin / admin / staff) derived from each app's own catalog | `apps/api/src/services/app-role-provisioning-catalog.ts`, `apps/api/src/seeds/app-access.ts:113-137` | **complete** — materialized at org provisioning by `materializeEntitledAppRoles` |
| Session-tier org app-role CRUD in the identity API | `apps/api/src/modules/app-access/app-access.routes.ts:195-272` | complete (GET/POST/GET/PATCH/DELETE, `security: 'session'`) |
| Finance-plane role/member CRUD | `apps/billing-api/src/modules/access/access.routes.ts` | complete |
| Billing roles UI (card grid) + invite + members table | `apps/billing/src/app/(app)/settings/roles`, `apps/billing/src/features/access/components/` | works, wrong layout pattern, not shared |
| Invoice roles UI | — | **absent** |
| Invoice member invite | — | **absent** |
| Finance-plane default roles beyond `super-admin` | `apps/billing-api/src/modules/tenants/tenants.repository.ts:140-192` | **absent** — only `super-admin` is seeded, with the full Billing permission set, for every tenant including Invoice-only orgs |

## Design decisions

### 1. Invoice does **not** get its own database

One financial data plane stays. Reasons:

- The separation the user actually wants is *roles and permission defaults*,
  and those do not live in `billing-api` at all — the app-access catalogs and
  role templates live in the core identity database and are **already
  per-app**. Splitting Postgres would not change them.
- `finance-app-parity.md` and `product-org-signup.md` both promise that an org
  that starts on Invoice and later activates Billing "directly sees the same
  customers, invoices, and quotes… nothing is copied and nothing is lost."
  A separate Invoice database converts that entitlement flip into an ETL
  migration — the worst outcome for exactly the Invoice-only users this was
  meant to protect.
- Invoice-only tenancy is already expressed by rows that do not exist. An
  Invoice-only tenant simply has no subscription, banking, purchase or vendor
  rows. Empty tables cost nothing.

### 2. Two planes, each with one job — neither is removed here

| Plane | Answers | Storage | Settings surface |
| --- | --- | --- | --- |
| **App access** (core) | May this person open Billing/Invoice, and under which app role? | core identity DB, per-app catalogs | `/settings/users/[membershipId]/access` and `/permissions` (already built in both apps) |
| **Finance workspace** (billing-api) | What may they do to finance data? | `billing_roles` / `billing_members`, tenant-scoped | `/settings/roles`, `/settings/users` |

The finance plane is the one `billing-api` actually enforces on every tenant
route, and Invoice reaches billing-api with the user's own access token — so
**Invoice's role editor must drive the finance plane**, or it would present
roles that change nothing. Collapsing the two planes onto app-access is a real
and desirable migration (`apps/billing/src/types/permission-values.ts` already
carries the TODO), but it is a contract-breaking cross-service change and is
explicitly **out of scope for this run**; it gets its own plan.

### 3. Per-app defaults are achieved with **permission surfaces** on the finance plane

`billing-api` gains an app-scoped surface declaration:

- `invoice` surface — the Invoice subset only.
- `billing` surface — the full set (superset of `invoice`).

Tenant provisioning seeds **super-admin / admin / staff** for the surface(s)
the organization is entitled to. An Invoice-only org therefore receives
Invoice-flavoured defaults containing no `subscriptions:*`, `banking:*`,
`purchases:*` or `vendors:*`. Activating Billing later **widens** the system
templates additively and never narrows an existing role.

Each app's role editor offers only its own surface. A role holding permissions
outside the current surface renders them read-only and preserves them on save —
so editing a shared role from Invoice can never silently strip Billing grants.

### 4. UI lives in `@876/billing-ui/panels`

Both hosts render the same panels (`finance-app-parity.md`): the panel is
shared, the composition is not. Panels render, never fetch; hrefs and actions
arrive as props. Layout follows `app-layout.md` §5a (`ListDetailShell` split
view), matching Console and CRM.

## Phases

- [x] **P1 — `@876/billing` roles + members resources** (Claude) — `packages/billing/src/resources/roles.ts`,
      `types/role.ts`, `types/role.schema.ts`, wired into `create876Client`.
      Extended mid-run when brief B correctly refused for want of a member surface:
      `client.members.update` at session authority, plus typed `members.list` /
      `members.resolve` projections on the server client, replacing the internal
      projection path strings the apps were hand-writing. 34 tests.
- [x] **P2 — one finance permission catalog + per-app surfaces** (Claude) —
      `packages/core/src/access/finance-catalog.ts` (+ 20 tests) now owns the finance
      permission keys, the Billing and Invoice surfaces, and the
      partition/merge/implication rules. `apps/billing-api`'s `SUPER_ADMIN_PERMISSIONS`
      is derived from it instead of restated, with a drift test at
      `apps/billing-api/src/modules/access/__tests__/finance-catalog-drift.test.ts`.
- [x] **P3 — `@876/billing-ui` shared access panels** (Codex, brief A) — 17 files,
      95 tests, typecheck/lint/test green (verified independently, not from the report).
- [x] **P4 — Invoice settings/roles + settings/users invite** (Codex, brief B) —
      settings/roles split view, member finance-role tab, invite flow, guarded
      `/api/roles`, `/api/members`, `/api/invites` route handlers, browser clients,
      and a Roles entry in the settings navigation. Delivered by Codex. 300 tests pass.
- [x] **P5 — Billing settings/roles + invite migrated onto shared panels** (Codex, brief C) —
      split view mounted from the layout, seven app-local components deleted, permission
      implication logic delegated to the core catalog with a drift test. Orchestrator fixes
      on top: restored the two distinct role-validation messages Codex had merged into one
      (a role missing workspace access and a role missing an implied read are different
      mistakes), and trimmed its sidebar-icon edit to the half that was a real fix —
      `ClipboardList` is an alias of `ClipboardDocumentListIcon` in `@876/ui`, so `items`
      and `sales` were rendering the same glyph and the distinctness test was already
      failing on this branch. Verified: typecheck, lint (0 errors), 817 tests, app-structure.
- [x] **P6 — integration, verification, commits** (Claude) —
      the duplicated permission helpers were reconciled onto
      `@876/core/access/finance-catalog`; the roles table was restyled to match
      the customers and items tables; two error-handling defects were fixed (see
      "Defects found" below).
  - [x] **Reconcile the duplicated permission helpers.** Brief A produced
        `packages/billing-ui/src/panels/access/permission-surface.ts` and the
        `FinancePermission*` types in its `types.ts`, which restate what
        `packages/core/src/access/finance-catalog.ts` now owns. Deliberately left
        until briefs B and C land rather than edited under two running agents.
        Keep the exported names and signatures so the panels and both hosts
        continue to compile; implement them over the core functions, and
        re-export the three `FinancePermission*` types from core so the UI-only
        summaries (`FinanceRoleSummary`, `FinanceMemberSummary`,
        `FinanceInviteSummary`, `FinanceActionResult`) are all `types.ts` still
        declares. Codex's `impliedPermissions(selected, surface, changed)`
        signature is better than core's two functions for a checkbox handler —
        preserve it as the adapter, built from `withImpliedFinancePermissions`
        and `withoutFinancePermission`.
  - [x] Re-run every suite in the Verification block after the reconcile.

## Verification

```bash
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
pnpm --filter @876/billing-ui typecheck && pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-api typecheck && pnpm --filter @876/billing-api lint \
  && pnpm --filter @876/billing-api boundaries && pnpm --filter @876/billing-api test \
  && pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

## Decisions taken during the run

**No new `billing-api` routes.** A tenant-tier `GET /members` and an idempotent
`PUT /members/:userId` grant were written and then reverted. `apps/billing-api`
freezes its public OpenAPI document against the original FastAPI contract
(`apps/billing/contracts/v1/openapi.json`, asserted by
`src/test/openapi-contract.test.ts` and the 216-operation auth matrix), and that
oracle exists to prove the Express port is faithful. Extending it for a settings
screen is the wrong trade while the port is still the thing being verified.
Both apps therefore use what already exists: the member roster comes from the
internal projection Billing already reads, role assignment uses the existing
`PATCH /members/:userId`, and role CRUD uses the existing `/roles` routes.

The consequence to carry forward: `PATCH /members/:userId` 404s for an
organization member who has no `billing_members` row yet, because access is
derived from their 876 organization role until an explicit grant exists. Billing
has this behaviour today, so Invoice inherits it rather than introducing it. The
idempotent grant belongs in the finance-plane follow-up plan.

**Finance role defaults stay shared, per workspace, not per app.** Narrowing the
seeded `super-admin`/`admin`/`staff` roles by entitlement would need machinery to
widen them when an Invoice org activates Billing, whose failure mode is a paying
Billing admin silently under-permissioned. Least privilege is delivered instead
by the *editing surface*: Invoice's role editor never shows a subscriptions,
banking, purchases or vendors permission, and a permission that addresses a
feature the product does not have grants nothing.

## Defects found and fixed

**A settings table that vanished on an unrelated failure.** Invoice's users layout passed `list={null}` when access verification was unavailable, and Billing's users loader let a finance-workspace failure reject the whole `Promise.all`. Either one removed the users table entirely. Both now keep the roster mounted and render the failure as a notice beside it, per `.claude/rules/error-handling.md`.

**Duplicate sidebar icons.** `ClipboardList` is an alias of `ClipboardDocumentListIcon` in `@876/ui`, so Billing's `items`/`sales` and Invoice's `items`/`invoices` rail entries rendered the same glyph. Both apps' `nav-icons.test.ts` distinctness assertions were already failing on this branch before this run started.

**A third copy of the finance permission list.** The keys were restated in `apps/billing-api`, `apps/billing`, and the tenant provisioning seed. One owner now, with drift tests on both remaining literal tuples.

**A merged validation message.** A role missing workspace access and a role missing an implied read had been collapsed into one error string; they are two different mistakes and are reported separately again.

**RSC client component functions boundary defect.** In Invoice's `RoleDetailPage`, `RoleMembersPanel` was constructed inside the Server Component with `memberHref` and `formatDate` function props and passed as JSX into the Client Component `RoleSection`. Next.js rejects functions passed across the RSC boundary. Reconciled to match Billing by passing `members` array directly into `RoleSection`, rendering `RoleMembersPanel` within the client boundary.

**Invite member card design in ListDetailShell.** Both Billing and Invoice's `settings/users/invite/page.tsx` erroneously wrapped the invite panel in `<Page>`, `<PageBreadcrumb>`, and `<PageHeader>`, disrupting the two-pane split layout. Converted `MemberInvitePanel` into a first-class `DetailCard` with `DetailCardHeader`, `closeHref`, `DetailCardBody`, `DetailCardSection`, and `DetailCardFooter`.

## Handoff state

The work is complete and every suite is green. Follow-ups comprise migrating Billing's enforcement plane onto the platform app-access plane (tracked by the TODO in `apps/billing/src/types/permission-values.ts`), and the idempotent member-grant route deferred to avoid extending the frozen FastAPI parity contract.
