# Brief 13c — Projects app: blueprints, automation rules, runs, notifications

Repo `/root/projects/876`. Write code only; no commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`; no run logs. Touch only `apps/projects/**` (another agent edits `apps/console/**`). Read `plans/sep/16-projects-phase-13/plan.md`.

## Read
`packages/projects/src/resources/{workflows,automation-rules,notifications}.ts`; props of `packages/projects-ui/src/automation/*.tsx`; patterns `apps/projects/src/app/(app)/settings/layouts/**` and their routes; the issue state-change UI (grep `status` updates in `apps/projects/src/features/issues` or the board).

## Deliver
- Settings → **Workflows**: per work-item type blueprint page with `BlueprintEditor` (PUT on save).
- Settings → **Automation**: rule list, new, edit (`AutomationRuleEditor`), enable/disable, delete, runs table, "Test" (dry-run against a work item identifier → shows matched conditions and planned actions).
- **Notifications**: topbar bell count (server-rendered unread count in the shell, no polling) + `/notifications` page with mark-read.
- State change UI (board drag and detail status select): when the API returns `projects/transition-requirements-unmet` or `projects/transition-not-allowed`, show a local `AppError` beside the control listing missing fields / required comment; when a comment is required, offer a comment field and retry.
- Routes: `app/api/workflows/[workItemTypeId]/blueprint/route.ts`, `app/api/automation-rules/**` (incl. `runs`, `test`), `app/api/notifications/**` — `projects.edit` for writes (workflows/automation), notifications scoped to `auth.userId`.
- Tests floor **45 `it()`**.

## Verify
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs projects
pnpm check:rsc-boundaries

## Report
`plans/sep/16-projects-phase-13/reports/codex/13c-app.md`.
