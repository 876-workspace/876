# Phase 2 brief — Couriers Users & Roles: route handlers, typed client, pages

**Model/run:** codex `gpt-5.6-sol`, reasoning effort high, workspace-write.
**Prereq:** Phase 1 (schema/catalog/services) is complete on this branch — read
`.claude/tracker/phase1-report.md`, then the actual Phase 1 source (types in
`src/types/{permissions,role,team}.ts`, `src/lib/permissions/`, services
`src/lib/service/{roles,team}/`) before writing anything. Also read
`.agents/rules/{app-layout.md,code-style.md,types.md,api-access.md,sdk-conventions.md}`
and `.claude/tracker/exploration-users-roles.md` (cited patterns: §A4 route-handler
auth, §A6 UI inventory, §C3 invites).

**Goal:** ship the org-facing Users & Roles settings UI in `apps/couriers` exactly
as specified, and **do not stop until `pnpm --filter @876/couriers typecheck`,
`pnpm --filter @876/core typecheck`, `pnpm --filter @876/couriers test`, and
`pnpm --filter @876/core test` all pass**. Do NOT commit. Write a completion
summary to `.claude/tracker/phase2-report.md`.

## Fixed design decisions (do not re-litigate)

- Users page = **split view** (Zoho style): clicking a row does NOT navigate to a
  new page; it sets `?user=<teamMemberId>` and the layout becomes a two-pane grid —
  the table shrinks to a single "User" column (avatar + name + email) and a
  right-hand tabbed panel opens for the selected member.
- Roles = **full pages** (list → `/new` and `/[roleId]` editors with the
  permission matrix). Default roles (systemKey admin/staff) are fully read-only.
- Invite creates a **core org invite** via the platform client with
  `sourceAppSlug` (same call the onboarding wizard uses). Email delivery and
  acceptance pages do not exist platform-wide — do not build them.
- All mutations go browser → typed client → thin route handler →
  `getManageContext(orgSlug)` authz (401 no session / 403 unless role is
  `owner`/`admin`, plus tenant-exists check) → `service.<resource>.<verb>()` or
  platform client. No business logic in handlers.

## Files to create/modify

### 1. Platform client: add invite revoke (packages/core)

`packages/core/src/platform/resources/orgs.ts`: the `invites` group has
`create`/`list`. Add `revoke(orgId, inviteId)` hitting
`DELETE /organizations/{organization_id}/invites/{invite_id}` with the exact same
transport/return conventions as `create` (see `@876/admin`'s `orgs.revokeInvite`
in `packages/admin/src/resources/orgs.ts` for the endpoint shape). If the platform
resources have existing tests, add a matching minimal test for `revoke`.

### 2. Route handlers (`apps/couriers/src/app/api/manage/...`)

Copy the exact auth/envelope pattern of
`apps/couriers/src/app/api/manage/settings/orgprofile/route.ts` (strict zod body
with `orgSlug`, `getManageContext`, 401/403, `{ data } | { error }` JSON with
status). For DELETE routes take `orgSlug` from the URL search params. Handlers:

- `POST /api/manage/team/invites` — body `{ orgSlug, email, roleId }`. Resolve the
  tenant role via `service.roles.retrieve`; map it to the core invite role:
  `systemKey === 'admin'` → `'admin'`, everything else → `'member'` (the app-local
  role is applied when the member actually joins — platform acceptance flow is a
  known follow-up). Call `platform.orgs.invites.create(ctx.orgId, { email, role,
sourceAppSlug: COURIERS_APP_SLUG })` exactly like
  `apps/couriers/src/app/api/manage/onboarding/invites/route.ts` does. Reject an
  email that already belongs to an existing team member? — you cannot resolve
  emails to userIds app-locally; skip that check.
- `DELETE /api/manage/team/invites/[inviteId]?orgSlug=` — `platform.orgs.invites.revoke`.
- `PATCH /api/manage/team/[id]` — body `{ orgSlug, roleId?, status? }` →
  `service.team.update(tenant.id, id, …)`.
- `DELETE /api/manage/team/[id]?orgSlug=` — `service.team.delete`.
- `POST /api/manage/roles` — body `{ orgSlug, name, description?, permissions }` →
  `service.roles.create`.
- `PATCH /api/manage/roles/[id]` — body `{ orgSlug, …RoleUpdateParams }` →
  `service.roles.update`.
- `DELETE /api/manage/roles/[id]?orgSlug=` — `service.roles.delete`.

### 3. Typed browser client (`apps/couriers/src/lib/client/`)

