# Brief 14d — Console: Projects activity, discussions, wiki, client grants (read-only)

Repo `/root/projects/876`. Write code only; no commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`. Touch only `apps/console/**`. Pattern: `apps/console/src/app/(app)/projects/automation/**` and its data component, both trees. Presentation from `@876/projects-ui/collaboration/*` (activity-feed, discussion-list, discussion-thread without reply form (omit `replyAction` if optional, else Console-local and report it), wiki-tree, wiki-page-view, wiki-revision-list without restore, client-grant-list without revoke).

## Deliver (both trees)
`projects/activity`; project record tabs Activity, Discussions (+ thread), Wiki (+ page, revisions), Clients. Tests floor **20 `it()`**; ignore only the 4 known `src/lib/permissions.test.ts` failures.

## Verify
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console exec vitest run src/features/projects src/components/shell src/features/orgs
node scripts/check-app-structure.mjs console
pnpm check:rsc-boundaries

## Report
`plans/sep/16-projects-phase-14/reports/codex/14d-console.md`.
