# Report 13b — projects-ui automation and blueprint components

## Scope
- Touched only `packages/projects-ui/**` (new `src/automation/` directory + 7 subpath exports in `package.json`). No commit/branch/push. No `eslint-disable` / `as any` / `@ts-ignore` (verified via grep).
- Note: `git status` shows other modified paths (`apps/projects-api/**`, `packages/projects/**`) from the parallel 13a API track; none of those are mine.

## Delivered (`packages/projects-ui/src/automation/`)
- `types.ts` — exact brief contracts (`Transition`, `Blueprint`, `AutomationTrigger`, `AutomationActionType`, `AutomationAction`, `AutomationRule`, `AutomationRun`) plus `AutomationCondition` (extracted condition shape) and `ProjectNotification` (`projects.notification`: `subjectType`/`subjectId`/`title`/`body`/`read`/`createdAt`) to back `notification-list`.
- `labels.ts` — `TRIGGER_LABELS` (7 triggers), `ACTION_LABELS` (9 action types), `RUN_STATUS_LABELS`, and `triggerLabel()` / `actionLabel()` helpers.
- `blueprint-editor.tsx` — `'use client'`; destination-state column summaries (`To <label>`, `Any → X` for null `fromStateKey`, unknown-target note); per-row `from` (Any/state) / `to` / `name` / permission (`No permission` = null) / required-fields checkboxes from `availableFieldKeys` / `Requires comment`; add/remove; serializes to hidden `transitions` JSON input (layout-editor pattern).
- `automation-rule-list.tsx` — template-list pattern (MobileList + desktop table, `hrefBase` with trailing-slash trim + `encodeURIComponent`, `Mar 4, 2026` via `formatDay`): name link, `TRIGGER_LABELS` trigger, `Enabled`/`Disabled` badge (`success`/`secondary`), `N action(s)` count, updated; `No automation rules yet` empty state.
- `automation-rule-editor.tsx` — name, enabled, trigger select; condition rows (field text, op `equals/not-equals/in/is-empty/is-not-empty`, value hidden + omitted for emptiness checks, comma-split array for `in`); action rows with per-type param specs (`set-field`: fieldKey+value; `assign`: assigneeId; `add/remove-label`: label; `create-reminder`/`create-event`: title+daysFromNow number; `notify`: userId+message; `call-webhook`: url; `create-sub-item`: title); serializes full rule to hidden `rule` JSON input; `webhookSecret` password input (`Leave blank to keep the existing secret`) rendered only when a `call-webhook` action exists.
- `automation-run-table.tsx` — rule id (mono), status badge (`success`/`destructive`/`secondary`), error code muted (`—` when null), attempt (tabular), started/finished as `Mar 4, 2026 09:30 UTC` (`—` when unfinished); `No automation runs yet` empty state.
- `notification-list.tsx` — `notifications` + `hrefFor: Record<string, string>` string-map prop; subject link `${base}/${encodeURIComponent(subjectId)}`, plain text when the subject type has no mapping; unread = `font-semibold` title + `Unread` badge + `data-read="false"`; read = muted; body only when present; `formatDay` date; `No notifications yet` empty state.
- Exports: `./automation/types`, `./automation/labels`, `./automation/blueprint-editor`, `./automation/automation-rule-list`, `./automation/automation-rule-editor`, `./automation/automation-run-table`, `./automation/notification-list`.

## Verification
- `pnpm --filter @876/projects-ui typecheck` — pass.
- `pnpm --filter @876/projects-ui test` — 42 files, 551 tests, all pass.
- New tests: 92 `it()` across 6 files (`labels` 19, `blueprint-editor` 17, `rule-list` 12, `rule-editor` 20, `run-table` 11, `notification-list` 13) — floor of 50 met.
- One fix during verification: `BoltIcon` is imported but not re-exported by `@876/ui/icons`, so the rule-list empty state uses the exported `SparklesIcon`. Three checkbox tests switched from `getByLabelText` to `getByRole('checkbox', { name })` because Base UI Checkbox renders a labelled `span[role=checkbox]` plus a labelled hidden input (dual match).
