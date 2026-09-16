# Workspace Icon-Key Drift Resolution Report

- **Run:** `2026-09-05-shell-layout-and-navigation-overhaul`
- **Date:** 2026-09-06
- **Target File:** `apps/console/src/features/orgs/app-workspaces.projects.test.ts`
- **Status:** Complete

---

## 1. Summary of Changes

`apps/console/src/features/orgs/app-workspaces.projects.test.ts` had two failing tests due to stale expected values and a duplicate hand-maintained icon key set:

1. It asserted placeholder icon keys (`requests`, `items`, `categories`) that conflicted with the fixed Projects workspace registry.
2. It validated against a static `VALID_ICON_KEYS` set that drifted from the actual icon registry and lacked `projects`, `issues`, `board`, and `labels`.

As instructed, exactly one file was modified:

- `apps/console/src/features/orgs/app-workspaces.projects.test.ts`

No other files were modified, no branches were created/switched, and no commits were made.

---

## 2. New Expected Icon Keys

The expected metadata in `registers the 876-projects workspace with correct metadata` was updated to match the authoritative Projects workspace definition in `apps/console/src/features/orgs/app-workspaces.ts`:

| Entry                   | Previous (Stale Placeholder) | New Expected Key | Resolved Component (`NAV_ICONS`) |
| :---------------------- | :--------------------------- | :--------------- | :------------------------------- |
| **Workspace `iconKey`** | `'requests'`                 | `'projects'`     | `BriefcaseIcon`                  |
| **Section: Overview**   | `'dashboard'`                | `'dashboard'`    | `BarChart3`                      |
| **Section: Projects**   | `'requests'`                 | `'projects'`     | `BriefcaseIcon`                  |
| **Section: Issues**     | `'requests'`                 | `'issues'`       | `BugAntIcon`                     |
| **Section: Board**      | `'items'`                    | `'board'`        | `ViewColumnsIcon`                |
| **Section: Labels**     | `'categories'`               | `'labels'`       | `TagIcon`                        |

The previous expected values caused Projects and Issues to both draw a clipboard (`requests`), and Board and Labels to draw cards/items (`items`, `categories`). The new keys assert distinct semantic glyphs across the rail.

---

## 3. Derivation of the Valid Key Set

### Export Source

The authoritative icon registry is exported from:
`apps/console/src/components/shell/nav-icons.tsx`

Export definition:

```ts
export const NAV_ICONS: Record<string, IconComponent> = { ... }
```

### Derivation & Elimination of Duplicate List

- Deleted the hand-maintained static `VALID_ICON_KEYS` `Set` and removed the unused `type WorkspaceIconKey` import from `./app-workspaces`.
- Imported `NAV_ICONS` using relative import `../../components/shell/nav-icons`.
- Derived the valid key set directly from the export keys:
  ```ts
  const validIconKeys = new Set(Object.keys(NAV_ICONS))
  ```
- The assertion `ensures every section iconKey is a declared WorkspaceIconKey` verifies that `validIconKeys.has(...)` returns `true` for `workspace.iconKey` and every `section.iconKey`.

Because the set is dynamically derived from `NAV_ICONS`, any icon key added to `NAV_ICONS` in the future will automatically be recognized without manual maintenance or risk of drift.

---

## 4. Verification Output

### Test 1: `pnpm --filter @876/console test src/features/orgs/app-workspaces.projects.test.ts`

Run from `/root/projects/876`:

```
$ vitest run src/features/orgs/app-workspaces.projects.test.ts

 RUN  v4.1.11 /root/projects/876/apps/console

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  14:13:46
   Duration  6.07s (transform 567ms, setup 780ms, import 1.24s, tests 19ms, environment 3.30s)
```

All 5 tests in the file passed:

- `✓ registers the 876-projects workspace with correct metadata`
- `✓ declares five sections in the exact expected order`
- `✓ ensures every section iconKey is a declared WorkspaceIconKey`
- `✓ keeps the registry structurally cloneable with no functions or components`
- `✓ ensures every section segment has a matching route file on disk`

### Test 2: `pnpm --filter @876/console typecheck`

Run from `/root/projects/876`:

```
$ tsc --noEmit
# Exited with code 0 (clean, no type errors)
```

### Test 3: `npx vitest run src/features/orgs/app-workspaces.projects.test.ts --root apps/console`

Run from `/root/projects/876`:

```
 RUN  v4.1.11 /root/projects/876/apps/console

 ❯ src/features/orgs/app-workspaces.projects.test.ts (5 tests | 1 failed) 32ms
     × ensures every section segment has a matching route file on disk 19ms

 Test Files  1 failed (1)
      Tests  1 failed | 4 passed (5)
   Start at  14:15:07
   Duration  14.85s (transform 850ms, setup 8.39s, import 1.82s, tests 32ms, environment 3.79s)
```

The 4 passing tests include both target cases:

- `✓ registers the 876-projects workspace with correct metadata`
- `✓ declares five sections in the exact expected order`
- `✓ ensures every section iconKey is a declared WorkspaceIconKey`
- `✓ keeps the registry structurally cloneable with no functions or components`

---

## 5. Anything Not Verified / Observations

1. **Route file existence check under repository root invocation**:
   The 5th test (`ensures every section segment has a matching route file on disk`) failed when Vitest was invoked with `--root apps/console` from `/root/projects/876`:

   ```
   AssertionError: Section "Overview" (segment "") has no page.tsx at /root/projects/876/src/app/(app)/workspace/[orgSlug]/projects: expected false to be true
   ```

   This is because line 77 of `app-workspaces.projects.test.ts` resolves the path against `process.cwd()`:

   ```ts
   const rootDir = resolve(
     process.cwd(),
     'src/app/(app)/workspace/[orgSlug]/projects'
   )
   ```

   When running via `pnpm --filter @876/console test`, pnpm sets `process.cwd()` to `/root/projects/876/apps/console`, where all files exist and the test passes 5/5. When running `npx vitest ... --root apps/console` from `/root/projects/876`, Node's `process.cwd()` is `/root/projects/876`. Per the strict constraint to modify only the two named failures in `app-workspaces.projects.test.ts` and not touch any other code, this test implementation was left as-is.

2. **Pre-existing Console test suite failures**:
   Other failures across `apps/console` (sidebar back-control defect, workspace record pages, billing snapshot) were observed when running the full suite and were intentionally untouched per instructions.