Mirror Console's client layout (`apps/console/src/lib/client/{index.ts,roles.ts,users.ts}`):
create `team.ts` (`update`, `delete`, `invites.create`, `invites.revoke`),
`roles.ts` (`create`, `update`, `delete`), and an `index.ts` aggregate exporting
`client = { team, roles }`, all built on the existing
`apps/couriers/src/lib/client/request.ts` `request<T>()`. Mutation endpoints only —
no read mirrors.

### 4. Users page — `apps/couriers/src/app/org/[orgSlug]/settings/users/`

`page.tsx` (RSC):

- `searchParams: Promise<{ status?, user? }>`; resolve status via a
  `TEAM_MEMBER_STATUSES`-style guard (`all` default) and **thread it into
  `service.team.list`** — extend `service.team.list` with an optional
  `status?: 'active' | 'inactive'` filter param (+ test) rather than filtering
  rows in the page (app-layout hard rule).
- Resolve context: `getManageContext(orgSlug)`; if no tenant, render the same
  fallback style other settings pages use. Bootstrap self-heal: call
  `service.team.ensure(tenant.id, { userId: ctx.userId, systemKey: ctx.role ===
'owner' || ctx.role === 'admin' ? 'admin' : 'staff' })` before listing (route
  layout already restricts to owner/admin).
- Fetch in parallel (`Promise.all`): filtered team list, `service.roles.list`,
  `platform.orgs.invites.list(ctx.orgId)` (pending only — filter status
  `pending`; tolerate platform error → empty list).
- Hydrate identities: for each member `platform.users.retrieve(userId)` under
  `Promise.all`, falling back to nulls on error (Console precedent
  `apps/console/src/app/(app)/settings/users/page.tsx:36-61`). Build plain
  serializable rows: `{ id, userId, name, email, avatar, roleId, roleName,
roleSystemKey, status, createdAt }`.
- Render: `<Page>` → `PageBreadcrumb` (href `/org/${orgSlug}/settings`, label
  "Settings", `mb-4`) → a client toolbar wrapper (below) → the split-view client
  component → pending invites section.

`users-toolbar.tsx` (client): wraps `ResourceToolbar` with
`titleFilter=<StatusFilterHeading label="Users" paramKey="status" …>` (options:
`all` "All" / heading "All users", `active` "Active" / "Active users",
`inactive` "Inactive" / "Inactive users" — use the existing `headingLabel`
support), `primaryLabel="Invite"`, `primaryVariant="info"`,
`onPrimaryAction` opens the invite dialog, `refresh`.

`invite-dialog.tsx` (client): Dialog with email input + role select (tenant roles
passed as plain `{ id, name }[]`), submits `client.team.invites.create`, shows
inline error from the envelope, `router.refresh()` on success. Follow an existing
couriers dialog/form for styling; labels bare verbs ("Invite", "Cancel").

`users-split.tsx` (client): props `{ rows, roles, selectedId, orgSlug }` (all
plain-serializable). Behavior:

- No selection: full-width table via `DataTable` (or the `CustomersTable`-style
  wrapper — match `apps/couriers/src/app/org/[orgSlug]/customers/customers-table.tsx`)
  with columns **User** (Avatar + name over email), **Role** (name; outline badge
  "Default" styling only if you need to distinguish — plain text is fine),
  **Status** (Badge: `success` Active / `secondary` Inactive). Row click pushes
  `?user=<id>` preserving other params (use `useRouter`/`useSearchParams`).
- With selection: responsive grid (`lg:grid-cols-[minmax(280px,340px)_1fr]`,
  stacked on mobile); left = same table but **only the User column**, selected row
  visually active; right = detail panel:
  - Header: Avatar (lg), name, email, close (X) button that clears `?user`.
  - `Tabs`: **Overview** — role select (all tenant roles; on change
    `client.team.update` + refresh), status row with Activate/Deactivate action,
    joined date (format like other couriers pages), opaque user ID in muted mono;
    a destructive "Remove" action behind a confirm `Dialog`/`AlertDialog`
    (`client.team.delete`). **Permissions** — read-only summary derived from the
    member's role: per catalog module, the granted actions/extras (import the
    catalog + `resolveRolePermissions` from `@/lib/permissions`; compute
    client-side from the role's permission list passed in `roles`).
  - Surface envelope errors inline (small destructive text), never toast-less
    silent failures.
- Selected member hidden by current status filter: treat as no selection.

`pending-invites.tsx` (server or client): section below the table listing pending
invites (email, role badge, expiry) with a Revoke button →
`client.team.invites.revoke` (client component for the button is fine). Model on
`apps/enterprise/src/app/[slug]/members/pending-invites.tsx`. Omit the section
entirely when there are none.

`metadata` titles: match existing settings pages (`'Users — Settings'`).

### 5. Roles pages — `apps/couriers/src/app/org/[orgSlug]/settings/users/roles/`

