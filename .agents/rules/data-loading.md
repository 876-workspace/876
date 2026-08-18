# Live Data Loading Strategy

Read this before creating or editing any Next.js page, layout, loading state, form,
or server component that renders live data. This is the default loading strategy
for the 876 ecosystem. Console is the first app required to conform everywhere;
new work in the other workspace-style apps must follow the same shape.

This rule complements `data-fetching.md` (where data comes from),
`navigation-performance.md` (where route boundaries live), and the performance
waterfall rules (how requests are scheduled).

## The invariant

**Render everything that does not require live I/O immediately. Suspend only the
smallest region that actually needs the data.**

Page chrome includes headings, `ResourceToolbar`, breadcrumbs, tabs, search and
filter controls whose values come from route params, static links/actions, table
column headers, section labels, form shells and static form fields, and stable
layout containers. Live data includes HTTP service calls through `$876`, typed
SDK/admin clients, provider-backed reads, database-backed app services, or any
helper that performs those reads.

Do not make the top-level page wait for live data before it can return otherwise
renderable JSX.

```tsx
// ✅ Canonical list shape
export default function CustomersPage({ searchParams }: Props) {
  return (
    <Page>
      <CustomersToolbar />
      <Suspense fallback={<CustomersTableSkeleton />}>
        <CustomersTableData searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}

async function CustomersTableData({ searchParams }: Props) {
  const params = await searchParams
  const result = await $876.customers.admin.list({ limit: 25 })
  return <CustomersTable data={result.data?.data ?? []} />
}
```

```tsx
// ❌ Blocks the whole page on a live request
export default async function CustomersPage() {
  const result = await $876.customers.admin.list({ limit: 25 })
  return (
    <Page>
      <CustomersToolbar />
      <CustomersTable data={result.data?.data ?? []} />
    </Page>
  )
}
```

## Page and layout rules

1. Keep top-level `page.tsx` as a synchronous shell whenever possible. Passing a
   `params` or `searchParams` promise into the async data child is preferred to
   awaiting it above the boundary.
2. It is acceptable to resolve params/search params above the boundary when the
   value is needed to render real chrome (for example a selected status label),
   but **do not perform live I/O there** unless the value is genuinely structural.
3. Layouts may block for authorization or genuinely structural routing decisions
   only. Make those reads request-cached and as cheap as possible. Decorative or
   panel data never belongs in a blocking layout.
4. `loading.tsx` must mirror the real page shape and obey the route-group rules in
   `navigation-performance.md`. It is not a substitute for a well-placed inner
   Suspense boundary.

## Boundary granularity

Use one boundary per independently useful live region.

- A table whose rows need several inputs can use one boundary and fetch those
  inputs together.
- Two dashboard cards that can render independently get two boundaries. A slow
  Billing call must not hold an unrelated Core card open.
- Secondary/optional enrichment should not delay primary content when the UI can
  truthfully render without it; stream or degrade it separately.
- Do not put the entire page under one generic spinner/skeleton just because
  several children read data.

Inside a single boundary, start independent requests together with
`Promise.all`. Do not write sequential awaits unless the second request needs the
first request's result.

## Forms are shells too

**Do not suspend an entire create form because one select, picker, lookup ID, or
secondary default comes from live data.** The form itself is stable UI.

For create/configuration forms:

- render static labels, text inputs, textareas, toggles, buttons, sections, and
  navigation immediately;
- start live option/default requests on the server as early as possible;
- pass the server-started promise/value into the client form when necessary;
- keep the real dependent control mounted and temporarily disable only that
  control while its options resolve;
- replace only the live portion with an in-place loading state (`Loading…`, a
  select-sized skeleton, picker rows, etc.);
- silently populate options when they arrive without resetting unrelated form
  state;
- disable submit only when a still-unresolved dependency is actually required to
  submit safely;
- if an async default arrives after the user could have typed, apply it **only if
  that field is still untouched**. Never overwrite user input during hydration.

