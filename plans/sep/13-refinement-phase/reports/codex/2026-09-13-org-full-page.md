# Console organizations: standalone detail page

## Changed

| Path | Reason |
| --- | --- |
| `apps/console/src/app/(app)/orgs/page.tsx` | Adds the full-width organizations list page with immediate toolbar/search chrome and a `DataTableSkeleton`-backed list boundary. |
| `apps/console/src/app/(app)/orgs/layout.tsx` | Retains only the route authorization boundary; it no longer owns split-view UI. |
| `apps/console/src/app/(app)/orgs/[slug]/layout.tsx` | Places the existing detail card in a standard full page and adds the Organizations breadcrumb; removes close affordances while preserving streamed data, tabs, deleted notice, and edit gating. |
| `apps/console/src/app/(app)/orgs/_components/orgs-list.tsx` | Removes the condensed `ListPane` and pathname selection logic; the list now always renders its table or empty state. |
| `apps/console/src/app/(app)/orgs/_components/orgs-list-data.tsx` | Removes split-shell-only height classes. |
| `apps/console/src/app/(app)/orgs/_components/orgs-toolbar.tsx` | Corrects the Add target to `/orgs/new`; keeps Refresh and marks unimplemented Import/Export actions disabled. |
| `apps/console/src/app/(app)/orgs/new/page.tsx` | Keeps creation as its dedicated route and uses the standard Organizations breadcrumb. |
| `apps/console/src/app/(app)/orgs/page.test.tsx` | Adds list page shape, route, and status-threading coverage. |
| `apps/console/src/app/(app)/orgs/[slug]/layout.test.tsx` | Adds standalone detail layout, no-split-shell, and not-found-path coverage. |
| `apps/console/src/app/(app)/orgs/_components/orgs-list.test.tsx` | Replaces condensed-pane expectations with table-only behavior. |

## Deleted

- `apps/console/src/app/(app)/orgs/@list/default.tsx`
- `apps/console/src/app/(app)/orgs/@list/page.tsx`
- `apps/console/src/app/(app)/orgs/(list)/page.tsx`
- `apps/console/src/app/(app)/orgs/(list)/loading.tsx`
- `apps/console/src/app/(app)/orgs/_components/orgs-section.tsx`
- `apps/console/src/app/(app)/orgs/_components/orgs-section.test.tsx`

These were exclusively the Organizations parallel-slot/list-detail implementation.

## Tests

Added 8 `it()` cases: 4 for the list page and 4 for the standalone detail layout. Existing list-data and list behavior coverage remains in place.

## Verification

- `pnpm --filter @876/console typecheck` — passed (`tsc --noEmit`).
- `pnpm --filter @876/console lint` — passed (`eslint`).
- `pnpm --filter @876/console exec vitest run "src/app/(app)/orgs"` — passed: 17 files, 59 tests.
- `node scripts/check-app-structure.mjs` — passed: `app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects)`.

## Gaps

None. Import and Export have no handlers, so they remain visible but disabled through the shared toolbar's newly available `disabled` action field.