- `page.tsx` (RSC): breadcrumb to `/org/${orgSlug}/settings/users` label "Users";
  `ResourceToolbar` title "Roles", `primaryLabel="Add"`, `primaryVariant="info"`,
  `primaryHref` to `roles/new`, `refresh`. Table columns: Name (+ `outline` Badge
  "Default" when systemKey), Description, Members (count). Row click →
  `roles/[roleId]` (full page navigation).
- `new/page.tsx` + `[roleId]/page.tsx` (RSC shells) sharing a `role-form.tsx`
  client component: name input, description input, `PermissionMatrix`, Save
  (`client.roles.create|update`, then `router.push` back to the roles list /
  refresh), and for existing custom roles a Delete action (destructive confirm →
  `client.roles.delete`). For default roles: render the same form fully
  **read-only** (inputs disabled, matrix read-only, no Save/Delete) with a short
  inline note "Default role — provisioned for every organization and cannot be
  edited." `[roleId]` 404s via `notFound()` when `service.roles.retrieve` misses.
- `permission-matrix.tsx` (client, colocated): Zoho-Books-style table.
  Rows = catalog modules (import the catalog from `@/lib/permissions` — it is
  plain data, safe to import in a client component). Columns: Module | Full |
  View | Create | Edit | Delete | Others.
  - **Full** checkbox per row = every key of the module (actions + extras);
    indeterminate when partially granted (set via ref, `data-` attr or the
    checkbox component's indeterminate support — check `@876/ui`'s checkbox).
  - Action cells: checkbox when the module supports the action, muted "—"
    otherwise. Checking any action keeps Full in sync (checked iff all).
  - **Others**: for modules with extras, a "+N more" toggle expanding an inline
    row of labeled extra checkboxes; "—" otherwise.
  - Props: `{ value: string[], onChange(next: string[]): void, readOnly?: boolean }`.
    Controlled, no internal duplication of state beyond UI expansion toggles.
  - Wrap in `overflow-x-auto`; keep it usable on mobile.

### 6. Settings hub

`apps/couriers/src/app/org/[orgSlug]/settings/settings-groups.ts`: in the
"Users & roles" group replace the `Team` item with
`{ title: 'Users', href: '/settings/users' }` and give Roles
`href: '/settings/users/roles'`; keep "User preferences" as-is (no href).
**Delete** the stub route `apps/couriers/src/app/org/[orgSlug]/settings/team/`
(page.tsx) entirely.

## Constraints

- RSC → client props must be plain serializable data — no icon components or
  functions across the boundary (icons resolved inside client components).
- No green buttons anywhere; primary actions `info`. Bare-verb button labels.
- No wordy descriptions under headings; no `<p>` blurbs.
- Follow `code-style.md` rules (single-statement if without braces, concern-group
  blank lines, ternaries) in `src/lib/` and `src/app/api/` files.
- Any new shared type (e.g. the hydrated row shape) goes in
  `apps/couriers/src/types/team.ts`, not inline exports from components.
- Add focused tests where the repo has precedent: route-handler tests if any
  existing couriers `app/api` route has tests (check `route.test.ts` near
  existing handlers — if none exist, don't invent a new harness), the
  `service.team.list` status-filter test, and component tests only if similar
  page/component tests already exist (there is `settings/page.test.tsx` —
  follow its style for the users page if practical).

## Verification (must pass before you stop)

```bash
pnpm --filter @876/core typecheck && pnpm --filter @876/core test
pnpm --filter @876/couriers typecheck && pnpm --filter @876/couriers test
```

Iterate until green. Note pre-existing failures (verify on untouched tree) rather
than chasing them. Do not commit.

## Addendum — repair pre-existing feature-test drift

`apps/couriers/src/lib/features.test.ts` has 10 failing tests on the untouched
tree: the production `getFeatures` result now includes `uiFeatures.chat: false`
(added by the chat-rail work) but the test expectations still assert the older
five-field `uiFeatures` object. Update ONLY the test expectations in that file to
match the current production contract (add the `chat` field to the expected
objects; check `apps/couriers/src/lib/features.ts` for the exact shape). Do not
change `features.ts` itself. After this, the FULL `pnpm --filter @876/couriers test`
suite must pass with zero failures.

## Addendum — Phase 1 review deltas (already applied, build on them)

- `isUniqueConstraintError` now lives in
  `apps/couriers/src/lib/service/prisma-errors.ts` — import it, never re-inline it.
- `service.roles.ensureDefaults` is check-then-create (findMany → create missing,
  P2002-race tolerant, no-op when both defaults exist) — it is cheap to call from
  read paths.
- ID prefixes for `Role`/`TeamMember` are registered in
  `apps/couriers/src/lib/id/index.ts` (`role`/`tmem`), not in `db/index.ts`.