A server-started promise may be adopted in a client component (for example via a
small `useAsyncValue` helper) so the surrounding form stays mounted. That is not
permission to issue a second browser fetch. The owning server/service call should
still start on the server.

```tsx
// ✅ The form is immediate; only the DB-backed select waits.
export default function NewCustomerPage() {
  const branches = loadBranches()
  return <CustomerForm branches={branches} />
}

function CustomerForm({ branches }: { branches: Promise<Branch[]> }) {
  return (
    <form>
      <Input name="name" />
      <AsyncBranchSelect branches={branches} />
      <Button type="submit">Create</Button>
    </form>
  )
}
```

```tsx
// ❌ One options request hides every field in the form.
<Suspense fallback={<WholeFormSkeleton />}>
  <FormThatAwaitsBranches />
</Suspense>
```

### When a whole-form fallback is valid

Whole-form suspension is reserved for cases where the live record genuinely
**is the form state** or determines its safe schema/authorization. Typical
examples are edit forms whose existing values must be loaded before fields can
be initialized, or a structural permission/route decision that changes which
form is legal to render.

Do not render an edit form blank and later backfill its values; that creates the
same overwrite/race problem described above. In those cases, a shape-matched
form fallback is correct.

## Lists, pagination, search and enrichment

List pages follow `/users` and `/orgs` in Console:

- server-render the toolbar/search/filter chrome immediately;
- fetch a bounded page (`limit`, cursor pagination) in the async table child;
- perform status/search filtering in the owning API, not by trimming returned
  rows in the UI;
- render `DataTableSkeleton` with the real columns while rows are in flight;
- use a **batch or purpose-built endpoint** for page-wide enrichment;
- never issue one HTTP request per row (`Promise.all(rows.map(retrieve))` is still
  an N+1 even though it is parallel).

If the typed facade lacks the batch operation, add it to the owning service and
client instead of normalizing the N+1 in page code.

## Fallback quality

Fallbacks describe the final layout, not merely that "something is loading."

- Tables: `DataTableSkeleton` with the real column set and a realistic row count.
- Cards/panels: preserve the card/grid dimensions and shimmer only live values.
- Create forms: keep the real form mounted; show loading state only inside the
  live-dependent control/picker.
- Edit forms whose initial values are live: a shape-matched whole-form fallback
  is acceptable.
- Never replace stable controls or headings with grey bars.
- Avoid layout shift between fallback and resolved content.

## Server first for initial data

Do not move initial Console data into a new `useEffect` fetch, SWR, React Query,
or a browser Route Handler merely to avoid blocking a Server Component. The fix
is the server-component/Suspense or server-started-promise boundary above. Client
fetching is for genuinely client-driven revalidation, polling, optimistic
interaction, or browser-only behavior.

A client effect that **only observes/resolves a promise already started on the
server** is allowed for field-level form hydration. It must not duplicate the
network request.

## Errors and resilience

Primary data failures should surface through the route/error boundary. Optional
enrichment may degrade independently only when the product semantics remain
truthful. Form-local option failures should remain local when the rest of the
form is still useful; explain the unavailable control and prevent only actions
that require it. Never turn an infrastructure failure into an empty primary
dataset or silently hide a required authorization failure.

## Review checklist

Before merging a live-data page change, verify:

- [ ] Stable page chrome renders before live I/O completes.
- [ ] Live reads occur behind the nearest useful boundary or server-started promise.
- [ ] Independent live regions do not block one another.
- [ ] Independent requests inside one region start together.
- [ ] Create forms are not hidden because one control needs live options/defaults.
- [ ] Async form hydration cannot overwrite a field the user already edited.
- [ ] Edit forms only use whole-form fallback when live values genuinely define the form.
- [ ] No per-row HTTP/database/provider N+1 was introduced.
- [ ] Lists are bounded/paginated and filtered by the owning service.
- [ ] Fallback shape matches the resolved UI.
- [ ] Route-level `loading.tsx` does not stack over a route group incorrectly.
- [ ] Auth/permission blockers are cached and remain outside streamable content.
- [ ] Initial server data was not refetched client-side to work around a bad boundary.
