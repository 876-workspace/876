# App Layout, Toolbar & List Filter Rules

Read this before scaffolding or editing any page, list view, detail view,
form, toolbar, or status filter in **Console, Enterprise, Couriers, Billing,
or any future admin/workspace-style app** (anything built on a sidebar shell).

This does **not** apply to `@876/app` (the consumer app) — it has its own
account-style layout and is intentionally excluded.

The goal: an AI generating a new page should reach for the same containers,
the same toolbar, the same list filter, the same spacing, and the same
navigation pattern every other page already uses — never invent a new one.

---

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

---

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

---

## 3. List pages

Every list page is: standard container → `ResourceToolbar` → (search/filter
row if any) → table or `Empty` state.

- Add button is always `primaryVariant="info"` (blue), labeled with the bare
  verb `"Add"` — never `"Add address"` / `"Add user"`; the resource is already
  named by the page title.
- When the list is filtered by lifecycle status, use the status-filter heading
  pattern in §5 (not a separate segmented control or select).

Reference implementation: `apps/console/src/app/(app)/users/page.tsx`.

---

## 4. List-view toolbar (`ResourceToolbar`)

Every list page has a single `ResourceToolbar` at the top:

```
[Title]                    [+ Add]  [···]
```

- **Primary button** — solid blue (`primaryVariant="info"`). Opens the create
  page or dialog.
- **More-actions dropdown** (`···`) — outline icon-sm button so it reads as
  clearly clickable. Pass `refresh` to add a Refresh item internally; pass
  `dropdownActions` for the rest.

### Dropdown item order

1. Refresh (rendered first when `refresh` prop is set — handled internally, no
   onClick needed)
2. ─── separator ───
3. Import (`icon: 'import'`, `ArrowUpFromLine`)
4. Export (`icon: 'export'`, `ArrowDownFromLine`)
5. ─── separator ───
6. Delete (`icon: 'delete'`, `destructive: true`) — always last, always red

Label text is the bare verb only: `"Import"`, `"Export"`, `"Delete"`. The page
title provides the resource context. (Do not use `"Delete users"`-style
suffixes in new code — bare verbs match detail toolbars.)

### Serialization constraint

Icon components cannot cross the RSC → client boundary. `DropdownAction.icon`
is a string key (`'import' | 'export' | 'delete'`) resolved to actual
components inside `ResourceToolbar`. Never pass icon components as props from
server pages.

`refresh` is an internal behavior — `ResourceToolbar` calls `router.refresh()`
itself. Do not pass a refresh callback from a server page.

### Filterable title (`titleFilter`)

`ResourceToolbar` accepts an optional `titleFilter?: ReactNode` that renders
in place of the plain `title` heading, in the same layout slot — the
right-side Add button and `···` dropdown are unaffected. Pass a
`StatusFilterHeading` (see §5) to turn the page title itself into a status
filter. `title` is still required (fallback label and plain-string callers).

---

## 5. List status filter (`StatusFilterHeading`)

Zoho-Books-style filterable heading: the page title itself is the filter
control, rather than a separate segmented control or select next to it.

### When to use it

Any list page filtered by a lifecycle status (active/inactive,
active/suspended/archived, etc.) — currently Apps, Organizations, and Users
in Console; same pattern in Couriers/Billing where status-filtered lists exist.
Do not build a new standalone selector (`<Select>`, segmented control) next to
`ResourceToolbar` for this purpose.

### The component

Each app ships its own copy (e.g.
`apps/console/src/components/status-filter-heading.tsx`):

```tsx
type StatusFilterOption = { value: string; label: string }

type Props = {
  label: string // fallback label (e.g. the page title, "Apps")
  value: string // current status, resolved server-side from the URL
  options: StatusFilterOption[] // plain {value,label}[] — no icons/functions
  paramKey?: string // URL query param name, defaults to 'status'
}
```

It renders the active option's label with a chevron inside an `<h1>`, opens a
`DropdownMenu` on click, and each item is a `Link` that navigates to
`?<paramKey>=<value>` (preserving other query params, clearing `after`/
`before` pagination cursors). Pass it as `ResourceToolbar`'s `titleFilter`
prop, not as a sibling element.

### URL convention

- Status lives in the URL as `?status=<value>`.
- `status` absent, or `status=all`, means **no status filter** — pass
  `undefined` to the `$876` (or app service) call, not the literal string
  `"all"`.
