# Brief 13a — Projects API: transitions, blueprints, automation rules, outbox worker

Repo `/root/projects/876`. Read `plans/sep/16-projects-phase-13/plan.md` — binding. Also `plans/sep/16-projects-phase-12/plan.md` (layout rule conditions; `packages/projects/src/layout-rules.ts` exists after phase 12).
Rules: `.claude/rules/express-api.md`, `naming.md`, `error-handling.md`, `testing.md`, `deletions.md`, `ai-code-quality.md`, `billing-commercial-platform.md` (events-in-transaction section).
Hard rules: no commit/branch, no `prisma migrate` (hand-write SQL), no `eslint-disable`/`as any`/`@ts-ignore`, no run logs, one verification command at a time. Touch only `apps/projects-api/**` and `packages/projects/**`.

## Reference
Latest module (`src/modules/templates` or `src/modules/layouts`), issues service state-change path (`src/modules/issues/issues.service.ts`), time submit path (`src/modules/time`), finance budget consumption (`src/modules/finance`), reminders/events creation (`src/modules/calendar`), existing crypto helper `@876/core/crypto/secure-field` (grep for usage in other apps), `apps/projects-api/vercel.json` if present (cron).

## Deliver
1. Migration `prisma/migrations/20260925000000_workflow_automation/migration.sql` + schema: transitions, automation rules (secret stored sealed), automation events (outbox: id, tenant, type, subject type/id, payload JSON, causationDepth, createdAt, claimedAt, processedAt, attempts, nextAttemptAt), automation runs, notifications (tenant, userId, kind, title, subjectType, subjectId, readAt, createdAt).
2. Transition enforcement in the issues service state change (required fields read via the resolved layout keys, required comment, required permission passed in by the caller context). Backwards compatible when a type has no transitions.
3. Blueprint `GET/PUT /workflows/:workItemTypeId/blueprint` (validates state keys exist, no duplicate from/to pairs).
4. Outbox append in the **same transaction** as: issue create/update/state change, phase completion, time-entry submit. Budget threshold + due-approaching produced by the sweep.
5. Worker: `src/workers/automation.ts` (claim with `FOR UPDATE SKIP LOCKED` via `$queryRaw` in the repository, evaluate, act, record run, retry with backoff, max 5, depth guard > 3) + internal-key route `POST /internal/automation/drain` (bounded batch, returns counts). Add a cron entry to the service's Vercel config if one exists; otherwise document.
6. Actions call owning module public services (issues/labels/calendar/notifications) — no direct cross-module repository imports. `call-webhook` signs `t=<ts>,v1=<hmac>` over `${ts}.${body}`, 10s timeout via AbortController; never logs the secret.
7. Rules CRUD `GET/POST /automation-rules`, `GET/PATCH/DELETE /automation-rules/:id`, `GET /automation-rules/:id/runs`, `POST /automation-rules/:id/test` (dry-run against a subject id: returns which conditions matched and planned actions, performs nothing). Notifications `GET /notifications?userId`, `POST /notifications/:id/read`.
8. Export `matchesConditions` from `packages/projects/src/layout-rules.ts` (refactor, no second matcher). Client resources `workflows.ts`, `automation-rules.ts`, `notifications.ts` + tests.
9. Test floor **≥ 90 api, ≥ 20 package**: transition allowed/denied/requirements, no-transitions compatibility, outbox row written with mutation and absent on rollback, claim skip-locked query shape, retry/backoff/max attempts, idempotency per (rule,event), depth guard, each action type, webhook signature exact bytes + timeout recorded, secret never serialized, dry-run performs nothing, sweep dedupe per day, tenant isolation.

## Verify
pnpm --filter @876/projects-api exec prisma validate
pnpm --filter @876/projects-api exec prisma generate
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api boundaries
pnpm --filter @876/projects-api test
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test

## Report
`plans/sep/16-projects-phase-13/reports/codex/13a-api.md`.
