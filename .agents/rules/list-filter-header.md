# List Filter Header (`StatusFilterHeading`)

Read this before adding, changing, or reviewing status filtering on a
Console list page. It documents the Zoho-Books-style filterable heading
pattern: the page title itself is the filter control, rather than a
separate segmented control or select sitting next to it. See
`.claude/rules/toolbar.md` (the `titleFilter` prop) and
`.claude/rules/app-layout.md` (list-page container/toolbar layout) for the
surrounding conventions.

## When to use it

Any Console list page filtered by a lifecycle status (active/inactive,
active/suspended/archived, etc.) — currently Apps, Organizations, and
Users. Do not build a new standalone selector (`<Select>`, segmented
control) next to `ResourceToolbar` for this purpose; use this pattern
instead so every list page filters the same way.

## The component

`apps/console/src/components/status-filter-heading.tsx` exports
`StatusFilterHeading`:

```tsx
type StatusFilterOption = { value: string; label: string }

type Props = {
  label: string // fallback label (e.g. the page title, "Apps")
  value: string // current status, resolved server-side from the URL
  options: StatusFilterOption[] // plain {value,label}[] — no icons/functions
  paramKey?: string // URL query param name, defaults to 'status'
}
```

It renders the active option's label with a chevron inside an `<h1>`,
opens a `DropdownMenu` on click, and each item is a `Link` that navigates
to `?<paramKey>=<value>` (preserving other query params, clearing `after`/
`before` pagination cursors). Pass it as `ResourceToolbar`'s `titleFilter`
prop, not as a sibling element.

## URL convention

- Status lives in the URL as `?status=<value>`.
- `status` absent, or `status=all`, means **no status filter** — pass
  `undefined` to the `$876` call, not the literal string `"all"`.
- Any other value is validated against that resource's known status set
  (a small `is<Resource>Status()` type guard, e.g. `isAppStatus`,
  `isOrgStatus`, `isUserStatus` in `apps/console/src/lib/`); an unknown or
  missing value resolves to `all`.

## The hard rule: thread the value into `$876.<resource>.list()`

The server component resolves the status from `searchParams`, then
**must** pass it into the `$876` call:

```ts
const { status } = await searchParams
const selectedStatus =
  status === 'all' || !isUserStatus(status) ? 'all' : status
const userStatus = selectedStatus === 'all' ? undefined : selectedStatus

const result = await $876.users.list({ limit: 25, status: userStatus })
```

Never call a bare `.list()` and filter the returned rows client-side or
in the page component when the page exposes a status filter — that silently
breaks pagination (`has_more`/cursors are computed against the unfiltered
set) and does the API's job in the wrong layer. If a resource's `list()`
(or `search()`) does not yet accept a `status` param, that is a gap to
close in `apps/api` (repository filter + router query param) and the
admin/SDK client method — not a reason to fake the filter in Next.js. See
`.claude/rules/api-backend.md` and `.claude/rules/sdk-conventions.md`.

## Copy-paste example for a new list page

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

## RSC → client serialization constraint

`StatusFilterHeading` is a client component. Its `options` prop must stay
plain, serializable `{ value, label }[]` data built in the server
component — never pass icon components or functions across the boundary.
The component imports its own `ChevronDown`/`CheckIcon` from `@876/ui/icons`
internally; it does not accept them as props.

## Interaction with search (`q`)

On pages that also support free-text search (Organizations, Users), the
status filter and search co-exist: thread `status` into both the `.list()`
call and the `.search()` call so a search query narrows within the active
status, not across all statuses.
