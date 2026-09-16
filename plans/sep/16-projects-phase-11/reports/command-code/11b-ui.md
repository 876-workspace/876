# Brief 11b — `@876/projects-ui`: template components

- Branch: `feature/projects-phase-11-templates`
- Scope: `packages/projects-ui/**` only. Nothing under `apps/**` or `packages/projects/**` was opened or edited — `apps/projects-api` and `packages/projects` are the other agent's lane and are untouched.
- Built against plan.md §Contracts exactly; no schema or contract change was proposed from this lane.

## Files

### Contracts

- `src/templates/types.ts` — `ProjectTemplate` and `TemplatePreview` copied field-for-field from plan.md §Contracts (the only changes are that each declaration is `export`ed and the file is prettier-wrapped; no field name, type, optionality, nesting, or literal differs). Data-types-only, imports nothing, mirrors `src/reports/types.ts`.

### Components (each exported as its own subpath)

| File                          | Export                 | Props                                                                    |
| ----------------------------- | ---------------------- | ------------------------------------------------------------------------ |
| `template-list.tsx`           | `TemplateList`         | `{ templates: readonly ProjectTemplate[]; hrefBase: string }`             |
| `template-summary.tsx`        | `TemplateSummary`      | `{ template: ProjectTemplate }`                                           |
| `template-preview-table.tsx`  | `TemplatePreviewTable` | `{ preview: TemplatePreview }`                                            |
| `instantiate-options.tsx`     | `InstantiateOptions`   | `{ defaultValues?: Partial<InstantiateOptionsValues> }`                   |

`template-list.tsx` also exports the pure helper `formatTemplateCounts(counts): string`; `instantiate-options.tsx` exports `InstantiateOptionsValues` and `INSTANTIATE_OPTION_DEFAULTS`. Only `instantiate-options.tsx` carries `'use client'` — the other three are presentation-only, so an app server component can render them directly.

### Edited

- `package.json` — five `./templates/…` subpath entries (`types` + `default` pair each: `types`, `template-list`, `template-summary`, `template-preview-table`, `instantiate-options`), appended after the `./reports/…` block. Diff is +20 lines, nothing else.

## Counted tests

New `it()` in `@876/projects-ui`: **47** (floor 30). Full package suite: **33 files, 361 tests passed** (314 pre-existing + 47 new).

| File                                         | `it()` |
| -------------------------------------------- | ------ |
| `src/templates/template-list.test.tsx`       | 14     |
| `src/templates/template-preview-table.test.tsx` | 12  |
| `src/templates/template-summary.test.tsx`    | 11     |
| `src/templates/instantiate-options.test.tsx` | 10     |
| **total**                                    | **47** |

What they prove:

- **template-list (14)** — the name links to `${hrefBase}/${encodeURIComponent(id)}` (encoding asserted with `tpl/one two` → `tpl%2Fone%20two`) · one trailing slash on `hrefBase` is trimmed · the name is a `font-medium` tier-1 link with the description as its muted secondary line · the key is muted + `font-mono` · `v3` renders · the four counts render as one line · counts singularize at 1 (`1 phase · 1 task list · 1 work item · 1 dependency`) · zero counts render `0`, never an em dash · the updated date renders · column headers are exactly `Template, Key, Version, Counts, Updated` · the mobile row carries `agile-sprint · v3`, the updated date, and the same href under the accessible name `View template <name>` · the empty state is the title in both forms with **zero** links · an empty list keeps the table mounted with only the header row and the empty state.
- **template-summary (11)** — the name is a heading · the description renders · `null` description renders an em dash · the key renders as `font-mono` under a `Key` fact · the version renders as a `Badge` · the source project renders · `null` source project renders an em dash · created and updated dates render (`Jan 5, 2026` / `Mar 4, 2026`) · all four counts render with their labels · zero counts render four `0`s · count values carry `tabular-nums`.
- **template-preview-table (12)** — `Starts Mar 2, 2026` from the preview's `startDate` · each phase renders name + start + end · a phase with `null` start/end renders two muted em dashes · each work item renders title + start + due · a work item with `null` start/due renders two em dashes · the phases table is the first table and the work items table the second (neither contains the other's rows) · row counts match the definition (2 phases → 3 rows, 3 work items → 4 rows) · **no** notice when nothing is missing · a `variant="destructive"` alert lists `Work item types: Bug, Spike`, `Workflow states: In review`, `Labels: urgent` · only the groups with keys are listed (empty groups are omitted) · an empty `phases[]` renders the `No phases` row while the work items still render · an empty `workItems[]` renders the `No work items` row while the phases still render.
- **instantiate-options (10)** — three checkboxes exist, one per flag, as `input[type="checkbox"][name="include…"]` · each carries its visible label as its accessible name · all three are checked by default · `defaultValues={{ includeBudgets: false }}` unchecks only budgets · `new FormData(form)` yields `includeWorkItems=true`, `includeDependencies=false`, `includeBudgets=true` as strings · every option's description text renders · the group is a `FIELDSET` named `Include in the new project` holding exactly the three checkbox inputs · each `label[for]` matches its input id · clicking the label of an excluded flag checks it · clicking its control checks it.

