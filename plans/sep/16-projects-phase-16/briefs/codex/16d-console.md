# Brief 16d — Console: Projects integrations, webhooks, imports, metrics

Repo `/root/projects/876`. Write code only; no commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`. Touch only `apps/console/**`. Read `.claude/rules/access-tiers.md` (operator tier: `requireConsolePermission` + audit event for mutations) and `apps/console/src/app/api/**` for an existing audited operator mutation route to copy.
Pattern for read views: `apps/console/src/app/(app)/projects/custom-modules/**` (both trees). Presentation: `@876/projects-ui/platform/*`.

## Deliver (both trees)
- Read-only: `projects/integrations` (clients; never secrets), `projects/webhooks` + endpoint deliveries, `projects/imports` + job detail, `projects/health` (metrics).
- One operator mutation: **replay webhook delivery** — Console route handler under `app/api/organizations/[id]/projects/webhook-deliveries/[deliveryId]/replay/route.ts` (or the existing naming convention) that calls `requireConsolePermission`, writes the audit event, then calls the operator client once.
- Tests floor **30 `it()`** incl. replay denied without permission and audit written before the call.

## Verify
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console exec vitest run src/features/projects src/components/shell src/features/orgs src/app/api
node scripts/check-app-structure.mjs console
pnpm check:rsc-boundaries

## Report
`plans/sep/16-projects-phase-16/reports/codex/16d-console.md`.
