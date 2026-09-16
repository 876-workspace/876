# CRM app — settings: teams and categories, plus the app plumbing behind them

**Phase C1** of the CRM expansion. Scope is **`apps/crm/` only**. Phases A
(`apps/crm-api/`) and B (`packages/crm/`, `packages/client/`) are already done — read them
as the contract, do not modify them.

Read first and obey exactly:

- `.claude/rules/app-layout.md` — page containers, `ResourceToolbar`, list/detail/settings
  patterns, `FormRow`, button labels (bare verbs), heading sizes, table cell hierarchy,
  **settings hub uses CSS multi-column, not a hand-assigned grid** (§10c)
- `.claude/rules/app-structure.md` — `_components/` vs `features/` vs `components/`,
  no barrels, no app-name prefixes
- `.claude/rules/data-loading.md` + root `CLAUDE.md` "Loading States & Suspense Placement"
  — chrome is never a skeleton; only the I/O region shimmers
- `.claude/rules/api-access.md` — **no server actions**; client mutations go through thin
  `app/api/...` route handlers that authorize, then call `$876`
- `CLAUDE.md` "UI Copy" — **no explanatory paragraph under a heading**, and keep `Empty`
  states to a short title
- `CLAUDE.md` "UI Design" — **no green buttons**, ever

---

## 1. Route handlers — `src/app/api/`

`src/app/api/requests/[requestId]/route.ts` is the reference: resolve the CRM context,
call `$876`, return `{data}` / `{error}`, no business logic.

Add, each authorized with the same context guard the existing handlers use:

```
api/teams/route.ts                                  GET list, POST create
api/teams/[teamId]/route.ts                         PATCH, DELETE
api/teams/[teamId]/members/route.ts                 POST add
api/teams/[teamId]/members/[userId]/route.ts        PATCH role, DELETE
api/request-categories/route.ts                     GET list, POST create
api/request-categories/[categoryId]/route.ts        PATCH, DELETE
api/request-categories/[categoryId]/subcategories/route.ts               POST
api/request-categories/[categoryId]/subcategories/[subcategoryId]/route.ts  PATCH, DELETE
```

The signed-in user id supplies `createdBy` / `addedBy` / `deletedBy` **server-side** —
never accept those from the request body. Strip them if present.

## 2. Browser client — `src/lib/client/`

Add `teams.ts` and `request-categories.ts` following `requests.ts` exactly (typed over the
`@876/client` `Crm*` types, `request()` helper, `content-type` header, encoded ids).
Compose both onto the `client` object in `src/lib/client/index.ts` as `teams` and
`requestCategories`, and re-export them.

Re-export the new `Crm*` types from `src/types/crm.ts`, matching the existing style
(a single `export type { … } from '@876/client'` block).

## 3. Settings hub — `src/app/(app)/settings/page.tsx`

Replace the current placeholder. **Delete the explanatory paragraph** — it is exactly the
prose `CLAUDE.md` forbids under a heading.

Follow Console's settings hub: `sm:columns-2 lg:columns-3` with `break-inside-avoid` on
each card, the wider hub container (`px-6 pt-5 pb-8 sm:px-8 lg:px-12`), and a `876-page-title`
`<h1>`. Cards:

| Group | Items |
| --- | --- |
| Workspace | Teams (`/settings/teams`, available), Categories (`/settings/categories`, available) |
| Requests | Statuses (planned), Automation rules (planned), Email intake (planned) |
| Organization | Members (planned), Preferences (planned) |

A **planned** item renders as plain text with no link and carries **no `href`** — that is
what lets the information architecture ship ahead of the pages. An **available** item must
have one. Put the item registry in `src/app/(app)/settings/_lib/settings-nav.ts` as plain
serializable data with a **string icon key** the card component resolves to a component —
never an imported icon component in the registry (RSC boundary).

Every settings sub-route gets `<PageBreadcrumb href="/settings" label="Settings" className="mb-4" />`
at the top of its container. This is not optional and not dropped on small viewports.

## 4. Teams — `/settings/teams`