## Decisions

1. **Contracts are the plan's §Contracts block, verbatim.** The file is data-types-only and is the single place the app maps its client-package resources into. When `packages/projects` (11a) exports the same shapes, the app can assign them structurally; that duplication is deliberate for this phase and is the one thing to delete if the client package ever exports the template resources themselves.
2. **Explicit `./templates/<name>` entries rather than a `./templates/*` wildcard.** Same reasoning as the reports block: a wildcard cannot resolve `.tsx` (TypeScript substitutes the pattern literally and looks for `template-list.ts`), so every consumer import would fail typecheck. Five explicit entries give the same subpath surface and resolve under TS and the bundlers.
3. **The list keeps the package's mobile + desktop twin-render.** `MobileList`/`MobileListCell`/`MobileListEmpty` + the `876-card` table exactly as `labels-list`/`project-list` do, so the app gets phone rows for free. Content is duplicated across the two forms (as in every other list in the package); tests account for both. The mobile row shows the identity subset — `key · v<version>` with the updated date as meta — because all four counts do not fit a phone row.
4. **One tier-1 cell per row, per `app-layout.md` §12.** Name is tier 1 (the package's existing sky link style, `font-medium`); version and counts are tier 2 supporting values with `tabular-nums`; the key and the updated date are tier-3 muted metadata. The counts cell is a single line — `4 phases · 2 task lists · 12 work items · 3 dependencies` — via `formatTemplateCounts`, because four separate columns would have made five more headers and broken the "one comparable value" reading.
5. **Counts are real values, so zero renders `0`.** Only `null` earns an em dash in these components (§12's empty-value rule); a template with no dependencies is a template with `0 dependencies`. The same logic drives `TemplateSummary`'s four zeroes.
6. **`TemplateSummary` is self-contained.** Detail pages need the facts even when the app renders the name in its own header, so the card carries the name heading, the description (em dash when null), the version badge, four facts (key, source project, created, updated), and the four counts. The app can drop the card under an existing `DetailHeader` without losing anything.
7. **The preview is read-only and sectioned phases-then-work-items.** Two tables rather than one mixed table, because the columns differ (`End` vs `Due`) and the phase rows and item rows are different entities. Dates are the API's computed unix seconds formatted with the package's `formatDay`; a `null` is a muted em dash, never an invented date and never a zero. A destructive `<Alert>` appears **only** when at least one `missing` group has keys, listing exactly the keys the API reported — an empty missing block renders no chrome at all. Empty sections render a one-line `No phases` / `No work items` row so the section headings never sit over nothing.
8. **Instantiation options are named form controls, not component state.** Three uncontrolled `Checkbox`es inside the shared `FieldSet`/`FieldGroup`/`Field` primitives, each with `name`, `id`, `value="true"` and `uncheckedValue="false"`. Base UI renders a native hidden input for the checked case and a second hidden input for the unchecked case, so a plain `new FormData(form)` always yields an explicit `"true"`/`"false"` per flag — no callbacks, no `onChange`, no state, nothing that cannot cross the RSC boundary. Defaults are all-inclusive (`INSTANTIATE_OPTION_DEFAULTS`) because a template's whole point is to carry its contents; `defaultValues` is the caller's opt-out, and a partial object leaves the other flags at their defaults.
9. **Formatting helpers are imported, never re-implemented.** Dates use `formatDay` from `../finance/format-money`, the mobile rows reuse `avatarTone` and the `MobileList*` family, and the summary's badge is the shared `Badge`. The only new helper is `formatTemplateCounts`, which lives in the list module that needs it and is exported so tests and the app can assert the same string.
10. **No class-string concatenation.** Every conditional class is a static string chosen by a ternary (the hazard the 10b report called out with `prettier-plugin-tailwindcss`); nothing in these files builds a `className` by interpolation.

## Verification

| Command                                                                        | Result                                                              |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `pnpm --filter @876/projects-ui typecheck`                                     | pass, exit 0, no output                                             |
| `pnpm --filter @876/projects-ui test`                                          | **fails in this shell only** — see the `NODE_ENV` note below         |
| `NODE_ENV=test pnpm --filter @876/projects-ui test`                            | **33 files, 361 tests passed** (314 pre-existing + 47 new)          |
| `NODE_ENV=test pnpm exec vitest run src/templates` (in `packages/projects-ui`) | **4 files, 47 tests passed**                                        |
| `pnpm exec eslint packages/projects-ui/src/templates`                          | exit 0, no findings (only the next plugin's pages-directory warning) |
| `pnpm exec prettier --write` on the 9 new files + `package.json`               | all formatted, re-run clean                                          |
| `node scripts/check-rsc-boundaries.mjs`                                        | `RSC boundaries OK (10 apps).`                                       |

```
$ pnpm --filter @876/projects-ui typecheck
$ tsc --noEmit
exit=0

$ NODE_ENV=test pnpm --filter @876/projects-ui test
 Test Files  33 passed (33)
      Tests  361 passed (361)

$ NODE_ENV=test pnpm exec vitest run src/templates
 Test Files  4 passed (4)
      Tests  47 passed (47)
```

**`NODE_ENV=production` in this shell.** The brief's bare `pnpm --filter @876/projects-ui test` fails **32 of 33 files** here — every React render test dies with `TypeError: React.act is not a function`, including pre-existing files (`src/reports/project-health-table.test.tsx` fails 9/9 on its own, unchanged by this brief), because react-dom resolves to its production build, which has no `act`. All runs above were made with `NODE_ENV=test`. Environmental, not a code defect; the same note appears in the phase-5, phase-7, phase-8, and phase-10 reports.

**No `lint` script for this package** (`pnpm --filter @876/projects-ui lint` fails before this brief as well). ESLint run directly over the new directory exits 0; the rest of the package still carries the two pre-existing errors this brief did not touch.

My footprint: `packages/projects-ui/package.json` (modified, +20 lines) and `packages/projects-ui/src/templates/` (9 new files). No commit, no branch, no push. No `eslint-disable`, `as any`, or `@ts-ignore`. No data fetching, session, `fetch`, or router import in any new file.

**Read budget:** the three budgeted files (`reports/project-health-table.tsx` + its test, `reports/report-period-nav.tsx`, `package.json` exports) were read first, plus the package's own conventions these components must match — `labels-list.tsx`, `project-list.tsx`, `mobile-list.tsx`, `finance/format-money.ts`, `reports/types.ts`, `timesheet-summary.tsx`, `finance/billing-config-summary.tsx`, `reports/workload-table.tsx` — `.claude/rules/app-layout.md` §12 and `.agents/rules/code-style.md`, and (read-only, to pin form semantics) the Base UI checkbox source in `node_modules`. Nothing outside `packages/projects-ui` was written.

## Unverified items

- **No live render against real API payloads.** Everything was verified against locally declared fixtures typed by the §Contracts block. If 11a's JSON differs by even one field (`counts.taskLists` vs `counts.task_lists`, `currentVersion` as a string, `missing` omitted rather than empty), the app-side mapping is where it has to be bridged — these components do not coerce.
- **No consumer import yet.** The five `./templates/…` exports resolve the same way the working `./reports/…` entries do, and the workspace symlink exposes the new files, but no file in `apps/**` imports them yet, so end-to-end resolution is verified by analogy, not by a real app build.
- **The form's value strings are a convention, not a validated contract.** `InstantiateOptions` guarantees `"true"` / `"false"` per flag name in `FormData`; whether 11c/11a map those strings (or a bare presence check) into the `include*` booleans is not something this component can enforce. An app that tests `=== 'on'` will read every flag as off.
- **The destructive notice is presentation only.** It lists whatever `missing` the preview returns; it does not verify that a listed key exists, does not link to where the type/state/label would be created, and does not block instantiation.
- **No browser or visual pass.** Column widths, the counts line at narrow table widths, the two-table preview stack, and the phone rows at 400 px were reasoned about from the shared primitives (`overflow-x-auto`, `sm:hidden` / `sm:block`), not measured in a browser.
- **`hrefBase` is assumed to be a bare base.** `TemplateList` trims one trailing slash and appends the encoded id; a parameterised route (`/templates?open=`) is not handled and nothing here would catch it.
- **Click behaviour was proven in jsdom only.** The label→control activation is covered by a synthetic click; no real pointer interaction, keyboard toggle, or focus ring was exercised.
