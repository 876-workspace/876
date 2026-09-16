# Brief 3: the full request experience inside the finance apps

Same branch, same rules and prohibitions as the earlier briefs. Do not commit,
do not branch, do not open a PR.

This replaces the "a list and a composer" scope of Phase D's UI with the real
thing: a working request surface on the customer record, and a request record
you can actually operate.

## Read first

`.claude/rules/app-layout.md` — especially §5a **list/detail split view**, §4
`ResourceToolbar`, §5 `StatusFilterHeading`, §12 table cell hierarchy — plus
`data-loading.md`, `navigation-performance.md`, and `shared-product-ui.md`.

## The shape

On the customer record's **Requests** tab, the requests list and an opened
request live **side by side on the same page**. Selecting a request opens it in
the detail column; the list narrows to a sidebar and stays visible. Closing
returns to the full-width list. This is exactly the existing platform pattern —
use the shared components, do not build a new layout:

| Import                                                                                                                                                                                               | Role                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `@876/ui/list-detail-shell` → `ListDetailShell`, `useListDetailRoute`, `useDetailSegments`                                                                                                           | the animating two-column grid |
| `@876/ui/list-pane` → `ListPane`, `ListPaneHeader`, `ListPaneBody`, `ListPaneItem`, `ListPaneEmpty`                                                                                                  | the condensed sidebar list    |
| `@876/ui/detail-card` → `DetailCard`, `DetailCardHeader`, `DetailCardRouteTabs`, `DetailCardBody`, `DetailCardHeadline`, `DetailCardSection`, `DetailCardFacts`, `DetailCardFact`, `DetailCardIdBar` | the request record card       |
| `@876/ui/resource-toolbar` → `ResourceToolbar`                                                                                                                                                       | the toolbar                   |
| `@876/ui/status-filter-heading` → `StatusFilterHeading`                                                                                                                                              | the status filter             |

Routes, per app (`apps/invoice`, `apps/billing`), mirroring each other:

```
/customers/[customerId]/requests                     list, full width
/customers/[customerId]/requests/new                 composer in the detail column
/customers/[customerId]/requests/[requestId]         request record — overview
/customers/[customerId]/requests/[requestId]/tasks
/customers/[customerId]/requests/[requestId]/activity
```

Render `ListDetailShell` from the **`requests` segment's `layout.tsx`**, never
from a page — that is what keeps the toolbar and list mounted across every
navigation below it, and what makes the grid animate instead of remounting.

### Height — the failure this layout is known for

`ListDetailShell` needs a container with a **definite** height. Both finance
apps run on `AppShell`, so use `h-full min-h-0`; give the list data component
`flex h-full min-h-0 flex-col`, give the Suspense fallback the same wrapper, and
return the card as the detail route's **only** child with no wrapper and no
breadcrumb. If the card renders at the top with the list far below it, the height
is indefinite — that is the cause, every time. Do not add `overscroll-contain`
to either pane.

## Toolbar

A real `ResourceToolbar`, never a bare `<h3>` and a `<Button>`:

- `titleFilter` is a `StatusFilterHeading` over request status, `paramKey`
  defaulting to `status`, with `all` meaning no filter. Thread the resolved
  status into the CRM list call — **never** filter returned rows in the page;
  that silently breaks pagination.
- `primaryLabel="Add"`, `primaryVariant="info"`, pointing at `…/requests/new`.
  Bare verb only.
- `refresh` set, plus `dropdownActions` for Export.
- The toolbar, the tab strip, and the table's `<thead>` render **immediately**.
  Only the rows shimmer, behind a `DataTableSkeleton` carrying the real columns
  kept in a `*-skeleton-columns.ts` beside the table.

## The request record

`DetailCardRouteTabs` over **Overview**, **Tasks**, **Activity**. Each tab is its
own route, so each gets its own boundary and its own URL.

- **Overview** — `DetailCardHeadline` for the subject; `DetailCardFacts` for
  status, priority, assignee, team, category, requester, created/updated; the
  related financial record rendered as a link when present; the opening
  description; and a note composer that appends to the request.
- **Tasks** — the request's tasks with their status, assignee, and due date, and
  an add-task action. Use the existing `requestTasks` resource; do not invent a
  second task concept.
- **Activity** — the request's event timeline. `@876/crm-ui/request-events`
  already exists — reuse it, do not write a second timeline.

Status, priority, and assignee are editable inline from the record, each through
its own thin route handler guarded on `requests.edit`.

## Permissions

Add `requests.edit` alongside `requests.view` and `requests.create` in both
finance catalogs in `packages/core/src/access/catalogs.ts`. Grants derive
automatically from `apps/api/src/seeds/app-access.ts`. Every route handler and
every page guards on the same key its navigation entry requires, and the binding
test must cover the new keys.

## Shared, not copied

Every one of these surfaces goes in `@876/crm-ui` as its own subpath export and
is rendered by **Invoice, Billing, CRM, and Console** alike. Presentation only:
no fetch, no session, no service client, no hard-coded route — hosts pass data,
href builders, and callbacks. A copy of any of these inside an app is the
failure this rule exists to prevent.

CRM's own `customers/[customerId]/requests` and Console's
`workspace/[orgSlug]/crm/customers/[customerId]/requests` must render the same
components, so the experience is identical wherever the record is opened.

## Tests

On top of the counts already owed, add at least:

- 12 for the split view: opening a request keeps the list mounted; the toolbar
  never unmounts; closing returns to full width; a route group or parallel slot
  is not mistaken for an open record; the status filter reaches the list call.
- 10 for the record: each tab renders its own content; inline status/priority/
  assignee edits call the right handler with exact arguments; a failed edit keeps
  the card mounted and shows the error in place.
- 6 for the tasks tab, including adding a task and the empty state.
- 4 for `requests.edit` guard coverage, positive and negative.

## Report

Append to the existing report with counted `it()` totals and anything not done.
