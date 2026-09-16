# Brief — Phase 4: register `876-projects` as a platform app

You are registering a new 876 platform app, **876 Projects** (slug
`876-projects`), across the identity API's seeds and the canonical permission
catalog. Read `plans/2026-09-03-876-projects/plan.md` for context.

**Repository root:** `/root/projects/876`
**Branch:** `feat/876-projects` (already checked out — do NOT create, switch, or
merge any branch, and do NOT commit. The orchestrator commits.)

This is a **small, mechanical, high-precision** change. Every edit follows an
existing `876-crm` line. Find the CRM line, add a Projects line beside it, and
change nothing else.

---

## 1. The five edits

### Edit 1 — `apps/api/src/seeds/bootstrap.ts`

In the `PLATFORM_APPS` array, after the `876 CRM` entry, add:

```ts
  {
    name: '876 Projects',
    slug: '876-projects',
    appKind: 'product',
    homepageUrl: 'https://projects.876.app',
  },
```

### Edit 2 — `packages/core/src/access/catalogs.ts`

After `crmPermissionCatalog`, add and export `projectsPermissionCatalog`, built
with the same `defineAppPermissionCatalog` / `modules` / `crud` helpers already
in that file:

```ts
export const projectsPermissionCatalog: AppPermissionCatalog =
  defineAppPermissionCatalog({
    app: '876-projects',
    modules: modules([
      { key: 'dashboard', label: 'Dashboard', actions: ['view'] },
      crud('projects', 'Projects', ['archive']),
      crud('issues', 'Issues'),
      crud('comments', 'Comments'),
      crud('labels', 'Labels'),
      crud('members', 'Members'),
      { key: 'reports', label: 'Reports', actions: ['view'] },
      { key: 'settings', label: 'Settings', actions: ['view', 'edit'] },
    ]),
  })
```

Then register it in the `appPermissionCatalogs` record:

```ts
  '876-projects': projectsPermissionCatalog,
```

Keep the record's existing key order style; add the entry alongside the others.

### Edit 3 — `apps/api/src/seeds/app-access.ts`

1. Add `projectsPermissionCatalog` to the existing named import from
   `@876/core/access/catalogs`, keeping the import list alphabetically sorted as
   it already is.
2. Beside the other `fromCatalog` calls, add:
   ```ts
   const projectsPermissions = fromCatalog(projectsPermissionCatalog)
   ```
3. In `APP_ACCESS_SEED_DEFINITIONS`, after the `876-crm` entry, add:
   ```ts
   {
     appSlug: '876-projects',
     permissions: projectsPermissions,
     roles: standardRoles(projectsPermissions),
   },
   ```

### Edit 4 — `apps/api/src/seeds/internal-plan.ts`

Add `'876-projects'` to `INTERNAL_PLAN_APP_SLUGS`, after `'876-crm'`.

### Edit 5 — `apps/api/src/seeds/default-prices.ts`

Add `'876-projects'` to `FREE_PRICE_APP_SLUGS`, after `'876-crm'`.

---

## 2. Tests you must update

Adding an app to those arrays **will break existing tests that assert call
counts and call order**. Find and fix every one. At minimum:

- `apps/api/src/seeds/default-prices.test.ts` — it asserts
  `toHaveBeenNthCalledWith(6, '876-crm')` and almost certainly asserts a total
  count. `876-projects` becomes call 7. Update the assertions to match reality;
  do **not** loosen them into `toHaveBeenCalled()`.
- `apps/api/src/seeds/app-access.test.ts` — check its expectations about which
  apps are seeded and how many.
- `apps/api/src/seeds/internal-plan.test.ts` — same.
- `packages/core/src/access/catalogs.test.ts` and any other
  `packages/core/src/access/catalogs*.test.ts` — these may assert the exact set
  of catalog keys.

Run the suites and fix what actually fails. **Do not weaken an assertion to make
it pass.** If a test asserted an exact list of apps, the correct fix is to add
`876-projects` to the expected list, not to switch to a subset check.

---

## 3. Tests you must add

Add a focused test file
`packages/core/src/access/catalogs.projects.test.ts`, modelled on the existing
`packages/core/src/access/catalogs.crm.test.ts`. **Minimum 8 `it()` cases:**

1. `projectsPermissionCatalog.app` is exactly `'876-projects'`.
2. The catalog declares exactly the eight module keys listed in Edit 2, in that
   order.
3. Every permission key matches `^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$` (the
   `<kebab-module>.<kebab-action>` contract).
4. Permission keys are unique across the whole catalog.
5. `projects.delete`, `issues.delete`, `comments.delete`, `labels.delete` and
   `members.delete` are each flagged `isDangerous`.
6. `projects.archive` exists and is **not** flagged dangerous.
7. Module `position` values are strictly increasing from 0 in declaration order.
8. `appPermissionCatalogs['876-projects']` is the same object as
   `projectsPermissionCatalog`.

Assert exact values. `expect(x).toBeDefined()` as a test's only assertion is a
failed test — do not write one.

---

## 4. Non-negotiable rules

1. `876-projects` is a **durable identifier**. Spell it exactly, everywhere.
2. Permission keys are durable contracts — `<kebab-module>.<kebab-action>`.
3. No `as any`, no `eslint-disable`, no `@ts-ignore`, no `@ts-expect-error`.
4. Do not reformat, reorder, or "tidy" any line you were not asked to change.
   The diff must contain only the additions above plus the test fixes.
5. Do not add feature-flag seeds. 876 Projects has no feature flags in v1, and
   `apps/api/src/seeds/features.ts` requires PostHog configuration. Leave that
   file completely untouched.

---

## 5. Do NOT

- Do NOT create, switch, rebase, merge, or delete any git branch.
- Do NOT run `git commit`, `git add`, or `git push`.
- Do NOT touch `apps/projects-api/` — another agent is writing it right now and
  your edits there would collide. This is important.
- Do NOT touch `apps/api/src/seeds/features.ts`.
- Do NOT touch `apps/console/`, `apps/crm/`, `packages/crm/`, or any app other
  than `apps/api`.
- Do NOT run `pnpm install`.
- Do NOT create a `packages/projects` package — that is a different phase.
- Do NOT write documentation files.

Your entire diff must be confined to:
```
apps/api/src/seeds/bootstrap.ts
apps/api/src/seeds/app-access.ts
apps/api/src/seeds/internal-plan.ts
apps/api/src/seeds/default-prices.ts
apps/api/src/seeds/*.test.ts            (only where a test actually fails)
packages/core/src/access/catalogs.ts
packages/core/src/access/catalogs.projects.test.ts   (new)
packages/core/src/access/*.test.ts      (only where a test actually fails)
```

---

## 6. Verify before you report

Foreground, and report the real output:

```bash
cd /root/projects/876
pnpm --filter @876/core typecheck
pnpm --filter @876/core test
pnpm --filter @876/api typecheck
pnpm --filter @876/api test
```

The `@876/api` suite is large; let it finish. If any test fails, fix it properly
and run again.

---

## 7. Report

Write your report to
`plans/2026-09-03-876-projects/reports/agy/2026-09-03-phase4-platform-registration.md`:

1. Every file changed, with what changed in it.
2. Every test you had to fix, and **why it was failing** — this tells the
   orchestrator whether the registration is genuinely complete.
3. The counted number of `it()` cases in the new catalog test file.
4. The exact output of each command in §6, or an explicit statement that you
   could not run it.
5. Anything you could not do, and why.