- **List** (`page.tsx`): standard container, `ResourceToolbar` with `title="Teams"`,
  `primaryLabel="Add"`, `primaryHref="/settings/teams/new"`, `primaryVariant="info"`,
  `refresh`, and a `titleFilter` `StatusFilterHeading` over `all | ACTIVE | ARCHIVED`
  (`@876/ui/status-filter-heading`, imported — do **not** copy it into the app).
  Thread the resolved status into the `$876.teams.list()` call; never filter returned rows
  in the page.

  Table columns: **Name** (tier 1, `font-medium`, links to the team), **Members** (a small
  overlapping avatar stack, +N overflow), **Default** (a `Badge` when `isDefault`),
  **Auto-assign** (tier 3, muted), **Status** (always a `<Badge>`, never tinted text),
  **Created** (tier 3, muted). Follow `app-layout.md` §12 exactly.

  The page is a **synchronous shell**: toolbar and table `<thead>` render immediately, and
  only the rows sit behind `<Suspense>` with a `DataTableSkeleton` built from a
  `teams-skeleton-columns.ts` beside the table so the fallback cannot drift from the real
  column set.

- **New / Edit** (`new/page.tsx`, `[teamId]/edit/page.tsx`) — dedicated **pages**, never a
  dialog (`app-layout.md` §1). One shared `team-form.tsx` in `_components/`. Fields via
  `FormRow`: Name (required), Description, Color (a select over design-token keys, not a
  hex picker), Auto-assign (a `RadioGroup` — three options, so radio not select, per
  §10a), Set as default team (`Switch`, with the label passing `className="mb-0"`).

  Guidance goes in `FormRow`'s `hint` tooltip, never a `<p>` under the control.

- **Detail** (`[teamId]/page.tsx`) — detail header with the team name as `876-page-title`,
  a status `Badge`, inline `Edit` (outline + `Pencil`) and a `···` dropdown
  (entity actions → separator → Export → separator → Delete destructive last).
  Below it, the **Members** section: a table of members (avatar + name + email + role +
  a row `···` to change role or remove) and an **Add member** control.

## 5. The member picker — the piece that has to feel right

The user specifically wants Console's search-as-you-type member picker brought over.
`apps/console/src/app/(app)/settings/users/_components/promote-user-form.tsx` is the
behavioural reference, but **do not copy its click-to-search shape** — that one requires
pressing a button to search. Build a real typeahead.

Create `src/features/directory/components/member-picker.tsx`
(a directory picker is used by settings *and* by the request record in Phase C2, so it is a
feature, not a route-local component — `app-structure.md`).

Requirements:

- Built on `@876/ui/command` inside `@876/ui/popover` (`Command`, `CommandInput`,
  `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`) — this is the shadcn
  combobox pattern and it already gives keyboard navigation, filtering, and the right
  a11y roles. Do not hand-roll a filtered `<div>` list.
- Props: `members: DirectoryMember[]`, `value`, `onSelect`, `exclude?: string[]`
  (already-added user ids), `placeholder`, `emptyLabel`, and an optional `allowUnassigned`
  that renders a leading "Unassigned" item.
- Each row: `CustomerAvatar` (name + `src`), display name on the first line, email muted
  on the second, a `CheckIcon` on the current selection.
- Filtering is **client-side over the already-loaded org member list** — the org directory
  is small and already fetched by the page; do not add a per-keystroke network call.
- Debounce nothing, memoize the filtered list with `useMemo` keyed on the query.
- `DirectoryMember` (`{ userId, name, email, avatar }`) is the shape the request record
  already builds in `src/app/(app)/requests/[requestId]/_data.ts`. Export the type from
  `src/features/directory/types.ts` and have that loader use it, so the two cannot drift.

## 6. Categories — `/settings/categories`

One page, no separate detail route: a category is small enough to manage in place.

- Container + `PageBreadcrumb` + `ResourceToolbar` (`title="Categories"`, `Add`, `···`).
- The body is a list of category cards. Each card: the category name (tier 1) with its
  colour dot, an active/archived `Badge`, its default team and default priority as muted
  metadata, a row `···` (Edit, Add subcategory, separator, Archive / Restore, separator,
  Delete destructive), and its subcategories beneath as a compact indented list, each with
  its own inline edit/delete.
