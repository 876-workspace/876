# Console workspace and record pages

## Changed

- Projects and issues now render their list routes as normal `Page` layouts and their record routes as independent full pages. The four affected route layouts no longer compose `ListDetailSection`; Console continues to render the shared `@876/projects-ui` `ProjectDetail` and `IssueDetail` through the existing host adapters.
- Added the guarded `/workspace` hub, backed by the canonical active-organization and entitlement resolvers. It uses a hub card grid with each organization and its entitled app links, including no-organization and no-app-workspace states.
- Added `/workspace` to `ROUTE_PERMISSIONS` with `console:organizations` and a matching route layout guard.
- Reused the active-organization resolver from the workspace header, eliminating the second direct organization-directory lookup.
- Changed the workspace return control to `Organizations` linking to `/orgs`; the organization switcher remains the single rendering of the selected organization name.
- Changed the root sidebar context title from `Console` to an empty label. This is intentionally no label: Console is already the enclosing product and repeating it beside the collapse control adds no route or scope information. Section and workspace context labels are unchanged.

## Tests

Added 16 `it()` cases across workspace guard, workspace switcher, sidebar-context, and full-page Projects/Issues layout coverage. They cover the `/workspace` allow/denial guard paths, its registry permission, the non-duplicated organization header label, informative drill-down labels, and record routes that no longer mount a split view.

## Verification

- `pnpm --filter @876/console typecheck` — passed.
- `pnpm --filter @876/console lint` — passed.
- `pnpm --filter @876/console test` — started in the foreground; observed unrelated existing failures in `subscription-billing-summary.advanced.test.tsx` and concurrently-owned `sidebar.test.tsx`. The complete suite output could not be obtained before the command runner returned its streaming result.
- `node scripts/check-app-structure.mjs` — passed: `app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects)`.

The shell gutter token exists on this branch (`Page` uses `--876-shell-gutter`), but dispatch identified its current value as defective and assigned that repair elsewhere. Requests spacing was intentionally left unchanged: no token consumption, local margin, or workaround was added.

`@876/projects-ui` still has the current `ProjectDetail` signature with `projectsHref` and its internal Back to projects control on this branch, so Console retains that required prop. No concurrent redesign removing it was present while this change was made.
