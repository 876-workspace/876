# Live Data Loading Strategy

Read this before creating or editing any Next.js page, layout, loading state, or
server component that renders live data. This is the default loading strategy
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
column headers, section labels, and stable layout containers. Live data includes
HTTP service calls through `$876`, typed SDK/admin clients, provider-backed
reads, database-backed app services, or any helper that performs those reads.

Do not make the top-level page wait for live data before it can return otherwise
renderable JSX.

```tsx
// ✅ Canonical shape
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
   but **do not perform live I/O there**.
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
- Forms whose options are live: render the real breadcrumb/title/actions and a
  form-shaped body fallback.
- Never replace stable controls or headings with grey bars.
- Avoid layout shift between fallback and resolved content.

## Server first for initial data

Do not move initial Console data into `useEffect`, SWR, React Query, or a browser
Route Handler merely to avoid blocking a Server Component. The fix is the
server-component/Suspense boundary above. Client fetching is for genuinely
client-driven revalidation, polling, optimistic interaction, or browser-only
behavior.

## Errors and resilience

Primary data failures should surface through the route/error boundary. Optional
enrichment may degrade independently only when the product semantics remain
truthful. Never turn an infrastructure failure into an empty primary dataset or
silently hide a required authorization failure.

## Review checklist

Before merging a live-data page change, verify:

- [ ] Stable page chrome renders before live I/O completes.
- [ ] Live reads occur in async children behind the nearest useful Suspense boundary.
- [ ] Independent live regions do not block one another.
- [ ] Independent requests inside one region start together.
- [ ] No per-row HTTP/database/provider N+1 was introduced.
- [ ] Lists are bounded/paginated and filtered by the owning service.
- [ ] Fallback shape matches the resolved UI.
- [ ] Route-level `loading.tsx` does not stack over a route group incorrectly.
- [ ] Auth/permission blockers are cached and remain outside streamable content.
- [ ] Initial server data was not moved client-side to work around a bad boundary.
