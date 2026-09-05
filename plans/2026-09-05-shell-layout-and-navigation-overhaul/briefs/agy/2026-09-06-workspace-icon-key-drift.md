# Task: fix the stale workspace icon-key test, and remove the duplicate that caused it

Repo `/root/projects/876`, branch `feat/shell-layout-navigation-overhaul`.
**Do not create or switch branches. Do not commit. Do not open a PR.**

You are fixing exactly **one file**:

```
apps/console/src/features/orgs/app-workspaces.projects.test.ts
```

Do not edit any other file. If you believe another file must change, stop and
say so in your report instead of changing it.

## Verified state — this is measured, not guessed

`pnpm --filter @876/console test` currently fails 2 cases in that file.

### Failure 1 — `registers the 876-projects workspace with correct metadata`

```
- Expected              + Received
-   "iconKey": "requests"      +   "iconKey": "projects"
-       "iconKey": "requests"  +       "iconKey": "issues"
-       "iconKey": "items"     +       "iconKey": "board"
-       "iconKey": "categories"+       "iconKey": "labels"
```

The **received** values are correct and the **expected** values are the bug the
user reported: Projects and Issues both drew a clipboard, Board and Labels both
drew a card grid. The registry was fixed; this test still asserts the old
placeholders.

**Fix: update the expected values to the new keys.** Do not touch the registry
to make the old assertions pass — that would reintroduce the defect.

### Failure 2 — `ensures every section iconKey is a declared WorkspaceIconKey`

At the top of the same file:

```ts
const VALID_ICON_KEYS = new Set<WorkspaceIconKey>([
  'dashboard',
  'customers',
  'requests',
  'settings',
  'billing',
  'packages',
  'items',
  'teams',
  'categories',
  'forms',
  'payments',
  'banking',
  'branches',
  'warehouses',
])
```

This is a **hand-maintained copy** of the `WorkspaceIconKey` union. It is
missing `projects`, `issues`, `board` and `labels`, so the assertion fails.

Adding four strings to the list would make it green **and leave the duplicate in
place**, so the same drift happens the next time a key is added. That is not the
fix we want.

**Fix: delete `VALID_ICON_KEYS` and derive the valid set from the real source.**
The icon registry `NAV_ICONS` in `apps/console/src/components/shell/nav-icons.ts`
is keyed by icon key — `Object.keys(NAV_ICONS)` is the authoritative set, and a
feature is allowed to import from `components/` (the restriction runs the other
way). Read that module first and confirm the export name and shape before you
rely on it. If for any reason it cannot be imported here, say so in your report
and do **not** invent a second list.

The assertion should then read as: every `iconKey` the Projects workspace
declares is a key the icon registry actually registers.

## Constraints

- Only that one test file changes.
- Do not rename any icon key, section label, app slug, or workspace field.
  They are durable identifiers.
- Do not weaken an assertion to make it pass. Keep `.toEqual` where the file
  uses it; do not downgrade to `toBeDefined()` or `toContain`.
- No `eslint-disable`, `@ts-ignore`, `as any`.
- Do not commit.

## Verify (run these, read the output)

```bash
cd /root/projects/876
npx vitest run src/features/orgs/app-workspaces.projects.test.ts --root apps/console
pnpm --filter @876/console typecheck
```

Other tests in the Console suite are failing for reasons that are **not yours**
(a sidebar back-control defect, workspace record pages, and a pre-existing
billing snapshot). Do not fix them, do not work around them, and do not edit
their files. Judge your work only by the two cases named above.

## Report

Write to
`plans/2026-09-05-shell-layout-and-navigation-overhaul/reports/agy/2026-09-06-workspace-icon-key-drift.md`:
the new expected icon keys; how you derived the valid key set and from which
export; the verification output; and anything you could not verify.
