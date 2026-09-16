# Brief R1 — Projects rollout review: consolidate duplicated helpers

Repo `/root/projects/876`, branch `fix/projects-rollout-review`. No commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`; behaviour must not change except where stated. Read `.claude/rules/ai-code-quality.md`.

## Fix (from `plans/sep/15-projects-rollout/reports/orchestrator/final-quality-review.md`)
1. **One date formatter.** Add `packages/projects-ui/src/format-date.ts` exporting `formatDate(seconds: number | null): string` (em dash for null; use the most common existing format — read the copies and pick the majority `Intl.DateTimeFormat` options; UTC to match existing output) and `formatDateTime` if any copy formats time. Replace local copies in `packages/projects-ui/src/{project-detail,project-list,issue-comments,phase-detail,phase-list,issue-list,issue-detail,time-tracking}.tsx` and `apps/projects/src/features/projects/components/{cycle-header,gantt-baselines,phase-comments,work-breakdown,cycle-list-data}.tsx` (export via `./format-date` subpath). Keep `time-tracking`'s export as a re-export only if external imports use it.
2. **One `formatDateInput`**: delete the copy in `apps/projects/src/features/reports/capacity-input.ts`, import from `apps/projects/src/lib/date-input.ts`.
3. **One error→HTTP status table** for the Projects app: `apps/projects/src/app/api/_lib/error-status.ts` exporting `projectsErrorStatus(code: string): number` built from the union of every mapping in `time-error-status.ts`, `reporting-api.ts`, `template-api.ts`, `apps/projects/src/lib/custom-modules/api-access.ts` (`serviceErrorStatus`), `attachments/_lib/attachments-api.ts`, and the per-route functions (`createErrorStatus`, `issueErrorStatus`, `relationErrorStatus`, `suggestionErrorStatus`, `dependencyErrorStatus`, `commentErrorStatus`). Rules: `*-not-found` → 404, explicit entries keep their current status, conflicts in existing mappings must be reported (do not guess), unknown → 400. Replace all callers; delete the old helpers; keep route tests green (update only status expectations that were inconsistent, and list them in the report).
4. **App-side CSV**: `apps/projects/src/lib/custom-modules/record-form-helpers.ts` `toCsv` — replace with a route that proxies the API's module report CSV export (the API already serializes CSV with the injection guard); delete the local serializer.

## Verify
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs projects
pnpm check:rsc-boundaries

## Report
`plans/sep/15-projects-rollout/reports/codex/r1-review-fixes.md` (counts of removed copies, any status conflicts).
