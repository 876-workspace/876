# Task: the app-role backfill script queries Prisma directly — move it behind a repository

Repo `/root/projects/876`, branch `feat/shell-layout-navigation-overhaul`.
**Do not create or switch branches. Do not commit. Do not open a PR.**

Read first: `.claude/rules/express-api.md` (module shape and layer rules) and
`.claude/rules/ai-code-quality.md`.

## Verified state

`pnpm --filter @876/api boundaries` reports **19** violations on this branch.
`origin/main` reports **18**. I diffed the two lists; the branch adds exactly
one:

```
error prisma-only-in-repositories: scripts/backfill-app-assignment-roles.ts → src/db/client.ts
```

`apps/api/scripts/backfill-app-assignment-roles.ts` imports `prisma` from
`@/db/client` and queries it directly at lines 21, 31, 59, 89 and 121
(`membership.findFirst`, `appRole.findMany`, `appAssignment.findMany`,
`appRole.findMany`, `appAssignment.updateMany`).

The rule in `.dependency-cruiser.cjs:30` allows exactly two exceptions —
`src/server.ts` and `src/seeds/cli.ts` — and the comment says why: they own a
connection lifecycle and call `disconnectDb()` **without ever issuing a query**.
This script does issue queries, so it is not that kind of root.

## What to build

Move every query into the repository that owns the table, and leave the script
as a thin CLI: parse argv, call the service/repository, print the report,
disconnect.

- Ownership: `appAssignment` and `appRole` belong to the app-access module
  (`src/modules/app-access/`); `membership` belongs to the organizations module
  (`src/modules/organizations/`). Reuse an existing repository function where
  one already does the job — **search before adding one**
  (`.claude/rules/ai-code-quality.md`). Add a new repository function only where
  none fits, and put it in the repository for the table it reads.
- Cross-module access goes through the owning module's public `index.ts`, never
  a direct reach into another module's internals.
- The script keeps `disconnectDb()`.

**Do not add `scripts/` to the dependency-cruiser exception.** Relaxing the
config to fit the code is exactly what `.claude/rules/ai-code-quality.md`
forbids; the rule is correct and the script is wrong.

## Behaviour that must not change

The backfill's safety properties were reviewed and are deliberate. Preserve all
of them exactly:

- **dry run is the default**; it performs zero writes;
- `--apply` re-reads the live app roles and re-runs role resolution immediately
  before writing, and revalidates the member's active organization role;
- the write is a **compare-and-set** against the assignment state that was
  discovered, so a concurrent change is skipped rather than overwritten;
- it reports `changed` and `skippedAfterDiscovery`;
- candidate output keeps assignment / organization / user / app / from / to /
  organization-role context.

The existing tests at
`apps/api/src/services/__tests__/app-assignment-role-backfill-script.test.ts`
cover dry-run, apply, stale membership and stale target resolution. They must
still pass. Update them only where the seam genuinely moved, and say so.

## Constraints

- Do not touch `apps/console/**`, `apps/projects/**`, `packages/ui/**`, or
  `packages/projects-ui/**`.
- Do not change `resolveAppAssignmentRole` in `packages/core/src/access/`.
- Do not rename a table, column, role key, or permission key.
- Do not run the backfill against any database.
- No `eslint-disable`, `@ts-ignore`, `as any`.
- Do not commit.

## Verify (foreground, read the output)

```bash
pnpm --filter @876/api typecheck
pnpm --filter @876/api lint
pnpm --filter @876/api test
pnpm --filter @876/api boundaries
```

`boundaries` must report **18**, matching `origin/main`. 19 means the move did
not land; 17 or fewer means you changed something you were not asked to.

The API suite is currently **113 files / 2245 tests, all passing**. It must
still be all passing, and the count must not drop.

## Report

Write to
`plans/2026-09-05-shell-layout-and-navigation-overhaul/reports/codex/2026-09-06-backfill-repository-boundary.md`:
which repository functions you reused versus added and why; where each of the
five queries went; the before/after `boundaries` count; the before/after test
count; verification output; and anything you could not verify.
