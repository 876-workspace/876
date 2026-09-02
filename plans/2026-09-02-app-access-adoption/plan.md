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

### D5 — Phase 0b was not in the original plan

Phase 3 depends on a session-tier client that did not exist. The API routes are
already `security: 'session'`, so this is a client-package gap, not a backend one —
but it blocks CRM, Invoice, and Billing equally, so it was closed before any app
work started. Done by the orchestrator rather than delegated, because choosing the
authority a resource is exposed at is an access-tier decision
(`.claude/rules/access-tiers.md`), not transport plumbing.

### D6 — Billing's permission keys do not map mechanically, and the gap must not widen access

Billing's own plane (`apps/billing/src/types/permission-values.ts`) uses 26
colon-delimited `<module>:read|write` keys. The canonical `876-billing` catalog uses
dot-delimited CRUD (`customers.view|create|edit|delete`). The module sets agree; the
action vocabularies do not, and `.claude/rules/naming.md` forbids deriving a
migration from a pattern substitution.

The explicit old-to-new map for Phase 5:

| Old                    | New                        | Why                                                                                                                                      |
| ---------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `<m>:read`             | `<m>.view`                 | one to one                                                                                                                               |
| `<m>:write`            | `<m>.create` + `<m>.edit`  | **not** `.delete` — a `:write` holder never had delete as a separable capability, so inferring it would widen access during a migration  |
| `billing:access`       | dropped                    | app entry is the entitlement, which Core already models as the subscription                                                              |
| `members:*`, `roles:*` | dropped from the app plane | these are organization-governance permissions; the canonical catalog correctly omits them and the organization role already carries them |

A role that held **every** billing permission (`super-admin`, `admin`) receives the
full catalog including `.delete`. A partial role receives view/create/edit and no
delete, and an administrator grants delete explicitly afterwards. Migrating a
partial role into delete rights is an access-widening write, which
`.claude/rules/access-control.md` requires to fail closed.

Phase 5 must ship a migration test asserting this map exactly, including that no
migrated partial role gains a `.delete` key.

## Verified premises (checked on `origin/main`, 2026-09-02)

| Premise                                                                                         | Evidence                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core owns app access                                                                            | `apps/api/prisma/schema/app-{assignment,role,permission}.prisma`                                                                                                                                                                                                                                         |
| 22 routes exist incl. session `/members/me`                                                     | `apps/api/src/modules/app-access/app-access.routes.ts:373`                                                                                                                                                                                                                                               |
| Org app-role and app-membership routes are `security: 'session'`                                | `app-access.routes.ts:194,274` — an org member reads, `apps:assign` authorizes writes                                                                                                                                                                                                                    |
| Seed registers crm/billing/invoice/couriers catalogs                                            | `apps/api/src/seeds/app-access.ts:89-112`                                                                                                                                                                                                                                                                |
| **`materializeEntitledAppRoles` had zero call sites**                                           | grep: only its own definition and the `index.ts` re-export. Closed in Phase 0.                                                                                                                                                                                                                           |
| **`appPermissionCatalogs` lacked billing + invoice**                                            | `packages/core/src/access/catalogs.ts` registry. Closed in Phase 0.                                                                                                                                                                                                                                      |
| **The session client exposed no org-scoped app access**                                         | `packages/workspace/src/session.ts` — `appMemberships` resolved to the self-scoped Account resource and there was no `orgAppRoles`. Closed in Phase 0b.                                                                                                                                                  |
| `workspace.members.list(orgId)` returns id, role, **position**, name, email, avatar in one call | `packages/account/src/types/orgs.ts:348` — the roster needs no per-row identity fetch, and the ERM position is already joined                                                                                                                                                                            |
| `workspace.members.retrieveMe(orgId)` returns the caller's effective org permissions            | `packages/account/src/resources/orgs.ts:779` — the basis for the CRM guard                                                                                                                                                                                                                               |
| `workspace.employees.list(orgId)` returns every employee profile in one call                    | `packages/platform/src/resources/orgs.ts:466` — no batch route needed for the ERM phase                                                                                                                                                                                                                  |
| **Billing and Invoice run vitest on `environment: 'node'`**                                     | `apps/{billing,invoice}/vitest.config.ts:20`. Their existing component tests opt in per file with a `// @vitest-environment jsdom` docblock. A component test written without it never executes — the exact failure `cli.md` records from a prior delegated pass. CRM and `@876/ui` are already `jsdom`. |
| Billing has a duplicate authorization plane                                                     | `apps/billing-api/prisma/schema/{role,member}.prisma`                                                                                                                                                                                                                                                    |
| CRM has no permission plane                                                                     | `apps/crm/src/lib/auth/roles.ts` — org role only                                                                                                                                                                                                                                                         |
| Invoice has no permission plane                                                                 | `apps/invoice/src/lib/auth/guards.ts` — session only                                                                                                                                                                                                                                                     |
| Invoice has no datastore                                                                        | no `apps/invoice/prisma`, no `INVOICE_DATABASE_URL`                                                                                                                                                                                                                                                      |
| ERM data exists                                                                                 | `apps/api/prisma/schema/employee-profile.prisma`, `memberships.position`                                                                                                                                                                                                                                 |

