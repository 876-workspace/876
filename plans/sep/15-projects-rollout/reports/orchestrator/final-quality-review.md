# Final code-quality review — Projects rollout

Status: IN PROGRESS (findings collected during phases 10–16; fixes on `fix/projects-rollout-review`).

## Findings already fixed in-phase
| Phase | Finding | Fix |
| --- | --- | --- |
| 10 | Workload summed point estimates as "planned minutes" (invented value) | planned minutes = 0 until an effort field exists |
| 12 | projects-ui carried a second layout-rule evaluator | re-exports `@876/projects/layout-rules` |
| 13 | Vercel Cron could never call the drain (GET without internal key) | `requireInternalKeyOrCron` + tests |
| 14 | Portal comment/post routes authorized via portal client then wrote with the internal client and returned internal shapes | portal-only API writes + import ban test |
| 14 | API test floor missed (54/100) | +208 tests |
| 15 | Layout form typed only for built-in entities after widening | narrowed with a guard |
| 16 | Webhook SSRF: DNS rebinding, redirects followed, missing ranges, automation webhooks unguarded, empty payload, unlocked claim | brief 16f |

## Open findings (to fix on the review branch)
1. **Duplicate date formatters** — local `formatDate` in `packages/projects-ui/src/{project-detail,project-list,issue-comments,phase-detail,phase-list,issue-list,issue-detail}.tsx` and `apps/projects/src/features/projects/components/{cycle-header,gantt-baselines,phase-comments,work-breakdown,cycle-list-data}.tsx`; `time-tracking.tsx` exports one. Consolidate into one projects-ui formatter.
2. **Duplicate `formatDateInput`** — `apps/projects/src/lib/date-input.ts` and `apps/projects/src/features/reports/capacity-input.ts`.
3. **14 per-route error-status mappers** in `apps/projects/src/app/api/**` (`time-error-status.ts`, `reporting-api.ts`, `template-api.ts`, `custom-modules/api-access.ts`, per-route `createErrorStatus`/`issueErrorStatus`/…). One Projects error→status table.
4. **App-side CSV** `apps/projects/src/lib/custom-modules/record-form-helpers.ts` `toCsv` duplicates the API CSV serializer (and its injection guard). Use the API export.
5. Debt items 7–11 in `briefs-debt.md` (Console-local tables, planned minutes, commerce permission pins, template cycle detector, MCP default write scope).
