# Brief A — Couriers finance lists onto @876/billing-ui

Repo /root/projects/876, branch feature/couriers-modernization. Do NOT commit, branch, or write log files.

Goal: `apps/couriers/src/app/[orgSlug]/{invoices,payments,items}` must render the shared tables from `@876/billing-ui` (`invoices-table`, `payments-table`, `items-table`, and `document-status`/`invoice-status` where relevant) instead of app-local copies. Delete the app-local table components once replaced (and their now-dead tests), keep skeleton column files aligned to the shared table's columns.

Read first: .claude/rules/finance-app-parity.md, shared-product-ui.md, app-layout.md, data-loading.md, testing.md, ai-code-quality.md. Use `apps/billing/src/app/(app)/{invoices,payments,items}` and `apps/invoice` as reference hosts for how they adapt these components (hrefs, props).

Rules:
- Host keeps data loading, authority, hrefs; shared component renders. If the shared component lacks a needed variation, add a typed prop to the package (with a test) — never fork.
- Add `@876/billing-ui` to couriers package.json if missing; transpile list comes from scripts/shared-ui-packages.mjs.
- Keep toolbar + Suspense + DataTableSkeleton shape intact. No eslint-disable, no as any.
- Files in scope: those three route dirs, apps/couriers/package.json, packages/billing-ui (props only). Do NOT touch customers/ (another agent is there).

Verify (foreground): pnpm --filter @876/couriers-app typecheck && pnpm --filter @876/couriers-app lint && pnpm --filter @876/couriers-app test; pnpm --filter @876/billing-ui test; node scripts/check-app-structure.mjs.

Report to plans/2026-09-13-couriers-modernization/reports/sub-agent/finance-shared-ui.md: files changed + why, props added, test counts before/after, verification output summary, anything not done.

## Handoff note (orchestrator, 2026-09-13)
A previous delegate was stopped part-way. Its partial work is in the working tree (invoices/_components, invoices/_lib, items-list.tsx, payments-list.tsx, payments-skeleton-columns.ts, deleted local items-table/payments-table, package.json + pnpm-lock.yaml adding @876/billing-ui). Inspect `git status` / `git diff` for those three route dirs, finish the goal, and make verification green. Do not touch customers/ (done). If pnpm --filter refuses, run tsc/eslint/vitest from apps/couriers directly.
