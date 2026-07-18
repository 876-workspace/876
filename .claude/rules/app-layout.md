# App Layout & Page Pattern Rules

Read this before scaffolding any new page, list view, detail view, or form in
**Console, Enterprise, Couriers, or any future admin/workspace-style app**
(anything built on a sidebar shell). This does **not** apply to `@876/app`
(the consumer app) — it has its own account-style layout and is intentionally
excluded.

The goal: an AI generating a new page for one of these apps should reach for
the same containers, the same toolbar, the same spacing, and the same
navigation pattern every other page already uses — never invent a new one.

## 1. Pages over pop-ups

**Create and edit flows are dedicated routes, not dialogs.** For any
resource `foo`:

- List: `/foo`
- Create: `/foo/new`
- Detail: `/foo/[id]`
- Edit: `/foo/[id]/edit`

Dialogs (`Dialog`, `AlertDialog`) are reserved for:

- Destructive confirmations (delete, ban, revoke)
- Single-field, low-stakes inline actions explicitly scoped as a quick action
  (not a full resource form)

Do not put a multi-field create/edit form in a `Dialog`. If you find one
(e.g. legacy dialog-based forms), treat it as debt to migrate to a dedicated
page, not a pattern to copy.

## 2. Main body container

The content area rendered inside the app shell (everything after the
sidebar/topbar) uses one standard padding wrapper:

```tsx
<div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">{/* page content */}</div>
```

This is the outermost element of every route page (`page.tsx`). Do not:

- Add extra wrapping divs with their own padding/margin above this container
- Nest another `px-*`/`pt-*` container inside it for "extra breathing room"
- Invent a different scale (`px-8`, `p-6`, etc.) for a new page

**One sanctioned exception:** top-level hub/overview pages that are pure
navigation (e.g. a Settings landing page whose only content is a grid of
section cards, no table/toolbar) may use the wider variant:

```tsx
<div className="px-6 pt-5 pb-8 sm:px-8 lg:px-12">{/* hub content */}</div>
```

If the page has a `ResourceToolbar`, a table, or a form, it is not a hub —
use the standard `px-4` container, even if it lives under `/settings/*`.

## 3. List pages

Every list page is: standard container → `ResourceToolbar` → (search/filter
row if any) → table or `Empty` state. See `.claude/rules/toolbar.md` for the
full `ResourceToolbar` API and button/dropdown conventions (Add button is
always `primaryVariant="info"` — blue — labeled with the bare verb `"Add"`,
never `"Add address"` / `"Add user"`; the resource is already named by the
page title).

Reference implementation: `apps/console/src/app/(app)/users/page.tsx`.

## 4. Back-link / breadcrumb pattern

Any page one level below a section landing page (e.g. `/settings/general`
under `/settings`, or a nested settings sub-route) shows a back link at the
very top of the container, above the page heading, using the shared
`PageBreadcrumb` component:

```tsx
<PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
```

- `apps/console/src/components/page-breadcrumb.tsx`
- `apps/couriers/src/components/page-breadcrumb.tsx`

Do not remove this to save vertical space — it was removed once in Console
and restored; keep it even on small viewports. Every settings sub-route
(`general`, `security`, `notifications`, `users`, `users/roles`, etc.) must
have it. If a new sub-route is missing it, that's a bug, not a style choice.

## 5. Sidebar navigation

A top-level sidebar item with children (a dropdown group) must still be
directly clickable if it has a real overview page — set a real `href`
(never `'#'`) so the label itself navigates and only the chevron toggles the
child list. See `console-nav-dropdown.tsx` for the pattern: the link and the
expand/collapse trigger are separate hit targets, not a single button.

## 6. Color rules (recap — see root `CLAUDE.md` for the canonical rule)

- **No green buttons.** Green is status-only (active/enabled badges).
- The one blue "primary/add" affordance (`primaryVariant="info"`) is the
  only accent color for create actions. Don't introduce a second accent
  (gold, purple, etc.) for the same role on a different page.

## 7. Button label rules (recap — see `.claude/rules/toolbar.md`)

Labels are bare verbs: `Add`, `Edit`, `Export`, `Delete`. Never suffix with
the resource/entity name (`Edit Plan`, `Export users`) — the page/section
heading already supplies that context. Metadata `<title>` tags are exempt
(browser tab titles like "Edit Plan • App - Apps" are fine; visible button
text is what this rule constrains).

## 8. Applying this to a new app

When scaffolding a new sidebar-style app (see `.claude/rules/new-app-guide.md`
for the integration side), copy the shell/sidebar/toolbar/breadcrumb
components from Console or Couriers rather than rebuilding them. If a page
type doesn't have a precedent yet, look for the closest existing page
(list, detail, settings sub-route, hub) and match its container, toolbar,
and spacing exactly before adding anything new.
