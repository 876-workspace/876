# Codex brief: review fixes for app module runtime convergence

- Repo: `/root/projects/876`
- Branch: `feature/app-module-runtime-convergence` (already checked out — do not switch, create, or rebase branches)
- Base for comparison: `origin/main`
- Model: gpt-5.6-terra, medium reasoning

## Context

This branch (71 commits, written by GPT Web without execution) makes Projects and
Commerce module-aware: canonical registries in `packages/core/src/modules.ts`,
`AccessContext.modules` + `hasModule()` + navigation `requires.module`, Core's self
app-membership read returning `entitled_modules`, Projects route/API guards
requiring module + permission, Commerce resolving access, and system-role
permission synchronization in `apps/api`.

The orchestrator reviewed and executed the checks. The design is accepted. Your job
is to fix the concrete defects below — nothing else. Read before editing:
`.claude/rules/ai-code-quality.md`, `.claude/rules/testing.md`,
`.claude/rules/access-control.md`, `.claude/rules/express-api.md`,
`.claude/rules/code-style.md`.

## Defects to fix (all verified as branch-caused; `origin/main` is clean on each)

### 1. `@876/core` typecheck fails

```
src/access/catalogs.commerce.test.ts(64,33): '"themes"' is not assignable to parameter of type <COMMERCE_MODULES key>
src/access/catalogs.commerce.test.ts(65,33): '"domains"' ...
```

`themes` and `domains` are deliberately permission domains, not canonical modules.
Fix the **test** so it asserts that correctly (e.g. check them against the catalog's
permission-module keys, or assert they are absent from `COMMERCE_MODULES` via a
`string`-typed lookup). Do not add them to the registry.

### 2. Six new `@876/projects-app` test failures (main: 239 passing, branch: 6 failing)

```
src/components/shell/nav-config.test.ts > binds every navigation permission to the destination route guard
src/lib/auth/access-context.test.ts > maps enabled app features into the context
src/app/(app)/board/page.test.tsx > renders the standard toolbar with Add and disabled transfer actions
src/app/api/comments/comments.advanced.test.ts > accepts trimmed bodies across a deterministic hostile corpus
src/app/api/comments/comments.advanced.test.ts > holds issue-reference and body length boundaries
src/app/api/comments/comments.advanced.test.ts > never leaks the service client error code to the caller
```

Diagnose each. These are most likely stale tests that still mock `requireAppPermission`
/ `requireApiPermission` or expect `features` to be populated, after the production
code moved to `requireAppAccess` / `requireApiAccess` and `features: []`. Update the
tests to the new contract, keeping their original intent (e.g. the nav binding test
must still bind every nav entry's `permission` **and** `module` to the destination
guard; the access-context test should assert features are empty and modules come from
`entitled_modules`). If a failure is a genuine production bug, fix production
instead and say so in the report. **Do not weaken production code to make a test pass**
and do not delete tests.

### 3. Two new circular dependencies in `apps/api` (main: 18 `no-circular` errors, branch: 20)

Both new cycles start at the new file
`apps/api/src/modules/app-access/app-access-runtime.service.ts`, which imports
`listEntitledModules` from `@/modules/modules`, the `OrgAccessPrincipal` type from
`@/modules/organizations`, and `retrieveMyAppMembership` from `./app-access.service`.
Restructure so `pnpm --filter @876/api boundaries` reports **no more than 18**
`no-circular` errors (count with `grep -c "error no-circular"`). A reasonable option is
to fold `retrieveMyAppRuntimeMembership` into `app-access.service.ts` (which already
has those dependencies) and delete the separate file, updating the controller and
moving/adjusting `app-access-runtime.service.test.ts` accordingly. Choose whatever
removes the new cycles with least change. Do not fix the 18 pre-existing ones.

### 4. Deleted rationale comments — restore them

The branch deleted explanatory "why" comments that remain true:

- `packages/core/src/modules.ts` — the JSDoc above `INVOICE_COMMERCIAL_MODULE_KEYS`
  explaining Invoice selling registry modules directly, Billing being narrower (sales /
  documents legacy aggregates; granular keys not selectable until runtime enforcement),
  and Requests being present in both. Restore it (`git show origin/main:packages/core/src/modules.ts`)
  and add one sentence each for Projects (`reports` canonical but not commercial until
  its surface exists) and Commerce (empty until a capability has runtime entitlement semantics).
- `apps/api/src/seeds/plans.ts` — the comment above `createApplicationModule(...)`:
  "A failed grant must roll back its new module, so a retry can still distinguish
  bootstrap from an operator's later grant removal." Restore it. Also restore the
  paragraph about Billing `sales` and `documents` being intentionally retained
  (above `PLATFORM_MODULES`), merged with the new Commerce sentence.

### 5. Architecture doc number collides

`docs/architecture/017-module-runtime-access.md` collides with the existing
`017-console-app-data-management.md`. `git mv` it to
`docs/architecture/026-module-runtime-access.md`, fix any internal heading number, and
update the references in both `.claude/rules/app-access.md` and `.agents/rules/app-access.md`
(they must stay byte-identical — verify with `cmp`).

### 6. Prettier

Run `npx prettier --write` over exactly the files in
`git diff --name-only origin/main...HEAD` plus files you touch (`.ts`, `.tsx`, `.md`).
Do not format any other file.

## You must not

- commit, push, create/switch branches, or open PRs — the orchestrator commits;
- add `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `as any`;
- change behaviour beyond the defects above (no new features, no refactors elsewhere);
- touch the 18 pre-existing boundary cycles or the pre-existing `@876/core` lint errors
  (in `*.weird.test.ts`, `fuzz.advanced.test.ts`, `api.ts`, etc.);
- write any run log or transcript file anywhere.

## Verification (run all, in this order, and include results in your report)

```bash
pnpm --filter @876/core typecheck
pnpm --filter @876/core test
pnpm --filter @876/api typecheck
pnpm --filter @876/api boundaries 2>&1 | grep -c "error no-circular"   # must be <= 18
cd apps/api && npx vitest run src/seeds src/modules/app-access src/services && cd ../..
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app test      # must be 0 failures
pnpm --filter @876/commerce-app typecheck
pnpm --filter @876/commerce-app test
pnpm --filter @876/console typecheck
node scripts/check-app-structure.mjs
npx prettier --check $(git diff --name-only origin/main...HEAD | grep -E '\.(ts|tsx|md)$')
cmp .claude/rules/app-access.md .agents/rules/app-access.md
```

## Report

Write `plans/2026-09-13-app-module-runtime-convergence/reports/codex/2026-09-14-review-fixes.md`
with: each defect → root cause → fix (file list); the test count before/after for
projects-app; the boundary cycle count; the output summary of every verification
command; anything you could not fix and why.