- Any other value is validated against that resource's known status set (a
  small `is<Resource>Status()` type guard); an unknown or missing value
  resolves to `all`.

### Hard rule: thread the value into the list/search call

The server component resolves the status from `searchParams`, then **must**
pass it into the list (and search) call:

```ts
const { status } = await searchParams
const selectedStatus =
  status === 'all' || !isUserStatus(status) ? 'all' : status
const userStatus = selectedStatus === 'all' ? undefined : selectedStatus

const result = await $876.users.list({ limit: 25, status: userStatus })
```

Never call a bare `.list()` and filter the returned rows client-side or in the
page component when the page exposes a status filter — that silently breaks
pagination (`has_more`/cursors are computed against the unfiltered set) and
does the API's job in the wrong layer. If a resource's `list()` (or
`search()`) does not yet accept a `status` param, that is a gap to close in
`apps/api` (repository filter + router query param) and the admin/SDK client
method — not a reason to fake the filter in Next.js. See
`.claude/rules/api-backend.md` and `.claude/rules/sdk-conventions.md`.

### Interaction with search (`q`)

On pages that also support free-text search (Organizations, Users), status and
search co-exist: thread `status` into both `.list()` and `.search()` so a
search query narrows within the active status, not across all statuses.

### RSC → client serialization

`StatusFilterHeading` is a client component. Its `options` prop must stay
plain, serializable `{ value, label }[]` data built in the server component —
never pass icon components or functions across the boundary. The component
imports its own `ChevronDown`/`CheckIcon` from `@876/ui/icons` internally.

### Copy-paste example for a new list page

```tsx
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@/components/status-filter-heading'
import { WIDGET_STATUSES, isWidgetStatus } from '@/lib/widget-status'

const WIDGET_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All' },
  ...WIDGET_STATUSES.map((status) => ({
    value: status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
  })),
]

type Props = {
  searchParams: Promise<{ after?: string; before?: string; status?: string }>
}

export default async function WidgetsPage({ searchParams }: Props) {
  const { after, before, status } = await searchParams
  const selectedStatus =
    status === 'all' || !isWidgetStatus(status) ? 'all' : status
  const widgetStatus = selectedStatus === 'all' ? undefined : selectedStatus

  const result = await $876.widgets.list({
    limit: 25,
    starting_after: after,
    ending_before: before,
    status: widgetStatus,
  })

  return (
    <Page>
      <ResourceToolbar
        title="Widgets"
        titleFilter={
          <StatusFilterHeading
            label="Widgets"
            value={selectedStatus}
            options={WIDGET_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref="/widgets/new"
        primaryVariant="info"
        refresh
      />
      {/* table / empty state */}
    </Page>
  )
}
```

---

## 6. Detail-view toolbar

Detail page headers carry inline actions, not `ResourceToolbar`:

```
[Avatar/Logo]  [Name · badge]      [Edit]  [···]
               [metadata row]
```

- **Edit button** — outline variant with `Pencil` icon.
- **More-actions dropdown** (`···`) — outline icon-sm, `min-w-44 w-auto` on
  `DropdownMenuContent`.
- **Mobile actions** — show safe, common actions as individual bordered icon
  buttons below the entity metadata. Keep the vertical header padding tight on
  mobile. The final button may be a `More` dropdown; use it for sensitive or
  destructive options such as reset password, ban/unban, and delete.

### Detail dropdown item order

Entity-specific actions first → separator → Export → separator → Delete
(destructive, last).

Never place a separator as the first child of `DropdownMenuContent`.

Detail action labels use bare verbs because the page header already supplies
the resource context: `Edit`, `Reset`, `Ban`, `Unban`, `Export`, `Delete`. Do
not use `Export user`, `Delete organization`, or similar repeated nouns.

---

## 7. Back-link / breadcrumb pattern

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

---

## 8. Sidebar navigation

A top-level sidebar item with children (a dropdown group) must still be
directly clickable if it has a real overview page — set a real `href`
(never `'#'`) so the label itself navigates and only the chevron toggles the
child list. See `console-nav-dropdown.tsx` for the pattern: the link and the
expand/collapse trigger are separate hit targets, not a single button.

---

## 9. Color rules

