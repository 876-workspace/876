# Exploration brief — Couriers org Users & Roles (members, provisioned roles, permissions)

**Model/run:** codex `gpt-5.6-sol`, reasoning effort high, read-mostly exploration.
**Why:** We are about to build, in `apps/couriers`, org-facing settings pages for
**Users** (org members of the courier app: data table with avatar/name/email, role,
status; Zoho-style split view with a tabbed detail panel) and **Roles** (role list →
full-page role detail with a Zoho-Books-style permission matrix: Full / View /
Create / Edit / Delete columns + per-module "other" permissions). Roles are
tenant-scoped and app-local, stored in couriers' own Prisma datastore, with
**provisioned default roles** ("Admin" = unrestricted, "Staff" = everything except
reports & settings) created for every tenant at provisioning time and non-editable.
The orchestrator (Fable) makes all design decisions from your findings — your job is
to return precise, cited facts, not designs.

Write your findings to `.claude/tracker/exploration-users-roles.md` (create the
directory if needed). Do NOT modify any other file. Do NOT commit anything.

**Return shape (mandatory):** for every claim, a `file:line` citation; for every
type/contract, the exact signature or shape verbatim (not a paraphrase); an explicit
**"NOT FOUND"** entry for anything you searched for and could not locate. Organize
the report by the lettered sections below.

**Scope bound:** `apps/couriers`, `apps/console`, `apps/enterprise` (invite/member
flows only), `apps/api` (memberships/users/auth domains only), `packages/sdk`,
`packages/admin`, `packages/ui`. Everything else (billing, widgets, docs, 876
consumer app) is out of scope.

## A. Couriers app plumbing

1. The auth/tenant resolution chain for `/org/[orgSlug]/*` routes: locate the
   ManageContext / guard(s) (likely `apps/couriers/src/lib/...`), what they return
   (exact type), where the layout calls them, and how the current user's identity
   (userId, name, email, org role) is available to a settings page.
2. The platform client(s) couriers uses to reach the core API (`platform.…` or
   `$876`): file, initialization, and the full list of resources/verbs it exposes
   today (exact method names).
3. The service layer pattern: `apps/couriers/src/lib/service/` — the `ServiceResult`
   shape in `result.ts`, one representative resource (e.g. `mailboxes` or
   `warehouses`): its verb files, how reads vs mutations return, how errors are
   mapped, and where service input/output types live (`src/types/…`?).
4. Route-handler + typed browser client pattern in couriers: does
   `apps/couriers/src/lib/client/` exist? List existing `app/api/...` route handlers
   and how one authorizes (session check, tenant check) before calling `service`.
5. Settings shell: `settings-groups.ts`, `settings-card.tsx`, `settings/page.tsx`,
   `settings/layout.tsx` — exact shapes of the group/card config so a new
   "Users" entry can be added, and what the current `team` entry looks like.
6. UI inventory in `@876/ui` (packages/ui) usable here: data-table components (or
   plain `Table` primitives), `Tabs`, `DropdownMenu`, `Avatar`, `Badge`, `Dialog`,
   `Empty`, plus couriers-local components: `ResourceToolbar`,
   `StatusFilterHeading`, `PageBreadcrumb` — file paths and prop signatures. Also
   cite one existing couriers **list page** that best matches the app-layout rules
   (toolbar + status filter + table) to copy structure from.

## B. Console precedent (mirror, don't copy blindly)

1. `apps/console/src/lib/service/{users,roles,team}` — every verb, exact
   input/output types, how roles store permissions (column type/format), how team
   members reference users, and the Prisma models behind them
   (`apps/console/prisma/schema...`).
2. Console's users & roles **UI**: the pages/routes, how the role permission
   editing UI works today (if at all), and how route handlers + `@/lib/client`
   wire mutations.
3. Console's permission _checking_ helpers (`requireConsolePermission`,
   `hasPermission`) — exact signatures and where the permission strings are defined.

## C. Core API: memberships, users, invitations

1. `apps/api/domains/memberships/` — every endpoint (path, method, auth dep,
   request/response schemas). Same for any org-scoped member listing under
   `domains/organizations/`.
2. What `@876/admin` and `@876/sdk` expose for memberships/users/orgs today —
   exact resource/verb list from `packages/admin/src/resources/` and
   `packages/sdk/src/resources/`.
3. Any existing **invitation** flow anywhere (enterprise app, api `auth` domain,
   WorkOS invites): endpoints, service code, UI. If none exists, say NOT FOUND —
   that decides whether "Invite" ships as a working flow or a stub.
4. How an org's members' identity details (name, email, avatar) get resolved from
   opaque user IDs today in couriers or console (batch endpoint? per-ID retrieve?).

## D. Tenant provisioning & Prisma conventions in couriers

1. Where `service.tenants.create` is called from (onboarding/auth-complete route?)
   — the exact call chain, so default-role seeding can hook in.
2. Migration conventions: `apps/couriers/prisma/migrations/` — how existing
   migrations were produced (naming, SQL style), what `seed.ts` seeds and how it's
   run, and how `createdAt/updatedAt` Unix-seconds timestamps are set in services.
3. The Prisma client export (`@/lib/db`) — exact exports.

## E. Anything already started

The current branch modified `settings/page.tsx` + `settings-card.tsx`. Diff them
(`git diff`) and report what changed, so new work builds on it rather than
clobbering it.

**Verification:** none needed (read-only), but confirm `pnpm --filter @876/couriers typecheck`
is the app's typecheck command by citing its `package.json` scripts.