## Phases

| #   | Phase                                                                           | Delegate                   | Status      |
| --- | ------------------------------------------------------------------------------- | -------------------------- | ----------- |
| 0   | Wire `materializeEntitledAppRoles`; add billing + invoice catalogs + drift test | orchestrator               | done        |
| 0b  | Session-tier org app-access SDK surface + CRM authorization guard               | orchestrator               | done        |
| 1   | Promote settings hub to `@876/ui`; adopt in Billing + Invoice                   | codex `gpt-5.6-terra` high | done        |
| 2   | `@876/access-ui` — access panel, effective-permission list, summary             | codex `gpt-5.6-terra` high | in progress |
| 3   | CRM `/settings/users` split view + route handlers                               | codex `gpt-5.6-terra` high | briefed     |
| 4   | Invoice `/settings/users` + hub                                                 | codex `gpt-5.6-terra` high | not started |
| 5   | Billing migration off `billing_roles`/`billing_members`                         | orchestrator + codex       | not started |
| 6   | ERM employment section                                                          | codex `gpt-5.6-terra` high | not started |
| 7   | Console adopts `@876/access-ui`, retires `member-apps.tsx`                      | codex `gpt-5.6-terra` high | not started |

## Dispatched briefs

| Phase | Tool                       | Brief                                                                              |
| ----- | -------------------------- | ---------------------------------------------------------------------------------- |
| 1     | codex `gpt-5.6-terra` high | [shared settings hub](./briefs/codex/2026-09-02-phase-1-shared-settings-hub.md)    |
| 2     | codex `gpt-5.6-terra` high | [`@876/access-ui` package](./briefs/codex/2026-09-02-phase-2-access-ui-package.md) |
| 3     | codex `gpt-5.6-terra` high | [CRM settings users](./briefs/codex/2026-09-02-phase-3-crm-settings-users.md)      |

## Execution reports

| Phase | Tool                       | Report                                                                           |
| ----- | -------------------------- | -------------------------------------------------------------------------------- |
| 1     | codex `gpt-5.6-terra` high | [shared settings hub](./reports/codex/2026-09-02-phase-1-shared-settings-hub.md) |

### Orchestrator review of Phase 1

Verified independently rather than from the report: no `eslint-disable`, `as any`,
or `@ts-ignore` in any touched path; `packages/ui/package.json` untouched (the
`"./*"` export resolves the new file); `@876/ui` 143 tests, `@876/crm-app` 224,
`@876/billing-app` 720, `@876/invoice-app` 155, all typechecks clean, app-structure
OK. Test counts moved: `settings-hub.test.tsx` 14 `it()`, invoice
`settings-nav.test.ts` 4.

**One change was rejected and rewritten.** Codex reduced Billing's settings
`loading.tsx` to `return null` and deleted two assertions with it. Its premise was
right — the six-card skeleton was a guess, since how many sections appear depends
on the viewer's permissions — but the conclusion was not: the heading is static
chrome, and `CLAUDE.md` requires a `loading.tsx` to render the chrome the page does
rather than flash a blank screen. The fallback now renders the real heading and no
cards, with a test for each half.

Its removal of CRM's exact-resolver-inventory assertion was accepted: the shared
resolver deliberately holds Billing's and Invoice's keys too, so that assertion no
longer described anything true, and the replacement invariant is the right one.

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

Phases 0 and 0b are committed and green. Phase 1 is running under Codex
`gpt-5.6-terra` at high effort; Phase 2 and Phase 3 are briefed and ready to
dispatch once it lands.

**Five Phase 0 commits (`231948cc`..`5c9d68e3`) reached `origin/main` directly**
rather than through this branch's pull request — an accidental push, not an agent.
The branch upstream has been repointed to `origin/feature/app-access-adoption` so a
bare `git push` from this tree can no longer target `main`. The commits are green
and self-contained; the working decision is to leave them rather than revert and
re-land.

Known pre-existing failure, **not** from this run: `packages/core/src/lib/phone.test.ts`
expects 32 dial codes and gets 41. Confirmed on `origin/main` by stashing.

`pnpm --filter @876/api boundaries` reported 25 violations on `origin/main` before
this run and 25 after — the gate was already red; this run adds none.

## Open risk

Production migration state is unverified: Actions checks have been failing and prod may lag `main`,
so `app_permissions` / `app_roles` may not exist in production yet. Confirm before deploy.
