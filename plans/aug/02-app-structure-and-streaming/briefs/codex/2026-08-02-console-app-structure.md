# Brief — Phase 2: restructure `apps/console` onto the new app-structure model

**Model:** `gpt-5.6-terra`, `model_reasoning_effort=high`
**Scope:** `apps/console/**` only. Do **not** touch any other app, any package,
or any file outside `apps/console/`.

## Read first (mandatory, in this order)

1. `.claude/rules/app-structure.md` — **the specification for this task.** It
   defines the five buckets, the placement rule, `_components/` / `_lib/` /
   `_data.ts`, the no-barrels rule, and the no-app-name-prefix rule. Everything
   below is an application of that file; where this brief and that file appear
   to disagree, the rule file wins and you should say so in your report.
2. `.claude/rules/code-style.md` — formatting/style constraints for
   `src/lib/` and `src/app/api/`.
3. `.claude/rules/types.md` — where types live (component props stay beside the
   component).

## What this is

`apps/console` currently has 46 files in a semi-flat `src/components/` and
**~130 non-route files sitting as bare siblings of `page.tsx`** throughout
`src/app/`. This task moves every one of them into the bucket the rule
assigns, and rewrites every import that pointed at the old location.

**This is a pure move-and-reimport refactor. Zero behavior change.** Do not
rename a component, change a prop, alter JSX, "improve" logic, add a feature,
or fix an unrelated bug you notice along the way. If you spot something that
looks wrong, write it in your final report instead of changing it.

## Target layout

```
apps/console/src/
  app/**/_components/        route-subtree-only components
  app/**/_lib/               route-subtree-only pure helpers (no JSX)
  components/shell/          the app frame
  components/providers/      context providers
  components/patterns/       app-wide, domain-agnostic UI
  features/<domain>/         one product domain
```

### 1. `components/shell/` — drop the `console-` prefix

The path already says `apps/console`; the prefix is noise (rule:
"Do not prefix a file with its own app name inside that app").

| From `src/components/`         | To `src/components/shell/` |
| ------------------------------ | -------------------------- |
| `console-shell.tsx`            | `shell.tsx`                |
| `console-sidebar.tsx` (+test)  | `sidebar.tsx` (+test)      |
| `console-mobile-nav.tsx`       | `mobile-nav.tsx`           |
| `console-nav-config.ts`(+test) | `nav-config.ts` (+test)    |
| `console-nav-dropdown.tsx`     | `nav-dropdown.tsx`         |
| `console-nav-link.tsx`         | `nav-link.tsx`             |
| `console-user-menu.tsx`(+test) | `user-menu.tsx` (+test)    |
| `topbar-actions.tsx` (+test)   | `topbar-actions.tsx`       |
| `topbar-search.tsx` (+test)    | `topbar-search.tsx`        |
| `theme-switcher.tsx`           | `theme-switcher.tsx`       |

**Exported symbol names do not change.** `ConsoleSidebar` stays
`ConsoleSidebar`; only the file path changes. (Renaming the symbols is a
separate follow-up and is explicitly out of scope for this brief.)

### 2. `components/providers/`

- keep `providers/user-store-provider.tsx`
- move `src/app/providers.tsx` → `src/components/providers/providers.tsx`
- move `src/app/service-worker-registration.tsx` →
  `src/components/providers/service-worker-registration.tsx`

`src/app/global-error.tsx` and `src/app/manifest.ts` are Next.js special files
— **leave them exactly where they are.**

### 3. `components/patterns/`

| From                           | To                                    |
| ------------------------------ | ------------------------------------- |
| `cursor-pagination.tsx`(+test) | `patterns/cursor-pagination.tsx`      |
| `screen.tsx`                   | `patterns/screen.tsx`                 |
| `view-switcher.tsx`            | `patterns/view-switcher.tsx`          |
| `detail/*` (7 files)           | `patterns/detail/*` (unchanged names) |

`patterns/detail/` is the sanctioned cohesive cluster named in the rule.

