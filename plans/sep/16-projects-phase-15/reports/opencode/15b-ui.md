# Brief 15b — projects-ui custom module components

## Delivered
`packages/projects-ui/src/custom-modules/`:
- `types.ts` — `CustomModule`, `CustomModuleStatus`, `CustomModuleRecord`, `CustomModuleWidget`, `WidgetData` per contract.
- `custom-module-list.tsx` — name link via `hrefBase` (id-encoded, trailing-slash trimmed), key subline, scope badge (Organization/Project), field/record counts, `formatDay` updated; mobile list + desktop table; empty state.
- `status-editor.tsx` — client; key/label/category rows, add/remove/move up-down, sorts initial by position, renumbers positions on serialize, hidden `statuses` JSON input.
- `record-list.tsx` — title link via `hrefBase`, `RecordStatusBadge` by category, up to 4 `columns` values via `formatRecordValue` (boolean→Yes/No, array→join, null/undefined/''/[]→em dash), updated date; exports `formatRecordValue`.
- `record-status-badge.tsx` — resolves label/category from `statuses` lookup with explicit `label`/`category` overrides, raw-key fallback; open→outline, in-progress→warning, done→success, unknown→secondary.
- `record-summary.tsx` — title + badge header, `fields` label/value grid with `formatRecordValue`, no grid when no fields.
- `dashboard-widget.tsx` — title + kind-matched body; record-count big number, status-breakdown rows with plain-div bars scaled to largest, recent-records title + statusKey + `formatDay`; kind-mismatch empty notice.
- `package.json` — 7 explicit subpath exports under `./custom-modules/<name>` (types + 6 components).

## Tests — 52 `it()` (floor 45)
- custom-module-list: 10, status-editor: 11, record-list: 10, record-status-badge: 7, record-summary: 6, dashboard-widget: 8.

## Verify
- `pnpm --filter @876/projects-ui typecheck` — clean.
- `pnpm --filter @876/projects-ui test` — 58 files / 693 tests passed.
- No `eslint-disable` / `as any` / `@ts-ignore` in `custom-modules/`.
- Touched only `packages/projects-ui/**` (+ report); no commit/branch/push.
