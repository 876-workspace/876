# Verification Report: 876 Projects Types Centralization

- **Date:** 2026-09-17
- **Run:** `17-projects-types-centralization` (branch `main`, uncommitted)

## Fixes applied this session

1. Created the required run plan at `plans/sep/17-projects-types-centralization/plan.md` (per `.claude/rules/cli.md` + `implementation-tracker.md`).
2. Rewrote 14 stale ` @/lib/types/custom-modules` imports → `@/types/custom-modules` (12 custom-modules routes, 2 dashboard-widget routes). Root cause: prior session deleted `src/lib/types/` shim target but missed route files; only surfaced under vitest (typecheck had passed pre-prettier on a stale tree).
3. Restored dropped `LayoutFieldControlKind` union into `apps/projects/src/types/custom-modules.ts`. Root cause: it was defined in `record-form-helpers.ts` (HEAD line 11) and the move of `RecordFormField` referenced it without moving the definition. Re-export in `record-form-helpers.ts` now resolves.

## Evidence

- `pnpm --filter @876/projects-app typecheck` → exit 0, no errors.
- `vitest run src/app/api/custom-modules/route.test.ts` → 6/6 passed (was resolution failure).
- Full suite `pnpm --filter @876/projects-app test` → **231/231 files, 1566/1566 tests passed**, 0 failures.
- `rg "@/lib/types/"` → empty. `rg` for all 9 deleted module paths → empty.
- Diff gate: no duplicate shapes beyond accepted (`app-memberships.ts` unexported locals, `SetValuesParams`/`ListResponse` locals); re-export shims are intentional compat; no `catch` in `src/types/`.

## Left for user

- Review + explicitly approve commit (atomic conventional commits, no AI trailers per git rules). Suggested first: `refactor(projects-types): centralize shared contracts in src/types`.
