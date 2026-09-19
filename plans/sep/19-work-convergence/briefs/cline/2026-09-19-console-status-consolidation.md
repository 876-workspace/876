# Consolidate Console's four status modules into one

## The defect

Console's `src/lib/` grew four separate modules that all answer the same
question — "how is this entity's status rendered?" — for three different
entities, plus a stray test:

```
apps/console/src/lib/app-status/index.ts
apps/console/src/lib/org-status/index.ts
apps/console/src/lib/user-status/index.ts
apps/console/src/lib/status/           (if present — check)
```

They exist because the old flat `lib/` gave no way to group, so each entity got
its own file instead of one module with three exports. Now that every module has
a folder, they belong in one.

## Read budget: 5 files. Do not read more.

```
apps/console/src/lib/app-status/index.ts
apps/console/src/lib/org-status/index.ts
apps/console/src/lib/user-status/index.ts
apps/console/src/lib/format/index.ts     (it holds statusBadgeVariant / statusBadgeClass)
.agents/rules/app-layout.md              §12 "Table cell hierarchy" — the status rule
```

## Do

1. Create `apps/console/src/lib/status/index.ts` exporting everything the three
   modules export, **names unchanged**. Do not rename an export; that would
   churn call sites for no gain and this task is about placement.
2. If two of them export the same symbol name with different behaviour, **stop
   and report it** — that is a real conflict and merging them silently would
   change behaviour at some call site.
3. Delete the three old directories.
4. Update every importer: `@/lib/app-status` → `@/lib/status`, and the same for
   the other two. Find them with:
   `grep -rn "@/lib/app-status\|@/lib/org-status\|@/lib/user-status" apps/console/src`
5. Move each module's existing tests into `status/index.test.ts`, preserving
   every case. **Do not drop a test.** Report the case count before and after —
   they must match, or the difference must be explained.
6. `format/index.ts` also holds `statusBadgeVariant`, `statusBadgeClass` and
   `membershipStatusBadgeVariant`. **Leave them where they are.** They are
   presentation helpers that belong with formatting; moving them is a separate
   judgement and is not part of this task.

## Hard prohibitions

- Do not rename any exported symbol.
- Do not change any behaviour, return value, or badge class string.
- Do not touch `format/index.ts`.
- Do not add a barrel that re-exports unrelated modules — `status/index.ts` is
  this module's own entry point, nothing more.
- Do not add `eslint-disable`, `@ts-ignore`, `as any`, or `as unknown as`.
- Do not touch any app other than `apps/console`.
- Do not `git commit`, branch, or open a PR.

## Verify

```
pnpm --filter @876/console typecheck
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
grep -rn "@/lib/app-status\|@/lib/org-status\|@/lib/user-status" apps/console/src   # expect 0
```

Console's suite is 2045 tests. Expect 2045 after, unless you explain a change.

## Report

`plans/sep/19-work-convergence/reports/cline/2026-09-19-console-status.md` —
the exports moved, any name conflict you stopped on, test case count before and
after, the final grep, verification output, anything unverified.
