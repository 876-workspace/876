# 16e — Projects MCP: rollout reads + approved writes

## Summary
Extended the 876 Projects MCP server from 17 to 37 tools, keeping the existing
tool shape, auth, and naming conventions. Added 19 read tools covering phases,
cycles, task lists, time entries/summary, all five reports, templates, custom
modules/records, activity, and wiki; plus 1 approved write (`time_entry_create`).
Existing approved writes (`issue_create`, `issue_update`, `issue_comment`) now
enforce the write scope. No delete tools added.

## Tools added
- Reads: `phases_list`, `phase_get` (milestone-backed), `cycles_list`,
  `cycle_get`, `task_lists_list`, `time_entries_list`, `time_summary`,
  `report_work`, `report_health`, `report_time`, `report_budget_variance`,
  `report_workload`, `templates_list`, `template_get`, `custom_modules_list`,
  `custom_records_list`, `custom_record_get`, `activity_list`, `wiki_page_get`.
- Writes: `time_entry_create` (`CREATE` annotations, requires `projects:write`,
  `userId` falls back to `PROJECTS_DEFAULT_USER_ID`).
- Every tool has a strict Zod input schema, a concise description, a matching
  output schema, Markdown-safe text output consistent with existing formatters,
  and API-code tool errors.

## Scope enforcement
- New `PROJECTS_SCOPES` env (comma/space separated) parsed in `config.ts`;
  `hasWriteScope()` returns true when scopes are unset (full operator access,
  preserving existing behavior) and otherwise requires `projects:write`.
- All 7 write handlers (`project_create/update`, `issue_create/update`,
  `issue_comment`, `label_create`, `time_entry_create`) return
  `auth/insufficient-scope` mentioning `projects:write` without calling the API.

## Files (all under `apps/projects-mcp/`)
- `src/config.ts` — `PROJECTS_WRITE_SCOPE`, `scopes`, `hasWriteScope()`.
- `src/schemas.ts` — 20 input + 20 output schemas, `requiredTimestampSchema`.
- `src/format.ts` — 20 formatters (phase/cycle/task-list/time/summary/5 reports/
  template/custom-module/record/activity/wiki).
- `src/handlers.ts` — scope guards on existing writes + 20 new handlers.
- `src/tool-definitions.ts` — 20 registrations (19 read-only, 1 create).
- `src/handlers.rollout.test.ts`, `src/schemas.rollout.test.ts`,
  `src/config.scopes.test.ts` — new coverage; `src/server.test.ts` updated to 37.
- `src/handlers.test-fixtures.ts`, `src/format.test.ts` — repaired pre-existing
  contract drift (`customFields`, `taskListId`/`cycleId`/planned fields,
  `ownerUserId`) so typecheck passes.
- `README.md` — env + tool table updated.

## Verify
- `pnpm --filter @876/projects-mcp typecheck` — clean.
- `pnpm --filter @876/projects-mcp lint` — clean (no errors).
- `pnpm --filter @876/projects-mcp test` — 11 files, 104 `it()` pass
  (floor 45; covers schema rejection, scope denial, client-call args, output text).
- No `eslint-disable`/`as any`/`@ts-ignore`; no commit/branch/push.