- **Icon.** A category carries an icon so the catalog reads at a glance — "Bugs"
  with a bug on it, "Billing" with a card. The dialog includes an **icon picker**:
  a `Popover` whose trigger shows the current icon, opening onto a grid of every
  key in `CATEGORY_ICON_KEYS` from `@876/ui/category-icons`, rendered with
  `<CategoryIcon name={key} />`, ~7 per row, each a square toggle button with an
  accessible name and the selected one ring-highlighted. Wire it up as a
  `FormRow` beside Colour.

  The catalog is a **closed allowlist** — the form stores the key string and
  nothing else. Do not add a free-text icon field, do not import an icon library,
  and do not extend the catalog from app code; new glyphs are added to
  `packages/ui/src/category-icons.tsx` so every app shares one set.

  Render `<CategoryIcon>` tinted with the category's colour wherever a category
  appears: the settings list, the request form's category select, the requests
  table's category cell, and the request aside's Details row.

- Create and edit are **dialogs here**, not pages — a category is a three-field, low-stakes
  record, which is the sanctioned exception in `app-layout.md` §1. Say so in a comment so a
  later reader does not "fix" it into a page.
- **Deleting a category that is in use returns `crm/category-in-use` (409).** Surface that
  as a real explanation — a toast reading "This category is used by existing requests.
  Archive it instead." — and offer Archive as the next action. Do not show a raw error code.
- Reordering: expose `sortOrder` through simple "Move up / Move down" items in the `···`
  menu. Do not add a drag-and-drop library.

## 7. Loading and empty states

- Every list page is a synchronous shell; only the data region suspends.
- Fallbacks are `DataTableSkeleton` with the real columns, or card-shaped skeletons that
  match the resolved layout — never a bare `<Skeleton className="h-96 w-full">`.
- `Empty` states: short title only, no descriptive sentence, plus the primary action.
  "No teams yet" + an Add button. Not a paragraph explaining what a team is.

## 8. Tests

Follow `.claude/rules/testing.md`. `apps/crm/` currently has **no test files at all** and
`pnpm --filter @876/crm-app test` therefore exits 1. Fix that as part of this phase:

- `member-picker.test.tsx` — renders every member; filters on typing; excludes
  `exclude` ids; calls `onSelect` with the exact user id; renders the "Unassigned" row only
  when `allowUnassigned`; shows the empty label when nothing matches.
- `settings-nav.test.ts` — every `available` item has an `href`, every `planned` item has
  **none**, and every icon value is a string key present in the resolver map.
- `team-form.test.tsx` — submitting with an empty name blocks and does not call the client;
  a valid submit calls `client.teams.create` with the exact payload.
- Route-handler tests for `api/teams` proving `createdBy` is taken from the session and a
  body-supplied `createdBy` is ignored.

Assert exact arguments and complete shapes; `toBeDefined()` alone is not a test. Add
`@testing-library/react`, `@testing-library/jest-dom`, `jsdom` and a `vitest.config.ts` +
`src/test/setup.ts` to `apps/crm` if they are missing, mirroring another app's config.

## 9. Verification — foreground, all of them

```
pnpm --filter @876/crm-app typecheck
pnpm --filter @876/crm-app lint
pnpm --filter @876/crm-app test
node scripts/check-app-structure.mjs
npx prettier --write "apps/crm/src/**/*.{ts,tsx}"
```

`check-app-structure.mjs` is a hard gate: no non-route `.tsx` beside a `page.tsx`, no
route-group fallback stacking. Fix what it reports rather than working around it.

Phase B removed the `RequestCategory` enum, so `apps/crm/` will have **pre-existing
typecheck errors** in `requests/_components/*` and `requests/_lib/*`. Those belong to
Phase C2 — do not fix them here beyond what is needed to keep your own files compiling.
List them in your report.

**Do not commit anything.** Do not touch `apps/crm-api/`, `packages/crm/`, or
`packages/client/`.
