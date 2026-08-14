# Handoff — Ecosystem sync consistency & org/membership management

Last updated: 2026-08-14. Author context: raheemdevs / Efesto Technologies is the
platform-owner account. This doc lets a fresh session pick up without re-deriving
state. Read the two ADRs first — they hold the decisions:

- `docs/architecture/012-ecosystem-sync-and-deletion-lifecycle.md` (deletion/sync)
- `docs/architecture/013-org-membership-management-foundations.md` (org/membership)

## The overall goal

Keep identity data **consistent across every app in the 876 ecosystem**. A single
876 account unlocks many apps (consumer, enterprise, console, couriers, billing,
future eats/commerce/payroll/HR). WorkOS is the identity source of record; users,
orgs, and memberships are created in WorkOS and synced into the core identity DB
(`apps/api`, Express). Product apps reference identity by opaque id and resolve
details through `$876`. The Billing app owns the **org-customer registry**
(`billing_customers`) — an org becomes a customer of the platform operator, and of
apps it enrolls in.

The problem this workstream fixes: mutations (especially **deletion**) were not
propagating, so deleted orgs/users kept appearing as Billing customers, and
deleted accounts hit `/no-access` instead of being signed out.

## What is DONE (PR #259 → `main`, branch `feat/ecosystem-sync-consistency`)

Fully implemented, tested, committed (15 commits). See the PR for the full diff.

- **Deletion propagates to Billing** via a `customer_status` (ACTIVE|ARCHIVED)
  lifecycle carried on the existing `customer.ensure` snapshot. Delete/Purge
  archive the customer; reconcile mirrors deleted orgs as ARCHIVED (self-healing).
  Billing archives, never hard-deletes finance history.
- **Console lifecycle** (ADR-012 §D1/D2): Delete = reversible (soft, keep WorkOS,
  cascade-soft-delete memberships, revoke sessions, archive customer); Purge =
  destructive (hard delete + remove WorkOS). Accounts are never orphan-deleted.
- **Auth is the enforcement boundary** (§D3): `ensureFromWorkos` refuses deleted,
  banned, and suspended accounts at sign-in; couriers + console guards sign a
  deleted/disabled account out to `/login` (enterprise + 876 already did this).
- **Provisioning** (§D5): `provisionOrganization` now enqueues `customer.ensure`
  at every creation site (was NOOP), so a new org registers in Billing at creation.
- **Foundations** (ADR-013): the org/membership model is documented; enterprise's
  no-access screen got a real Sign out.

## What is LEFT — the roadmap

Ordered by priority. Each item lists the concrete entry points.

### 1. Restore / un-delete flow (small, do first — closes the lifecycle)

Delete is now reversible, but confirm/implement the **restore** path so an
un-deleted org/user re-emits `customer.ensure` with `status: 'ACTIVE'` (which
un-archives the Billing customer — the design already supports it via status).

- Check whether an org/user restore endpoint exists in
  `apps/api/src/modules/{organizations,users}`. If not, add `restore` verbs that
  clear the tombstone (`deletedAt`/`deletedBy`/`deletionReason` = null), un-cascade
  memberships for an org restore, and call `enqueueCustomerEnsureFor{Organization,User}`
  (they exist in `apps/api/src/services/billing-customer-sync.ts`).
- Console UI: a "Restore" action on a deleted record (Console can already view
  deleted rows via `include_deleted`).

### 2. Free-plan seed data per app (ops/data verification, not code)

The code already grants a free tier — every org gets an **active** subscription to
`876-enterprise` + `876-billing` + its source app, priced from
`findDefaultPriceForApp` (`apps/api/src/services/provisioning.repository.ts`).
Verify each product actually has a **free plan/price seeded** so that lookup
resolves; otherwise the subscription is active but priceless.

- Check the product/price seeds (search seeds for `product`/`price` creation) and
  that couriers/billing/careers each have a default free price.
- This is a data check against the running DB, not a code change.

### 3. WorkOS ↔ local drift audit (medium)

Creation and deletion sync are now correct. Audit the **update** direction:

- **Profile edits → WorkOS:** `updateUser` (`apps/api/src/modules/users/users.controller.ts`)
  and org profile updates change the local row but do not push name/email back to
  WorkOS. Decide the direction of truth per field and wire it (or a webhook-driven
  reconcile).
- **Org rename / primary-contact change → Billing:** ADR-009 already flags that a
  `CORE_ORGANIZATION` customer's snapshot only refreshes when Core emits an event.
  Emit `customer.ensure` from the org-profile update path so the Billing customer
  name/contact follows a rename without waiting for reconcile. Entry point:
  `updateOrganizationProfile` / `updateOrganization` in
  `apps/api/src/modules/organizations/organizations.service.ts` — add a best-effort
  `enqueueCustomerEnsureForOrganization` after a name/dba/primary-contact change
  (mirror `archiveBillingCustomerForOrg` there).
