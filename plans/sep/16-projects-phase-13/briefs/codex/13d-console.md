# Brief 13d — Console: Projects workflows, automation rules and runs (read-only)

Repo `/root/projects/876`. Write code only; no commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`. Touch only `apps/console/**`. Pattern: `apps/console/src/app/(app)/projects/layouts/**` + `apps/console/src/features/projects/components/layouts-data.tsx` (or the nearest layouts data component), both trees.
Presentation: `@876/projects-ui/automation/automation-rule-list`, `automation-run-table`; blueprint shown read-only as a transitions table (add a `readOnly` prop only if `blueprint-editor` supports it; otherwise a Console-local table and list it in the report).

## Deliver (both trees)
`projects/workflows` (types → transitions), `projects/automation` (rules list), `projects/automation/[ruleId]` (definition + runs). Secrets are never shown — only `hasWebhookSecret`. Sections/nav. Tests floor **15 `it()`**; ignore only the 4 known `src/lib/permissions.test.ts` failures.

## Verify
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console exec vitest run src/features/projects src/components/shell src/features/orgs
node scripts/check-app-structure.mjs console
pnpm check:rsc-boundaries

## Report
`plans/sep/16-projects-phase-13/reports/codex/13d-console.md`.
