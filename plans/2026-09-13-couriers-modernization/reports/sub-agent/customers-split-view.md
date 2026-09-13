# Report — Brief B: Couriers customers split view

Status: done. Not committed. Renames and deletions were made with `git mv`/`git rm`, so they are staged in the index. Everything else is unstaged.

## Shape

`apps/couriers/src/app/[orgSlug]/customers/` now has the same five-file shape as Billing/CRM:

| File | Change / why |
| --- | --- |
| `layout.tsx` | Rewritten. Awaits `params` only. Renders `CustomersSection` with the list in Suspense (`DataTableSkeleton` inside the `flex h-full min-h-0 flex-col` wrapper). The toolbar and list now survive every route below. |
| `_components/customers-section.tsx` | New (client). `ListDetailSection` + `ResourceToolbar`/`StatusFilterHeading` (status read with `useSearchParams`), Add/refresh/dropdown kept. `takeoverSegments = ['edit']`. |
| `_components/customers-list.tsx` | New (client). Full `CustomersTable` when closed; `ListPane` when open (avatar, name, company or email, **status Badge**). Selection comes from `useDetailSegments`, the query string is kept on row links, `new` selects nothing. Filters by **courier profile status**. |
| `_components/customers-list-data.tsx` | Renamed from `customers-table-data.tsx`. Takes `{ orgSlug }`. Still lists this workspace's own profiles, then resolves identity with batched `ids`. Loads every profile page with no status query (a layout gets no `searchParams`; there is a comment saying so). Returns the flex/min-h-0 column. |
| `_lib/customers-list-config.ts` | Adds `resolveCustomerStatusFilter`, shared by the section and the list. |
| `(list)/page.tsx` | Now returns null. |
| `(list)/loading.tsx` | Deleted. The layout owns the chrome now, and a null page needs no fallback. |
| `[id]/layout.tsx` | Deleted. It rendered a second `DetailHeader` above the one in `(detail)/layout.tsx`, so every tab route got a doubled header. `DetailChromeGate` existed only to hide it on `/edit`. |
| `[id]/(detail)/layout.tsx` | Rewritten as a `DetailCard`. The header streams behind Suspense keyed by id, and `notFound()` lives there. The actions (`CustomerActions`: Edit + Delete) are unchanged. Tabs are built from params with the same `customerTabs`. Has `closeHref`. `generateMetadata` is unchanged. |
| `[id]/(detail)/page.tsx` | Moved from `[id]/page.tsx` so that `edit` sits outside the card. Nested `876-card` boxes are replaced with `DetailCardSection`/`DetailCardFacts`. Same fields. |
| `new/page.tsx` | Opens in the detail column as a `DetailCard` (header + close + body). The access check and option loading are unchanged. |
| `[id]/edit/*` | Unchanged. It is a takeover route and keeps its own `Page` and breadcrumb. |

## Tests

- `customers-list.test.tsx` (new): 9 cases. They cover the table when closed, ignoring the `(list)` group, the status filter, an unknown status, the condensed pane and selection, badge/subtitle kept, the query kept on links, `new` selecting nothing, and the empty pane.
- `customers-section.test.tsx` (new): 5 cases. They cover the toolbar and Add action, the list kept beside an open record, `new` not taking over, `edit` taking over, and the heading following the filter.
- `customers-list-data.test.tsx` (renamed/updated): the signature changed. The two "status threaded into the query" tests are replaced by one that checks the client-side profile-status filter and that `list` is called with no status, plus a new pagination test. The count is unchanged.
- 14 new cases in total.

## Verification (foreground)

- Typecheck `tsc --noEmit`: exit 0. First I had to delete a stale `.next/types/app/[orgSlug]/customers/[id]/page.ts` left over from an old build; it still pointed at the moved page.
- `eslint .`: 0 errors. There are 13 warnings, all pre-existing and outside this scope.
- `vitest run`: 75 files, 790 tests, all passing.
- `node scripts/check-app-structure.mjs`: OK.
- No `eslint-disable` or `as any` in scope.
- I ran the binaries directly instead of `pnpm --filter`. pnpm refused with `ERR_PNPM_OUTDATED_LOCKFILE`, because another agent's in-progress change adds `@876/billing-ui` to `apps/couriers/package.json`.

## Not done / notes

- `src/components/patterns/detail/detail-chrome-gate.tsx` has no callers now. I left it alone because it is outside my file scope; it can be deleted.
- The status filter is now applied on the client over the full profile set, as the rules for list/detail sections allow. This moves filtering out of the API query, but the old code already fetched every page.
- The header badge now shows the courier **profile** status. The deleted `[id]/layout.tsx` showed registry status; the `(detail)` layout already used profile status, and that is the one kept.
- I have not checked it in a browser.
