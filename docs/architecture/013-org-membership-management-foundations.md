# ADR-013 — Organization & membership management foundations

Status: accepted (2026-08-14) — **foundations only; the full suite is deferred**
Related: ADR-004 (standardized org onboarding), ADR-012 (deletion lifecycle),
`.claude/rules/platform-services.md`, `.claude/rules/sdk-conventions.md`,
`.claude/rules/module-settings.md`, `.claude/rules/app-layout.md`.

## Why this exists now

Organization and membership management is about to be surfaced in several apps
(Console already; Couriers and Billing next), and 876 Enterprise is intended to
grow into the platform's org-management suite — an Entra-ID-style directory with
groups, role assignment, and access reviews. Before any app builds its own
team-management screen, this ADR fixes **where org identity lives, what the
shared model is, and how every app surfaces it the same way**, so we do not end
up with four divergent team pages and three role vocabularies.

**This is the foundation, not the build.** The mini team-management
implementation (starting in 876 Billing) is a later session. What is fixed here
is the model, the ownership, the client surface, and the UX contract.

## The model is already in the core identity API — reuse it, do not re-invent

Org identity is **core platform data** (`.claude/rules/platform-services.md`
bucket 1), owned by `apps/api` and reached through `$876`. The pieces already
exist and are the foundation:

| Concept        | Where it lives (core)                       | Client surface                                           |
| -------------- | ------------------------------------------- | -------------------------------------------------------- |
| Organization   | `organizations`                             | `$876.organizations.*` (admin) / `$876.orgs.*` (session) |
| Membership     | `memberships` (role + status, opaque ids)   | `$876.memberships.*`, `/organizations/:id/memberships`   |
| Org role       | `organization_roles` (per-org, permissions) | `$876.organizations.admin` roles + `access.repository`   |
| Permission set | `platform/permissions.ts` + role rows       | resolved by `resolveMemberPermissions`                   |
| Invite         | `invites` (tokened, expiring)               | `$876.organizations.*` invites                           |

Rules that fall out of this and MUST hold for every app that manages members:

- **Members, roles, and invites are core data. An app never stores its own copy.**
  A product app's datastore may hold app-local _profile_ rows keyed by the opaque
  member/user id, never the membership or role itself (the customer-architecture
  Layer-3 rule, applied to team management).
- **All reads/writes go through `$876.<resource>.<verb>()`**, tiered by auth: an
  org admin managing their own org uses session-tier org-scoped endpoints; 876
  staff use the admin tier. Field visibility differences are an API serializer
  concern, never client-side filtering (`.claude/rules/sdk-conventions.md`).
- **The role vocabulary is one catalog.** `owner` / `admin` / `member` and the
  permission strings are defined once in `platform/permissions.ts`; an app does
  not invent a parallel role name. A per-app _module_ permission
  (`.claude/rules/module-settings.md`) gates that app's own features and reuses
  the module-key = permission-key convention — it does not redefine org roles.

## Standardized per-app team management (the pattern each app copies)

Every sidebar-style app surfaces org member management the same way, under
settings, so the experience is identical across Console, Couriers, Billing, and
future apps (`.claude/rules/app-layout.md`):

- Route: `settings/team` (list), `settings/team/[memberId]` (detail),
  `settings/team/invite` (invite) — dedicated pages, not dialogs.
- List: `ResourceToolbar` + a status-filtered member table (active / invited /
  suspended). The Add action is **Invite**, not "create user" — you never create
  an identity from a team screen, you invite an existing (or to-be-created)
  account.
- A member row shows the person (tier-1), their role (a `<Badge>`), and status;
  role changes and removal are member-detail actions.
- Console's access board (`apps/console/src/components/access/`) is the reference
  for the richer, platform-wide view; an org-scoped app team page is the smaller
  cousin of it.

**Removal vs deletion:** removing a member soft-deletes the _membership_
(ADR-012 §D2 cascade uses the same `softDeleteMembershipsForOrg`), never the
account. "Delete the person" is a Console/identity action, not a team action.

## 876 Enterprise as the org-management suite (deferred direction)

876 Enterprise is the standing home for org administration and, over time, the
Entra-style surface: **groups** (named sets of members), **role assignment** at
the group level, **access reviews**, and an **audit** of who granted what. None
of that is built now. The foundation that keeps it reachable:

- Groups, when they arrive, are a **new core resource** referencing memberships
  by opaque id — not an app-local table, and not a feature flag.
- Access changes already write `audit_events`; the review surface reads those.
- An HR/payroll app consumes the same membership/role model for its org roster;
  it never becomes a second source of truth for who is in an org.

Do **not** build groups, access reviews, or the payroll roster in this cycle.
This ADR only guarantees they slot into the same model when they are built.

## The no-access / disabled-account UX standard

A guard that denies entry must give the person a way forward, and must
distinguish **the two cases** (ADR-012 §D3):

- **No workspace access** (signed in, but not a member / not permitted): explain
  it, and offer **Sign out**, **Switch account**, and **Go to my 876 account**.
- **Account unavailable** (deleted/disabled): this is handled _before_ no-access
  by session validation, which signs the person out to `/login`.

Required of every no-access screen:

- A real **Sign out** that clears the session _before_ navigating — a plain
  `<Link href="/login">` leaves the session active and bounces straight back
  (this was the enterprise defect). Use the app's logout bridge, then navigate.
- No dead ends: at least one always-available action.
- Reference: Couriers' `SwitchAccountLink` (logout-then-navigate) is the correct
  primitive; enterprise's `NoAccessView` is brought up to it.

## Do / do not (for the coming mini-implementation)

- Do reuse `$876` memberships/roles/invites; do put the team page at
  `settings/team`; do soft-delete the membership on removal.
- Do not store members/roles/invites in an app datastore; do not invent role
  names; do not build groups/access-reviews/payroll now; do not create an
  identity from a team screen (invite instead); do not ship a no-access screen
  without a real sign-out.