### 4. `features/`

| From                             | To                                                                                                                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `access/*` (4 files)             | `features/access/components/*` — except `to-access-flag.ts`, which is a pure helper → `features/access/to-access-flag.ts`                                                                             |
| `widgets/*` (14 files)           | `features/widgets/components/*` — except `widget-catalog.ts` (+test) and `widgets-config.ts`, which are pure data/config → `features/widgets/widget-catalog.ts`, `features/widgets/widgets-config.ts` |
| `plan-module-picker.tsx` (+test) | `features/plans/components/plan-module-picker.tsx`                                                                                                                                                    |

### 5. Route colocation — `_components/` and `_lib/`

For **every** directory under `src/app/`, move each non-route file into a
sibling private folder:

- renders JSX / exports a React component → `_components/`
- pure helper, no JSX (`*-utils.ts`, `app-detail-tabs.ts`,
  `account-utils.ts`, `contact-utils.ts`, `finance-provisioning-utils.ts`) →
  `_lib/`
- a `*.test.ts(x)` moves into the **same** folder as its subject
- `_data.ts` files already exist and are already private — **leave them**
- `src/app/api/**` — leave `route.ts`, `route.test.ts`, and
  `api/uploadthing/core.ts` where they are. The `api/` tree is route-handler
  infrastructure and is out of scope.

`columns.tsx` files (e.g. `(app)/orgs/columns.tsx`, `(app)/users/columns.tsx`)
export table column definitions containing JSX cell renderers → `_components/`.

**A nested route gets its own `_components/`.** For example
`(app)/users/[username]/addresses/` gets its own, separate from
`(app)/users/[username]/`. Never move a file up into a parent's `_components/`
to deduplicate — if two sibling routes genuinely share a component, move it to
`features/<domain>/components/` instead and note that in your report.

### Naming

Keep every filename as-is in this phase **except** the `console-` prefix
removals in §1. Do not rename anything else, even where a name is poor.

## Hard constraints

- **No barrel `index.ts` files.** Every import points at the concrete module.
  If you create even one barrel, the task has failed its main purpose.
- Imports use the `@/` alias for anything outside the current route subtree
  (`@/components/shell/sidebar`, `@/features/widgets/components/widget-bar`).
  Within a route subtree, a relative import (`./_components/foo`) is correct.
- `src/lib/` must not gain any JSX.
- Do not modify `src/lib/`, `src/hooks/`, `src/stores/`, `src/types/`,
  `src/test/`, `prisma/`, or any config file in this phase.
- Do not add, delete, or reorder any dependency.
- **Do not run `git commit`, `git add`, `git checkout`, or `git stash`.** Leave
  every change unstaged in the working tree; the orchestrating agent commits.

## Use `git mv`

Move files with `git mv` so history follows the file. Then fix imports. A
`cp` + delete loses the rename detection and makes the review diff unreadable.

## Verification — all three must pass before you report done

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console test
pnpm --filter @876/console lint
```

Then confirm the structural invariants:

```bash
# must print nothing: no bare non-route .tsx left beside a page.tsx
find apps/console/src/app -name '*.tsx' \
  ! -path '*/_components/*' ! -path '*/_lib/*' \
  ! -name 'page.tsx' ! -name 'layout.tsx' ! -name 'loading.tsx' \
  ! -name 'error.tsx' ! -name 'not-found.tsx' ! -name 'global-error.tsx'

# must print nothing: no barrels
find apps/console/src/components apps/console/src/features -name 'index.ts*'

# must print nothing: no leftover console- prefixed component files
find apps/console/src/components -name 'console-*'
```

If a command fails, fix it and re-run. Do not report success on a red check.

## Report back

1. A table of every file moved: old path → new path.
2. The count of import statements rewritten.
3. The exact output of the three verification commands and the three
   invariant checks.
4. Anything you were forced to deviate from in this brief, and why.
5. Anything that looked like a pre-existing bug — **described, not fixed**.