- **WorkOS webhooks → local:** confirm whether inbound WorkOS webhooks (user/org
  updated, membership changed) are handled; if not, that is the durable way to keep
  local in sync with provider-side edits.

### 4. Org/membership management — the mini implementation (the big one; own session)

Per ADR-013, build a **standardized team-management surface**, starting in **876
Billing**, then couriers. This was explicitly deferred from this session.

- Route pattern: `settings/team` (list) · `settings/team/[memberId]` (detail) ·
  `settings/team/invite`. Dedicated pages, not dialogs (`.claude/rules/app-layout.md`).
- Data: reuse core `$876` memberships/roles/invites — **never** store members/roles
  in an app datastore. Session-tier org-scoped endpoints for org admins; admin tier
  for staff. Reference the existing surfaces:
  - Console access board: `apps/console/src/components/access/` (the rich version).
  - Core endpoints: `/organizations/:id/memberships`, invites, org roles
    (`apps/api/src/modules/organizations/`), `platform/permissions.ts` (role catalog).
  - Platform client: `$876.memberships.*`, `$876.organizations.admin` (roles),
    `create876PlatformClient` (`packages/core/src/platform/`).
- Removal = soft-delete the **membership** (`softDeleteMembershipsForOrg` exists),
  never the account. Add = **Invite**, never "create user".
- Role vocabulary is the one catalog (`owner`/`admin`/`member` + permissions) —
  do not invent per-app roles.

### 5. 876 Enterprise — the Entra-style suite (future, do not build yet)

Groups (named member sets), group-level role assignment, access reviews, and an
audit surface over `audit_events`. ADR-013 §"876 Enterprise" fixes the shape:
groups are a **new core resource** referencing memberships by opaque id — not an
app-local table, not a feature flag. A future HR/payroll app consumes the same
membership/role model; it never becomes a second source of truth. Build only when
scoped as its own project.

### 6. No-access UX consistency (small polish)

ADR-013 sets the standard: every no-access screen needs a real Sign out
(logout-then-navigate) + a way to switch account / go to the 876 account. Done for
enterprise + couriers; audit **billing** (`apps/billing/src/app/no-access/`) and
any future app against the standard. Reference primitives: couriers
`SwitchAccountLink`, enterprise `NoAccessView`.

## Entry points & key files (for a cold start)

- Core→Billing sync: `apps/api/src/services/billing-customer-sync.ts` (+ `.repository.ts`),
  `apps/api/src/workers/billing-customer-dispatch.ts`, billing-api
  `apps/billing-api/domains/billing/workflows/customer_sync.py`.
- Deletion: `organizations.service.ts` (`deleteOrganization`/`purgeOrganization`),
  `users.controller.ts` (`deleteUser`/`purgeUser`), `platform/deletion.ts`.
- Auth choke point: `apps/api/src/modules/auth/auth.repository.ts` (`ensureFromWorkos`,
  `assertAccountUsable`) and `auth.service.ts` (`completeAuth`).
- Session guards: `apps/{couriers,console,enterprise,876}/src/lib/auth/guards.ts`.
- Provisioning: `apps/api/src/services/provisioning.ts` (+ `.repository.ts`).

## Decisions & gotchas (so they are not re-litigated)

- The outbox already had a `status` column for **delivery** state
  (pending/delivered/failed) — the party lifecycle is a **separate** `customer_status`
  column. Do not overload delivery status.
- Keeping WorkOS on soft-Delete is safe **only because** `ensureFromWorkos` refuses
  deleted/banned/suspended accounts. Delete-keeps-WorkOS and the auth guard must
  stay coupled.
- Session validation **fails open on a platform outage** — only an explicit
  not-found / disabled state signs a user out, never a transient error. Preserve
  this in any new guard.
- Enterprise + 876 validate the account via `findAuthRoutingUser`; couriers +
  console got the equivalent this cycle. A new app must include it.
- `enqueueCustomerArchive*`/`enqueueCustomerEnsure*` calls are **best-effort**
  (try/catch + log); the reconcile sweep self-heals. Never fail a delete/create on
  a billing-outbox hiccup.

## How to verify

```
pnpm --filter @876/api typecheck && pnpm --filter @876/api test && pnpm --filter @876/api lint
cd apps/billing-api && .venv/bin/python -m pytest tests/test_customer_sync.py -q
pnpm --filter @876/couriers-app typecheck && pnpm --filter @876/couriers-app test
pnpm --filter @876/console typecheck && pnpm --filter @876/console test
pnpm --filter @876/enterprise typecheck
```

The `@876/api` suite shows 5 Prisma-Accelerate `fetch failed: bad port` unhandled
rejections in the sandbox (no DB) — environmental, not failures; all tests pass.
