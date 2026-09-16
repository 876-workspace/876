# Brief B report — Couriers settings context sidebar + Users & roles split view

## Files changed + why

### Shell (`apps/couriers/src/components/shell/`)
- **`nav-config.ts`** — added main-app **Requests** item (`/requests`, `ChatBubbleLeftIcon`, purple) after Customers. Another agent builds the page.
- **`settings-nav.ts`** (new) — condensed settings registry: 3 groups / 12 items with string icon keys (RSC-serializable), `isSettingsPath()`, `settingsContext(basePath)` (org-absolute hrefs), `resolveSettingsActiveKey()` (longest-prefix, so `users/roles/new` → Users & roles). Active matching reuses the shared `@876/ui/sidebar-context` primitive (`resolveActiveEntryKey`); no second resolver.
- **`nav-icons.tsx`** (new) — string-key → component resolution for the settings rail (Console `nav-icons` pattern, couriers-local).
- **`sidebar.tsx`** — `Sidebar` now swaps the whole rail by pathname: app nav vs settings nav (Settings header + back link to `basePath`, `aria-label="Back to main navigation"`). App-nav markup unchanged. Couriers has no separate mobile nav — this single component serves all viewports, so mobile follows the switch with no second implementation.
- **`topbar.test.tsx`** — added Requests to the exact search-directory expectation.

### Settings hub + pages (`apps/couriers/src/app/[orgSlug]/settings/`)
- **`page.tsx`** — hub now `redirect()`s to `/[orgSlug]/settings/orgprofile`. (Old deep routes untouched.)
- **`page.test.tsx`** — replaced hub-card assertions with a redirect assertion.
- **`modules/page.tsx`** (new) — catalog list (`COURIERS_MODULE_CATALOG` via `@/lib/modules`), `"<Module> settings"` links to `modules/[moduleKey]`, enabled badge + disabled switch (invoice pattern, org-scoped, no description copy).
- **`customization/page.tsx`**, **`automation/page.tsx`** (new) — heading + `876-empty-dashed` "Coming soon.", no breadcrumb (sidebar is the way back).
- **`modules/automation/customization/page.test.tsx`** (new) — catalog link coverage, switch disabled contract, placeholder shape.

### Users & roles split view (`…/settings/users/`)
- **`_lib/team-members.ts`** (new) — `React.cache`d `listTeamData(orgSlug)` (rows + roles + pending invites; logic extracted verbatim from the old `(list)/page.tsx`) and `listInviteRoleOptions()` (fast toolbar path, reuses cached `listTeamRoles`). Unfiltered fetch; the status filter applies client-side in the list because a layout receives no `searchParams` (Console team-list precedent, noted in a comment).
- **`_components/users-section.tsx`** (new) — client `ListDetailSection` frame, `h-full min-h-0` (AppShell host), reuses `UsersToolbar` as-is.
- **`_components/users-list.tsx`** (new) — full `DataTable` when closed (row click → `users/[id]`, status query preserved; pending invites below) / `ListPane` when open.
- **`_components/users-list-data.tsx`** (new) — Suspense data half with the `flex h-full min-h-0 flex-col gap-3` wrapper.
- **`(members)/layout.tsx`**, **`(members)/(list)/page.tsx`** (null), **`(members)/[memberId]/page.tsx`** (new) — route group keeps URLs stable while isolating the members shell from `roles/*` (Console `(team)` pattern). Detail preserves `?status=` in its close href.
- **`_components/user-detail.tsx`** — `UserDetail` → `UserDetailCard` (`DetailCard` + `DetailCardHeader`/`Body`/`IdBar`, `closeHref`; update/remove/role-select/permissions/activity logic unchanged; remove now routes back to the list).
- **Roles mirror**: `roles/layout.tsx`, `_components/roles-section.tsx` (`?type=system|custom` via `StatusFilterHeading`, Add → `roles/new`, no takeover segments so `new` renders in the detail column), `_components/roles-list.tsx`, `_components/roles-list-data.tsx`, `(list)/page.tsx` → null, `[roleId]/page.tsx` + `new/page.tsx` → `DetailCard` (close href preserves `?type=`).
- **`_components/role-form.tsx`** — dropped the inner `876-card` wrapper (the `DetailCardBody` is the surface now); otherwise untouched.
- **Deleted (replaced)**: `users/(list)/page.tsx`, `users/(list)/loading.tsx`, `users/_components/users-split.tsx` + test, `roles/(list)/loading.tsx`, `roles/_components/roles-shell.tsx`, `roles/_components/roles-table.tsx`. Loading is now owned by the layout Suspense boundaries with real-column skeletons.
- Finance route untouched (link only: `/settings/finance` in the settings nav).

## Decisions
- Kept couriers' existing `NavLink`/dropdown rendering and reused it for settings entries via icon-key resolution, instead of porting Console's full context-stack shell — smaller diff, same behavior.
- `new` role form stays in the detail column (no `takeoverSegments`), per brief.
- Member detail reuses the list's cached fetch (`listTeamData`) rather than adding a retrieve call.
- System role = `systemKey !== null` (matches the existing "Default" badge rule).

## Tests added — 69 cases
- `settings-nav.test.ts` (25): context by pathname (12 cases incl. nested, slug variants, `settingsx` negatives), exact 12-item href/label list incl. Finance, active-key incl. `users/roles/new` (11 cases).
- `sidebar-settings.test.tsx` (4): app rail + Requests, settings rail + back link, nested-route rail + highlight, org header in both.
- `page.test.ts` (1): hub redirect. `modules` (2), `automation`/`customization` (1+1).
- `users-list` (6): closed table + pending, navigation preserving filter, open pane + selection, status filter, unknown status, empty state.
- `user-detail` (4): card chrome + close href, deactivate, lockout error, dialog remove → list.
- `users-section` (3), `roles-list` (6), `roles-section` (10: `isRoleTypeFilter` 7 + toolbar 3), `team-members` (6: row/invite mapping, unfiltered fetch, identity fallbacks, null tenant, invite options).

## Verification (actual results)
- `pnpm --filter @876/couriers-app exec vitest run src/components/shell "src/app/[orgSlug]/settings"` → **25 files, 146 tests, all pass**.
- `pnpm --filter @876/couriers-app lint` → **0 errors** (13 pre-existing warnings in untouched files).
- `pnpm --filter @876/couriers-app typecheck` → **0 errors in scope**; the only remaining errors are in `src/app/api/manage/requests/**`, which is another agent's forbidden scope — left alone per shared rules.
- `node scripts/check-app-structure.mjs couriers` → **OK**.
- Also removed two stale `.next` validator files that referenced the deleted `(list)/page` (generated cache only; regenerates on dev/build).

## Could not do / notes
- Nothing in scope left undone. One behavior worth a follow-up: `settings/_lib/settings-groups.ts` (out of scope) still describes the old hub-card nav; whoever owns it should reconcile with the redirect + condensed sidebar.
