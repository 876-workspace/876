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

`StatusFilterHeading` is **shared**, exported from `@876/ui/status-filter-heading`.
Import it; do not copy it into an app. (It previously shipped as a per-app copy
in Console, Billing and Couriers — three files that had already drifted. The
shared component owns the routing/`searchParams` behavior, exactly as the
already-shared `ResourceToolbar` does.)

Its contract:

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
  `undefined` to the service client (or app service) call, not the literal string
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

const result = await platform.users.list({ limit: 25, status: userStatus })
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
import { couriers } from '@/lib/services/couriers'
import { PACKAGE_STATUSES, isPackageStatus } from '@/lib/package-status'

const PACKAGE_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All' },
  ...PACKAGE_STATUSES.map((status) => ({
    value: status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
  })),
]

type Props = {
  searchParams: Promise<{ after?: string; before?: string; status?: string }>
}

export default async function PackagesPage({ searchParams }: Props) {
  const { after, before, status } = await searchParams
  const selectedStatus =
    status === 'all' || !isPackageStatus(status) ? 'all' : status
  const packageStatus = selectedStatus === 'all' ? undefined : selectedStatus

  const result = await couriers.packages.list({
    limit: 25,
    starting_after: after,
    ending_before: before,
    status: packageStatus,
  })

  return (
    <Page>
      <ResourceToolbar
        title="Packages"
        titleFilter={
          <StatusFilterHeading
            label="Packages"
            value={selectedStatus}
            options={PACKAGE_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref="/packages/new"
        primaryVariant="info"
        refresh
      />
      {/* table / empty state */}
    </Page>
  )
}
```

---

## 5a. List/detail split view (`ListDetailShell`)

Read this before building any section where selecting a row should open the
record beside the list rather than replacing it — Console Users, Console Roles,
Console Provisioning, and CRM Customers today, and every future section like
them.

**The components are shared. Do not copy any of them into an app** — three
per-app copies of the grid had already drifted before it was extracted, and the
same was true of the record card and the condensed list.

| Import                                                                                                                                                                                                                                | What it is                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `@876/ui/list-detail-section` → `ListDetailSection`                                                                                                                                                                                   | The whole section, page container down. Render it from the section's `layout.tsx`.          |
| `@876/ui/list-detail-shell` → `ListDetailShell`, `useListDetailRoute`, `useDetailSegments`                                                                                                                                            | The animating two-column grid, and the hooks that read open/closed from the URL.            |
| `@876/ui/list-pane` → `ListPane`, `ListPaneHeader`, `ListPaneBody`, `ListPaneEmpty`, `ListPaneItem`                                                                                                                                   | The condensed sidebar list the table collapses into.                                        |
| `@876/ui/detail-card` → `DetailCard`, `DetailCardHeader`, `DetailCardIcon`, `DetailCardMeta`, `DetailCardMetaItem`, `DetailCardTabs`, `DetailCardTab`, `DetailCardRouteTabs`, `DetailCardBody`, `DetailCardFooter`, `DetailCardIdBar` | The record card that fills the detail column.                                               |
| `@876/ui/detail-card` → `DetailCardHeadline`, `DetailCardSection`, `DetailCardSectionTitle`, `DetailCardFacts`, `DetailCardFact`                                                                                                      | What goes **inside** the body: the one number the record is about, then titled fact groups. |

**Do not nest a `876-card` inside a card body.** The card is already the
surface; a section is a quiet title and its content. A record built from
bordered boxes inside a bordered box reads as a pile, and gives the eye nowhere
to land — which is what `DetailCardHeadline` is for.

`DetailCardHeader` takes `closeHref` as well as `onClose`, so a **server**
layout can offer the close affordance without a client boundary, and
`DetailCardRouteTabs` takes the same `RouteTabItem[]` as the page-level
`RouteTabs`, so a record's tabs stay declared once, as data.

**A layout receives no `searchParams`.** A section whose toolbar carries a
status filter therefore reads it with `useSearchParams()` in the client section
component, and applies it to the rows in the client list component. Fetching
filtered in the layout is not available; see
`apps/billing/src/app/(app)/customers/_components/customers-list.tsx` for the
comment that must accompany it.

The five-file shape of a section — `layout.tsx`, `_components/<x>-section.tsx`,
`_components/<x>-list.tsx`, `_components/<x>-list-data.tsx`, and a null
`(list)/page.tsx` — is worked through in
`apps/billing/src/app/(app)/customers/`.

### The shape

```
┌─ toolbar ────────────┐┌─────────────────────┐
├─ subnav (optional) ──┤│                     │
├──────────────────────┤│   detail card       │
│  list                ││   (full height)     │
└──────────────────────┘└─────────────────────┘
```

- The **list column** holds the toolbar, an optional subnav, and the list. It
  is the full width when closed and narrows to a sidebar when a record opens.
- The **detail column** spans all three rows, so the card fills the content
  area rather than starting below the toolbar.
- The **toolbar never unmounts.** It names the section and carries its actions;
  removing it when a record opens takes the section's own affordances away at
  exactly the moment the operator wants them. Keep `primaryLabel` set.

### Rules

- **Render the shell from the section's `layout.tsx`, never from a page.** That
  is what makes the toolbar and list survive every navigation below it — opening
  a record, switching tabs, closing again — and what lets the grid track
  animate instead of two trees swapping places.
- **Derive open/closed from the URL with `useListDetailRoute()`**, never from
  state and never by filtering segments by hand. `useSelectedLayoutSegments`
  reports route groups (`(list)`) and parallel slots (`@modal`), which are not
  in the path; the hook removes them in one place so an index page wrapped in a
  group cannot read as "a record is open".
- **The list component renders both forms** — the full table and the condensed
  sidebar list — from one file, reading `useDetailSegments()` for the selection.
  A component swap would let the two drift and would remount on every open.
- **Everything the full table encodes with colour or a badge stays in the
  condensed row.** A role's colour-coded name, a setup's `Default` badge, a
  member's status: the collapsed list is the same list, so dropping its visual
  language makes the two views disagree about the same record.
- **Create opens in the detail column too** (`/<section>/new`), in the place
  the record it creates will appear, so the list stays visible and the URL is
  shareable. Use `DetailCard` from `@876/ui/detail-card` for its chrome.
- **`takeoverSegments` is for routes that genuinely own the screen** — a large
  edit form, a nested runs table. Pass them to `useListDetailRoute` and return
  `children` directly when `takeover` is true. Reach for it rarely.
- **The breakpoint is a container query, not a viewport one.** The shell sits
  inside an app frame with a sidebar and, in some apps, a widget rail, so the
  viewport width does not answer how much room it actually has.
- **The section heading is still a `StatusFilterHeading`** (§5). A split view
  does not exempt a section from its filter; where a section has no lifecycle
  status, filter on the axis operators actually use and set `paramKey`
  accordingly — Roles filters `?type=system|custom`.

### Height — the part that gets built wrong

**`ListDetailShell` requires a container with a _definite_ height.** This is not
a polish detail; it is the single most common way this layout is shipped broken,
and it has now been got wrong twice.

The grid is `grid-rows-[auto_auto_minmax(0,1fr)]` — toolbar, subnav, list — with
the detail card spanning `row-[1/-1]`. When the container's height is
indefinite, `1fr` has nothing to be a fraction _of_ and degenerates to `auto`.
The card, which is taller than the list rows, then stretches the rows it spans,
and the list column is pushed **down the page** until its row starts level with
the card's lower half.

So the symptom to recognise is specific:

> The record card renders at the top, and the list appears far below it instead
> of beside it, with a large empty gap where the list should be.

That is always an indefinite height. It is never a padding, gap, or `space-y`
problem, and adding margins to compensate makes it worse.

#### Where the height comes from

| Host                                                             | How the shell gets a height                                                                                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A standalone app on `AppShell` (CRM, Couriers, Billing, Invoice) | `AppShellMain` is `min-h-0 flex-1 overflow-y-auto` inside a fixed-height frame, so `<Page className="h-full min-h-0">` resolves. **Use `h-full min-h-0`.**          |
| Console's organization workspace (`WorkspaceShell`)              | `<main>` is a _scrolling page_: its row carries `min-h-[…]` and no definite height, so a percentage does **not** resolve. **Use a viewport measure**, not `h-full`. |

`h-full` is a percentage. A percentage height resolves only against a parent
with a resolved height — `min-height` alone is not one. Reading `h-full` in a
neighbouring file and copying it is exactly how this breaks: it is correct in
the app that has the frame, and silently inert in the app that does not.

#### In a Console workspace

```tsx
// Depends on nothing above it. `svh` so mobile browser chrome cannot clip it;
// a floor so a short window still yields a usable card.
const WORKSPACE_CONTENT_HEIGHT =
  'min-h-[32rem] h-[calc(100svh-11rem)] sm:h-[calc(100svh-12rem)] lg:h-[calc(100svh-13rem)]'

export default function CustomersLayout({ children }: Props) {
  return (
    <div className={WORKSPACE_CONTENT_HEIGHT}>
      <CustomerListShell toolbar={…} list={…}>{children}</CustomerListShell>
    </div>
  )
}
```

Being a rem or two out costs a little whitespace or a little page scroll. Being
_indefinite_ costs the whole layout — so prefer an approximate definite height
over an exact percentage that cannot resolve.

#### The two columns each need their own `min-h-0`

A definite outer height is necessary but not sufficient; a flex/grid child will
not shrink below its content unless told to.

- **The list column's data component owns the scroll region:**
  `<div className="flex h-full min-h-0 flex-col gap-3">` wrapping the table.
  Without `min-h-0` the table pushes the column past the container instead of
  scrolling inside it. The Suspense **fallback** needs the same wrapper, or the
  skeleton and the loaded table sit at different heights.
- **The detail column's route must return the card as the column's only
  child.** `CustomerCardFrame`/`DetailCard` are `h-full`, so an intermediate
  `<div className="space-y-4">` — a breadcrumb wrapper, typically — reintroduces
  flow height and collapses the card. If the record layout needs a breadcrumb,
  it does not belong in a split view: the list beside it _is_ the way back.

#### Scrolling — never `overscroll-contain` on an in-page pane

The card body and the list pane scroll independently, and both sit **in** the
page rather than over it. `overscroll-behavior: contain` stops the wheel from
reaching the page once a pane is at its bounds — and in Chrome it stops it even
when the pane has nothing to scroll at all. The symptom is that the whole screen
freezes whenever the cursor happens to be over the card, and only moves again
once the pointer is outside it.

So: `overscroll-contain` belongs to overlays — popouts, comboboxes, dialogs, the
widget dock — and to nothing that is part of the page. `DetailCardBody` and
`ListPaneBody` already omit it; do not add it back locally.

#### Checklist before shipping a split view

- [ ] The shell is rendered from `layout.tsx`, not a page.
- [ ] Its container has a definite height — `h-full min-h-0` on `AppShell`, a
      `svh` measure in a Console workspace.
- [ ] The list data component is `flex h-full min-h-0 flex-col`.
- [ ] The Suspense fallback uses the same wrapper as the loaded list.
- [ ] The detail route returns the card directly, with no wrapper and no
      breadcrumb.
- [ ] Opening a record leaves the list beside it, not below it.

Reference implementations: `apps/crm/src/app/(app)/customers/` (AppShell host),
`apps/console/src/app/(app)/orgs/[slug]/workspace/crm/customers/` (workspace
host), and `apps/console/src/app/(app)/settings/users/(team)/`.

## 6. Detail-view toolbar

Detail page headers carry inline actions, not `ResourceToolbar`:

```
[Avatar/Logo]  [Name · badge]      [Edit]  [···]
               [metadata row]
```

- **Primary action** — when a detail page offers a create action (a customer's
  `New Transaction` menu), it is a solid blue `variant="info"` button, the same
  blue as a list page's `Add` (§4). There is exactly one blue on the platform;
  never introduce a second accent or a lighter/darker blue for a detail toolbar.
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

---

## 10. Button labels

Labels are bare verbs: `Add`, `Edit`, `Export`, `Delete`. Never suffix with
the resource/entity name (`Edit Plan`, `Export users`) — the page/section
heading already supplies that context. Metadata `<title>` tags are exempt
(browser tab titles like "Edit Plan • App - Apps" are fine; visible button
text is what this rule constrains).

---

## 10a. Form field anatomy

Every labelled field in a create/edit form uses `FormRow` from `@876/ui/form-row`
— label on the left, control(s) on the right, collapsing to stacked below `sm`.
A fixed label column is what lets two controls share a row without the form
reading as a ragged stack.

- **Spacing between a label and its control comes from `Label`**, which carries
  `mb-1.5`. Never add `mt-*` to an `Input`/`SelectTrigger` to create that gap —
  that is how the gap ends up different on every form. The one exception is a
  `Label` sitting **inline** beside a `Checkbox`/`Switch`/`Radio`, which must
  pass `className="mb-0"` or it sits 6px below its control.
- **Required fields** are marked by `FormRow`'s `required` prop: the label turns
  `text-destructive` and gains an asterisk. The asterisk is rendered **outside**
  the `<label>` and `aria-hidden`, so it never becomes part of the control's
  accessible name.
- **Guidance goes in `FormRow`'s `hint`**, which renders an info tooltip beside
  the label — never as a `<p>` under the control. This is the same rule as
  `CLAUDE.md` → UI Copy; the tooltip is how a form keeps guidance without
  spending a line of layout on it.
- **Long forms split basics from the rest with `Tabs`**, not with a stack of
  separate cards: the always-relevant identity fields stay visible at the top in
  one card, and everything else goes in tabbed cards below.
- Use `EmailInput` (`@876/ui/email-input`) for email and `PhoneInput`
  (`@876/ui/phone-input`, fed by `listDialCodes()` from `@876/core/phone`) for
  phone. Do not hand-roll either.
- A choice between two or three mutually exclusive options is a `RadioGroup`,
  not a `Select`. Reach for a `Select` at four or more, and
  `SearchableSelect` past roughly fifty.

---

## 10b. Page headings — one size

There is exactly one page-title size, `876-page-title` (20px/600, defined in
`packages/ui/src/876.css`). Every page `<h1>` uses that class, including a
filterable list heading (`StatusFilterHeading`) and a detail-page entity name.

Never write a heading as `text-xl`/`text-2xl` + `font-semibold` at a call site.
That is how the platform ended up with a list page and a form page whose titles
differed by 4px — two definitions of the same thing, drifting independently.

---

## 10c. Settings hub layout

The settings landing page uses CSS multi-column (`sm:columns-2 lg:columns-3`)
with `break-inside-avoid` on each card — **not** a grid with cards assigned to
columns by hand. Cards are deliberately different heights; the browser balances
the columns exactly, at every breakpoint, and a new group needs no layout change.
A hand-assigned grid goes stale the moment a group is added, and orphans the
short cards at the bottom of the longest column.

A settings item generated from the module catalog is titled
`"<Module> settings"`, never the bare module label — the bare label collides
with the records it governs (catalog "Warehouse" vs Organization "Warehouses").

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
