# Brief 8b — Wire time tracking into the Projects app

Repo: /root/projects/876. You write code; you do NOT commit, branch, or push. Another agent is working at the same time in the directories listed under "Do not touch".

## Context
Phase 8 shipped the API (`apps/projects-api`), the client (`packages/projects/src/resources/time-entries.ts`, `timesheets.ts`) and presentation components in `packages/projects-ui/src/` (`time-entry-list.tsx`, `timer-bar.tsx`, `timesheet-summary.tsx`, `timesheet-actions.tsx`, `time-tracking.tsx`). **None of it is reachable in the app.** Your job is the app wiring only.

## Read budget (read these, then start writing)
1. `packages/projects/src/resources/time-entries.ts` and `timesheets.ts` (method signatures)
2. The props of the four projects-ui components above (top of each file only)
3. Pattern for a route handler: `apps/projects/src/app/api/projects/[projectId]/baselines/route.ts`
4. Pattern for browser client: `apps/projects/src/lib/client/baselines.ts`
5. Pattern for a project sub-page: `apps/projects/src/app/(app)/projects/[projectId]/gantt/page.tsx` and `apps/projects/src/features/projects/components/gantt-data.tsx`
6. `apps/projects/src/components/shell/nav-config.ts` and its test

## Deliverables (you own exactly these paths)
- `apps/projects/src/app/(app)/projects/[projectId]/time/page.tsx` (+ `loading.tsx` only if siblings have one) — project time entries list with a manual "Add" entry form, running-timer bar for the current user.
- `apps/projects/src/app/(app)/time/page.tsx` — My time: current timer, my entries for a period, my timesheets (create for period, submit, recall).
- `apps/projects/src/app/(app)/time/approvals/page.tsx` — submitted timesheets to approve/reject (guard `projects.edit`).
- `apps/projects/src/app/api/time-entries/**`, `apps/projects/src/app/api/timesheets/**`, `apps/projects/src/app/api/timer/**` — thin route handlers: `requireApiAccess`, zod strictObject parse, one client call, `apiJson`. **userId always from `auth.userId`, never the body.** No business logic (no self-approval checks, no lock checks — the API enforces those).
- `apps/projects/src/lib/client/time.ts` — typed browser client.
- `apps/projects/src/features/time/components/**` — data loaders / client adapters that feed the projects-ui components.
- A nav entry "Time" → `/time` in `apps/projects/src/components/shell/nav-config.ts` (keep its binding test green).
- Tests beside every route handler (401, 422 invalid body, success, error mapping) and each feature component. Floor: **30 `it()` cases**.

## Rules (binding)
- Pages: synchronous shell, `px-4 pt-5 pb-8 sm:px-6 lg:px-8`, `PageBreadcrumb`, `ResourceToolbar` with **no `description` prop**, data behind `<Suspense>` with a table skeleton. Add button `primaryVariant="info"`, label `Add`.
- Never pass a function from a server component to a client component (`pnpm check:rsc-boundaries`).
- Errors are values: render `AppError` banners, keep chrome mounted; no error toasts.
- Durations come from the server; never compute elapsed minutes in the browser for submission.
- No `as any`, no `eslint-disable`, no `@ts-ignore`.
- If the projects-ui component props don't fit, **report it** — do not edit `packages/projects-ui`.

## Do not touch
`packages/**`, `apps/projects-api/**`, `apps/projects/src/app/(app)/projects/[projectId]/finance/**`, `apps/projects/src/app/api/projects/[projectId]/{billing,budgets,rates,financial-summary,invoice-drafts}/**`, `apps/projects/src/lib/client/finance.ts`, `apps/projects/src/features/finance/**`, `project-tabs.tsx` (already has the Time tab).

## Verify (one command at a time)
```
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs
pnpm check:rsc-boundaries
```

## Report
Write `plans/sep/16-projects-phase-8-9-app/reports/command-code/8b-time-app.md`: files changed, counted `it()` cases, verification output, and everything unverified.