- **No green buttons.** Green is status-only (active/enabled badges). Canonical
  note also lives in root `CLAUDE.md`.
- The one blue "primary/add" affordance (`primaryVariant="info"`) is the only
  accent color for create actions. Don't introduce a second accent (gold,
  purple, etc.) for the same role on a different page.

### Status/role chips — `SoftBadge`

For status, role, and type chips in tables and detail views, prefer
`SoftBadge` (soft border/background tone) over `@876/ui/badge`'s solid
`variant` props. Reference implementation: Couriers'
`src/components/soft-badge.tsx`.

```tsx
export type SoftBadgeTone =
  | 'sky'
  | 'emerald'
  | 'amber'
  | 'slate'
  | 'purple'
  | 'rose'

;<SoftBadge tone="emerald">Active</SoftBadge>
```

- Pick a tone by semantic meaning, not visual preference: `emerald` for a
  positive/terminal state (active, collected, enrolled), `sky` for
  in-progress/informational states, `amber` for attention/pending, `rose` for
  negative/error states, `slate` for neutral/default, `purple` for a
  secondary category axis unrelated to status (e.g. item type).
- Build a `Record<Status, SoftBadgeTone>` map next to the column definition
  instead of branching inline per row — see `PACKAGE_STATUS_TONE` in
  `apps/couriers/src/components/portal/package-status-badge.tsx`.
- Wrap a specific resource's status/role logic in a small named component
  (`MemberStatusBadge`, `RoleNameBadge`) rather than inlining the tone map at
  every call site — copy this pattern into new sidebar-style apps
  (Console, Enterprise, Billing) rather than reintroducing `@876/ui/badge`
  solid variants for the same role.
- This does not replace the "no green buttons" rule above — `SoftBadge`
  tones are for status/role indicators only, never for interactive buttons.

---

## 10. Button labels

Labels are bare verbs: `Add`, `Edit`, `Export`, `Delete`. Never suffix with
the resource/entity name (`Edit Plan`, `Export users`) — the page/section
heading already supplies that context. Metadata `<title>` tags are exempt
(browser tab titles like "Edit Plan • App - Apps" are fine; visible button
text is what this rule constrains).

---

## 11. Icon sizes

- `size-3.5` in labeled buttons (Edit, Add)
- `size-4` in icon-only buttons and all dropdown items

---

## 12. Table cell hierarchy

Every data table uses the same three-tier weight/colour scale. A row must
have exactly **one** tier-1 cell; if two cells read as equally important,
the hierarchy is broken and the eye has nowhere to land.

| Tier | What it is                                                                 | Classes                             |
| ---- | -------------------------------------------------------------------------- | ----------------------------------- |
| 1    | **Row subject** — the identifier the row is about (usually the link)       | `font-medium` (+ `hover:` on links) |
| 2    | **Supporting values** — amounts, counts, other data the user compares      | inherited `text-foreground`         |
| 3    | **Metadata** — dates, slugs/IDs, kinds/types, "last used", plain-text refs | `text-muted-foreground`             |

Additional rules:

- **Status is always a `<Badge>`**, never bare text with a colour or size
  tweak. A status column styled as `text-xs capitalize` in one table and a
  badge in the next is the single most common source of drift.
- **A plain-text reference to another entity is tier 3**, not tier 2. Only a
  reference the user can click is tier 2 — clickable is the signal that it
  matters. (Console's Apps table: `Name` is tier 1, `Organization` is a
  plain-text reference and therefore muted.)
- **Numbers use `tabular-nums`** so columns align digit-for-digit, and money
  columns are right-aligned.
- **Secondary line under a tier-1 cell** (email under a name, slug under a
  title) is `text-muted-foreground text-xs` — it is not a second tier-1.
- **Empty values** render an em dash in `text-muted-foreground`, never a
  blank cell.
- Do not reach for `font-semibold` in a body cell; tier 1 is `font-medium`.
  `font-semibold` belongs to headings, not rows.

---

## 13. Applying this to a new app

When scaffolding a new sidebar-style app (see `.claude/rules/new-app-guide.md`
for the integration side), copy the shell/sidebar/toolbar/breadcrumb/status-
filter components from Console or Couriers rather than rebuilding them. If a
page type doesn't have a precedent yet, look for the closest existing page
(list, detail, settings sub-route, hub) and match its container, toolbar, and
spacing exactly before adding anything new.
