# C3 implementation report

## Delivered

- Strict same-origin POST/PATCH/DELETE adapters for work item types, workflow
  states, milestones, and custom fields. Every route uses `settings.edit` and
  delegates directly to the matching Projects service resource.
- Typed browser clients for those routes.
- Linked server-rendered settings pages with initial-load and mutation errors,
  empty/populated states, creation, and archive actions.
- Issue creation now loads workspace structure, uses default type/state,
  limits milestones to the selected project, and submits only set custom-field
  values. The form supports every current field type, including Markdown
  descriptions and textarea, select, multi-select, date, user, URL, decimal,
  number, and boolean values.

## Verification

- `pnpm --filter @876/projects-app typecheck` — passed.
- Focused Vitest run for settings routes, browser clients, settings UI, and the
  issue form — passed: 4 files, 14 tests.
- `pnpm --filter @876/projects-app test` still has pre-existing jsdom navigation
  failures: 10 assertions in `users-list.test.tsx` and 6 in
  `member-card.test.tsx`. Those tests are unrelated to this feature and were
  not changed.

## Limitations

Issue edit deliberately remains outside this phase. Settings changes create or
archive records; the typed PATCH endpoints are available for a later dedicated
edit interaction.
