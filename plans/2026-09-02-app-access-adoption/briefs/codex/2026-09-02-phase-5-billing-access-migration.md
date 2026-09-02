# Phase 5 — migrate Billing off `billing_roles` / `billing_members`

**Model:** `gpt-5.6-terra`, `model_reasoning_effort=high`
**Repo:** `/root/projects/876`. **Branch:** `feature/app-access-adoption`.
**Do not create, switch, merge, rebase, or delete any branch. Do not commit. Do not push.**

## Why

`apps/billing-api/prisma/schema/{role,member}.prisma` are a **second source of
authorization truth**, which `.claude/rules/app-access.md` forbids outright. Core
already owns app access — catalog, roles, assignments, grants, denies, and
fail-closed effective-permission resolution — and CRM and Invoice now consume it
(Phases 3, 4, 6). Billing is the last app on its own plane.

## Read first (binding)

- `.claude/rules/app-access.md` — the whole file. Core owns app access; a
  product-local role/permission table is never the source of truth.
- `.claude/rules/access-control.md` — three enforcement layers, the binding rule,
  and the fail-closed direction.
- `.claude/rules/naming.md` — durable identifier migration. **Never derive a
  migration from a pattern substitution.**
- `.claude/rules/express-api.md`, `.claude/rules/deletions.md`,
  `.claude/rules/error-handling.md`, `.claude/rules/sdk-conventions.md`.

## Reference implementation

`apps/invoice/src/lib/auth/{access-context,guards,app-access}.ts`,
`apps/invoice/src/components/shell/nav-config.ts` and its `nav-config.test.ts`,
and `apps/invoice/src/app/(app)/settings/users/`. Billing should end up the same
shape. **Do not modify `apps/invoice/`, `apps/crm/`, `apps/console/`, or
`packages/core`.**

## Verified data state — checked against the live Billing database, 2026-09-02

```
billing_roles:    15 rows — 15 is_system, 0 custom
billing_members:   1 row
```

Every stored role is a system template (Admin / Staff / Super Admin across five
tenants). **There is no custom-role data to map**, so the risky half of the
original plan — migrating partial custom roles without widening access — does not
arise. Do not let that finding become an excuse to skip the mapping table below:
it still governs the **code** (guards, catalogs, tests), and a custom role could
be created before this ships.

## The permission map — use exactly this, derive nothing

`apps/billing-api/src/modules/access/access.schemas.ts` holds 30 colon-delimited
`<module>:read|write` keys and is the source of truth (stored rows were validated
against it). The canonical `876-billing` catalog in `@876/core/access/catalogs`
uses dot-delimited CRUD.

| Old | New | Why |
| --- | --- | --- |
| `<m>:read` | `<m>.view` | one to one |
| `<m>:write` | `<m>.create` + `<m>.edit` | **not** `.delete` — a `:write` holder never had delete as a separable capability, so inferring it would widen access |
| `billing:access` | dropped | app entry is the entitlement, which Core models as the subscription |
| `payment_methods:read` | `payment-methods.view` | canonical keys are kebab-case |
| `payment_methods:write` | `payment-methods.create` + `payment-methods.edit` | same `:write` rule |
| `members:*`, `roles:*` | dropped from the app plane | organization-governance permissions; the organization role already carries them |

A role holding **every** billing permission (`super-admin`, `admin`) receives the
full catalog including `.delete`. A **partial** role receives view/create/edit and
**no** delete; an administrator grants delete explicitly afterwards. Migrating a
partial role into delete rights is an access-widening write and must fail closed.

## Scope

1. **Billing consumes Core app access.** Add `src/lib/services/account.ts`,
   `src/lib/services/platform-app.ts`, and `src/lib/auth/access-context.ts`
   mirroring Invoice exactly, including `requireAppPermission`.
   **`platform-app.ts` resolves the app id from the organization's entitlement.
   Never hard-code a platform app id** — ids are generated per environment
   (`rap_…`); a literal 404s and reads as an outage. This shipped broken in
   Phase 6 and took down two apps.
2. **Navigation gating** with `defineNavigation`, resolved server-side, plus the
   binding test. Copy Invoice's `nav-config.test.ts`, which reads each guard back
   out of its route file — **do not** substitute a hand-written map.
3. **Retire the duplicate plane.** Delete `service.roles` / `service.members`
   usage in `apps/billing/src`; `settings/users` and `settings/roles` move onto
   the Core-backed shared `@876/access-ui` panel and `PermissionMatrix` as
   Invoice's do. `apps/billing/src/lib/auth/billing-context.ts` stops reading the
   local plane.
4. **Data migration** in `apps/billing-api/prisma/migrations/` as reviewable SQL:
   write it, do **not** run it. Follow `.claude/rules/deletions.md` — tables are
   not dropped in the same change that stops writing them; leave them in place
   with a documented removal condition.
5. **Deprecate** `apps/billing-api/src/modules/access/` route surface behind the
   same condition. Do not delete an externally-reachable route in this pass.

## Tests — at least 30 `it()`

- the permission map, asserted **exactly**, including that no migrated partial
  role gains a `.delete` key and that every one of the 30 old keys has a
  destination (a key with no mapping is a dropped capability);
- resolver: permissions unchanged from `effective_permissions`; an error returns
  `unavailable`, never an empty grant; a feature outage keeps permissions;
  memoization holds across two calls with the same primitives;
- an unresolved platform app id reports `unavailable` and never asks for a
  membership;
- guards: held admits, missing denies, a route-handler denial is a 403 value and
  an outage a 503, neither leaking a provider message;
- navigation: exact visible href sets for a rich and a poor subject, registry
  round-trips through `structuredClone`, resolving does not mutate the registry;
- binding: registry-to-route, and every required permission granted by a seeded
  role.

**Billing runs vitest on `environment: 'node'`** — a `.test.tsx` needs a
`// @vitest-environment jsdom` docblock or it silently never runs. Check the test
**count** moves, not just that the suite is green.

## Hard constraints

- **No `eslint-disable`, no `@ts-ignore`, no `as any`.** `as unknown as T` only at
  a real external boundary.
- Do not merge the organization-permission plane with the app-permission plane.
- Do not run `prisma migrate`, any DDL, or any command against a live database.
- Do not modify `apps/crm/`, `apps/invoice/`, `apps/console/`, `apps/api/`, or
  `packages/core`.
- Do not commit, push, or touch branches.

## Verification

```bash
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/billing-api typecheck && pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api boundaries
node scripts/check-app-structure.mjs
```

## Report

`plans/2026-09-02-app-access-adoption/reports/codex/2026-09-02-phase-5-billing-access-migration.md`
— file table, counted `it()` per file, verification tails, the migration SQL in
full, judgement calls, anything you could not do, and anything contradicting this
brief.
